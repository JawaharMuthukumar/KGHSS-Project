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
from app.models.entities import Account, AcademicClass, Assessment, Mark, Student, SubjectTeacherAssignment, Teacher
from app.services.mark_scheme import TERMS_MIDDLE, TERMS_SENIOR, subjects_for_class, terms_for_grade
from app.services.permissions import is_class_teacher_of, student_profile, teacher_profile

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


def _subject_teacher_lines(db: Session, classes: list[AcademicClass], rows: list[dict], year: str) -> list[dict]:
    """Per class + subject: its subject teacher and how that subject went (written, failed, absent, pass %, average %)."""
    code_of = {c.id: c.code for c in classes}
    assigned = {(code_of[a.class_id], a.subject): a.teacher_id for a in db.query(SubjectTeacherAssignment)
                .filter(SubjectTeacherAssignment.class_id.in_(code_of.keys()), SubjectTeacherAssignment.academic_year == year).all()}
    ids = {t for t in assigned.values() if t}
    names = dict(db.query(Teacher.id, Account.full_name).join(Account, Account.id == Teacher.account_id).filter(Teacher.id.in_(ids)).all()) if ids else {}
    stats = defaultdict(lambda: {"written": 0, "failed": 0, "absent": 0, "sum": 0.0})
    for r in rows:
        for m in r["marks"]:
            s = stats[(r["class_code"], m.subject)]
            if m.absent: s["absent"] += 1; continue
            pct = m.score * 100 / m.maximum_score if m.maximum_score else 0
            s["written"] += 1; s["sum"] += pct
            if pct < PASS: s["failed"] += 1
    lines = []
    for (code, subject), s in stats.items():
        tid = assigned.get((code, subject))
        lines.append({"class_code": code, "subject": subject, "teacher_id": tid, "teacher_name": names.get(tid),
                      "written": s["written"], "failed": s["failed"], "absent": s["absent"],
                      "pass_percent": _pct(s["written"] - s["failed"], s["written"]),
                      "average_percent": round(s["sum"] / s["written"], 1) if s["written"] else None, "_sum": s["sum"]})
    return lines


def _by_teacher(lines: list[dict]) -> list[dict]:
    """School view: one row per subject teacher across every class they teach (unassigned subjects grouped per subject)."""
    groups = defaultdict(list)
    for l in lines: groups[l["teacher_id"] or f"none:{l['subject']}"].append(l)
    out = []
    for key, ls in groups.items():
        written = sum(l["written"] for l in ls); failed = sum(l["failed"] for l in ls)
        out.append({"teacher_id": ls[0]["teacher_id"], "teacher_name": ls[0]["teacher_name"],
                    "subjects": sorted({l["subject"] for l in ls}), "written": written, "failed": failed, "absent": sum(l["absent"] for l in ls),
                    "pass_percent": _pct(written - failed, written), "average_percent": round(sum(l["_sum"] for l in ls) / written, 1) if written else None,
                    "classes": sorted(({k: v for k, v in l.items() if k != "_sum"} for l in ls), key=lambda l: l["class_code"])})
    return sorted(out, key=lambda t: (-t["failed"], t["pass_percent"] if t["pass_percent"] is not None else 101))


def _class_line(code: str, rows: list[dict], roll: int, cls: AcademicClass) -> dict:
    s = _summary(rows, roll)
    return {"class_code": code, "grade": cls.grade, "medium": cls.medium, "roll": roll, "appeared": s["appeared"], "passed": s["passed"],
            "pass_percent": s["pass_percent"], "average_percent": s["average_percent"]}


