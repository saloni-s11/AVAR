
import os
import math
import cv2
import mediapipe as mp
import onnxruntime as ort
import numpy as np


# ============================================================
# Model paths
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")


def find_model(filename):
    """Find a model in backend/models or backend."""
    candidates = [
        os.path.join(MODELS_DIR, filename),
        os.path.join(BASE_DIR, filename),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    raise FileNotFoundError(
        f"Cannot find {filename}. Checked: {candidates}"
    )


# RetinaFace face detector
RETINAFACE_PROTO = find_model("deploy.prototxt")
RETINAFACE_MODEL = find_model("Widerface-RetinaFace.caffemodel")
face_detector = cv2.dnn.readNetFromCaffe(
    RETINAFACE_PROTO,
    RETINAFACE_MODEL,
)

# MiniFASNet anti-spoofing model
ANTISPOOF_MODEL = find_model("minifasnet_v2.onnx")
anti_spoof_session = ort.InferenceSession(
    ANTISPOOF_MODEL,
    providers=["CPUExecutionProvider"],
)


# ============================================================
# MediaPipe Face Landmarker
# ============================================================

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

LANDMARKER_MODEL = os.path.join(BASE_DIR, "face_landmarker.task")

if not os.path.isfile(LANDMARKER_MODEL):
    raise FileNotFoundError(
        f"Cannot find Face Landmarker model: {LANDMARKER_MODEL}"
    )

options = FaceLandmarkerOptions(
    base_options=BaseOptions(
        model_asset_path=LANDMARKER_MODEL
    ),
    running_mode=VisionRunningMode.IMAGE,
    num_faces=1,
)

landmarker = FaceLandmarker.create_from_options(options)


# ============================================================
# Face landmark indices
# ============================================================

LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
NOSE_TIP = 1


# ============================================================
# Utility and Eye Aspect Ratio
# ============================================================

def distance(p1, p2):
    return math.sqrt(
        (p1[0] - p2[0]) ** 2 +
        (p1[1] - p2[1]) ** 2
    )


def eye_aspect_ratio(landmarks, eye_indices, width, height):
    points = []

    for index in eye_indices:
        landmark = landmarks[index]
        points.append((
            landmark.x * width,
            landmark.y * height,
        ))

    vertical_1 = distance(points[1], points[5])
    vertical_2 = distance(points[2], points[4])
    horizontal = distance(points[0], points[3])

    if horizontal == 0:
        return 0.0

    return (vertical_1 + vertical_2) / (2.0 * horizontal)


# ============================================================
# Process one frame
# ============================================================

def process_liveness_frame(frame):
    if frame is None:
        return {
            "face_detected": False,
            "left_ear": 0.0,
            "right_ear": 0.0,
            "eyes_closed": False,
            "nose_position": 0.5,
        }

    height, width = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb,
    )

    result = landmarker.detect(mp_image)

    if not result.face_landmarks:
        return {
            "face_detected": False,
            "left_ear": 0.0,
            "right_ear": 0.0,
            "eyes_closed": False,
            "nose_position": 0.5,
        }

    landmarks = result.face_landmarks[0]

    left_ear = eye_aspect_ratio(
        landmarks, LEFT_EYE, width, height
    )
    right_ear = eye_aspect_ratio(
        landmarks, RIGHT_EYE, width, height
    )

    average_ear = (left_ear + right_ear) / 2.0
    eyes_closed = average_ear < 0.21
    nose_position = landmarks[NOSE_TIP].x

    return {
        "face_detected": True,
        "left_ear": float(left_ear),
        "right_ear": float(right_ear),
        "eyes_closed": bool(eyes_closed),
        "nose_position": float(nose_position),
    }


# ============================================================
# Blink detection
# ============================================================

def detect_blink(ear_history, min_closed_frames=2):
    if len(ear_history) < min_closed_frames + 2:
        return False

    closed = [ear < 0.21 for ear in ear_history]

    for i in range(len(closed) - min_closed_frames):
        if all(closed[i:i + min_closed_frames]):
            if any(not value for value in closed[
                i + min_closed_frames:
            ]):
                return True

    return False


# ============================================================
# Face anti-spoofing
# ============================================================

