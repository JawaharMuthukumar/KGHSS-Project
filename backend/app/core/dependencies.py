from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.entities import Account

bearer_scheme = HTTPBearer(auto_error=True)


def current_account(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: Session = Depends(get_db)) -> Account:
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = decode_access_token(credentials.credentials)
        account_id = int(payload.get("sub", ""))
    except (ValueError, TypeError):
        raise credentials_error
    account = db.get(Account, account_id)
    if not account or not account.is_active or account.role != payload.get("role"):
        raise credentials_error
    return account


def require_roles(*roles: str):
    def dependency(account: Account = Depends(current_account)) -> Account:
        if account.role not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission for this action")
        return account
    return dependency
