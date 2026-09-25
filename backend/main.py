from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import router


app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    # Local development origins
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.137.1:3000",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# API ROUTES
# ============================================================

app.include_router(router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "name": "NYAYAOS API",
        "description": "AI-Powered Justice Operating System",
        "version": settings.app_version,
        "status": "running",
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }