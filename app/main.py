from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .enrollment import router as enrollment_router
from .auth import router as auth_router

app = FastAPI(
    title="AVAR Backend",
    version="1.0.0"
)

# Allow React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register APIs
app.include_router(enrollment_router)
app.include_router(auth_router)

@app.get("/")
def home():
    return {
        "message": "AVAR Backend Running"
    }