# routers/reports.py
import io
from collections import Counter

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..db.database import get_db

router = APIRouter()


def fetch_transactions(db: Session):
    query = """
        SELECT plate, fastag_id, plaza, lane, amount, status, detected_at
        FROM transactions
        ORDER BY detected_at DESC
    """
    rows = db.execute(text(query)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/reports/export")
def export_reports(
    format: str = Query("csv"),
    db: Session = Depends(get_db)
):
    """
    Exports the vehicle transaction log as CSV or Excel.
    """
    try:
        data = fetch_transactions(db)
        df = pd.DataFrame(data)

        if format == "excel":
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="Transactions")
            output.seek(0)
            headers = {"Content-Disposition": "attachment; filename=toll_report.xlsx"}
            return StreamingResponse(
                output,
                headers=headers,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )

        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        headers = {"Content-Disposition": "attachment; filename=toll_report.csv"}
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            headers=headers,
            media_type="text/csv",
        )

    except Exception as e:
        print(f"Error exporting report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def build_pdf(title: str, rows: list[dict[str, any]], summary: list[str]):
    output = io.BytesIO()
    pdf = canvas.Canvas(output, pagesize=letter)
    width, height = letter

    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(72, height - 72, title)

    pdf.setFont("Helvetica", 10)
    y = height - 108
    for line in summary:
        pdf.drawString(72, y, line)
        y -= 14

    y -= 10
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(72, y, "Recent transactions")
    y -= 18

    pdf.setFont("Helvetica-Bold", 9)
    headers = ["Plate", "FASTag", "Plaza", "Lane", "Amount", "Status"]
    x_positions = [72, 130, 210, 280, 330, 390]
    for idx, header in enumerate(headers):
        pdf.drawString(x_positions[idx], y, header)

    y -= 14
    pdf.setFont("Helvetica", 9)
    for row in rows[:20]:
        if y < 72:
            pdf.showPage()
            y = height - 72
        pdf.drawString(x_positions[0], y, str(row.get("plate", "-")))
        pdf.drawString(x_positions[1], y, str(row.get("fastag_id", "-")))
        pdf.drawString(x_positions[2], y, str(row.get("plaza", "-")))
        pdf.drawString(x_positions[3], y, str(row.get("lane", "-")))
        pdf.drawString(x_positions[4], y, str(row.get("amount", "-")))
        pdf.drawString(x_positions[5], y, str(row.get("status", "-")))
        y -= 14

    pdf.showPage()
    pdf.save()
    output.seek(0)
    return output


@router.get("/reports/daily-fraud")
def daily_fraud_report(db: Session = Depends(get_db)):
    """Generates a PDF daily fraud report."""
    try:
        rows = fetch_transactions(db)
        totals = Counter(row.get("status", "Unknown") for row in rows)
        summary = [
            f"Total transactions: {len(rows)}",
            f"Approved: {totals.get('Success', 0)}",
            f"Failed/Flagged: {totals.get('Failed', 0) + totals.get('Flagged', 0)}",
            f"Top plaza: {rows[0].get('plaza', '-') if rows else '-'}",
        ]
        pdf_data = build_pdf("Daily Fraud Report", rows, summary)
        headers = {"Content-Disposition": "attachment; filename=daily_fraud_report.pdf"}
        return StreamingResponse(pdf_data, headers=headers, media_type="application/pdf")
    except Exception as e:
        print(f"Error generating fraud report PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/summary")
def executive_summary(db: Session = Depends(get_db)):
    """Generates an executive summary PDF."""
    try:
        rows = fetch_transactions(db)
        total_amount = sum(float(row.get("amount") or 0) for row in rows)
        totals = Counter(row.get("status", "Unknown") for row in rows)
        summary = [
            f"Total transactions: {len(rows)}",
            f"Total revenue: ₹{total_amount:.2f}",
            f"Success count: {totals.get('Success', 0)}",
            f"Flagged count: {totals.get('Failed', 0) + totals.get('Flagged', 0)}",
        ]
        pdf_data = build_pdf("Executive Summary", rows, summary)
        headers = {"Content-Disposition": "attachment; filename=executive_summary.pdf"}
        return StreamingResponse(pdf_data, headers=headers, media_type="application/pdf")
    except Exception as e:
        print(f"Error generating executive summary PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/summary-data")
def report_summary_data(db: Session = Depends(get_db)):
    """Returns real aggregated report data from the backend database."""
    try:
        rows = fetch_transactions(db)
        total_amount = sum(float(row.get("amount") or 0) for row in rows)
        status_counts = Counter(row.get("status", "Unknown") for row in rows)
        plaza_counts = Counter(row.get("plaza", "Unknown") for row in rows)
        top_plaza, top_plaza_count = plaza_counts.most_common(1)[0] if plaza_counts else ("-", 0)
        recent_transactions = [
            {
                "plate": row.get("plate", "Unknown"),
                "status": row.get("status", "Unknown"),
                "plaza": row.get("plaza", "Unknown"),
                "amount": float(row.get("amount") or 0),
                "detected_at": row.get("detected_at"),
            }
            for row in rows[:5]
        ]

        return {
            "total_transactions": len(rows),
            "total_revenue": total_amount,
            "success_count": status_counts.get("Success", 0) + status_counts.get("Paid", 0),
            "failed_count": len(rows) - (status_counts.get("Success", 0) + status_counts.get("Paid", 0)),
            "top_plaza": top_plaza,
            "top_plaza_count": top_plaza_count,
            "recent_transactions": recent_transactions,
        }
    except Exception as e:
        print(f"Error fetching report summary data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
