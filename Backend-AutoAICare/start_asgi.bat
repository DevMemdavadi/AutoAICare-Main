@echo off
REM Quick start script for Django Channels ASGI server with WebSocket support

echo ============================================
echo Starting Car Detailing Backend (ASGI Mode)
echo ============================================
echo.

REM Check if Redis is running
echo Checking Redis connection...
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Redis is not responding!
    echo Please start Redis server first:
    echo   redis-server
    echo.
    echo Press any key to continue anyway or Ctrl+C to abort...
    pause >nul
)

echo Redis is running!
echo.

REM Activate virtual environment if it exists
if exist venv\Scripts\activate.bat (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

echo Starting ASGI server with Daphne...
echo WebSocket endpoint: ws://localhost:8000/ws/notifications/
echo API endpoint: http://localhost:8000/api/
echo.

REM Start Daphne with auto-reload for development
daphne -b 0.0.0.0 -p 8000 --reload config.asgi:application
