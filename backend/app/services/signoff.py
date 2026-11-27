"""Class teacher report-card sign-off: marks fingerprints and which exams carry a valid signature."""
import hashlib

from sqlalchemy.orm import Session

from app.models.entities import Assessment, Mark, TeacherSignature


def marks_fingerprint(db: Session, assessment: Assessment) -> str | None:
    """A hash of every mark in the exam; changes whenever any mark, absence or split part changes. None = no marks."""
    rows = db.query(Mark.student_id, Mark.subject, Mark.score, Mark.absent, Mark.components).filter(Mark.assessment_id == assessment.id).all()
    if not rows: return None
    canon = sorted(f"{sid}|{subj}|{score}|{int(bool(absent))}|{sorted((comps or {}).items())}" for sid, subj, score, absent, comps in rows)
    return hashlib.sha256("\n".join(canon).encode()).hexdigest()


def signoff_state(db: Session, assessment: Assessment | None) -> str:
    """'no_marks' | 'unsigned' | 'signed' | 'stale' (signed, but marks changed since)."""
    if not assessment: return "no_marks"
    current = marks_fingerprint(db, assessment)
    if current is None: return "no_marks"
    if not assessment.signed_by or not assessment.signed_fingerprint: return "unsigned"
    return "signed" if assessment.signed_fingerprint == current else "stale"


def exam_signatures(db: Session, assessments: dict[str, Assessment]) -> dict[str, str]:
    """{term: signature image} for exams whose sign-off is still valid and whose signer has a signature on file."""
    valid = {t: a for t, a in assessments.items() if signoff_state(db, a) == "signed"}
    if not valid: return {}
    images = dict(db.query(TeacherSignature.teacher_id, TeacherSignature.image)
                  .filter(TeacherSignature.teacher_id.in_({a.signed_by for a in valid.values()})).all())
    return {t: images[a.signed_by] for t, a in valid.items() if a.signed_by in images}
