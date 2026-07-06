# db/models.py
from sqlalchemy import Column, Integer, String, Boolean, Numeric, DateTime, ForeignKey, text
from sqlalchemy.sql import func
from .database import Base




class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String(20), unique=True, nullable=False, index=True)
    make = Column(String(50), nullable=True)
    model = Column(String(50), nullable=True)
    color = Column(String(30), nullable=True)
    is_blacklisted = Column(Boolean, default=False)
    fastag_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    plate = Column(String(20), nullable=True, index=True)
    fastag_id = Column(String(50), nullable=True)
    plaza = Column(String(100), nullable=True)
    lane = Column(String(20), nullable=True)
    amount = Column(Numeric(10, 2), nullable=True)
    status = Column(String(30), nullable=True)  # Success, Failed, Blacklisted, Low Balance
    detected_at = Column(DateTime, server_default=func.now())

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(30), unique=True, nullable=False, index=True)
    type = Column(String(50), nullable=False)  # FASTag Cloning, Plate Spoofing, Tailgating, Watchlist Match
    vehicle = Column(String(20), nullable=True, index=True)
    plaza = Column(String(100), nullable=True)
    severity = Column(String(20), nullable=False)  # Critical, High, Medium, Low
    status = Column(String(30), default="New")  # New, In Progress, Acknowledged
    assigned_to = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(30), unique=True, nullable=False, index=True)
    vehicle = Column(String(20), nullable=True, index=True)
    type = Column(String(50), nullable=False)
    plaza = Column(String(100), nullable=True)
    risk_score = Column(Numeric(5, 2), nullable=True)
    status = Column(String(50), default="New")  # New, Under Review, Evidence Collected, Closed
    priority = Column(String(20), nullable=True)  # High, Medium, New
    created_at = Column(DateTime, server_default=func.now())

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(30), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # image, log, csv
    file_path = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now())

class Plaza(Base):
    __tablename__ = "plazas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    state = Column(String(50), nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    risk_score = Column(Integer, default=0)
    total_lanes = Column(Integer, default=0)
    active_lanes = Column(Integer, default=0)


class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications_feed"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(String(2000), nullable=False)
    category = Column(String(50), nullable=False, default="system")  # AI Detection, Fraud, Camera, Toll, User, Security, System
    icon = Column(String(50), nullable=True)
    priority = Column(String(20), nullable=True, default="normal")  # low, normal, high, critical
    status = Column(String(20), nullable=False, default="unread")  # unread, read
    action_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    # optional free-form metadata (stored as text to remain compatible with SQLite fallback)
    meta = Column(String(2000), nullable=True)
