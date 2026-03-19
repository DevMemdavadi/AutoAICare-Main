from django.contrib import admin
from .models import (
    NotificationTemplate,
    NotificationLog,
    InAppNotification,
    WhatsAppTemplate,
    WhatsAppMessageLog
)


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'notification_type', 'channel', 'is_active', 'company']
    list_filter = ['channel', 'is_active', 'notification_type', 'company']
    search_fields = ['name', 'notification_type']


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ['notification_type', 'recipient', 'channel', 'status', 'created_at']
    list_filter = ['status', 'channel', 'notification_type', 'created_at']
    search_fields = ['recipient__email', 'recipient__name']
    readonly_fields = ['created_at', 'sent_at']


@admin.register(InAppNotification)
class InAppNotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'recipient', 'notification_type', 'is_read', 'created_at', 'company']
    list_filter = ['is_read', 'notification_type', 'created_at', 'company']
    search_fields = ['title', 'message', 'recipient__email', 'recipient__name']
    readonly_fields = ['created_at', 'read_at']


@admin.register(WhatsAppTemplate)
class WhatsAppTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'template_name',
        'company',
        'notification_type',
        'approval_status',
        'is_active',
        'created_at'
    ]
    list_filter = ['approval_status', 'is_active', 'category', 'company', 'language']
    search_fields = ['template_name', 'notification_type', 'body_text']
    readonly_fields = ['created_at', 'updated_at', 'approved_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'template_name', 'notification_type', 'category', 'language')
        }),
        ('Template Content', {
            'fields': ('header_text', 'body_text', 'footer_text', 'variable_mapping', 'button_config')
        }),
        ('WhatsApp API', {
            'fields': ('whatsapp_template_id', 'approval_status', 'approved_at')
        }),
        ('Status', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    )


@admin.register(WhatsAppMessageLog)
class WhatsAppMessageLogAdmin(admin.ModelAdmin):
    list_display = [
        'template_name',
        'recipient_phone',
        'company',
        'status',
        'created_at',
        'sent_at',
        'delivered_at'
    ]
    list_filter = ['status', 'company', 'created_at']
    search_fields = [
        'recipient_phone',
        'template_name',
        'whatsapp_message_id',
        'recipient__email',
        'recipient__name'
    ]
    readonly_fields = [
        'created_at',
        'sent_at',
        'delivered_at',
        'read_at',
        'whatsapp_message_id'
    ]
    
    fieldsets = (
        ('Message Information', {
            'fields': ('company', 'template', 'template_name', 'message_content')
        }),
        ('Recipient', {
            'fields': ('recipient', 'recipient_phone')
        }),
        ('Status', {
            'fields': ('status', 'whatsapp_message_id', 'error_message', 'error_code')
        }),
        ('Related Objects', {
            'fields': ('related_booking_id', 'related_jobcard_id', 'related_invoice_id')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'sent_at', 'delivered_at', 'read_at')
        }),
    )
    
    def has_add_permission(self, request):
        # Logs are created automatically, not manually
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of logs
        return request.user.is_superuser
