"""School subject list: exam subjects (from the mark scheme and the HM's groups) plus non-exam subjects the HM adds
(Physical Education, Library, Yoga, …). Used by the teacher form and the timetable editor."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.entities import Account, OtherSubject, SubjectGroup, Teacher
from app.services.mark_scheme import LANGUAGES

router = APIRouter(prefix="/subjects", tags=["Subjects"])

MIDDLE_SUBJECTS = ["Maths", "Science", "Social Science"]


class SubjectIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)


def exam_subjects(db: Session) -> list[str]:
    core = sorted({s["subject"] for g in db.query(SubjectGroup) for s in (g.subjects or [])} - set(MIDDLE_SUBJECTS))
    return [*LANGUAGES, *MIDDLE_SUBJECTS, *core]


def teachers_using(db: Session, name: str) -> int:
    return db.query(func.count(Teacher.id)).filter(func.lower(func.trim(Teacher.subject)) == name.lower()).scalar() or 0


def subjects_out(db: Session) -> dict:
    others = db.query(OtherSubject).order_by(OtherSubject.name).all()
    return {"exam_subjects": exam_subjects(db),
            "other_subjects": [{"id": o.id, "name": o.name, "teacher_count": teachers_using(db, o.name)} for o in others]}


@router.get("", summary="Exam subjects and the HM's other subjects/periods")
def list_subjects(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin", "teacher"))):
    return subjects_out(db)


@router.post("", status_code=201, summary="Add a non-exam subject (e.g. Physical Education)")
def add_subject(data: SubjectIn, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    name = " ".join(data.name.split())
    if name.islower(): name = name.title()  # "physical education" -> "Physical Education"; "PET" stays as typed
    taken = {s.lower() for s in exam_subjects(db)} | {o.name.lower() for o in db.query(OtherSubject)}
    if name.lower() in taken: raise HTTPException(409, f"{name} is already in the subject list")
    db.add(OtherSubject(name=name)); db.commit()
    return {"added": name, **subjects_out(db)}


@router.delete("/{subject_id}", summary="Remove a non-exam subject no teacher uses")
def remove_subject(subject_id: int, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    other = db.get(OtherSubject, subject_id)
    if not other: raise HTTPException(404, "Subject not found")
    used = teachers_using(db, other.name)
    if used: raise HTTPException(409, f"{used} teacher(s) have {other.name} as their subject; change them first")
    db.delete(other); db.commit()
    return subjects_out(db)
