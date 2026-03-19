import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('car_service')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Periodic tasks configuration
app.conf.beat_schedule = {
    'send-bi-weekly-maintenance-reminders': {
        'task': 'customers.tasks.send_maintenance_reminders',
        'schedule': crontab(day_of_week='1,4', hour=10, minute=0),  # Monday and Thursday at 10 AM
    },
    'check-job-timers-realtime': {
        'task': 'notify.tasks.check_job_timers',
        'schedule': 30.0,  # Every 30 seconds for real-time WebSocket alerts
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

