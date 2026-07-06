from __future__ import annotations

from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from ..db.enterprise_models import AuditLog


async def log_audit(
    db: Session,
    request: Request,
    *,
    username: Optional[str],
    role: Optional[str],
    action: str,
    module: Optional[str],
    old_value: Any,
    new_value: Any,
):
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    # minimal parsing (no external libs)
    browser = None
    if user_agent:
        if "Chrome" in user_agent:
            browser = "Chrome"
        elif "Firefox" in user_agent:
            browser = "Firefox"
        elif "Safari" in user_agent and "Chrome" not in user_agent:
            browser = "Safari"

    os_name = None
    if user_agent and ("Windows" in user_agent):
        os_name = "Windows"
    elif user_agent and "Linux" in user_agent:
        os_name = "Linux"
    elif user_agent and "Android" in user_agent:
        os_name = "Android"

    device = request.headers.get("sec-ch-ua-platform")

    log = AuditLog(
        username=username,
        role=role,
        action=action,
        module=module,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip,
        browser=browser,
        operating_system=os_name,
        device=device,
    )
    db.add(log)
    db.commit()

