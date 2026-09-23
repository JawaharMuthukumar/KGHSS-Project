"""School-scope authorization rules shared by API controllers."""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.entities import Account, AcademicClass, Teacher, Student, ClassTeacherAssignment, SubjectTeacherAssignment


def teacher_profile(db: Session, account: Account) -> Teacher:
    teacher = db.query(Teacher).filter(Teacher.account_id == account.id).first()
    if not teacher:
        raise HTTPException(403, "Teacher profile is not configured")
    return teacher


def student_profile(db: Session, account: Account) -> Student:
    student = db.query(Student).filter(Student.account_id == account.id).first()
    if not student:
        raise HTTPException(403, "Student profile is not configured")
    return student


def assigned_class(db: Session, teacher: Teacher) -> AcademicClass | None:
    row = db.query(ClassTeacherAssignment, AcademicClass).join(AcademicClass, AcademicClass.id == ClassTeacherAssignment.class_id).filter(ClassTeacherAssignment.teacher_id == teacher.id, ClassTeacherAssignment.academic_year == AcademicClass.academic_year).first()
    return row[1] if row else None


def can_access_class(db: Session, account: Account, cls: AcademicClass, *, allow_subject: bool = True) -> bool:
    if account.role == "admin":
        return True
    if account.role == "student":
        return student_profile(db, account).class_id == cls.id
    if account.role == "teacher":
        teacher = teacher_profile(db, account)
        class_assignment = db.query(ClassTeacherAssignment).filter_by(class_id=cls.id, teacher_id=teacher.id, academic_year=cls.academic_year).first()
        subject_assignment = db.query(SubjectTeacherAssignment).filter_by(class_id=cls.id, teacher_id=teacher.id, academic_year=cls.academic_year).first() if allow_subject else None
        return bool(class_assignment or subject_assignment)
    return False


def require_teacher_class_scope(db: Session, account: Account, cls: AcademicClass, subject: str | None = None):
    if account.role == "admin":
        return
    if account.role != "teacher":
        raise HTTPException(403, "Teacher or admin access required")
    teacher = teacher_profile(db, account)
    class_assignment = db.query(ClassTeacherAssignment).filter_by(class_id=cls.id, teacher_id=teacher.id, academic_year=cls.academic_year).first()
    subject_query = db.query(SubjectTeacherAssignment).filter_by(class_id=cls.id, teacher_id=teacher.id, academic_year=cls.academic_year)
    if subject:
        subject_query = subject_query.filter_by(subject=subject)
    if not class_assignment and not subject_query.first():
        raise HTTPException(403, "You are not assigned to this class/subject")
