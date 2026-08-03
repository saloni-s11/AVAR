from .face_service import generate_embedding
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from uuid import uuid4
from pathlib import Path
import shutil

from .database import users_collection

router = APIRouter(
    prefix="/enroll",
    tags=["Enrollment"]
)

# ----------------------------
# Upload Folders
# ----------------------------
FACE_DIR = Path("app/uploads/faces")
VOICE_DIR = Path("app/uploads/voices")

FACE_DIR.mkdir(parents=True, exist_ok=True)
VOICE_DIR.mkdir(parents=True, exist_ok=True)


# ----------------------------
# STEP 1 : Save Profile
# ----------------------------
@router.post("/profile")
async def save_profile(
    full_name: str = Form(...),
    email: str = Form(...),
    role: str = Form(...),
    department: str = Form(...),
    access_scope: str = Form(...)
):

    existing = users_collection.find_one({"email": email})

    if existing:
        raise HTTPException(
            status_code=400,
            detail="User already enrolled"
        )

    user_id = str(uuid4())

    users_collection.insert_one({

    "user_id": user_id,

    "full_name": full_name,

    "email": email,

    "role": role,

    "department": department,

    "access_scope": access_scope,

    "face_samples": [],

    "face_embeddings": [],

    "voice_samples": [],

    "status": "IN_PROGRESS"

})

    return {

        "success": True,

        "user_id": user_id,

        "message": "Profile Saved"

    }


# ----------------------------
# STEP 2 : Upload Face
# ----------------------------
@router.post("/face")
async def upload_face(

    user_id: str = Form(...),

    image: UploadFile = File(...)

):

    user = users_collection.find_one({

        "user_id": user_id

    })

    if not user:

        raise HTTPException(

            status_code=404,

            detail="User not found"

        )

    filename = f"{uuid4()}.jpg"

    filepath = FACE_DIR / filename

    with open(filepath, "wb") as buffer:

        shutil.copyfileobj(image.file, buffer)

    embedding = generate_embedding(filepath)

    users_collection.update_one(

        {

            "user_id": user_id

        },

        {

            "$push": {

                "face_samples": str(filepath),

                "face_embeddings": embedding

            }

        }

    )

    return {

        "success": True,

        "message": "Face Uploaded",

        "path": str(filepath)

    }
# ----------------------------
# STEP 3 : Upload Voice
# ----------------------------
@router.post("/voice")
async def upload_voice(

    user_id: str = Form(...),

    audio: UploadFile = File(...)

):

    user = users_collection.find_one({

        "user_id": user_id

    })

    if not user:

        raise HTTPException(

            status_code=404,

            detail="User not found"

        )

    filename = f"{uuid4()}.wav"

    filepath = VOICE_DIR / filename

    with open(filepath, "wb") as buffer:

        shutil.copyfileobj(audio.file, buffer)

    users_collection.update_one(

        {

            "user_id": user_id

        },

        {

            "$push": {

                "voice_samples": str(filepath)

            }

        }

    )

    return {

        "success": True,

        "message": "Voice Uploaded",

        "path": str(filepath)

    }


# ----------------------------
# STEP 4 : Complete Enrollment
# ----------------------------
# ----------------------------
# STEP 4 : Complete Enrollment
# ----------------------------
@router.post("/complete")
async def complete_enrollment(

    user_id: str = Form(...)

):

    user = users_collection.find_one({

        "user_id": user_id

    })

    if not user:

        raise HTTPException(

            status_code=404,

            detail="User not found"

        )

    users_collection.update_one(

        {

            "user_id": user_id

        },

        {

            "$set": {

                "status": "COMPLETED"

            }

        }

    )

    return {

        "success": True,

        "message": "Enrollment Completed",

        "user_id": user_id

    }
# ----------------------------
# Optional API
# ----------------------------
@router.get("/users")
def get_users():

    users = []

    for user in users_collection.find({}, {"_id": 0}):

        users.append(user)

    return users