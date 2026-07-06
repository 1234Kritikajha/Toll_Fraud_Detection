from __future__ import annotations

import enum
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    JSON,
    func,
)

JSONB = JSON
from sqlalchemy.orm import relationship

from .database import Base


class PermissionModule(str, enum.Enum):
    dashboard = "Dashboard"
    live_monitoring = "Live Monitoring"
    fraud_detection = "Fraud Detection"
    vehicle_intelligence = "Vehicle Intelligence"
    reports = "Reports"
    settings = "Settings"
    camera = "Camera"
    database = "Database"
    api = "API"
    ai_models = "AI Models"
    notification = "Notification"
    audit_logs = "Audit Logs"


class PermissionAction(str, enum.Enum):
    create = "Create"
    read = "Read"
    update = "Update"
    delete = "Delete"
    export = "Export"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(128), unique=True, nullable=False, index=True)
    phone_number = Column(String(32), nullable=True)

    employee_id = Column(String(64), nullable=True, index=True)
    department = Column(String(128), nullable=True)
    designation = Column(String(128), nullable=True)

    role_display = Column(String(128), nullable=True)
    address = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    is_super_admin = Column(Boolean, default=False, nullable=False)

    password_hash = Column(String(255), nullable=False)

    last_login_at = Column(DateTime(timezone=True), nullable=True)

    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String(255), nullable=True)

    profile_image_path = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship removed until proper user-role association exists.
    roles = []


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)

    is_system = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    module = Column(Enum(PermissionModule), nullable=False)
    action = Column(Enum(PermissionAction), nullable=False)

    __table_args__ = (
        UniqueConstraint("module", "action", name="uq_permissions_module_action"),
    )


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    refresh_token_hash = Column(String(255), nullable=True)
    jwt_jti = Column(String(64), unique=True, nullable=True, index=True)

    user_agent = Column(String(255), nullable=True)
    ip_address = Column(String(64), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(64), nullable=True)

    ip_address = Column(String(64), nullable=True)
    browser = Column(String(128), nullable=True)
    operating_system = Column(String(128), nullable=True)
    device = Column(String(128), nullable=True)

    status = Column(String(32), nullable=False, default="success")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    username = Column(String(64), nullable=True)
    role = Column(String(128), nullable=True)

    action = Column(String(64), nullable=False)
    module = Column(String(128), nullable=True)

    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)

    ip_address = Column(String(64), nullable=True)
    browser = Column(String(128), nullable=True)
    operating_system = Column(String(128), nullable=True)
    device = Column(String(128), nullable=True)


class CameraSetting(Base):
    __tablename__ = "camera_settings"

    id = Column(Integer, primary_key=True, index=True)

    camera_name = Column(String(128), nullable=False)
    camera_location = Column(String(255), nullable=True)
    lane_number = Column(Integer, nullable=True)
    camera_type = Column(String(64), nullable=True)

    rtsp_url = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    port = Column(Integer, nullable=True)

    resolution = Column(String(32), nullable=True)
    fps = Column(Integer, nullable=True)

    ocr_enabled = Column(Boolean, default=False, nullable=False)
    vehicle_detection_enabled = Column(Boolean, default=True, nullable=False)

    helmet_detection_enabled = Column(Boolean, default=False, nullable=False)
    seat_belt_detection_enabled = Column(Boolean, default=False, nullable=False)
    speed_detection_enabled = Column(Boolean, default=False, nullable=False)

    night_mode = Column(Boolean, default=False, nullable=False)
    recording_enabled = Column(Boolean, default=False, nullable=False)

    health_status = Column(String(32), default="unknown", nullable=False)
    last_health_check_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AIModel(Base):
    __tablename__ = "ai_models"

    id = Column(Integer, primary_key=True, index=True)

    model_type = Column(String(128), nullable=False, unique=True, index=True)  # vehicle/plate/ocr/fraud/helmet/seat_belt
    enabled = Column(Boolean, default=True, nullable=False)

    current_version = Column(String(64), nullable=True)
    previous_version = Column(String(64), nullable=True)

    model_accuracy = Column(Float, nullable=True)
    confidence_threshold = Column(Float, nullable=True)

    model_file_path = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class NotificationSetting(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, index=True)

    email_alerts_enabled = Column(Boolean, default=False, nullable=False)
    sms_alerts_enabled = Column(Boolean, default=False, nullable=False)
    whatsapp_alerts_enabled = Column(Boolean, default=False, nullable=False)

    push_notification_enabled = Column(Boolean, default=False, nullable=False)
    desktop_notification_enabled = Column(Boolean, default=False, nullable=False)
    sound_alerts_enabled = Column(Boolean, default=False, nullable=False)
    emergency_alerts_enabled = Column(Boolean, default=False, nullable=False)

    smtp_host = Column(String(128), nullable=True)
    smtp_port = Column(Integer, nullable=True)
    smtp_username = Column(String(128), nullable=True)
    smtp_password = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)

    dark_theme_enabled = Column(Boolean, default=True, nullable=False)
    light_theme_enabled = Column(Boolean, default=True, nullable=False)

    accent_color = Column(String(32), nullable=True)
    language = Column(String(32), nullable=True)
    timezone = Column(String(64), nullable=True)
    date_format = Column(String(32), nullable=True)

    company_logo_path = Column(String(500), nullable=True)
    company_name = Column(String(255), nullable=True)
    footer_text = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class TollSetting(Base):
    __tablename__ = "toll_settings"

    id = Column(Integer, primary_key=True, index=True)

    fastag_api_base_url = Column(String(255), nullable=True)

    # JSON-based configuration for rules/mappings
    penalty_rules = Column(JSONB, nullable=True)
    blacklist_rules = Column(JSONB, nullable=True)
    emergency_vehicle_rules = Column(JSONB, nullable=True)
    vip_vehicle_rules = Column(JSONB, nullable=True)
    lane_mapping = Column(JSONB, nullable=True)

    vehicle_categories = Column(JSONB, nullable=True)
    toll_charges = Column(JSONB, nullable=True)
    speed_limit = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(128), nullable=False)
    key_hash = Column(String(255), nullable=False, unique=True, index=True)

    revoked_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)


class DatabaseBackup(Base):
    __tablename__ = "database_backups"

    id = Column(Integer, primary_key=True, index=True)

    status = Column(String(32), default="ready", nullable=False)
    backup_type = Column(String(32), default="postgres", nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    size_bytes = Column(Integer, nullable=True)
    storage_path = Column(String(500), nullable=True)


class NotificationModelConfig(Base):
    __tablename__ = "model_configuration"

    id = Column(Integer, primary_key=True, index=True)

    config = Column(JSONB, nullable=False, server_default="{}")

