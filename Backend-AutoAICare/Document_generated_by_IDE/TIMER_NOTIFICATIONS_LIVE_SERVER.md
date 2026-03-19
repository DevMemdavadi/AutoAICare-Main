# Live Server Timer Notification System - Deployment Guide

## Overview
The timer notification system provides **real-time sound alerts** for job card timers with 8 warning stages:
- **15 minutes** - Early warning (soft tone)
- **10 minutes** - Moderate warning
- **7 minutes** - Moderate-high warning
- **5 minutes** - High warning
- **3 minutes** - Urgent warning
- **2 minutes** - Very urgent warning
- **1 minute** - Critical warning (requires interaction)
- **Overdue** - Maximum urgency (requires interaction)

## System Architecture

### Backend Components
1. **Celery Beat Task** (`notify.tasks.check_job_timers`)
   - Runs every **30 seconds**
   - Checks all active job timers
   - Broadcasts WebSocket events for warnings
   - Creates in-app notifications

2. **WebSocket Consumer** (`notify/consumers.py`)
   - Handles real-time timer broadcasts
   - Sends events to connected staff users

3. **Database Flags** (JobCard model)
   - `warning_15min_sent`, `warning_10min_sent`, etc.
   - Prevents duplicate notifications

### Frontend Components
1. **TimerContext** (`src/contexts/TimerContext.jsx`)
   - Manages timer alerts state
   - Plays progressive sound alerts
   - Shows browser notifications

2. **useTimerSocket Hook** (`src/hooks/useTimerSocket.js`)
   - Connects to WebSocket
   - Handles all timer event types
   - Auto-reconnects on disconnect

3. **TimerAlertToast** (`src/components/TimerAlertToast.jsx`)
   - Displays visual alerts
   - Different styles for warning/critical/overdue

## Current Status ✅

### What's Already Working
- ✅ Backend Celery task configured (runs every 30 seconds)
- ✅ WebSocket broadcasting implemented
- ✅ Frontend WebSocket connection
- ✅ Progressive sound alerts (8 different frequencies)
- ✅ Browser notifications
- ✅ Multi-stage warning system
- ✅ In-app notification creation
- ✅ Auto-reconnect on disconnect

### What Needs to be Verified on Live Server

## Live Server Deployment Checklist

### 1. Verify Celery Services are Running

```bash
# SSH into your live server
ssh user@your-server

# Check if Celery Worker is running
sudo systemctl status celery-worker

# Check if Celery Beat is running
sudo systemctl status celery-beat

# If not running, start them
sudo systemctl start celery-worker
sudo systemctl start celery-beat

# Enable auto-start on boot
sudo systemctl enable celery-worker
sudo systemctl enable celery-beat
```

### 2. Verify Celery Beat Schedule

Check that the timer task is configured in `config/celery.py`:

```python
app.conf.beat_schedule = {
    'check-job-timers-realtime': {
        'task': 'notify.tasks.check_job_timers',
        'schedule': 30.0,  # Every 30 seconds
    },
}
```

### 3. Check Celery Logs

```bash
# View Celery Worker logs
sudo journalctl -u celery-worker -f

# View Celery Beat logs
sudo journalctl -u celery-beat -f

# Look for:
# - "Timer check complete: X jobs checked, Y notifications sent"
# - "Timer Warning: Job #X has Y minutes remaining"
# - Any errors or exceptions
```

### 4. Verify WebSocket Server (Daphne/Channels)

```bash
# Check if Daphne is running
sudo systemctl status daphne

# If not running, start it
sudo systemctl start daphne

# Enable auto-start on boot
sudo systemctl enable daphne

# Check Daphne logs
sudo journalctl -u daphne -f
```

### 5. Test WebSocket Connection

1. Open browser console on live site
2. Login as supervisor/floor manager
3. Check console for:
   ```
   Timer WebSocket connected: You are connected to timer updates
   ```

### 6. Verify Database Migration

Ensure the warning fields are properly set:

```bash
# Connect to database
psql -U your_db_user -d your_db_name

# Check for NULL warning fields
SELECT COUNT(*) FROM job_cards WHERE 
    warning_10min_sent IS NULL OR 
    warning_15min_sent IS NULL OR
    warning_7min_sent IS NULL OR
    warning_5min_sent IS NULL OR
    warning_3min_sent IS NULL OR
    warning_2min_sent IS NULL OR
    warning_1min_sent IS NULL OR
    overdue_notification_sent IS NULL;

# Should return 0
```

## Testing the Timer System

### Test Scenario 1: Create a Job with Short Duration

1. **Create a booking** (as admin)
2. **Check in the vehicle**
3. **Assign floor manager** (creates job card)
4. **Assign supervisor**
5. **Assign applicator team**
6. **Start the job** with a short duration (e.g., 20 minutes)
7. **Wait and observe**:
   - At 15 min remaining: Soft beep + notification
   - At 10 min remaining: Moderate beep + notification
   - At 7 min remaining: Higher beep + notification
   - At 5 min remaining: High beep + notification
   - At 3 min remaining: Urgent beep + notification
   - At 2 min remaining: Very urgent beep + notification
   - At 1 min remaining: Critical beep + browser notification (requires interaction)
   - At overdue: Maximum urgency beep + browser notification (requires interaction)

### Test Scenario 2: Verify Sound Alerts

1. **Ensure browser has sound enabled**
2. **Grant notification permissions** when prompted
3. **Listen for progressive sound frequencies**:
   - 15 min: 440 Hz (A4) - soft
   - 10 min: 523 Hz (C5) - moderate
   - 7 min: 587 Hz (D5) - moderate-high
   - 5 min: 659 Hz (E5) - high
   - 3 min: 784 Hz (G5) - urgent
   - 2 min: 880 Hz (A5) - very urgent
   - 1 min: 988 Hz (B5) - critical (square wave)
   - Overdue: 1047 Hz (C6) - maximum urgency (square wave)

