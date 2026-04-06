from django.urls import path
from . import views

app_name = 'chats'

urlpatterns = [
    path("contacts/", views.ContactListAPIView.as_view(), name="chat-contacts"),
    path("<str:phone_number>/messages/", views.MessageListAPIView.as_view(), name="chat-messages"),
    path("send/", views.SendMessageAPIView.as_view(), name="chat-send"),
    path("<str:phone_number>/mark-read/", views.MarkReadAPIView.as_view(), name="chat-mark-read"),
]
