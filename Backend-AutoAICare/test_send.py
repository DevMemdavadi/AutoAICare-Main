import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from companies.models import CompanySettings
from whatsapp.wp_client import WPClient

settings = CompanySettings.objects.exclude(wp_api_key="").exclude(wp_api_key__isnull=True).first()
if settings:
    wp_url = "http://127.0.0.1:8000/api"
    wp_client = WPClient(wp_url, settings.wp_api_key)
    result = wp_client.send_message("+919426688142", "Test message to debug ID")
    print("SEND MESSAGE RESULT:", result)
else:
    print("NO COMPANY SETTINGS")
