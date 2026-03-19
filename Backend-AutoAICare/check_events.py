import os
import django
import sys

# Windows console fix for emojis
sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from whatsapp.models import PendingWhatsAppEvent

events = PendingWhatsAppEvent.objects.all().order_by('-received_at')[:5]
print(f"Total Events configured: {PendingWhatsAppEvent.objects.count()}")

for e in events:
    print(f"ID: {e.id} | Status: {e.status} | Received: {e.received_at} | Phone: {e.phone_number}")
    print(f"RAW: {e.raw_payload}")
    print("-" * 40)
