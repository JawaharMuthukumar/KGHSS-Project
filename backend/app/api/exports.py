"""CSV downloads (open directly in Excel; UTF-8 with BOM so Tamil text shows correctly)."""
import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.school import class_mark_report, class_students, get_class, term_assessment, year_months
from app.api.subject_marks import check_class_subject_term, teaches
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.entities import (Account, AcademicClass, AttendanceMonth, AttendanceRecord, ClassTeacherAssignment, Mark,
    Student, SubjectTeacherAssignment, Teacher)
from app.services.mark_scheme import subject_components, subjects_for_class
from app.services.permissions import can_access_class, teacher_profile

router = APIRouter(prefix="/exports", tags=["Downloads"])


def csv_file(name: str, header: list, rows: list[list]) -> Response:
    out = io.StringIO(); w = csv.writer(out)
    w.writerow(header); w.writerows([["" if v is None else v for v in r] for r in rows])
    return Response("﻿" + out.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name.replace(" ", "-")}"'})


def own_class(db: Session, account: Account, class_code: str | None) -> AcademicClass | None:
    """Admin: any class (None = whole school). Teacher: only a class they are class teacher of."""
    cls = get_class(db, class_code) if class_code else None
    if account.role == "teacher":
        if not cls: raise HTTPException(422, "Choose your class")
        if not can_access_class(db, account, cls, allow_subject=False): raise HTTPException(403, "Only your own class can be downloaded")
    return cls


def ordered_classes(db: Session):
    return db.query(AcademicClass).filter_by(is_active=True).order_by(AcademicClass.grade, AcademicClass.code).all()


def class_teacher_of(db: Session, cls: AcademicClass) -> Teacher | None:
    link = db.query(ClassTeacherAssignment).filter_by(class_id=cls.id, academic_year=cls.academic_year).first()
    return db.get(Teacher, link.teacher_id) if link else None


