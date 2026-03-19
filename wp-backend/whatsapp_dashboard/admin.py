from django.contrib import admin
from django.utils.html import format_html
from .models import Contact, ContactGroup, BroadcastCampaign, BroadcastRecipient, AutoReplyKeyword, DripCampaign, DripMessage, DripRecipient, DripMessageLog, ChatAssignment, ChatTransferLog, AgentAvailability, ChatQueue

# Inline for ContactGroup to show contacts within a group
class ContactInline(admin.TabularInline):
    model = Contact.groups.through
    extra = 1
    verbose_name = "Contact"
    verbose_name_plural = "Contacts"
    autocomplete_fields = ['contact']

# Inline for BroadcastRecipient to show recipients within a campaign
class BroadcastRecipientInline(admin.TabularInline):
    model = BroadcastRecipient
    extra = 1
    verbose_name = "Recipient"
    verbose_name_plural = "Recipients"
    fields = ('contact', 'status', 'sent_at', 'message_id', 'error')
    readonly_fields = ('sent_at', 'message_id', 'error')
    autocomplete_fields = ['contact']
    can_delete = True

# Inline for DripMessage to show messages within a campaign
class DripMessageInline(admin.TabularInline):
    model = DripMessage
    extra = 1
    verbose_name = "Message"
    verbose_name_plural = "Messages"
    fields = ('sequence_number', 'message_type', 'content', 'template_name', 'delay_days', 'delay_hours', 'delay_minutes', 'is_active')
    ordering = ('sequence_number',)

# Inline for DripRecipient to show recipients within a campaign
class DripRecipientInline(admin.TabularInline):
    model = DripRecipient
    extra = 1
    verbose_name = "Recipient"
    verbose_name_plural = "Recipients"
    fields = ('contact', 'status', 'current_message_index', 'messages_sent', 'messages_failed', 'next_message_at')
    readonly_fields = ('current_message_index', 'messages_sent', 'messages_failed', 'next_message_at')
    autocomplete_fields = ['contact']
    can_delete = True

# Inline for DripMessageLog to show message logs
class DripMessageLogInline(admin.TabularInline):
    model = DripMessageLog
    extra = 0
    verbose_name = "Message Log"
    verbose_name_plural = "Message Logs"
    fields = ('sequence_number', 'message_type', 'status', 'scheduled_at', 'sent_at', 'whatsapp_message_id', 'error')
    readonly_fields = ('sequence_number', 'message_type', 'status', 'scheduled_at', 'sent_at', 'whatsapp_message_id', 'error')
    can_delete = False
    max_num = 0

# Admin configuration for ContactGroup
class ContactGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'contact_count', 'view_contacts_link')
    search_fields = ('name',)
    list_filter = ('created_at',)
    inlines = [ContactInline]
    actions = ['delete_selected_groups']
    
    def contact_count(self, obj):
        return obj.contacts.count()
    contact_count.short_description = 'Number of Contacts'
    
    def view_contacts_link(self, obj):
        url = f"/admin/yourapp/contact/?groups__id__exact={obj.id}"
        return format_html('<a href="{}">View Contacts</a>', url)
    view_contacts_link.short_description = 'View Contacts'
    
    def delete_selected_groups(self, request, queryset):
        for group in queryset:
            group.contacts.clear()
            group.delete()
    delete_selected_groups.short_description = "Delete selected groups and clear contacts"