@router.get("/analytics", summary="Results analytics for one exam: school-wide or one class, with the year's exam trend")
def results_analytics(term: str = Query(...), class_code: str | None = None, db: Session = Depends(get_db),
                      account: Account = Depends(require_roles("admin", "teacher"))):
    """HM: the whole school or any class. Class teacher: only a class they are class teacher of.
    A class view also compares it with the other sections of its standard and adds improvement since the previous
    exam, the subjects students are failing (with names) and the full list of students who did not pass."""
    if account.role == "teacher":
        if not class_code: raise HTTPException(403, "Choose your class")
        if not is_class_teacher_of(db, teacher_profile(db, account), get_class(db, class_code)):
            raise HTTPException(403, "Only the class teacher can see this class's analytics")
    year = current_academic_year(db)
    if class_code:
        cls = get_class(db, class_code); year = cls.academic_year
        classes = [cls]
        # Load the other sections of the same standard too, for the section comparison
        loaded = (db.query(AcademicClass).filter_by(is_active=True, academic_year=year, grade=cls.grade)
                  .order_by(AcademicClass.code).all()) or [cls]
        exam_order = terms_for_grade(cls.grade)
    else:
        classes = loaded = db.query(AcademicClass).filter_by(is_active=True, academic_year=year).order_by(AcademicClass.grade, AcademicClass.code).all()
        exam_order = list(dict.fromkeys(TERMS_MIDDLE + TERMS_SENIOR))
    if not classes: raise HTTPException(404, "No classes found")
    counts = dict(db.query(Student.class_id, func.count(Student.id))
                  .filter(Student.class_id.in_([c.id for c in loaded]), Student.status == "active").group_by(Student.class_id).all())
    rolls = {c.code: counts.get(c.id, 0) for c in loaded}
    scope = {c.code for c in classes}
    roll = sum(rolls[c] for c in scope)
    all_rows = _year_rows(db, loaded, year)
    year_rows = {t: [r for r in rs if r["class_code"] in scope] for t, rs in all_rows.items()}
    rows = year_rows.get(term, [])

    by_class = defaultdict(list)
    for r in all_rows.get(term, []): by_class[r["class_code"]].append(r)
    class_lines = [_class_line(c.code, by_class.get(c.code, []), rolls[c.code], c) for c in loaded]

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
            s = _summary(t_rows, roll)
            trend.append({"term": t, "appeared": s["appeared"], "pass_percent": s["pass_percent"], "average_percent": s["average_percent"]})

    top_rows = sorted((r for r in rows if r["appeared"]), key=lambda r: r["percent"], reverse=True)[:5]
    needs_help = sorted((r for r in rows if r["appeared"] and not r["passed"]), key=lambda r: (-(len(r["failed_subjects"]) + len(r["absent_subjects"])), r["percent"]))
    needs_help = needs_help[:100 if class_code else 20] if needs_help else []
    attention_total = sum(1 for r in rows if r["appeared"] and not r["passed"])

    # Class view extras: change since the previous exam with marks, and who is failing which subject
    previous_term, improved, dropped, struggle = None, [], [], []
    if class_code:
        earlier = [t for t in exam_order[:exam_order.index(term)] if any(r["appeared"] for r in year_rows.get(t, []))] if term in exam_order else []
        if earlier:
            previous_term = earlier[-1]
            before = {r["student_id"]: r["percent"] for r in year_rows[previous_term] if r["appeared"]}
            changes = [(r, round(r["percent"] - before[r["student_id"]], 1)) for r in rows if r["appeared"] and r["student_id"] in before]
            improved = sorted((c for c in changes if c[1] > 0), key=lambda c: -c[1])[:5]
            dropped = sorted((c for c in changes if c[1] < 0), key=lambda c: c[1])[:5]
        failing = defaultdict(lambda: {"failed": [], "absent": []})
        for r in rows:
            for subj in r["failed_subjects"]: failing[subj]["failed"].append(r)
            for subj in r["absent_subjects"]: failing[subj]["absent"].append(r)
        struggle = sorted(failing.items(), key=lambda kv: -(len(kv[1]["failed"]) + len(kv[1]["absent"])))

    listed = top_rows + needs_help + [c[0] for c in improved + dropped] + [r for _, v in struggle for r in v["failed"] + v["absent"]]
    ids = {r["student_id"] for r in listed}
    names = dict(db.query(Student.id, Account.full_name).join(Account, Account.id == Student.account_id)
                 .filter(Student.id.in_(ids)).all()) if ids else {}
    who = lambda r: {"student_id": r["student_id"], "name": names.get(r["student_id"]), "class_code": r["class_code"], "percent": r["percent"]}
    written = {s["subject"]: s["written"] for s in _subjects(rows)}
    teacher_lines = _subject_teacher_lines(db, classes, rows, year)

    return {"term": term, "academic_year": year, "scope": class_code or "school",
            "summary": _summary(rows, roll), "bands": _bands(rows), "subjects": _subjects(rows),
            "classes": class_lines if not class_code else [],
            "sections": sections if not class_code else [s for s in sections if s["grade"] == classes[0].grade],
            "trend": trend, "top_students": [who(r) for r in top_rows],
            "attention": [{**who(r), "failed_subjects": r["failed_subjects"], "absent_subjects": r["absent_subjects"]} for r in needs_help],
            "attention_total": attention_total,
            # School view: subject teachers ranked by students failed; class view: each subject with its teacher
            "teachers": _by_teacher(teacher_lines) if not class_code else [],
            "subject_teachers": sorted(({k: v for k, v in l.items() if k != "_sum"} for l in teacher_lines), key=lambda l: (-l["failed"], l["subject"])) if class_code else [],
            "previous_term": previous_term,
            "improved": [{**who(r), "change": ch} for r, ch in improved],
            "dropped": [{**who(r), "change": ch} for r, ch in dropped],
            "subject_struggle": [{"subject": subj, "written": written.get(subj, 0), "failed": len(v["failed"]), "absent": len(v["absent"]),
                                  "students": [{**who(r), "status": "failed"} for r in v["failed"]] + [{**who(r), "status": "absent"} for r in v["absent"]]}
                                 for subj, v in struggle]}


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


