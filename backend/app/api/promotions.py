"""Year-end promotion: the class teacher decides each student's next class, the HM approves class-wise,
then the HM starts the new academic year and every class moves up together."""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.school import class_students, current_academic_year, get_class
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.entities import (Account, AcademicClass, ClassTeacherAssignment, Notice, PromotionEntry, PromotionList,
    Student, Teacher)
from app.services.permissions import is_class_teacher_of, teacher_profile

router = APIRouter(prefix="/promotions", tags=["Promotions"])

Decision = Literal["promoted", "not_promoted", "left", "passed_out"]


class PromotionEntryIn(BaseModel):
    student_id: int
    decision: Decision
    target_class_code: str | None = None


class PromotionListIn(BaseModel):
    entries: list[PromotionEntryIn]
    submit: bool = False


class ReturnIn(BaseModel):
    note: str = Field(min_length=2, max_length=500)


class StartYearIn(BaseModel):
    confirm_year: str  # must equal the next academic year, as a typed safety check


def next_year(year: str) -> str:
    start = int(year[:4]) + 1
    return f"{start}-{start + 1}"


def next_class_options(db: Session, cls: AcademicClass) -> list[AcademicClass]:
    """Classes a promoted student may go to. Only after 10th is there a choice (the 11th group);
    every other class moves up to the same section and group (8A → 9A, 11B1 → 12B1)."""
    if cls.grade >= 12: return []
    nxt = (db.query(AcademicClass).filter_by(grade=cls.grade + 1, is_active=True)
           .order_by(AcademicClass.code).all())
    return nxt if cls.grade == 10 else [o for o in nxt if o.section == cls.section]


def default_target(cls: AcademicClass, options: list[AcademicClass]) -> AcademicClass | None:
    """The fixed next class; after 10th the teacher picks the 11th group, so there is no default."""
    if cls.grade == 10 or not options: return None
    return options[0]


def allowed_decisions(cls: AcademicClass) -> list[str]:
    return ["passed_out", "not_promoted", "left"] if cls.grade >= 12 else ["promoted", "not_promoted", "left"]


def class_list(db: Session, cls: AcademicClass) -> PromotionList | None:
    return db.query(PromotionList).filter_by(class_id=cls.id, academic_year=cls.academic_year).first()


def require_class_teacher_or_admin(db: Session, account: Account, cls: AcademicClass):
    if account.role == "teacher" and not is_class_teacher_of(db, teacher_profile(db, account), cls):
        raise HTTPException(403, "Only the class teacher can prepare this class's promotion list")


def missing_students(db: Session, cls: AcademicClass, plist: PromotionList) -> list[Student]:
    """Current students with no decision in the list (e.g. joined after it was submitted)."""
    decided = {e.student_id for e in plist.entries}
    return [s for s in class_students(db, cls).all() if s.id not in decided]


def class_teacher_name(db: Session, cls: AcademicClass) -> str | None:
    link = db.query(ClassTeacherAssignment).filter_by(class_id=cls.id, academic_year=cls.academic_year).first()
    teacher = db.get(Teacher, link.teacher_id) if link else None
    return teacher.account.full_name if teacher else None


def list_summary(db: Session, cls: AcademicClass, plist: PromotionList | None) -> dict:
    counts = {d: 0 for d in ("promoted", "not_promoted", "left", "passed_out")}
    for e in (plist.entries if plist else []): counts[e.decision] += 1
    return {"status": plist.status if plist else "none", "counts": counts, "note": plist.note if plist else None,
            "submitted_at": plist.submitted_at if plist else None, "decided_at": plist.decided_at if plist else None}


