"""Phone notifications: devices subscribe here; an external cron calls /push/reminders for the homework reminders.

Render's free plan sleeps when idle, so timed reminders can't run inside the server — a free cron service
(e.g. cron-job.org) calls POST /push/reminders?kind=teacher at 1 PM and ?kind=hm at 3 PM IST, Monday–Friday,
with the header X-Cron-Secret: <CRON_SECRET>.
"""
import hmac
from collections import defaultdict

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.homework import missing_today
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import current_account
from app.models.entities import Account, PushSubscription, Teacher
from app.services.push import admins, notify, push_enabled

router = APIRouter(prefix="/push", tags=["Phone notifications"])


class Keys(BaseModel):
    p256dh: str = Field(max_length=200)
    auth: str = Field(max_length=100)


class SubscriptionIn(BaseModel):
    endpoint: str = Field(max_length=2000, pattern=r"^https://")
    keys: Keys


class EndpointIn(BaseModel):
    endpoint: str = Field(max_length=2000)


@router.get("/public-key", summary="The VAPID public key devices subscribe with (enabled=false when push isn't set up)")
def public_key():
    return {"enabled": push_enabled(), "key": settings.vapid_public_key or None}


@router.post("/subscribe", status_code=204, response_class=Response, summary="Save this device for the signed-in account")
def subscribe(data: SubscriptionIn, request: Request, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    if not push_enabled(): raise HTTPException(503, "Phone notifications are not set up on the server yet")
    sub = db.query(PushSubscription).filter_by(endpoint=data.endpoint).first()
    if not sub:
        sub = PushSubscription(endpoint=data.endpoint); db.add(sub)
    # The same phone signing in with another account now belongs to that account.
    sub.account_id = account.id; sub.p256dh = data.keys.p256dh; sub.auth = data.keys.auth
    sub.user_agent = (request.headers.get("user-agent") or "")[:300]
    db.commit()


@router.post("/unsubscribe", status_code=204, response_class=Response, summary="Forget this device (notifications turned off or signed out)")
def unsubscribe(data: EndpointIn, db: Session = Depends(get_db), account: Account = Depends(current_account)):
    db.query(PushSubscription).filter_by(endpoint=data.endpoint, account_id=account.id).delete(); db.commit()


@router.post("/test", status_code=204, response_class=Response, summary="Send a test notification to the signed-in account's devices")
def test(db: Session = Depends(get_db), account: Account = Depends(current_account)):
    if not db.query(PushSubscription).filter_by(account_id=account.id).first(): raise HTTPException(404, "Turn on notifications on this device first")
    home = {"admin": "/admin", "teacher": "/teacher", "student": "/student"}.get(account.role, "/")
    notify(db, [account.id], "Notifications are on", "You will get school portal alerts on this device.", home, "test")


@router.post("/reminders", summary="Cron: homework reminders — kind=teacher (1 PM) or kind=hm (3 PM)")
def reminders(kind: str = Query(..., pattern="^(teacher|hm)$"), x_cron_secret: str = Header(""), db: Session = Depends(get_db)):
    if not settings.cron_secret or not hmac.compare_digest(x_cron_secret, settings.cron_secret): raise HTTPException(403, "Bad cron secret")
    missing = missing_today(db)
    if not missing: return {"sent": 0}
    if kind == "hm":
        teachers = len({m["teacher_id"] for m in missing})
        notify(db, admins(db), f"Homework not given for {len(missing)} period{'s' if len(missing) != 1 else ''} today",
               f"{teachers} teacher{'s' if teachers != 1 else ''} · tap to see the list", "/admin/homework", "homework-hm")
        return {"sent": 1, "missing": len(missing)}
    by_teacher = defaultdict(list)
    for m in missing:
        if m["teacher_id"]: by_teacher[m["teacher_id"]].append(f"{m['class_code']} {m['subject']}")
    accounts = dict(db.query(Teacher.id, Teacher.account_id).filter(Teacher.id.in_(by_teacher)).all()) if by_teacher else {}
    for tid, slots in by_teacher.items():
        notify(db, [accounts.get(tid)], "Homework not given yet", ", ".join(slots), "/teacher/homework", "homework-reminder")
    return {"sent": len(by_teacher), "missing": len(missing)}
