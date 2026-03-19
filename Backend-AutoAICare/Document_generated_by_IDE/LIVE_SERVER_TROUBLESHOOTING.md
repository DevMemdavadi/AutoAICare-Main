# Live Server Troubleshooting Guide

## Current Server Setup
- **Service Name**: `cardetailing-backend`
- **Database**: `cardetailing_dev`
- **Database User**: `cardetailing_user`
- **Location**: `/var/www/technoscaffold/car_detailing/backend/DetailEase-Backend`

## Step-by-Step Verification

### 1. Check Main Service Status

```bash
# Check if main service is running
sudo systemctl status cardetailing-backend

# If not running, start it
sudo systemctl start cardetailing-backend

# Enable auto-start on boot
sudo systemctl enable cardetailing-backend
```

### 2. Check Celery Beat Status

The timer notification system requires Celery Beat to be running. Check if it's part of your main service or separate:

```bash
# Option A: Check if it's a separate service
sudo systemctl status celery-beat

# Option B: Check if it's running as part of cardetailing-backend
ps aux | grep "celery.*beat"

# If you see a process, Celery Beat is running
# If not, you need to start it
```

### 3. Check Daphne (WebSocket Server) Status

```bash
# Option A: Check if it's a separate service
sudo systemctl status daphne

# Option B: Check if it's running as part of cardetailing-backend
ps aux | grep daphne

# If you see a process, Daphne is running
# If not, you need to start it
```

### 4. View Service Logs (Without Grep)

Since grep might be filtering out the output, view logs directly:

```bash
# View last 50 lines of cardetailing-backend logs
sudo journalctl -u cardetailing-backend -n 50

# View real-time logs
sudo journalctl -u cardetailing-backend -f

# Look for:
# - "check_job_timers" (timer task execution)
# - "Timer check complete" (successful execution)
# - Any errors or exceptions
```

### 5. Fix PostgreSQL Authentication Error

The error `Peer authentication failed` means PostgreSQL is trying to use peer authentication. Fix this:

```bash
# Option A: Use password authentication with -W flag
psql -U cardetailing_user -d cardetailing_dev -h localhost -W -c "SELECT id, status, job_started_at FROM job_cards WHERE job_started_at IS NOT NULL;"

# Option B: Switch to postgres user first
sudo -u postgres psql -d cardetailing_dev -c "SELECT id, status, job_started_at FROM job_cards WHERE job_started_at IS NOT NULL;"

# Option C: Use Django shell instead
cd /var/www/technoscaffold/car_detailing/backend/DetailEase-Backend
source venv/bin/activate
python manage.py shell
```

### 6. Check Database from Django Shell

```python
# In Django shell
from jobcards.models import JobCard
from django.utils import timezone

# Check active jobs with timers
active_jobs = JobCard.objects.filter(
    job_started_at__isnull=False,
    status__in=['work_in_progress', 'assigned_to_applicator']
)

print(f"Active jobs with timers: {active_jobs.count()}")

for job in active_jobs:
    print(f"Job #{job.id}: {job.status}, Started: {job.job_started_at}")
    print(f"  Remaining: {job.get_remaining_minutes()} minutes")
    print(f"  Warnings sent: 15min={job.warning_15min_sent}, 10min={job.warning_10min_sent}, 5min={job.warning_5min_sent}")
```

### 7. Manually Test Timer Task

```python
# In Django shell
from notify.tasks import check_job_timers

# Run the timer check task manually
result = check_job_timers()
print(result)

# Should show:
# {'checked_jobs': X, 'notifications_sent': Y}
```

### 8. Check Celery Configuration

```bash
# View Celery configuration
cd /var/www/technoscaffold/car_detailing/backend/DetailEase-Backend
source venv/bin/activate
python manage.py shell

# In shell:
from config.celery import app
print(app.conf.beat_schedule)

# Should show 'check-job-timers-realtime' task
```

