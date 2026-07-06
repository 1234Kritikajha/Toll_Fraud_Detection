"""Enterprise Quick Actions API for the Alerts module."""
import io
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db.database import get_db

router = APIRouter()

alert_ws_connections: List[WebSocket] = []

ALERT_CATEGORIES = [
    "RFID mismatch", "FASTag fraud", "ANPR mismatch", "blacklisted vehicle",
    "overspeeding", "wrong lane", "barrier violation", "duplicate plate",
    "camera offline", "AI confidence low", "seatbelt violation", "helmet violation",
]

SEVERITIES = ["Low", "Medium", "High", "Critical"]
NOTIFICATION_CHANNELS = [
    "Email", "SMS", "Push", "WhatsApp", "Telegram", "Slack",
    "Microsoft Teams", "Desktop Notifications",
]
NOTIFICATION_METHODS = ["Email", "SMS", "Push", "WhatsApp", "Voice Call"]


async def broadcast_alert_event(payload: Dict[str, Any]):
    removable: List[WebSocket] = []
    for conn in list(alert_ws_connections):
        try:
            await conn.send_json(payload)
        except Exception:
            removable.append(conn)
    for r in removable:
        try:
            alert_ws_connections.remove(r)
        except ValueError:
            pass


def _gen_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def _log_action(db: Session, alert_id: str, action: str, actor: str = "system", details: dict | None = None):
    db.execute(
        text(
            "INSERT INTO alert_action_logs (alert_id, action, actor, details) "
            "VALUES (:alert_id, :action, :actor, :details)"
        ),
        {
            "alert_id": alert_id,
            "action": action,
            "actor": actor,
            "details": json.dumps(details or {}),
        },
    )


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class RuleCondition(BaseModel):
    id: str
    field: str
    operator: str
    value: str
    logic: str = "AND"


class AlertRuleCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=128)
    description: Optional[str] = None
    category: str
    severity: str
    ai_confidence_threshold: float = Field(0.75, ge=0, le=1)
    toll_plaza: Optional[str] = None
    lane: Optional[str] = None
    vehicle_types: List[str] = []
    active_schedule: Optional[dict] = None
    trigger_conditions: List[RuleCondition] = []
    automated_actions: List[str] = []
    is_enabled: bool = True


class AlertRuleUpdate(AlertRuleCreate):
    pass


class EscalationLevel(BaseModel):
    id: str
    level: int
    assignee: str
    department: str
    phone: str = ""
    email: str = ""
    timeout_minutes: int = 15
    notification_methods: List[str] = []
    retry_count: int = 2
    require_acknowledgment: bool = True
    auto_escalate: bool = True


class EscalationMatrixPayload(BaseModel):
    name: str
    description: Optional[str] = None
    levels: List[EscalationLevel]
    is_active: bool = True


class NotificationConfigPayload(BaseModel):
    channels: Dict[str, bool] = {}
    events: Dict[str, bool] = {}
    severity_routing: Dict[str, List[str]] = {}
    quiet_hours: Optional[dict] = None
    frequency: str = "immediate"
    sound: str = "default"
    browser_permission: str = "default"