### Test Scenario 3: Verify Multi-User Notifications

1. **Login as supervisor** in one browser
2. **Login as floor manager** in another browser
3. **Start a job**
4. **Verify both users receive**:
   - Sound alerts
   - Browser notifications
   - In-app notifications
   - Toast alerts

## Troubleshooting

### Issue: No Sound Alerts

**Possible Causes:**
1. Browser has muted the site
2. Browser doesn't support Web Audio API
3. User hasn't interacted with the page (Chrome requires user interaction)

**Solutions:**
```javascript
// Check browser console for:
"Could not play alert sound: [error]"

// Verify Web Audio API support:
console.log('AudioContext' in window || 'webkitAudioContext' in window);
```

### Issue: No WebSocket Connection

**Check:**
1. Daphne service is running
2. WebSocket URL is correct
3. Token is valid
4. User role is staff (supervisor, floor_manager, admin, etc.)

```bash
# Check Daphne logs
sudo journalctl -u daphne -f | grep "WebSocket"

# Look for connection attempts and errors
```

### Issue: No Notifications Sent

**Check:**
1. Celery Beat is running
2. Celery Worker is running
3. Task is executing every 30 seconds
4. Jobs have `job_started_at` set
5. Jobs are in correct status

```bash
# Check Celery Beat logs
sudo journalctl -u celery-beat -f | grep "check_job_timers"

# Should see:
# "Scheduler: Sending due task check-job-timers-realtime"
```

### Issue: Duplicate Notifications

**Check:**
- Only ONE Celery Beat instance is running
- Frontend polling is disabled (it should be)

```bash
# Check for multiple Celery Beat processes
ps aux | grep celery | grep beat

# Should only show ONE process
```

## Service Configuration Files

### Celery Worker Service
**File:** `/etc/systemd/system/celery-worker.service`

```ini
[Unit]
Description=Celery Worker
After=network.target

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/path/to/Car_Software/Backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/celery -A config worker --loglevel=info --logfile=/var/log/celery/worker.log --pidfile=/var/run/celery/worker.pid
ExecStop=/bin/kill -s TERM $MAINPID
Restart=always

[Install]
WantedBy=multi-user.target
```

### Celery Beat Service
**File:** `/etc/systemd/system/celery-beat.service`

```ini
[Unit]
Description=Celery Beat
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/path/to/Car_Software/Backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/celery -A config beat --loglevel=info --logfile=/var/log/celery/beat.log --pidfile=/var/run/celery/beat.pid
Restart=always

[Install]
WantedBy=multi-user.target
```

### Daphne Service
**File:** `/etc/systemd/system/daphne.service`

```ini
[Unit]
Description=Daphne ASGI Server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/path/to/Car_Software/Backend
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/daphne -b 0.0.0.0 -p 8001 config.asgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

## Monitoring

### Real-time Monitoring Commands

```bash
# Monitor all services
watch -n 2 'systemctl status celery-worker celery-beat daphne'

# Monitor Celery task execution
sudo tail -f /var/log/celery/worker.log | grep "check_job_timers"

# Monitor WebSocket connections
sudo tail -f /var/log/daphne/access.log | grep "ws/timers"

# Monitor database for active jobs
psql -U your_db_user -d your_db_name -c "SELECT id, status, job_started_at, warning_5min_sent, warning_1min_sent, overdue_notification_sent FROM job_cards WHERE job_started_at IS NOT NULL AND status IN ('work_in_progress', 'assigned_to_applicator');"
```

## Performance Considerations

### Current Configuration
- **Check Interval**: 30 seconds
- **Active Jobs Query**: Optimized with `select_related()`
- **WebSocket**: Broadcasts only to staff users
- **Notifications**: Created only once per threshold

### Optimization Tips
1. **Increase check interval** if server load is high (e.g., 60 seconds)
2. **Add database indexes** on `job_started_at` and `status` fields
3. **Monitor Celery queue** for task backlog
4. **Use Redis** for Celery broker (faster than database)

## Security Considerations

1. **WebSocket Authentication**: Token-based
2. **Role-based Access**: Only staff roles receive timer updates
3. **Branch Filtering**: Users only see jobs from their branch
4. **HTTPS/WSS**: Use secure connections in production

## Summary

The timer notification system is **fully implemented and ready for production**. The key requirements for live server:

1. ✅ **Celery Worker** must be running
2. ✅ **Celery Beat** must be running (executes task every 30 seconds)
3. ✅ **Daphne/Channels** must be running (WebSocket server)
4. ✅ **Database migrations** must be applied
5. ✅ **Frontend** is already configured with sound alerts

**No code changes needed** - just ensure the services are running on your live server!

## Quick Start Commands

```bash
# Start all services
sudo systemctl start celery-worker
sudo systemctl start celery-beat
sudo systemctl start daphne

# Enable auto-start
sudo systemctl enable celery-worker
sudo systemctl enable celery-beat
sudo systemctl enable daphne

# Check status
sudo systemctl status celery-worker celery-beat daphne

# View logs
sudo journalctl -u celery-worker -f
sudo journalctl -u celery-beat -f
sudo journalctl -u daphne -f
```

## Support

If you encounter any issues:
1. Check service logs first
2. Verify database migrations
3. Test WebSocket connection in browser console
4. Ensure user has staff role
5. Grant browser notification permissions
