"""
AVAR Face + Voice Pipeline Server
==================================
Endpoints:
  POST /api/detect-face        — enrollment: detect + embed a face frame
  POST /api/process-voice      — enrollment: denoise + embed a voice clip
  POST /api/authenticate-face  — auth: embed live face frame, return embedding
  POST /api/authenticate-voice — auth: embed live voice clip, return embedding
"""

import base64
import io
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AVAR Biometric Pipeline Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model globals ──────────────────────────────────────────────────────────────
yolo_model   = None
opencv_cascade = None
insight_app  = None
spk_model    = None   # SpeechBrain speaker embedding model

# ── 1. YOLOv8 ─────────────────────────────────────────────────────────────────
try:
    from ultralytics import YOLO
    yolo_model = YOLO("yolov8n.pt")
    print("[YOLO] YOLOv8n loaded successfully.")
except Exception as e:
    print(f"[YOLO] Failed to load: {e}")

# ── 2. OpenCV Haar Cascade ────────────────────────────────────────────────────
try:
    opencv_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    if opencv_cascade.empty():
        opencv_cascade = None
        print("[Haar] Cascade XML not found.")
    else:
        print("[Haar] Cascade loaded successfully.")
except Exception as e:
    print(f"[Haar] Failed: {e}")

# ── 3. InsightFace ────────────────────────────────────────────────────────────
try:
    from insightface.app import FaceAnalysis
    insight_app = FaceAnalysis(name="buffalo_sc", providers=["CPUExecutionProvider"])
    insight_app.prepare(ctx_id=0, det_size=(320, 320))
    print("[InsightFace] buffalo_sc loaded successfully.")
except Exception as e:
    print(f"[InsightFace] Failed: {e}")

# ── 4. SpeechBrain speaker embedding ─────────────────────────────────────────
try:
    import torch
    from speechbrain.inference.speaker import EncoderClassifier
    spk_model = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        run_opts={"device": "cpu"},
    )
    print("[SpeechBrain] ECAPA-TDNN speaker model loaded successfully.")
except Exception as e:
    print(f"[SpeechBrain] Failed to load, will use MFCC-only fallback: {e}")

# ── 5. Audio libs (best-effort) ───────────────────────────────────────────────
try:
    import noisereduce as nr
    HAS_NR = True
    print("[noisereduce] Noise reduction available.")
except ImportError:
    HAS_NR = False
    print("[noisereduce] Not installed — skipping denoising.")

try:
    import librosa
    HAS_LIBROSA = True
    print("[librosa] Audio feature extraction available.")
except ImportError:
    HAS_LIBROSA = False
    print("[librosa] Not installed — MFCC fallback disabled.")

try:
    import soundfile as sf
    HAS_SF = True
except ImportError:
    HAS_SF = False

try:
    from scipy.io import wavfile as scipy_wavfile
    HAS_SCIPY = True
    print("[scipy] WAV decoding available.")
except ImportError:
    HAS_SCIPY = False
    print("[scipy] Not installed.")

# pydub kept as optional — only works if ffmpeg is on PATH
HAS_PYDUB = False
try:
    from pydub import AudioSegment
    from pydub.utils import which
    if which("ffmpeg"):
        HAS_PYDUB = True
        print("[pydub] Available with ffmpeg.")
    else:
        print("[pydub] Skipped — ffmpeg not on PATH.")
except ImportError:
    pass


# ══════════════════════════════════════════════════════════════════════════════
#  FACE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def decode_image(b64: str) -> np.ndarray:
    if "," in b64:
        b64 = b64.split(",")[1]
    arr = np.frombuffer(base64.b64decode(b64), np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)

def encode_image(img: np.ndarray, quality: int = 90) -> str:
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        raise ValueError("Failed to encode image.")
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()

def detect_boxes_yolo(img):
    if yolo_model is None:
        return []
    boxes = []
    for r in yolo_model(img, verbose=False):
        for box in r.boxes:
            if int(box.cls[0]) == 0 and float(box.conf[0]) > 0.4:
                boxes.append(list(map(int, box.xyxy[0])))
    return boxes

def detect_boxes_haar(img):
    if opencv_cascade is None:
        return []
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = opencv_cascade.detectMultiScale(gray, 1.1, 4, minSize=(30, 30))
    return [[x, y, x+w, y+h] for (x, y, w, h) in faces]

def crop_padded(img, box, pad=0.15):
    h, w = img.shape[:2]
    x1, y1, x2, y2 = box
    pw, ph = int((x2-x1)*pad), int((y2-y1)*pad)
    return img[max(0,y1-ph):min(h,y2+ph), max(0,x1-pw):min(w,x2+pw)]


