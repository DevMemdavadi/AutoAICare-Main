import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from whatsapp.models import Workspace

workspaces = Workspace.objects.all()
print(f"Total Workspaces: {workspaces.count()}")
for w in workspaces:
    print(f"Workspace: {w.name} | Webhook active: {w.webhook_active} | URL: {w.webhook_url}")