### 9. Check if Services are Combined or Separate

Your setup might have all services (Django, Celery, Daphne) in one systemd service or separate. Check:

```bash
# View the service file
sudo cat /etc/systemd/system/cardetailing-backend.service

# Look for:
# - ExecStart commands
# - Whether it starts multiple processes
# - Whether it uses supervisor or similar
```

### 10. Common Service Configurations

#### Configuration A: All-in-One Service (Using Supervisor)

If your service uses Supervisor, check:

```bash
# Check supervisor status
sudo supervisorctl status

# Should show:
# - cardetailing-gunicorn
# - cardetailing-celery-worker
# - cardetailing-celery-beat
# - cardetailing-daphne

# Restart all
sudo supervisorctl restart all
```

#### Configuration B: Separate Services

If you have separate services:

```bash
# Start each service
sudo systemctl start cardetailing-gunicorn
sudo systemctl start cardetailing-celery-worker
sudo systemctl start cardetailing-celery-beat
sudo systemctl start cardetailing-daphne

# Check status
sudo systemctl status cardetailing-celery-beat
sudo systemctl status cardetailing-daphne
```

## Quick Diagnostic Commands

Run these commands and share the output:

```bash
# 1. Check what's running
echo "=== Running Processes ==="
ps aux | grep -E "celery|daphne|gunicorn" | grep -v grep

# 2. Check systemd services
echo "=== Systemd Services ==="
sudo systemctl list-units | grep cardetailing

# 3. Check supervisor (if used)
echo "=== Supervisor Status ==="
sudo supervisorctl status 2>/dev/null || echo "Supervisor not installed"

# 4. Check recent logs
echo "=== Recent Logs ==="
sudo journalctl -u cardetailing-backend --since "5 minutes ago" | tail -20

# 5. Check listening ports
echo "=== Listening Ports ==="
sudo netstat -tlnp | grep -E "8000|8001|5432"
```

## Expected Output for Working System

When everything is working, you should see:

```bash
# ps aux output should show:
/path/to/venv/bin/celery -A config worker ...
/path/to/venv/bin/celery -A config beat ...
/path/to/venv/bin/daphne -b 0.0.0.0 -p 8001 config.asgi:application

# journalctl output should show (every 30 seconds):
Scheduler: Sending due task check-job-timers-realtime
Task notify.tasks.check_job_timers succeeded
Timer check complete: X jobs checked, Y notifications sent
```

## If Celery Beat is Not Running

Start it manually to test:

```bash
cd /var/www/technoscaffold/car_detailing/backend/DetailEase-Backend
source venv/bin/activate

# Start Celery Beat in foreground (for testing)
celery -A config beat --loglevel=info

# You should see:
# - "Scheduler: Sending due task check-job-timers-realtime" every 30 seconds
# - Task execution logs

# Press Ctrl+C to stop
```

## If Daphne is Not Running

Start it manually to test:

```bash
cd /var/www/technoscaffold/car_detailing/backend/DetailEase-Backend
source venv/bin/activate

# Start Daphne in foreground (for testing)
daphne -b 0.0.0.0 -p 8001 config.asgi:application

# You should see:
# - "Listening on TCP address 0.0.0.0:8001"
# - WebSocket connection logs when users connect

# Press Ctrl+C to stop
```

## Next Steps

1. **Run the diagnostic commands** above and share the output
2. **Check the service file** to understand your setup
3. **Verify Celery Beat is running** (most critical for timer notifications)
4. **Verify Daphne is running** (required for WebSocket/sound alerts)
5. **Test manually** if needed using the commands above

## Contact Information

If you need help interpreting the output, share:
1. Output of `ps aux | grep -E "celery|daphne"`
2. Output of `sudo systemctl status cardetailing-backend`
3. Content of `/etc/systemd/system/cardetailing-backend.service`
4. Output of `sudo supervisorctl status` (if using supervisor)
