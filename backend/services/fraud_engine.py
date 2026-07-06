# services/fraud_engine.py
import re
from sqlalchemy.orm import Session
from sqlalchemy import text

def evaluate_fraud(plate: str, fastag_id: str, db: Session = None) -> dict:
    """
    Evaluates fraud indicators for a detected plate and scanning FASTag ID.
    Returns a dictionary with 'score' (0-100) and 'category'.
    """
    plate = plate.upper().strip()
    
    # 1. Blacklist check (Query DB if session is available)
    is_blacklisted = False
    if db:
        try:
            # Check if vehicle exists and is blacklisted
            res = db.execute(
                text("SELECT is_blacklisted FROM vehicles WHERE plate = :plate"),
                {"plate": plate}
            ).fetchone()
            if res and res[0]:
                is_blacklisted = True
        except Exception as e:
            print(f"DB blacklist check failed: {e}")
            
    if is_blacklisted:
        return {"score": 98.0, "category": "Blacklisted Vehicle"}

    # 2. FASTag Cloning Check
    # If a FASTag ID is registered to a different plate, it means someone is spoofing/cloning the tag
    if fastag_id and db:
        try:
            registered_plate = db.execute(
                text("SELECT plate FROM vehicles WHERE fastag_id = :tag"),
                {"tag": fastag_id}
            ).scalar()
            if registered_plate and registered_plate != plate:
                return {"score": 96.5, "category": "FASTag Cloning"}
        except Exception as e:
            print(f"DB FASTag check failed: {e}")

    # 3. Plate Spoofing / Format Anomaly
    # Indian standard: state code (2 letters), district (2 digits), 1-2 letters, 4 digits
    # Example: KA01AB1234, DL8CAF8890, MH12XY7788
    # If the format doesn't match standard patterns, it could be a fake/spoofed plate
    indian_plate_pattern = r"^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$"
    if plate != "UNKNOWN" and not re.match(indian_plate_pattern, plate):
        return {"score": 88.0, "category": "Plate Spoofing"}

    # 4. Tailgating / Barrier bypass (If tag is missing entirely or empty)
    if not fastag_id or fastag_id == "NO_TAG":
        return {"score": 82.0, "category": "Tailgating"}

    # Normal vehicle
    return {"score": 8.0, "category": "None"}
