#!/usr/bin/env python3
"""
Script to seed the admin user for the toll detection system.
Uses environment variables for admin credentials.
"""
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the parent directory to the path so we can import from backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.enterprise_models import User
from security.passwords import hash_password

# Get admin credentials from environment variables
ADMIN_USERNAME = os.getenv("ENTERPRISE_SEED_SUPERADMIN_USERNAME", "Kritika")
ADMIN_PASSWORD = os.getenv("ENTERPRISE_SEED_SUPERADMIN_PASSWORD", "goldfish")
ADMIN_EMAIL = os.getenv("ENTERPRISE_SEED_SUPERADMIN_EMAIL", "jhakriti307@gmail.com")

# Use SQLite for local development
sqlite_url = "sqlite:///./toll_db.db"
sqlite_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)

# Create tables
from db.enterprise_models import Base
Base.metadata.create_all(bind=sqlite_engine)


def seed_admin_user():
    """Create the admin user if it doesn't exist."""
    db = SessionLocal()
    
    try:
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.username == ADMIN_USERNAME).first()
        
        if admin_user:
            print(f"Admin user '{ADMIN_USERNAME}' already exists.")
            # Update password and email to ensure they match the environment variables
            admin_user.password_hash = hash_password(ADMIN_PASSWORD)
            admin_user.email = ADMIN_EMAIL
            admin_user.is_super_admin = True
            admin_user.is_active = True
            db.commit()
            print(f"Admin password updated to '{ADMIN_PASSWORD}'")
            print(f"Admin email updated to '{ADMIN_EMAIL}'")
        else:
            # Create new admin user
            admin_user = User(
                username=ADMIN_USERNAME,
                email=ADMIN_EMAIL,
                password_hash=hash_password(ADMIN_PASSWORD),
                is_super_admin=True,
                is_active=True,
                role_display="Super Admin"
            )
            db.add(admin_user)
            db.commit()
            print(f"Admin user '{ADMIN_USERNAME}' created successfully")
        
        print("\nAdmin Login Credentials:")
        print(f"Username: {ADMIN_USERNAME}")
        print(f"Password: {ADMIN_PASSWORD}")
        print(f"Email: {ADMIN_EMAIL}")
        
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding admin user from environment variables...")
    seed_admin_user()
    print("Done!")
