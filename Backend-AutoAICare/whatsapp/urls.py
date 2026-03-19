from django.urls import path
from .views import WPWebhookReceiverView
from .api_views import PendingWhatsAppEventListView, PendingWhatsAppEventDetailView, SendMessageView

app_name = 'whatsapp'
print("WEBHOOK HIT")
urlpatterns = [
    # Webhook from WP Gateway
    path('webhooks/whatsapp/incoming/', WPWebhookReceiverView.as_view(), name='webhook_incoming'),
    
    # Internal React Admin API
    path('whatsapp/webhook/', WPWebhookReceiverView.as_view()),
    path('whatsapp/events/', PendingWhatsAppEventListView.as_view(), name='event_list'),
    path('whatsapp/events/<int:pk>/', PendingWhatsAppEventDetailView.as_view(), name='event_detail'),
    path('whatsapp/send/', SendMessageView.as_view(), name='send_message'),
]