# ══════════════════════════════════════════════════════════════════════════════
#  AUDIO HELPERS
# ══════════════════════════════════════════════════════════════════════════════

TARGET_SR = 16000  # 16 kHz — standard for speaker models

def decode_audio(b64_audio: str) -> tuple[np.ndarray, int]:
    """
    Decode base64 WAV audio → float32 numpy array + sample rate.
    Primary: scipy.io.wavfile (no external deps, pure Python)
    Fallback: soundfile, then pydub+ffmpeg
    Frontend must send WAV (encoded via AudioContext — see Enroll.jsx).
    """
    if "," in b64_audio:
        b64_audio = b64_audio.split(",")[1]
    raw = base64.b64decode(b64_audio)

    # ── Primary: scipy WAV reader (zero external deps) ────────────────────────
    if HAS_SCIPY:
        try:
            sr, data = scipy_wavfile.read(io.BytesIO(raw))
            if data.ndim > 1:
                data = data.mean(axis=1)
            # Normalise to float32 [-1, 1]
            if data.dtype == np.int16:
                audio = data.astype(np.float32) / 32768.0
            elif data.dtype == np.int32:
                audio = data.astype(np.float32) / 2147483648.0
            elif data.dtype == np.uint8:
                audio = (data.astype(np.float32) - 128.0) / 128.0
            else:
                audio = data.astype(np.float32)
            # Resample to TARGET_SR if needed
            if sr != TARGET_SR:
                if HAS_LIBROSA:
                    audio = librosa.resample(audio, orig_sr=sr, target_sr=TARGET_SR)
                else:
                    # Simple nearest-neighbour resample
                    ratio  = TARGET_SR / sr
                    n_out  = int(len(audio) * ratio)
                    indices = (np.arange(n_out) / ratio).astype(int)
                    audio  = audio[np.clip(indices, 0, len(audio) - 1)]
            return audio, TARGET_SR
        except Exception as e:
            print(f"[scipy] WAV decode failed: {e}")

    # ── Fallback: soundfile ───────────────────────────────────────────────────
    if HAS_SF:
        try:
            audio, sr = sf.read(io.BytesIO(raw))
            if audio.ndim > 1:
                audio = audio.mean(axis=1)
            audio = audio.astype(np.float32)
            if sr != TARGET_SR and HAS_LIBROSA:
                audio = librosa.resample(audio, orig_sr=sr, target_sr=TARGET_SR)
            return audio, TARGET_SR
        except Exception as e:
            print(f"[soundfile] decode failed: {e}")

    # ── Fallback: pydub + ffmpeg ──────────────────────────────────────────────
    if HAS_PYDUB:
        try:
            seg = AudioSegment.from_file(io.BytesIO(raw))
            seg = seg.set_channels(1).set_frame_rate(TARGET_SR)
            samples = np.array(seg.get_array_of_samples(), dtype=np.float32)
            samples /= (2 ** (seg.sample_width * 8 - 1))
            return samples, TARGET_SR
        except Exception as e:
            print(f"[pydub] decode failed: {e}")

    raise RuntimeError("Audio decode failed — no working decoder found.")


def denoise(audio: np.ndarray, sr: int) -> np.ndarray:
    """Apply spectral noise reduction if noisereduce is available."""
    if not HAS_NR:
        return audio
    try:
        # Use the first 0.5 s as a noise profile estimate (stationary noise)
        noise_sample = audio[:int(sr * 0.5)] if len(audio) > sr * 0.5 else audio
        return nr.reduce_noise(y=audio, sr=sr, y_noise=noise_sample, prop_decrease=0.8)
    except Exception:
        return audio


def voice_activity_ratio(audio: np.ndarray, sr: int, frame_ms: int = 30) -> float:
    """
    Simple energy-based VAD.
    Returns fraction of frames that are above the energy threshold.
    """
    frame_len = int(sr * frame_ms / 1000)
    if len(audio) < frame_len:
        return 0.0
    frames = [audio[i:i+frame_len] for i in range(0, len(audio)-frame_len, frame_len)]
    if not frames:
        return 0.0
    energies = [np.sqrt(np.mean(f**2)) for f in frames]
    threshold = np.percentile(energies, 30)  # bottom 30% = silence
    active = sum(1 for e in energies if e > threshold)
    return active / len(frames)


def extract_mfcc_embedding(audio: np.ndarray, sr: int) -> list[float]:
    """Extract mean MFCC (40 coefficients) as a lightweight fallback embedding."""
    if not HAS_LIBROSA:
        return []
    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=40)
    delta = librosa.feature.delta(mfcc)
    combined = np.concatenate([mfcc.mean(axis=1), mfcc.std(axis=1),
                                delta.mean(axis=1)], axis=0)
    return combined.tolist()  # 120-d vector


