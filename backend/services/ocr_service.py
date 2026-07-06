# services/ocr_service.py
import re
import easyocr

# Initialize EasyOCR reader (loads weights for English)
print("Initializing EasyOCR reader...")
try:
    reader = easyocr.Reader(['en'], gpu=False)
except Exception as e:
    print(f"Failed to initialize EasyOCR: {e}")
    reader = None

def read_plate_text(cropped_image) -> str:
    """
    Reads license plate text from cropped plate image using EasyOCR.
    """
    if reader is None:
        print("EasyOCR reader not loaded. Skipping OCR.")
        return "UNKNOWN"

    if cropped_image is None or cropped_image.size == 0:
        return "UNKNOWN"

    try:
        # Run OCR
        results = reader.readtext(cropped_image)
        if not results:
            return "UNKNOWN"
            
        # Combine all OCR boxes and text predictions
        raw_text = " ".join([res[1] for res in results])
        
        # Clean up text: convert to uppercase, strip non-alphanumeric characters
        clean_text = re.sub(r'[^A-Z0-9]', '', raw_text.upper())
        
        # Strip spaces and normalize common OCR errors if needed
        # (e.g. O -> 0, I -> 1 in number regions, but standard clean regex is fine)
        return clean_text if len(clean_text) >= 4 else "UNKNOWN"
    except Exception as e:
        print(f"Error during OCR extraction: {e}")
        return "UNKNOWN"
