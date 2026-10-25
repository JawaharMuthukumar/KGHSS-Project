"""Subject teachers enter marks for their own subject; the class teacher accepts them into the class's marks.

Two ways to hand marks over, both checked the same way before anything is written:
  1. in the app: the subject teacher sends a verified list; the class teacher accepts (or returns) it;
  2. a CSV file: the subject teacher downloads it (with a verification code) and shares it; the class
     teacher uploads it, sees an old → new preview, and confirms.
Only that one subject's marks change; other subjects are never touched.
"""
import csv
import hashlib
import hmac
import io
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.school import class_students, clean_mark, get_class, term_assessment, upsert_mark
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.entities import (Account, AcademicClass, Mark, MarkSubmission, Student, SubjectTeacherAssignment,
    Teacher)
from app.services.mark_scheme import subject_components, subjects_for_class, terms_for_grade
from app.services.permissions import is_class_teacher_of, teacher_profile

router = APIRouter(tags=["Subject Marks"])

FILE_TITLE = "GHSS Kangayampalayam - Subject Marks"


class SubjectMarksIn(BaseModel):
    term: str
    subject: str
    students: dict[str, dict] = Field(default_factory=dict)  # {student_id: {"absent": bool, "components": {key: value}}}


class ReturnIn(BaseModel):
    note: str = Field(min_length=2, max_length=500)


# ---- shared checks -------------------------------------------------------------------------------

def check_class_subject_term(cls: AcademicClass, subject: str, term: str):
    if subject not in subjects_for_class(cls): raise HTTPException(422, f"{subject} is not a subject of class {cls.code}")
    if term not in terms_for_grade(cls.grade): raise HTTPException(422, f"'{term}' is not an exam for class {cls.code}")


def teaches(db: Session, teacher: Teacher, cls: AcademicClass, subject: str) -> bool:
    """Subject teacher of this subject in this class (this year), or the class teacher."""
    return bool(db.query(SubjectTeacherAssignment).filter_by(class_id=cls.id, teacher_id=teacher.id, subject=subject,
                                                             academic_year=cls.academic_year).first()
                or is_class_teacher_of(db, teacher, cls))


def require_class_teacher(db: Session, account: Account, cls: AcademicClass) -> Teacher:
    teacher = teacher_profile(db, account)
    if not is_class_teacher_of(db, teacher, cls): raise HTTPException(403, "Only the class teacher can accept marks for this class")
    return teacher


def clean_entries(cls: AcademicClass, subject: str, raw: dict) -> dict[int, dict]:
    """Validated marks keyed by student id; students left blank (not absent, nothing typed) are skipped."""
    scheme = subject_components(cls, subject)
    cleaned = {}
    for sid, value in raw.items():
        comps = value.get("components") or {}
        if not value.get("absent") and all(comps.get(k) in (None, "") for k, _, _ in scheme):
            continue
        cleaned[int(sid)] = clean_mark(subject, scheme, value)
    return cleaned


def preview(db: Session, cls: AcademicClass, term: str, subject: str, entries: dict[int, dict]) -> dict:
    """Old → new marks for the class teacher to check before anything is saved."""
    students = {s.id: s for s in class_students(db, cls).all()}
    outside = [sid for sid in entries if sid not in students]
    assessment = term_assessment(db, cls, term)
    old = {m.student_id: m for m in db.query(Mark).filter_by(assessment_id=assessment.id, subject=subject)} if assessment else {}
    rows = []
    for sid, s in sorted(students.items(), key=lambda kv: kv[1].registration_no):
        new, before = entries.get(sid), old.get(sid)
        rows.append({"student_id": sid, "registration_no": s.registration_no, "name": s.account.full_name,
                     "old": None if not before else {"score": before.score, "absent": before.absent},
                     "new": None if not new else {"score": new["score"], "absent": new["absent"], "components": new["components"]},
                     "changed": bool(new) and (not before or before.score != new["score"] or before.absent != new["absent"])})
    return {"class_code": cls.code, "term": term, "subject": subject, "rows": rows,
            "entered": sum(1 for r in rows if r["new"]), "blank": sum(1 for r in rows if not r["new"]),
            "changed": sum(1 for r in rows if r["changed"]), "outside_class": len(outside)}


