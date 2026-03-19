from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotificationTemplateViewSet, 
    NotificationLogViewSet,
    InAppNotificationViewSet,
    WhatsAppMessageLogViewSet
)
from .whatsapp_manual_views import PendingWhatsAppMessagesViewSet

router = DefaultRouter()
router.register(r'templates', NotificationTemplateViewSet, basename='notification-template')
router.register(r'logs', NotificationLogViewSet, basename='notification-log')
router.register(r'in-app', InAppNotificationViewSet, basename='in-app-notification')
router.register(r'whatsapp/logs', WhatsAppMessageLogViewSet, basename='whatsapp-log')
router.register(r'whatsapp/pending', PendingWhatsAppMessagesViewSet, basename='whatsapp-pending')

urlpatterns = [
    path('', include(router.urls)),
]
