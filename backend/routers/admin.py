from __future__ import annotations

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.enterprise_models import User
from backend.security.passwords import hash_password, verify_password
from backend.security.jwt import decode_token


router = APIRouter(tags=["Admin"])


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminPasswordChange(BaseModel):
    old_password: str
    new_password: str


class UserPasswordUpdate(BaseModel):
    user_id: int
    new_password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    phone_number: Optional[str] = None
    is_active: bool
    is_super_admin: bool
    created_at: str
    
    class Config:
        from_attributes = True


def get_current_admin(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    """Dependency to verify the current user is an admin."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.is_super_admin:
            raise HTTPException(status_code=403, detail="Not authorized as admin")
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/admin/login")
def admin_login(credentials: AdminLoginRequest, db: Session = Depends(get_db)):
    """Admin login endpoint - returns user info if credentials are valid."""
    user = db.query(User).filter(
        User.username == credentials.username,
        User.is_super_admin == True
    ).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Admin user not found")
    
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Admin account is inactive")
    
    return {
        "message": "Admin login successful",
        "username": user.username,
        "is_super_admin": user.is_super_admin
    }


@router.get("/admin/users", response_model=List[UserResponse])
def get_all_users(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Get all users in the system (admin only)."""
    current_admin = get_current_admin(authorization, db)
    users = db.query(User).all()
    # Ensure created_at matches response_model: str
    for u in users:
        if isinstance(getattr(u, "created_at", None), datetime):
            u.created_at = u.created_at.isoformat()
    return users


@router.put("/admin/users/{user_id}/password")
def update_user_password(
    user_id: int,
    password_data: UserPasswordUpdate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Update a user's password (admin only)."""
    current_admin = get_current_admin(authorization, db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_super_admin:
        raise HTTPException(status_code=403, detail="Cannot modify super admin password through this endpoint")
    
    user.password_hash = hash_password(password_data.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}


@router.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)."""
    current_admin = get_current_admin(authorization, db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_super_admin:
        raise HTTPException(status_code=403, detail="Cannot delete super admin")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}


@router.put("/admin/change-password")
def change_admin_password(
    password_data: AdminPasswordChange,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Change the current admin's password."""
    current_admin = get_current_admin(authorization, db)
    if not verify_password(password_data.old_password, current_admin.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    current_admin.password_hash = hash_password(password_data.new_password)
    db.commit()
    
    return {"message": "Admin password changed successfully"}


@router.put("/admin/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Toggle a user's active status (admin only)."""
    current_admin = get_current_admin(authorization, db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_super_admin:
        raise HTTPException(status_code=403, detail="Cannot modify super admin status")
    
    user.is_active = not user.is_active
    db.commit()
    
    return {"message": f"User {'activated' if user.is_active else 'deactivated'} successfully"}