def predict_face_anti_spoof(frame):
    if frame is None:
        return {
            "anti_spoof_label": "UNKNOWN",
            "anti_spoof_scores": None,
        }

    height, width = frame.shape[:2]

    if height < 2 or width < 2:
        return {
            "anti_spoof_label": "UNKNOWN",
            "anti_spoof_scores": None,
        }

    # Resize for RetinaFace detection
    aspect_ratio = width / height
    detector_frame = frame.copy()

    if width * height >= 192 * 192:
        detector_frame = cv2.resize(
            detector_frame,
            (
                max(1, int(192 * math.sqrt(aspect_ratio))),
                max(1, int(192 / math.sqrt(aspect_ratio))),
            ),
            interpolation=cv2.INTER_LINEAR,
        )

    blob = cv2.dnn.blobFromImage(
        detector_frame,
        scalefactor=1.0,
        size=(detector_frame.shape[1], detector_frame.shape[0]),
        mean=(104, 117, 123),
    )

    face_detector.setInput(blob, "data")
    detections = face_detector.forward("detection_out")
    detections = np.asarray(detections).reshape(-1, 7)

    if detections.size == 0:
        return {
            "anti_spoof_label": "UNKNOWN",
            "anti_spoof_scores": None,
        }

    # Highest-confidence face
    best_index = int(np.argmax(detections[:, 2]))
    detection = detections[best_index]
    confidence = float(detection[2])

    if confidence < 0.3:
        return {
            "anti_spoof_label": "UNKNOWN",
            "anti_spoof_scores": None,
        }

    detector_height, detector_width = detector_frame.shape[:2]

    # Detection coordinates are relative to detector input
    left = int(detection[3] * detector_width)
    top = int(detection[4] * detector_height)
    right = int(detection[5] * detector_width)
    bottom = int(detection[6] * detector_height)

    # Map resized-image coordinates back to original frame
    left = int(left * width / detector_width)
    right = int(right * width / detector_width)
    top = int(top * height / detector_height)
    bottom = int(bottom * height / detector_height)

    left = max(0, min(left, width - 1))
    right = max(0, min(right, width - 1))
    top = max(0, min(top, height - 1))
    bottom = max(0, min(bottom, height - 1))

    box_w = right - left + 1
    box_h = bottom - top + 1

    if box_w <= 1 or box_h <= 1:
        return {
            "anti_spoof_label": "UNKNOWN",
            "anti_spoof_scores": None,
        }

    # Expand crop around face, keeping it inside the frame
    scale = min(
        2.7,
        (height - 1) / box_h,
        (width - 1) / box_w,
    )

    center_x = (left + right) / 2.0
    center_y = (top + bottom) / 2.0

    crop_w = box_w * scale
    crop_h = box_h * scale

    x1 = max(0, int(center_x - crop_w / 2))
    y1 = max(0, int(center_y - crop_h / 2))
    x2 = min(width, int(center_x + crop_w / 2))
    y2 = min(height, int(center_y + crop_h / 2))

    face = frame[y1:y2, x1:x2]

    if face.size == 0:
        return {
            "anti_spoof_label": "UNKNOWN",
            "anti_spoof_scores": None,
        }

    # MiniFASNet input: BGR, 80x80, float32, [0, 1]
    face = cv2.resize(face, (80, 80))
    face = face.astype(np.float32) / 255.0
    face = np.transpose(face, (2, 0, 1))[None, ...]

    input_name = anti_spoof_session.get_inputs()[0].name
    output = anti_spoof_session.run(
        None,
        {input_name: face},
    )[0]

    logits = np.asarray(output).reshape(-1)

    if logits.size != 3 or not np.all(np.isfinite(logits)):
        return {
            "anti_spoof_label": "UNKNOWN",
            "anti_spoof_scores": None,
        }

    # Softmax
    exp_scores = np.exp(logits - np.max(logits))
    probabilities = exp_scores / np.sum(exp_scores)

    # These class names must match the model's verified label order.
    labels = ["LIVE", "PRINT_ATTACK", "REPLAY_ATTACK"]
    predicted_class = int(np.argmax(probabilities))

    return {
        "anti_spoof_label": labels[predicted_class],
        "anti_spoof_scores": probabilities.tolist(),
        "predicted_class": predicted_class,
    }


# ============================================================
# Head movement detection
# ============================================================

def calculate_head_direction(nose_positions):
    if len(nose_positions) < 5:
        return "UNKNOWN"

    movement = nose_positions[-1] - nose_positions[0]

    if movement < -0.06:
        return "LEFT"

    if movement > 0.06:
        return "RIGHT"

    return "CENTER"


# ============================================================
# Final liveness evaluation
# ============================================================

def evaluate_liveness(
    blink_detected,
    left_movement,
    right_movement,
):
    checks_passed = sum((
        bool(blink_detected),
        bool(left_movement),
        bool(right_movement),
    ))

    return {
        "liveness_passed": checks_passed == 3,
        "blink_detected": bool(blink_detected),
        "left_movement": bool(left_movement),
        "right_movement": bool(right_movement),
        "checks_passed": checks_passed,
        "total_checks": 3,
    }
