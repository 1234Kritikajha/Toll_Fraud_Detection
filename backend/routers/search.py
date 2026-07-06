import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db.database import get_db
from ..db.models import SearchHistory

router = APIRouter()

PLATE_REGEX = re.compile(r"^[A-Z]{2}\d{1,2}[A-Z]{1,2}\d{4}$")
FASTAG_REGEX = re.compile(r"^FASTAG\w+", re.IGNORECASE)
TRANSACTION_REGEX = re.compile(r"^TXN\w+", re.IGNORECASE)
CHALLAN_REGEX = re.compile(r"^CH\w+", re.IGNORECASE)
CAMERA_REGEX = re.compile(r"^(CAMERA|CAM)\s*\d+", re.IGNORECASE)
LANE_REGEX = re.compile(r"^LANE\s*\d+", re.IGNORECASE)
DATE_KEYWORDS = {"today", "yesterday", "last 24 hours", "last 7 days", "last 30 days"}


def normalize_query(query: str) -> str:
    return query.strip()


def detect_search_type(query: str) -> str:
    value = query.strip()
    if not value:
        return "global"
    if FASTAG_REGEX.match(value):
        return "fastag"
    if TRANSACTION_REGEX.match(value):
        return "transaction"
    if CHALLAN_REGEX.match(value):
        return "challan"
    if CAMERA_REGEX.match(value):
        return "camera"
    if LANE_REGEX.match(value):
        return "lane"
    if value.lower() in DATE_KEYWORDS:
        return "date_range"
    if PLATE_REGEX.match(value.replace(" ", "").upper()):
        return "plate"
    return "global"


def to_suggestion(item: dict, item_type: str):
    icons = {
        "vehicle": "🚗",
        "fastag": "🏷",
        "transaction": "💳",
        "challan": "📄",
        "camera": "📷",
        "plaza": "📍",
        "alert": "🚨",
        "general": "🔎",
    }
    return {
        "type": item_type,
        "label": item.get("label"),
        "value": item.get("value"),
        "subtitle": item.get("subtitle", ""),
        "icon": icons.get(item_type, "🔎"),
    }


def query_vehicles(db: Session, term: str, limit: int = 6):
    sql = text(
        """
        SELECT plate, make, model, color, fastag_id, is_blacklisted
        FROM vehicles
        WHERE UPPER(plate) LIKE :term
          OR UPPER(make) LIKE :term
          OR UPPER(model) LIKE :term
          OR UPPER(color) LIKE :term
          OR UPPER(fastag_id) LIKE :term
        LIMIT :limit
        """
    )
    return [dict(row._mapping) for row in db.execute(sql, {"term": f"%{term.upper()}%", "limit": limit}).fetchall()]


def query_transactions(db: Session, term: str, limit: int = 6):
    sql = text(
        """
        SELECT id, plate, fastag_id, plaza, lane, amount, status, detected_at
        FROM transactions
        WHERE CAST(id AS TEXT) LIKE :term
          OR UPPER(plate) LIKE :term
          OR UPPER(fastag_id) LIKE :term
          OR UPPER(plaza) LIKE :term
          OR UPPER(lane) LIKE :term
          OR UPPER(status) LIKE :term
        ORDER BY detected_at DESC
        LIMIT :limit
        """
    )
    return [dict(row._mapping) for row in db.execute(sql, {"term": f"%{term.upper()}%", "limit": limit}).fetchall()]


def query_alerts(db: Session, term: str, limit: int = 6):
    sql = text(
        """
        SELECT alert_id, type, vehicle, plaza, severity, status, created_at
        FROM alerts
        WHERE UPPER(alert_id) LIKE :term
          OR UPPER(type) LIKE :term
          OR UPPER(vehicle) LIKE :term
          OR UPPER(plaza) LIKE :term
          OR UPPER(severity) LIKE :term
          OR UPPER(status) LIKE :term
        ORDER BY created_at DESC
        LIMIT :limit
        """
    )
    return [dict(row._mapping) for row in db.execute(sql, {"term": f"%{term.upper()}%", "limit": limit}).fetchall()]


def save_search_history(db: Session, query: str):
    history = SearchHistory(query=query, created_at=datetime.utcnow())
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


