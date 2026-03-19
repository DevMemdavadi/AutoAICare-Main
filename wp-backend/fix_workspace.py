import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from whatsapp.models import Workspace

# Use the correct AutoAICare internal local routing port
target_url = "http://127.0.0.1:8001/api/webhooks/whatsapp/incoming/"

workspaces = Workspace.objects.all()
for w in workspaces:
    old_url = w.webhook_url
    w.webhook_url = target_url
    w.webhook_active = True
    w.save()
    print(f"Updated Workspace '{w.name}' webhook URL from {old_url} to {target_url}")