# ---------------- Student: my progress across the year's exams ----------------

MID_TERM_EXAMS = {"Term 1", "Term 2", "Term 3", "1st Mid Term", "2nd Mid Term", "3rd Mid Term"}


def _target(pct: float) -> int:
    """Next exam's target: the pass mark if below it, else a reachable step up (rounded up to a multiple of 5)."""
    if pct < 35: return 35
    step = 10 if pct < 60 else 5 if pct < 90 else 0
    return min(100, int(-(-(pct + step) // 5) * 5)) if step else min(100, int(round(pct)))


def _subject_tip(subject: str, pct: float, change: float | None) -> str:
    if pct < 35:
        tip = (f"Below the pass mark. Revise {subject} basics every day, practise previous question papers, "
               f"and ask your {subject} teacher to go over the lessons you find hard.")
    elif pct < 50:
        tip = (f"Passed, but only just. Give {subject} 30 minutes a day: re-read the lessons, learn the key answers "
               "and write one practice test every week.")
    elif pct < 75:
        tip = "A good base. Look at the questions where you lost marks and practise those; aim for full marks in the short answers."
    elif pct < 90:
        tip = "Very good. Keep revising regularly and write neat, step-by-step answers to reach 90+."
    else:
        tip = "Excellent! Keep the same routine. Explaining a lesson to a classmate will make it stick even better."
    if change is not None and change >= 5: tip = f"Up {change:g}% since the last exam, so your effort is working. " + tip
    elif change is not None and change <= -5: tip = f"Down {abs(change):g}% since the last exam. Find which lessons changed and revise them first. " + tip
    return tip


@router.get("/my-progress", summary="A student's own results across the year's exams, with per-subject improvement, tips and targets")
def my_progress(db: Session = Depends(get_db), account: Account = Depends(require_roles("student"))):
    student = student_profile(db, account); cls = student.school_class; year = cls.academic_year
    order = terms_for_grade(cls.grade)
    term_of = dict(db.query(Assessment.id, Assessment.term).filter(Assessment.class_id == cls.id, Assessment.academic_year == year).all())
    marks = db.query(Mark).filter(Mark.assessment_id.in_(term_of.keys())).all() if term_of else []

    # Class averages (per exam overall, and per exam + subject), from every classmate's written marks
    per_student = defaultdict(lambda: defaultdict(list))  # term -> student -> [Mark]
    subj_pcts = defaultdict(list)  # (term, subject) -> [percent]
    for m in marks:
        t = term_of[m.assessment_id]; per_student[t][m.student_id].append(m)
        if not m.absent and m.maximum_score: subj_pcts[(t, m.subject)].append(m.score * 100 / m.maximum_score)
    class_avg = {}
    for t, by in per_student.items():
        pcts = [sum(x.score for x in ms if not x.absent) * 100 / sum(x.maximum_score for x in ms) for ms in by.values()
                if any(not x.absent for x in ms) and sum(x.maximum_score for x in ms)]
        class_avg[t] = round(sum(pcts) / len(pcts), 1) if pcts else None
    avg = lambda vals: round(sum(vals) / len(vals), 1) if vals else None

    exams = []
    for t in order:
        mine = per_student.get(t, {}).get(student.id)
        if not mine: continue
        written = [m for m in mine if not m.absent]
        maximum = sum(m.maximum_score for m in mine)
        subjects = {m.subject: {"subject": m.subject, "score": m.score, "max": m.maximum_score, "absent": m.absent,
                                "percent": None if m.absent else round(m.score * 100 / m.maximum_score, 1),
                                "class_average": avg(subj_pcts[(t, m.subject)])} for m in mine}
        exams.append({"term": t, "group": "mid" if t in MID_TERM_EXAMS else "main",
                      "percent": round(sum(m.score for m in written) * 100 / maximum, 1) if maximum and written else None,
                      "passed": bool(written) and all(not m.absent and m.score >= m.maximum_score * PASS / 100 for m in mine),
                      "class_average": class_avg.get(t), "subjects": subjects})

    # Per subject: latest written mark vs the exam before it, with a tip and the next target
    subjects = []
    for subj in subjects_for_class(cls):
        seen = [(e["term"], e["subjects"][subj]["percent"]) for e in exams if subj in e["subjects"] and e["subjects"][subj]["percent"] is not None]
        if not seen: continue
        latest_term, latest = seen[-1]
        prev_term, prev = seen[-2] if len(seen) > 1 else (None, None)
        change = round(latest - prev, 1) if prev is not None else None
        subjects.append({"subject": subj, "latest_term": latest_term, "latest": latest, "previous_term": prev_term, "previous": prev,
                         "change": change, "target": _target(latest), "tip": _subject_tip(subj, latest, change),
                         "history": [{"term": t, "percent": p} for t, p in seen]})

    overall = None
    scored = [e for e in exams if e["percent"] is not None]
    if scored:
        last = scored[-1]; before = scored[-2] if len(scored) > 1 else None
        change = round(last["percent"] - before["percent"], 1) if before else None
        ranked = sorted(subjects, key=lambda s: s["latest"])
        weakest, strongest = (ranked[0], ranked[-1]) if ranked else (None, None)
        if change is None:
            msg = f"You scored {last['percent']}% in {last['term']}. After your next exam this page will show how much you improved."
        elif change >= 3:
            msg = f"Well done! You improved by {change:g}% from {before['term']} to {last['term']}. Keep up the same effort."
        elif change <= -3:
            msg = f"Your score dropped by {abs(change):g}% from {before['term']} to {last['term']}. Plan a little study every day and you can bring it back up."
        else:
            msg = f"Your score stayed about the same ({before['percent']}% → {last['percent']}%). A focused push on your weakest subject will lift your total."
        if weakest and weakest["latest"] < 35:
            msg += f" Most important now: {weakest['subject']} ({weakest['latest']}%). Clear the pass mark first."
        overall = {"latest_term": last["term"], "latest": last["percent"], "previous_term": before["term"] if before else None,
                   "previous": before["percent"] if before else None, "change": change, "passed": last["passed"],
                   "class_average": last["class_average"], "message": msg, "target": _target(last["percent"]),
                   "strongest": {"subject": strongest["subject"], "percent": strongest["latest"]} if strongest else None,
                   "weakest": {"subject": weakest["subject"], "percent": weakest["latest"]} if weakest else None}

    return {"name": account.full_name, "class_code": cls.code, "academic_year": year, "exams": exams, "subjects": subjects, "overall": overall}