def extract_speaker_embedding(audio: np.ndarray, sr: int) -> list[float]:
    """
    Extract 192-d ECAPA-TDNN speaker embedding via SpeechBrain.
    Falls back to MFCC if SpeechBrain is unavailable.
    """
    if spk_model is None:
        return extract_mfcc_embedding(audio, sr)
    try:
        import torch
        tensor = torch.tensor(audio).unsqueeze(0)  # (1, T)
        with torch.no_grad():
            emb = spk_model.encode_batch(tensor)   # (1, 1, 192)
        return emb.squeeze().tolist()
    except Exception as e:
        print(f"[SpeechBrain] Embedding failed, using MFCC fallback: {e}")
        return extract_mfcc_embedding(audio, sr)


def snr_db(audio: np.ndarray) -> float:
    """Estimate signal-to-noise ratio in dB (rough energy-based estimate)."""
    if len(audio) == 0:
        return -99.0
    rms = np.sqrt(np.mean(audio**2))
    if rms == 0:
        return -99.0
    return float(20 * np.log10(rms + 1e-9) + 60)  # offset to positive range


# ══════════════════════════════════════════════════════════════════════════════
#  REQUEST MODELS
# ══════════════════════════════════════════════════════════════════════════════

class ImageFrame(BaseModel):
    image: str

class AudioClip(BaseModel):
    audio: str          # base64-encoded webm/ogg audio from browser MediaRecorder
    min_vad: float = 0.45   # minimum voice-activity ratio to accept clip
    min_snr: float = 8.0    # minimum SNR (dB) to accept clip


# ══════════════════════════════════════════════════════════════════════════════
#  FACE ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/detect-face")
async def detect_face(frame: ImageFrame):
    try:
        img = decode_image(frame.image)
        if img is None:
            raise HTTPException(400, "Could not decode image.")

        boxes = detect_boxes_yolo(img) or detect_boxes_haar(img)
        if not boxes:
            return {"face_detected": False, "processed_image": None, "embedding": None, "boxes": []}

        best_box = max(boxes, key=lambda b: (b[2]-b[0])*(b[3]-b[1]))

        if insight_app is not None:
            rgb   = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            faces = insight_app.get(rgb)
            best_face, best_iou = None, 0.0
            bx1, by1, bx2, by2 = best_box
            for face in faces:
                fx1, fy1, fx2, fy2 = map(int, face.bbox)
                ix1, iy1 = max(bx1, fx1), max(by1, fy1)
                ix2, iy2 = min(bx2, fx2), min(by2, fy2)
                inter = max(0, ix2-ix1) * max(0, iy2-iy1)
                union = (bx2-bx1)*(by2-by1) + (fx2-fx1)*(fy2-fy1) - inter
                iou   = inter/union if union > 0 else 0.0
                if iou > best_iou:
                    best_iou, best_face = iou, face

            if best_face is not None:
                fx1, fy1, fx2, fy2 = map(int, best_face.bbox)
                crop = cv2.resize(crop_padded(img, [fx1,fy1,fx2,fy2], 0.15), (112, 112))
                return {
                    "face_detected": True,
                    "processed_image": encode_image(crop),
                    "embedding": best_face.normed_embedding.tolist(),
                    "boxes": boxes,
                }

        crop = cv2.resize(crop_padded(img, best_box, 0.15), (112, 112))
        return {"face_detected": True, "processed_image": encode_image(crop),
                "embedding": None, "boxes": boxes}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Face pipeline error: {e}")


