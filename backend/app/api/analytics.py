"""HM's results analytics: the whole school or one class for one exam, plus the exam-to-exam trend of the year.

A student "appeared" when they have at least one written (non-absent) mark; they "passed" when they appeared, were
absent in no subject and scored at least 35% of every subject's maximum (the same rule as the class term report).
"""
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.school import current_academic_year, get_class
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.entities import Account, AcademicClass, Assessment, Mark, Student
from app.services.mark_scheme import TERMS_MIDDLE, TERMS_SENIOR

router = APIRouter(prefix="/reports", tags=["Reports"])

PASS = 35  # percent of each subject's maximum
BANDS = [("90–100", 90), ("75–89", 75), ("60–74", 60), ("35–59", 35), ("Below 35", 0)]


def _pct(part: float, whole: float) -> float | None:
    return round(part * 100 / whole, 1) if whole else None


def _gender(s) -> str:
    g = (s.gender or "").strip().lower()
    return "boys" if g == "male" else "girls" if g == "female" else "other"


def _year_rows(db: Session, classes: list[AcademicClass], year: str) -> dict[str, list[dict]]:
    """Every exam of the year at once: {term: one row per current student of `classes` who has marks in it}.
    Three queries in total, so the exam trend doesn't cost a database round trip per exam."""
    class_ids = [c.id for c in classes]
    term_of = dict(db.query(Assessment.id, Assessment.term).filter(Assessment.class_id.in_(class_ids), Assessment.academic_year == year).all())
    if not term_of: return {}
    marks = defaultdict(lambda: defaultdict(list))  # term -> student_id -> [Mark]
    for m in db.query(Mark).filter(Mark.assessment_id.in_(term_of.keys())).all():
        marks[term_of[m.assessment_id]][m.student_id].append(m)
    code_of = {c.id: c.code for c in classes}
    # Plain columns only (no Account join per student): names are fetched later, just for the students listed.
    students = db.query(Student.id, Student.class_id, Student.gender).filter(Student.class_id.in_(class_ids), Student.status == "active").all()
    return {term: _rows(students, by_student, code_of) for term, by_student in marks.items()}


def _rows(students, marks_by_student: dict, code_of: dict) -> list[dict]:
    rows = []
    for s in students:
        ms = marks_by_student.get(s.id)
        if not ms: continue
        written = [m for m in ms if not m.absent]
        failed = [m.subject for m in written if m.score < m.maximum_score * PASS / 100]
        absent = [m.subject for m in ms if m.absent]
        total = sum(m.score for m in written); maximum = sum(m.maximum_score for m in ms)
        rows.append({"student_id": s.id, "class_code": code_of[s.class_id], "gender": _gender(s),
                     "appeared": bool(written), "passed": bool(written) and not failed and not absent,
                     "percent": _pct(total, maximum) or 0.0, "failed_subjects": failed, "absent_subjects": absent, "marks": ms})
    return rows


def _summary(rows: list[dict], roll: int) -> dict:
    appeared = [r for r in rows if r["appeared"]]
    passed = [r for r in appeared if r["passed"]]
    out = {"roll": roll, "appeared": len(appeared), "passed": len(passed), "failed": len(appeared) - len(passed),
           "not_appeared": max(roll - len(appeared), 0), "pass_percent": _pct(len(passed), len(appeared)),
           "average_percent": round(sum(r["percent"] for r in appeared) / len(appeared), 1) if appeared else None}
    for g in ("boys", "girls"):
        ga = [r for r in appeared if r["gender"] == g]
        out[g] = {"appeared": len(ga), "passed": sum(1 for r in ga if r["passed"]), "pass_percent": _pct(sum(1 for r in ga if r["passed"]), len(ga)),
                  "average_percent": round(sum(r["percent"] for r in ga) / len(ga), 1) if ga else None}
    return out


def _bands(rows: list[dict]) -> list[dict]:
    counts = {label: 0 for label, _ in BANDS}
    for r in rows:
        if r["appeared"]: counts[next(label for label, floor in BANDS if r["percent"] >= floor)] += 1
    return [{"band": label, "count": n} for label, n in counts.items()]


def _subjects(rows: list[dict]) -> list[dict]:
    scores = defaultdict(list)  # subject -> [(score, max)]
    for r in rows:
        for m in r["marks"]:
            if not m.absent: scores[m.subject].append((m.score, m.maximum_score))
    order = ["Tamil", "English", "Maths", "Science", "Social Science", "Physics", "Chemistry", "Biology", "Computer Science"]
    out = []
    for subject, vals in scores.items():
        out.append({"subject": subject, "written": len(vals),
                    "average_percent": round(sum(s * 100 / mx for s, mx in vals) / len(vals), 1),
                    "pass_percent": _pct(sum(1 for s, mx in vals if s >= mx * PASS / 100), len(vals))})
    return sorted(out, key=lambda x: (order.index(x["subject"]) if x["subject"] in order else len(order), x["subject"]))


