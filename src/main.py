from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from src.config import settings

app = FastAPI(title=settings.app_name)

# Define static directories
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = Path("/app/static") if Path("/app/static").exists() else BASE_DIR / "static"

# Ensure static directory exists
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Welcome to GuildBoard API", "status": "running"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.environment,
        "database_configured": bool(settings.database_url)
    }