# Admin configuration for Contact
class ContactAdmin(admin.ModelAdmin):
    list_display = (
        'name', 
        'phone_number', 
        'email', 
        'status', 
        'allow_broadcast', 
        'allow_sms', 
        'last_message_at', 
        'created_at',
        'group_list',
        'view_broadcasts_link'
    )
    list_filter = (
        'status', 
        'allow_broadcast', 
        'allow_sms', 
        'groups', 
        'created_at', 
        'last_message_at'
    )
    search_fields = (
        'name', 
        'phone_number', 
        'email', 
        'city', 
        'state', 
        'order_number', 
        'invoiceno'
    )
    list_editable = ('status', 'allow_broadcast', 'allow_sms')
    list_per_page = 25
    date_hierarchy = 'created_at'
    raw_id_fields = ('groups',)
    autocomplete_fields = ['groups']
    actions = ['mark_active', 'mark_inactive', 'enable_broadcast', 'disable_broadcast']
    
    fieldsets = (
        ('Personal Information', {
            'fields': (
                'name', 
                'email', 
                'country_code', 
                'phone_number', 
                'mobile', 
                'status'
            )
        }),
        ('Communication Preferences', {
            'fields': (
                'allow_broadcast', 
                'allow_sms', 
                'last_message_at',
                'whatsapp_916359100911'
            )
        }),
        ('Order Details', {
            'fields': (
                'order_number', 
                'orderno', 
                'orderdate', 
                'invoiceamt', 
                'invoiceno'
            ),
            'classes': ('collapse',)
        }),
        ('Tracking Information', {
            'fields': (
                'tracking_number', 
                'tracking_provider', 
                'tracking_link', 
                'tracking_url',
                'lrno', 
                'transportname'
            ),
            'classes': ('collapse',)
        }),
        ('Cart Information', {
            'fields': (
                'last_cart_items', 
                'last_cart_items_text', 
                'last_cart_total_value', 
                'last_cart_total_value_text'
            ),
            'classes': ('collapse',)
        }),
        ('Additional Attributes', {
            'fields': (
                'attribute_1', 
                'attribute_2', 
                'attribute_3', 
                'city', 
                'state', 
                'cases', 
                'reason', 
                'source_id', 
                'source_url', 
                'type'
            ),
            'classes': ('collapse',)
        }),
        ('Supply Information', {
            'fields': (
                'supplyname', 
                'supplymobile'
            ),
            'classes': ('collapse',)
        }),
        ('Group Membership', {
            'fields': ('groups',)
        }),
    )
    
    def group_list(self, obj):
        return ", ".join([group.name for group in obj.groups.all()])
    group_list.short_description = 'Groups'
    
    def view_broadcasts_link(self, obj):
        url = f"/admin/yourapp/broadcastrecipient/?contact__id__exact={obj.id}"
        return format_html('<a href="{}">View Broadcasts</a>', url)
    view_broadcasts_link.short_description = 'Broadcasts'
    
    def mark_active(self, request, queryset):
        queryset.update(status='active')
    mark_active.short_description = "Mark selected contacts as active"
    
    def mark_inactive(self, request, queryset):
        queryset.update(status='inactive')
    mark_inactive.short_description = "Mark selected contacts as inactive"
    
    def enable_broadcast(self, request, queryset):
        queryset.update(allow_broadcast=True)
    enable_broadcast.short_description = "Enable broadcast for selected contacts"
    
    def disable_broadcast(self, request, queryset):
        queryset.update(allow_broadcast=False)
    disable_broadcast.short_description = "Disable broadcast for selected contacts"
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('groups')

# Admin configuration for BroadcastCampaign
class BroadcastCampaignAdmin(admin.ModelAdmin):
    list_display = (
        'name', 
        'message_type', 
        'status', 
        'scheduled_at', 
        'created_at', 
        'recipient_count',
        'view_recipients_link'
    )
    list_filter = ('status', 'message_type', 'scheduled_at', 'created_at')
    search_fields = ('name', 'template_name', 'message_content')
    list_editable = ('status',)
    date_hierarchy = 'created_at'
    inlines = [BroadcastRecipientInline]
    actions = ['mark_completed', 'reschedule_campaign']
    
    def recipient_count(self, obj):
        return obj.recipients.count()
    recipient_count.short_description = 'Recipients'
    
    def view_recipients_link(self, obj):
        url = f"/admin/yourapp/broadcastrecipient/?campaign__id__exact={obj.id}"
        return format_html('<a href="{}">View Recipients</a>', url)
    view_recipients_link.short_description = 'View Recipients'
    
    def mark_completed(self, request, queryset):
        queryset.update(status='completed')
    mark_completed.short_description = "Mark selected campaigns as completed"
    
    def reschedule_campaign(self, request, queryset):
        from django.utils import timezone
        queryset.update(scheduled_at=timezone.now())
    reschedule_campaign.short_description = "Reschedule campaigns to now"
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('recipients')

