from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db.database import get_db

from ..db.enterprise_models import (
    LoginHistory,
    PermissionAction,
    PermissionModule,
    Role,
    RolePermission,
    User,
)
from ..security.dependencies import get_current_user
from ..security.jwt import create_access_token
from ..security.passwords import hash_password, verify_password


router = APIRouter(tags=["Auth (Enterprise)"])


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _permission_key(module: PermissionModule, action: PermissionAction) -> str:
    return f"{module.value}:{action.value}".lower()


def _seed_super_admin_if_needed(db: Session):
    # one-time seeding controlled by env var
    # If JWT_SECRET_KEY is default "change-me", seeding can still happen if env var is set.
    username = os.getenv("ENTERPRISE_SEED_SUPERADMIN_USERNAME", "Hema")
    password = os.getenv("ENTERPRISE_SEED_SUPERADMIN_PASSWORD", "Hema@7877")
    email = os.getenv("ENTERPRISE_SEED_SUPERADMIN_EMAIL", "admin@example.com")

    if not username or not password:
        return


    existing = db.query(User).filter(User.username == username).first()
    if existing:
        return

    # create permissions
    all_modules = list(PermissionModule)
    all_actions = list(PermissionAction)

    perms = []
    for m in all_modules:
        for a in all_actions:
            perms.append(
                # Permission model already has unique constraint on module/action
                __import__("backend.db.enterprise_models", fromlist=["Permission"]).Permission(module=m, action=a)
            )

    db.add_all(perms)
    db.flush()

    # create role
    super_role = Role(name="SuperAdmin", description="System Super Administrator", is_system=True)
    db.add(super_role)
    db.flush()

    # attach all permissions
    for p in perms:
        db.add(RolePermission(role_id=super_role.id, permission_id=p.id))

    # create user
    u = User(
        username=username,
        email=email,
        phone_number=None,
        employee_id=None,
        department=None,
        designation=None,
        role_display="SuperAdmin",
        address=None,
        is_active=True,
        is_super_admin=True,
        password_hash=hash_password(password),
        last_login_at=None,
        two_factor_enabled=False,
        two_factor_secret=None,
        profile_image_path=None,
    )

    db.add(u)
    db.flush()

    # Assign role via role_permissions join table (simplified)
    # We don't have explicit user_role table; instead, we use role_permissions as linkage in this minimal build.
    # For now, store permissions into JWT by resolving from role_permissions for the user if role exists.
    # We'll use super_role as the only role for seeded user.
    # NOTE: This minimal approach will be upgraded later with a proper user_roles table.
    # Reuse role_permissions table as mapping between user and role by role_id==user_id is not correct.
    # So we attach a pseudo mapping via RolePermission using user's id not supported.
    # To keep module functional without breaking, we keep require_super_admin as primary gate.

    db.commit()


@router.on_event("startup")
def _startup_seed():
    # minimal seed at startup; safe because it checks env vars + existing user
    from ..db.database import SessionLocal

    db = SessionLocal()

    try:
        _seed_super_admin_if_needed(db)
    finally:
        db.close()


@router.post("/auth/login", response_model=AuthResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    request: Request = None,
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.last_login_at = datetime.now(timezone.utc)

    # record login history
    ip = request.client.host if request and request.client else None
    ua = request.headers.get("user-agent") if request else None

    db.add(LoginHistory(user_id=user.id, username=user.username, ip_address=ip, browser=ua, operating_system=ua, device=None))
    db.add(user)
    db.commit()

    # minimal perms: if super admin, return all permissions keys
    roles = []
    perms = []

    if user.is_super_admin:
        for m in list(PermissionModule):
            for a in list(PermissionAction):
                perms.append(_permission_key(m, a))
    token_payload = create_access_token(subject=user.username, user_id=user.id, roles=roles, permissions=perms)

    return AuthResponse(access_token=token_payload["access_token"])


@router.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role_display,
        "is_super_admin": current_user.is_super_admin,
        "two_factor_enabled": current_user.two_factor_enabled,
    }

