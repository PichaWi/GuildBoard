@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   GuildBoard Virtual Environment Setup
echo ===================================================

:: Check Python installation
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH. Please install Python 3.10+ and add it to your PATH.
    pause
    exit /b 1
)

:: Check if virtual environment already exists
if not exist "venv\Scripts\activate.bat" (
    echo [INFO] Creating virtual environment in .\venv ...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created successfully.
) else (
    echo [INFO] Existing virtual environment found in .\venv.
)

:: Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

:: Upgrade pip
echo [INFO] Upgrading pip...
python -m pip install --upgrade pip

:: Install requirements
if exist "requirements.txt" (
    echo [INFO] Installing dependencies from requirements.txt...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
) else (
    echo [WARNING] requirements.txt not found. Skipping dependency installation.
)

echo.
echo ===================================================
echo   Setup Complete!
echo   To activate your virtual environment, run:
echo     .\venv\Scripts\activate
echo   To start the backend server:
echo     uvicorn src.main:app --reload --port 8000
echo.
echo   To start the React frontend:
echo     cd frontend ^&^& npm install ^&^& npm run dev
echo ===================================================
echo.

pause