# Admin configuration for BroadcastRecipient
class BroadcastRecipientAdmin(admin.ModelAdmin):
    list_display = (
        'campaign', 
        'contact', 
        'status', 
        'sent_at', 
        'message_id', 
        'error_summary'
    )
    list_filter = ('status', 'sent_at', 'campaign')
    search_fields = (
        'campaign__name', 
        'contact__name', 
        'contact__phone_number', 
        'message_id'
    )
    readonly_fields = ('sent_at', 'message_id', 'error')
    autocomplete_fields = ['campaign', 'contact']
    list_per_page = 25
    actions = ['retry_failed']
    
    def error_summary(self, obj):
        return obj.error[:50] + '...' if obj.error and len(obj.error) > 50 else obj.error
    error_summary.short_description = 'Error'
    
    def retry_failed(self, request, queryset):
        from .tasks import send_broadcast_campaign
        for recipient in queryset.filter(status='failed'):
            send_broadcast_campaign.delay(recipient.campaign.id, retry_failed_only=True)
    retry_failed.short_description = "Retry failed recipients"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('campaign', 'contact')

# Admin configuration for AutoReplyKeyword
class AutoReplyKeywordAdmin(admin.ModelAdmin):
    list_display = (
        'keyword', 
        'reply_text_summary', 
        'is_active', 
        'created_at', 
        'updated_at'
    )
    list_filter = ('is_active', 'created_at', 'updated_at')
    search_fields = ('keyword', 'reply_text')
    list_editable = ('is_active',)
    list_per_page = 25
    date_hierarchy = 'created_at'
    actions = ['activate_keywords', 'deactivate_keywords']
    
    def reply_text_summary(self, obj):
        return obj.reply_text[:50] + '...' if len(obj.reply_text) > 50 else obj.reply_text
    reply_text_summary.short_description = 'Reply Text'
    
    def activate_keywords(self, request, queryset):
        queryset.update(is_active=True)
    activate_keywords.short_description = "Activate selected keywords"
    
    def deactivate_keywords(self, request, queryset):
        queryset.update(is_active=False)
    deactivate_keywords.short_description = "Deactivate selected keywords"

# Drip Campaign Admin Configurations

