from fastapi import APIRouter, Depends, HTTPException
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
    account = db.query(Account).filter(Account.username == data.username.strip()).first()
    if not account or not account.is_active or not verify_password(data.password, account.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if account.role == "student" and data.class_code:
        student = db.query(Student).filter_by(account_id=account.id).first()
        if not student or student.school_class.code != data.class_code:
            raise HTTPException(status_code=401, detail="Student registration and selected class do not match")
    token = create_access_token(subject=str(account.id), role=account.role)
    return {"access_token": token, "user": {"id": account.id, "username": account.username, "role": account.role, "full_name": account.full_name}}


@router.get("/me", summary="Get the signed-in account")
def me(account: Account = Depends(current_account)):
    return {"id": account.id, "username": account.username, "role": account.role, "full_name": account.full_name, "is_active": account.is_active}


@router.post("/logout", summary="Sign out from the client")
def logout(_: Account = Depends(current_account)):
    # JWTs are stateless; clients must discard the token. It expires automatically.
    return {"logged_out": True, "message": "Discard the access token on the client."}


@router.post("/change-password", summary="Change your own password")
def change_password(data: ChangePasswordIn, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    if not verify_password(data.old_password, account.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    account.password_hash = hash_password(data.new_password)
    db.commit()
    return {"changed": True}
