from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.enterprise_models import User
from backend.security.jwt import create_access_token
from backend.security.passwords import verify_password, hash_password
from backend.security.dependencies import get_current_user


router = APIRouter(tags=["Auth"])



class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone_number: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    phone_number: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/auth/login", response_model=AuthResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User inactive")

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()

    # minimal: roles/perms empty for now (seed will populate)
    roles = []
    perms = []
    token_payload = create_access_token(subject=user.username, user_id=user.id, roles=roles, permissions=perms)

    return AuthResponse(access_token=token_payload["access_token"])


@router.post("/auth/register", response_model=UserResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create new user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        phone_number=user_data.phone_number,
        is_active=True,
        is_super_admin=False
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "phone_number": current_user.phone_number,
        "is_active": current_user.is_active,
        "is_super_admin": current_user.is_super_admin,
    }


