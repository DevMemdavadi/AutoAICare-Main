from django.urls import path, re_path
from . import consumers

websocket_urlpatterns = [
    path("ws/messages/", consumers.WhatsAppConsumer.as_asgi()),
    re_path(r"ws/whatsapp/chat/(?P<phone_number>[^/]+)/$", consumers.ChatConsumer.as_asgi()),
    re_path(r'ws/team-inbox/$', consumers.TeamInboxConsumer.as_asgi()),
]

# from django.urls import re_path
# from . import consumers

# websocket_urlpatterns = [
# ] 