class DripCampaignAdmin(admin.ModelAdmin):
    list_display = (
        'name', 
        'status', 
        'start_date', 
        'end_date', 
        'created_at', 
        'total_recipients',
        'active_recipients',
        'completed_recipients',
        'message_count',
        'view_recipients_link'
    )
    list_filter = ('status', 'start_date', 'end_date', 'created_at')
    search_fields = ('name', 'description')
    list_editable = ('status',)
    date_hierarchy = 'created_at'
    inlines = [DripMessageInline, DripRecipientInline]
    actions = ['activate_campaigns', 'pause_campaigns', 'resume_campaigns', 'cancel_campaigns']
    
    fieldsets = (
        ('Campaign Information', {
            'fields': ('name', 'description', 'status')
        }),
        ('Timing', {
            'fields': ('start_date', 'end_date')
        }),
        ('Recipients', {
            'fields': ('contact_ids', 'group_ids'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('total_recipients', 'active_recipients', 'completed_recipients', 'failed_recipients'),
            'classes': ('collapse',)
        }),
    )
    
    def message_count(self, obj):
        return obj.messages.filter(is_active=True).count()
    message_count.short_description = 'Messages'
    
    def view_recipients_link(self, obj):
        url = f"/admin/yourapp/driprecipient/?campaign__id__exact={obj.id}"
        return format_html('<a href="{}">View Recipients</a>', url)
    view_recipients_link.short_description = 'View Recipients'
    
    def activate_campaigns(self, request, queryset):
        from .tasks import start_drip_campaign
        for campaign in queryset.filter(status='draft'):
            campaign.status = 'active'
            campaign.save()
            start_drip_campaign.delay(campaign.id)
    activate_campaigns.short_description = "Activate selected campaigns"
    
    def pause_campaigns(self, request, queryset):
        queryset.filter(status='active').update(status='paused')
    pause_campaigns.short_description = "Pause selected campaigns"
    
    def resume_campaigns(self, request, queryset):
        from .tasks import resume_drip_campaign
        for campaign in queryset.filter(status='paused'):
            campaign.status = 'active'
            campaign.save()
            resume_drip_campaign.delay(campaign.id)
    resume_campaigns.short_description = "Resume selected campaigns"
    
    def cancel_campaigns(self, request, queryset):
        queryset.update(status='cancelled')
    cancel_campaigns.short_description = "Cancel selected campaigns"
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('messages', 'recipients')

class DripMessageAdmin(admin.ModelAdmin):
    list_display = (
        'campaign', 
        'sequence_number', 
        'message_type', 
        'content_summary', 
        'delay_days', 
        'delay_hours', 
        'delay_minutes',
        'total_delay_minutes',
        'is_active', 
        'created_at'
    )
    list_filter = ('campaign', 'message_type', 'is_active', 'created_at')
    search_fields = ('campaign__name', 'content', 'template_name')
    list_editable = ('sequence_number', 'is_active')
    ordering = ('campaign', 'sequence_number')
    autocomplete_fields = ['campaign']
    
    def content_summary(self, obj):
        if obj.content:
            return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
        elif obj.template_name:
            return f"Template: {obj.template_name}"
        return "No content"
    content_summary.short_description = 'Content'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('campaign')

class DripRecipientAdmin(admin.ModelAdmin):
    list_display = (
        'campaign', 
        'contact', 
        'status', 
        'current_message_index', 
        'messages_sent', 
        'messages_failed',
        'next_message_at', 
        'created_at'
    )
    list_filter = ('status', 'campaign', 'created_at')
    search_fields = (
        'campaign__name', 
        'contact__name', 
        'contact__phone_number', 
        'contact__email'
    )
    readonly_fields = ('current_message_index', 'messages_sent', 'messages_failed', 'last_message_sent_at', 'next_message_at')
    autocomplete_fields = ['campaign', 'contact']
    inlines = [DripMessageLogInline]
    actions = ['reset_recipients', 'unsubscribe_recipients']
    
    def reset_recipients(self, request, queryset):
        queryset.update(
            status='pending',
            current_message_index=0,
            messages_sent=0,
            messages_failed=0,
            last_message_sent_at=None,
            next_message_at=None
        )
    reset_recipients.short_description = "Reset selected recipients"
    
    def unsubscribe_recipients(self, request, queryset):
        from django.utils import timezone
        queryset.update(
            status='unsubscribed',
            unsubscribed_at=timezone.now()
        )
    unsubscribe_recipients.short_description = "Unsubscribe selected recipients"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('campaign', 'contact')

class DripMessageLogAdmin(admin.ModelAdmin):
    list_display = (
        'recipient', 
        'sequence_number', 
        'message_type', 
        'status', 
        'scheduled_at', 
        'sent_at', 
        'whatsapp_message_id',
        'error_summary'
    )
    list_filter = ('status', 'message_type', 'scheduled_at', 'sent_at', 'recipient__campaign')
    search_fields = (
        'recipient__contact__name', 
        'recipient__contact__phone_number', 
        'recipient__campaign__name',
        'whatsapp_message_id'
    )
    readonly_fields = ('scheduled_at', 'sent_at', 'whatsapp_message_id', 'error')
    autocomplete_fields = ['recipient', 'message']
    date_hierarchy = 'created_at'
    
    def error_summary(self, obj):
        return obj.error[:50] + '...' if obj.error and len(obj.error) > 50 else obj.error
    error_summary.short_description = 'Error'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('recipient', 'recipient__contact', 'recipient__campaign', 'message')

class ChatAssignmentAdmin(admin.ModelAdmin):
    list_display = [
        'phone_number', 'assigned_agent', 'status', 'priority', 
        'assigned_at', 'last_activity_at', 'unread_count'
    ]
    list_filter = ['status', 'priority', 'assigned_at', 'last_activity_at']
    search_fields = ['phone_number', 'assigned_agent__username', 'notes']
    list_editable = ['status', 'priority']
    readonly_fields = ['assigned_at', 'last_activity_at', 'resolved_at', 'unread_count']
    raw_id_fields = ['assigned_agent', 'assigned_by']
    
    fieldsets = (
        ('Chat Information', {
            'fields': ('phone_number', 'status', 'priority')
        }),
        ('Assignment', {
            'fields': ('assigned_agent', 'assigned_by', 'assigned_at')
        }),
        ('Activity', {
            'fields': ('last_activity_at', 'resolved_at')
        }),
        ('Metadata', {
            'fields': ('notes', 'tags'),
            'classes': ('collapse',)
        }),
    )
    
    def unread_count(self, obj):
        return obj.unread_count
    unread_count.short_description = 'Unread'

class ChatTransferLogAdmin(admin.ModelAdmin):
    list_display = ['chat_assignment', 'from_agent', 'to_agent', 'transferred_by', 'transferred_at']
    list_filter = ['transferred_at']
    search_fields = ['chat_assignment__phone_number', 'from_agent__username', 'to_agent__username']
    readonly_fields = ['transferred_at']
    raw_id_fields = ['chat_assignment', 'from_agent', 'to_agent', 'transferred_by']

class AgentAvailabilityAdmin(admin.ModelAdmin):
    list_display = [
        'agent', 'status', 'current_chat_count', 'max_concurrent_chats', 
        'is_available', 'capacity_remaining', 'last_activity'
    ]
    list_filter = ['status', 'last_activity']
    search_fields = ['agent__username', 'agent__email']
    list_editable = ['status', 'max_concurrent_chats']
    readonly_fields = ['current_chat_count', 'last_activity', 'updated_at', 'is_available', 'capacity_remaining']
    raw_id_fields = ['agent']
    
    fieldsets = (
        ('Agent Information', {
            'fields': ('agent', 'status')
        }),
        ('Capacity', {
            'fields': ('max_concurrent_chats', 'current_chat_count', 'is_available', 'capacity_remaining')
        }),
        ('Activity', {
            'fields': ('last_activity', 'auto_away_after_minutes')
        }),
        ('Working Hours', {
            'fields': ('working_hours_start', 'working_hours_end'),
            'classes': ('collapse',)
        }),
    )
    
    def is_available(self, obj):
        return obj.is_available
    is_available.boolean = True
    is_available.short_description = 'Available'
    
    def capacity_remaining(self, obj):
        return obj.capacity_remaining
    capacity_remaining.short_description = 'Capacity Remaining'

class ChatQueueAdmin(admin.ModelAdmin):
    list_display = [
        'phone_number', 'priority', 'status', 'queued_at', 
        'wait_time_minutes', 'is_expired'
    ]
    list_filter = ['status', 'priority', 'queued_at', 'source']
    search_fields = ['phone_number']
    readonly_fields = ['queued_at', 'assigned_at', 'wait_time_minutes', 'is_expired']
    list_editable = ['priority', 'status']
    
    fieldsets = (
        ('Queue Information', {
            'fields': ('phone_number', 'priority', 'status', 'source')
        }),
        ('Timing', {
            'fields': ('queued_at', 'assigned_at', 'expires_at')
        }),
        ('Customer Info', {
            'fields': ('customer_info',),
            'classes': ('collapse',)
        }),
    )
    
    def wait_time_minutes(self, obj):
        return obj.wait_time_minutes
    wait_time_minutes.short_description = 'Wait Time (min)'
    
    def is_expired(self, obj):
        return obj.is_expired
    is_expired.boolean = True
    is_expired.short_description = 'Expired'


# # Register all admin classes with custom admin site
# admin_site.register(ContactGroup, ContactGroupAdmin)
# admin_site.register(Contact, ContactAdmin)
# admin_site.register(BroadcastCampaign, BroadcastCampaignAdmin)
# admin_site.register(BroadcastRecipient, BroadcastRecipientAdmin)
# admin_site.register(AutoReplyKeyword, AutoReplyKeywordAdmin)
# admin_site.register(DripCampaign, DripCampaignAdmin)
# admin_site.register(DripMessage, DripMessageAdmin)
# admin_site.register(DripRecipient, DripRecipientAdmin)
# admin_site.register(DripMessageLog, DripMessageLogAdmin)
# admin_site.register(ChatAssignment, ChatAssignmentAdmin)
# admin_site.register(ChatTransferLog, ChatTransferLogAdmin)
# admin_site.register(AgentAvailability, AgentAvailabilityAdmin)
# admin_site.register(ChatQueue, ChatQueueAdmin)