@router.get("/classes/{class_code}", summary="One class's promotion list (class teacher or HM)")
def get_class_promotion(class_code: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = get_class(db, class_code)
    require_class_teacher_or_admin(db, account, cls)
    plist = class_list(db, cls)
    options = next_class_options(db, cls)
    by_id = {o.id: o for o in options}
    default = default_target(cls, options)
    entries = {e.student_id: e for e in (plist.entries if plist else [])}
    students = []
    for s in class_students(db, cls).order_by(Student.registration_no).all():
        e = entries.get(s.id)
        if e:
            decision, target = e.decision, by_id.get(e.target_class_id)
        else:  # suggestion until the teacher saves: everyone moves up to the same section
            decision, target = ("passed_out", None) if cls.grade >= 12 else ("promoted", default)
        students.append({"student_id": s.id, "name": s.account.full_name, "registration_no": s.registration_no,
                         "gender": s.gender, "decision": decision, "target_class_code": target.code if target else None,
                         "saved": bool(e)})
    status = plist.status if plist else "none"
    return {"class_code": cls.code, "grade": cls.grade, "group_name": cls.group_name, "medium": cls.medium,
            "academic_year": cls.academic_year, "next_academic_year": next_year(cls.academic_year),
            "editable": account.role == "teacher" and status in ("none", "draft", "returned"),
            "allowed_decisions": allowed_decisions(cls),
            "options": [{"code": o.code, "group_name": o.group_name, "medium": o.medium} for o in options],
            "class_teacher_name": class_teacher_name(db, cls), **list_summary(db, cls, plist), "students": students}


@router.put("/classes/{class_code}", summary="Class teacher saves (or submits to the HM) the promotion list")
def save_class_promotion(class_code: str, data: PromotionListIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    cls = get_class(db, class_code)
    require_class_teacher_or_admin(db, account, cls)
    plist = class_list(db, cls)
    if plist and plist.status not in ("draft", "returned"):
        raise HTTPException(409, "This list is already with the HM; it can only change if the HM sends it back")

    current = {s.id for s in class_students(db, cls).all()}
    given = [e.student_id for e in data.entries]
    if len(given) != len(set(given)) or set(given) != current:
        raise HTTPException(422, "The list must have exactly one decision for every student in the class")
    allowed = allowed_decisions(cls)
    options = {o.code: o for o in next_class_options(db, cls)}
    rows = []
    for e in data.entries:
        if e.decision not in allowed: raise HTTPException(422, f"'{e.decision}' is not possible for class {cls.code}")
        target = None
        if e.decision == "promoted":
            target = options.get(e.target_class_code or "")
            if not target: raise HTTPException(422, "Choose the next class for every promoted student")
        rows.append(PromotionEntry(student_id=e.student_id, decision=e.decision, target_class_id=target.id if target else None))

    if not plist:
        plist = PromotionList(class_id=cls.id, academic_year=cls.academic_year, status="draft"); db.add(plist); db.flush()
    else:
        # Clear the old decisions first so the (list, student) unique rule never sees two rows at once.
        db.query(PromotionEntry).filter_by(list_id=plist.id).delete(); db.flush(); db.expire(plist, ["entries"])
    plist.entries.extend(rows)
    if data.submit:
        plist.status = "submitted"; plist.submitted_by = account.id; plist.submitted_at = datetime.utcnow()
        plist.decided_by = None; plist.decided_at = None
    else:
        plist.status = "draft" if plist.status != "returned" else "returned"
    db.commit()
    return get_class_promotion(class_code, db, account)


@router.get("", summary="HM overview: every class's promotion status for the running year")
def promotion_overview(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    year = current_academic_year(db)
    classes, blockers = [], []
    for cls in db.query(AcademicClass).filter_by(is_active=True).order_by(AcademicClass.grade, AcademicClass.code):
        plist = class_list(db, cls)
        count = class_students(db, cls).count()
        missing = len(missing_students(db, cls, plist)) if plist else 0
        summary = list_summary(db, cls, plist)
        if count and (summary["status"] != "approved" or missing): blockers.append(cls.code)
        classes.append({"class_code": cls.code, "grade": cls.grade, "group_name": cls.group_name, "medium": cls.medium,
                        "class_teacher_name": class_teacher_name(db, cls), "student_count": count,
                        "missing_count": missing, **summary})
    return {"academic_year": year, "next_academic_year": next_year(year), "classes": classes,
            "ready": not blockers, "blockers": blockers}


@router.post("/classes/{class_code}/approve", summary="HM approves a submitted class list")
def approve_class_promotion(class_code: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin"))):
    cls = get_class(db, class_code); plist = class_list(db, cls)
    if not plist or plist.status != "submitted": raise HTTPException(409, "Only a list the class teacher has submitted can be approved")
    missing = missing_students(db, cls, plist)
    if missing:
        names = ", ".join(s.account.full_name for s in missing[:5])
        raise HTTPException(409, f"{len(missing)} student(s) joined after this list was submitted ({names}). Send it back so the class teacher can add them.")
    plist.status = "approved"; plist.decided_by = account.id; plist.decided_at = datetime.utcnow(); plist.note = None
    db.commit()
    return get_class_promotion(class_code, db, account)


@router.post("/classes/{class_code}/return", summary="HM sends a list back to the class teacher with a note")
def return_class_promotion(class_code: str, data: ReturnIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin"))):
    cls = get_class(db, class_code); plist = class_list(db, cls)
    if not plist or plist.status not in ("submitted", "approved"): raise HTTPException(409, "Only a submitted or approved list can be sent back")
    plist.status = "returned"; plist.note = data.note.strip(); plist.decided_by = account.id; plist.decided_at = datetime.utcnow()
    db.commit()
    return get_class_promotion(class_code, db, account)


@router.post("/start-new-year", summary="HM moves every class to the next academic year using the approved lists")
def start_new_year(data: StartYearIn, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    overview = promotion_overview(db, _)
    year, new_year = overview["academic_year"], overview["next_academic_year"]
    if data.confirm_year != new_year: raise HTTPException(422, f"Type {new_year} to confirm")
    if not overview["ready"]:
        raise HTTPException(409, "These classes are not approved yet: " + ", ".join(overview["blockers"]))

    classes = db.query(AcademicClass).filter_by(is_active=True).all()
    moved = {"promoted": 0, "not_promoted": 0, "left": 0, "passed_out": 0}
    for cls in classes:
        plist = class_list(db, cls)
        if not plist: continue
        for e in plist.entries:
            student = db.get(Student, e.student_id)
            if not student or student.status != "active": continue
            moved[e.decision] += 1
            if e.decision == "promoted":
                target = db.get(AcademicClass, e.target_class_id)
                if not target: raise HTTPException(409, f"The next class for {student.account.full_name} no longer exists")
                student.class_id = target.id
                if target.medium: student.medium = target.medium
            elif e.decision in ("left", "passed_out"):
                # Records stay for certificates and history; the login stops working.
                student.status = e.decision; student.account.is_active = False
    for cls in classes:
        cls.academic_year = new_year
    # Last year's class notices were for last year's batch.
    db.query(Notice).filter(Notice.audience == "class", Notice.published.is_(True)).update({Notice.published: False})
    db.commit()
    return {"previous_year": year, "academic_year": new_year, **moved}
