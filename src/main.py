import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

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

@app.get("/calendar")
async def serve_calendar():
    calendar_file = STATIC_DIR / "calendar.html"
    if calendar_file.exists():
        return FileResponse(str(calendar_file))
    return {"message": "Calendar page not found", "status": "error"}

@app.get("/create_event")
@app.get("/create-event")
@app.get("/event-creation")
@app.get("/event_creation")
async def serve_create_event():
    create_event_file = STATIC_DIR / "create_event.html"
    if not create_event_file.exists():
        create_event_file = STATIC_DIR / "event_creation.html"
    if create_event_file.exists():
        return FileResponse(str(create_event_file))
    return {"message": "Create event page not found", "status": "error"}

@app.get("/login")
@app.get("/LoginPage")
async def serve_login():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Login page not found", "status": "error"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.environment,
        "database_configured": bool(settings.database_url)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="127.0.0.1", port=settings.port, reload=True)