def apply_entries(db: Session, cls: AcademicClass, term: str, subject: str, entries: dict[int, dict], account: Account) -> int:
    current = {s.id for s in class_students(db, cls).all()}
    assessment = term_assessment(db, cls, term, create=True)
    saved = 0
    for sid, cleaned in entries.items():
        if sid in current:  # a student who left the class since is skipped
            upsert_mark(db, sid, assessment, subject, cleaned, account); saved += 1
    return saved


# ---- subject teacher -----------------------------------------------------------------------------

@router.get("/classes/{class_code}/subject-marks", summary="One subject's marks for a class (subject teacher view)")
def get_subject_marks(class_code: str, term: str, subject: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    cls = get_class(db, class_code); check_class_subject_term(cls, subject, term)
    teacher = teacher_profile(db, account)
    if not teaches(db, teacher, cls, subject): raise HTTPException(403, f"You don't teach {subject} in {cls.code}")
    assessment = term_assessment(db, cls, term)
    saved = {m.student_id: m for m in db.query(Mark).filter_by(assessment_id=assessment.id, subject=subject)} if assessment else {}
    last = (db.query(MarkSubmission).filter_by(class_id=cls.id, academic_year=cls.academic_year, term=term, subject=subject, teacher_id=teacher.id)
            .order_by(MarkSubmission.id.desc()).first())
    draft = (last.entries if last and last.status != "accepted" else {}) or {}
    students = []
    for s in class_students(db, cls).order_by(Student.registration_no).all():
        m, d = saved.get(s.id), draft.get(str(s.id))
        students.append({"student_id": s.id, "registration_no": s.registration_no, "name": s.account.full_name,
                         "saved": None if not m else {"absent": m.absent, "components": m.components or {}, "score": m.score},
                         "sent": d})
    return {"class_code": cls.code, "term": term, "subject": subject, "terms": terms_for_grade(cls.grade),
            "components": [{"key": k, "label": label, "max": mx} for k, label, mx in subject_components(cls, subject)],
            "students": students,
            "last_submission": None if not last else {"id": last.id, "status": last.status, "note": last.note,
                                                      "created_at": last.created_at, "decided_at": last.decided_at}}


@router.post("/classes/{class_code}/subject-marks/submit", summary="Send verified marks to the class teacher")
def submit_subject_marks(class_code: str, data: SubjectMarksIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    cls = get_class(db, class_code); check_class_subject_term(cls, data.subject, data.term)
    teacher = teacher_profile(db, account)
    if not teaches(db, teacher, cls, data.subject): raise HTTPException(403, f"You don't teach {data.subject} in {cls.code}")
    entries = clean_entries(cls, data.subject, data.students)
    if not entries: raise HTTPException(422, "Enter at least one student's mark before sending")
    outside = set(entries) - {s.id for s in class_students(db, cls).all()}
    if outside: raise HTTPException(422, "The list includes students who are not in this class")
    # A newer list replaces an earlier one that the class teacher hasn't accepted yet.
    db.query(MarkSubmission).filter_by(class_id=cls.id, academic_year=cls.academic_year, term=data.term, subject=data.subject,
                                       teacher_id=teacher.id, status="pending").update({MarkSubmission.status: "replaced"})
    sub = MarkSubmission(class_id=cls.id, academic_year=cls.academic_year, term=data.term, subject=data.subject,
                         teacher_id=teacher.id, status="pending", entries={str(k): v for k, v in entries.items()})
    db.add(sub); db.commit()
    return {"id": sub.id, "status": sub.status, "entered": len(entries)}


def signature(cls_code: str, term: str, subject: str, year: str, teacher_username: str, rows: list[tuple]) -> str:
    """Verification code over everything that matters, so an edited file is caught on upload."""
    body = "|".join([cls_code, term, subject, year, teacher_username.lower(),
                     *(f"{reg}:{int(absent)}:{','.join(str(c) for c in comps)}" for reg, absent, comps in sorted(rows))])
    return hmac.new(settings.jwt_secret_key.encode(), body.encode(), hashlib.sha256).hexdigest()[:16].upper()


@router.post("/classes/{class_code}/subject-marks/csv", summary="Download verified marks as a CSV file to share")
def subject_marks_csv(class_code: str, data: SubjectMarksIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    cls = get_class(db, class_code); check_class_subject_term(cls, data.subject, data.term)
    teacher = teacher_profile(db, account)
    if not teaches(db, teacher, cls, data.subject): raise HTTPException(403, f"You don't teach {data.subject} in {cls.code}")
    entries = clean_entries(cls, data.subject, data.students)
    scheme = subject_components(cls, data.subject)
    out = io.StringIO(); w = csv.writer(out)
    w.writerow([FILE_TITLE]); w.writerow(["Class", cls.code]); w.writerow(["Exam", data.term]); w.writerow(["Subject", data.subject])
    w.writerow(["Academic Year", cls.academic_year]); w.writerow(["Teacher", account.full_name, account.username]); w.writerow([])
    w.writerow(["Reg No", "Name", *(f"{label} (/{mx})" for _, label, mx in scheme), "Total", "Absent"])
    signed = []
    for s in class_students(db, cls).order_by(Student.registration_no).all():
        e = entries.get(s.id)
        if not e:
            w.writerow([s.registration_no, s.account.full_name, *([""] * len(scheme)), "", ""]); continue
        comps = [e["components"].get(k, "") for k, _, _ in scheme] if not e["absent"] else [""] * len(scheme)
        w.writerow([s.registration_no, s.account.full_name, *comps, "" if e["absent"] else e["score"], "AB" if e["absent"] else ""])
        signed.append((s.registration_no, e["absent"], [] if e["absent"] else comps))
    w.writerow([])
    w.writerow(["Verification Code", signature(cls.code, data.term, data.subject, cls.academic_year, account.username, signed)])
    name = f"{cls.code}_{data.subject}_{data.term}.csv".replace(" ", "-")
    return Response("﻿" + out.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


# ---- class teacher -------------------------------------------------------------------------------

def submission_out(db: Session, sub: MarkSubmission, with_preview: bool = False) -> dict:
    teacher = db.get(Teacher, sub.teacher_id)
    out = {"id": sub.id, "term": sub.term, "subject": sub.subject, "status": sub.status, "note": sub.note,
           "teacher_name": teacher.account.full_name if teacher else None, "created_at": sub.created_at,
           "entered": len(sub.entries or {})}
    if with_preview:
        cls = db.get(AcademicClass, sub.class_id)
        out["preview"] = preview(db, cls, sub.term, sub.subject, {int(k): v for k, v in (sub.entries or {}).items()})
    return out


@router.get("/classes/{class_code}/mark-submissions", summary="Subject teachers' marks waiting for the class teacher")
def list_submissions(class_code: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    cls = get_class(db, class_code); require_class_teacher(db, account, cls)
    subs = (db.query(MarkSubmission).filter_by(class_id=cls.id, academic_year=cls.academic_year, status="pending")
            .order_by(MarkSubmission.created_at.desc()).all())
    return [submission_out(db, s) for s in subs]


@router.get("/mark-submissions/{submission_id}", summary="One submission with an old → new preview")
def get_submission(submission_id: int, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    sub = db.get(MarkSubmission, submission_id)
    if not sub: raise HTTPException(404, "Submission not found")
    require_class_teacher(db, account, db.get(AcademicClass, sub.class_id))
    return submission_out(db, sub, with_preview=True)


@router.post("/mark-submissions/{submission_id}/accept", summary="Class teacher accepts: only that subject's marks are saved")
def accept_submission(submission_id: int, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    sub = db.get(MarkSubmission, submission_id)
    if not sub: raise HTTPException(404, "Submission not found")
    cls = db.get(AcademicClass, sub.class_id); require_class_teacher(db, account, cls)
    if sub.status != "pending": raise HTTPException(409, "This list was already handled")
    if sub.academic_year != cls.academic_year: raise HTTPException(409, "This list is from an earlier academic year")
    teacher = db.get(Teacher, sub.teacher_id)
    if not teacher or not teaches(db, teacher, cls, sub.subject):
        raise HTTPException(409, f"{teacher.account.full_name if teacher else 'That teacher'} no longer teaches {sub.subject} in {cls.code}")
    entries = {int(k): v for k, v in sub.entries.items()}
    saved = apply_entries(db, cls, sub.term, sub.subject, entries, account)
    sub.status = "accepted"; sub.decided_at = datetime.utcnow(); sub.decided_by = account.id
    db.commit()
    return {"saved_marks": saved, **submission_out(db, sub)}


@router.post("/mark-submissions/{submission_id}/return", summary="Class teacher sends the list back with a note")
def return_submission(submission_id: int, data: ReturnIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    sub = db.get(MarkSubmission, submission_id)
    if not sub: raise HTTPException(404, "Submission not found")
    require_class_teacher(db, account, db.get(AcademicClass, sub.class_id))
    if sub.status != "pending": raise HTTPException(409, "This list was already handled")
    sub.status = "returned"; sub.note = data.note.strip(); sub.decided_at = datetime.utcnow(); sub.decided_by = account.id
    db.commit()
    return submission_out(db, sub)


def parse_marks_csv(db: Session, cls: AcademicClass, raw: bytes) -> tuple[dict, dict]:
    """Read a subject teacher's file and check it belongs to this class; returns (meta, entries)."""
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(422, "This is not a marks file downloaded from the portal")
    rows = list(csv.reader(io.StringIO(text)))
    meta = {r[0].strip(): [c.strip() for c in r[1:]] for r in rows[:8] if r and r[0].strip()}
    if not rows or rows[0][0].strip() != FILE_TITLE or not all(k in meta for k in ("Class", "Exam", "Subject", "Teacher")):
        raise HTTPException(422, "This is not a marks file downloaded from the portal")
    file_class, term, subject = meta["Class"][0], meta["Exam"][0], meta["Subject"][0]
    year = (meta.get("Academic Year") or [""])[0]
    if file_class.lower() != cls.code.lower():
        raise HTTPException(422, f"This file is for class {file_class}, not {cls.code}")
    if year and year != cls.academic_year: raise HTTPException(422, f"This file is from academic year {year}")
    check_class_subject_term(cls, subject, term)
    teacher_username = meta["Teacher"][1] if len(meta["Teacher"]) > 1 else ""
    teacher_account = db.query(Account).filter_by(username=teacher_username, role="teacher").first()
    teacher = db.query(Teacher).filter_by(account_id=teacher_account.id).first() if teacher_account else None
    if not teacher or not teaches(db, teacher, cls, subject):
        raise HTTPException(422, f"{meta['Teacher'][0]} is not the {subject} teacher of {cls.code}")

    header_at = next((i for i, r in enumerate(rows) if r and r[0].strip() == "Reg No"), None)
    if header_at is None: raise HTTPException(422, "The marks table is missing from this file")
    scheme = subject_components(cls, subject)
    students = {s.registration_no.lower(): s for s in class_students(db, cls).all()}
    entries, signed, unknown, code = {}, [], [], None
    for r in rows[header_at + 1:]:
        if not r or not r[0].strip(): continue
        if r[0].strip() == "Verification Code": code = (r[1].strip() if len(r) > 1 else ""); break
        reg = r[0].strip(); s = students.get(reg.lower())
        if not s: unknown.append(reg); continue
        comps = [c.strip() for c in r[2:2 + len(scheme)]]
        absent = len(r) > 3 + len(scheme) and r[3 + len(scheme)].strip().upper() == "AB"
        if not absent and all(c == "" for c in comps): continue
        cleaned = clean_mark(subject, scheme, {"absent": absent, "components": {k: c for (k, _, _), c in zip(scheme, comps)}},
                             who=f"{s.account.full_name}: ")
        entries[s.id] = cleaned
        signed.append((s.registration_no, absent, [] if absent else comps))
    if unknown:
        raise HTTPException(422, f"These register numbers are not in {cls.code}: {', '.join(unknown[:5])}{'…' if len(unknown) > 5 else ''}")
    if code != signature(cls.code, term, subject, cls.academic_year, teacher_username, signed):
        raise HTTPException(422, "This file was changed after the subject teacher verified it. Ask them to download and send it again.")
    return {"term": term, "subject": subject, "teacher_name": meta["Teacher"][0]}, entries


@router.post("/classes/{class_code}/marks/import-csv", summary="Class teacher uploads a subject teacher's marks file")
async def import_marks_csv(class_code: str, file: UploadFile = File(...), confirm: bool = Form(False),
                           db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    cls = get_class(db, class_code); require_class_teacher(db, account, cls)
    raw = await file.read()
    if len(raw) > 512_000: raise HTTPException(413, "This file is too large to be a marks file")
    meta, entries = parse_marks_csv(db, cls, raw)
    if not entries: raise HTTPException(422, "The file has no marks in it")
    if not confirm:
        return {"confirmed": False, **meta, "preview": preview(db, cls, meta["term"], meta["subject"], entries)}
    saved = apply_entries(db, cls, meta["term"], meta["subject"], entries, account)
    db.commit()
    return {"confirmed": True, **meta, "saved_marks": saved}
