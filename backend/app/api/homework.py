"""Homework: subject teachers give homework to the classes they teach, students see it, and the HM checks who gave it.

A class + subject is *expected* to get homework on a school day when that class has a period of that subject in the
timetable that day (non-academic periods such as PET, Drawing, Craft, Library and Value Education are never expected).
Dates are India dates (IST), whatever the server's clock zone.
"""
from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.school import current_academic_year, get_class
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.entities import Account, AcademicClass, Homework, SubjectTeacherAssignment, Teacher, TimetableEntry
from app.services.permissions import student_profile, teacher_profile
from app.services.push import notify, students_of

router = APIRouter(prefix="/homework", tags=["Homework"])

NO_HOMEWORK = {"PET", "Drawing", "Craft", "Library", "Value Education"}
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def today_ist() -> date:
    return (datetime.utcnow() + timedelta(hours=5, minutes=30)).date()


def teacher_names(db: Session, ids) -> dict:
    ids = {i for i in ids if i}
    return dict(db.query(Teacher.id, Account.full_name).join(Account, Account.id == Teacher.account_id).filter(Teacher.id.in_(ids)).all()) if ids else {}


def out_many(db: Session, items: list[Homework]) -> list[dict]:
    codes = dict(db.query(AcademicClass.id, AcademicClass.code).filter(AcademicClass.id.in_({h.class_id for h in items})).all()) if items else {}
    names = teacher_names(db, {h.teacher_id for h in items})
    return [{"id": h.id, "class_code": codes.get(h.class_id), "subject": h.subject, "teacher_id": h.teacher_id, "teacher_name": names.get(h.teacher_id),
             "given_on": h.given_on, "due_on": h.due_on, "details": h.details, "created_at": h.created_at, "updated_at": h.updated_at} for h in items]


def teacher_slots(db: Session, teacher: Teacher, year: str) -> list[dict]:
    """The class + subject pairs this teacher can give homework for (their academic subject assignments)."""
    rows = (db.query(AcademicClass.code, AcademicClass.id, SubjectTeacherAssignment.subject)
            .join(AcademicClass, AcademicClass.id == SubjectTeacherAssignment.class_id)
            .filter(SubjectTeacherAssignment.teacher_id == teacher.id, SubjectTeacherAssignment.academic_year == year,
                    AcademicClass.is_active.is_(True))
            .order_by(AcademicClass.grade, AcademicClass.code, SubjectTeacherAssignment.subject).all())
    return [{"class_code": code, "class_id": cid, "subject": subj} for code, cid, subj in rows if subj not in NO_HOMEWORK]


def expected_slots(db: Session, year: str, teacher_id: int | None = None, weekday: int | None = None) -> dict:
    """weekday -> {(class_id, subject): {"periods": [..], "teacher_id": ..}} from the timetable. The subject teacher
    assigned to that class + subject is the one expected to give the homework (else the timetable's teacher)."""
    assigned = {(a.class_id, a.subject): a.teacher_id for a in db.query(SubjectTeacherAssignment).filter_by(academic_year=year).all()}
    out = defaultdict(dict)
    entries = db.query(TimetableEntry).filter_by(academic_year=year)
    if weekday is not None: entries = entries.filter(TimetableEntry.weekday == weekday)
    for e in entries.all():
        if not e.subject or e.subject in NO_HOMEWORK: continue
        tid = assigned.get((e.class_id, e.subject)) or e.teacher_id
        if teacher_id is not None and tid != teacher_id: continue
        slot = out[e.weekday].setdefault((e.class_id, e.subject), {"periods": [], "teacher_id": tid})
        slot["periods"].append(e.period)
    return out


class HomeworkIn(BaseModel):
    class_code: str
    subject: str
    details: str = Field(min_length=2, max_length=2000)
    due_on: date
    given_on: date | None = None


class HomeworkPatch(BaseModel):
    details: str | None = Field(default=None, min_length=2, max_length=2000)
    due_on: date | None = None


