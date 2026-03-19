#!/bin/bash
# Quick start script for Django Channels ASGI server with WebSocket support

echo "============================================"
echo "Starting Car Detailing Backend (ASGI Mode)"
echo "============================================"
echo ""

# Check if Redis is running
echo "Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "[WARNING] Redis is not responding!"
    echo "Please start Redis server first:"
    echo "  redis-server"
    echo ""
    read -p "Press Enter to continue anyway or Ctrl+C to abort..."
else
    echo "Redis is running!"
    echo ""
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

echo "Starting ASGI server with Daphne..."
echo "WebSocket endpoint: ws://localhost:8000/ws/notifications/"
echo "API endpoint: http://localhost:8000/api/"
echo ""

# Start Daphne with auto-reload for development
daphne -b 0.0.0.0 -p 8000 --reload config.asgi:application
