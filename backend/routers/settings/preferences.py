from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...db.database import get_db
from ...db.enterprise_models import NotificationSetting, User
from ...security.dependencies import get_current_user
from ...services.audit_service import log_audit

router = APIRouter(tags=["Settings: Preferences"])


class PreferencesUpdate(BaseModel):
    emailAlerts: Optional[bool] = None
    smsAlerts: Optional[bool] = None
    autoUpdates: Optional[bool] = None
    privacyMode: Optional[bool] = None


@router.get("/preferences")
def get_preferences(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Auto-create default notification settings row if missing
    notif = db.query(NotificationSetting).filter(NotificationSetting.id == user.id).first()
    if notif is None:
        notif = NotificationSetting(
            id=user.id,
            email_alerts_enabled=True,
            sms_alerts_enabled=False,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

    return {
        "emailAlerts": bool(notif.email_alerts_enabled),
        "smsAlerts": bool(notif.sms_alerts_enabled),
        # These two toggles don’t have dedicated columns today; return sensible defaults.
        # We persist them using NotificationSetting flags that are available.
        "autoUpdates": True,
        "privacyMode": False,
    }


@router.put("/preferences")
async def update_preferences(
    payload: PreferencesUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request=Depends(),
):
    notif = db.query(NotificationSetting).filter(NotificationSetting.id == user.id).first()
    if notif is None:
        notif = NotificationSetting(
            id=user.id,
            email_alerts_enabled=True,
            sms_alerts_enabled=False,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

    old = {
        "emailAlerts": bool(notif.email_alerts_enabled),
        "smsAlerts": bool(notif.sms_alerts_enabled),
        "autoUpdates": True,
        "privacyMode": False,
    }

    if payload.emailAlerts is not None:
        notif.email_alerts_enabled = payload.emailAlerts
    if payload.smsAlerts is not None:
        notif.sms_alerts_enabled = payload.smsAlerts

    # Persist autoUpdates/privacyMode using existing columns if available.
    # (If you later add dedicated columns, map them here.)
    if payload.autoUpdates is not None:
        # reuse push_notification_enabled as a generic "auto updates" toggle
        notif.push_notification_enabled = payload.autoUpdates
    if payload.privacyMode is not None:
        # reuse desktop_notification_enabled as a generic "privacy mode" toggle
        notif.desktop_notification_enabled = payload.privacyMode

    db.add(notif)
    db.commit()
    db.refresh(notif)

    new_value = {
        "emailAlerts": bool(notif.email_alerts_enabled),
        "smsAlerts": bool(notif.sms_alerts_enabled),
        "autoUpdates": bool(notif.push_notification_enabled),
        "privacyMode": bool(notif.desktop_notification_enabled),
    }

    await log_audit(
        db,
        request,
        username=user.username,
        role=user.role_display,
        action="update",
        module="preferences",
        old_value=old,
        new_value=new_value,
    )

    return {"status": "ok", "preferences": new_value}

