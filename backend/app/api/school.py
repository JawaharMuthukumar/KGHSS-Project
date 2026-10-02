from collections import defaultdict
from datetime import date, datetime, timedelta
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import current_account, require_roles
from app.core.security import hash_password
from app.services.permissions import teacher_profile, student_profile, assigned_class, can_access_class
from app.services.permissions import require_teacher_class_scope
from app.services.mark_scheme import class_scheme, subject_components, subjects_for_class, terms_for_grade
from app.models.entities import (Account, AcademicClass, Teacher, Student, ClassTeacherAssignment,
    SubjectTeacherAssignment, Assessment, Mark, AttendanceMonth, AttendanceRecord, TimetableEntry,
    Notice, CertificateRequest, LeaveRequest, ComplaintThread, ComplaintMessage, SchoolEvent, GalleryItem, ContactMessage)
from app.schemas.common import (ClassIn, ClassTeacherIn, SubjectTeacherIn, TeacherCreate, TeacherUpdate,
    StudentCreate, MarksIn, AttendanceIn, TimetableIn, NoticeIn, NoticeUpdate, CertificateIn, DecisionIn,
    LeaveRequestIn, ComplaintMessageIn, EventIn, EventUpdate, GalleryIn, PublicContactIn)

router = APIRouter(tags=["School"])


def get_class(db: Session, code: str) -> AcademicClass:
    obj = db.query(AcademicClass).filter(AcademicClass.code == code).first()
    if not obj:
        raise HTTPException(404, "Class not found")
    return obj


def teacher_or_admin(account: Account, db: Session, cls: AcademicClass, subject: str | None = None):
    return require_teacher_class_scope(db, account, cls, subject)