@router.get("/setup", summary="Teacher: the class + subject pairs they give homework for, and today's periods")
def setup(db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    teacher = teacher_profile(db, account); year = current_academic_year(db); today = today_ist()
    slots = teacher_slots(db, teacher, year)
    today_slots = expected_slots(db, year, teacher.id, today.weekday()).get(today.weekday(), {})
    given = {(h.class_id, h.subject) for h in db.query(Homework).filter_by(teacher_id=teacher.id, given_on=today).all()}
    for s in slots:
        key = (s["class_id"], s["subject"])
        s["periods_today"] = sorted(today_slots[key]["periods"]) if key in today_slots else []
        s["given_today"] = key in given
    return {"today": today, "weekday": WEEKDAYS[today.weekday()], "slots": slots}


@router.get("", summary="Homework list: a teacher's own, or (HM) filtered by class / teacher / dates")
def list_homework(class_code: str | None = None, subject: str | None = None, teacher_id: int | None = None,
                  date_from: date | None = None, date_to: date | None = None, limit: int = Query(200, le=1000),
                  db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    q = db.query(Homework).filter(Homework.academic_year == current_academic_year(db))
    if account.role == "teacher": q = q.filter(Homework.teacher_id == teacher_profile(db, account).id)
    elif teacher_id: q = q.filter(Homework.teacher_id == teacher_id)
    if class_code: q = q.filter(Homework.class_id == get_class(db, class_code).id)
    if subject: q = q.filter(Homework.subject == subject)
    if date_from: q = q.filter(Homework.given_on >= date_from)
    if date_to: q = q.filter(Homework.given_on <= date_to)
    return out_many(db, q.order_by(Homework.given_on.desc(), Homework.id.desc()).limit(limit).all())


@router.get("/mine", summary="Student: their class's homework (given in the last two weeks, or not yet due)")
def my_homework(db: Session = Depends(get_db), account: Account = Depends(require_roles("student"))):
    student = student_profile(db, account); today = today_ist()
    items = (db.query(Homework).filter(Homework.class_id == student.class_id,
                                       (Homework.given_on >= today - timedelta(days=14)) | (Homework.due_on >= today))
             .order_by(Homework.given_on.desc(), Homework.id.desc()).all())
    return {"today": today, "items": out_many(db, items)}


def _own(db: Session, account: Account, homework_id: int) -> Homework:
    h = db.get(Homework, homework_id)
    if not h: raise HTTPException(404, "Homework not found")
    if h.teacher_id != teacher_profile(db, account).id: raise HTTPException(403, "Not your homework")
    return h


@router.post("", status_code=201, summary="Teacher gives homework to one of their classes")
def give_homework(data: HomeworkIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    teacher = teacher_profile(db, account); cls = get_class(db, data.class_code); year = current_academic_year(db)
    if data.subject in NO_HOMEWORK or not db.query(SubjectTeacherAssignment).filter_by(class_id=cls.id, subject=data.subject, teacher_id=teacher.id, academic_year=year).first():
        raise HTTPException(403, f"You are not the {data.subject} teacher of {cls.code}")
    today = today_ist(); given = data.given_on or today
    if given > today: raise HTTPException(422, "Homework can't be dated in the future")
    if given < today - timedelta(days=7): raise HTTPException(422, "Homework can be added for the last 7 days only")
    if data.due_on < given: raise HTTPException(422, "The due date can't be before the day it is given")
    h = Homework(teacher_id=teacher.id, class_id=cls.id, subject=data.subject, academic_year=year, given_on=given, due_on=data.due_on, details=data.details.strip())
    db.add(h); db.commit(); db.refresh(h)
    notify(db, students_of(db, cls.id), f"New homework · {h.subject}", h.details, "/student/homework", f"homework-{h.id}")
    return out_many(db, [h])[0]


@router.patch("/{homework_id}", summary="Teacher edits their homework")
def edit_homework(homework_id: int, data: HomeworkPatch, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    h = _own(db, account, homework_id)
    if data.details is not None: h.details = data.details.strip()
    if data.due_on is not None:
        if data.due_on < h.given_on: raise HTTPException(422, "The due date can't be before the day it is given")
        h.due_on = data.due_on
    h.updated_at = datetime.utcnow(); db.commit(); db.refresh(h)
    return out_many(db, [h])[0]


@router.delete("/{homework_id}", status_code=204, summary="Teacher deletes their homework")
def delete_homework(homework_id: int, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    db.delete(_own(db, account, homework_id)); db.commit()


@router.get("/check", summary="HM: one day's timetable periods (class + subject) and whether homework was given")
def day_check(day: date | None = None, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    day = day or today_ist(); year = current_academic_year(db)
    expected = expected_slots(db, year, weekday=day.weekday()).get(day.weekday(), {})
    given = defaultdict(list)
    for h in out_many(db, db.query(Homework).filter_by(academic_year=year, given_on=day).all()):
        given[(h["class_code"], h["subject"])].append(h)
    classes = {c.id: c for c in db.query(AcademicClass).filter(AcademicClass.id.in_({cid for cid, _ in expected})).all()} if expected else {}
    names = teacher_names(db, {s["teacher_id"] for s in expected.values()})
    rows = []
    for (cid, subj), s in expected.items():
        cls = classes.get(cid)
        if not cls or not cls.is_active: continue
        hw = given.pop((cls.code, subj), [])
        rows.append({"class_code": cls.code, "grade": cls.grade, "subject": subj, "periods": sorted(s["periods"]), "teacher_id": s["teacher_id"],
                     "teacher_name": names.get(s["teacher_id"]), "status": "given" if hw else "missing", "homework": hw})
    # Homework given on a day without a period of that subject still counts (shown as extra).
    for (code, subj), hw in given.items():
        cls = get_class(db, code)
        rows.append({"class_code": code, "grade": cls.grade, "subject": subj, "periods": [], "teacher_id": hw[0]["teacher_id"],
                     "teacher_name": hw[0]["teacher_name"], "status": "extra", "homework": hw})
    rows.sort(key=lambda r: (r["grade"], r["class_code"], r["subject"]))
    expected_n = sum(1 for r in rows if r["status"] != "extra"); given_n = sum(1 for r in rows if r["status"] == "given")
    return {"day": day, "weekday": WEEKDAYS[day.weekday()], "today": today_ist(), "expected": expected_n, "given": given_n,
            "missing": expected_n - given_n, "rows": rows}


def now_ist() -> datetime:
    return datetime.utcnow() + timedelta(hours=5, minutes=30)


TEACHER_REMIND_HOUR = 13  # teachers are reminded from 1 PM (after most periods are over)
HM_REMIND_HOUR = 15  # the HM is told how many were missed from 3 PM


def missing_today(db: Session, teacher_id: int | None = None) -> list[dict]:
    """Today's class + subject periods (Mon–Fri) still without homework: [{class_code, subject, teacher_id}]."""
    today = today_ist()
    if today.weekday() > 4: return []
    year = current_academic_year(db)
    expected = expected_slots(db, year, teacher_id, today.weekday()).get(today.weekday(), {})
    if not expected: return []
    q = db.query(Homework.class_id, Homework.subject).filter_by(academic_year=year, given_on=today)
    if teacher_id is not None: q = q.filter(Homework.teacher_id == teacher_id)
    given = set(q.all())
    active = dict(db.query(AcademicClass.id, AcademicClass.code).filter(AcademicClass.id.in_({c for c, _ in expected}), AcademicClass.is_active.is_(True)).all())
    return [{"class_code": active[cid], "subject": subj, "teacher_id": s["teacher_id"]}
            for (cid, subj), s in sorted(expected.items(), key=lambda kv: (active.get(kv[0][0], ""), kv[0][1]))
            if cid in active and (cid, subj) not in given]


@router.get("/teachers", summary="HM: per teacher, homework given vs. the periods they had (a date range, default this week)")
def teacher_summary(date_from: date | None = None, date_to: date | None = None, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    today = today_ist(); year = current_academic_year(db)
    date_to = min(date_to or today, today)
    date_from = date_from or (date_to - timedelta(days=date_to.weekday()))
    if date_from > date_to: raise HTTPException(422, "The start date is after the end date")
    if (date_to - date_from).days > 366: raise HTTPException(422, "Pick a range of one year or less")
    by_day = expected_slots(db, year)
    given = defaultdict(set); last = {}; total = defaultdict(int)
    for h in db.query(Homework).filter(Homework.academic_year == year, Homework.given_on >= date_from, Homework.given_on <= date_to).all():
        given[h.teacher_id].add((h.given_on, h.class_id, h.subject)); total[h.teacher_id] += 1
    for tid, d in db.query(Homework.teacher_id, Homework.given_on).filter(Homework.academic_year == year).all():
        if tid not in last or d > last[tid]: last[tid] = d
    stats = defaultdict(lambda: {"expected": 0, "given": 0, "missed": []})
    codes = dict(db.query(AcademicClass.id, AcademicClass.code).all())
    d = date_from
    while d <= date_to:
        for (cid, subj), s in by_day.get(d.weekday(), {}).items():
            if not s["teacher_id"]: continue
            st = stats[s["teacher_id"]]; st["expected"] += 1
            if (d, cid, subj) in given[s["teacher_id"]]: st["given"] += 1
            else: st["missed"].append({"day": d, "class_code": codes.get(cid), "subject": subj})
        d += timedelta(days=1)
    ids = set(stats) | set(total)
    names = teacher_names(db, ids)
    rows = [{"teacher_id": tid, "teacher_name": names.get(tid), "expected": stats[tid]["expected"], "given": stats[tid]["given"],
             "missing": stats[tid]["expected"] - stats[tid]["given"], "homework_count": total[tid],
             "given_percent": round(stats[tid]["given"] * 100 / stats[tid]["expected"]) if stats[tid]["expected"] else None,
             "last_given": last.get(tid), "missed": sorted(stats[tid]["missed"], key=lambda m: m["day"], reverse=True)[:30]}
            for tid in ids if names.get(tid)]
    rows.sort(key=lambda r: (r["given_percent"] if r["given_percent"] is not None else 101, r["teacher_name"]))
    return {"date_from": date_from, "date_to": date_to, "rows": rows}
