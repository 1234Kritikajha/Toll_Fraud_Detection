# services/yolo_service.py
import os
import cv2
import numpy as np
from ultralytics import YOLO

# Get absolute path to the best.pt file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "best.pt")

# Load YOLO model (loads once at import/startup)
print(f"Loading YOLO model from: {MODEL_PATH}")
try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    print(f"Failed to load YOLO model: {e}")
    model = None

def is_model_loaded() -> bool:
    return model is not None

def detect_and_crop_plate(image_bytes: bytes):
    """
    Takes image bytes, runs YOLO detection to find the license plate,
    crops it, and returns the cropped image, full image, confidence, and bounding box.
    """
    if model is None:
        print("YOLO model not loaded. Skipping detection.")
        return None, None, 0.0, None

    # Convert bytes to numpy array for OpenCV
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        print("Failed to decode image bytes.")
        return None, None, 0.0, None

    # Run prediction using YOLO
    results = model(img, conf=0.25)
    
    if len(results) == 0 or len(results[0].boxes) == 0:
        # Return full image but no crop if nothing detected
        return None, img, 0.0, None
        
    boxes = results[0].boxes
    # Get the box with the highest confidence
    best_box_idx = boxes.conf.argmax()
    best_box = boxes[best_box_idx]
    
    confidence = float(best_box.conf[0])
    # xyxy format: [xmin, ymin, xmax, ymax]
    box = best_box.xyxy[0].tolist()
    x1, y1, x2, y2 = map(int, box)
    
    # Crop the plate area
    # Clamp bounds to image size just in case
    h, w, _ = img.shape
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    
    cropped = img[y1:y2, x1:x2]
    
    return cropped, img, confidence, (x1, y1, x2, y2)
