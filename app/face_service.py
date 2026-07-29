import cv2
import numpy as np
from insightface.app import FaceAnalysis

# Load InsightFace model only once
app = FaceAnalysis(name="buffalo_l")
app.prepare(ctx_id=0)

def generate_embedding(image_path):

    image = cv2.imread(str(image_path))

    if image is None:
        raise Exception("Image not found")

    faces = app.get(image)

    if len(faces) == 0:
        raise Exception("No face detected")

    # Return the first detected face embedding
    embedding = faces[0].embedding

    return embedding.tolist()