"""Create or reset the initial administrator interactively: python -m app.create_admin"""
from getpass import getpass

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.entities import Account  # noqa: F401
from app import models  # noqa: F401


def main():
    Base.metadata.create_all(bind=engine)
    username = input("Admin username (e.g. GHSS-HM-001): ").strip()
    full_name = input("Admin full name: ").strip()
    password = getpass("Admin password (minimum 8 characters): ")
    if len(password) < 8:
        raise SystemExit("Password must contain at least 8 characters.")
    with SessionLocal() as db:
        account = db.query(Account).filter_by(username=username).first()
        if account and account.role != "admin":
            raise SystemExit("That username is already assigned to a non-admin account.")
        if not account:
            account = Account(username=username, role="admin", full_name=full_name, password_hash=hash_password(password))
            db.add(account)
        else:
            account.full_name = full_name
            account.password_hash = hash_password(password)
            account.is_active = True
        db.commit()
    print(f"Administrator '{username}' is ready.")


if __name__ == "__main__":
    main()
