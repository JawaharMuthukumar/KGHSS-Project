"""HM manages higher-secondary groups (subjects) and their 11th/12th classes.

A group's classes share its section letter: group D → 11D / 12D (Tamil medium) and 11D1 / 12D1 (English).
11th → 12th always keeps the section, so adding an 11th class also makes its 12th class. Nothing is ever
hard-deleted: a class is hidden only when nobody is in it or headed to it, so existing students are never affected.
"""
import string

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.school import class_students, current_academic_year
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.entities import Account, AcademicClass, Assessment, PromotionEntry, PromotionList, Student, SubjectGroup
from app.services.mark_scheme import LANGUAGES

router = APIRouter(prefix="/groups", tags=["Groups"])

MEDIUM_SUFFIX = {"Tamil": "", "English": "1"}


class GroupSubjectIn(BaseModel):
    subject: str = Field(min_length=2, max_length=60)
    practical: bool = False


class GroupIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    subjects: list[GroupSubjectIn] = Field(min_length=1, max_length=6)


class GroupClassIn(BaseModel):
    group_id: int
    medium: str
    strength: int | None = Field(default=None, ge=1, le=200)


class GroupClassUpdate(BaseModel):
    intake_open: bool | None = None
    strength: int | None = Field(default=None, ge=1, le=200)


def clean_subjects(subjects: list[GroupSubjectIn]) -> list[dict]:
    rows, seen = [], set()
    for s in subjects:
        name = " ".join(s.subject.split()).title()
        if name.lower() in {l.lower() for l in LANGUAGES}:
            raise HTTPException(422, "Tamil and English are added to every group automatically")
        if name.lower() in seen: raise HTTPException(422, f"{name} is listed twice")
        seen.add(name.lower()); rows.append({"subject": name, "practical": s.practical})
    return rows


def group_classes(db: Session, group: SubjectGroup) -> list[AcademicClass]:
    return db.query(AcademicClass).filter(AcademicClass.grade >= 11, AcademicClass.group_name == group.name).all()


def group_locked(db: Session, group: SubjectGroup) -> bool:
    """Subjects can't change once any of the group's classes has had students or marks (old marks would break)."""
    ids = [c.id for c in group_classes(db, group)]
    if not ids: return False
    return bool(db.query(Student.id).filter(Student.class_id.in_(ids)).first()
                or db.query(Assessment.id).filter(Assessment.class_id.in_(ids)).first())


def partner(db: Session, cls: AcademicClass) -> AcademicClass | None:
    """11th ↔ 12th class with the same section."""
    other = 12 if cls.grade == 11 else 11
    return db.query(AcademicClass).filter_by(grade=other, section=cls.section, is_active=True).first()


def incoming_promotions(db: Session, cls: AcademicClass) -> list[tuple[str, int]]:
    """Current-year promotion lists that send students into this class: [(from class, count)]."""
    rows = (db.query(AcademicClass.code, func.count(PromotionEntry.id))
            .join(PromotionList, PromotionList.class_id == AcademicClass.id)
            .join(PromotionEntry, PromotionEntry.list_id == PromotionList.id)
            .filter(PromotionEntry.target_class_id == cls.id, PromotionEntry.decision == "promoted",
                    PromotionList.academic_year == AcademicClass.academic_year)
            .group_by(AcademicClass.code).all())
    return [(code, n) for code, n in rows]


def hide_blocker(db: Session, cls: AcademicClass) -> str | None:
    count = class_students(db, cls).count()
    if count: return f"{count} student(s) are in {cls.code}"
    if cls.grade == 12:
        feeder = partner(db, cls)
        if feeder and class_students(db, feeder).count():
            return f"{feeder.code} students move to {cls.code} next year"
    incoming = incoming_promotions(db, cls)
    if incoming:
        return "Promotion list sends students here: " + ", ".join(f"{code} ({n})" for code, n in incoming)
    return None


def class_out(db: Session, cls: AcademicClass) -> dict:
    other = partner(db, cls)
    blocker = hide_blocker(db, cls)
    return {"code": cls.code, "grade": cls.grade, "section": cls.section, "group_name": cls.group_name, "medium": cls.medium,
            "strength": cls.strength, "intake_open": bool(cls.intake_open) if cls.grade == 11 else None,
            "student_count": class_students(db, cls).count(),
            "partner_code": other.code if other else None,
            "can_hide": blocker is None, "hide_blocker": blocker}


def group_out(db: Session, group: SubjectGroup) -> dict:
    return {"id": group.id, "name": group.name, "letter": group.letter, "subjects": group.subjects,
            "locked": group_locked(db, group),
            "class_codes": sorted(c.code for c in group_classes(db, group) if c.is_active)}