# Classes and teacher assignments
@router.get("/classes", summary="List classes and student counts")
def list_classes(db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    result = []
    for cls in db.query(AcademicClass).filter_by(is_active=True).order_by(AcademicClass.grade, AcademicClass.code):
        count = db.query(func.count(Student.id)).filter(Student.class_id == cls.id).scalar()
        ct = db.query(ClassTeacherAssignment).filter_by(class_id=cls.id, academic_year=cls.academic_year).first()
        teacher = db.get(Teacher, ct.teacher_id) if ct else None
        result.append({"id": cls.id, "code": cls.code, "grade": cls.grade, "section": cls.section, "group_name": cls.group_name, "academic_year": cls.academic_year, "student_count": count, "class_teacher_id": teacher.id if teacher else None, "class_teacher_name": teacher.account.full_name if teacher else None})
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


@router.post("/teachers", status_code=201, summary="Create teacher account")
def create_teacher(data: TeacherCreate, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    index=(db.query(func.count(Teacher.id)).scalar() or 0)+101
    employee_id=f"GHSS/T/{index}"
    while db.query(Account).filter_by(username=employee_id).first():
        index+=1; employee_id=f"GHSS/T/{index}"
    account = Account(username=employee_id, role="teacher", full_name=data.full_name, password_hash=hash_password(data.password))
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
        if key == "full_name": teacher.account.full_name = value
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
    old = db.query(ClassTeacherAssignment).filter_by(class_id=cls.id, academic_year=cls.academic_year).first()
    other = db.query(ClassTeacherAssignment).filter_by(teacher_id=teacher.id, academic_year=cls.academic_year).first()
    if other and other.class_id != cls.id:
        db.delete(other); db.flush()
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
    query = db.query(Student)
    if class_code:
        cls = get_class(db, class_code)
        if not can_access_class(db, account, cls): raise HTTPException(403, "Class access denied")
        query = query.filter_by(class_id=cls.id)
    elif account.role == "teacher":
        cls = assigned_class(db, teacher_profile(db, account))
        if not cls: return []
        query = query.filter_by(class_id=cls.id)
    return [{"id": s.id, "registration_no": s.registration_no, "admission_no": s.admission_no, "full_name": s.account.full_name, "class_code": s.school_class.code, "gender": s.gender, "guardian_phone": s.guardian_phone} for s in query.order_by(Student.id).all()]


@router.post("/students", status_code=201)
def create_student(data: StudentCreate, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = get_class(db, data.class_code)
    if account.role == "teacher":
        teacher_or_admin(account, db, cls)
        assigned = assigned_class(db, teacher_profile(db, account))
        if not assigned or assigned.id != cls.id: raise HTTPException(403, "Only the class teacher can enroll students")
    registration = data.registration_no or f"GHSS/{cls.academic_year.split('-')[0]}/{(db.query(func.count(Student.id)).scalar() or 0) + 1:04d}"
    username = registration
    if db.query(Account).filter_by(username=username).first() or db.query(Student).filter_by(registration_no=registration).first(): raise HTTPException(409, "Registration number already exists")
    payload = data.model_dump(exclude={"password", "class_code", "registration_no", "full_name"})
    acc = Account(username=username, role="student", full_name=data.full_name, password_hash=hash_password(data.password))
    db.add(acc); db.flush()
    student = Student(account_id=acc.id, class_id=cls.id, registration_no=registration, **payload)
    db.add(student); db.commit(); db.refresh(student)
    return {"id": student.id, "registration_no": registration, "username": username, "full_name": acc.full_name, "class_code": cls.code}


@router.get("/students/{student_id}")
def get_student(student_id: int, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    student = db.get(Student, student_id)
    if not student: raise HTTPException(404, "Student not found")
    if account.role == "student" and student.account_id != account.id: raise HTTPException(403, "Student record access denied")
    if account.role == "teacher" and not can_access_class(db, account, student.school_class): raise HTTPException(403, "Class access denied")
    return {"id": student.id, "registration_no": student.registration_no, "admission_no": student.admission_no, "emis_no": student.emis_no, "umis_no": student.umis_no, "full_name": student.account.full_name, "class_code": student.school_class.code, "gender": student.gender, "date_of_birth": student.date_of_birth, "community": student.community, "medium": student.medium, "blood_group": student.blood_group, "father_name": student.father_name, "mother_name": student.mother_name, "guardian_phone": student.guardian_phone, "address": student.address}


# Marks, scorecards, and result analysis
@router.put("/classes/{class_code}/marks/{term}")
def save_class_marks(class_code: str, term: str, data: MarksIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    cls = get_class(db, class_code); students = db.query(Student).filter_by(class_id=cls.id).all()
    teacher_or_admin(account, db, cls)
    if term not in terms_for_grade(cls.grade): raise HTTPException(422, f"'{term}' is not an exam for class {cls.code}")
    subjects = set(subjects_for_class(cls))
    assessment = db.query(Assessment).filter_by(class_id=cls.id, term=term, academic_year=data.academic_year).first()
    if not assessment:
        assessment = Assessment(class_id=cls.id, term=term, academic_year=data.academic_year); db.add(assessment); db.flush()
    saved = 0
    for student in students:
        values = data.students.get(str(student.id), {})
        for subject, value in values.items():
            if subject not in subjects: raise HTTPException(422, f"{subject} is not a subject for class {cls.code}")
            teacher_or_admin(account, db, cls, subject)
            scheme = subject_components(cls.grade, subject)
            absent = bool(value.get("absent", False)); entered = value.get("components") or {}
            components = {}
            if not absent:
                for key, label, limit in scheme:
                    try: points = int(entered.get(key, 0) or 0)
                    except (TypeError, ValueError): raise HTTPException(422, f"Invalid {label} mark for {subject}")
                    if points < 0 or points > limit: raise HTTPException(422, f"{subject} {label} must be between 0 and {limit}")
                    components[key] = points
            score = sum(components.values()); maximum = sum(limit for _, _, limit in scheme)
            mark = db.query(Mark).filter_by(student_id=student.id, assessment_id=assessment.id, subject=subject).first()
            if mark:
                mark.score, mark.maximum_score, mark.absent, mark.components, mark.entered_by = score, maximum, absent, components, account.id
            else: db.add(Mark(student_id=student.id, assessment_id=assessment.id, subject=subject, score=score, maximum_score=maximum, absent=absent, components=components, entered_by=account.id))
            saved += 1
    db.commit(); return {"class_code": cls.code, "term": term, "saved_marks": saved}


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
    if not can_access_class(db, account, cls): raise HTTPException(403, "Class access denied")
    students = db.query(Student).filter_by(class_id=cls.id).all(); output=[]
    for student in students:
        q = db.query(func.sum(Mark.score), func.sum(Mark.maximum_score)).join(Assessment).filter(Mark.student_id==student.id, Assessment.term==term)
        score, maximum = q.first()
        if maximum: output.append({"student_id": student.id, "registration_no": student.registration_no, "name": student.account.full_name, "score": score, "max": maximum, "percentage": round(score*100/maximum, 2)})
    return sorted(output, key=lambda row: row["percentage"], reverse=True)


@router.get("/classes/{class_code}/mark-report")
def class_mark_report(class_code: str, term: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    """Return each student's subject marks and aggregate, suitable for printable class reports."""
    cls=get_class(db,class_code)
    if not can_access_class(db,account,cls): raise HTTPException(403,"Class access denied")
    assessment=db.query(Assessment).filter_by(class_id=cls.id,term=term,academic_year=cls.academic_year).first()
    if not assessment: return {"class_code":cls.code,"term":term,"students":[]}
    rows=[]
    for student in db.query(Student).filter_by(class_id=cls.id).order_by(Student.id).all():
        marks=db.query(Mark).filter_by(student_id=student.id,assessment_id=assessment.id).order_by(Mark.subject).all()
        maximum=sum(m.maximum_score for m in marks); total=sum(m.score for m in marks)
        rows.append({"student_id":student.id,"registration_no":student.registration_no,"name":student.account.full_name,"marks":[{"subject":m.subject,"score":m.score,"max":m.maximum_score,"absent":m.absent,"components":m.components or {}} for m in marks],"total":total,"maximum":maximum,"percentage":round(total*100/maximum,2) if maximum else None})
    return {"class_code":cls.code,"term":term,"students":rows}


@router.get("/reports/results")
def results_report(term: str = Query(...), academic_year: str | None = None, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    q = db.query(AcademicClass)
    output=[]
    for cls in q.all():
        assess = db.query(Assessment).filter_by(class_id=cls.id, term=term)
        if academic_year: assess=assess.filter_by(academic_year=academic_year)
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
        if not db.query(ClassTeacherAssignment).filter_by(class_id=cls.id,teacher_id=teacher.id).first(): raise HTTPException(403,"Only the class teacher may take attendance")
    record=db.query(AttendanceMonth).filter_by(class_id=cls.id,month=data.month).first()
    if record and record.locked: raise HTTPException(409,"Attendance month is locked; ask an admin to unlock it")
    students={s.id for s in db.query(Student).filter_by(class_id=cls.id).all()}
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
    q=db.query(AttendanceMonth).filter_by(class_id=cls.id)
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
    for cls in db.query(AcademicClass).all():
        q=db.query(AttendanceMonth).filter_by(class_id=cls.id)
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
    entries=db.query(TimetableEntry).filter_by(teacher_id=teacher.id).order_by(TimetableEntry.weekday,TimetableEntry.period).all()
    return [{"class_code":db.get(AcademicClass,e.class_id).code,"weekday":e.weekday,"period":e.period,"subject":e.subject,"room":e.room,"academic_year":e.academic_year} for e in entries]


@router.get("/teachers/{teacher_id}/timetable")
def teacher_timetable_by_id(teacher_id: int, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    """Read-only view of one teacher's aggregated weekly schedule across every class they teach."""
    teacher=db.get(Teacher,teacher_id)
    if not teacher: raise HTTPException(404,"Teacher not found")
    entries=db.query(TimetableEntry).filter_by(teacher_id=teacher.id).order_by(TimetableEntry.weekday,TimetableEntry.period).all()
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
        mine=teacher_profile(db,account); assigned=assigned_class(db,mine)
        if not assigned or assigned.id!=cls.id: raise HTTPException(403,"Only the class teacher may edit this timetable")
    db.query(TimetableEntry).filter_by(class_id=cls.id,academic_year=data.academic_year).delete()
    db.add_all([TimetableEntry(class_id=cls.id,teacher_id=e.teacher_id,weekday=e.weekday,period=e.period,subject=e.subject,room=e.room,academic_year=data.academic_year) for e in data.entries])
    db.commit(); return {"class_code":cls.code,"entries_saved":len(data.entries)}


# Notices and class notices
@router.get("/notices")
def list_notices(db: Session = Depends(get_db)):
    """Publicly published website announcements only."""
    return db.query(Notice).filter_by(published=True,audience="website").order_by(Notice.created_at.desc()).all()


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
    return query.order_by(Notice.created_at.desc()).all()


@router.get("/classes/{class_code}/notices")
def class_notices(class_code: str, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    cls=get_class(db,class_code)
    if not can_access_class(db,account,cls): raise HTTPException(403,"Class access denied")
    return db.query(Notice).filter_by(class_id=cls.id,published=True).order_by(Notice.created_at.desc()).all()


@router.post("/notices", status_code=201)
def create_notice(data: NoticeIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    if data.audience not in {"website","all","students","teachers"}: raise HTTPException(422,"Invalid notice audience")
    cls=get_class(db,data.class_code) if data.class_code else None
    if account.role=="teacher":
        if not cls: raise HTTPException(422,"Teachers must scope notices to a class")
        teacher_or_admin(account,db,cls)
        data.audience="class"
    notice=Notice(title=data.title,body=data.body,audience=data.audience,class_id=cls.id if cls else None,author_id=account.id)
    db.add(notice); db.commit(); db.refresh(notice); return notice


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
    db.add(req); db.commit(); db.refresh(req); return req


@router.get("/certificates/requests")
def certificate_requests(db: Session = Depends(get_db), account: Account = Depends(current_account)):
    q=db.query(CertificateRequest)
    if account.role=="student": q=q.filter_by(student_id=student_profile(db,account).id)
    elif account.role=="teacher":
        cls=assigned_class(db,teacher_profile(db,account))
        if not cls: return []
        ids=[s.id for s in db.query(Student).filter_by(class_id=cls.id).all()]; q=q.filter(CertificateRequest.student_id.in_(ids))
    return q.order_by(CertificateRequest.created_at.desc()).all()


@router.patch("/certificates/requests/{request_id}")
def decide_certificate(request_id: int, data: DecisionIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    req=db.get(CertificateRequest,request_id)
    if not req: raise HTTPException(404,"Certificate request not found")
    if account.role=="teacher":
        student=db.get(Student,req.student_id); cls=student.school_class
        teacher=teacher_profile(db,account)
        if not db.query(ClassTeacherAssignment).filter_by(class_id=cls.id,teacher_id=teacher.id).first(): raise HTTPException(403,"Only the assigned class teacher may decide this request")
    if req.status!="pending": raise HTTPException(409,"Request has already been decided")
    req.status="approved" if data.approve else "rejected"; req.decision_by=account.id; req.decision_note=data.note; req.decided_at=datetime.utcnow()
    db.commit(); return req


# Leave requests: student -> class teacher, teacher -> admin (HM)
LEAVE_TYPES = {"student": {"normal", "od"}, "teacher": {"personal", "sick", "od"}}


def leave_days_by_month(start: date, end: date) -> dict[str, int]:
    """Working days (Mon-Fri) in [start, end], grouped by YYYY-MM."""
    days: dict[str, int] = defaultdict(int); day = start
    while day <= end:
        if day.weekday() < 5: days[day.strftime("%Y-%m")] += 1
        day += timedelta(days=1)
    return dict(days)


def leave_out(db: Session, req: LeaveRequest) -> dict:
    applicant = db.get(Account, req.applicant_id); cls = db.get(AcademicClass, req.class_id) if req.class_id else None
    return {"id": req.id, "applicant_role": req.applicant_role, "applicant_name": applicant.full_name, "applicant_username": applicant.username,
            "class_code": cls.code if cls else None, "leave_type": req.leave_type, "from_date": req.from_date, "to_date": req.to_date,
            "days": req.days, "reason": req.reason, "status": req.status, "decision_note": req.decision_note,
            "created_at": req.created_at, "decided_at": req.decided_at}


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
    db.add(req); db.commit(); db.refresh(req); return leave_out(db, req)


@router.get("/leave-requests", summary="scope=mine for own requests, scope=review for requests awaiting your decision")
def list_leave_requests(scope: str = Query("mine", pattern="^(mine|review)$"), db: Session = Depends(get_db), account: Account = Depends(current_account)):
    q = db.query(LeaveRequest)
    if scope == "mine" or account.role == "student": q = q.filter_by(applicant_id=account.id)
    elif account.role == "teacher":
        cls = assigned_class(db, teacher_profile(db, account))
        if not cls: return []
        q = q.filter_by(applicant_role="student", class_id=cls.id)
    else: q = q.filter_by(applicant_role="teacher")
    return [leave_out(db, r) for r in q.order_by(LeaveRequest.created_at.desc()).all()]


@router.patch("/leave-requests/{request_id}")
def decide_leave(request_id: int, data: DecisionIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    req = db.get(LeaveRequest, request_id)
    if not req: raise HTTPException(404, "Leave request not found")
    if req.applicant_role == "teacher" and account.role != "admin": raise HTTPException(403, "Only the HM may decide teacher leave")
    if req.applicant_role == "student":
        if account.role != "teacher": raise HTTPException(403, "Student leave is decided by the class teacher")
        if not db.query(ClassTeacherAssignment).filter_by(class_id=req.class_id, teacher_id=teacher_profile(db, account).id).first():
            raise HTTPException(403, "Only the assigned class teacher may decide this request")
    if req.status != "pending": raise HTTPException(409, "Request has already been decided")
    req.status = "approved" if data.approve else "rejected"; req.decision_by = account.id; req.decision_note = data.note; req.decided_at = datetime.utcnow()
    if req.status == "approved" and req.applicant_role == "student" and req.leave_type == "normal": mark_leave_absent(db, req)
    db.commit(); return leave_out(db, req)


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
def download_certificate(request_id: int, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    req=db.get(CertificateRequest,request_id)
    if not req: raise HTTPException(404,"Certificate request not found")
    student=db.get(Student,req.student_id)
    if account.role=="student" and student.account_id!=account.id: raise HTTPException(403,"Certificate access denied")
    if account.role=="teacher" and not can_access_class(db,account,student.school_class): raise HTTPException(403,"Class access denied")
    if account.role not in {"student","teacher","admin"}: raise HTTPException(403,"Certificate access denied")
    if req.status!="approved": raise HTTPException(409,"Only approved requests can be downloaded")
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
    except ImportError as exc:
        raise HTTPException(503,"PDF generation dependency is unavailable") from exc
    output=BytesIO(); pdf=canvas.Canvas(output,pagesize=A4); width,height=A4
    pdf.setTitle(f"{req.certificate_type.title()} Certificate")
    pdf.setFont("Helvetica-Bold",18); pdf.drawCentredString(width/2,height-110,"GOVERNMENT HIGHER SECONDARY SCHOOL")
    pdf.setFont("Helvetica",12); pdf.drawCentredString(width/2,height-135,"Kangayampalayam, Tiruppur District, Tamil Nadu")
    pdf.setFont("Helvetica-Bold",20); pdf.drawCentredString(width/2,height-205,f"{req.certificate_type.title()} Certificate")
    pdf.setFont("Helvetica",12); pdf.drawString(75,height-275,"This is to certify that")
    pdf.setFont("Helvetica-Bold",15); pdf.drawString(75,height-305,student.account.full_name)
    pdf.setFont("Helvetica",12); pdf.drawString(75,height-335,f"Registration No: {student.registration_no}")
    pdf.drawString(75,height-357,f"Class: {student.school_class.code}")
    pdf.drawString(75,height-415,"This certificate is issued by the school upon approval.")
    pdf.drawString(75,100,"Headmaster")
    pdf.save(); output.seek(0)
    req.downloaded_at=datetime.utcnow(); db.commit()
    return StreamingResponse(output,media_type="application/pdf",headers={"Content-Disposition":f'attachment; filename="certificate-{request_id}.pdf"'})


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
    return db.query(SchoolEvent).filter_by(is_published=True).order_by(SchoolEvent.event_date.desc()).all()


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


@router.get("/public/school")
def public_school_profile():
    return {"name":"Government Higher Secondary School, Kangayampalayam","short_name":"GHSS Kangayampalayam","district":"Tiruppur District, Tamil Nadu","board":"Tamil Nadu State Board","medium":"Tamil & English Medium","established":1926}


@router.get("/dashboards/admin")
def admin_dashboard(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    return {"school":public_school_profile(),"class_count":db.query(func.count(AcademicClass.id)).filter_by(is_active=True).scalar(),"teacher_count":db.query(func.count(Teacher.id)).join(Account).filter(Account.is_active.is_(True)).scalar(),"student_count":db.query(func.count(Student.id)).join(Account).filter(Account.is_active.is_(True)).scalar(),"pending_certificate_requests":db.query(func.count(CertificateRequest.id)).filter_by(status="pending").scalar(),"open_complaint_threads":db.query(func.count(ComplaintThread.id)).scalar(),"recent_notices":db.query(Notice).filter_by(published=True).order_by(Notice.created_at.desc()).limit(5).all()}


@router.get("/dashboards/teacher")
def teacher_dashboard(db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    teacher=teacher_profile(db,account); cls=assigned_class(db,teacher)
    pending=0; count=0
    if cls:
        ids=[s.id for s in db.query(Student).filter_by(class_id=cls.id).all()]; count=len(ids)
        pending=db.query(func.count(CertificateRequest.id)).filter(CertificateRequest.student_id.in_(ids),CertificateRequest.status=="pending").scalar() if ids else 0
    return {"teacher_id":teacher.id,"full_name":account.full_name,"subject":teacher.subject,"class_code":cls.code if cls else None,"student_count":count,"pending_certificate_requests":pending,"timetable":my_teacher_timetable(db,account)}


@router.get("/dashboards/student")
def student_dashboard(db: Session = Depends(get_db), account: Account = Depends(require_roles("student"))):
    student=student_profile(db,account); cls=student.school_class
    notices=db.query(Notice).filter(Notice.published.is_(True),((Notice.class_id==cls.id)|(Notice.class_id.is_(None)&Notice.audience.in_(["all","students","website"])))) .order_by(Notice.created_at.desc()).limit(10).all()
    teachers=get_subject_teachers(cls.code,db,account)
    return {"student_id":student.id,"full_name":account.full_name,"registration_no":student.registration_no,"class_code":cls.code,"notices":notices,"subject_teachers":teachers,"certificate_requests":db.query(CertificateRequest).filter_by(student_id=student.id).order_by(CertificateRequest.created_at.desc()).all()}


@router.get("/students/me/profile")
def my_student_profile(db: Session = Depends(get_db), account: Account = Depends(require_roles("student"))):
    return get_student(student_profile(db,account).id,db,account)


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


@router.get("/reports/school")
def school_report(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    return {"class_count":db.query(func.count(AcademicClass.id)).filter_by(is_active=True).scalar(),"teacher_count":db.query(func.count(Teacher.id)).join(Account).filter(Account.is_active.is_(True)).scalar(),"student_count":db.query(func.count(Student.id)).join(Account).filter(Account.is_active.is_(True)).scalar(),"assessment_count":db.query(func.count(Assessment.id)).scalar(),"attendance_month_count":db.query(func.count(AttendanceMonth.id)).scalar()}


@router.get("/reports/consolidated")
def consolidated_report(term: str = Query(...), academic_year: str | None = None, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    """Deep exam-analysis view: enrollment/result summary, subject stats, distribution histograms, section comparison, top rank holders."""
    PASS_MARK = 35
    empty = {"term":term,"academic_year":academic_year,"enrollment_summary":[],"subject_stats":[],"marks_distribution":[],"subjects_failed_histogram":[],"section_comparison":[],"top_rank_holders":[]}

    assess_q = db.query(Assessment).filter_by(term=term)
    if academic_year: assess_q = assess_q.filter_by(academic_year=academic_year)
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
        failed = sum(1 for m in ms if not m.absent and m.score < (m.maximum_score * PASS_MARK / 100))
        student_totals[sid] = {"total": total, "maximum": maximum, "percentage": round(total*100/maximum, 2) if maximum else 0.0, "failed_subjects": failed}

    # Enrollment & result summary, by medium x gender (roll = every currently enrolled student, not just this term's assessed classes)
    enrollment = defaultdict(lambda: {"roll": 0, "appeared": 0, "passed": 0})
    for s in db.query(Student).all():
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
        if not m.absent: by_subject[m.subject].append(m.score)
    subject_stats = [
        {"subject": subj, "max": max(scores), "min": min(scores), "average": round(sum(scores)/len(scores), 2),
         "pass_percent": round(sum(1 for sc in scores if sc >= PASS_MARK)*100/len(scores), 2)}
        for subj, scores in sorted(by_subject.items())
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
