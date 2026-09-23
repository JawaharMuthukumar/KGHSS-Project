from datetime import date, datetime
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
from app.models.entities import (Account, AcademicClass, Teacher, Student, ClassTeacherAssignment,
    SubjectTeacherAssignment, Assessment, Mark, AttendanceMonth, AttendanceRecord, TimetableEntry,
    Notice, CertificateRequest, ComplaintThread, ComplaintMessage, SchoolEvent, GalleryItem, ContactMessage)
from app.schemas.common import (ClassIn, ClassTeacherIn, SubjectTeacherIn, TeacherCreate, TeacherUpdate,
    StudentCreate, MarksIn, AttendanceIn, TimetableIn, NoticeIn, CertificateIn, DecisionIn,
    ComplaintMessageIn, EventIn, GalleryIn, PublicContactIn)

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
    payload = data.model_dump(exclude={"password", "class_code", "registration_no"})
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
def save_class_marks(class_code: str, term: str, data: MarksIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = get_class(db, class_code); students = db.query(Student).filter_by(class_id=cls.id).all()
    teacher_or_admin(account, db, cls)
    assessment = db.query(Assessment).filter_by(class_id=cls.id, term=term, academic_year=data.academic_year).first()
    if not assessment:
        assessment = Assessment(class_id=cls.id, term=term, academic_year=data.academic_year); db.add(assessment); db.flush()
    saved = 0
    for student in students:
        values = data.students.get(str(student.id), {})
        for subject, value in values.items():
            teacher_or_admin(account, db, cls, subject)
            score = int(value.get("score", 0)); maximum = int(value.get("max", 100)); absent = bool(value.get("absent", False))
            if maximum < 1 or score < 0 or score > maximum: raise HTTPException(422, f"Invalid score for {subject}")
            mark = db.query(Mark).filter_by(student_id=student.id, assessment_id=assessment.id, subject=subject).first()
            if mark:
                mark.score, mark.maximum_score, mark.absent, mark.entered_by = score, maximum, absent, account.id
            else: db.add(Mark(student_id=student.id, assessment_id=assessment.id, subject=subject, score=score, maximum_score=maximum, absent=absent, entered_by=account.id))
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
    rows = [{"term": a.term, "academic_year": a.academic_year, "subject": m.subject, "score": m.score, "max": m.maximum_score, "absent": m.absent} for m, a in q.order_by(Assessment.created_at, Mark.subject).all()]
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
        rows.append({"student_id":student.id,"registration_no":student.registration_no,"name":student.account.full_name,"marks":[{"subject":m.subject,"score":m.score,"max":m.maximum_score,"absent":m.absent} for m in marks],"total":total,"maximum":maximum,"percentage":round(total*100/maximum,2) if maximum else None})
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
    db.add(ContactMessage(name=data.name,email=data.email,message=data.message)); db.commit()
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
    if cls.grade>=11:
        electives=["Biology"] if cls.group_name=="Bio-Maths" else ["Computer Science"]
        subjects=["Tamil","English",*electives,"Chemistry","Physics","Maths"]
    else: subjects=["Tamil","English","Maths","Science","Social Science"]
    return {"class_code":cls.code,"subjects":subjects}


@router.get("/reports/school")
def school_report(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    return {"class_count":db.query(func.count(AcademicClass.id)).filter_by(is_active=True).scalar(),"teacher_count":db.query(func.count(Teacher.id)).join(Account).filter(Account.is_active.is_(True)).scalar(),"student_count":db.query(func.count(Student.id)).join(Account).filter(Account.is_active.is_(True)).scalar(),"assessment_count":db.query(func.count(Assessment.id)).scalar(),"attendance_month_count":db.query(func.count(AttendanceMonth.id)).scalar()}
