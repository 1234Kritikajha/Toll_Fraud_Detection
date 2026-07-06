# routers/alerts.py
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..db.database import get_db

try:
    from .alert_quick_actions import broadcast_alert_event
except ImportError:
    from backend.routers.alert_quick_actions import broadcast_alert_event

router = APIRouter()

@router.get("/alerts")
def get_alerts(
    severity: str = Query(None),
    status: str = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """
    Returns alerts log with optional severity and status filtering.
    """
    try:
        query = "SELECT alert_id, type, vehicle, plaza, severity, status, assigned_to, created_at FROM alerts"
        filters = []
        params = {}
        
        if severity:
            filters.append("severity = :severity")
            params["severity"] = severity
        if status:
            filters.append("status = :status")
            params["status"] = status
            
        if filters:
            query += " WHERE " + " AND ".join(filters)
            
        query += " ORDER BY created_at DESC LIMIT :limit"
        params["limit"] = limit
        
        rows = db.execute(text(query), params).fetchall()
        
        result = []
        for r in rows:
            mapped = dict(r._mapping)
            # Format elapsed time for frontend (e.g. '2 min ago')
            mapped["time"] = "Just now" # simplified or dynamic formatting can go here
            result.append(mapped)
            
        return result
    except Exception as e:
        print(f"Error querying alerts: {e}")
        return []

@router.patch("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Acknowledges a critical or high priority alert."""
    try:
        res = db.execute(
            text("UPDATE alerts SET status = 'Acknowledged' WHERE alert_id = :id"),
            {"id": alert_id},
        )
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        db.execute(
            text(
                "INSERT INTO alert_action_logs (alert_id, action, actor, details) "
                "VALUES (:alert_id, 'acknowledge', 'operator', '{}')"
            ),
            {"alert_id": alert_id},
        )
        db.commit()
        background_tasks.add_task(
            broadcast_alert_event,
            {"type": "alert.updated", "alert_id": alert_id, "action": "acknowledged"},
        )
        return {"status": "success", "message": "Alert acknowledged successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
