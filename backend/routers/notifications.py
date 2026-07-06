from typing import List, Dict, Any
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db.database import get_db
from ..db.models import Notification
from pydantic import BaseModel, Field
from datetime import datetime

router = APIRouter()

# In-memory set of active websocket connections. For multi-process production use Redis/Channels.
active_connections: List[WebSocket] = []

class NotificationCreate(BaseModel):
    title: str = Field(..., max_length=255)
    message: str = Field(..., max_length=2000)
    category: str = Field("system")
    icon: str | None = None
    priority: str | None = "normal"
    action_url: str | None = None
    meta: str | None = None

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    category: str
    icon: str | None
    priority: str | None
    status: str
    action_url: str | None
    created_at: datetime
    meta: str | None

async def broadcast(payload: Dict[str, Any]):
    removable: List[WebSocket] = []
    for conn in list(active_connections):
        try:
            await conn.send_json(payload)
        except Exception:
            removable.append(conn)
    for r in removable:
        try:
            active_connections.remove(r)
        except ValueError:
            pass

@router.post("/notifications", response_model=NotificationOut)
def create_notification(payload: NotificationCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    n = Notification(
        title=payload.title,
        message=payload.message,
        category=payload.category,
        icon=payload.icon,
        priority=payload.priority,
        action_url=payload.action_url,
        meta=payload.meta,
    )
    db.add(n)
    db.commit()
    db.refresh(n)

    # Broadcast to connected clients
    background_tasks.add_task(broadcast, {
        "type": "notification.new",
        "notification": {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "category": n.category,
            "icon": n.icon,
            "priority": n.priority,
            "status": n.status,
            "action_url": n.action_url,
            "created_at": n.created_at.isoformat(),
            "meta": n.meta,
        }
    })

    return n

@router.get("/notifications", response_model=List[NotificationOut])
def list_notifications(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT * FROM notifications_feed ORDER BY created_at DESC LIMIT :limit OFFSET :offset"),
        {"limit": limit, "offset": offset},
    ).fetchall()
    return [NotificationOut(**{k: v for k, v in dict(row._mapping).items()}) for row in rows]

@router.get("/notifications/unread_count")
def unread_count(db: Session = Depends(get_db)):
    row = db.execute(text("SELECT COUNT(1) as cnt FROM notifications_feed WHERE status='unread'"))
    cnt = row.scalar() if row is not None else 0
    return {"unread": int(cnt)}

@router.put("/notifications/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db)):
    res = db.execute(text("UPDATE notifications_feed SET status='read' WHERE id=:id"), {"id": notification_id})
    db.commit()
    return {"ok": True}

@router.put("/notifications/mark_all_read")
def mark_all_read(db: Session = Depends(get_db)):
    db.execute(text("UPDATE notifications_feed SET status='read' WHERE status='unread'"))
    db.commit()
    return {"ok": True}

@router.delete("/notifications/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM notifications_feed WHERE id=:id"), {"id": notification_id})
    db.commit()
    return {"ok": True}

@router.delete("/notifications/clear_all")
def clear_all(db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM notifications_feed"))
    db.commit()
    return {"ok": True}

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # keep the connection alive; clients may send pings or commands
            data = await websocket.receive_text()
            # support simple ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        try:
            active_connections.remove(websocket)
        except ValueError:
            pass