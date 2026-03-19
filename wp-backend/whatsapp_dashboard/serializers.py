from rest_framework import serializers
from whatsapp.models import WhatsAppMessage, ScheduledMessage
from .models import Contact, ContactGroup, BroadcastCampaign, BroadcastRecipient, AutoReplyKeyword, DripCampaign, DripMessage, DripRecipient, DripMessageLog, ChatAssignment, ChatTransferLog, AgentAvailability, ChatQueue
from django.utils import timezone

class SendMessageSerializer(serializers.Serializer):
    """
    Serializer for sending a new WhatsApp message.
    This is not a model serializer, but a serializer for input validation.
    """
    recipient_phone_number = serializers.CharField(max_length=20, required=False)
    recipient_contact_id = serializers.IntegerField(required=False)
    message_type = serializers.ChoiceField(choices=WhatsAppMessage.MESSAGE_TYPES, default='text')
    content = serializers.CharField(required=False, allow_blank=True)
    
    # For template messages
    template_name = serializers.CharField(required=False)
    template_params = serializers.JSONField(required=False)

    # For media messages
    media_file = serializers.FileField(required=False, write_only=True)
    
    # For replies
    reply_to_message_id = serializers.CharField(required=False)

    def validate(self, data):
        """
        Custom validation for different message types.
        """
        if not data.get('recipient_phone_number') and not data.get('recipient_contact_id'):
            raise serializers.ValidationError("Either recipient_phone_number or recipient_contact_id is required.")

        message_type = data.get('message_type')
        if message_type == 'text' and not data.get('content'):
            raise serializers.ValidationError("Content is required for text messages.")
        
        if message_type == 'template' and not data.get('template_name'):
            raise serializers.ValidationError("Template name is required for template messages.")

        media_types = ['image', 'document', 'audio', 'video', 'sticker']
        if message_type in media_types and not data.get('media_file'):
            raise serializers.ValidationError(f"A media file is required for {message_type} messages.")
            
        return data

class WhatsAppMessageSerializer(serializers.ModelSerializer):
    status_indicator = serializers.SerializerMethodField()
    
    class Meta:
        model = WhatsAppMessage
        fields = '__all__'
        read_only_fields = ('status', 'message_id', 'frontend_id', 'created_at', 'updated_at')
    
    def get_status_indicator(self, obj):
        """Get the status indicator for frontend display"""
        return obj.get_status_indicator()

class ScheduledMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduledMessage
        fields = '__all__'

class ContactGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactGroup
        fields = '__all__'

class ContactSerializer(serializers.ModelSerializer):
    groups = ContactGroupSerializer(many=True, read_only=True)
    group_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=ContactGroup.objects.all(), source='groups'
    )
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = '__all__'

    def get_last_message(self, obj):
        from whatsapp.models import WhatsAppMessage
        msg = WhatsAppMessage.objects.filter(phone_number=obj.phone_number).order_by('-timestamp').first()
        if msg:
            return {
                "content": msg.message_content,
                "timestamp": msg.timestamp,
                "from_me": msg.status != "received"
            }
        return None

    def get_unread_count(self, obj):
        from whatsapp.models import WhatsAppMessage
        return WhatsAppMessage.objects.filter(
            phone_number=obj.phone_number,
            status='received',
            is_read=False
        ).count()

    def get_is_online(self, obj):
        from whatsapp.models import WhatsAppMessage
        from django.utils import timezone
        from datetime import timedelta
        msg = WhatsAppMessage.objects.filter(phone_number=obj.phone_number).order_by('-timestamp').first()
        if msg and msg.timestamp:
            return (timezone.now() - msg.timestamp) < timedelta(minutes=5)
        return False

class BroadcastRecipientSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source='contact.name', read_only=True)
    contact_phone = serializers.CharField(source='contact.phone_number', read_only=True)

    class Meta:
        model = BroadcastRecipient
        fields = '__all__'

class BroadcastCampaignSerializer(serializers.ModelSerializer):
    recipients = BroadcastRecipientSerializer(many=True, read_only=True)
    recipient_count = serializers.SerializerMethodField()
    success_count = serializers.SerializerMethodField()
    failed_count = serializers.SerializerMethodField()

    class Meta:
        model = BroadcastCampaign
        fields = '__all__'

    def get_recipient_count(self, obj):
        return obj.recipients.count()

    def get_success_count(self, obj):
        return obj.recipients.filter(status='sent').count()

    def get_failed_count(self, obj):
        return obj.recipients.filter(status='failed').count()

class CreateBroadcastCampaignSerializer(serializers.Serializer):
    """
    Serializer for creating a new broadcast campaign.
    """
    name = serializers.CharField(max_length=255)
    message_type = serializers.ChoiceField(choices=WhatsAppMessage.MESSAGE_TYPES, default='text')
    message_content = serializers.CharField(required=False, allow_blank=True)
    template_name = serializers.CharField(required=False)
    template_params = serializers.JSONField(required=False)
    contact_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of contact IDs to send to"
    )
    group_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of group IDs to send to all contacts in those groups"
    )
    scheduled_at = serializers.DateTimeField(required=False, help_text="Schedule for later sending")

    def validate(self, data):
        if not data.get('contact_ids') and not data.get('group_ids'):
            raise serializers.ValidationError("Either contact_ids or group_ids must be provided.")
        
        message_type = data.get('message_type')
        if message_type == 'text' and not data.get('message_content'):
            raise serializers.ValidationError("Message content is required for text messages.")
        
        if message_type == 'template' and not data.get('template_name'):
            raise serializers.ValidationError("Template name is required for template messages.")
        
        return data 

class AutoReplyKeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutoReplyKeyword
        fields = '__all__'

# Drip Campaign Serializers

class DripMessageSerializer(serializers.ModelSerializer):
    total_delay_minutes = serializers.ReadOnlyField()
    
    class Meta:
        model = DripMessage
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

    def validate(self, data):
        """Validate that sequence numbers are unique within a campaign"""
        campaign = data.get('campaign')
        sequence_number = data.get('sequence_number')
        
        if campaign and sequence_number:
            # Check if this sequence number already exists for this campaign
            existing = DripMessage.objects.filter(
                campaign=campaign, 
                sequence_number=sequence_number
            )
            
            # If updating, exclude the current instance
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            
            if existing.exists():
                raise serializers.ValidationError(
                    f"Sequence number {sequence_number} already exists for this campaign."
                )
        
        return data

class DripRecipientSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source='contact.name', read_only=True)
    contact_phone = serializers.CharField(source='contact.phone_number', read_only=True)
    contact_email = serializers.CharField(source='contact.email', read_only=True)
    
    class Meta:
        model = DripRecipient
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'last_message_sent_at', 'next_message_at')

class DripMessageLogSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source='recipient.contact.name', read_only=True)
    contact_phone = serializers.CharField(source='recipient.contact.phone_number', read_only=True)
    
    class Meta:
        model = DripMessageLog
        fields = '__all__'
        read_only_fields = ('created_at',)

class DripCampaignSerializer(serializers.ModelSerializer):
    messages = DripMessageSerializer(many=True, read_only=True)
    recipients = DripRecipientSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()
    active_recipient_count = serializers.SerializerMethodField()
    completed_recipient_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DripCampaign
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'started_at', 'completed_at')

    def get_message_count(self, obj):
        return obj.messages.filter(is_active=True).count()

    def get_active_recipient_count(self, obj):
        return obj.recipients.filter(status='active').count()

    def get_completed_recipient_count(self, obj):
        return obj.recipients.filter(status='completed').count()

class CreateDripCampaignSerializer(serializers.Serializer):
    """
    Serializer for creating a new drip campaign with initial setup.
    """
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    start_date = serializers.DateTimeField(required=False, allow_null=True)
    end_date = serializers.DateTimeField(required=False, allow_null=True)
    contact_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of contact IDs to include"
    )
    group_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of group IDs to include"
    )
    messages = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        help_text="List of message objects to create"
    )

    def validate(self, data):
        if not data.get('contact_ids') and not data.get('group_ids'):
            raise serializers.ValidationError("Either contact_ids or group_ids must be provided.")
        
        # Validate messages if provided
        messages = data.get('messages', [])
        if messages:
            for i, message in enumerate(messages):
                if not message.get('content') and not message.get('template_name'):
                    raise serializers.ValidationError(f"Message {i+1} must have either content or template_name.")
                
                if not message.get('sequence_number'):
                    raise serializers.ValidationError(f"Message {i+1} must have a sequence_number.")
        
        return data

class UpdateDripCampaignStatusSerializer(serializers.Serializer):
    """
    Serializer for updating drip campaign status.
    """
    status = serializers.ChoiceField(choices=DripCampaign.STATUS_CHOICES)

class DripCampaignStatsSerializer(serializers.Serializer):
    """
    Serializer for drip campaign statistics.
    """
    total_recipients = serializers.IntegerField()
    active_recipients = serializers.IntegerField()
    completed_recipients = serializers.IntegerField()
    failed_recipients = serializers.IntegerField()
    paused_recipients = serializers.IntegerField()
    unsubscribed_recipients = serializers.IntegerField()
    total_messages_sent = serializers.IntegerField()
    total_messages_failed = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    average_messages_per_recipient = serializers.FloatField()

# Team Inbox Serializers

class ChatAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for chat assignments"""
    assigned_agent_name = serializers.CharField(source='assigned_agent.username', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.username', read_only=True)
    unread_count = serializers.ReadOnlyField()
    last_message_preview = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatAssignment
        fields = [
            'id', 'phone_number', 'assigned_agent', 'assigned_agent_name',
            'assigned_by', 'assigned_by_name', 'status', 'priority',
            'assigned_at', 'last_activity_at', 'resolved_at',
            'notes', 'tags', 'unread_count', 'last_message_preview',
            'contact_name'
        ]
        read_only_fields = ['assigned_at', 'last_activity_at', 'resolved_at']

    def get_last_message_preview(self, obj):
        last_message = obj.last_message
        if last_message:
            return last_message.message_content[:50]
        return ""

    def get_contact_name(self, obj):
        try:
            contact = Contact.objects.get(phone_number=obj.phone_number)
            return contact.name
        except Contact.DoesNotExist:
            return "Unknown"

class CreateChatAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatAssignment
        fields = ['phone_number', 'assigned_agent', 'priority', 'notes', 'tags']

    def create(self, validated_data):
        # Set the assigned_by field to the current user
        validated_data['assigned_by'] = self.context['request'].user
        return super().create(validated_data)

class UpdateChatAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatAssignment
        fields = ['assigned_agent', 'status', 'priority', 'notes', 'tags']

    def validate(self, data):
        # If status is being changed to resolved, set resolved_at
        if data.get('status') == 'resolved' and self.instance.status != 'resolved':
            data['resolved_at'] = timezone.now()
        return data

class ChatTransferSerializer(serializers.Serializer):
    """Serializer for chat transfers"""
    new_agent_id = serializers.IntegerField()
    reason = serializers.CharField(required=False, allow_blank=True)

class ChatTransferLogSerializer(serializers.ModelSerializer):
    """Serializer for chat transfer logs"""
    from_agent_name = serializers.CharField(source='from_agent.username', read_only=True)
    to_agent_name = serializers.CharField(source='to_agent.username', read_only=True)
    transferred_by_name = serializers.CharField(source='transferred_by.username', read_only=True)

    class Meta:
        model = ChatTransferLog
        fields = [
            'id', 'chat_assignment', 'from_agent', 'from_agent_name',
            'to_agent', 'to_agent_name', 'transferred_by', 'transferred_by_name',
            'reason', 'transferred_at'
        ]
        read_only_fields = ['transferred_at']

class AgentAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for agent availability"""
    agent_name = serializers.CharField(source='agent.username', read_only=True)
    agent_email = serializers.CharField(source='agent.email', read_only=True)
    is_available = serializers.ReadOnlyField()
    capacity_remaining = serializers.ReadOnlyField()

    class Meta:
        model = AgentAvailability
        fields = [
            'id', 'agent', 'agent_name', 'agent_email', 'status',
            'max_concurrent_chats', 'current_chat_count', 'is_available',
            'capacity_remaining', 'auto_away_after_minutes', 'last_activity',
            'working_hours_start', 'working_hours_end', 'updated_at'
        ]
        read_only_fields = ['current_chat_count', 'last_activity', 'updated_at']

class UpdateAgentStatusSerializer(serializers.Serializer):
    """Serializer for updating agent status"""
    status = serializers.ChoiceField(choices=AgentAvailability.AVAILABILITY_STATUS_CHOICES)
    max_concurrent_chats = serializers.IntegerField(min_value=1, required=False)

class ChatQueueSerializer(serializers.ModelSerializer):
    """Serializer for chat queue"""
    wait_time_minutes = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatQueue
        fields = [
            'id', 'phone_number', 'priority', 'status', 'queued_at',
            'assigned_at', 'expires_at', 'source', 'customer_info',
            'wait_time_minutes', 'contact_name'
        ]
        read_only_fields = ['queued_at', 'assigned_at']

    def get_wait_time_minutes(self, obj):
        if obj.status == 'waiting':
            return (timezone.now() - obj.queued_at).total_seconds() / 60
        return 0

    def get_contact_name(self, obj):
        try:
            contact = Contact.objects.get(phone_number=obj.phone_number)
            return contact.name
        except Contact.DoesNotExist:
            return "Unknown"

class TopAgentSerializer(serializers.Serializer):
    """Serializer for top agent statistics"""
    agent_id = serializers.IntegerField()
    agent_name = serializers.CharField()
    chat_count = serializers.IntegerField()

class TeamInboxStatsSerializer(serializers.Serializer):
    """Serializer for team inbox statistics"""
    total_active_chats = serializers.IntegerField()
    total_unassigned_chats = serializers.IntegerField()
    total_agents_online = serializers.IntegerField()
    total_agents_busy = serializers.IntegerField()
    chats_by_priority = serializers.DictField()
    agents_by_status = serializers.DictField()
    total_chats_today = serializers.IntegerField()
    total_chats_this_week = serializers.IntegerField()
    top_agents = TopAgentSerializer(many=True)

class BroadcastCampaignReportSerializer(serializers.Serializer):
    """Serializer for broadcast campaign reports"""
    total_recipients = serializers.IntegerField()
    sent_count = serializers.IntegerField()
    failed_count = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    sent_percentage = serializers.FloatField()
    failed_percentage = serializers.FloatField()

class ChatListSerializer(serializers.Serializer):
    """Serializer for chat list with real-time updates"""
    contact_id = serializers.IntegerField(allow_null=True)  # <-- Add this line
    phone_number = serializers.CharField()
    contact_name = serializers.CharField()
    assigned_agent = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    priority = serializers.CharField()
    unread_count = serializers.IntegerField()
    last_message_preview = serializers.CharField()
    last_activity_at = serializers.DateTimeField()
    wait_time_minutes = serializers.IntegerField(default=0) 