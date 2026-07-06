# routers/maps.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db.database import get_db
from .dashboard import _format_count


router = APIRouter()


@router.get("/map/markers")
def get_map_markers(db: Session = Depends(get_db)):
    """
    Returns toll plaza geographic locations and risk levels from the user's database only.
    """
    try:
        plazas = db.execute(
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

        result = []
        for plaza in plazas:
            mapped = dict(plaza._mapping)
            result.append(
                {
                    "name": mapped["name"],
                    "state": mapped["state"] or "",
                    "position": [float(mapped["latitude"]), float(mapped["longitude"])],
                    "risk": mapped["risk_score"] or 0,
                    "transactions": _format_count(mapped["tx_count"] or 0),
                }
            )
        return result
    except Exception as e:
        print(f"Error maps query: {e}")
        return []