@router.get("/search/suggestions")
def search_suggestions(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    query = normalize_query(q)
    kind = detect_search_type(query)
    suggestions = []

    if kind in {"plate", "fastag", "transaction", "challan", "camera", "lane"}:
        suggestions.append(to_suggestion({"label": query, "value": query}, kind))

    vehicles = query_vehicles(db, query)
    for vehicle in vehicles:
        suggestions.append(
            to_suggestion(
                {
                    "label": vehicle["plate"],
                    "value": vehicle["plate"],
                    "subtitle": f"{vehicle.get('make') or 'Unknown'} {vehicle.get('model') or ''}".strip(),
                },
                "vehicle",
            )
        )

    transactions = query_transactions(db, query)
    for tx in transactions:
        suggestions.append(
            to_suggestion(
                {
                    "label": f"TXN{tx['id']}",
                    "value": str(tx["id"]),
                    "subtitle": f"{tx.get('plaza')} · {tx.get('status')}",
                },
                "transaction",
            )
        )

    alerts = query_alerts(db, query)
    for alert in alerts:
        suggestions.append(
            to_suggestion(
                {
                    "label": alert["alert_id"],
                    "value": alert["alert_id"],
                    "subtitle": f"{alert.get('type')} · {alert.get('severity')}",
                },
                "alert",
            )
        )

    if not suggestions:
        suggestions.append(
            to_suggestion(
                {"label": query, "value": query, "subtitle": "Search the full toll detection system"},
                "general",
            )
        )

    return suggestions[:10]


@router.get("/search")
def global_search(
    q: str = Query(..., min_length=1),
    start: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = normalize_query(q)
    kind = detect_search_type(query)
    results = []

    if kind == "plate":
        vehicles = query_vehicles(db, query, limit=1)
        for vehicle in vehicles:
            results.append({
                "type": "vehicle",
                "vehicleNumber": vehicle["plate"],
                "make": vehicle.get("make"),
                "model": vehicle.get("model"),
                "color": vehicle.get("color"),
                "fastagId": vehicle.get("fastag_id"),
                "isBlacklisted": vehicle.get("is_blacklisted", False),
                "title": vehicle["plate"],
                "subtitle": f"{vehicle.get('make') or ''} {vehicle.get('model') or ''}".strip(),
                "details": vehicle,
            })
    elif kind == "fastag":
        fastag_term = query.upper().replace("FASTAG", "")
        vehicles = query_vehicles(db, fastag_term, limit=3)
        for vehicle in vehicles:
            results.append({
                "type": "fastag",
                "vehicleNumber": vehicle["plate"],
                "fastagId": vehicle.get("fastag_id"),
                "make": vehicle.get("make"),
                "model": vehicle.get("model"),
                "color": vehicle.get("color"),
                "title": vehicle["plate"],
                "subtitle": vehicle.get("fastag_id") or "FASTag result",
                "details": vehicle,
            })
    else:
        vehicles = query_vehicles(db, query, limit=limit)
        transactions = query_transactions(db, query, limit=limit)
        alerts = query_alerts(db, query, limit=limit)

        for vehicle in vehicles:
            results.append({
                "type": "vehicle",
                "vehicleNumber": vehicle["plate"],
                "make": vehicle.get("make"),
                "model": vehicle.get("model"),
                "color": vehicle.get("color"),
                "fastagId": vehicle.get("fastag_id"),
                "isBlacklisted": vehicle.get("is_blacklisted", False),
                "title": vehicle["plate"],
                "subtitle": f"{vehicle.get('make') or ''} {vehicle.get('model') or ''}".strip(),
                "details": vehicle,
            })

        for tx in transactions:
            results.append({
                "type": "transaction",
                "transactionId": f"TXN{tx['id']}",
                "vehicleNumber": tx.get("plate"),
                "fastagId": tx.get("fastag_id"),
                "plaza": tx.get("plaza"),
                "lane": tx.get("lane"),
                "amount": float(tx.get("amount") or 0),
                "status": tx.get("status"),
                "detectedAt": tx.get("detected_at"),
                "title": f"TXN{tx['id']}",
                "subtitle": f"{tx.get('plaza')} · {tx.get('status')}",
                "details": tx,
            })

        for alert in alerts:
            results.append({
                "type": "alert",
                "alertId": alert.get("alert_id"),
                "vehicleNumber": alert.get("vehicle"),
                "alertType": alert.get("type"),
                "severity": alert.get("severity"),
                "status": alert.get("status"),
                "plaza": alert.get("plaza"),
                "title": alert.get("alert_id"),
                "subtitle": f"{alert.get('type')} · {alert.get('severity')}",
                "details": alert,
            })

    try:
        save_search_history(db, query)
    except Exception:
        pass

    total = len(results)
    return {"query": query, "type": kind, "total": total, "results": results[start : start + limit]}


@router.get("/search/history")
def get_search_history(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            "SELECT query, created_at FROM search_history ORDER BY created_at DESC LIMIT 10"
        )
    ).fetchall()
    return [{"query": row.query, "createdAt": row.created_at.isoformat()} for row in rows]


@router.post("/search/history")
def post_search_history(payload: dict = Body(...), db: Session = Depends(get_db)):
    query = payload.get("query", "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="query is required")
    save_search_history(db, query)
    return {"query": query, "createdAt": datetime.utcnow().isoformat()}
