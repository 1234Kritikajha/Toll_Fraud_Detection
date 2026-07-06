from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...db.database import get_db
from ...db.enterprise_models import User
from ...security.dependencies import get_current_user
from ...services.audit_service import log_audit

router = APIRouter(tags=["Settings: Profile"])


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

    phone_number: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    role_display: Optional[str] = None
    address: Optional[str] = None


@router.get("/profile")
def get_profile(user: User = Depends(get_current_user)):
    return {
        "username": user.username,
        "name": user.username,
        "email": user.email,
        "phone_number": user.phone_number,
        "employee_id": user.employee_id,
        "department": user.department,
        "designation": user.designation,
        "role": user.role_display,
        "address": user.address,
        "last_login": user.last_login_at,
        "login_history": [],
        "two_factor_enabled": user.two_factor_enabled,
    }


@router.put("/profile")
async def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request=Depends(),
):
    old = {
        "email": user.email,
        "phone_number": user.phone_number,
        "employee_id": user.employee_id,
        "department": user.department,
        "designation": user.designation,
        "role": user.role_display,
        "address": user.address,
    }

    data = payload.model_dump(exclude_unset=True)
    if "email" in data:
        user.email = data["email"]
    if "phone_number" in data:
        user.phone_number = data["phone_number"]
    if "employee_id" in data:
        user.employee_id = data["employee_id"]
    if "department" in data:
        user.department = data["department"]
    if "designation" in data:
        user.designation = data["designation"]
    if "role_display" in data:
        user.role_display = data["role_display"]
    if "address" in data:
        user.address = data["address"]

    db.add(user)
    db.commit()
    db.refresh(user)

    await log_audit(
        db,
        request,
        username=user.username,
        role=user.role_display,
        action="update",
        module="profile",
        old_value=old,
        new_value=data,
    )

    return {"status": "ok"}


@router.post("/profile/image")
async def upload_profile_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request=Depends(),
):
    upload_dir = os.getenv("PROFILE_IMAGE_DIR", "backend/uploads/profile")
    os.makedirs(upload_dir, exist_ok=True)
    path = os.path.join(upload_dir, f"user_{user.id}_{file.filename}")

    with open(path, "wb") as f:
        f.write(await file.read())

    user.profile_image_path = path
    db.add(user)
    db.commit()

    await log_audit(
        db,
        request,
        username=user.username,
        role=user.role_display,
        action="upload",
        module="profile",
        old_value=None,
        new_value={"path": path},
    )

    return {"status": "ok", "path": path}

