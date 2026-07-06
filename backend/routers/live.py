# routers/live.py
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db.database import get_db

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)


manager = ConnectionManager()


def _status_color(status: str) -> str:
    if status in ("Success", "Paid"):
        return "text-green-600 bg-green-50"
    if status in ("Blacklisted", "Cloned", "Failed"):
        return "text-red-700 bg-red-100"
    return "text-yellow-600 bg-yellow-50"


@router.websocket("/ws/live")
async def websocket_live_stream(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    Streams recent database transactions only. No simulated plates or statuses are generated.
    """
    await manager.connect(websocket)
    last_seen_id = 0
    try:
        while True:
            rows = db.execute(
                text(
                    """
                    SELECT id, plate, fastag_id, plaza, lane, amount, status, detected_at
                    FROM transactions
                    WHERE id > :last_seen_id
                    ORDER BY id ASC
                    LIMIT 20
                    """
                ),
                {"last_seen_id": last_seen_id},
            ).fetchall()

            for row in rows:
                mapped = dict(row._mapping)
                last_seen_id = max(last_seen_id, mapped["id"])
                detected_at = mapped.get("detected_at")
                event = {
                    "time": detected_at.strftime("%I:%M:%S %p") if detected_at else "",
                    "tag": mapped.get("fastag_id") or "",
                    "vehicle": mapped.get("plate") or "UNKNOWN",
                    "status": mapped.get("status") or "",
                    "amount": f"Rs {float(mapped.get('amount') or 0):.2f}",
                    "lane": mapped.get("lane") or "",
                    "plaza": mapped.get("plaza") or "",
                    "color": _status_color(mapped.get("status") or ""),
                    "plate": mapped.get("plate") or "UNKNOWN",
                    "desc": mapped.get("plaza") or "Detected from trained model",
                    "conf": "",
                }
                await websocket.send_text(json.dumps(event))

            await asyncio.sleep(2.5)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
