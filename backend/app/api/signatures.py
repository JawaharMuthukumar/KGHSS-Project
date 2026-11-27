"""Digital signatures (teachers and the HM) and the class teacher's per-exam report-card sign-off."""
import base64
import binascii
from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.school import get_class, term_assessment
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.entities import Account, AccountSignature, Assessment, Teacher, TeacherSignature
from app.services.mark_scheme import terms_for_grade
from app.services.permissions import can_access_class, is_class_teacher_of, teacher_profile
from app.services.signoff import marks_fingerprint, signoff_state

router = APIRouter(tags=["Signatures"])

PREFIX = "data:image/png;base64,"
MAX_BYTES = 300_000


class SignatureIn(BaseModel):
    image: str = Field(min_length=len(PREFIX) + 10, max_length=MAX_BYTES * 2)


def hm_signature(db: Session, account: Account) -> str | None:
    """The HM's signature image (used to stamp approved Notes of Lessons)."""
    sig = db.get(AccountSignature, account.id)
    return sig.image if sig else None


@router.get("/me/signature", summary="The signed-in teacher's or HM's own signature")
def my_signature(db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher", "admin"))):
    sig = db.get(AccountSignature, account.id) if account.role == "admin" else db.get(TeacherSignature, teacher_profile(db, account).id)
    return {"image": sig.image if sig else None, "updated_at": sig.updated_at if sig else None}


@router.put("/me/signature", summary="Save the signed-in teacher's or HM's signature (PNG data URL)")
def save_signature(data: SignatureIn, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher", "admin"))):
    if not data.image.startswith(PREFIX): raise HTTPException(422, "Signature must be a PNG image")
    try:
        raw = base64.b64decode(data.image[len(PREFIX):], validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(422, "Signature image is not valid") from exc
    if len(raw) > MAX_BYTES: raise HTTPException(422, "Signature image is too large")
    try:
        img = Image.open(BytesIO(raw)); img.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(422, "Signature image is not valid") from exc
    if img.format != "PNG" or img.width > 1600 or img.height > 800: raise HTTPException(422, "Signature image must be a PNG up to 1600×800")
    if account.role == "admin":
        sig = db.get(AccountSignature, account.id)
        if sig: sig.image = data.image; sig.updated_at = datetime.utcnow()
        else: db.add(AccountSignature(account_id=account.id, image=data.image))
    else:
        teacher = teacher_profile(db, account)
        sig = db.get(TeacherSignature, teacher.id)
        if sig: sig.image = data.image; sig.updated_at = datetime.utcnow()
        else: db.add(TeacherSignature(teacher_id=teacher.id, image=data.image))
    db.commit()
    return {"saved": True}


@router.delete("/me/signature", summary="Remove the signed-in user's signature (a teacher's also withdraws their report-card sign-offs)")
def delete_signature(db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher", "admin"))):
    """A teacher removing their signature also withdraws all their exam sign-offs, so a signature added later
    (e.g. the real teacher's after a test signature) never appears on exams they did not sign themselves.
    The HM's already-approved Notes of Lessons keep the stamp they were approved with."""
    if account.role == "admin":
        sig = db.get(AccountSignature, account.id)
        if sig: db.delete(sig)
        db.commit()
        return {"removed": bool(sig), "signoffs_withdrawn": 0}
    teacher = teacher_profile(db, account)
    sig = db.get(TeacherSignature, teacher.id)
    if sig: db.delete(sig)
    withdrawn = (db.query(Assessment).filter(Assessment.signed_by == teacher.id)
                 .update({Assessment.signed_by: None, Assessment.signed_at: None, Assessment.signed_fingerprint: None}, synchronize_session=False))
    db.commit()
    return {"removed": bool(sig), "signoffs_withdrawn": withdrawn}


def _signoff_out(db: Session, term: str, assessment) -> dict:
    state = signoff_state(db, assessment)
    signer = db.get(Teacher, assessment.signed_by) if assessment and assessment.signed_by else None
    return {"term": term, "state": state, "signed_at": assessment.signed_at if assessment else None,
            "signed_by_name": signer.account.full_name if signer else None}


@router.get("/classes/{class_code}/signoffs", summary="Report-card sign-off state of every exam of a class")
def class_signoffs(class_code: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("admin", "teacher"))):
    cls = get_class(db, class_code)
    if not can_access_class(db, account, cls, allow_subject=False): raise HTTPException(403, "Only the class teacher can see this")
    has_signature = account.role == "teacher" and db.get(TeacherSignature, teacher_profile(db, account).id) is not None
    return {"class_code": cls.code, "has_signature": has_signature,
            "exams": [_signoff_out(db, t, term_assessment(db, cls, t)) for t in terms_for_grade(cls.grade)]}


def _own_exam(db: Session, account: Account, class_code: str, term: str):
    cls = get_class(db, class_code)
    teacher = teacher_profile(db, account)
    if not is_class_teacher_of(db, teacher, cls): raise HTTPException(403, "Only the class teacher can sign this class's report cards")
    if term not in terms_for_grade(cls.grade): raise HTTPException(422, f"'{term}' is not an exam for class {cls.code}")
    return teacher, term_assessment(db, cls, term)


@router.post("/classes/{class_code}/exams/{term}/sign", summary="Class teacher signs an exam's report cards")
def sign_exam(class_code: str, term: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    teacher, assessment = _own_exam(db, account, class_code, term)
    fingerprint = marks_fingerprint(db, assessment) if assessment else None
    if not fingerprint: raise HTTPException(409, f"No marks entered for {term} yet")
    if not db.get(TeacherSignature, teacher.id): raise HTTPException(409, "Add your signature first (profile menu → My Signature)")
    assessment.signed_by = teacher.id; assessment.signed_at = datetime.utcnow(); assessment.signed_fingerprint = fingerprint
    db.commit()
    return _signoff_out(db, term, assessment)


@router.delete("/classes/{class_code}/exams/{term}/sign", summary="Class teacher withdraws their signature from an exam")
def unsign_exam(class_code: str, term: str, db: Session = Depends(get_db), account: Account = Depends(require_roles("teacher"))):
    _, assessment = _own_exam(db, account, class_code, term)
    if assessment:
        assessment.signed_by = None; assessment.signed_at = None; assessment.signed_fingerprint = None
        db.commit()
    return _signoff_out(db, term, assessment)
