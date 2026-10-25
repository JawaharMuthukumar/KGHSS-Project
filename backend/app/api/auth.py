from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import current_account
from app.core.security import create_access_token, hash_password, verify_password
from app.models.entities import Account
from app.models.entities import Student
from app.schemas.common import ChangePasswordIn, LoginIn, TokenOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenOut, summary="Sign in and receive a JWT")
def login(data: LoginIn, db: Session = Depends(get_db)):
    # Postgres compares case-sensitively (MySQL did not), so keep logins case-insensitive explicitly.
    login_id = data.username.strip()
    account = db.query(Account).filter(func.lower(Account.username) == login_id.lower()).first()
    if not account:
        # Students may also sign in with their admission number, which is shorter than the register number.
        student = db.query(Student).filter(func.lower(Student.admission_no) == login_id.lower()).first()
        account = student.account if student else None
    if not account or not account.is_active or not verify_password(data.password, account.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if account.role == "student" and data.class_code:
        student = db.query(Student).filter_by(account_id=account.id).first()
        if not student or student.school_class.code != data.class_code:
            raise HTTPException(status_code=401, detail="Student registration and selected class do not match")
    token = create_access_token(subject=str(account.id), role=account.role)
    return {"access_token": token, "user": account_out(account)}


def account_out(account: Account) -> dict:
    return {"id": account.id, "username": account.username, "role": account.role, "full_name": account.full_name,
            "is_active": account.is_active, "password_is_default": bool(account.password_is_default)}


@router.get("/me", summary="Get the signed-in account")
def me(account: Account = Depends(current_account)):
    return account_out(account)


@router.post("/logout", summary="Sign out from the client")
def logout(_: Account = Depends(current_account)):
    # JWTs are stateless; clients must discard the token. It expires automatically.
    return {"logged_out": True, "message": "Discard the access token on the client."}


@router.post("/change-password", summary="Change your own password")
def change_password(data: ChangePasswordIn, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    # 400 (not 401): a wrong current password must not sign the user out of the portal.
    if not verify_password(data.old_password, account.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if data.new_password == data.old_password:
        raise HTTPException(status_code=422, detail="The new password must be different from the current one")
    account.password_hash = hash_password(data.new_password)
    account.password_is_default = False
    db.commit()
    return {"changed": True, "user": account_out(account)}