@router.get("", summary="Groups with their subjects, and every 11th/12th class")
def list_groups(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    classes = (db.query(AcademicClass).filter(AcademicClass.grade >= 11, AcademicClass.is_active.is_(True))
               .order_by(AcademicClass.grade, AcademicClass.code).all())
    return {"languages": LANGUAGES, "groups": [group_out(db, g) for g in db.query(SubjectGroup).order_by(SubjectGroup.letter)],
            "classes": [class_out(db, c) for c in classes]}


@router.post("", status_code=201, summary="Create a new group with its core subjects")
def create_group(data: GroupIn, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    name = " ".join(data.name.split())
    if db.query(SubjectGroup).filter(func.lower(SubjectGroup.name) == name.lower()).first():
        raise HTTPException(409, f"A group called {name} already exists")
    used = {g.letter for g in db.query(SubjectGroup)} | {c.section.rstrip(string.digits) for c in db.query(AcademicClass).filter(AcademicClass.grade >= 11)}
    letter = next((l for l in string.ascii_uppercase if l not in used), None)
    if not letter: raise HTTPException(409, "No section letters left")
    group = SubjectGroup(name=name, letter=letter, subjects=clean_subjects(data.subjects))
    db.add(group); db.commit(); db.refresh(group)
    return group_out(db, group)


@router.put("/{group_id}", summary="Rename a group or change its subjects (only while it has no students or marks)")
def update_group(group_id: int, data: GroupIn, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    group = db.get(SubjectGroup, group_id)
    if not group: raise HTTPException(404, "Group not found")
    if group_locked(db, group): raise HTTPException(409, f"{group.name} already has students or marks, so its subjects can't change")
    name = " ".join(data.name.split())
    clash = db.query(SubjectGroup).filter(func.lower(SubjectGroup.name) == name.lower(), SubjectGroup.id != group.id).first()
    if clash: raise HTTPException(409, f"A group called {name} already exists")
    for cls in group_classes(db, group): cls.group_name = name
    group.name = name; group.subjects = clean_subjects(data.subjects)
    db.commit(); db.refresh(group)
    return group_out(db, group)


@router.post("/classes", status_code=201, summary="Add an 11th class for a group (its 12th class is made too)")
def create_group_class(data: GroupClassIn, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    group = db.get(SubjectGroup, data.group_id)
    if not group: raise HTTPException(404, "Group not found")
    if data.medium not in MEDIUM_SUFFIX: raise HTTPException(422, "Medium must be Tamil or English")
    section = group.letter + MEDIUM_SUFFIX[data.medium]
    year = current_academic_year(db)
    made = []
    for grade in (11, 12):
        code = f"{grade}{section}"
        cls = db.query(AcademicClass).filter_by(code=code).first()
        if cls and cls.is_active:
            if grade == 11: raise HTTPException(409, f"{code} already exists")
            continue  # the 12th class is already there
        if cls:  # a hidden class comes back with this group's details; its old records stay attached
            cls.is_active = True; cls.academic_year = year
        else:
            cls = AcademicClass(code=code, grade=grade, section=section, academic_year=year); db.add(cls)
        cls.group_name = group.name; cls.medium = data.medium; cls.strength = data.strength; cls.intake_open = True
        made.append(code)
    db.commit()
    return {"created": made, **list_groups(db, _)}


@router.patch("/classes/{class_code}", summary="Open/close an 11th class for 10th students, or change its seats")
def update_group_class(class_code: str, data: GroupClassUpdate, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    cls = db.query(AcademicClass).filter_by(code=class_code, is_active=True).first()
    if not cls or cls.grade < 11: raise HTTPException(404, "11th/12th class not found")
    if data.intake_open is not None:
        if cls.grade != 11: raise HTTPException(422, "Only 11th classes take 10th students")
        if not data.intake_open:
            incoming = incoming_promotions(db, cls)
            if incoming:
                raise HTTPException(409, "A promotion list already sends students here (" + ", ".join(f"{c}: {n}" for c, n in incoming)
                                    + "). Send that list back first.")
        cls.intake_open = data.intake_open
    if data.strength is not None: cls.strength = data.strength
    db.commit()
    return class_out(db, cls)


@router.post("/classes/{class_code}/hide", summary="Hide an empty 11th/12th class (records are kept)")
def hide_group_class(class_code: str, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    cls = db.query(AcademicClass).filter_by(code=class_code, is_active=True).first()
    if not cls or cls.grade < 11: raise HTTPException(404, "11th/12th class not found")
    blocker = hide_blocker(db, cls)
    if blocker: raise HTTPException(409, f"{cls.code} can't be hidden: {blocker}")
    cls.is_active = False; cls.intake_open = False
    db.commit()
    return list_groups(db, _)
