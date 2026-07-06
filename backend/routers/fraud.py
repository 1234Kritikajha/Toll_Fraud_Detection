# routers/fraud.py
import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db.database import get_db
from ..services.yolo_service import detect_and_crop_plate, is_model_loaded
from ..services.ocr_service import read_plate_text
from ..services.fraud_engine import evaluate_fraud

router = APIRouter()

# Create directory to store uploaded evidence images
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/detect")
async def detect_vehicle(
    file: UploadFile = File(...),
    fastag_id: str = Form(None),
    plaza: str = Form(None),
    lane: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Accepts an uploaded vehicle image, performs YOLO license plate detection,
    OCR plate reading, fraud evaluations, and logs the transaction/alerts in the database.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    if not is_model_loaded():
        raise HTTPException(status_code=503, detail="Trained YOLO model is not loaded")

    # Read image bytes
    image_bytes = await file.read()
    
    # 1. Run YOLO detection
    cropped, full_img, confidence, bbox = detect_and_crop_plate(image_bytes)
    
    # Save the uploaded file for evidence records
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(image_bytes)
        
    # 2. Run OCR text extraction
    plate_text = "UNKNOWN"
    if cropped is not None:
        plate_text = read_plate_text(cropped)
        
    # 3. Run Fraud scoring engine
    fraud_result = evaluate_fraud(plate_text, fastag_id, db)
    risk_score = fraud_result["score"]
    category = fraud_result["category"]
    
    status = "Success"
    if risk_score > 80:
        status = "Failed"
        if category == "Blacklisted Vehicle":
            status = "Blacklisted"
        elif category == "FASTag Cloning":
            status = "Cloned"
        elif category == "Tailgating":
            status = "Tailgating"
            
    # 4. Insert log into DB
    try:
        # Create unique IDs
        alert_id = f"ALRT-{uuid.uuid4().hex[:8].upper()}"
        case_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
        
        # Log transaction
        db.execute(
            text("""
                INSERT INTO transactions (plate, fastag_id, plaza, lane, amount, status)
                VALUES (:plate, :fastag_id, :plaza, :lane, :amount, :status)
            """),
            {
                "plate": plate_text,
                "fastag_id": fastag_id or "NO_TAG",
                "plaza": plaza or "",
                "lane": lane or "",
                "amount": 150.00, # default toll fare
                "status": status
            }
        )
        
        # Log alert if risk is high or medium
        if risk_score > 50:
            severity = "Critical" if risk_score > 85 else "High" if risk_score > 70 else "Medium"
            db.execute(
                text("""
                    INSERT INTO alerts (alert_id, type, vehicle, plaza, severity, status, assigned_to)
                    VALUES (:alert_id, :type, :vehicle, :plaza, :severity, 'New', 'Unassigned')
                """),
                {
                    "alert_id": alert_id,
                    "type": category,
                    "vehicle": plate_text,
                    "plaza": plaza,
                    "severity": severity
                }
            )
            
            # Log case for investigator
            priority = "High" if severity == "Critical" else "Medium"
            db.execute(
                text("""
                    INSERT INTO cases (case_id, vehicle, type, plaza, risk_score, status, priority)
                    VALUES (:case_id, :vehicle, :type, :plaza, :risk_score, 'New', :priority)
                """),
                {
                    "case_id": case_id,
                    "vehicle": plate_text,
                    "type": category,
                    "plaza": plaza,
                    "risk_score": risk_score,
                    "priority": priority
                }
            )
            
            # Log evidence file
            db.execute(
                text("""
                    INSERT INTO evidence (case_id, filename, file_type, file_path)
                    VALUES (:case_id, :filename, 'image', :file_path)
                """),
                {
                    "case_id": case_id,
                    "filename": filename,
                    "file_path": file_path
                }
            )
            
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to write detection to DB: {e}")

    return {
        "plate": plate_text,
        "confidence": round(confidence * 100, 2),
        "risk_score": risk_score,
        "category": category,
        "bbox": bbox,
        "status": status
    }
