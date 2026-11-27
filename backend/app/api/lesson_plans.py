"""Notes of Presence: teachers upload a weekly lesson plan PDF per class + subject; the HM approves or returns it.

Weeks run Monday–Friday and are identified by their Monday. The academic year's weeks start at the week of
1 June and end at the week of 31 May. Any number of plans can be merged into one PDF (e.g. three weeks, or the
whole year) for printing or for the government report.
"""
from collections import defaultdict
from datetime import date, datetime, timedelta
from io import BytesIO

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from pypdf import PdfReader, PdfWriter
from pypdf.errors import PdfReadError
from sqlalchemy.orm import Session, undefer

from app.api.school import current_academic_year, get_class
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.entities import Account, AcademicClass, LessonPlan, SubjectTeacherAssignment, Teacher
from app.services.permissions import teacher_profile

router = APIRouter(prefix="/lesson-plans", tags=["Notes of Presence"])

MAX_BYTES = 3 * 1024 * 1024


def monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def year_weeks(academic_year: str) -> list[date]:
    """Mondays of every week of the academic year (June to May)."""
    start = int(academic_year[:4])
    first, last = monday(date(start, 6, 1)), date(start + 1, 5, 31)
    weeks, d = [], first
    while d <= last:
        weeks.append(d); d += timedelta(days=7)
    return weeks


def week_label(m: date) -> str:
    fri = m + timedelta(days=4)
    return f"{m:%d %b} – {fri:%d %b %Y}"


def plan_out(p: LessonPlan, codes: dict, teachers: dict, deciders: dict) -> dict:
    return {"id": p.id, "teacher_id": p.teacher_id, "teacher_name": teachers.get(p.teacher_id), "class_code": codes.get(p.class_id),
            "subject": p.subject, "week_start": p.week_start, "week_label": week_label(p.week_start), "topic": p.topic,
            "file_name": p.file_name, "file_size": p.file_size, "status": p.status, "note": p.note,
            "decided_by_name": deciders.get(p.decided_by), "decided_at": p.decided_at, "uploaded_at": p.uploaded_at}


def out_many(db: Session, plans: list[LessonPlan]) -> list[dict]:
    codes = dict(db.query(AcademicClass.id, AcademicClass.code).filter(AcademicClass.id.in_({p.class_id for p in plans})).all()) if plans else {}
    teachers = dict(db.query(Teacher.id, Account.full_name).join(Account, Account.id == Teacher.account_id)
                    .filter(Teacher.id.in_({p.teacher_id for p in plans})).all()) if plans else {}
    ids = {p.decided_by for p in plans if p.decided_by}
    deciders = dict(db.query(Account.id, Account.full_name).filter(Account.id.in_(ids)).all()) if ids else {}
    return [plan_out(p, codes, teachers, deciders) for p in plans]


def teacher_slots(db: Session, teacher: Teacher, year: str) -> list[dict]:
    """The class + subject pairs this teacher teaches this year (their subject-teacher assignments)."""
    rows = (db.query(AcademicClass.code, AcademicClass.id, SubjectTeacherAssignment.subject)
            .join(AcademicClass, AcademicClass.id == SubjectTeacherAssignment.class_id)
            .filter(SubjectTeacherAssignment.teacher_id == teacher.id, SubjectTeacherAssignment.academic_year == year)
            .order_by(AcademicClass.grade, AcademicClass.code, SubjectTeacherAssignment.subject).all())
    return [{"class_code": code, "class_id": cid, "subject": subj} for code, cid, subj in rows]


def _filtered(db: Session, account: Account, year: str, teacher_id: int | None, class_code: str | None, subject: str | None,
              week_from: date | None, week_to: date | None, status: str | None):
    q = db.query(LessonPlan).filter(LessonPlan.academic_year == year)
    if account.role == "teacher": q = q.filter(LessonPlan.teacher_id == teacher_profile(db, account).id)
    elif teacher_id: q = q.filter(LessonPlan.teacher_id == teacher_id)
    if class_code: q = q.filter(LessonPlan.class_id == get_class(db, class_code).id)
    if subject: q = q.filter(LessonPlan.subject == subject)
    if week_from: q = q.filter(LessonPlan.week_start >= monday(week_from))
    if week_to: q = q.filter(LessonPlan.week_start <= monday(week_to))
    if status: q = q.filter(LessonPlan.status == status)
    return q


