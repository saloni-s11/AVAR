from fastapi import APIRouter, UploadFile, File
from pathlib import Path
import uuid
import time
import numpy as np

from .face_service import generate_embedding
from .database import users_collection
from .fusion import confidence_fusion, authentication_status

router = APIRouter(prefix="/auth", tags=["Authentication"])

UPLOAD_DIR = Path("app/uploads/auth")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)

    return float(
        np.dot(a, b) /
        (np.linalg.norm(a) * np.linalg.norm(b))
    )


@router.post("")
async def authenticate(image: UploadFile = File(...)):

    start_time = time.time()

    # Save uploaded image
    filename = f"{uuid.uuid4()}.jpg"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as buffer:
        buffer.write(await image.read())

    # Generate embedding for live face
    live_embedding = generate_embedding(filepath)

    best_score = -1
    best_user = None

    # Compare against all enrolled users
    for user in users_collection.find():

        embeddings = user.get("face_embeddings", [])

        # Skip users with no embeddings
        if not embeddings:
            continue

        # Handle both storage formats:
        # 1. face_embeddings = [embedding1, embedding2]
        # 2. face_embeddings = [[embedding1], [embedding2]]

        if isinstance(embeddings[0], (int, float)):
            embeddings = [embeddings]

        for stored_embedding in embeddings:

            score = cosine_similarity(
                live_embedding,
                stored_embedding
            )

            if score > best_score:
                best_score = score
                best_user = user

    latency = int((time.time() - start_time) * 1000)

       # Temporary voice score
    voice_score = 80.0

    fusion_score = confidence_fusion(
    round(max(best_score, 0) * 100, 2),
    voice_score
    )

    status = authentication_status(fusion_score)
    THRESHOLD = 0.50

    if best_user is not None and best_score >= THRESHOLD:

      return {
    "authorized": True,
    "user": best_user.get("full_name", "Unknown"),

    "face_score": round(best_score * 100, 2),
    "voice_score": voice_score,
    "fusion_score": fusion_score,

    "status": status,

    "latency": latency
}
    
    return {
    "authorized": False,
    "user": None,

    "face_score": round(max(best_score, 0) * 100, 2),
    "voice_score": voice_score,
    "fusion_score": fusion_score,

    "status": status,

    "latency": latency
}