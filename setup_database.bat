@echo off
setlocal

echo ===================================================
echo   GuildBoard Database Setup (PostgreSQL in Docker)
echo ===================================================

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not found. Install Docker Desktop and start it first.
    pause
    exit /b 1
)

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] venv not found. Run setup.bat first.
    pause
    exit /b 1
)

echo [INFO] Starting the PostgreSQL container...
docker compose up -d db
if %errorlevel% neq 0 (
    echo [ERROR] Could not start the database. Is Docker Desktop running?
    pause
    exit /b 1
)

echo [INFO] Waiting for PostgreSQL to be ready...
:wait
docker compose exec -T db pg_isready -U postgres -d guildboard >nul 2>nul
if %errorlevel% neq 0 (
    timeout /t 2 /nobreak >nul
    goto wait
)
echo [OK] PostgreSQL is ready.

call venv\Scripts\activate.bat
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/guildboard

echo [INFO] Installing Python packages...
pip install -q -r requirements.txt

echo [INFO] Creating / updating tables...
alembic upgrade head
if %errorlevel% neq 0 (
    echo [ERROR] Migration failed. See the message above.
    pause
    exit /b 1
)

echo [INFO] Adding demo data...
python scripts\seed_data.py

echo.
echo ===================================================
echo   Database ready!
echo   Put this line in your .env so the app uses it:
echo     DATABASE_URL=postgresql://postgres:postgres@localhost:5432/guildboard
echo ===================================================
pause
