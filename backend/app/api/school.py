from collections import defaultdict
from datetime import date, datetime, timedelta
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import current_account, require_roles
from app.core.security import hash_password
from app.api.auth import teachers_named
from app.services.permissions import teacher_profile, student_profile, assigned_class, assigned_classes, is_class_teacher_of, can_access_class
from app.services.permissions import require_teacher_class_scope
from app.services.signoff import exam_signatures
from app.services.mark_scheme import class_scheme, mark_passed, subject_components, subjects_for_class, terms_for_grade, theory_pass_mark
from app.services.push import admins, all_students, all_teachers, class_teachers_of, notify, students_of
from app.models.entities import (Account, AcademicClass, Teacher, Student, ClassTeacherAssignment,
    SubjectTeacherAssignment, Assessment, Mark, AttendanceMonth, AttendanceRecord, TimetableEntry,
    Notice, CertificateRequest, LeaveRequest, ComplaintThread, ComplaintMessage, SchoolEvent, GalleryItem, ContactMessage,
    PagePost, PagePostImage, LessonPlan, AccountSignature, Homework)
from app.schemas.common import (ClassIn, ClassTeacherIn, SubjectTeacherIn, TeacherCreate, TeacherUpdate,
    StudentCreate, StudentUpdate, StudentSelfUpdate, MarksIn, AttendanceIn, TimetableIn, NoticeIn, NoticeUpdate, CertificateIn, DecisionIn,
    LeaveRequestIn, ComplaintMessageIn, EventIn, EventUpdate, GalleryIn, PublicContactIn)

router = APIRouter(tags=["School"])


def get_class(db: Session, code: str) -> AcademicClass:
    obj = db.query(AcademicClass).filter(AcademicClass.code == code).first()
    if not obj:
        raise HTTPException(404, "Class not found")
    return obj


def class_students(db: Session, cls: AcademicClass):
    """Current students of a class; TC / passed-out students keep their records but are left out."""
    return db.query(Student).filter(Student.class_id == cls.id, Student.status == "active")


def class_number_base(cls: AcademicClass) -> int | None:
    """6th–9th use the school's class-wise register numbers: 6A → 6101, 6102…, 6B → 6201…, 9B → 9201….
    Other classes (10th–12th) keep the GHSS/<year>/<serial> numbers."""
    section = (cls.section or "").strip().upper()
    if not 6 <= cls.grade <= 9 or len(section) != 1 or not "A" <= section <= "I": return None
    return cls.grade * 1000 + (ord(section) - ord("A") + 1) * 100


def next_ghss_registration_no(db: Session, academic_year: str) -> str:
    prefix = f"GHSS/{academic_year[:4]}/"
    used = [r for (r,) in db.query(Student.registration_no).filter(Student.registration_no.like(prefix + "%")) if r[len(prefix):].isdigit()]
    return f"{prefix}{max((int(r[len(prefix):]) for r in used), default=0) + 1:04d}"


def next_registration_no(db: Session, cls: AcademicClass) -> str:
    base = class_number_base(cls)
    if base is None: return next_ghss_registration_no(db, cls.academic_year)
    used = {r for (r,) in db.query(Student.registration_no).filter(Student.registration_no.like(f"{base // 100}__"))}
    serial = next((n for n in range(1, 100) if str(base + n) not in used), None)
    if serial is None: raise HTTPException(409, f"Class {cls.code} has used all register numbers {base + 1}–{base + 99}")
    return str(base + serial)


def renumber_students(db: Session, assignments: dict[Student, str]):
    """Give students new register numbers (their login username too) without ever holding a duplicate mid-way."""
    for student in assignments:
        student.registration_no = student.account.username = f"renumber-{student.id}"
    db.flush()
    for student, number in assignments.items():
        student.registration_no = student.account.username = number
    db.flush()


def renumber_class(db: Session, cls: AcademicClass) -> dict[Student, str]:
    """Number a 6th–9th class's current students from <base>01 in their present order. Former students
    (TC / passed out) holding one of those numbers get the old year appended, e.g. 7105 → 7105-2026."""
    base = class_number_base(cls)
    if base is None: return {}
    students = class_students(db, cls).order_by(Student.registration_no).all()
    plan = {s: str(base + i) for i, s in enumerate(students, start=1)}
    if len(plan) > 99: raise HTTPException(409, f"Class {cls.code} has more than 99 students; register numbers stop at {base + 99}")
    wanted = set(plan.values())
    for former in db.query(Student).filter(Student.registration_no.in_(wanted), Student.status != "active"):
        plan[former] = f"{former.registration_no}-{cls.academic_year[:4]}"
    return plan


def year_months(academic_year: str) -> tuple[str, str]:
    """First and last attendance month (YYYY-MM) of an academic year: June to May."""
    start = int(academic_year[:4])
    return f"{start}-06", f"{start + 1}-05"


def exam_attendance_until(assessment: Assessment | None, academic_year: str) -> str | None:
    """The last attendance month an exam's report counts: the teacher's choice, else the month marks were first saved."""
    if not assessment: return None
    first, last = year_months(academic_year)
    month = assessment.attendance_until or (assessment.created_at.strftime("%Y-%m") if assessment.created_at else None)
    return min(max(month, first), last) if month else None


def attendance_totals(db: Session, cls: AcademicClass, until: str | None) -> tuple[int, dict[int, int]] | None:
    """Working days and each student's present days from June of the class's year up to `until`; None when nothing is recorded."""
    if not until: return None
    first, _ = year_months(cls.academic_year)
    months = db.query(AttendanceMonth).filter(AttendanceMonth.class_id == cls.id, AttendanceMonth.month >= first, AttendanceMonth.month <= until).all()
    if not months: return None
    present = defaultdict(int)
    for r in db.query(AttendanceRecord).filter(AttendanceRecord.attendance_month_id.in_([mo.id for mo in months])): present[r.student_id] += r.present_days
    return sum(mo.total_days for mo in months), present


def exam_attendance(db: Session, cls: AcademicClass, assessment: Assessment | None) -> tuple[int, dict[int, int]] | None:
    """An exam's attendance for reports: the working/present days the class teacher typed on Enter Marks, or — for
    exams entered before that existed — the monthly attendance from June up to the exam's month."""
    if assessment and assessment.working_days:
        return assessment.working_days, {int(sid): days for sid, days in (assessment.present_days or {}).items() if days is not None}
    return attendance_totals(db, cls, exam_attendance_until(assessment, cls.academic_year))


def current_academic_year(db: Session) -> str:
    """The school's running academic year (every class moves to the next one together)."""
    return db.query(func.max(AcademicClass.academic_year)).filter(AcademicClass.is_active.is_(True)).scalar() or "2026-2027"


def teacher_or_admin(account: Account, db: Session, cls: AcademicClass, subject: str | None = None):
    return require_teacher_class_scope(db, account, cls, subject)


