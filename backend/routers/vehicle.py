# routers/vehicle.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db.database import get_db

router = APIRouter()


@router.get("/vehicle/{plate}")
def get_vehicle_details(plate: str, db: Session = Depends(get_db)):
    """
    Looks up registry information of a vehicle from the user's database only.
    """
    plate_upper = plate.upper().strip()
    try:
        vehicle = db.execute(
            text(
                """
                SELECT plate, make, model, color, is_blacklisted, fastag_id, created_at
                FROM vehicles
                WHERE plate = :plate
                """
            ),
            {"plate": plate_upper},
        ).fetchone()

        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found in your database")

        return dict(vehicle._mapping)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error querying vehicle: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/vehicle/{plate}/history")
def get_vehicle_travel_history(plate: str, db: Session = Depends(get_db)):
    """
    Queries past toll plaza crossings and payment history logs from the user's database only.
    """
    plate_upper = plate.upper().strip()
    try:
        rows = db.execute(
            text(
                """
                SELECT plaza, lane, amount, status, detected_at
                FROM transactions
                WHERE plate = :plate
                ORDER BY detected_at DESC
                LIMIT 30
                """
            ),
            {"plate": plate_upper},
        ).fetchall()

        result = []
        for row in rows:
            mapped = dict(row._mapping)
            detected_at = mapped.get("detected_at")
            mapped["time"] = detected_at.strftime("%d %b %Y, %I:%M %p") if detected_at else ""
            amount = mapped.get("amount") or 0
            mapped["amount"] = f"Rs {float(amount):.2f}"
            result.append(mapped)

        return result
    except Exception as e:
        print(f"Error querying travel history: {e}")
        return []
