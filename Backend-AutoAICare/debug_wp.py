import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from notify.models import WhatsAppMessageLog
from whatsapp.models import PendingWhatsAppEvent
from django.db.models import Count

def analyze():
    print("================ DATABASE VERIFICATION ================")
    print("\n--- WhatsAppMessageLog Status Counts ---")
    log_counts = WhatsAppMessageLog.objects.values('status').annotate(count=Count('id'))
    if not log_counts:
        print("No WhatsAppMessageLog records found.")
    for row in log_counts:
        print(row)

    print("\n--- PendingWhatsAppEvent Status Counts ---")
    event_counts = PendingWhatsAppEvent.objects.values('status').annotate(count=Count('id'))
    if not event_counts:
        print("No PendingWhatsAppEvent records found.")
    for row in event_counts:
        print(row)
        
    print("\n--- Sample WhatsAppMessageLogs ---")
    for log in WhatsAppMessageLog.objects.all().order_by('-created_at')[:5]:
        print(f"ID: {log.id}, Status: {log.status}, WhatsApp Msg ID: {log.whatsapp_message_id}")
        
    print("\n--- Sample PendingWhatsAppEvents ---")
    for event in PendingWhatsAppEvent.objects.all().order_by('-received_at')[:5]:
        print(f"ID: {event.id}, Status: {event.status}, Type: {event.event_type}, Payload keys: {list(event.raw_payload.keys()) if isinstance(event.raw_payload, dict) else 'N/A'}")

    print("=======================================================")

if __name__ == '__main__':
    analyze()
