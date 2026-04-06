import os
import sys
import django
import json

crm_path = r"c:\Users\lenovo\OneDrive\Desktop\AutoAICare-Main\Backend-AutoAICare"
sys.path.append(crm_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from whatsapp.models import PendingWhatsAppEvent
print("--- CRM PENDING WHATSAPP EVENTS (LAST 5) ---")
events = PendingWhatsAppEvent.objects.order_by('-id')[:5]
for e in events:
    print(f"ID: {e.id}, Type: {e.message_type}")
    try:
        print("  Payload Data:", json.dumps(e.raw_payload.get('data', {}), indent=2))
    except:
        pass

sys.path.remove(crm_path)

wp_path = r"c:\Users\lenovo\OneDrive\Desktop\AutoAICare-Main\wp-backend"
sys.path.append(wp_path)
os.environ["DJANGO_SETTINGS_MODULE"] = "wp_backend.settings"
django.setup()

from whatsapp.models import WhatsAppMessage
print("\n--- WP-BACKEND MESSAGES (LAST 5) ---")
msgs = WhatsAppMessage.objects.order_by('-id')[:5]
for m in msgs:
    print(f"ID: {m.id}, Type: {m.message_type}, Media: {bool(m.media)}, File: {m.media.name if m.media else 'None'}")
