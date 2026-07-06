# routers/investigation.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db.database import get_db
import os
import uuid

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

@router.get("/cases")
def get_cases(db: Session = Depends(get_db)):
    """
    Returns high risk investigation cases list.
    """
    try:
        rows = db.execute(
            text("SELECT case_id, vehicle, type, plaza, risk_score, status, priority, created_at FROM cases ORDER BY created_at DESC")
        ).fetchall()
        
        result = []
        for r in rows:
            mapped = dict(r._mapping)
            # Format datetime as string
            mapped["time"] = mapped["created_at"].strftime("%d %b %Y %I:%M %p")
            mapped["risk"] = f"{round(float(mapped['risk_score']), 1)}%"
            result.append(mapped)
            
        return result
    except Exception as e:
        print(f"Error querying cases: {e}")
        return []

@router.post("/cases/{case_id}/evidence")
async def upload_evidence(
    case_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads supporting evidence files (images/logs) linked to an investigation case.
    """
    try:
        # Save file to uploads directory
        filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
            
        # Add entry into evidence table
        db.execute(
            text("""
                INSERT INTO evidence (case_id, filename, file_type, file_path)
                VALUES (:case_id, :filename, :file_type, :file_path)
            """),
            {
                "case_id": case_id,
                "filename": file.filename,
                "file_type": "image" if file.content_type.startswith("image/") else "log",
                "file_path": file_path
            }
        )
        
        # Update case status
        db.execute(
            text("UPDATE cases SET status = 'Evidence Collected' WHERE case_id = :case_id"),
            {"case_id": case_id}
        )
        
        db.commit()
        return {"status": "success", "message": "Evidence uploaded successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
