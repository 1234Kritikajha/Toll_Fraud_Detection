from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Iterable, Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db.enterprise_models import User


from .jwt import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _normalize_perms(perms: Iterable[str]) -> set[str]:
    return {p for p in perms if p}


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    jwt_str = token.split(" ", 1)[1]
    try:
        payload = decode_token(jwt_str)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    uid = payload.get("uid")
    if uid is None:
        raise HTTPException(status_code=401, detail="Invalid token claims")

    user = db.query(User).filter(User.id == int(uid)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive")

    # attach context for downstream use
    request.state.jwt_payload = payload
    return user


def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin only")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    # minimal rule: super admin OR role in request payload
    if user.is_super_admin:
        return user
    perms = _normalize_perms(getattr(user, "_perms", []))
    if not perms:
        # if we can't resolve perms from DB, allow admin via explicit flag later
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def require_permissions(required: list[str]):
    def _inner(request: Request, user: User = Depends(get_current_user)) -> User:
        payload = getattr(request.state, "jwt_payload", {})
        perms = _normalize_perms(payload.get("perms", []))
        if user.is_super_admin:
            return user
        if not all(p in perms for p in required):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return _inner


