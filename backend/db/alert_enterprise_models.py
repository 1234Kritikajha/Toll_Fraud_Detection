"""Enterprise alert quick-action persistence models."""
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, JSON, func

from .database import Base

JSONB = JSON


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(64), nullable=False)
    severity = Column(String(20), nullable=False)
    ai_confidence_threshold = Column(Float, default=0.75)
    toll_plaza = Column(String(100), nullable=True)
    lane = Column(String(20), nullable=True)
    vehicle_types = Column(JSONB, nullable=True)
    active_schedule = Column(JSONB, nullable=True)
    trigger_conditions = Column(JSONB, nullable=True)
    automated_actions = Column(JSONB, nullable=True)
    is_enabled = Column(Boolean, default=True, nullable=False)
    created_by = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class EscalationMatrix(Base):
    __tablename__ = "escalation_matrices"

    id = Column(Integer, primary_key=True, index=True)
    matrix_id = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    levels = Column(JSONB, nullable=False, default=list)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AlertNotificationConfig(Base):
    __tablename__ = "alert_notification_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    channels = Column(JSONB, nullable=False, default=dict)
    events = Column(JSONB, nullable=True)
    severity_routing = Column(JSONB, nullable=True)
    quiet_hours = Column(JSONB, nullable=True)
    frequency = Column(String(32), default="immediate")
    sound = Column(String(64), default="default")
    browser_permission = Column(String(32), default="default")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AlertExportJob(Base):
    __tablename__ = "alert_export_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(36), unique=True, nullable=False, index=True)
    format = Column(String(10), nullable=False)
    filters = Column(JSONB, nullable=True)
    status = Column(String(20), default="pending")
    progress = Column(Integer, default=0)
    file_path = Column(String(500), nullable=True)
    record_count = Column(Integer, default=0)
    created_by = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class AlertActionLog(Base):
    __tablename__ = "alert_action_logs"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(30), nullable=False, index=True)
    action = Column(String(64), nullable=False)
    actor = Column(String(64), nullable=True)
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
