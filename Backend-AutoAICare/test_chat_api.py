import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from chats.models import Conversation
from rest_framework.test import APIClient
from users.models import User

print("Conversations count:", Conversation.objects.count())

user = User.objects.first()
if user:
    print(f"Testing with user: {user.email}")
    client = APIClient()
    client.force_authenticate(user=user)
    
    response = client.get('/api/chats/contacts/')
    print("Response status:", response.status_code)
    print("Response data:", response.data)
else:
    print("No user found")
