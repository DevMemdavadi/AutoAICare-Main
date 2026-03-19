#!/bin/bash

# Timer Notification System - Live Server Verification Script
# This script checks if all required services are running for timer notifications

echo "========================================="
echo "Timer Notification System - Status Check"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service status
check_service() {
    local service_name=$1
    if systemctl is-active --quiet $service_name; then
        echo -e "${GREEN}✓${NC} $service_name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $service_name is NOT running"
        return 1
    fi
}

# Check Celery Worker
echo "1. Checking Celery Worker..."
check_service celery-worker
WORKER_STATUS=$?

# Check Celery Beat
echo ""
echo "2. Checking Celery Beat..."
check_service celery-beat
BEAT_STATUS=$?

# Check Daphne (WebSocket server)
echo ""
echo "3. Checking Daphne (WebSocket server)..."
check_service daphne
DAPHNE_STATUS=$?

# Check if services are enabled
echo ""
echo "========================================="
echo "Auto-start on Boot Status"
echo "========================================="

check_enabled() {
    local service_name=$1
    if systemctl is-enabled --quiet $service_name; then
        echo -e "${GREEN}✓${NC} $service_name will start on boot"
    else
        echo -e "${YELLOW}⚠${NC} $service_name will NOT start on boot (run: sudo systemctl enable $service_name)"
    fi
}

check_enabled celery-worker
check_enabled celery-beat
check_enabled daphne

# Check recent Celery Beat task execution
echo ""
echo "========================================="
echo "Recent Timer Task Execution"
echo "========================================="
echo "Checking last 5 timer task executions..."
echo ""

sudo journalctl -u celery-beat --since "5 minutes ago" | grep "check_job_timers" | tail -5

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Timer task is executing"
else
    echo -e "${RED}✗${NC} No recent timer task execution found"
fi

# Check WebSocket connections
echo ""
echo "========================================="
echo "WebSocket Connection Status"
echo "========================================="
echo "Checking recent WebSocket connections..."
echo ""

sudo journalctl -u daphne --since "5 minutes ago" | grep "ws/timers" | tail -5

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} WebSocket connections detected"
else
    echo -e "${YELLOW}⚠${NC} No recent WebSocket connections (users may not be connected)"
fi

# Summary
echo ""
echo "========================================="
echo "Summary"
echo "========================================="

ALL_OK=true

if [ $WORKER_STATUS -ne 0 ]; then
    echo -e "${RED}✗${NC} Celery Worker needs to be started: sudo systemctl start celery-worker"
    ALL_OK=false
fi

if [ $BEAT_STATUS -ne 0 ]; then
    echo -e "${RED}✗${NC} Celery Beat needs to be started: sudo systemctl start celery-beat"
    ALL_OK=false
fi

if [ $DAPHNE_STATUS -ne 0 ]; then
    echo -e "${RED}✗${NC} Daphne needs to be started: sudo systemctl start daphne"
    ALL_OK=false
fi

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}✓${NC} All services are running! Timer notifications should be working."
    echo ""
    echo "Next steps:"
    echo "1. Login to the application as supervisor/floor manager"
    echo "2. Start a job with a short duration (e.g., 20 minutes)"
    echo "3. Wait for timer warnings (15, 10, 7, 5, 3, 2, 1 min)"
    echo "4. Listen for sound alerts and check for browser notifications"
else
    echo -e "${RED}✗${NC} Some services are not running. Please start them before testing."
fi

echo ""
echo "========================================="
echo "Useful Commands"
echo "========================================="
echo "View Celery Worker logs:  sudo journalctl -u celery-worker -f"
echo "View Celery Beat logs:    sudo journalctl -u celery-beat -f"
echo "View Daphne logs:         sudo journalctl -u daphne -f"
echo "Restart all services:     sudo systemctl restart celery-worker celery-beat daphne"
echo ""
