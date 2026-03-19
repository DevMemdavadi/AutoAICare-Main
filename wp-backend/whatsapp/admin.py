from django.contrib import admin
from .models import WhatsAppMessage, ScheduledMessage, Workspace

# Inline for WhatsAppMessage replies
class WhatsAppMessageInline(admin.TabularInline):
    model = WhatsAppMessage
    fields = ('phone_number', 'message_type', 'status', 'is_read', 'timestamp')
    extra = 0
    can_delete = True
    show_change_link = True
    verbose_name = "Reply Message"
    verbose_name_plural = "Reply Messages"

# Admin configuration for WhatsAppMessage
class WhatsAppMessageAdmin(admin.ModelAdmin):
    list_display = (
        'phone_number',
        'message_type',
        'status',
        'is_read',
        'message_id',
        'timestamp',
        'sender',
        'recipient',
        'has_replies',
        'status_updated_at',
    )
    list_filter = (
        'message_type',
        'status',
        'is_read',
        'timestamp',
        'status_updated_at',
    )
    search_fields = (
        'phone_number',
        'message_id',
        'message_content',
        'template_name',
        'sender__username',
        'recipient__username',
    )
    list_editable = ('status', 'is_read')
    list_per_page = 25
    date_hierarchy = 'timestamp'
    raw_id_fields = ('sender', 'recipient', 'reply_to')
    autocomplete_fields = ['sender', 'recipient', 'reply_to'] if 'sender' in admin.ModelAdmin.autocomplete_fields else []
    inlines = [WhatsAppMessageInline]
    
    # Exclude non-editable fields from the form
    readonly_fields = ('status_updated_at', 'timestamp')

    fieldsets = (
        ('Message Details', {
            'fields': (
                'phone_number',
                'message_type',
                'message_content',
                'template_name',
                'media',
                'message_id',
            )
        }),
        ('Status Information', {
            'fields': (
                'status',
                'is_read',
                'status_updated_at',  # Read-only
                'timestamp',          # Read-only
            )
        }),
        ('Relationships', {
            'fields': (
                'sender',
                'recipient',
                'reply_to',
            ),
            'classes': ('collapse',)
        }),
    )

    def has_replies(self, obj):
        return obj.replies.exists()
    has_replies.boolean = True
    has_replies.short_description = 'Has Replies'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('sender', 'recipient', 'reply_to').prefetch_related('replies')

# Admin configuration for ScheduledMessage
class ScheduledMessageAdmin(admin.ModelAdmin):
    list_display = (
        'recipient_number',
        'message_type',
        'status',
        'scheduled_at',
        'created_at',
        'updated_at',
    )
    list_filter = (
        'message_type',
        'status',
        'scheduled_at',
        'created_at',
    )
    search_fields = (
        'recipient_number',
        'message_content',
        'template_name',
    )
    list_editable = ('status',)
    list_per_page = 25
    date_hierarchy = 'scheduled_at'

    fieldsets = (
        ('Message Details', {
            'fields': (
                'recipient_number',
                'message_type',
                'message_content',
                'template_name',
                'template_params',
                'media_file',
            )
        }),
        ('Scheduling Information', {
            'fields': (
                'scheduled_at',
                'status',
                'created_at',
                'updated_at',
            )
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request)


# Register admin classes with custom admin site
# admin_site.register(WhatsAppMessage, WhatsAppMessageAdmin)
# admin_site.register(ScheduledMessage, ScheduledMessageAdmin)

admin.site.register(WhatsAppMessage, WhatsAppMessageAdmin)
admin.site.register(ScheduledMessage, ScheduledMessageAdmin)

@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'webhook_url', 'is_active', 'webhook_active', 'created_at')
    search_fields = ('name',)
    list_filter = ('is_active', 'webhook_active')
    readonly_fields = ('api_key', 'api_secret')