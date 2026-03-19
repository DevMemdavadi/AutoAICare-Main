from django.urls import include, path
from rest_framework.routers import DefaultRouter
from . import views
from .views import RetryFailedMessageAPIView, BulkRetryFailedMessagesAPIView, WhatsAppMessageViewSet

router = DefaultRouter()
# This line creates the `/messages/` and `/messages/{id}/` endpoints
router.register(r'messages-list', views.WhatsAppMessageViewSet, basename='message')
router.register(r'contacts', views.ContactViewSet, basename='contact')
router.register(r'contact-groups', views.ContactGroupViewSet, basename='contact-group')
router.register(r'scheduled-messages', views.ScheduledMessageViewSet, basename='scheduled-message')
router.register(r'broadcast-campaigns', views.BroadcastCampaignViewSet, basename='broadcast-campaign')
router.register(r'auto-reply-keywords', views.AutoReplyKeywordViewSet, basename='auto-reply-keyword')
router.register(r'drip-campaigns', views.DripCampaignViewSet, basename='drip-campaign')
router.register(r'drip-messages', views.DripMessageViewSet, basename='drip-message')
router.register(r'drip-recipients', views.DripRecipientViewSet, basename='drip-recipient')

# Team Inbox URLs
router.register(r'chat-assignments', views.ChatAssignmentViewSet, basename='chat-assignment')
router.register(r'agent-availability', views.AgentAvailabilityViewSet, basename='agent-availability')
router.register(r'chat-queue', views.ChatQueueViewSet, basename='chat-queue')

urlpatterns = [
    path('', include(router.urls)),
    path('stats/overview/', views.overview_stats, name='stats-overview'),
    path('stats/today/', views.today_stats, name='stats-today'),
    path('stats/timeline/', views.timeline_stats, name='stats-timeline'),
    path('stats/contacts/', views.contact_stats, name='stats-contacts'),
    path('messages/send/', views.SendMessageAPIView.as_view(), name='send-message'),
    path('templates/', views.list_templates_view, name='list-templates'),
    path('settings/whatsapp/', views.get_whatsapp_settings, name='whatsapp-settings'),
    path('system/health/', views.get_system_health, name='system-health'),
    path('messages/retry/', RetryFailedMessageAPIView.as_view(), name='retry-failed-message'),
    path('messages/bulk-retry/', BulkRetryFailedMessagesAPIView.as_view(), name='bulk-retry-failed-messages'),
    path('messages/unread_count/', WhatsAppMessageViewSet.as_view({'get': 'unread_count'}), name='message-unread-count'),
    path('messages/<int:pk>/mark_as_read/', WhatsAppMessageViewSet.as_view({'post': 'mark_as_read'}), name='message-mark-as-read'),
    
    # Team Inbox URLs
    path('team-inbox/stats/', views.team_inbox_stats, name='team-inbox-stats'),
    path('team-inbox/chat-list/', views.chat_list, name='chat-list'),
    path('team-inbox/auto-assign/', views.auto_assign_chat, name='auto-assign-chat'),
    path('team-inbox/bulk-assign/', views.bulk_assign_chats, name='bulk-assign-chats'),
]