@router.get("/setup", summary="Weeks of the academic year (and, for a teacher, the class + subject pairs they upload for)")
def setup(db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    year = current_academic_year(db)
    today = monday(date.today())
    weeks = [{"week_start": w, "label": week_label(w)} for w in year_weeks(year) if w <= today + timedelta(days=21)]
    out = {"academic_year": year, "current_week": today, "weeks": weeks}
    if account.role == "teacher":
        out["slots"] = [{"class_code": s["class_code"], "subject": s["subject"]} for s in teacher_slots(db, teacher_profile(db, account), year)]
    else:
        out["teachers"] = [{"id": t, "name": n} for t, n in db.query(Teacher.id, Account.full_name).join(Account, Account.id == Teacher.account_id)
                           .filter(Account.is_active.is_(True)).order_by(Account.full_name).all()]
    return out


@router.get("", summary="Lesson plans (teacher: their own; HM: everyone's), newest week first")
def list_plans(teacher_id: int | None = None, class_code: str | None = None, subject: str | None = None,
               week_from: date | None = None, week_to: date | None = None, status: str | None = Query(None, pattern="^(pending|approved|returned)$"),
               db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    year = current_academic_year(db)
    plans = (_filtered(db, account, year, teacher_id, class_code, subject, week_from, week_to, status)
             .order_by(LessonPlan.week_start.desc(), LessonPlan.class_id, LessonPlan.subject).all())
    return out_many(db, plans)


@router.post("", status_code=201, summary="Teacher uploads (or replaces) a week's lesson plan PDF for one of their classes")
async def upload_plan(class_code: str = Form(...), subject: str = Form(...), week_start: date = Form(...),
                      topic: str = Form(..., min_length=2, max_length=200), file: UploadFile = File(...),
                      db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    teacher = teacher_profile(db, account)
    cls = get_class(db, class_code); year = current_academic_year(db)
    if not db.query(SubjectTeacherAssignment).filter_by(class_id=cls.id, subject=subject, teacher_id=teacher.id, academic_year=year).first():
        raise HTTPException(403, f"You are not the {subject} teacher of {cls.code}")
    week = monday(week_start)
    if week not in year_weeks(year): raise HTTPException(422, f"Pick a week of the {year} school year")
    if week > monday(date.today()) + timedelta(days=21): raise HTTPException(422, "You can upload up to three weeks ahead only")
    data = await file.read()
    if len(data) > MAX_BYTES: raise HTTPException(422, "The PDF must be 3 MB or smaller")
    if not data.startswith(b"%PDF"): raise HTTPException(422, "Upload a PDF file")
    try: PdfReader(BytesIO(data))
    except (PdfReadError, ValueError) as exc: raise HTTPException(422, "That PDF could not be read. Save it again as PDF and retry.") from exc

    plan = db.query(LessonPlan).filter_by(class_id=cls.id, subject=subject, week_start=week).first()
    if plan and plan.status == "approved": raise HTTPException(409, "This week's plan is already approved by the HM")
    if plan and plan.teacher_id != teacher.id: raise HTTPException(409, "Another teacher has uploaded this class's plan for that week")
    if not plan:
        plan = LessonPlan(teacher_id=teacher.id, class_id=cls.id, subject=subject, academic_year=year, week_start=week); db.add(plan)
    plan.topic = topic.strip(); plan.file_name = (file.filename or "lesson-plan.pdf")[:200]; plan.file_size = len(data); plan.pdf = data
    plan.status = "pending"; plan.note = None; plan.decided_by = None; plan.decided_at = None; plan.uploaded_at = datetime.utcnow()
    db.commit(); db.refresh(plan)
    return out_many(db, [plan])[0]


def _readable(db: Session, account: Account, plan_id: int) -> LessonPlan:
    plan = db.get(LessonPlan, plan_id)
    if not plan: raise HTTPException(404, "Lesson plan not found")
    if account.role == "teacher" and plan.teacher_id != teacher_profile(db, account).id: raise HTTPException(403, "Not your lesson plan")
    return plan


@router.delete("/{plan_id}", summary="Teacher deletes their own plan (not once approved)")
def delete_plan(plan_id: int, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    plan = _readable(db, account, plan_id)
    if plan.status == "approved": raise HTTPException(409, "An approved plan can't be deleted")
    db.delete(plan); db.commit()
    return Response(status_code=204)


class DecisionIn(BaseModel):
    approve: bool
    note: str | None = Field(default=None, max_length=500)


@router.patch("/{plan_id}/decision", summary="HM approves or returns a lesson plan")
def decide_plan(plan_id: int, data: DecisionIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin"))):
    plan = db.get(LessonPlan, plan_id)
    if not plan: raise HTTPException(404, "Lesson plan not found")
    if not data.approve and not (data.note or "").strip(): raise HTTPException(422, "Give the teacher a reason for returning it")
    plan.status = "approved" if data.approve else "returned"; plan.note = None if data.approve else data.note.strip()
    plan.decided_by = account.id; plan.decided_at = datetime.utcnow()
    db.commit()
    return out_many(db, [plan])[0]


def _pdf_response(data: bytes, filename: str) -> StreamingResponse:
    safe = "".join(c if c.isalnum() or c in "-_. " else "_" for c in filename)
    return StreamingResponse(BytesIO(data), media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{safe}"'})


@router.get("/{plan_id}/file", summary="One lesson plan PDF")
def plan_file(plan_id: int, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    plan = db.query(LessonPlan).options(undefer(LessonPlan.pdf)).filter(LessonPlan.id == _readable(db, account, plan_id).id).one()
    return _pdf_response(plan.pdf, plan.file_name)


@router.get("/merged", summary="Several lesson plans merged into one PDF (oldest week first) for printing / submission")
def merged_file(ids: str = Query(..., description="Comma-separated plan ids"), db: Session = Depends(get_db),
                account: Account = Depends(require_roles("admin", "teacher"))):
    try: wanted = [int(x) for x in ids.split(",") if x.strip()]
    except ValueError as exc: raise HTTPException(422, "ids must be numbers") from exc
    if not wanted: raise HTTPException(422, "Choose at least one plan")
    if len(wanted) > 300: raise HTTPException(422, "Choose at most 300 plans at a time")
    q = db.query(LessonPlan).options(undefer(LessonPlan.pdf)).filter(LessonPlan.id.in_(wanted))
    if account.role == "teacher": q = q.filter(LessonPlan.teacher_id == teacher_profile(db, account).id)
    codes = dict(db.query(AcademicClass.id, AcademicClass.code).all())
    plans = sorted(q.all(), key=lambda p: (p.week_start, codes.get(p.class_id, ""), p.subject))
    if not plans: raise HTTPException(404, "No lesson plans found")
    writer = PdfWriter()
    for p in plans:
        try: writer.append(BytesIO(p.pdf), outline_item=f"{week_label(p.week_start)} · {codes.get(p.class_id)} {p.subject}")
        except (PdfReadError, ValueError): continue  # a damaged file never blocks the rest
    out = BytesIO(); writer.write(out)
    first, last = plans[0].week_start, plans[-1].week_start
    return _pdf_response(out.getvalue(), f"Notes of Presence {first:%d-%m-%Y} to {last + timedelta(days=4):%d-%m-%Y}.pdf")


@router.get("/overview", summary="HM: week-by-week upload and approval status of every teacher's classes this year")
def overview(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    year = current_academic_year(db)
    today = monday(date.today())
    slots = (db.query(SubjectTeacherAssignment.teacher_id, AcademicClass.id, AcademicClass.code, SubjectTeacherAssignment.subject)
             .join(AcademicClass, AcademicClass.id == SubjectTeacherAssignment.class_id)
             .filter(SubjectTeacherAssignment.academic_year == year, AcademicClass.is_active.is_(True)).all())
    names = dict(db.query(Teacher.id, Account.full_name).join(Account, Account.id == Teacher.account_id).all())
    by_week = defaultdict(dict)
    for p in db.query(LessonPlan).filter(LessonPlan.academic_year == year).all():
        by_week[p.week_start][(p.class_id, p.subject)] = p
    weeks = []
    for w in reversed([w for w in year_weeks(year) if w <= today]):
        plans = by_week.get(w, {})
        missing = [{"teacher_name": names.get(t), "class_code": code, "subject": subj} for t, cid, code, subj in slots if (cid, subj) not in plans]
        weeks.append({"week_start": w, "label": week_label(w), "expected": len(slots), "uploaded": len(plans),
                      "approved": sum(1 for p in plans.values() if p.status == "approved"),
                      "pending": sum(1 for p in plans.values() if p.status == "pending"),
                      "returned": sum(1 for p in plans.values() if p.status == "returned"),
                      "missing": sorted(missing, key=lambda m: (m["teacher_name"] or "", m["class_code"], m["subject"]))})
    return {"academic_year": year, "weeks": weeks}
