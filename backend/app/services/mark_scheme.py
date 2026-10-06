"""Grade-wise exam terms, subjects and mark-entry components.

Every subject totals 100; what differs per grade/subject is how that 100 is split
(e.g. SA 60 + FA 40 for grades 6-7, Theory 70 + Practical 20 + Internal 10 for
higher-secondary science). Mark entry is validated against this scheme.
"""
from app.models.entities import AcademicClass

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


def subjects_for_class(cls: AcademicClass) -> list[str]:
    if cls.grade >= 11:
        electives = ["Biology"] if cls.group_name == "Bio-Maths" else ["Computer Science"]
        return ["Tamil", "English", *electives, "Chemistry", "Physics", "Maths"]
    return ["Tamil", "English", "Maths", "Science", "Social Science"]


def subject_components(grade: int, subject: str) -> list[tuple[str, str, int]]:
    if grade <= 7:
        return SA_FA
    if grade <= 9:
        return SINGLE
    if grade == 10:
        return THEORY_PRACTICAL if subject == "Science" else THEORY_INTERNAL
    return THEORY_PRACTICAL_INTERNAL if subject in HSC_PRACTICAL_SUBJECTS else THEORY_INTERNAL


def class_scheme(cls: AcademicClass) -> dict:
    return {
        "class_code": cls.code,
        "grade": cls.grade,
        "terms": terms_for_grade(cls.grade),
        "subjects": [
            {"subject": s, "components": [{"key": k, "label": label, "max": m} for k, label, m in subject_components(cls.grade, s)]}
            for s in subjects_for_class(cls)
        ],
    }