@router.get("/students.csv", summary="Students (one class, or the whole school for the HM)")
def export_students(class_code: str | None = None, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = own_class(db, account, class_code)
    rows = []
    for c in ([cls] if cls else ordered_classes(db)):
        for s in class_students(db, c).order_by(Student.registration_no).all():
            rows.append([s.registration_no, s.admission_no, s.account.full_name, c.code, c.grade, c.section, c.group_name, s.gender,
                         s.date_of_birth, s.community, s.medium or c.medium, s.blood_group, s.father_name, s.mother_name,
                         s.father_phone, s.mother_phone, s.guardian_phone, s.emis_no, s.umis_no, s.address])
    return csv_file(f"students_{cls.code if cls else 'all'}.csv",
                    ["Reg No", "Admission No", "Name", "Class", "Standard", "Section", "Group", "Gender", "Date of Birth", "Community",
                     "Medium", "Blood Group", "Father", "Mother", "Father Phone", "Mother Phone", "Parent Phone (login)", "EMIS No",
                     "UMIS No", "Address"], rows)


@router.get("/teachers.csv", summary="Teachers with their class and subject assignments")
def export_teachers(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    by_class = {c.id: c for c in db.query(AcademicClass)}
    rows = []
    for t in sorted(db.query(Teacher).all(), key=lambda t: t.account.full_name.lower()):
        ct = [by_class[l.class_id].code for l in db.query(ClassTeacherAssignment).filter_by(teacher_id=t.id)
              if l.class_id in by_class and l.academic_year == by_class[l.class_id].academic_year]
        st = [f"{by_class[a.class_id].code} {a.subject}" for a in db.query(SubjectTeacherAssignment).filter_by(teacher_id=t.id)
              if a.class_id in by_class and a.academic_year == by_class[a.class_id].academic_year]
        rows.append([t.account.full_name, t.employee_id, t.subject, t.phone, "Active" if t.account.is_active else "Inactive",
                     ", ".join(sorted(ct)), "; ".join(sorted(st))])
    return csv_file("teachers.csv", ["Name (login)", "Staff ID", "Main Subject", "Phone", "Status", "Class Teacher Of", "Subjects Taught"], rows)


@router.get("/class-teachers.csv", summary="Each class with its class teacher")
def export_class_teachers(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    rows = []
    for c in ordered_classes(db):
        t = class_teacher_of(db, c)
        rows.append([c.code, c.group_name, c.medium, c.strength, class_students(db, c).count(),
                     t.account.full_name if t else "Not assigned", t.phone if t else None])
    return csv_file("class_teachers.csv", ["Class", "Group", "Medium", "Sanctioned Strength", "Students", "Class Teacher", "Phone"], rows)


@router.get("/subject-teachers.csv", summary="Who teaches which subject in each class")
def export_subject_teachers(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    rows = []
    for c in ordered_classes(db):
        for a in db.query(SubjectTeacherAssignment).filter_by(class_id=c.id, academic_year=c.academic_year).order_by(SubjectTeacherAssignment.subject):
            t = db.get(Teacher, a.teacher_id)
            rows.append([c.code, a.subject, t.account.full_name if t else None, t.phone if t else None])
    return csv_file("subject_teachers.csv", ["Class", "Subject", "Teacher", "Phone"], rows)


@router.get("/attendance.csv", summary="School attendance summary (HM), or one class's monthly attendance per student")
def export_attendance(class_code: str | None = None, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = own_class(db, account, class_code)
    if not cls:  # school-wide summary
        rows = []
        for c in ordered_classes(db):
            first, last = year_months(c.academic_year)
            months = db.query(AttendanceMonth).filter(AttendanceMonth.class_id == c.id, AttendanceMonth.month >= first, AttendanceMonth.month <= last).all()
            rates = []
            for m in months:
                recs = db.query(AttendanceRecord).filter_by(attendance_month_id=m.id).all()
                if recs and m.total_days: rates.append(sum(r.present_days for r in recs) * 100 / (m.total_days * len(recs)))
            rows.append([c.code, len(months), round(sum(rates) / len(rates), 2) if rates else None])
        return csv_file("attendance_school.csv", ["Class", "Months Marked", "Average %"], rows)

    first, last = year_months(cls.academic_year)
    months = (db.query(AttendanceMonth).filter(AttendanceMonth.class_id == cls.id, AttendanceMonth.month >= first, AttendanceMonth.month <= last)
              .order_by(AttendanceMonth.month).all())
    present = {(r.attendance_month_id, r.student_id): r.present_days
               for r in db.query(AttendanceRecord).filter(AttendanceRecord.attendance_month_id.in_([m.id for m in months] or [-1]))}
    label = lambda m: date(int(m.month[:4]), int(m.month[5:7]), 1).strftime("%b %Y")
    rows = []
    for s in class_students(db, cls).order_by(Student.registration_no).all():
        days = [present.get((m.id, s.id)) for m in months]
        got = sum(d for d in days if d is not None); total = sum(m.total_days for m, d in zip(months, days) if d is not None)
        rows.append([s.registration_no, s.account.full_name, cls.code,
                     *(f"{d}/{m.total_days}" if d is not None else "" for m, d in zip(months, days)),
                     got, total, round(got * 100 / total, 2) if total else None])
    return csv_file(f"attendance_{cls.code}.csv",
                    ["Reg No", "Name", "Class", *(label(m) for m in months), "Days Present", "Working Days", "Attendance %"], rows)


@router.get("/mark-report.csv", summary="Class mark report for one exam: every subject per student")
def export_mark_report(class_code: str, term: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = own_class(db, account, class_code)
    report = class_mark_report(class_code, term, db, account)
    # Every subject of the class, even before any marks are entered (plus any extra subject that has marks).
    subjects = [*subjects_for_class(cls), *(x for x in report["subjects"] if x not in subjects_for_class(cls))]
    rows = []
    for r in report["students"]:
        by = {m["subject"]: m for m in r["marks"]}
        failed = any(not m["absent"] and m["score"] < m["max"] * 35 / 100 for m in r["marks"])
        rows.append([r["registration_no"], r["name"], cls.code, cls.section, cls.group_name,
                     *("AB" if by.get(s, {}).get("absent") else by.get(s, {}).get("score") for s in subjects),
                     r["total"], r["maximum"], r["percentage"], ("Fail" if failed else "Pass") if r["marks"] else None])
    return csv_file(f"{cls.code}_{term}_mark_report.csv",
                    ["Reg No", "Name", "Class", "Section", "Group", *subjects, "Total", "Max", "%", "Result"], rows)


@router.get("/subject-marks.csv", summary="One subject's saved marks for a class (subject teacher, class teacher or HM)")
def export_subject_marks(class_code: str, term: str, subject: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = get_class(db, class_code); check_class_subject_term(cls, subject, term)
    if account.role == "teacher" and not teaches(db, teacher_profile(db, account), cls, subject):
        raise HTTPException(403, f"You don't teach {subject} in {cls.code}")
    scheme = subject_components(cls, subject)
    assessment = term_assessment(db, cls, term)
    marks = {m.student_id: m for m in db.query(Mark).filter_by(assessment_id=assessment.id, subject=subject)} if assessment else {}
    rows = []
    for s in class_students(db, cls).order_by(Student.registration_no).all():
        m = marks.get(s.id)
        comps = [(m.components or {}).get(k) for k, _, _ in scheme] if m and not m.absent else [None] * len(scheme)
        rows.append([s.registration_no, s.account.full_name, cls.code, cls.section, subject, *comps,
                     None if not m or m.absent else m.score, "AB" if m and m.absent else None])
    return csv_file(f"{cls.code}_{subject}_{term}.csv",
                    ["Reg No", "Name", "Class", "Section", "Subject", *(f"{label} (/{mx})" for _, label, mx in scheme), "Total", "Absent"], rows)
