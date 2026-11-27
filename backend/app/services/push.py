"""Phone notifications (Web Push) for the installed portal app and browsers that allowed them.

`notify()` is called right after an action is saved (new homework, a certificate approved, …). Sending happens on a
background thread so the request isn't slowed down; devices the push service says are gone (404/410) are removed.
Everything is a no-op while the VAPID keys aren't configured.
"""
import json
import logging
import threading

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.entities import Account, AcademicClass, ClassTeacherAssignment, PushSubscription, Student, Teacher

log = logging.getLogger(__name__)


def push_enabled() -> bool:
    return bool(settings.vapid_public_key and settings.vapid_private_key)


def _send(subs: list[tuple[int, str, str, str]], payload: str) -> None:
    gone = []
    for sub_id, endpoint, p256dh, auth in subs:
        try:
            webpush({"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}}, payload,
                    vapid_private_key=settings.vapid_private_key, vapid_claims={"sub": settings.vapid_subject}, ttl=24 * 3600)
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            if status in (404, 410): gone.append(sub_id)
            else: log.warning("Push failed (%s): %s", status, exc)
        except Exception as exc:  # a bad subscription must never break the others
            log.warning("Push failed: %s", exc)
    if gone:
        db = SessionLocal()
        try:
            db.query(PushSubscription).filter(PushSubscription.id.in_(gone)).delete(synchronize_session=False); db.commit()
        finally:
            db.close()


def notify(db: Session, account_ids, title: str, body: str, url: str, tag: str | None = None) -> None:
    """Send one notification to every device of these accounts (tapping it opens `url` in the portal)."""
    ids = {i for i in account_ids if i}
    if not ids or not push_enabled(): return
    subs = [(s.id, s.endpoint, s.p256dh, s.auth) for s in db.query(PushSubscription).filter(PushSubscription.account_id.in_(ids)).all()]
    if not subs: return
    payload = json.dumps({"title": title, "body": body[:180], "url": url, "tag": tag})
    threading.Thread(target=_send, args=(subs, payload), daemon=True).start()


# ---- who to notify ----

def students_of(db: Session, class_id: int) -> list[int]:
    return [a for (a,) in db.query(Student.account_id).filter(Student.class_id == class_id, Student.status == "active").all()]


def all_students(db: Session) -> list[int]:
    return [a for (a,) in db.query(Student.account_id).join(AcademicClass, AcademicClass.id == Student.class_id)
            .filter(Student.status == "active", AcademicClass.is_active.is_(True)).all()]


def all_teachers(db: Session) -> list[int]:
    return [a for (a,) in db.query(Teacher.account_id).join(Account, Account.id == Teacher.account_id).filter(Account.is_active.is_(True)).all()]


def admins(db: Session) -> list[int]:
    return [a for (a,) in db.query(Account.id).filter(Account.role == "admin", Account.is_active.is_(True)).all()]


def class_teachers_of(db: Session, class_id: int) -> list[int]:
    cls = db.get(AcademicClass, class_id)
    if not cls: return []
    return [a for (a,) in db.query(Teacher.account_id).join(ClassTeacherAssignment, ClassTeacherAssignment.teacher_id == Teacher.id)
            .filter(ClassTeacherAssignment.class_id == class_id, ClassTeacherAssignment.academic_year == cls.academic_year).all()]
