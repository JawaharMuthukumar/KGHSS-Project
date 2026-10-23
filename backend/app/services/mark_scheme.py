"""Grade-wise exam terms, subjects and mark-entry components.

Every subject totals 100; what differs per grade/subject is how that 100 is split
(e.g. SA 60 + FA 40 for grades 6-7, Theory 70 + Practical 20 + Internal 10 for
higher-secondary science). Mark entry is validated against this scheme.
"""
from sqlalchemy.orm import object_session

from app.models.entities import AcademicClass, SubjectGroup

TERMS_MIDDLE = ["Term 1", "Quarterly", "Term 2", "Half Yearly", "Term 3", "Annual Exam"]
TERMS_SENIOR = ["1st Mid Term", "Quarterly", "2nd Mid Term", "Half Yearly", "Revision 1", "Revision 2", "Revision 3"]

SA_FA = [("sa", "SA", 60), ("fa", "FA", 40)]
SINGLE = [("total", "Mark", 100)]
THEORY_INTERNAL = [("theory", "Theory", 90), ("internal", "Internal", 10)]
THEORY_PRACTICAL = [("theory", "Theory", 75), ("practical", "Practical", 25)]
THEORY_PRACTICAL_INTERNAL = [("theory", "Theory", 70), ("practical", "Practical", 20), ("internal", "Internal", 10)]

HSC_PRACTICAL_SUBJECTS = {"Physics", "Chemistry", "Biology", "Computer Science"}


def terms_for_grade(grade: int) -> list[str]:
    return TERMS_SENIOR if grade >= 10 else TERMS_MIDDLE


# The school's original higher-secondary groups (P/C/B/M = Physics, Chemistry, Biology, Maths, …) and their
# core subjects. These seed the `subject_groups` table, where the HM can add more; the table is the source of truth.
GROUP_SUBJECTS = {
    "P/C/B/M": ["Biology", "Chemistry", "Physics", "Maths"],
    "P/C/M/CS": ["Computer Science", "Chemistry", "Physics", "Maths"],
    "P/C/B/CS": ["Biology", "Computer Science", "Chemistry", "Physics"],
}


LANGUAGES = ["Tamil", "English"]


def group_core(cls: AcademicClass) -> list[dict]:
    """The class's group subjects as [{subject, practical}], from the class's own DB session."""
    db = object_session(cls)
    group = db.query(SubjectGroup).filter_by(name=cls.group_name).first() if db and cls.group_name else None
    if group and group.subjects:
        return group.subjects
    core = GROUP_SUBJECTS.get(cls.group_name, GROUP_SUBJECTS["P/C/M/CS"])
    return [{"subject": s, "practical": s in HSC_PRACTICAL_SUBJECTS} for s in core]


def subjects_for_class(cls: AcademicClass) -> list[str]:
    if cls.grade >= 11:
        return [*LANGUAGES, *(s["subject"] for s in group_core(cls))]
    return ["Tamil", "English", "Maths", "Science", "Social Science"]


def subject_components(cls: AcademicClass, subject: str) -> list[tuple[str, str, int]]:
    grade = cls.grade
    if grade <= 7:
        return SA_FA
    if grade <= 9:
        return SINGLE
    if grade == 10:
        return THEORY_PRACTICAL if subject == "Science" else THEORY_INTERNAL
    practical = any(s["subject"] == subject and s.get("practical") for s in group_core(cls))
    return THEORY_PRACTICAL_INTERNAL if practical else THEORY_INTERNAL


def class_scheme(cls: AcademicClass) -> dict:
    return {
        "class_code": cls.code,
        "grade": cls.grade,
        "terms": terms_for_grade(cls.grade),
        "subjects": [
            {"subject": s, "components": [{"key": k, "label": label, "max": m} for k, label, m in subject_components(cls, s)]}
            for s in subjects_for_class(cls)
        ],
    }
