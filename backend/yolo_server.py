import base64
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="YOLOv8 Face Detection Server")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model pointers
yolo_model = None
opencv_cascade = None

# Try loading YOLOv8
try:
    from ultralytics import YOLO
    # Loads or downloads yolov8n.pt (we use nano model for fast inference)
    # Using yolov8n.pt which detects 'person' (class 0). For high fidelity we can use a custom face model if available.
    yolo_model = YOLO("yolov8n.pt")
    print("YOLOv8 model loaded successfully.")
except Exception as e:
    print("Failed to load YOLOv8 model, falling back to OpenCV Haar Cascades:", e)

# Load OpenCV Cascade as a solid offline fallback
try:
    opencv_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    if opencv_cascade.empty():
        print("Warning: Haar cascade classifier xml file not found or empty.")
    else:
        print("OpenCV Haar Cascade face detector loaded successfully.")
except Exception as e:
    print("Failed to load OpenCV Haar Cascade face detector:", e)


class ImageFrame(BaseModel):
    image: str # Base64 encoded image frame


@app.post("/api/detect-face")
async def detect_face(frame: ImageFrame):
    try:
        # Extract base64 content
        encoded_data = frame.image
        if "," in encoded_data:
            encoded_data = encoded_data.split(",")[1]

        # Decode base64 to image bytes
        image_bytes = base64.b64decode(encoded_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image frame data.")

        face_detected = False
        boxes = []

        # 1. Try YOLOv8 detection first if loaded
        if yolo_model is not None:
            results = yolo_model(img, verbose=False)
            for r in results:
                # Class 0 in yolov8n.pt is 'person'. Since we are looking for a face/person,
                # we filter detections of class 0.
                for box in r.boxes:
                    if int(box.cls[0]) == 0 and float(box.conf[0]) > 0.4:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        boxes.append([x1, y1, x2, y2])
                        face_detected = True

        # 2. Fallback to OpenCV Haar Cascade if YOLO didn't find anything or is not loaded
        if not face_detected and opencv_cascade is not None:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = opencv_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
            for (x, y, w, h) in faces:
                boxes.append([int(x), int(y), int(x + w), int(y + h)])
                face_detected = True

        return {
            "face_detected": face_detected,
            "count": len(boxes),
            "boxes": boxes
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    print("Starting YOLO Face Detection Server on port 5002...")
    uvicorn.run(app, host="0.0.0.0", port=5002)
