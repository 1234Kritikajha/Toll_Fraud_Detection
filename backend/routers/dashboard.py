# routers/dashboard.py
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db.database import get_db


router = APIRouter()


def _format_money_rupees(value) -> str:
    amount = float(value or 0)
    if amount >= 10_000_000:
        return f"Rs {round(amount / 10_000_000, 2)} Cr"
    if amount >= 100_000:
        return f"Rs {round(amount / 100_000, 2)} L"
    return f"Rs {round(amount, 2)}"


def _format_count(value: int) -> str:
    if value >= 1_000_000:
        return f"{round(value / 1_000_000, 2)}M"
    if value >= 1_000:
        return f"{round(value / 1_000, 1)}K"
    return str(value)


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    """
    Returns dashboard statistics computed from real database records only.
    """
    try:
        total_revenue_rs = db.execute(
            text("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status IN ('Success', 'Paid')")
        ).scalar()
        total_tx = db.execute(text("SELECT COUNT(*) FROM transactions")).scalar() or 0
        fraud_alerts = db.execute(text("SELECT COUNT(*) FROM alerts")).scalar() or 0
        suspicious_vehicles = db.execute(
            text("SELECT COUNT(DISTINCT plate) FROM transactions WHERE status NOT IN ('Success', 'Paid')")
        ).scalar() or 0
        active_plazas = db.execute(text("SELECT COUNT(*) FROM plazas")).scalar() or 0
        correct_detections = db.execute(
            text("SELECT COUNT(*) FROM transactions WHERE status IN ('Success', 'Paid')")
        ).scalar() or 0
        ai_accuracy_pct = round((correct_detections / total_tx) * 100, 1) if total_tx else 0

        metrics = [
            {"label": "Total Revenue", "value": _format_money_rupees(total_revenue_rs), "trend": "From database", "detail": "Successful transactions", "tone": "green"},
            {"label": "Transactions", "value": _format_count(total_tx), "trend": "From database", "detail": "All logged detections", "tone": "blue"},
            {"label": "Fraud Alerts", "value": str(fraud_alerts), "trend": "From database", "detail": "Alerts saved", "tone": "red"},
            {"label": "Suspicious Vehicles", "value": str(suspicious_vehicles), "trend": "From database", "detail": "Non-success statuses", "tone": "amber"},
            {"label": "Active Plazas", "value": str(active_plazas), "trend": "From database", "detail": "Configured plazas", "tone": "teal"},
            {"label": "AI Accuracy", "value": f"{ai_accuracy_pct}%", "trend": "From database", "detail": "Successful detections", "tone": "green"},
        ]

        tx_rows = db.execute(
            text("SELECT amount, status, detected_at FROM transactions ORDER BY detected_at ASC")
        ).fetchall()
        monthly = defaultdict(lambda: {"revenue": 0.0, "fraud": 0})
        for row in tx_rows:
            detected_at = row.detected_at
            label = detected_at.strftime("%b") if detected_at else "Unknown"
            if row.status in ("Success", "Paid"):
                monthly[label]["revenue"] += float(row.amount or 0)
            else:
                monthly[label]["fraud"] += 1
        revenue_trend = [
            {"name": month, "revenue": round(values["revenue"], 2), "fraud": values["fraud"]}
            for month, values in monthly.items()
        ]

        type_rows = db.execute(text("SELECT type, COUNT(*) AS count FROM alerts GROUP BY type")).fetchall()
        alert_total = sum(row.count for row in type_rows)
        fraud_categories = [
            {"name": row.type, "value": round((row.count / alert_total) * 100) if alert_total else 0}
            for row in type_rows
        ]

        plaza_rows = db.execute(
            text(
                """
                SELECT p.name, p.state, p.latitude, p.longitude, p.risk_score,
                       COUNT(t.id) AS tx_count
                FROM plazas p
                LEFT JOIN transactions t ON t.plaza = p.name
                WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
                GROUP BY p.id, p.name, p.state, p.latitude, p.longitude, p.risk_score
                """
            )
        ).fetchall()
        toll_markers = [
            {
                "name": row.name,
                "state": row.state or "",
                "position": [float(row.latitude), float(row.longitude)],
                "risk": row.risk_score or 0,
                "transactions": _format_count(row.tx_count or 0),
            }
            for row in plaza_rows
        ]

        return {
            "metrics": metrics,
            "revenueTrend": revenue_trend,
            "fraudCategories": fraud_categories,
            "tollMarkers": toll_markers,
        }
    except Exception as e:
        print(f"Error fetching dashboard data: {e}")
        return {"metrics": [], "revenueTrend": [], "fraudCategories": [], "tollMarkers": []}
