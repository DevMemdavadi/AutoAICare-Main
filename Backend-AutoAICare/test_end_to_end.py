import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from notify.models import WhatsAppMessageLog
from companies.models import CompanySettings

print("\n======== END TO END TEST ========\n")

# Provide an API token if needed, or we just utilize WPClient and then Webhook
from whatsapp.wp_client import WPClient

settings = CompanySettings.objects.exclude(wp_api_key="").exclude(wp_api_key__isnull=True).first()

if not settings:
    print("NO COMPANY SETTINGS")
    exit()

from django.urls import reverse

print("1. Sending Test Message via Mock Logic (Bypassing API Token due to OAuth restriction)")
test_phone = "+910000000000"
test_content = "Webhook Debug Message"

# Mock WPClient successful response
result = {
    'status': 'success', 
    'message': 'Message sent successfully', 
    'message_id': 'wamid.HBgMOTE5NDI2Njg4MTQyFQIAERgSRTJCOUExM0M3M0YwQkNDNUE3AA==', 
    'wa_id': '919426688142', 
    'message_type': 'text'
}

print("SEND RESULT:", result)

raw_message_id = (
    result.get('message_id') or 
    result.get('messages', [{}])[0].get('id') or 
    result.get('id')
)
whatsapp_message_id = str(raw_message_id).strip() if raw_message_id else ""
print(f"Extracted ID for Database: '{whatsapp_message_id}'")

import django.utils.timezone as timezone
log = WhatsAppMessageLog.objects.create(
    company=settings.company,
    recipient_phone=test_phone,
    template_name='Direct Message',
    message_content=test_content,
    status='SENT',
    sent_at=timezone.now(),
    whatsapp_message_id=whatsapp_message_id
)
print("Created DB Log:", log.id)

print("\n2. Executing Mock Webhook FORMAT 1")
client = Client()
webhook_url = reverse('whatsapp:webhook_incoming')

webhook_payload_1 = {
    "statuses": [
        {
            "id": whatsapp_message_id,
            "status": "delivered"
        }
    ]
}

res = client.post(webhook_url, data=json.dumps(webhook_payload_1), content_type='application/json')
print("Format 1 POST Status:", res.status_code)

log.refresh_from_db()
print(f"DB Log Status after Format 1: {log.status} (Delivered at: {log.delivered_at})")

print("\n3. Executing Mock Webhook FORMAT 2")
webhook_payload_2 = {
    "entry": [
        {
            "changes": [
                {
                    "value": {
                        "statuses": [
                            {
                                "id": whatsapp_message_id,
                                "status": "read"
                            }
                        ]
                    }
                }
            ]
        }
    ]
}

res = client.post(webhook_url, data=json.dumps(webhook_payload_2), content_type='application/json')
print("Format 2 POST Status:", res.status_code)

log.refresh_from_db()
print(f"DB Log Status after Format 2: {log.status} (Read at: {log.read_at})")

print("\n======== END TO END TEST COMPLETE ========\n")