# ══════════════════════════════════════════════════════════════════════════════
#  VOICE ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/process-voice")
async def process_voice(clip: AudioClip):
    """
    Voice processing pipeline:
      decode → denoise → VAD check → SNR check → speaker embedding extraction

    Returns:
      accepted        : bool   — True if clip passes quality thresholds
      reject_reason   : str    — human-readable reason if rejected
      embedding       : list[float] — 192-d (ECAPA) or 120-d (MFCC) speaker vector
      vad_ratio       : float  — fraction of frames with voice activity
      snr_db          : float  — estimated signal-to-noise ratio
    """
    try:
        # ── Step 1: Decode audio ──────────────────────────────────────────────
        try:
            audio, sr = decode_audio(clip.audio)
        except Exception as e:
            return {
                "accepted": False,
                "reject_reason": f"Audio decode failed: {e}",
                "embedding": [], "vad_ratio": 0.0, "snr_db": -99.0,
            }

        if len(audio) < sr * 1.0:   # reject clips shorter than 1 second
            return {
                "accepted": False,
                "reject_reason": "Clip too short (< 1 second).",
                "embedding": [], "vad_ratio": 0.0, "snr_db": -99.0,
            }

        # ── Step 2: Noise reduction ───────────────────────────────────────────
        audio_clean = denoise(audio, sr)

        # ── Step 3: VAD — reject mostly-silent clips ─────────────────────────
        vad = voice_activity_ratio(audio_clean, sr)
        if vad < clip.min_vad:
            return {
                "accepted": False,
                "reject_reason": f"Too much silence (voice activity {vad:.0%} < {clip.min_vad:.0%}). "
                                  "Please speak clearly.",
                "embedding": [], "vad_ratio": round(vad, 3), "snr_db": -99.0,
            }

        # ── Step 4: SNR check — reject very noisy clips ───────────────────────
        snr = snr_db(audio_clean)
        if snr < clip.min_snr:
            return {
                "accepted": False,
                "reject_reason": f"Background noise too high (SNR {snr:.1f} dB < {clip.min_snr} dB). "
                                  "Please record in a quieter environment.",
                "embedding": [], "vad_ratio": round(vad, 3), "snr_db": round(snr, 2),
            }

        # ── Step 5: Speaker embedding extraction ─────────────────────────────
        embedding = extract_speaker_embedding(audio_clean, sr)

        return {
            "accepted": True,
            "reject_reason": "",
            "embedding": embedding,
            "vad_ratio": round(vad, 3),
            "snr_db":    round(snr, 2),
        }

    except Exception as e:
        raise HTTPException(500, f"Voice pipeline error: {e}")


# ══════════════════════════════════════════════════════════════════════════════
#  AUTHENTICATION ENDPOINTS
#  These only extract embeddings from a live frame/clip.
#  The actual matching against enrolled users is done in server.js (Node).
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/authenticate-face")
async def authenticate_face(frame: ImageFrame):
    """
    Authentication-only face pipeline — skips YOLO entirely.
    Sends the full frame directly to InsightFace which has its own
    built-in detector, more tolerant of partial occlusion (masks, etc.).
    Returns the embedding for cosine matching against enrolled users.
    """
    try:
        img = decode_image(frame.image)
        if img is None:
            raise HTTPException(400, "Could not decode image.")

        if insight_app is not None:
            rgb   = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            faces = insight_app.get(rgb)

            if not faces:
                return {"face_detected": False, "embedding": None}

            # Pick the largest face in the frame
            best_face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))
            return {
                "face_detected": True,
                "embedding": best_face.normed_embedding.tolist(),
            }

        # InsightFace not available — fall back to Haar + no embedding
        boxes = detect_boxes_haar(img)
        return {
            "face_detected": len(boxes) > 0,
            "embedding": None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Auth face pipeline error: {e}")


@app.post("/api/authenticate-voice")
async def authenticate_voice(clip: AudioClip):
    """
    Extract speaker embedding from a live audio clip for authentication.
    Applies denoising but uses relaxed VAD/SNR thresholds for auth.
    Returns the embedding — Node backend compares it against enrolled users.
    """
    try:
        try:
            audio, sr = decode_audio(clip.audio)
        except Exception as e:
            return {"accepted": False, "embedding": [], "reject_reason": str(e),
                    "vad_ratio": 0.0, "snr_db": -99.0}

        if len(audio) < sr * 0.5:
            return {"accepted": False, "embedding": [], "reject_reason": "Clip too short.",
                    "vad_ratio": 0.0, "snr_db": -99.0}

        audio_clean = denoise(audio, sr)
        vad         = voice_activity_ratio(audio_clean, sr)
        snr         = snr_db(audio_clean)

        # Relaxed thresholds for auth (user might be in motion)
        if vad < 0.30:
            return {"accepted": False, "embedding": [],
                    "reject_reason": "Too much silence — please speak the passphrase.",
                    "vad_ratio": round(vad, 3), "snr_db": round(snr, 2)}

        embedding = extract_speaker_embedding(audio_clean, sr)
        return {"accepted": True, "embedding": embedding,
                "reject_reason": "", "vad_ratio": round(vad, 3), "snr_db": round(snr, 2)}

    except Exception as e:
        raise HTTPException(500, f"Auth voice pipeline error: {e}")


if __name__ == "__main__":
    import uvicorn
    print("Starting AVAR Biometric Pipeline Server on port 5002...")
    uvicorn.run(app, host="0.0.0.0", port=5002, reload=False)