def _class_line(code: str, rows: list[dict], roll: int, cls: AcademicClass) -> dict:
    s = _summary(rows, roll)
    return {"class_code": code, "grade": cls.grade, "medium": cls.medium, "roll": roll, "appeared": s["appeared"], "passed": s["passed"],
            "pass_percent": s["pass_percent"], "average_percent": s["average_percent"]}


@router.get("/analytics", summary="Results analytics for one exam: school-wide or one class, with the year's exam trend")
def results_analytics(term: str = Query(...), class_code: str | None = None, db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    year = current_academic_year(db)
    if class_code:
        cls = get_class(db, class_code)
        classes = [cls]; year = cls.academic_year
        exam_order = TERMS_SENIOR if cls.grade >= 10 else TERMS_MIDDLE
    else:
        classes = db.query(AcademicClass).filter_by(is_active=True, academic_year=year).order_by(AcademicClass.grade, AcademicClass.code).all()
        exam_order = list(dict.fromkeys(TERMS_MIDDLE + TERMS_SENIOR))
    if not classes: raise HTTPException(404, "No classes found")
    counts = dict(db.query(Student.class_id, func.count(Student.id))
                  .filter(Student.class_id.in_([c.id for c in classes]), Student.status == "active").group_by(Student.class_id).all())
    rolls = {c.code: counts.get(c.id, 0) for c in classes}
    year_rows = _year_rows(db, classes, year)
    rows = year_rows.get(term, [])

    by_class = defaultdict(list)
    for r in rows: by_class[r["class_code"]].append(r)
    class_lines = [_class_line(c.code, by_class.get(c.code, []), rolls[c.code], c) for c in classes]

    # Sections of the same standard side by side (6A vs 6B, 11A vs 11A1 …), only where a standard has 2+ classes with marks
    by_grade = defaultdict(list)
    for line in class_lines:
        if line["appeared"]: by_grade[line["grade"]].append(line)
    sections = [{"grade": g, "classes": lines} for g, lines in sorted(by_grade.items()) if len(lines) > 1]

    # Exam-to-exam flow for the year (only exams that have marks)
    trend = []
    for t in exam_order:
        t_rows = year_rows.get(t, [])
        if any(r["appeared"] for r in t_rows):
            s = _summary(t_rows, sum(rolls.values()))
            trend.append({"term": t, "appeared": s["appeared"], "pass_percent": s["pass_percent"], "average_percent": s["average_percent"]})

    appeared = sorted((r for r in rows if r["appeared"]), key=lambda r: r["percent"], reverse=True)[:5]
    needs_help = sorted((r for r in rows if r["appeared"] and not r["passed"]), key=lambda r: (-(len(r["failed_subjects"]) + len(r["absent_subjects"])), r["percent"]))
    listed = appeared + needs_help[:20]
    names = dict(db.query(Student.id, Account.full_name).join(Account, Account.id == Student.account_id)
                 .filter(Student.id.in_([r["student_id"] for r in listed])).all()) if listed else {}
    top = [{"name": names.get(r["student_id"]), "class_code": r["class_code"], "percent": r["percent"]} for r in appeared]
    attention = [{"name": names.get(r["student_id"]), "class_code": r["class_code"], "percent": r["percent"],
                  "failed_subjects": r["failed_subjects"], "absent_subjects": r["absent_subjects"]} for r in needs_help[:20]]

    return {"term": term, "academic_year": year, "scope": class_code or "school",
            "summary": _summary(rows, sum(rolls.values())), "bands": _bands(rows), "subjects": _subjects(rows),
            "classes": class_lines if not class_code else [], "sections": sections if not class_code else [],
            "trend": trend, "top_students": top, "attention": attention, "attention_total": len(needs_help)}


@router.get("/analytics/latest", summary="The latest exam with marks this year and its school-wide pass % (HM dashboard card)")
def latest_exam_summary(db: Session = Depends(get_db), _: Account = Depends(require_roles("admin"))):
    year = current_academic_year(db)
    latest = (db.query(Assessment.term).join(Mark, Mark.assessment_id == Assessment.id)
              .filter(Assessment.academic_year == year).order_by(Assessment.created_at.desc()).first())
    if not latest: return {"term": None, "pass_percent": None}
    classes = db.query(AcademicClass).filter_by(is_active=True, academic_year=year).all()
    rows = _year_rows(db, classes, year).get(latest.term, [])
    s = _summary(rows, 0)
    return {"term": latest.term, "pass_percent": s["pass_percent"], "appeared": s["appeared"]}
