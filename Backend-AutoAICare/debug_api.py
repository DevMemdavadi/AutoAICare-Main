import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.filter(is_superuser=True).first()
if not user:
    user = User.objects.first()

client = Client()
if user:
    refresh = RefreshToken.for_user(user)
    client = Client(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

def safe_print(res):
    try:
        print(json.dumps(res.json(), indent=2)[:1000] + "\n...[truncated]")
    except:
        print(res.content)

print("\n--- GET /api/notify/whatsapp/logs/ ---")
res = client.get('/api/notify/whatsapp/logs/')
print("Status:", res.status_code)
safe_print(res)

print("\n--- GET /api/notify/whatsapp/logs/stats/ ---")
res2 = client.get('/api/notify/whatsapp/logs/stats/')
print("Status:", res2.status_code)
safe_print(res2)

print("\n--- GET /api/whatsapp/events/?status=pending ---")
res3 = client.get('/api/whatsapp/events/?status=pending')
print("Status:", res3.status_code)
safe_print(res3)

# Let's also check url patterns if 404
if res.status_code == 404:
    res = client.get('/notify/whatsapp/logs/')
    print("\n--- GET /notify/whatsapp/logs/ ---")
    print("Status:", res.status_code)
    safe_print(res)

    res2 = client.get('/notify/whatsapp/logs/stats/')
    print("\n--- GET /notify/whatsapp/logs/stats/ ---")
    print("Status:", res2.status_code)
    safe_print(res2)

    res3 = client.get('/whatsapp/events/?status=pending')
    print("\n--- GET /whatsapp/events/?status=pending ---")
    print("Status:", res3.status_code)
    safe_print(res3)