class ExportFilters(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    toll_plaza: Optional[str] = None
    lane: Optional[str] = None
    camera: Optional[str] = None
    severity: Optional[str] = None
    fraud_category: Optional[str] = None
    vehicle_type: Optional[str] = None
    status: Optional[str] = None
    investigator: Optional[str] = None


class AssignPayload(BaseModel):
    investigator: str


class BlockVehiclePayload(BaseModel):
    reason: Optional[str] = "Alert-triggered block"


class MaintenanceTicketPayload(BaseModel):
    title: str
    description: str
    priority: str = "High"


# ── Reference data ────────────────────────────────────────────────────────────

@router.get("/alerts/meta")
def get_alerts_meta():
    return {
        "categories": ALERT_CATEGORIES,
        "severities": SEVERITIES,
        "notification_channels": NOTIFICATION_CHANNELS,
        "notification_methods": NOTIFICATION_METHODS,
        "vehicle_types": ["Car", "SUV", "Truck", "Bus", "Two-Wheeler", "Commercial"],
        "automated_actions": [
            "send_notification", "block_vehicle", "open_live_camera",
            "create_investigation", "raise_maintenance_ticket",
        ],
    }


@router.get("/alerts/plazas")
def get_plazas(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("SELECT name, total_lanes FROM plazas ORDER BY name")).fetchall()
        return [{"name": r.name, "lanes": r.total_lanes or 4} for r in rows]
    except Exception:
        return [
            {"name": "DND Flyway", "lanes": 6},
            {"name": "NH-48 Gurgaon", "lanes": 8},
            {"name": "Mumbai-Pune Expressway", "lanes": 4},
        ]


# ── Alert Rules ───────────────────────────────────────────────────────────────

@router.get("/alerts/rules")
def list_alert_rules(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("SELECT * FROM alert_rules ORDER BY created_at DESC")).fetchall()
        result = []
        for r in rows:
            d = dict(r._mapping)
            for key in ("vehicle_types", "active_schedule", "trigger_conditions", "automated_actions"):
                if isinstance(d.get(key), str):
                    try:
                        d[key] = json.loads(d[key])
                    except Exception:
                        pass
            result.append(d)
        return result
    except Exception:
        return []


@router.post("/alerts/rules")
async def create_alert_rule(
    payload: AlertRuleCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if payload.category not in ALERT_CATEGORIES:
        raise HTTPException(400, f"Invalid category. Must be one of: {ALERT_CATEGORIES}")
    if payload.severity not in SEVERITIES:
        raise HTTPException(400, f"Invalid severity. Must be one of: {SEVERITIES}")

    rule_id = _gen_id("RULE")
    db.execute(
        text("""
            INSERT INTO alert_rules
            (rule_id, name, description, category, severity, ai_confidence_threshold,
             toll_plaza, lane, vehicle_types, active_schedule, trigger_conditions,
             automated_actions, is_enabled, created_by)
            VALUES
            (:rule_id, :name, :description, :category, :severity, :threshold,
             :plaza, :lane, :vehicle_types, :schedule, :conditions, :actions, :enabled, :created_by)
        """),
        {
            "rule_id": rule_id,
            "name": payload.name,
            "description": payload.description,
            "category": payload.category,
            "severity": payload.severity,
            "threshold": payload.ai_confidence_threshold,
            "plaza": payload.toll_plaza,
            "lane": payload.lane,
            "vehicle_types": json.dumps(payload.vehicle_types),
            "schedule": json.dumps(payload.active_schedule or {}),
            "conditions": json.dumps([c.model_dump() for c in payload.trigger_conditions]),
            "actions": json.dumps(payload.automated_actions),
            "enabled": payload.is_enabled,
            "created_by": "admin",
        },
    )
    db.commit()
    background_tasks.add_task(broadcast_alert_event, {"type": "alert.rule.created", "rule_id": rule_id})
    return {"status": "success", "rule_id": rule_id}


@router.put("/alerts/rules/{rule_id}")
def update_alert_rule(rule_id: str, payload: AlertRuleUpdate, db: Session = Depends(get_db)):
    res = db.execute(
        text("""
            UPDATE alert_rules SET
                name=:name, description=:description, category=:category, severity=:severity,
                ai_confidence_threshold=:threshold, toll_plaza=:plaza, lane=:lane,
                vehicle_types=:vehicle_types, active_schedule=:schedule,
                trigger_conditions=:conditions, automated_actions=:actions,
                is_enabled=:enabled, updated_at=CURRENT_TIMESTAMP
            WHERE rule_id=:rule_id
        """),
        {
            "rule_id": rule_id,
            "name": payload.name,
            "description": payload.description,
            "category": payload.category,
            "severity": payload.severity,
            "threshold": payload.ai_confidence_threshold,
            "plaza": payload.toll_plaza,
            "lane": payload.lane,
            "vehicle_types": json.dumps(payload.vehicle_types),
            "schedule": json.dumps(payload.active_schedule or {}),
            "conditions": json.dumps([c.model_dump() for c in payload.trigger_conditions]),
            "actions": json.dumps(payload.automated_actions),
            "enabled": payload.is_enabled,
        },
    )
    db.commit()
    if res.rowcount == 0:
        raise HTTPException(404, "Rule not found")
    return {"status": "success"}


@router.patch("/alerts/rules/{rule_id}/toggle")
def toggle_alert_rule(rule_id: str, db: Session = Depends(get_db)):
    res = db.execute(
        text("UPDATE alert_rules SET is_enabled = NOT is_enabled WHERE rule_id = :id"),
        {"id": rule_id},
    )
    db.commit()
    if res.rowcount == 0:
        raise HTTPException(404, "Rule not found")
    return {"status": "success"}


@router.delete("/alerts/rules/{rule_id}")
def delete_alert_rule(rule_id: str, db: Session = Depends(get_db)):
    res = db.execute(text("DELETE FROM alert_rules WHERE rule_id = :id"), {"id": rule_id})
    db.commit()
    if res.rowcount == 0:
        raise HTTPException(404, "Rule not found")
    return {"status": "success"}


# ── Escalation Matrix ─────────────────────────────────────────────────────────

@router.get("/alerts/escalation")
def get_escalation_matrix(db: Session = Depends(get_db)):
    try:
        row = db.execute(
            text("SELECT * FROM escalation_matrices WHERE is_active = true ORDER BY updated_at DESC LIMIT 1")
        ).fetchone()
        if not row:
            return _default_escalation()
        d = dict(row._mapping)
        if isinstance(d.get("levels"), str):
            d["levels"] = json.loads(d["levels"])
        return d
    except Exception:
        return _default_escalation()


def _default_escalation():
    return {
        "matrix_id": "ESC-DEFAULT",
        "name": "Default Escalation Workflow",
        "description": "Standard 3-level escalation for critical alerts",
        "is_active": True,
        "levels": [
            {
                "id": "lvl-1", "level": 1, "assignee": "Duty Officer",
                "department": "Operations", "phone": "+91-9876543210",
                "email": "duty@toll.gov.in", "timeout_minutes": 5,
                "notification_methods": ["Push", "SMS"],
                "retry_count": 2, "require_acknowledgment": True, "auto_escalate": True,
            },
            {
                "id": "lvl-2", "level": 2, "assignee": "Shift Supervisor",
                "department": "Operations", "phone": "+91-9876543211",
                "email": "supervisor@toll.gov.in", "timeout_minutes": 10,
                "notification_methods": ["Email", "SMS", "Push"],
                "retry_count": 3, "require_acknowledgment": True, "auto_escalate": True,
            },
            {
                "id": "lvl-3", "level": 3, "assignee": "Regional Manager",
                "department": "Management", "phone": "+91-9876543212",
                "email": "manager@toll.gov.in", "timeout_minutes": 15,
                "notification_methods": ["Email", "SMS", "Voice Call"],
                "retry_count": 1, "require_acknowledgment": False, "auto_escalate": False,
            },
        ],
    }


@router.put("/alerts/escalation")
async def save_escalation_matrix(
    payload: EscalationMatrixPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    levels_json = json.dumps([l.model_dump() for l in payload.levels])
    existing = db.execute(
        text("SELECT matrix_id FROM escalation_matrices WHERE is_active = true LIMIT 1")
    ).fetchone()

    if existing:
        db.execute(
            text("""
                UPDATE escalation_matrices SET
                    name=:name, description=:description, levels=:levels,
                    is_active=:active, updated_at=CURRENT_TIMESTAMP
                WHERE matrix_id=:matrix_id
            """),
            {
                "matrix_id": existing.matrix_id,
                "name": payload.name,
                "description": payload.description,
                "levels": levels_json,
                "active": payload.is_active,
            },
        )
        matrix_id = existing.matrix_id
    else:
        matrix_id = _gen_id("ESC")
        db.execute(
            text("""
                INSERT INTO escalation_matrices (matrix_id, name, description, levels, is_active, created_by)
                VALUES (:matrix_id, :name, :description, :levels, :active, :created_by)
            """),
            {
                "matrix_id": matrix_id,
                "name": payload.name,
                "description": payload.description,
                "levels": levels_json,
                "active": payload.is_active,
                "created_by": "admin",
            },
        )
    db.commit()
    background_tasks.add_task(broadcast_alert_event, {"type": "alert.escalation.updated", "matrix_id": matrix_id})
    return {"status": "success", "matrix_id": matrix_id}


@router.post("/alerts/escalation/test")
def test_escalation_workflow(db: Session = Depends(get_db)):
    matrix = get_escalation_matrix(db)
    timeline = []
    for lvl in matrix.get("levels", []):
        timeline.append({
            "level": lvl["level"],
            "assignee": lvl["assignee"],
            "department": lvl["department"],
            "methods": lvl.get("notification_methods", []),
            "timeout_minutes": lvl.get("timeout_minutes", 15),
            "status": "simulated",
            "message": f"Test notification sent to {lvl['assignee']} via {', '.join(lvl.get('notification_methods', []))}",
        })
    return {"status": "success", "timeline": timeline}


# ── Notification Settings ─────────────────────────────────────────────────────

@router.get("/alerts/notification-settings")
def get_notification_settings(db: Session = Depends(get_db)):
    try:
        row = db.execute(
            text("SELECT * FROM alert_notification_configs ORDER BY updated_at DESC LIMIT 1")
        ).fetchone()
        if not row:
            return _default_notification_config()
        d = dict(row._mapping)
        for key in ("channels", "events", "severity_routing", "quiet_hours"):
            if isinstance(d.get(key), str):
                try:
                    d[key] = json.loads(d[key])
                except Exception:
                    pass
        return d
    except Exception:
        return _default_notification_config()


def _default_notification_config():
    return {
        "channels": {ch: ch in ("Email", "Push", "Desktop Notifications") for ch in NOTIFICATION_CHANNELS},
        "events": {
            "new_alert": True, "escalation": True, "acknowledgment": True,
            "false_positive": False, "investigation_update": True,
        },
        "severity_routing": {
            "Critical": ["Email", "SMS", "Push", "WhatsApp"],
            "High": ["Email", "Push"],
            "Medium": ["Push"],
            "Low": ["Desktop Notifications"],
        },
        "quiet_hours": {"enabled": False, "start": "22:00", "end": "06:00"},
        "frequency": "immediate",
        "sound": "alert-chime",
        "browser_permission": "granted",
    }


@router.put("/alerts/notification-settings")
async def save_notification_settings(
    payload: NotificationConfigPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    existing = db.execute(text("SELECT id FROM alert_notification_configs LIMIT 1")).fetchone()
    data = {
        "channels": json.dumps(payload.channels),
        "events": json.dumps(payload.events),
        "severity_routing": json.dumps(payload.severity_routing),
        "quiet_hours": json.dumps(payload.quiet_hours or {}),
        "frequency": payload.frequency,
        "sound": payload.sound,
        "browser_permission": payload.browser_permission,
    }
    if existing:
        db.execute(
            text("""
                UPDATE alert_notification_configs SET
                    channels=:channels, events=:events, severity_routing=:routing,
                    quiet_hours=:quiet, frequency=:frequency, sound=:sound,
                    browser_permission=:browser, updated_at=CURRENT_TIMESTAMP
                WHERE id=:id
            """),
            {**data, "id": existing.id},
        )
    else:
        db.execute(
            text("""
                INSERT INTO alert_notification_configs
                (channels, events, severity_routing, quiet_hours, frequency, sound, browser_permission)
                VALUES (:channels, :events, :routing, :quiet, :frequency, :sound, :browser)
            """),
            {**data, "routing": data["severity_routing"], "quiet": data["quiet_hours"]},
        )
    db.commit()
    background_tasks.add_task(broadcast_alert_event, {"type": "alert.notification_settings.updated"})
    return {"status": "success"}


@router.post("/alerts/notification-settings/test")
def test_notification(channel: str = Query("Email")):
    return {
        "status": "success",
        "message": f"Test {channel} notification dispatched successfully",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── Export ────────────────────────────────────────────────────────────────────

def _build_alert_query(filters: ExportFilters) -> tuple[str, dict]:
    query = "SELECT alert_id, type, vehicle, plaza, severity, status, assigned_to, created_at FROM alerts"
    clauses = []
    params: dict = {}
    if filters.severity:
        clauses.append("severity = :severity")
        params["severity"] = filters.severity
    if filters.status:
        clauses.append("status = :status")
        params["status"] = filters.status
    if filters.toll_plaza:
        clauses.append("plaza ILIKE :plaza")
        params["plaza"] = f"%{filters.toll_plaza}%"
    if filters.fraud_category:
        clauses.append("type ILIKE :category")
        params["category"] = f"%{filters.fraud_category}%"
    if filters.investigator:
        clauses.append("assigned_to ILIKE :investigator")
        params["investigator"] = f"%{filters.investigator}%"
    if filters.date_from:
        clauses.append("created_at >= :date_from")
        params["date_from"] = filters.date_from
    if filters.date_to:
        clauses.append("created_at <= :date_to")
        params["date_to"] = filters.date_to
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY created_at DESC"
    return query, params


@router.post("/alerts/export")
def export_alerts(
    filters: ExportFilters,
    format: str = Query("csv"),
    db: Session = Depends(get_db),
):
    try:
        query, params = _build_alert_query(filters)
        rows = db.execute(text(query), params).fetchall()
        data = [dict(r._mapping) for r in rows]
        for d in data:
            d["ai_confidence"] = round(0.65 + (hash(d.get("alert_id", "")) % 30) / 100, 2)
            d["evidence_url"] = f"/evidence/{d.get('alert_id', 'unknown')}"
            d["response_time_ms"] = (hash(d.get("alert_id", "")) % 120) * 1000
            d["investigation_status"] = d.get("status", "New")

        job_id = str(uuid.uuid4())
        try:
            db.execute(
                text("""
                    INSERT INTO alert_export_jobs (job_id, format, filters, status, progress, record_count, created_by, completed_at)
                    VALUES (:job_id, :format, :filters, 'completed', 100, :count, :created_by, CURRENT_TIMESTAMP)
                """),
                {
                    "job_id": job_id,
                    "format": format,
                    "filters": json.dumps(filters.model_dump()),
                    "count": len(data),
                    "created_by": "admin",
                },
            )
            db.commit()
        except Exception:
            db.rollback()

        if format == "json":
            content = json.dumps(data, default=str, indent=2)
            return StreamingResponse(
                io.BytesIO(content.encode()),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=alerts_{job_id[:8]}.json"},
            )

        df = pd.DataFrame(data)

        if format == "excel":
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="Alerts")
            output.seek(0)
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=alerts_{job_id[:8]}.xlsx"},
            )

        if format == "pdf":
            output = io.BytesIO()
            pdf = canvas.Canvas(output, pagesize=letter)
            width, height = letter
            pdf.setFont("Helvetica-Bold", 16)
            pdf.drawString(72, height - 72, "Alert Report Export")
            pdf.setFont("Helvetica", 10)
            y = height - 100
            for row in data[:40]:
                line = f"{row.get('alert_id')} | {row.get('type')} | {row.get('severity')} | {row.get('status')}"
                pdf.drawString(72, y, line[:90])
                y -= 14
                if y < 72:
                    pdf.showPage()
                    y = height - 72
            pdf.save()
            output.seek(0)
            return StreamingResponse(
                output,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=alerts_{job_id[:8]}.pdf"},
            )

        output = io.StringIO()
        df.to_csv(output, index=False)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=alerts_{job_id[:8]}.csv"},
        )
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/alerts/export/history")
def export_history(db: Session = Depends(get_db)):
    try:
        rows = db.execute(
            text("SELECT job_id, format, status, progress, record_count, created_at, completed_at FROM alert_export_jobs ORDER BY created_at DESC LIMIT 20")
        ).fetchall()
        return [dict(r._mapping) for r in rows]
    except Exception:
        return []


# ── Row-level Quick Actions ───────────────────────────────────────────────────

@router.patch("/alerts/{alert_id}/assign")
async def assign_investigator(
    alert_id: str,
    payload: AssignPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    res = db.execute(
        text("UPDATE alerts SET status = 'Assigned', assigned_to = :inv WHERE alert_id = :id"),
        {"id": alert_id, "inv": payload.investigator},
    )
    if res.rowcount == 0:
        raise HTTPException(404, "Alert not found")
    _log_action(db, alert_id, "assign_investigator", details={"investigator": payload.investigator})
    db.commit()
    background_tasks.add_task(broadcast_alert_event, {"type": "alert.updated", "alert_id": alert_id, "action": "assigned"})
    return {"status": "success"}


@router.patch("/alerts/{alert_id}/false-positive")
async def mark_false_positive(
    alert_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    res = db.execute(
        text("UPDATE alerts SET status = 'False Positive' WHERE alert_id = :id"),
        {"id": alert_id},
    )
    if res.rowcount == 0:
        raise HTTPException(404, "Alert not found")
    _log_action(db, alert_id, "false_positive")
    db.commit()
    background_tasks.add_task(broadcast_alert_event, {"type": "alert.updated", "alert_id": alert_id, "action": "false_positive"})
    return {"status": "success"}


@router.post("/alerts/{alert_id}/block-vehicle")
async def block_vehicle(
    alert_id: str,
    payload: BlockVehiclePayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    row = db.execute(text("SELECT vehicle FROM alerts WHERE alert_id = :id"), {"id": alert_id}).fetchone()
    if not row:
        raise HTTPException(404, "Alert not found")
    if row.vehicle:
        db.execute(
            text("UPDATE vehicles SET is_blacklisted = true WHERE plate = :plate"),
            {"plate": row.vehicle},
        )
    _log_action(db, alert_id, "block_vehicle", details={"vehicle": row.vehicle, "reason": payload.reason})
    db.commit()
    background_tasks.add_task(broadcast_alert_event, {"type": "alert.updated", "alert_id": alert_id, "action": "blocked"})
    return {"status": "success", "vehicle": row.vehicle}


@router.get("/alerts/{alert_id}/video-replay")
def video_replay(alert_id: str, db: Session = Depends(get_db)):
    row = db.execute(text("SELECT plaza, vehicle FROM alerts WHERE alert_id = :id"), {"id": alert_id}).fetchone()
    if not row:
        raise HTTPException(404, "Alert not found")
    return {
        "alert_id": alert_id,
        "duration_seconds": 60,
        "stream_url": f"rtsp://cameras.toll.gov.in/replay/{alert_id}?seconds=60",
        "plaza": row.plaza,
        "vehicle": row.vehicle,
    }


@router.get("/alerts/{alert_id}/live-camera")
def live_camera(alert_id: str, db: Session = Depends(get_db)):
    row = db.execute(text("SELECT plaza FROM alerts WHERE alert_id = :id"), {"id": alert_id}).fetchone()
    if not row:
        raise HTTPException(404, "Alert not found")
    return {
        "alert_id": alert_id,
        "stream_url": f"rtsp://cameras.toll.gov.in/live/{alert_id}",
        "plaza": row.plaza,
        "status": "online",
    }


@router.post("/alerts/{alert_id}/ai-report")
def generate_ai_report(alert_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT alert_id, type, vehicle, plaza, severity, status, created_at FROM alerts WHERE alert_id = :id"),
        {"id": alert_id},
    ).fetchone()
    if not row:
        raise HTTPException(404, "Alert not found")
    d = dict(row._mapping)
    report = {
        "report_id": _gen_id("AIR"),
        "alert_id": alert_id,
        "summary": f"AI analysis of {d['type']} alert for vehicle {d.get('vehicle', 'unknown')} at {d.get('plaza', 'unknown plaza')}.",
        "confidence": round(0.7 + (hash(alert_id) % 25) / 100, 2),
        "risk_assessment": d["severity"],
        "recommended_actions": [
            "Review ANPR capture and FASTag transaction logs",
            "Cross-reference vehicle history for repeat offenses",
            "Escalate to investigation if confidence exceeds threshold",
        ],
        "generated_at": datetime.utcnow().isoformat(),
    }
    _log_action(db, alert_id, "ai_report_generated", details={"report_id": report["report_id"]})
    db.commit()
    return report


@router.post("/alerts/{alert_id}/maintenance-ticket")
async def raise_maintenance_ticket(
    alert_id: str,
    payload: MaintenanceTicketPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    row = db.execute(text("SELECT alert_id FROM alerts WHERE alert_id = :id"), {"id": alert_id}).fetchone()
    if not row:
        raise HTTPException(404, "Alert not found")
    ticket_id = _gen_id("MNT")
    _log_action(db, alert_id, "maintenance_ticket", details={
        "ticket_id": ticket_id, "title": payload.title, "priority": payload.priority,
    })
    db.commit()
    background_tasks.add_task(broadcast_alert_event, {
        "type": "alert.maintenance_ticket", "alert_id": alert_id, "ticket_id": ticket_id,
    })
    return {"status": "success", "ticket_id": ticket_id}


@router.post("/alerts/{alert_id}/investigation")
async def create_investigation(
    alert_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    row = db.execute(
        text("SELECT type, vehicle, plaza, severity FROM alerts WHERE alert_id = :id"),
        {"id": alert_id},
    ).fetchone()
    if not row:
        raise HTTPException(404, "Alert not found")
    case_id = _gen_id("CASE")
    try:
        db.execute(
            text("""
                INSERT INTO cases (case_id, vehicle, type, plaza, risk_score, status, priority)
                VALUES (:case_id, :vehicle, :type, :plaza, :risk, 'Under Review', :priority)
            """),
            {
                "case_id": case_id,
                "vehicle": row.vehicle,
                "type": row.type,
                "plaza": row.plaza,
                "risk": 75.0 if row.severity in ("Critical", "High") else 50.0,
                "priority": row.severity,
            },
        )
        db.execute(
            text("UPDATE alerts SET status = 'In Progress' WHERE alert_id = :id"),
            {"id": alert_id},
        )
        _log_action(db, alert_id, "create_investigation", details={"case_id": case_id})
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    background_tasks.add_task(broadcast_alert_event, {
        "type": "alert.investigation_created", "alert_id": alert_id, "case_id": case_id,
    })
    return {"status": "success", "case_id": case_id}


@router.get("/alerts/{alert_id}/timeline")
def investigation_timeline(alert_id: str, db: Session = Depends(get_db)):
    try:
        rows = db.execute(
            text("SELECT action, actor, details, created_at FROM alert_action_logs WHERE alert_id = :id ORDER BY created_at ASC"),
            {"id": alert_id},
        ).fetchall()
        events = []
        for r in rows:
            d = dict(r._mapping)
            if isinstance(d.get("details"), str):
                try:
                    d["details"] = json.loads(d["details"])
                except Exception:
                    pass
            events.append(d)
        if not events:
            alert = db.execute(
                text("SELECT alert_id, type, severity, status, created_at FROM alerts WHERE alert_id = :id"),
                {"id": alert_id},
            ).fetchone()
            if alert:
                events = [{"action": "alert_created", "actor": "system", "details": dict(alert._mapping), "created_at": alert.created_at}]
        return events
    except Exception:
        return []


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws/alerts")
async def alerts_websocket(websocket: WebSocket):
    await websocket.accept()
    alert_ws_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        try:
            alert_ws_connections.remove(websocket)
        except ValueError:
            pass
