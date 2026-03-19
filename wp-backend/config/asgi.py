"""
ASGI config for wp project.

This enables BOTH:
- normal HTTP requests (REST APIs)
- WebSockets (Django Channels) used by the whatsapp app
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import whatsapp.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(whatsapp.routing.websocket_urlpatterns)
    ),
})
