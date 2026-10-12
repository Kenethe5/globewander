import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers.destinations import router as destinations_router
from backend.routers.recommendations import router as recommendations_router
from backend.routers.preferences import router as preferences_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,https://globewander-eta.vercel.app"
    ).split(",") if origin.strip() and origin.strip() != "*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(destinations_router)
app.include_router(recommendations_router)
app.include_router(preferences_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

