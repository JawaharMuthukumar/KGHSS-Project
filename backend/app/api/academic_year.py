"""Academic Year page: the HM sets the running year's start/end month, downloads a backup of the year's
Notes of Lessons, and closes the year — promoting students, removing that year's lesson-plan PDFs and
making the next year current — in one step."""
import calendar
import re
import zipfile
from datetime import date, datetime
from tempfile import SpooledTemporaryFile

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session, undefer

from app.api.promotions import next_year, promote_all, promotion_overview
from app.core.database import get_db
from app.core.dependencies import current_account, require_roles
from app.models.entities import Account, AcademicClass, AcademicYear, LessonPlan, Teacher
from app.services.academic_year import current_year, default_dates, year_out

router = APIRouter(prefix="/academic-year", tags=["Academic Year"])

MONTH = r"^\d{4}-(0[1-9]|1[0-2])$"


def month_range(start_month: str, end_month: str, label: str) -> tuple[date, date]:
    """First day of the start month to the last day of the end month, checked against the year's label."""
    sy, sm = map(int, start_month.split("-")); ey, em = map(int, end_month.split("-"))
    start, end = date(sy, sm, 1), date(ey, em, calendar.monthrange(ey, em)[1])
    first = int(label[:4])
    if start.year != first: raise HTTPException(422, f"The {label} year must start in {first}")
    if end <= start: raise HTTPException(422, "The end month must come after the start month")
    if (end.year - start.year) * 12 + end.month - start.month > 12: raise HTTPException(422, "An academic year can be at most 13 months long")
    return start, end


@router.get("", summary="The running academic year (shown to HM, teachers and students)")
def get_year(db: Session = Depends(get_db), _: Account = Depends(current_account)):
    rec = current_year(db); db.commit()
    return year_out(rec)


class YearDatesIn(BaseModel):
    start_month: str = Field(pattern=MONTH)
    end_month: str = Field(pattern=MONTH)


@router.put("", summary="HM sets the running year's start and end month")
def set_dates(data: YearDatesIn, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    rec = current_year(db)
    rec.start_date, rec.end_date = month_range(data.start_month, data.end_month, rec.label)
    db.commit()
    return year_out(rec)


def notes_stats(db: Session, label: str) -> dict:
    count, size = db.query(func.count(LessonPlan.id), func.coalesce(func.sum(LessonPlan.file_size), 0)).filter(LessonPlan.academic_year == label).one()
    return {"count": count, "bytes": int(size)}


@router.get("/close-check", summary="Before starting the next year: promotion readiness and the Notes of Lessons to back up")
def close_check(db: Session = Depends(get_db), account: Account = Depends(require_roles("admin"))):
    rec = current_year(db); db.commit()
    overview = promotion_overview(db, account)
    nxt = next_year(rec.label)
    # Suggest the same months a year later
    ns, ne = rec.start_date.replace(year=rec.start_date.year + 1), date(rec.end_date.year + 1, rec.end_date.month, 1)
    return {"year": year_out(rec), "next_label": nxt, "next_start_month": ns.strftime("%Y-%m"), "next_end_month": ne.strftime("%Y-%m"),
            "promotions_ready": overview["ready"], "promotion_blockers": overview["blockers"], "notes": notes_stats(db, rec.label)}


def _safe(text: str) -> str:
    return re.sub(r"[^\w\-. ]+", "_", text).strip()[:80] or "file"


@router.get("/notes-archive", summary="ZIP of every Notes of Lessons PDF of the running year, folder per week")
def notes_archive(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    rec = current_year(db)
    codes = dict(db.query(AcademicClass.id, AcademicClass.code).all())
    names = dict(db.query(Teacher.id, Account.full_name).join(Account, Account.id == Teacher.account_id).all())
    weeks = sorted({w for (w,) in db.query(LessonPlan.week_start).filter(LessonPlan.academic_year == rec.label).distinct()})
    number = {w: i + 1 for i, w in enumerate(weeks)}
    buf = SpooledTemporaryFile(max_size=32 * 1024 * 1024)  # spills to disk for a big year instead of holding it all in memory
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        plans = (db.query(LessonPlan).options(undefer(LessonPlan.pdf)).filter(LessonPlan.academic_year == rec.label)
                 .order_by(LessonPlan.week_start, LessonPlan.class_id, LessonPlan.subject).yield_per(20))
        for p in plans:
            fri = p.week_start.toordinal() + 4
            folder = f"Week {number[p.week_start]:02d} - {p.week_start:%d %b} to {date.fromordinal(fri):%d %b %Y}"
            name = _safe(f"{codes.get(p.class_id, '')} {p.subject} - {names.get(p.teacher_id, '')} - {p.status}")
            zf.writestr(f"{folder}/{name}.pdf", p.pdf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip",
                             headers={"Content-Disposition": f'attachment; filename="Notes of Lessons {rec.label}.zip"'})


def start_next_year(db: Session, account: Account, start_month: str | None, end_month: str | None) -> dict:
    """Promote every class, clear the closing year's Notes of Lessons PDFs and make the next year current — one commit."""
    rec = current_year(db)
    label = next_year(rec.label)
    if start_month and end_month: start, end = month_range(start_month, end_month, label)
    else: start, end = default_dates(label)
    result = promote_all(db, account)
    removed = db.query(LessonPlan).filter(LessonPlan.academic_year == rec.label).delete(synchronize_session=False)
    rec.is_current = False; rec.closed_at = datetime.utcnow()
    nxt = db.query(AcademicYear).filter_by(label=label).first() or AcademicYear(label=label)
    nxt.start_date, nxt.end_date, nxt.is_current, nxt.closed_at = start, end, True, None
    db.add(nxt)
    db.commit()
    return {**result, "notes_removed": removed, "year": year_out(nxt)}


class StartNextIn(BaseModel):
    confirm_label: str
    next_start_month: str = Field(pattern=MONTH)
    next_end_month: str = Field(pattern=MONTH)


@router.post("/start-next", summary="HM closes the running year and starts the next one")
def start_next(data: StartNextIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin"))):
    rec = current_year(db)
    if data.confirm_label.strip() != rec.label: raise HTTPException(422, f"Type {rec.label} to confirm")
    return start_next_year(db, account, data.next_start_month, data.next_end_month)
