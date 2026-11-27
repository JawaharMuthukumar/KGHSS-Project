"""The running academic year as the HM set it (label + start/end dates) and its Monday-to-Friday weeks."""
from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.entities import AcademicClass, AcademicYear


def default_dates(label: str) -> tuple[date, date]:
    """June to May, used until the HM sets the real dates."""
    start = int(label[:4])
    return date(start, 6, 1), date(start + 1, 5, 31)


def current_year(db: Session) -> AcademicYear:
    """The current academic year row; created from the classes' running year (June–May) if none exists yet."""
    rec = db.query(AcademicYear).filter_by(is_current=True).first()
    if rec: return rec
    label = db.query(func.max(AcademicClass.academic_year)).filter(AcademicClass.is_active.is_(True)).scalar() or "2026-2027"
    rec = db.query(AcademicYear).filter_by(label=label).first()
    if not rec:
        start, end = default_dates(label)
        rec = AcademicYear(label=label, start_date=start, end_date=end); db.add(rec)
    rec.is_current = True
    db.flush()
    return rec


def monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def year_weeks(rec: AcademicYear) -> list[date]:
    """Mondays of every Monday–Friday week from the year's start date to its end date."""
    weeks, d = [], monday(rec.start_date)
    while d <= rec.end_date:
        weeks.append(d); d += timedelta(days=7)
    return weeks


def year_out(rec: AcademicYear) -> dict:
    return {"label": rec.label, "display": f"{rec.label[:4]}–{rec.label[-2:]}", "start_date": rec.start_date, "end_date": rec.end_date,
            "start_month": rec.start_date.strftime("%Y-%m"), "end_month": rec.end_date.strftime("%Y-%m"),
            "range": f"{rec.start_date:%B %Y} – {rec.end_date:%B %Y}"}
