from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers.destinations import router as destinations_router
from backend.routers.recommendations import router as recommendations_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(destinations_router)
app.include_router(recommendations_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