# Classes and teacher assignments
@router.get("/classes", summary="List classes and student counts")
def list_classes(db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    result = []
    for cls in db.query(AcademicClass).filter_by(is_active=True).order_by(AcademicClass.grade, AcademicClass.code):
        by_gender = dict(class_students(db, cls).with_entities(func.lower(Student.gender), func.count(Student.id)).group_by(func.lower(Student.gender)).all())
        count = sum(by_gender.values())
        ct = db.query(ClassTeacherAssignment).filter_by(class_id=cls.id, academic_year=cls.academic_year).first()
        teacher = db.get(Teacher, ct.teacher_id) if ct else None
        result.append({"id": cls.id, "code": cls.code, "grade": cls.grade, "section": cls.section, "group_name": cls.group_name, "medium": cls.medium, "strength": cls.strength, "academic_year": cls.academic_year, "student_count": count,
                       "boys": by_gender.get("male", 0), "girls": by_gender.get("female", 0), "class_teacher_id": teacher.id if teacher else None, "class_teacher_name": teacher.account.full_name if teacher else None, "class_teacher_phone": teacher.phone if teacher else None})
    return result


@router.post("/classes", status_code=201, summary="Create a class section")
def create_class(data: ClassIn, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    if db.query(AcademicClass).filter_by(code=data.code).first():
        raise HTTPException(409, "Class code already exists")
    cls = AcademicClass(**data.model_dump())
    db.add(cls); db.commit(); db.refresh(cls)
    return cls


@router.get("/teachers", summary="List teachers")
def list_teachers(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    return [{"id": t.id, "employee_id": t.employee_id, "full_name": t.account.full_name, "username": t.account.username, "subject": t.subject, "phone": t.phone, "is_active": t.account.is_active} for t in db.query(Teacher).all()]


def unique_teacher_name(db: Session, name: str, except_account_id: int | None = None) -> str:
    """Teachers sign in with their name, so two active teachers can't share one."""
    clean = " ".join(name.split())
    if any(a.id != except_account_id for a in teachers_named(db, clean)):
        raise HTTPException(409, f"A teacher named {clean} already exists. Add an initial to tell them apart (they sign in with their name).")
    return clean


@router.post("/teachers", status_code=201, summary="Create teacher account")
def create_teacher(data: TeacherCreate, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    full_name = unique_teacher_name(db, data.full_name)
    index=(db.query(func.count(Teacher.id)).scalar() or 0)+101
    employee_id=f"GHSS/T/{index}"
    while db.query(Account).filter_by(username=employee_id).first():
        index+=1; employee_id=f"GHSS/T/{index}"
    # The admin-chosen password is temporary: the teacher is reminded to change it after signing in.
    account = Account(username=employee_id, role="teacher", full_name=full_name, password_hash=hash_password(data.password), password_is_default=True)
    db.add(account); db.flush()
    teacher = Teacher(account_id=account.id, employee_id=employee_id, subject=data.subject, phone=data.phone)
    db.add(teacher); db.commit(); db.refresh(teacher)
    return {"id": teacher.id, "employee_id": employee_id, "full_name": account.full_name, "subject": teacher.subject, "phone": teacher.phone}


@router.patch("/teachers/{teacher_id}")
def update_teacher(teacher_id: int, data: TeacherUpdate, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    teacher = db.get(Teacher, teacher_id)
    if not teacher: raise HTTPException(404, "Teacher not found")
    values = data.model_dump(exclude_unset=True)
    active = values.pop("is_active", None)
    for key, value in values.items():
        if key == "full_name": teacher.account.full_name = unique_teacher_name(db, value, teacher.account_id)
        else: setattr(teacher, key, value)
    if active is not None: teacher.account.is_active = active
    db.commit(); return {"id": teacher.id, "employee_id": teacher.employee_id, "full_name": teacher.account.full_name, "subject": teacher.subject, "phone": teacher.phone, "is_active": teacher.account.is_active}


@router.delete("/teachers/{teacher_id}", status_code=204, response_class=Response)
def delete_teacher(teacher_id: int, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    teacher = db.get(Teacher, teacher_id)
    if not teacher: raise HTTPException(404, "Teacher not found")
    teacher.account.is_active = False
    db.commit()
    return Response(status_code=204)


@router.put("/classes/{class_code}/class-teacher")
def assign_class_teacher(class_code: str, data: ClassTeacherIn, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    cls = get_class(db, class_code); teacher = db.get(Teacher, data.teacher_id)
    if not teacher: raise HTTPException(404, "Teacher not found")
    # One class teacher per class; a teacher may be class teacher of several classes.
    old = db.query(ClassTeacherAssignment).filter_by(class_id=cls.id, academic_year=cls.academic_year).first()
    if old: old.teacher_id = teacher.id
    else: db.add(ClassTeacherAssignment(class_id=cls.id, teacher_id=teacher.id, academic_year=cls.academic_year))
    db.commit(); return {"class_code": cls.code, "teacher_id": teacher.id, "teacher_name": teacher.account.full_name}


@router.delete("/classes/{class_code}/class-teacher", status_code=204, response_class=Response)
def remove_class_teacher(class_code: str, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    cls=get_class(db,class_code)
    assignment=db.query(ClassTeacherAssignment).filter_by(class_id=cls.id,academic_year=cls.academic_year).first()
    if assignment: db.delete(assignment); db.commit()
    return Response(status_code=204)


@router.put("/classes/{class_code}/subject-teachers")
def assign_subject_teacher(class_code: str, data: SubjectTeacherIn, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    cls = get_class(db, class_code); teacher = db.get(Teacher, data.teacher_id)
    if not teacher: raise HTTPException(404, "Teacher not found")
    link = db.query(SubjectTeacherAssignment).filter_by(class_id=cls.id, subject=data.subject, academic_year=cls.academic_year).first()
    if link: link.teacher_id = teacher.id
    else: db.add(SubjectTeacherAssignment(class_id=cls.id, teacher_id=teacher.id, subject=data.subject, academic_year=cls.academic_year))
    db.commit(); return {"class_code": class_code, "subject": data.subject, "teacher_id": teacher.id}


@router.get("/classes/{class_code}/subject-teachers")
def get_subject_teachers(class_code: str, db: Session = Depends(get_db), _: Account = Depends(current_account)):
    cls = get_class(db, class_code)
    return [{"subject": a.subject, "teacher_id": a.teacher_id, "teacher_name": db.get(Teacher, a.teacher_id).account.full_name} for a in db.query(SubjectTeacherAssignment).filter_by(class_id=cls.id, academic_year=cls.academic_year).all()]


@router.delete("/classes/{class_code}/subject-teachers/{subject}", status_code=204, response_class=Response)
def remove_subject_teacher(class_code: str, subject: str, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    cls=get_class(db,class_code)
    link=db.query(SubjectTeacherAssignment).filter_by(class_id=cls.id,subject=subject,academic_year=cls.academic_year).first()
    if link: db.delete(link); db.commit()
    return Response(status_code=204)


# Student records
@router.get("/students")
def list_students(class_code: str | None = None, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    query = db.query(Student).filter(Student.status == "active")
    if class_code:
        cls = get_class(db, class_code)
        if not can_access_class(db, account, cls): raise HTTPException(403, "Class access denied")
        query = query.filter_by(class_id=cls.id)
    elif account.role == "teacher":
        cls = assigned_class(db, teacher_profile(db, account))
        if not cls: return []
        query = query.filter_by(class_id=cls.id)
    return [{"id": s.id, "registration_no": s.registration_no, "admission_no": s.admission_no, "full_name": s.account.full_name, "class_code": s.school_class.code, "gender": s.gender, "guardian_phone": s.guardian_phone, "father_name": s.father_name, "parent_phone": s.father_phone or s.mother_phone or s.guardian_phone} for s in query.order_by(Student.id).all()]


@router.post("/students", status_code=201)
def create_student(data: StudentCreate, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = get_class(db, data.class_code)
    if account.role == "teacher":
        teacher_or_admin(account, db, cls)
        if not is_class_teacher_of(db, teacher_profile(db, account), cls): raise HTTPException(403, "Only the class teacher can enroll students")
    registration = data.registration_no or next_registration_no(db, cls)
    username = registration
    if db.query(Account).filter_by(username=username).first() or db.query(Student).filter_by(registration_no=registration).first(): raise HTTPException(409, "Registration number already exists")
    if data.admission_no and db.query(Student).filter_by(admission_no=data.admission_no).first(): raise HTTPException(409, f"Admission number {data.admission_no} already exists")
    payload = data.model_dump(exclude={"password", "class_code", "registration_no", "full_name"})
    acc = Account(username=username, role="student", full_name=data.full_name, password_hash=hash_password(data.password))
    db.add(acc); db.flush()
    student = Student(account_id=acc.id, class_id=cls.id, registration_no=registration, **payload)
    db.add(student); db.commit(); db.refresh(student)
    return {"id": student.id, "registration_no": registration, "admission_no": student.admission_no, "username": username, "full_name": acc.full_name, "class_code": cls.code}


@router.get("/students/{student_id}")
def get_student(student_id: int, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    student = db.get(Student, student_id)
    if not student: raise HTTPException(404, "Student not found")
    if account.role == "student" and student.account_id != account.id: raise HTTPException(403, "Student record access denied")
    if account.role == "teacher" and not can_access_class(db, account, student.school_class): raise HTTPException(403, "Class access denied")
    return student_detail(student)


@router.patch("/students/{student_id}", summary="Edit a student's profile (admin or class teacher)")
def update_student(student_id: int, data: StudentUpdate, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    student = db.get(Student, student_id)
    if not student: raise HTTPException(404, "Student not found")
    if account.role == "teacher" and not is_class_teacher_of(db, teacher_profile(db, account), student.school_class): raise HTTPException(403, "Only the class teacher can edit this student")
    # Blank strings from the form clear a field.
    values = {key: (value.strip() or None) if isinstance(value, str) else value for key, value in data.model_dump(exclude_unset=True).items()}
    if "full_name" in values:
        if not values["full_name"]: raise HTTPException(422, "Full name is required")
        student.account.full_name = values.pop("full_name")
    if values.get("admission_no") and db.query(Student).filter(Student.admission_no == values["admission_no"], Student.id != student.id).first():
        raise HTTPException(409, f"Admission number {values['admission_no']} already exists")
    for key, value in values.items(): setattr(student, key, value)
    if "father_phone" in values or "mother_phone" in values:
        student.guardian_phone = student.father_phone or student.mother_phone or student.guardian_phone
    db.commit(); db.refresh(student)
    return student_detail(student)


@router.delete("/students/{student_id}", status_code=204, response_class=Response, summary="Delete a student and their records (admin or class teacher)")
def delete_student(student_id: int, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    student = db.get(Student, student_id)
    if not student: raise HTTPException(404, "Student not found")
    if account.role == "teacher" and not is_class_teacher_of(db, teacher_profile(db, account), student.school_class): raise HTTPException(403, "Only the class teacher can delete this student")
    # Marks, attendance, certificate/leave requests and complaints go with it via ON DELETE CASCADE.
    login = student.account
    db.delete(student); db.flush(); db.delete(login); db.commit()
    return Response(status_code=204)


def student_detail(student: Student) -> dict:
    return {"id": student.id, "registration_no": student.registration_no, "admission_no": student.admission_no, "emis_no": student.emis_no, "umis_no": student.umis_no, "full_name": student.account.full_name, "class_code": student.school_class.code, "gender": student.gender, "date_of_birth": student.date_of_birth, "community": student.community, "medium": student.medium, "blood_group": student.blood_group, "father_name": student.father_name, "mother_name": student.mother_name, "father_phone": student.father_phone, "mother_phone": student.mother_phone, "guardian_phone": student.guardian_phone, "address": student.address}


# Marks, scorecards, and result analysis
@router.put("/classes/{class_code}/marks/{term}")
def save_class_marks(class_code: str, term: str, data: MarksIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    cls = get_class(db, class_code); students = class_students(db, cls).all()
    teacher_or_admin(account, db, cls)
    if term not in terms_for_grade(cls.grade): raise HTTPException(422, f"'{term}' is not an exam for class {cls.code}")
    subjects = set(subjects_for_class(cls))
    schemes = {s: subject_components(cls, s, term) for s in subjects}  # once per save, not per student
    assessment = db.query(Assessment).filter_by(class_id=cls.id, term=term, academic_year=cls.academic_year).first()
    if not assessment:
        assessment = Assessment(class_id=cls.id, term=term, academic_year=cls.academic_year); db.add(assessment); db.flush()
    if data.working_days is not None or data.present_days is not None:
        set_exam_attendance(cls, students, assessment, data.working_days, data.present_days or {})
    saved = 0
    for student in students:
        values = data.students.get(str(student.id), {})
        for subject, value in values.items():
            if subject not in subjects: raise HTTPException(422, f"{subject} is not a subject for class {cls.code}")
            teacher_or_admin(account, db, cls, subject)
            upsert_mark(db, student.id, assessment, subject, clean_mark(subject, schemes[subject], value), account)
            saved += 1
    db.commit(); return {"class_code": cls.code, "term": term, "saved_marks": saved}


def set_exam_attendance(cls: AcademicClass, students: list, assessment: Assessment, working_days: int | None, present: dict) -> None:
    """Store the exam's working days and present days; a student's present days can never exceed the working days."""
    if not working_days: raise HTTPException(422, "Enter the working days for this exam first")
    names = {str(s.id): s.account.full_name for s in students}
    days = {}
    for sid, value in present.items():
        if sid not in names: raise HTTPException(422, f"Student {sid} is not in class {cls.code}")
        if value is None: continue
        if value < 0 or value > working_days: raise HTTPException(422, f"{names[sid]}: present days must be between 0 and {working_days}")
        days[sid] = value
    assessment.working_days = working_days; assessment.present_days = days


def clean_mark(subject: str, scheme: list, value: dict, who: str = "") -> dict:
    """Validate one student's mark for one subject against its scheme: {absent, components, score, maximum}."""
    absent = bool(value.get("absent", False)); entered = value.get("components") or {}
    components = {}
    if not absent:
        for key, label, limit in scheme:
            try: points = int(entered.get(key, 0) or 0)
            except (TypeError, ValueError): raise HTTPException(422, f"{who}Invalid {label} mark for {subject}")
            if points < 0 or points > limit: raise HTTPException(422, f"{who}{subject} {label} must be between 0 and {limit}")
            components[key] = points
    return {"absent": absent, "components": components, "score": sum(components.values()), "maximum": sum(l for _, _, l in scheme)}


def upsert_mark(db: Session, student_id: int, assessment: Assessment, subject: str, cleaned: dict, account: Account):
    """Write one subject's mark for one student; other subjects are never touched."""
    mark = db.query(Mark).filter_by(student_id=student_id, assessment_id=assessment.id, subject=subject).first()
    if not mark:
        mark = Mark(student_id=student_id, assessment_id=assessment.id, subject=subject); db.add(mark)
    mark.score, mark.maximum_score, mark.absent = cleaned["score"], cleaned["maximum"], cleaned["absent"]
    mark.components, mark.entered_by = cleaned["components"], account.id


def term_assessment(db: Session, cls: AcademicClass, term: str, create: bool = False) -> Assessment | None:
    assessment = db.query(Assessment).filter_by(class_id=cls.id, term=term, academic_year=cls.academic_year).first()
    if not assessment and create:
        assessment = Assessment(class_id=cls.id, term=term, academic_year=cls.academic_year); db.add(assessment); db.flush()
    return assessment


@router.get("/students/{student_id}/results")
def student_results(student_id: int, term: str | None = None, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    student = db.get(Student, student_id)
    if not student: raise HTTPException(404, "Student not found")
    if account.role == "student" and student.account_id != account.id: raise HTTPException(403, "Result access denied")
    if account.role == "teacher" and not can_access_class(db, account, student.school_class): raise HTTPException(403, "Class access denied")
    q = db.query(Mark, Assessment).join(Assessment).filter(Mark.student_id == student.id)
    if term: q = q.filter(Assessment.term == term)
    rows = [{"term": a.term, "academic_year": a.academic_year, "subject": m.subject, "score": m.score, "max": m.maximum_score, "absent": m.absent, "components": m.components or {}} for m, a in q.order_by(Assessment.created_at, Mark.subject).all()]
    total = sum(row["score"] for row in rows); max_total = sum(row["max"] for row in rows)
    return {"student_id": student.id, "student_name": student.account.full_name, "class_code": student.school_class.code, "results": rows, "average_percent": round(total * 100 / max_total, 2) if max_total else None}


@router.get("/classes/{class_code}/scorecard")
def class_scorecard(class_code: str, term: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = get_class(db, class_code)
    if not can_access_class(db, account, cls, allow_subject=False): raise HTTPException(403, "Only the class teacher can view this report")
    students = class_students(db, cls).all(); output=[]
    for student in students:
        q = db.query(func.sum(Mark.score), func.sum(Mark.maximum_score)).join(Assessment).filter(Mark.student_id==student.id, Assessment.term==term)
        score, maximum = q.first()
        if maximum: output.append({"student_id": student.id, "registration_no": student.registration_no, "name": student.account.full_name, "score": score, "max": maximum, "percentage": round(score*100/maximum, 2)})
    return sorted(output, key=lambda row: row["percentage"], reverse=True)


@router.get("/classes/{class_code}/mark-report")
def class_mark_report(class_code: str, term: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    """Return each student's subject marks and aggregate, suitable for printable class reports."""
    cls=get_class(db,class_code)
    if not can_access_class(db,account,cls,allow_subject=False): raise HTTPException(403,"Only the class teacher can view this report")
    assessment=db.query(Assessment).filter_by(class_id=cls.id,term=term,academic_year=cls.academic_year).first()
    if not assessment: return {"class_code":cls.code,"term":term,"subjects":[],"students":[]}
    # Same subject order as the report card; anything outside the class's list goes last, alphabetically.
    order={sub:i for i,sub in enumerate(subjects_for_class(cls))}
    sort_key=lambda subject:(order.get(subject,len(order)),subject)
    rows=[]; seen=set()
    for student in class_students(db, cls).order_by(Student.id).all():
        marks=sorted(db.query(Mark).filter_by(student_id=student.id,assessment_id=assessment.id).all(),key=lambda m:sort_key(m.subject))
        seen.update(m.subject for m in marks)
        maximum=sum(m.maximum_score for m in marks); total=sum(m.score for m in marks)
        rows.append({"student_id":student.id,"registration_no":student.registration_no,"name":student.account.full_name,"marks":[{"subject":m.subject,"score":m.score,"max":m.maximum_score,"absent":m.absent,"components":m.components or {}} for m in marks],"total":total,"maximum":maximum,"percentage":round(total*100/maximum,2) if maximum else None})
    return {"class_code":cls.code,"term":term,"subjects":sorted(seen,key=sort_key),"students":rows}


SUBJECT_ABBR = {"Tamil": "TAM", "English": "ENG", "Maths": "MAT", "Science": "SCI", "Social Science": "SSCI",
    "Physics": "PHY", "Chemistry": "CHE", "Biology": "BIO", "Computer Science": "CS"}
ROMAN = {6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII"}


def subject_pass_label(cls, subject: str, term: str, pass_mark: int):
    """The pass mark shown for a subject in the term register: an int (35% rule) or "15/70" / "25/90" (Theory only)."""
    parts = {k: mx for k, _, mx in subject_components(cls, subject, term)}
    theory_pass = theory_pass_mark(parts)
    return f"{theory_pass}/{parts['theory']}" if theory_pass is not None else pass_mark


@router.get("/classes/{class_code}/term-report")
def class_term_report(class_code: str, term: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    """Class teacher's printable term register ("My Report") and the HM result summary ("HM Report") for one class."""
    PASS = 35  # percent of the subject's maximum
    cls = get_class(db, class_code)
    if not can_access_class(db, account, cls, allow_subject=False): raise HTTPException(403, "Only the class teacher can view this report")
    subjects = subjects_for_class(cls)
    # Every subject in one exam has the same maximum (taken from the mark scheme; currently 100 everywhere).
    subject_max = sum(limit for _, _, limit in subject_components(cls, subjects[0], term)) if subjects else 100
    pass_mark = round(subject_max * PASS / 100)
    students = class_students(db, cls).order_by(Student.registration_no).all()
    assessment = db.query(Assessment).filter_by(class_id=cls.id, term=term, academic_year=cls.academic_year).first()
    marks = defaultdict(dict)
    if assessment:
        for m in db.query(Mark).filter_by(assessment_id=assessment.id).all(): marks[m.student_id][m.subject] = m

    # Attendance: from June up to the month chosen for this exam
    totals = exam_attendance(db, cls, assessment)
    months = bool(totals)
    working_days, present = totals or (0, {})

    def gender_key(s): return "M" if (s.gender or "").lower() == "male" else "F" if (s.gender or "").lower() == "female" else "O"
    def medium_key(s): return {"tamil": "TM", "english": "EM"}.get((s.medium or "").lower(), s.medium)

    rows = []
    for s in students:
        sm = marks.get(s.id, {})
        scores = []; failed = []; absent = []
        for subj in subjects:
            m = sm.get(subj)
            if m is None: scores.append(None); continue
            if m.absent: absent.append(SUBJECT_ABBR.get(subj, subj)); scores.append("AB"); continue
            scores.append(m.score)
            if not mark_passed(m.score, m.maximum_score, False, m.components): failed.append(SUBJECT_ABBR.get(subj, subj))
        written = [x for x in scores if isinstance(x, int)]
        appeared = bool(written)
        passed = appeared and not failed and not absent and len(written) == len(subjects)
        # Pass / fail per subject (11th–12th split exams: on Theory alone), kept for the subject-wise result below
        oks = [None if not (m := sm.get(subj)) or m.absent else mark_passed(m.score, m.maximum_score, False, m.components) for subj in subjects]
        rows.append({"student_id": s.id, "registration_no": s.registration_no, "name": s.account.full_name, "_oks": oks,
            "community": s.community, "gender": gender_key(s), "medium": medium_key(s), "scores": scores,
            "total": sum(written) if appeared else None, "appeared": appeared, "passed": passed,
            "failed_subjects": failed, "absent_subjects": absent,
            # Blank (not 0) when no present days are recorded for the student
            "attended_days": present.get(s.id) if months else None,
            "attendance_percent": round(present[s.id] * 100 / working_days, 2) if working_days and present.get(s.id) is not None else None, "rank": None})

    # Rank only students who passed every subject; ties share a rank
    ranked = sorted([r for r in rows if r["passed"]], key=lambda r: r["total"], reverse=True)
    for i, r in enumerate(ranked):
        r["rank"] = ranked[i - 1]["rank"] if i and ranked[i - 1]["total"] == r["total"] else i + 1

    # ---- HM summary ----
    mediums = [medium_key(s) for s in students if s.medium]
    class_medium = ("EM" if cls.medium == "English" else "TM") if cls.medium else ("EM" if cls.section.upper().endswith("B") else "TM")
    medium = max(set(mediums), key=mediums.count) if mediums else class_medium
    def by_gender(pred):
        out = {"M": 0, "F": 0}
        for r in rows:
            if pred(r) and r["gender"] in out: out[r["gender"]] += 1
        out["TOT"] = sum(1 for r in rows if pred(r))
        return out
    roll = by_gender(lambda r: True); appd = by_gender(lambda r: r["appeared"]); passd = by_gender(lambda r: r["passed"])
    pass_pct = {k: round(passd[k] * 100 / appd[k]) if appd[k] else None for k in ("M", "F", "TOT")}

    subject_result = []; toppers = []
    for i, subj in enumerate(subjects):
        vals = [(r["scores"][i], r["name"]) for r in rows if isinstance(r["scores"][i], int)]
        sc = [v for v, _ in vals]
        ok = sum(1 for r in rows if r["_oks"][i])
        top = max(sc) if sc else None
        subject_result.append({"subject": SUBJECT_ABBR.get(subj, subj), "max": top, "min": min(sc) if sc else None,
            "average": round(sum(sc) / len(sc), 2) if sc else None, "appeared": len(sc),
            "passed": ok, "pass_percent": round(ok * 100 / len(sc)) if sc else None})
        toppers.append({"subject": SUBJECT_ABBR.get(subj, subj), "mark": top, "names": [n for v, n in vals if v == top] if sc else []})
    totals = [(r["total"], r["name"]) for r in rows if r["appeared"]]
    tt = [t for t, _ in totals]
    top_total = max(tt) if tt else None
    subject_result.append({"subject": "TOT", "max": top_total, "min": min(tt) if tt else None,
        "average": round(sum(tt) / len(tt), 2) if tt else None, "appeared": appd["TOT"], "passed": passd["TOT"], "pass_percent": pass_pct["TOT"]})
    toppers.append({"subject": "TOT", "mark": top_total, "names": [n for t, n in totals if t == top_total] if tt else []})

    # Students by number of subjects not cleared (failed or absent)
    failed_counts = {n: 0 for n in range(1, len(subjects) + 1)}
    for r in rows:
        n = len(r["failed_subjects"]) + len(r["absent_subjects"])
        if r["appeared"] and not r["passed"] and n in failed_counts: failed_counts[n] += 1

    # Marks range on the class's grand total (500 for 6-10, 600 for 11-12)
    full = subject_max * len(subjects); k = full / 500
    edges = [round(e * k) for e in (475, 450, 400, 350, 300, 250, 200)]
    ranges = [{"label": f"{full} OUT OF {full}", "bin": full, "count": sum(1 for t in tt if t == full)}]
    hi = full  # exclusive upper bound of the current bin
    for lo in edges:
        shown = full - 1 if hi == full else hi
        ranges.append({"label": f"FROM {shown} TO {lo}", "bin": shown, "count": sum(1 for t in tt if lo <= t < hi)})
        hi = lo
    ranges.append({"label": f"LESS THAN {edges[-1]}", "bin": edges[-1], "count": sum(1 for t in tt if t < edges[-1])})

    return {"class_code": cls.code, "title": f"{ROMAN.get(cls.grade, cls.grade)} - {cls.group_name + ' ' if cls.group_name else ''}{cls.section}", "academic_year": cls.academic_year,
        "term": term, "subjects": [SUBJECT_ABBR.get(s, s) for s in subjects], "max_marks": subject_max, "pass_marks": pass_mark,
        # Pass mark per subject: 35% of the total, or for 11th–12th split exams the Theory pass mark (e.g. "15/70")
        "subject_pass_marks": [subject_pass_label(cls, subj, term, pass_mark) for subj in subjects],
        "working_days": working_days if months else None, "students": [{k: v for k, v in r.items() if k != "_oks"} for r in rows],
        "hm": {"medium": medium, "roll": roll, "appeared": appd, "passed": passd, "pass_percent": pass_pct,
            "subject_result": subject_result, "toppers": toppers, "failed_counts": failed_counts,
            "total_failed": appd["TOT"] - passd["TOT"], "absent": roll["TOT"] - appd["TOT"], "ranges": ranges}}


# Report card remark (தகுதி) by total percentage, highest band first; replaces Pass/Fail on the card.
REMARK_BANDS = [(90, "மிகச் சிறப்பு"), (75, "மிக நன்று"), (60, "நன்று"), (35, "சராசரி"), (0, "முன்னேற்றம் தேவை")]


def report_remark(percent: float) -> str:
    return next(label for floor, label in REMARK_BANDS if percent >= floor)


def report_card_terms(cls: AcademicClass) -> list[str]:
    """Row order on the report card. 11th–12th list the mid terms (one mark, no split) first, then the split-mark
    exams (Quarterly, Half Yearly, Revisions), like the school's printed card; other classes follow the exam order."""
    terms = terms_for_grade(cls.grade)
    if cls.grade >= 11:
        mids = [t for t in terms if "Mid Term" in t]
        return mids + [t for t in terms if t not in mids]
    return terms


def build_report_cards(db: Session, cls: AcademicClass, only_student_id: int | None = None, with_signatures: bool = False) -> dict:
    """Per-student report cards (every exam of the year as a row), as printed on the school's progress card.
    Class-wide data is always loaded because each row shows the class's top total for that exam."""
    subjects = subjects_for_class(cls)
    students = class_students(db, cls).order_by(Student.registration_no).all()
    assessments = {a.term: a for a in db.query(Assessment).filter_by(class_id=cls.id, academic_year=cls.academic_year).all()}
    marks = defaultdict(lambda: defaultdict(dict))  # term -> student_id -> subject -> Mark
    if assessments:
        term_of = {a.id: t for t, a in assessments.items()}
        for m in db.query(Mark).filter(Mark.assessment_id.in_(term_of)).all(): marks[term_of[m.assessment_id]][m.student_id][m.subject] = m

    def term_total(term, sid):
        sm = marks[term].get(sid)
        return sum(m.score for m in sm.values() if not m.absent) if sm else None

    class_top = {t: max([v for v in (term_total(t, s.id) for s in students) if v is not None], default=None) for t in report_card_terms(cls)}

    # Class rank per exam, the same rule as the term report: only students who wrote and passed every subject
    # (35% of each subject's maximum; 11th–12th split exams on Theory alone) are ranked; equal totals share a rank.
    def passed_all(term, sid):
        sm = marks[term].get(sid)
        return bool(sm) and len(sm) == len(subjects) and all(mark_passed(m.score, m.maximum_score, m.absent, m.components) for m in sm.values())
    ranks = {}
    for t in report_card_terms(cls):
        totals = sorted(((term_total(t, s.id), s.id) for s in students if passed_all(t, s.id)), reverse=True)
        for i, (tot, sid) in enumerate(totals):
            ranks[(t, sid)] = ranks[(t, totals[i - 1][1])] if i and totals[i - 1][0] == tot else i + 1

    # Attendance is recorded per month; each exam row shows June up to that exam's chosen month.
    attendance = {t: exam_attendance(db, cls, a) for t, a in assessments.items()}

    full = 100 * len(subjects)
    # Per-exam subject maximum from the mark scheme; the pass mark is 35% of it.
    term_max = {t: sum(limit for _, _, limit in subject_components(cls, subjects[0], t)) if subjects else 100 for t in report_card_terms(cls)}
    cards = []
    split_parts = {t: {subj: subject_components(cls, subj, t) for subj in subjects} for t in report_card_terms(cls)}
    for s in students:
        if only_student_id is not None and s.id != only_student_id: continue
        rows = []
        for term in report_card_terms(cls):
            sm = marks[term].get(s.id)
            limits = {"subject_max": term_max[term], "pass_mark": round(term_max[term] * 35 / 100)}
            if not sm:
                rows.append({"term": term, "scores": [None] * len(subjects), "total": None, "remark": None, "rank": None, "class_top": class_top[term], "attendance": None, **limits}); continue
            scores = [None if subj not in sm else "AB" if sm[subj].absent else sm[subj].score for subj in subjects]
            # Split marks (Theory / Practical / Internal …) for subjects whose pattern in this exam has more than one part
            splits = []
            for subj in subjects:
                parts = split_parts[term][subj]; m = sm.get(subj)
                if len(parts) < 2 or not m or m.absent: splits.append(None); continue
                given = m.components or {}
                # 11th–12th: only Theory has a pass mark (15/70 or 25/90); Practical and Internal are never pass/fail.
                theory_pass = theory_pass_mark(given)
                splits.append([{"key": k, "label": label, "max": mx, "value": given.get(k),
                                **({"pass_mark": theory_pass} if k == "theory" and theory_pass is not None else {})} for k, label, mx in parts])
            total = term_total(term, s.id)
            att = attendance.get(term)
            rows.append({"term": term, "scores": scores, "splits": splits, "total": total, "remark": report_remark(total * 100 / (term_max[term] * len(subjects))),
                "rank": ranks.get((term, s.id)),
                "class_top": class_top[term], "attendance": {"present": att[1][s.id], "working": att[0]} if att and att[1].get(s.id) is not None else None, **limits})
        cards.append({"student_id": s.id, "registration_no": s.registration_no, "name": s.account.full_name, "rows": rows})
    # Class teacher's signature per exam they signed (printed cards only — never sent to the student portal)
    signatures = exam_signatures(db, assessments) if with_signatures else {}
    return {"class_code": cls.code, "grade": cls.grade, "academic_year": cls.academic_year, "subjects": subjects, "signatures": signatures,
        "max_total": full, "cards": cards}


@router.get("/classes/{class_code}/report-cards", summary="Printable progress cards for every student in a class")
def class_report_cards(class_code: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = get_class(db, class_code)
    if not can_access_class(db, account, cls, allow_subject=False): raise HTTPException(403, "Only the class teacher can view report cards")
    return build_report_cards(db, cls, with_signatures=True)


@router.get("/students/{student_id}/report-card", summary="One student's progress card")
def student_report_card(student_id: int, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    student = db.get(Student, student_id)
    if not student: raise HTTPException(404, "Student not found")
    if account.role == "student" and student.account_id != account.id: raise HTTPException(403, "Report card access denied")
    if account.role == "teacher" and not can_access_class(db, account, student.school_class): raise HTTPException(403, "Class access denied")
    # Staff printing a single card see the class teacher's signature; the student portal never gets it
    data = build_report_cards(db, student.school_class, only_student_id=student.id, with_signatures=account.role != "student")
    return {**{k: v for k, v in data.items() if k != "cards"}, "card": data["cards"][0]}


@router.get("/reports/results")
def results_report(term: str = Query(...), academic_year: str | None = None, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    q = db.query(AcademicClass)
    output=[]
    for cls in q.all():
        assess = db.query(Assessment).filter_by(class_id=cls.id, term=term, academic_year=academic_year or cls.academic_year)
        ids=[a.id for a in assess.all()]
        count=db.query(func.count(func.distinct(Mark.student_id))).filter(Mark.assessment_id.in_(ids)).scalar() if ids else 0
        avg=db.query(func.avg(Mark.score*100.0/Mark.maximum_score)).filter(Mark.assessment_id.in_(ids)).scalar() if ids else None
        output.append({"class_code":cls.code,"students_with_marks":count,"average_percent":round(avg,2) if avg is not None else None})
    return {"term":term,"academic_year":academic_year,"classes":output}


# Monthly attendance, matching the mockup's class/month locked-total model
@router.put("/classes/{class_code}/attendance")
def save_attendance(class_code: str, data: AttendanceIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls=get_class(db,class_code)
    if account.role=="teacher":
        teacher=teacher_profile(db,account)
        if not is_class_teacher_of(db,teacher,cls): raise HTTPException(403,"Only the class teacher may take attendance")
    record=db.query(AttendanceMonth).filter_by(class_id=cls.id,month=data.month).first()
    if record and record.locked: raise HTTPException(409,"Attendance month is locked; ask an admin to unlock it")
    students={s.id for s in class_students(db,cls).all()}
    if set(data.records)-students: raise HTTPException(422,"Attendance includes a student outside this class")
    if any(n<0 or n>data.total_days for n in data.records.values()): raise HTTPException(422,"Present days must be between zero and total days")
    if not record:
        record=AttendanceMonth(class_id=cls.id,month=data.month,total_days=data.total_days,locked=False,marked_by=account.id); db.add(record); db.flush()
    record.total_days=data.total_days; record.locked=True; record.marked_by=account.id
    db.query(AttendanceRecord).filter_by(attendance_month_id=record.id).delete()
    db.add_all([AttendanceRecord(attendance_month_id=record.id,student_id=int(sid),present_days=days) for sid,days in data.records.items()])
    db.commit(); return {"class_code":cls.code,"month":record.month,"total_days":record.total_days,"locked":record.locked}


@router.get("/classes/{class_code}/attendance")
def get_attendance(class_code: str, month: str | None = None, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    cls=get_class(db,class_code)
    if not can_access_class(db,account,cls): raise HTTPException(403,"Class access denied")
    first,last=year_months(cls.academic_year)
    q=db.query(AttendanceMonth).filter(AttendanceMonth.class_id==cls.id,AttendanceMonth.month>=first,AttendanceMonth.month<=last)
    if month: q=q.filter_by(month=month)
    items=[]
    for rec in q.order_by(AttendanceMonth.month.desc()).all():
        records=db.query(AttendanceRecord).filter_by(attendance_month_id=rec.id).all()
        if account.role=="student":
            own=student_profile(db,account)
            records=[r for r in records if r.student_id==own.id]
        items.append({"month":rec.month,"total_days":rec.total_days,"locked":rec.locked,"records":[{"student_id":r.student_id,"present_days":r.present_days,"absent_days":rec.total_days-r.present_days,"percentage":round(r.present_days*100/rec.total_days,2)} for r in records]})
    return items


@router.post("/classes/{class_code}/attendance/{month}/unlock")
def unlock_attendance(class_code: str, month: str, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    cls=get_class(db,class_code); rec=db.query(AttendanceMonth).filter_by(class_id=cls.id,month=month).first()
    if not rec: raise HTTPException(404,"Attendance month not found")
    rec.locked=False; db.commit(); return {"class_code":cls.code,"month":month,"locked":False}


@router.get("/reports/attendance")
def attendance_report(month: str | None = None, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    report=[]
    for cls in db.query(AcademicClass).filter_by(is_active=True).order_by(AcademicClass.grade,AcademicClass.code):
        first,last=year_months(cls.academic_year)
        q=db.query(AttendanceMonth).filter(AttendanceMonth.class_id==cls.id,AttendanceMonth.month>=first,AttendanceMonth.month<=last)
        if month: q=q.filter_by(month=month)
        records=q.all(); rates=[]
        for rec in records:
            present=db.query(func.sum(AttendanceRecord.present_days)).filter_by(attendance_month_id=rec.id).scalar() or 0
            count=db.query(func.count(AttendanceRecord.id)).filter_by(attendance_month_id=rec.id).scalar() or 0
            if count and rec.total_days: rates.append(present*100/(rec.total_days*count))
        report.append({"class_code":cls.code,"months_marked":len(records),"average_percent":round(sum(rates)/len(rates),2) if rates else None})
    return {"month":month,"classes":report}


# Timetables: replace the selected class's grid in one operation
@router.get("/classes/{class_code}/timetable")
def class_timetable(class_code: str, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    cls=get_class(db,class_code)
    if not can_access_class(db,account,cls): raise HTTPException(403,"Class access denied")
    return [{"weekday":e.weekday,"period":e.period,"subject":e.subject,"teacher_id":e.teacher_id,"teacher_name":db.get(Teacher,e.teacher_id).account.full_name if e.teacher_id and db.get(Teacher,e.teacher_id) else None,"room":e.room} for e in db.query(TimetableEntry).filter_by(class_id=cls.id,academic_year=cls.academic_year).order_by(TimetableEntry.weekday,TimetableEntry.period).all()]


@router.get("/teachers/me/timetable")
def my_teacher_timetable(db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    teacher=teacher_profile(db,account)
    entries=(db.query(TimetableEntry).join(AcademicClass,AcademicClass.id==TimetableEntry.class_id)
             .filter(TimetableEntry.teacher_id==teacher.id,TimetableEntry.academic_year==AcademicClass.academic_year)
             .order_by(TimetableEntry.weekday,TimetableEntry.period).all())
    return [{"class_code":db.get(AcademicClass,e.class_id).code,"weekday":e.weekday,"period":e.period,"subject":e.subject,"room":e.room,"academic_year":e.academic_year} for e in entries]


@router.get("/teachers/{teacher_id}/timetable")
def teacher_timetable_by_id(teacher_id: int, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    """Read-only view of one teacher's aggregated weekly schedule across every class they teach."""
    teacher=db.get(Teacher,teacher_id)
    if not teacher: raise HTTPException(404,"Teacher not found")
    entries=(db.query(TimetableEntry).join(AcademicClass,AcademicClass.id==TimetableEntry.class_id)
             .filter(TimetableEntry.teacher_id==teacher.id,TimetableEntry.academic_year==AcademicClass.academic_year)
             .order_by(TimetableEntry.weekday,TimetableEntry.period).all())
    return [{"class_code":db.get(AcademicClass,e.class_id).code,"weekday":e.weekday,"period":e.period,"subject":e.subject,"room":e.room,"academic_year":e.academic_year} for e in entries]


@router.put("/teachers/me/timetable")
def replace_teacher_timetable(data: TimetableIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    teacher=teacher_profile(db,account) if account.role=="teacher" else None
    if account.role=="admin": raise HTTPException(422,"Admin must edit a teacher schedule through class timetable entries")
    db.query(TimetableEntry).filter_by(teacher_id=teacher.id,academic_year=data.academic_year).delete()
    for entry in data.entries:
        if not entry.teacher_id:
            entry.teacher_id=teacher.id
        if entry.teacher_id!=teacher.id: raise HTTPException(403,"Cannot edit another teacher's timetable")
        cls=get_class(db,entry.class_code) if hasattr(entry,"class_code") else None
        if not cls: raise HTTPException(422,"Teacher timetable entries must identify a class_code")
        if not can_access_class(db,account,cls): raise HTTPException(403,"Class access denied")
        db.add(TimetableEntry(class_id=cls.id,teacher_id=teacher.id,weekday=entry.weekday,period=entry.period,subject=entry.subject,room=entry.room,academic_year=data.academic_year))
    db.commit(); return {"teacher_id":teacher.id,"entries_saved":len(data.entries)}


@router.put("/classes/{class_code}/timetable")
def replace_class_timetable(class_code: str, data: TimetableIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls=get_class(db,class_code); teacher_or_admin(account,db,cls)
    if account.role=="teacher":
        if not is_class_teacher_of(db,teacher_profile(db,account),cls): raise HTTPException(403,"Only the class teacher may edit this timetable")
    db.query(TimetableEntry).filter_by(class_id=cls.id,academic_year=cls.academic_year).delete()
    db.add_all([TimetableEntry(class_id=cls.id,teacher_id=e.teacher_id,weekday=e.weekday,period=e.period,subject=e.subject,room=e.room,academic_year=cls.academic_year) for e in data.entries])
    db.commit(); return {"class_code":cls.code,"entries_saved":len(data.entries)}


# Notices and class notices
@router.get("/notices")
def list_notices(db: Session = Depends(get_db)):
    """Publicly published website announcements only."""
    return db.query(Notice).filter_by(published=True,audience="website").order_by(Notice.created_at.desc()).all()


def notice_author(db: Session, notice: Notice, cache: dict | None = None) -> dict:
    """Who posted a notice, for display: the HM, or a teacher with their subject and class-teacher role."""
    cache = {} if cache is None else cache
    key = (notice.author_id, notice.class_id)
    if key in cache: return cache[key]
    author = db.get(Account, notice.author_id) if notice.author_id else None
    info = {"author_name": None, "author_role": None, "author_subject": None, "author_teacher_id": None, "author_is_class_teacher": False}
    if author and author.role == "admin":
        info.update(author_name=author.full_name, author_role="admin")
    elif author and author.role == "teacher":
        teacher = db.query(Teacher).filter_by(account_id=author.id).first()
        cls = db.get(AcademicClass, notice.class_id) if notice.class_id else None
        info.update(author_name=author.full_name, author_role="teacher", author_subject=teacher.subject if teacher else None,
                    author_teacher_id=teacher.id if teacher else None,
                    author_is_class_teacher=bool(teacher and cls and is_class_teacher_of(db, teacher, cls)))
    cache[key] = info
    return info


def notice_out(db: Session, notice: Notice, cache: dict | None = None) -> dict:
    cls = db.get(AcademicClass, notice.class_id) if notice.class_id else None
    return {"id": notice.id, "title": notice.title, "body": notice.body, "audience": notice.audience, "class_id": notice.class_id,
            "class_code": cls.code if cls else None, "author_id": notice.author_id, "published": notice.published, "created_at": notice.created_at, **notice_author(db, notice, cache)}


def notices_out(db: Session, notices: list[Notice]) -> list[dict]:
    cache: dict = {}
    return [notice_out(db, n, cache) for n in notices]


@router.get("/portal/notices")
def portal_notices(db: Session = Depends(get_db), account: Account = Depends(current_account)):
    """Notices visible to the signed-in role and, for students, their class."""
    if account.role=="admin":
        query=db.query(Notice).filter_by(published=True)
    elif account.role=="teacher":
        query=db.query(Notice).filter(Notice.published.is_(True),Notice.audience.in_(["all","teachers"]))
    elif account.role=="student":
        student=student_profile(db,account)
        query=db.query(Notice).filter(Notice.published.is_(True),((Notice.class_id==student.class_id)|(Notice.class_id.is_(None)&Notice.audience.in_(["all","students"]))))
    else: raise HTTPException(403,"Notices not available for this role")
    return notices_out(db, query.order_by(Notice.created_at.desc()).all())


@router.get("/portal/alerts", summary="Badge counts, pending items and change markers for live portal updates (polled)")
def portal_alerts(db: Session = Depends(get_db), account: Account = Depends(current_account)):
    """`versions` change whenever anything in that topic changes, so the client knows what to refresh.
    `items` are things waiting on this user; `notices` lists recent visible notice ids for unread badges."""
    def version(q, model, decided=True, extra=()):
        cols = [func.count(model.id), func.max(model.id)] + ([func.max(model.decided_at)] if decided else []) + [func.max(c) for c in extra]
        return ":".join(str(v) for v in q.with_entities(*cols).one())

    certs = db.query(CertificateRequest); leaves = db.query(LeaveRequest); notices = db.query(Notice).filter(Notice.published.is_(True))
    cert_pending = leave_pending = None; cert_link = leave_link = None
    if account.role == "admin":
        # The HM's queue is what the class teachers have approved and is waiting to be printed.
        cert_pending = certs.filter(CertificateRequest.status == "approved"); cert_link = "/admin/certificates"
        # Teacher leave to decide, plus student leave class teachers forwarded for the HM's remarks
        leaves = leaves.filter((LeaveRequest.applicant_role == "teacher") | LeaveRequest.forward_state.isnot(None))
        leave_pending = leaves.filter(LeaveRequest.applicant_role == "teacher", LeaveRequest.status == "pending"); leave_link = "/admin/leave-requests"
        notices = notices.filter(Notice.id < 0)  # the HM writes notices; nothing to alert on
    elif account.role == "teacher":
        class_ids = [c.id for c in assigned_classes(db, teacher_profile(db, account))] or [-1]
        certs = certs.join(Student, Student.id == CertificateRequest.student_id).filter(Student.class_id.in_(class_ids))
        cert_pending = certs.filter(CertificateRequest.status == "pending"); cert_link = "/teacher/certificates"
        leaves = leaves.filter(LeaveRequest.applicant_role == "student", LeaveRequest.class_id.in_(class_ids))
        # Waiting on the class teacher: new requests and ones the HM replied on (not those still with the HM)
        leave_pending = leaves.filter(LeaveRequest.status == "pending", (LeaveRequest.forward_state.is_(None)) | (LeaveRequest.forward_state == "hm_replied")); leave_link = "/teacher/leave-requests"
        notices = notices.filter(Notice.audience.in_(["all", "teachers"]))
    elif account.role == "student":
        student = student_profile(db, account)
        certs = certs.filter(CertificateRequest.student_id == student.id); leaves = leaves.filter(LeaveRequest.applicant_id == account.id)
        notices = notices.filter((Notice.class_id == student.class_id) | (Notice.class_id.is_(None) & Notice.audience.in_(["all", "students"])))
    else: raise HTTPException(403, "Alerts not available for this role")

    items = []
    if cert_pending is not None:
        for req in cert_pending.order_by(CertificateRequest.id.desc()).limit(10).all():
            s = db.get(Student, req.student_id)
            to_print = account.role == "admin"
            items.append({"key": f"certificate-{req.id}", "kind": "certificate", "title": "Certificate to print" if to_print else "New certificate request",
                          "detail": f"{s.account.full_name if s else 'Student'} · {req.certificate_type.title()}", "to": cert_link,
                          "created_at": req.decided_at if to_print else req.created_at})
    if leave_pending is not None:
        for req in leave_pending.order_by(LeaveRequest.id.desc()).limit(10).all():
            name = db.get(Account, req.applicant_id).full_name
            if req.forward_state == "hm_replied":
                items.append({"key": f"leave-{req.id}-hm-{int(req.hm_replied_at.timestamp()) if req.hm_replied_at else 0}", "kind": "leave", "title": "HM replied on a leave request",
                              "detail": f"{name} · {req.hm_remark}", "to": leave_link, "created_at": req.hm_replied_at})
            else:
                items.append({"key": f"leave-{req.id}", "kind": "leave", "title": "New leave request",
                              "detail": f"{name} · {req.days} day{'s' if req.days != 1 else ''}", "to": leave_link, "created_at": req.created_at})
    if account.role == "admin":
        for req in leaves.filter(LeaveRequest.forward_state == "with_hm", LeaveRequest.status == "pending").order_by(LeaveRequest.forwarded_at.desc()).limit(10).all():
            s = db.get(Student, req.student_id)
            items.append({"key": f"leave-fwd-{req.id}-{int(req.forwarded_at.timestamp()) if req.forwarded_at else 0}", "kind": "leave", "title": "Student leave forwarded to you",
                          "detail": f"{s.account.full_name if s else 'Student'} · {s.school_class.code if s else ''} · {req.teacher_remark or ''}", "to": "/admin/leave-requests", "created_at": req.forwarded_at})
    if account.role == "student":
        # Progress messages: approved = moved to the HM (no badge), printed = collect it from the HM (badge for a week), rejected.
        recent = datetime.utcnow() - timedelta(days=7)
        for req in certs.filter(CertificateRequest.status == "approved").order_by(CertificateRequest.id.desc()).limit(10).all():
            items.append({"key": f"certificate-hm-{req.id}", "kind": "certificate", "title": "Class teacher approved",
                          "detail": f"{req.certificate_type.title()} certificate moved to the Head Master", "to": "/student/certificates",
                          "created_at": req.decided_at, "silent_badge": True})
        for req in certs.filter(CertificateRequest.status == "ready", CertificateRequest.downloaded_at >= recent).order_by(CertificateRequest.id.desc()).limit(10).all():
            items.append({"key": f"certificate-ready-{req.id}", "kind": "certificate", "title": "Certificate ready",
                          "detail": f"{req.certificate_type.title()} certificate printed — collect it from the Head Master", "to": "/student/certificates",
                          "created_at": req.downloaded_at, "clear_on_visit": True})
        for req in certs.filter(CertificateRequest.status == "rejected", CertificateRequest.decided_at >= recent).order_by(CertificateRequest.id.desc()).limit(5).all():
            items.append({"key": f"certificate-rejected-{req.id}", "kind": "certificate", "title": "Certificate request rejected",
                          "detail": req.decision_note or f"{req.certificate_type.title()} certificate", "to": "/student/certificates",
                          "created_at": req.decided_at, "silent_badge": True})
        for req in leaves.filter(LeaveRequest.status != "pending", LeaveRequest.decided_at >= datetime.utcnow() - timedelta(days=3)).order_by(LeaveRequest.id.desc()).limit(5).all():
            items.append({"key": f"leave-{req.id}-{req.status}", "kind": "leave", "title": f"Leave {req.status}", "detail": f"{req.from_date:%d %b} – {req.to_date:%d %b}",
                          "to": "/student/leave", "created_at": req.decided_at, "silent_badge": True})
    # Notes of Lessons: the HM is told about plans waiting for approval; a teacher about plans the HM returned.
    plans = db.query(LessonPlan)
    if account.role == "admin":
        plans = plans.filter(LessonPlan.academic_year == current_academic_year(db))
        for p in plans.filter(LessonPlan.status == "pending").order_by(LessonPlan.id.desc()).limit(10).all():
            t = db.get(Teacher, p.teacher_id)
            items.append({"key": f"notes-{p.id}-{int(p.uploaded_at.timestamp()) if p.uploaded_at else 0}", "kind": "notes", "title": "Lesson plan to approve",
                          "detail": f"{t.account.full_name if t else 'Teacher'} · {db.get(AcademicClass, p.class_id).code} {p.subject}",
                          "to": "/admin/notes-of-lessons", "created_at": p.uploaded_at})
    elif account.role == "teacher":
        plans = plans.filter(LessonPlan.teacher_id == teacher_profile(db, account).id)
        for p in plans.filter(LessonPlan.status == "returned").order_by(LessonPlan.id.desc()).limit(10).all():
            items.append({"key": f"notes-returned-{p.id}-{int(p.decided_at.timestamp()) if p.decided_at else 0}", "kind": "notes", "title": "Lesson plan returned by HM",
                          "detail": f"{db.get(AcademicClass, p.class_id).code} {p.subject} · {p.note or 'see the note'}",
                          "to": "/teacher/notes-of-lessons", "created_at": p.decided_at})
    else:
        plans = plans.filter(LessonPlan.id < 0)
    # Homework: students are told about homework given in the last two days (cleared once they open My Homework).
    homework = db.query(Homework)
    if account.role == "student":
        homework = homework.filter(Homework.class_id == student.class_id)
        since = (datetime.utcnow() + timedelta(hours=5, minutes=30)).date() - timedelta(days=1)
        for h in homework.filter(Homework.given_on >= since).order_by(Homework.id.desc()).limit(10).all():
            items.append({"key": f"homework-{h.id}", "kind": "homework", "title": f"New homework · {h.subject}",
                          "detail": h.details[:80], "to": "/student/homework", "created_at": h.created_at, "clear_on_visit": True})
    elif account.role == "teacher":
        me = teacher_profile(db, account)
        homework = homework.filter(Homework.teacher_id == me.id)
    # Reminders: a teacher from 1 PM for today's periods still without homework; the HM from 3 PM with the day's total.
    from app.api.homework import HM_REMIND_HOUR, TEACHER_REMIND_HOUR, missing_today, now_ist
    now = now_ist()
    if account.role == "teacher" and now.hour >= TEACHER_REMIND_HOUR:
        for m in missing_today(db, me.id):
            items.append({"key": f"homework-missing-{now:%Y%m%d}-{m['class_code']}-{m['subject']}", "kind": "homework", "title": "Homework not given yet",
                          "detail": f"{m['class_code']} · {m['subject']}", "to": "/teacher/homework", "created_at": now.replace(hour=TEACHER_REMIND_HOUR, minute=0, second=0, microsecond=0) - timedelta(hours=5, minutes=30)})
    elif account.role == "admin" and now.hour >= HM_REMIND_HOUR:
        missing = missing_today(db)
        if missing:
            items.append({"key": f"homework-missing-{now:%Y%m%d}", "kind": "homework", "title": f"Homework not given for {len(missing)} period{'s' if len(missing) != 1 else ''} today",
                          "detail": f"{len({m['teacher_id'] for m in missing})} teacher(s) · tap to see the list", "to": "/admin/homework", "count": len(missing),
                          "created_at": now.replace(hour=HM_REMIND_HOUR, minute=0, second=0, microsecond=0) - timedelta(hours=5, minutes=30)})
    items.sort(key=lambda i: i["created_at"] or datetime.min, reverse=True)

    counts = {"certificates": sum(1 for i in items if i["kind"] == "certificate" and not i.get("silent_badge")), "leave": sum(1 for i in items if i["kind"] == "leave" and not i.get("silent_badge")),
              "notes": sum(1 for i in items if i["kind"] == "notes")}
    cache: dict = {}
    recent_notices = [{"id": n.id, "title": n.title, "author_teacher_id": notice_author(db, n, cache)["author_teacher_id"]} for n in notices.order_by(Notice.id.desc()).limit(30).all()]
    # Students: the self-editable profile fields still blank (the portal nags until they are filled in).
    profile_missing = []
    if account.role == "student":
        profile_missing = [label for label, filled in (("Date of birth", student.date_of_birth), ("Blood group", (student.blood_group or "").strip()),
            ("Father's or mother's name", (student.father_name or "").strip() or (student.mother_name or "").strip()),
            ("Address", (student.address or "").strip())) if not filled]
    return {"counts": counts, "items": items, "notices": recent_notices, "profile_missing": profile_missing,
            "versions": {"certificates": version(certs, CertificateRequest, extra=[CertificateRequest.downloaded_at]), "leave": version(leaves, LeaveRequest, extra=[LeaveRequest.forwarded_at, LeaveRequest.hm_replied_at]), "notices": version(notices, Notice, decided=False),
                         "notes": version(plans, LessonPlan, extra=[LessonPlan.uploaded_at]),
                         "homework": version(homework, Homework, decided=False, extra=[Homework.updated_at])}}


@router.get("/classes/{class_code}/notices")
def class_notices(class_code: str, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    cls=get_class(db,class_code)
    if not can_access_class(db,account,cls): raise HTTPException(403,"Class access denied")
    return notices_out(db, db.query(Notice).filter_by(class_id=cls.id,published=True).order_by(Notice.created_at.desc()).all())


@router.post("/notices", status_code=201)
def create_notice(data: NoticeIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    if data.audience not in {"website","all","students","teachers"}: raise HTTPException(422,"Invalid notice audience")
    cls=get_class(db,data.class_code) if data.class_code else None
    if account.role=="teacher":
        if not cls: raise HTTPException(422,"Teachers must scope notices to a class")
        teacher_or_admin(account,db,cls)
        data.audience="class"
    notice=Notice(title=data.title,body=data.body,audience=data.audience,class_id=cls.id if cls else None,author_id=account.id)
    db.add(notice); db.commit(); db.refresh(notice)
    # Phone notifications: a class notice to that class's students; the HM's notices to their audience
    if cls and data.audience in {"class","students","all"}: notify(db, students_of(db, cls.id), f"Notice · {notice.title}", notice.body, "/student/notices", f"notice-{notice.id}")
    elif not cls:
        if data.audience in {"all","students"}: notify(db, all_students(db), f"Notice · {notice.title}", notice.body, "/student/notices", f"notice-{notice.id}")
        if data.audience in {"all","teachers"}: notify(db, all_teachers(db), f"Notice from the HM · {notice.title}", notice.body, "/teacher/notices", f"notice-{notice.id}")
    return notice


@router.patch("/notices/{notice_id}")
def update_notice(notice_id: int, data: NoticeUpdate, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    notice=db.get(Notice,notice_id)
    if not notice: raise HTTPException(404,"Notice not found")
    if account.role=="teacher" and (notice.author_id!=account.id or notice.audience!="class"):
        raise HTTPException(403,"Teachers may edit only their own class notices")
    values=data.model_dump(exclude_unset=True)
    class_code=values.pop("class_code",None)
    if class_code is not None:
        cls=get_class(db,class_code)
        if account.role=="teacher": teacher_or_admin(account,db,cls)
        notice.class_id=cls.id
    if "audience" in values:
        if account.role=="teacher": values.pop("audience")
        elif values["audience"] not in {"website","all","students","teachers","class"}: raise HTTPException(422,"Invalid notice audience")
    for key,value in values.items(): setattr(notice,key,value)
    db.commit(); db.refresh(notice); return notice


@router.delete("/notices/{notice_id}", status_code=204, response_class=Response)
def delete_notice(notice_id: int, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    notice=db.get(Notice,notice_id)
    if not notice: raise HTTPException(404,"Notice not found")
    notice.published=False; db.commit()
    return Response(status_code=204)


# Student certificate requests; class teacher decides
@router.post("/certificates/requests", status_code=201)
def request_certificate(data: CertificateIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("student"))):
    student=student_profile(db,account); req=CertificateRequest(student_id=student.id,certificate_type=data.certificate_type,note=data.note)
    db.add(req); db.commit(); db.refresh(req)
    notify(db, class_teachers_of(db, student.class_id), "New certificate request", f"{account.full_name} · {req.certificate_type.title()}", "/teacher/certificates", f"certificate-{req.id}")
    return req


@router.get("/certificates/requests")
def certificate_requests(db: Session = Depends(get_db), account: Account = Depends(current_account)):
    q=db.query(CertificateRequest)
    if account.role=="student": q=q.filter_by(student_id=student_profile(db,account).id)
    elif account.role=="teacher":
        class_ids=[c.id for c in assigned_classes(db,teacher_profile(db,account))]
        if not class_ids: return []
        ids=[s.id for s in db.query(Student).filter(Student.class_id.in_(class_ids)).all()]; q=q.filter(CertificateRequest.student_id.in_(ids))
    return [certificate_out(db, req) for req in q.order_by(CertificateRequest.created_at.desc()).all()]


def certificate_out(db: Session, req: CertificateRequest) -> dict:
    student = db.get(Student, req.student_id)
    assignment = db.query(ClassTeacherAssignment).filter_by(class_id=student.class_id, academic_year=student.school_class.academic_year).first() if student else None
    class_teacher = db.get(Teacher, assignment.teacher_id) if assignment else None
    decider = db.get(Account, req.decision_by) if req.decision_by else None
    return {"id": req.id, "student_id": req.student_id, "student_name": student.account.full_name if student else None,
            "registration_no": student.registration_no if student else None, "class_code": student.school_class.code if student else None,
            "class_teacher_name": class_teacher.account.full_name if class_teacher else None,
            "decided_by_name": decider.full_name if decider else None, "decided_by_role": decider.role if decider else None,
            "certificate_type": req.certificate_type, "note": req.note, "status": req.status, "decision_by": req.decision_by,
            "decision_note": req.decision_note, "created_at": req.created_at, "decided_at": req.decided_at, "printed_at": req.downloaded_at}


@router.patch("/certificates/requests/{request_id}")
def decide_certificate(request_id: int, data: DecisionIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    """Flow: pending (class teacher) -> approved (moved to the HM, who prints it) -> ready (printed; collect from HM).
    The class teacher decides pending requests; the HM may also approve a pending one, or reject anything not yet printed."""
    req=db.get(CertificateRequest,request_id)
    if not req: raise HTTPException(404,"Certificate request not found")
    if account.role=="teacher":
        student=db.get(Student,req.student_id); cls=student.school_class
        teacher=teacher_profile(db,account)
        if not is_class_teacher_of(db,teacher,cls): raise HTTPException(403,"Only the assigned class teacher may decide this request")
        if req.status!="pending": raise HTTPException(409,"Request has already been decided")
    elif req.status not in ("pending","approved") or (req.status=="approved" and data.approve):
        raise HTTPException(409,"Request has already been decided")
    req.status="approved" if data.approve else "rejected"; req.decision_by=account.id; req.decision_note=data.note; req.decided_at=datetime.utcnow()
    db.commit()
    out=certificate_out(db, req); student=db.get(Student,req.student_id); kind=req.certificate_type.title()
    if req.status=="approved":
        notify(db, admins(db), "Certificate to print", f"{out['student_name']} · {kind}", "/admin/certificates", f"certificate-{req.id}")
        notify(db, [student.account_id], "Certificate request approved", f"{kind} certificate moved to the Head Master", "/student/certificates", f"certificate-{req.id}")
    else:
        notify(db, [student.account_id], "Certificate request rejected", req.decision_note or f"{kind} certificate", "/student/certificates", f"certificate-{req.id}")
    return out


# Leave requests: student -> class teacher, teacher -> admin (HM)
LEAVE_TYPES = {"student": {"normal", "od"}, "teacher": {"personal", "sick", "od"}}


def leave_days_by_month(start: date, end: date) -> dict[str, int]:
    """Working days (Mon-Fri) in [start, end], grouped by YYYY-MM."""
    days: dict[str, int] = defaultdict(int); day = start
    while day <= end:
        if day.weekday() < 5: days[day.strftime("%Y-%m")] += 1
        day += timedelta(days=1)
    return dict(days)


def leave_out(db: Session, req: LeaveRequest, internal: bool = True) -> dict:
    """`internal=False` (the student's own view) leaves out the class teacher ↔ HM remarks."""
    applicant = db.get(Account, req.applicant_id); cls = db.get(AcademicClass, req.class_id) if req.class_id else None
    out = {"id": req.id, "applicant_role": req.applicant_role, "applicant_name": applicant.full_name, "applicant_username": applicant.username,
           "student_id": req.student_id, "class_code": cls.code if cls else None, "leave_type": req.leave_type, "from_date": req.from_date, "to_date": req.to_date,
           "days": req.days, "reason": req.reason, "status": req.status, "decision_note": req.decision_note,
           "created_at": req.created_at, "decided_at": req.decided_at, "forward_state": req.forward_state}
    if internal:
        teacher_ids = class_teachers_of(db, req.class_id) if req.class_id else []
        names = [a.full_name for a in db.query(Account).filter(Account.id.in_(teacher_ids)).all()] if teacher_ids else []
        out.update({"class_teacher_name": ", ".join(names) or None, "teacher_remark": req.teacher_remark, "forwarded_at": req.forwarded_at,
                    "hm_remark": req.hm_remark, "hm_replied_at": req.hm_replied_at})
    return out


def mark_leave_absent(db: Session, req: LeaveRequest):
    """An approved normal leave counts as absence. Months not yet recorded pick it up via /leave-days when attendance is taken."""
    for month, days in leave_days_by_month(req.from_date, req.to_date).items():
        rec = db.query(AttendanceMonth).filter_by(class_id=req.class_id, month=month).first()
        row = db.query(AttendanceRecord).filter_by(attendance_month_id=rec.id, student_id=req.student_id).first() if rec else None
        if row: row.present_days = max(0, row.present_days - days)


@router.post("/leave-requests", status_code=201)
def apply_leave(data: LeaveRequestIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("student", "teacher"))):
    if data.leave_type not in LEAVE_TYPES[account.role]: raise HTTPException(422, f"'{data.leave_type}' leave is not available for {account.role}s")
    if data.to_date < data.from_date: raise HTTPException(422, "To date must be on or after the from date")
    days = sum(leave_days_by_month(data.from_date, data.to_date).values())
    if days == 0: raise HTTPException(422, "The selected dates contain no working days (Mon-Fri)")
    overlap = db.query(LeaveRequest).filter(LeaveRequest.applicant_id == account.id, LeaveRequest.status.in_(["pending", "approved"]),
        LeaveRequest.from_date <= data.to_date, LeaveRequest.to_date >= data.from_date).first()
    if overlap: raise HTTPException(409, "You already have a pending or approved leave covering these dates")
    req = LeaveRequest(applicant_id=account.id, applicant_role=account.role, leave_type=data.leave_type, from_date=data.from_date,
        to_date=data.to_date, days=days, reason=data.reason)
    if account.role == "student":
        student = student_profile(db, account); req.student_id, req.class_id = student.id, student.class_id
    else: req.teacher_id = teacher_profile(db, account).id
    db.add(req); db.commit(); db.refresh(req)
    who = f"{account.full_name} · {days} day{'s' if days != 1 else ''}"
    if account.role == "student": notify(db, class_teachers_of(db, req.class_id), "New leave request", who, "/teacher/leave-requests", f"leave-{req.id}")
    else: notify(db, admins(db), "New leave request", who, "/admin/leave-requests", f"leave-{req.id}")
    return leave_out(db, req)


@router.get("/leave-requests", summary="scope=mine for own requests, scope=review for requests awaiting your decision, scope=forwarded (HM) for student leave class teachers sent for advice")
def list_leave_requests(scope: str = Query("mine", pattern="^(mine|review|forwarded)$"), db: Session = Depends(get_db), account: Account = Depends(current_account)):
    q = db.query(LeaveRequest)
    if scope == "mine" or account.role == "student":
        q = q.filter_by(applicant_id=account.id)
        return [leave_out(db, r, internal=account.role != "student") for r in q.order_by(LeaveRequest.created_at.desc()).all()]
    if scope == "forwarded":
        if account.role != "admin": raise HTTPException(403, "Only the HM sees forwarded student leave")
        q = q.filter(LeaveRequest.applicant_role == "student", LeaveRequest.forward_state.isnot(None))
        return [leave_out(db, r) for r in q.order_by(LeaveRequest.forwarded_at.desc()).all()]
    elif account.role == "teacher":
        class_ids = [c.id for c in assigned_classes(db, teacher_profile(db, account))]
        if not class_ids: return []
        q = q.filter(LeaveRequest.applicant_role == "student", LeaveRequest.class_id.in_(class_ids))
    else: q = q.filter_by(applicant_role="teacher")
    return [leave_out(db, r) for r in q.order_by(LeaveRequest.created_at.desc()).all()]


@router.patch("/leave-requests/{request_id}")
def decide_leave(request_id: int, data: DecisionIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    req = db.get(LeaveRequest, request_id)
    if not req: raise HTTPException(404, "Leave request not found")
    if req.applicant_role == "teacher" and account.role != "admin": raise HTTPException(403, "Only the HM may decide teacher leave")
    if req.applicant_role == "student":
        if account.role != "teacher": raise HTTPException(403, "Student leave is decided by the class teacher")
        if not is_class_teacher_of(db, teacher_profile(db, account), db.get(AcademicClass, req.class_id)):
            raise HTTPException(403, "Only the assigned class teacher may decide this request")
    if req.status != "pending": raise HTTPException(409, "Request has already been decided")
    req.status = "approved" if data.approve else "rejected"; req.decision_by = account.id; req.decision_note = data.note; req.decided_at = datetime.utcnow()
    if req.status == "approved" and req.applicant_role == "student" and req.leave_type == "normal": mark_leave_absent(db, req)
    db.commit()
    notify(db, [req.applicant_id], f"Leave {req.status}", f"{req.from_date:%d %b} – {req.to_date:%d %b}" + (f" · {req.decision_note}" if req.decision_note else ""),
           "/student/leave" if req.applicant_role == "student" else "/teacher/leave-requests", f"leave-{req.id}")
    return leave_out(db, req)


class LeaveRemarkIn(BaseModel):
    remark: str = Field(min_length=2, max_length=1000)


@router.post("/leave-requests/{request_id}/forward", summary="Class teacher forwards a student's leave to the HM with remarks")
def forward_leave(request_id: int, data: LeaveRemarkIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    req = db.get(LeaveRequest, request_id)
    if not req or req.applicant_role != "student": raise HTTPException(404, "Student leave request not found")
    if not is_class_teacher_of(db, teacher_profile(db, account), db.get(AcademicClass, req.class_id)):
        raise HTTPException(403, "Only the class teacher may forward this request")
    if req.status != "pending": raise HTTPException(409, "Request has already been decided")
    if req.forward_state == "with_hm": raise HTTPException(409, "Already with the HM")
    req.forward_state = "with_hm"; req.teacher_remark = data.remark.strip(); req.forwarded_at = datetime.utcnow()
    req.hm_remark = None; req.hm_replied_at = None
    db.commit()
    student = db.get(Student, req.student_id)
    notify(db, admins(db), "Student leave forwarded to you", f"{student.account.full_name} ({student.school_class.code}) · {account.full_name}: {req.teacher_remark}",
           "/admin/leave-requests", f"leave-{req.id}")
    return leave_out(db, req)


@router.post("/leave-requests/{request_id}/hm-reply", summary="HM sends remarks on a forwarded student leave back to the class teacher")
def hm_reply_leave(request_id: int, data: LeaveRemarkIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin"))):
    req = db.get(LeaveRequest, request_id)
    if not req or req.applicant_role != "student" or not req.forward_state: raise HTTPException(404, "Forwarded leave request not found")
    if req.status != "pending": raise HTTPException(409, "The class teacher has already decided this request")
    req.forward_state = "hm_replied"; req.hm_remark = data.remark.strip(); req.hm_replied_at = datetime.utcnow()
    db.commit()
    student = db.get(Student, req.student_id)
    notify(db, class_teachers_of(db, req.class_id), "HM replied on a leave request", f"{student.account.full_name}: {req.hm_remark}", "/teacher/leave-requests", f"leave-{req.id}")
    return leave_out(db, req)


@router.delete("/leave-requests/{request_id}", status_code=204, response_class=Response)
def cancel_leave(request_id: int, db: Session = Depends(get_db), account: Account = Depends(require_roles("student", "teacher"))):
    req = db.get(LeaveRequest, request_id)
    if not req or req.applicant_id != account.id: raise HTTPException(404, "Leave request not found")
    if req.status != "pending": raise HTTPException(409, "Only pending requests can be cancelled")
    db.delete(req); db.commit()


@router.get("/classes/{class_code}/leave-days", summary="Approved normal-leave working days per student for a month")
def class_leave_days(class_code: str, month: str = Query(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$"), db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = get_class(db, class_code)
    if not can_access_class(db, account, cls): raise HTTPException(403, "Class access denied")
    start = date.fromisoformat(f"{month}-01"); end = (start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    totals: dict[int, int] = defaultdict(int)
    for req in db.query(LeaveRequest).filter(LeaveRequest.class_id == cls.id, LeaveRequest.status == "approved", LeaveRequest.leave_type == "normal",
            LeaveRequest.from_date <= end, LeaveRequest.to_date >= start).all():
        totals[req.student_id] += leave_days_by_month(req.from_date, req.to_date).get(month, 0)
    return {"class_code": cls.code, "month": month, "leave_days": totals}


@router.get("/certificates/requests/{request_id}/download")
def download_certificate(request_id: int, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin"))):
    """Only the HM prints certificates; printing marks the request ready for the student to collect."""
    req=db.get(CertificateRequest,request_id)
    if not req: raise HTTPException(404,"Certificate request not found")
    student=db.get(Student,req.student_id)
    if req.status not in ("approved","ready"): raise HTTPException(409,"Only requests approved by the class teacher can be printed")
    try:
        from app.services.certificate_pdf import bonafide_pdf, general_certificate_pdf
    except ImportError as exc:
        raise HTTPException(503,"PDF generation dependency is unavailable") from exc
    issued=datetime.utcnow()+timedelta(hours=5,minutes=30)  # dated the day the HM prints it (IST)
    # The printing HM's digital signature (My Signature) goes above "HEAD MASTER", with the date under it
    sig=db.get(AccountSignature,account.id); hm_sig=sig.image if sig else None
    if req.certificate_type=="bonafide": output=bonafide_pdf(student,issued,hm_sig)
    else: output=general_certificate_pdf(student,req.certificate_type,issued,hm_sig)
    first_print=req.status!="ready"
    req.status="ready"; req.downloaded_at=datetime.utcnow(); db.commit()
    if first_print: notify(db, [student.account_id], "Certificate ready", f"{req.certificate_type.title()} certificate printed — collect it from the Head Master", "/student/certificates", f"certificate-{req.id}")
    return StreamingResponse(output,media_type="application/pdf",headers={"Content-Disposition":f'inline; filename="certificate-{request_id}.pdf"'})


# Complaint messaging, private student <-> admin thread
@router.get("/complaints")
def list_complaints(db: Session = Depends(get_db), account: Account = Depends(current_account)):
    if account.role=="student":
        student=student_profile(db,account); query=db.query(ComplaintThread).filter_by(student_id=student.id)
    elif account.role=="admin": query=db.query(ComplaintThread)
    else: raise HTTPException(403,"Complaints are private to the student and admin")
    out=[]
    for thread in query.order_by(ComplaintThread.updated_at.desc()).all():
        msgs=db.query(ComplaintMessage).filter_by(thread_id=thread.id).order_by(ComplaintMessage.created_at).all()
        out.append({"id":thread.id,"student_id":thread.student_id,"student_name":db.get(Student,thread.student_id).account.full_name,"updated_at":thread.updated_at,"messages":[{"id":m.id,"sender_role":m.sender_role,"body":m.body,"created_at":m.created_at} for m in msgs]})
    return out


@router.post("/complaints/messages", status_code=201)
def send_complaint(data: ComplaintMessageIn, student_id: int | None = None, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    if account.role=="student": student=student_profile(db,account)
    elif account.role=="admin" and student_id: 
        student=db.get(Student,student_id)
        if not student: raise HTTPException(404,"Student not found")
    else: raise HTTPException(403,"Student or admin access required; admin must supply student_id")
    thread=db.query(ComplaintThread).filter_by(student_id=student.id).first()
    if not thread: thread=ComplaintThread(student_id=student.id); db.add(thread); db.flush()
    db.add(ComplaintMessage(thread_id=thread.id,sender_role=account.role,sender_id=account.id,body=data.body)); thread.updated_at=datetime.utcnow()
    db.commit(); return {"thread_id":thread.id,"student_id":student.id,"sent":True}


# Public events/gallery + admin maintenance
@router.get("/events")
def list_events(db: Session = Depends(get_db)):
    return db.query(SchoolEvent).filter_by(is_published=True).order_by(SchoolEvent.event_date.desc().nulls_last()).all()


@router.post("/events", status_code=201)
def create_event(data: EventIn, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    event=SchoolEvent(**data.model_dump()); db.add(event); db.commit(); db.refresh(event); return event


@router.patch("/events/{event_id}")
def update_event(event_id: int, data: EventUpdate, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    event=db.get(SchoolEvent,event_id)
    if not event: raise HTTPException(404,"Event not found")
    for key,value in data.model_dump(exclude_unset=True).items(): setattr(event,key,value)
    db.commit(); db.refresh(event); return event


@router.delete("/events/{event_id}", status_code=204, response_class=Response)
def delete_event(event_id: int, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    event=db.get(SchoolEvent,event_id)
    if not event: raise HTTPException(404,"Event not found")
    event.is_published=False
    db.commit()
    return Response(status_code=204)


@router.get("/gallery")
def list_gallery(event_id: int | None = None, db: Session = Depends(get_db)):
    q=db.query(GalleryItem).filter_by(is_published=True)
    if event_id: q=q.filter_by(event_id=event_id)
    return q.order_by(GalleryItem.id.desc()).all()


@router.post("/gallery", status_code=201)
def create_gallery_item(data: GalleryIn, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    if data.media_type not in {"image","video"}: raise HTTPException(422,"media_type must be image or video")
    item=GalleryItem(**data.model_dump()); db.add(item); db.commit(); db.refresh(item); return item


@router.post("/gallery/upload", status_code=201, summary="Upload an image and add it to the gallery")
async def upload_gallery_image(
    title: str = Form(...),
    category: str = Form("General"),
    event_id: int | None = Form(None),
    media: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Account = Depends(require_roles("admin")),
):
    allowed={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"}
    if media.content_type not in allowed: raise HTTPException(415,"Upload a JPEG, PNG, WebP, or GIF image")
    contents=await media.read(10*1024*1024+1)
    if len(contents)>10*1024*1024: raise HTTPException(413,"Image exceeds the 10 MB upload limit")
    if not contents: raise HTTPException(422,"Uploaded image is empty")
    if event_id is not None and not db.get(SchoolEvent,event_id): raise HTTPException(404,"Event not found")
    filename=f"{uuid4().hex}.{allowed[media.content_type]}"
    directory=Path(__file__).resolve().parents[2]/"uploads"/"gallery"
    directory.mkdir(parents=True,exist_ok=True)
    (directory/filename).write_bytes(contents)
    item=GalleryItem(event_id=event_id,title=title,category=category,media_type="image",media_url=f"/uploads/gallery/{filename}",is_published=True)
    db.add(item); db.commit(); db.refresh(item)
    return item


@router.delete("/gallery/{item_id}", status_code=204, response_class=Response)
def delete_gallery_item(item_id: int, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    item=db.get(GalleryItem,item_id)
    if not item: raise HTTPException(404,"Gallery item not found")
    item.is_published=False; db.commit()
    return Response(status_code=204)


# Page posts: admin picks a public page, adds title/content + images (e.g. quarterly exam toppers).
# "results" posts are class-wise toppers: class + total marks on the post, name + obtained marks per photo.
POST_PAGES={"achievements","results","sports","school-life","events"}
RESULT_CLASSES={"6","7","8","9","10","11","12"}
POST_IMAGE_TYPES={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"}
MAX_POST_IMAGES=6


def serialize_post(post: PagePost) -> dict:
    return {"id":post.id,"page":post.page,"title":post.title,"body":post.body,"created_at":post.created_at,
        "class_label":post.class_label,"total_marks":post.total_marks,
        "images":[{"id":img.id,"media_url":img.media_url,"caption":img.caption,"student_name":img.student_name,
            "obtained_marks":img.obtained_marks} for img in post.images]}


def capitalize_words(value: str) -> str:
    """'priya m' -> 'Priya M' (only the first letter of each word is changed)."""
    return " ".join(word[:1].upper()+word[1:] for word in value.split())


def build_entries(page: str, total_marks: int | None, count: int, captions: list[str], names: list[str], marks: list[str]) -> list[dict]:
    """Per-image fields for `count` images, validated for the post's page type."""
    at=lambda values,i: values[i].strip() if i<len(values) else ""
    entries=[]
    for i in range(count):
        if page!="results":
            entries.append({"caption":at(captions,i) or None,"student_name":None,"obtained_marks":None}); continue
        name=capitalize_words(at(names,i))
        if not name: raise HTTPException(422,"Enter the name for every student")
        try: obtained=float(at(marks,i))
        except ValueError: raise HTTPException(422,f"Enter the obtained mark for {name}")
        if obtained<0 or obtained>total_marks: raise HTTPException(422,f"Mark for {name} must be between 0 and {total_marks}")
        entries.append({"caption":None,"student_name":name,"obtained_marks":obtained})
    return entries


def validate_post_fields(page: str, title: str, body: str | None, image_count: int, class_label: str | None, total_marks: int | None):
    if page not in POST_PAGES: raise HTTPException(422,f"page must be one of: {', '.join(sorted(POST_PAGES))}")
    if not title.strip(): raise HTTPException(422,"Title is required")
    if image_count>MAX_POST_IMAGES: raise HTTPException(422,f"Up to {MAX_POST_IMAGES} images per post")
    if page=="results":
        if class_label not in RESULT_CLASSES: raise HTTPException(422,"Choose a class (6 to 12)")
        if not total_marks or total_marks<=0: raise HTTPException(422,"Enter the total mark")
        if not image_count: raise HTTPException(422,"Add at least one student")
    elif not image_count and not (body or "").strip(): raise HTTPException(422,"Add some content or at least one image")


@router.get("/posts", summary="List published posts, optionally for one public page")
def list_posts(page: str | None = None, db: Session = Depends(get_db)):
    q=db.query(PagePost).filter_by(is_published=True)
    if page: q=q.filter_by(page=page)
    return [serialize_post(p) for p in q.order_by(PagePost.created_at.desc(),PagePost.id.desc()).all()]


@router.post("/posts", status_code=201, summary="Create a post with images for a public page")
async def create_post(
    page: str = Form(...),
    title: str = Form(...),
    body: str | None = Form(None),
    class_label: str | None = Form(None),
    total_marks: int | None = Form(None),
    captions: list[str] = Form([]),
    names: list[str] = Form([]),
    marks: list[str] = Form([]),
    images: list[UploadFile] = File([]),
    db: Session = Depends(get_db),
    _: Account = Depends(require_roles("admin")),
):
    validate_post_fields(page,title,body,len(images),class_label,total_marks)
    entries=build_entries(page,total_marks,len(images),captions,names,marks)
    files=await read_post_images(images)
    is_result=page=="results"
    post=PagePost(page=page,title=title.strip(),body=(body or "").strip() or None,is_published=True,
        class_label=class_label if is_result else None,total_marks=total_marks if is_result else None)
    save_post_images(post,files,entries,start=0)
    db.add(post); db.commit(); db.refresh(post)
    return serialize_post(post)


@router.put("/posts/{post_id}", summary="Edit a post: fields, kept images (with their captions/names/marks), and new images")
async def update_post(
    post_id: int,
    page: str = Form(...),
    title: str = Form(...),
    body: str | None = Form(None),
    class_label: str | None = Form(None),
    total_marks: int | None = Form(None),
    keep_ids: list[int] = Form([]),
    keep_captions: list[str] = Form([]),
    keep_names: list[str] = Form([]),
    keep_marks: list[str] = Form([]),
    captions: list[str] = Form([]),
    names: list[str] = Form([]),
    marks: list[str] = Form([]),
    images: list[UploadFile] = File([]),
    db: Session = Depends(get_db),
    _: Account = Depends(require_roles("admin")),
):
    post=db.get(PagePost,post_id)
    if not post or not post.is_published: raise HTTPException(404,"Post not found")
    existing={img.id:img for img in post.images}
    if any(i not in existing for i in keep_ids): raise HTTPException(422,"An image does not belong to this post")
    validate_post_fields(page,title,body,len(keep_ids)+len(images),class_label,total_marks)
    kept_entries=build_entries(page,total_marks,len(keep_ids),keep_captions,keep_names,keep_marks)
    new_entries=build_entries(page,total_marks,len(images),captions,names,marks)
    files=await read_post_images(images)
    is_result=page=="results"
    post.page=page; post.title=title.strip(); post.body=(body or "").strip() or None
    post.class_label=class_label if is_result else None; post.total_marks=total_marks if is_result else None
    # Kept images stay first in the order sent; anything not kept is dropped from the post.
    for index,(image_id,entry) in enumerate(zip(keep_ids,kept_entries)):
        img=existing[image_id]
        img.sort_order=index
        for key,value in entry.items(): setattr(img,key,value)
    for image_id,img in existing.items():
        if image_id not in keep_ids: post.images.remove(img)
    save_post_images(post,files,new_entries,start=len(keep_ids))
    post.images.sort(key=lambda img: img.sort_order)
    db.commit(); db.refresh(post)
    return serialize_post(post)


async def read_post_images(images: list[UploadFile]) -> list[tuple[bytes,str]]:
    files=[]
    for media in images:
        if media.content_type not in POST_IMAGE_TYPES: raise HTTPException(415,"Upload JPEG, PNG, WebP, or GIF images")
        contents=await media.read(10*1024*1024+1)
        if len(contents)>10*1024*1024: raise HTTPException(413,"Each image must be 10 MB or less")
        if not contents: raise HTTPException(422,"An uploaded image is empty")
        files.append((contents,POST_IMAGE_TYPES[media.content_type]))
    return files


def save_post_images(post: PagePost, files: list[tuple[bytes,str]], entries: list[dict], start: int):
    directory=Path(__file__).resolve().parents[2]/"uploads"/"posts"
    directory.mkdir(parents=True,exist_ok=True)
    for index,((contents,ext),entry) in enumerate(zip(files,entries)):
        filename=f"{uuid4().hex}.{ext}"
        (directory/filename).write_bytes(contents)
        post.images.append(PagePostImage(media_url=f"/uploads/posts/{filename}",sort_order=start+index,**entry))


@router.delete("/posts/{post_id}", status_code=204, response_class=Response)
def delete_post(post_id: int, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    post=db.get(PagePost,post_id)
    if not post: raise HTTPException(404,"Post not found")
    post.is_published=False; db.commit()
    return Response(status_code=204)


@router.get("/public/school")
def public_school_profile():
    return {"name":"Government Higher Secondary School, Kangayampalayam","short_name":"GHSS Kangayampalayam","district":"Tiruppur District, Tamil Nadu","board":"Tamil Nadu State Board","medium":"Tamil & English Medium","established":1926}


@router.get("/dashboards/admin")
def admin_dashboard(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    return {"school":public_school_profile(),"class_count":db.query(func.count(AcademicClass.id)).filter_by(is_active=True).scalar(),"teacher_count":db.query(func.count(Teacher.id)).join(Account).filter(Account.is_active.is_(True)).scalar(),"student_count":db.query(func.count(Student.id)).join(Account).filter(Account.is_active.is_(True)).scalar(),"pending_certificate_requests":db.query(func.count(CertificateRequest.id)).filter_by(status="approved").scalar(),"open_complaint_threads":db.query(func.count(ComplaintThread.id)).scalar(),"recent_notices":db.query(Notice).filter(Notice.published.is_(True),Notice.audience!="class").order_by(Notice.created_at.desc()).limit(5).all()}


@router.get("/timetable/day", summary="Every class's timetable for one weekday (0 = Mon … 4 = Fri), for the HM dashboard")
def school_day_timetable(weekday: int = Query(..., ge=0, le=4), db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    classes=db.query(AcademicClass).filter_by(is_active=True).order_by(AcademicClass.grade,AcademicClass.code).all()
    by_id={c.id:c for c in classes}
    rows=db.query(TimetableEntry).filter(TimetableEntry.weekday==weekday,TimetableEntry.class_id.in_(list(by_id) or [-1])).all()
    names={t.id:t.account.full_name for t in db.query(Teacher).filter(Teacher.id.in_({r.teacher_id for r in rows if r.teacher_id} or {-1})).all()}
    order={c.code:i for i,c in enumerate(classes)}
    entries=[{"class_code":by_id[r.class_id].code,"group_name":by_id[r.class_id].group_name,"medium":by_id[r.class_id].medium,"period":r.period,
              "subject":r.subject,"teacher_name":names.get(r.teacher_id)} for r in rows if r.academic_year==by_id[r.class_id].academic_year]
    entries.sort(key=lambda e:(e["period"],order[e["class_code"]]))
    return {"weekday":weekday,"class_count":len(classes),"entries":entries}


@router.get("/dashboards/teacher")
def teacher_dashboard(class_code: str | None = None, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    """`class_code` picks which of the teacher's classes the stats are for (defaults to their first class)."""
    teacher=teacher_profile(db,account); classes=assigned_classes(db,teacher)
    cls=assigned_class(db,teacher,class_code) or (classes[0] if classes else None)
    pending=0; count=0
    if cls:
        ids=[s.id for s in class_students(db,cls).all()]; count=len(ids)
        pending=db.query(func.count(CertificateRequest.id)).filter(CertificateRequest.student_id.in_(ids),CertificateRequest.status=="pending").scalar() if ids else 0
    subject_rows=(db.query(SubjectTeacherAssignment,AcademicClass).join(AcademicClass,AcademicClass.id==SubjectTeacherAssignment.class_id)
                  .filter(SubjectTeacherAssignment.teacher_id==teacher.id,SubjectTeacherAssignment.academic_year==AcademicClass.academic_year)
                  .order_by(AcademicClass.grade,AcademicClass.code,SubjectTeacherAssignment.subject).all())
    return {"teacher_id":teacher.id,"full_name":account.full_name,"subject":teacher.subject,"class_code":cls.code if cls else None,
            "classes":[{"code":c.code,"grade":c.grade,"section":c.section,"group_name":c.group_name,"medium":c.medium,"strength":c.strength} for c in classes],
            "subject_classes":[{"code":c.code,"subject":a.subject,"group_name":c.group_name,"medium":c.medium} for a,c in subject_rows],
            "student_count":count,"strength":cls.strength if cls else None,"pending_certificate_requests":pending,"timetable":my_teacher_timetable(db,account)}


@router.get("/dashboards/student")
def student_dashboard(db: Session = Depends(get_db), account: Account = Depends(require_roles("student"))):
    student=student_profile(db,account); cls=student.school_class
    notices=db.query(Notice).filter(Notice.published.is_(True),((Notice.class_id==cls.id)|(Notice.class_id.is_(None)&Notice.audience.in_(["all","students","website"])))) .order_by(Notice.created_at.desc()).limit(10).all()
    # Class teacher first, then subject teachers. Phone numbers are not shared with students.
    staff={}
    for link in db.query(ClassTeacherAssignment).filter_by(class_id=cls.id,academic_year=cls.academic_year).all():
        t=db.get(Teacher,link.teacher_id)
        if t: staff[t.id]={"teacher_id":t.id,"teacher_name":t.account.full_name,"subjects":[],"is_class_teacher":True}
    for a in db.query(SubjectTeacherAssignment).filter_by(class_id=cls.id,academic_year=cls.academic_year).order_by(SubjectTeacherAssignment.subject).all():
        t=db.get(Teacher,a.teacher_id)
        if not t: continue
        entry=staff.setdefault(t.id,{"teacher_id":t.id,"teacher_name":t.account.full_name,"subjects":[],"is_class_teacher":False})
        entry["subjects"].append(a.subject)
    # Same subject order as the class's report card (Tamil, English, ...); unknown subjects go last.
    order={sub:i for i,sub in enumerate(subjects_for_class(cls))}
    for e in staff.values(): e["subjects"].sort(key=lambda sub:order.get(sub,len(order)))
    rank=lambda e:min((order.get(sub,len(order)) for sub in e["subjects"]),default=len(order)+1)
    teachers=sorted(staff.values(),key=lambda e:(not e["is_class_teacher"],rank(e),e["teacher_name"]))
    return {"student_id":student.id,"full_name":account.full_name,"registration_no":student.registration_no,"class_code":cls.code,"notices":notices_out(db,notices),"subject_teachers":teachers,"certificate_requests":db.query(CertificateRequest).filter_by(student_id=student.id).order_by(CertificateRequest.created_at.desc()).all()}


@router.get("/students/me/profile")
def my_student_profile(db: Session = Depends(get_db), account: Account = Depends(require_roles("student"))):
    return get_student(student_profile(db,account).id,db,account)


@router.patch("/students/me/profile", summary="Student edits their own DOB, blood group, parent names and address")
def update_my_student_profile(data: StudentSelfUpdate, db: Session = Depends(get_db), account: Account = Depends(require_roles("student"))):
    student=student_profile(db,account)
    # Only the fields in StudentSelfUpdate can change here; blank strings clear a field.
    for key,value in data.model_dump(exclude_unset=True).items():
        setattr(student,key,(value.strip() or None) if isinstance(value,str) else value)
    db.commit(); db.refresh(student)
    return student_detail(student)


@router.post("/public/contact", status_code=202)
def contact_school(data: PublicContactIn, db: Session = Depends(get_db)):
    db.add(ContactMessage(name=data.name,email=data.email,phone=data.phone,subject=data.subject,message=data.message)); db.commit()
    return {"accepted":True,"message":"Your message has been received. The school office will follow up."}


@router.get("/contact-messages")
def contact_messages(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    return db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()


@router.get("/public/pages")
def public_page_index():
    """Public React page keys based on the reference mockup; presentation/content may remain in the frontend."""
    return {"pages":["home","about","hm-profile","academics","achievements","facilities","events","notices","contact","gallery","photo-gallery","student-council","centenary"],"data_endpoints":{"notices":"/api/v1/notices","events":"/api/v1/events","gallery":"/api/v1/gallery","school":"/api/v1/public/school"}}


@router.get("/public/classes")
def public_classes(db: Session = Depends(get_db)):
    return [{"code":c.code,"grade":c.grade,"section":c.section,"group_name":c.group_name,"academic_year":c.academic_year} for c in db.query(AcademicClass).filter_by(is_active=True).order_by(AcademicClass.grade,AcademicClass.code).all()]


@router.get("/classes/{class_code}/subjects")
def class_subjects(class_code: str, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    cls=get_class(db,class_code)
    if not can_access_class(db,account,cls): raise HTTPException(403,"Class access denied")
    return {"class_code":cls.code,"subjects":subjects_for_class(cls)}


@router.get("/classes/{class_code}/mark-scheme", summary="Exam terms and per-subject mark components for a class")
def class_mark_scheme(class_code: str, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    cls=get_class(db,class_code)
    if not can_access_class(db,account,cls): raise HTTPException(403,"Class access denied")
    return class_scheme(cls)


@router.get("/classes/{class_code}/exams/{term}/attendance", summary="An exam's working days and each student's present days (typed on Enter Marks)")
def get_exam_attendance(class_code: str, term: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = get_class(db, class_code)
    if not can_access_class(db, account, cls): raise HTTPException(403, "Class access denied")
    if term not in terms_for_grade(cls.grade): raise HTTPException(422, f"'{term}' is not an exam for class {cls.code}")
    assessment = term_assessment(db, cls, term)
    return {"class_code": cls.code, "term": term, "working_days": assessment.working_days if assessment else None,
            "present_days": (assessment.present_days or {}) if assessment else {}}


@router.get("/reports/school")
def school_report(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    return {"class_count":db.query(func.count(AcademicClass.id)).filter_by(is_active=True).scalar(),"teacher_count":db.query(func.count(Teacher.id)).join(Account).filter(Account.is_active.is_(True)).scalar(),"student_count":db.query(func.count(Student.id)).join(Account).filter(Account.is_active.is_(True)).scalar(),"assessment_count":db.query(func.count(Assessment.id)).scalar(),"attendance_month_count":db.query(func.count(AttendanceMonth.id)).scalar()}


@router.get("/reports/consolidated")
def consolidated_report(term: str = Query(...), academic_year: str | None = None, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    """Deep exam-analysis view: enrollment/result summary, subject stats, distribution histograms, section comparison, top rank holders."""
    PASS_MARK = 35
    empty = {"term":term,"academic_year":academic_year,"enrollment_summary":[],"subject_stats":[],"marks_distribution":[],"subjects_failed_histogram":[],"section_comparison":[],"top_rank_holders":[]}

    # Default to the running year, so the same exam name from an earlier year isn't mixed in.
    academic_year = academic_year or current_academic_year(db)
    assess_q = db.query(Assessment).filter_by(term=term, academic_year=academic_year)
    assessments = assess_q.all()
    if not assessments: return empty
    assess_ids = [a.id for a in assessments]
    assess_by_class = {a.class_id: a for a in assessments}

    marks = db.query(Mark).filter(Mark.assessment_id.in_(assess_ids)).all()
    if not marks: return empty
    by_student = defaultdict(list)
    for m in marks: by_student[m.student_id].append(m)

    students = db.query(Student).filter(Student.id.in_(by_student.keys())).all()
    student_map = {s.id: s for s in students}

    student_totals = {}
    for sid, ms in by_student.items():
        total = sum(m.score for m in ms); maximum = sum(m.maximum_score for m in ms)
        failed = sum(1 for m in ms if not m.absent and not mark_passed(m.score, m.maximum_score, False, m.components))
        student_totals[sid] = {"total": total, "maximum": maximum, "percentage": round(total*100/maximum, 2) if maximum else 0.0, "failed_subjects": failed}

    # Enrollment & result summary, by medium x gender (roll = every currently enrolled student, not just this term's assessed classes)
    enrollment = defaultdict(lambda: {"roll": 0, "appeared": 0, "passed": 0})
    for s in db.query(Student).filter(Student.status == "active").all():
        enrollment[(s.medium or "Unspecified", s.gender or "Unspecified")]["roll"] += 1
    for sid, totals in student_totals.items():
        s = student_map.get(sid)
        if not s: continue
        key = (s.medium or "Unspecified", s.gender or "Unspecified")
        enrollment[key]["appeared"] += 1
        if totals["percentage"] >= PASS_MARK: enrollment[key]["passed"] += 1
    enrollment_summary = [
        {"medium": k[0], "gender": k[1], "roll": v["roll"], "appeared": v["appeared"], "passed": v["passed"],
         "pass_percent": round(v["passed"]*100/v["appeared"], 2) if v["appeared"] else None}
        for k, v in sorted(enrollment.items())
    ]

    # Subject-wise stats (non-absent scores only)
    by_subject = defaultdict(list)
    for m in marks:
        if not m.absent: by_subject[m.subject].append((m.score, mark_passed(m.score, m.maximum_score, False, m.components)))
    subject_stats = [
        {"subject": subj, "max": max(sc for sc, _ in vals), "min": min(sc for sc, _ in vals), "average": round(sum(sc for sc, _ in vals)/len(vals), 2),
         "pass_percent": round(sum(1 for _, ok in vals if ok)*100/len(vals), 2)}
        for subj, vals in sorted(by_subject.items())
    ]

    # Marks distribution: 10 equal bins over each student's overall percentage
    bins = [0]*10
    for totals in student_totals.values():
        bins[min(int(totals["percentage"]//10), 9)] += 1
    marks_distribution = [{"range": f"{i*10}-{i*10+10}", "count": bins[i]} for i in range(10)]

    # Subjects-failed histogram, split by gender (0, 1, 2, 3+)
    failed_hist = defaultdict(lambda: {"male": 0, "female": 0, "other": 0})
    for sid, totals in student_totals.items():
        s = student_map.get(sid)
        if not s: continue
        bucket = totals["failed_subjects"] if totals["failed_subjects"] < 3 else "3+"
        gender = (s.gender or "").lower()
        gkey = "male" if gender == "male" else "female" if gender == "female" else "other"
        failed_hist[bucket][gkey] += 1
    subjects_failed_histogram = [{"failed_count": k, **v} for k, v in sorted(failed_hist.items(), key=lambda kv: (isinstance(kv[0], str), kv[0]))]

    # Section comparison: classes sharing a grade, e.g. 6A vs 6B
    class_avg = {}
    for cls in db.query(AcademicClass).all():
        if cls.id not in assess_by_class: continue
        percentages = [student_totals[s.id]["percentage"] for s in students if s.class_id == cls.id and s.id in student_totals]
        if percentages: class_avg[cls.code] = {"grade": cls.grade, "average_percent": round(sum(percentages)/len(percentages), 2)}
    by_grade = defaultdict(list)
    for code, info in class_avg.items():
        by_grade[info["grade"]].append({"class_code": code, "average_percent": info["average_percent"]})
    section_comparison = []
    for grade, sections in sorted(by_grade.items()):
        if len(sections) < 2: continue
        higher = max(sections, key=lambda sec: sec["average_percent"])
        section_comparison.append({"grade": grade, "sections": sorted(sections, key=lambda sec: sec["class_code"]), "higher": higher["class_code"]})

    # Top 3 rank holders school-wide, with full per-subject marks
    ranked = sorted(student_totals.items(), key=lambda kv: kv[1]["percentage"], reverse=True)[:3]
    top_rank_holders = [
        {"student_id": sid, "name": student_map[sid].account.full_name, "registration_no": student_map[sid].registration_no,
         "class_code": student_map[sid].school_class.code, "percentage": totals["percentage"],
         "marks": [{"subject": m.subject, "score": m.score, "max": m.maximum_score} for m in by_student[sid]]}
        for sid, totals in ranked
    ]

    return {"term": term, "academic_year": academic_year, "enrollment_summary": enrollment_summary,
            "subject_stats": subject_stats, "marks_distribution": marks_distribution,
            "subjects_failed_histogram": subjects_failed_histogram, "section_comparison": section_comparison,
            "top_rank_holders": top_rank_holders}
