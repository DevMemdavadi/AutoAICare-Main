from django.contrib import admin
from .models import PendingWhatsAppEvent

@admin.register(PendingWhatsAppEvent)
class PendingWhatsAppEventAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'event_type', 'message_type', 'status', 'received_at')
    list_filter = ('status', 'event_type', 'message_type')
    search_fields = ('phone_number', 'message_content', 'message_id')
    readonly_fields = ('raw_payload', 'received_at', 'processed_at')
