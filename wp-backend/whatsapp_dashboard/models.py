from django.db import models
from whatsapp.models import WhatsAppMessage

# Create your models here.

class ContactGroup(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Contact(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('blocked', 'Blocked'),
    )

    name = models.CharField(max_length=255)
    country_code = models.CharField(max_length=10, blank=True, null=True)
    phone_number = models.CharField(max_length=20, unique=True)
    contact_status = models.CharField(max_length=50, blank=True, null=True)
    allow_broadcast = models.BooleanField(default=False)
    allow_sms = models.BooleanField(default=False)
    created_date = models.CharField(max_length=100, blank=True, null=True)
    amount = models.CharField(max_length=100, blank=True, null=True)
    attribute_1 = models.CharField(max_length=255, blank=True, null=True)
    attribute_2 = models.CharField(max_length=255, blank=True, null=True)
    attribute_3 = models.CharField(max_length=255, blank=True, null=True)
    cases = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=255, blank=True, null=True)
    invoiceamt = models.CharField(max_length=100, blank=True, null=True)
    invoiceno = models.CharField(max_length=100, blank=True, null=True)
    last_cart_items = models.TextField(blank=True, null=True)
    last_cart_items_text = models.TextField(blank=True, null=True)
    last_cart_total_value = models.CharField(max_length=100, blank=True, null=True)
    last_cart_total_value_text = models.CharField(max_length=100, blank=True, null=True)
    lrno = models.CharField(max_length=100, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    order_number = models.CharField(max_length=100, blank=True, null=True)
    orderdate = models.CharField(max_length=100, blank=True, null=True)
    orderno = models.CharField(max_length=100, blank=True, null=True)
    reason = models.TextField(blank=True, null=True)
    source_id = models.CharField(max_length=100, blank=True, null=True)
    source_url = models.URLField(blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    supplymobile = models.CharField(max_length=20, blank=True, null=True)
    supplyname = models.CharField(max_length=255, blank=True, null=True)
    tracking_link = models.URLField(blank=True, null=True)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    tracking_provider = models.CharField(max_length=100, blank=True, null=True)
    tracking_url = models.URLField(blank=True, null=True)
    transportname = models.CharField(max_length=100, blank=True, null=True)
    type = models.CharField(max_length=100, blank=True, null=True)
    whatsapp_916359100911 = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(max_length=255, null=True, blank=True, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    groups = models.ManyToManyField(ContactGroup, blank=True, related_name="contacts")
    last_message_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp of the last message sent or received")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.phone_number})"

    class Meta:
        ordering = ['-created_at']

class BroadcastCampaign(models.Model):
    name = models.CharField(max_length=255)
    message_type = models.CharField(max_length=20, choices=WhatsAppMessage.MESSAGE_TYPES)
    message_content = models.TextField(blank=True, null=True)
    template_name = models.CharField(max_length=100, blank=True, null=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending')  # pending, running, completed

    def __str__(self):
        return self.name

class BroadcastRecipient(models.Model):
    campaign = models.ForeignKey(BroadcastCampaign, related_name='recipients', on_delete=models.CASCADE)
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, default='pending')  # pending, sent, failed
    message_id = models.CharField(max_length=255, blank=True, null=True)
    error = models.TextField(blank=True, null=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.campaign.name} -> {self.contact.name} ({self.status})"

class DripCampaign(models.Model):
    """
    Model for managing drip campaigns - sequences of messages sent over time.
    """
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    name = models.CharField(max_length=255, help_text="Name of the drip campaign")
    description = models.TextField(blank=True, null=True, help_text="Description of the campaign")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Campaign settings
    start_date = models.DateTimeField(null=True, blank=True, help_text="When to start the campaign")
    end_date = models.DateTimeField(null=True, blank=True, help_text="When to end the campaign")
    
    # Recipient settings
    contact_ids = models.JSONField(default=list, help_text="List of contact IDs to include")
    group_ids = models.JSONField(default=list, help_text="List of group IDs to include")
    
    # Campaign statistics
    total_recipients = models.IntegerField(default=0)
    active_recipients = models.IntegerField(default=0)
    completed_recipients = models.IntegerField(default=0)
    failed_recipients = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

    class Meta:
        ordering = ['-created_at']

class DripMessage(models.Model):
    """
    Individual messages within a drip campaign sequence.
    """
    MESSAGE_TYPES = (
        ('text', 'Text'),
        ('template', 'Template'),
        ('image', 'Image'),
        ('document', 'Document'),
        ('audio', 'Audio'),
        ('video', 'Video'),
        ('sticker', 'Sticker'),
    )

    campaign = models.ForeignKey(DripCampaign, related_name='messages', on_delete=models.CASCADE)
    sequence_number = models.IntegerField(help_text="Order of this message in the sequence (1, 2, 3, ...)")
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    
    # Message content
    content = models.TextField(blank=True, null=True, help_text="Text content for text messages")
    template_name = models.CharField(max_length=100, blank=True, null=True, help_text="Template name for template messages")
    template_params = models.JSONField(default=dict, blank=True, help_text="Parameters for template messages")
    media_file = models.FileField(upload_to='drip_media/', blank=True, null=True, help_text="Media file for media messages")
    
    # Timing
    delay_hours = models.IntegerField(default=0, help_text="Hours to wait after previous message")
    delay_minutes = models.IntegerField(default=0, help_text="Minutes to wait after previous message")
    delay_days = models.IntegerField(default=0, help_text="Days to wait after previous message")
    
    # Status
    is_active = models.BooleanField(default=True, help_text="Whether this message is active in the sequence")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.campaign.name} - Message {self.sequence_number}"

    class Meta:
        ordering = ['campaign', 'sequence_number']
        unique_together = ['campaign', 'sequence_number']

    @property
    def total_delay_minutes(self):
        """Calculate total delay in minutes"""
        return (self.delay_days * 24 * 60) + (self.delay_hours * 60) + self.delay_minutes

class DripRecipient(models.Model):
    """
    Tracks individual recipients in a drip campaign and their progress.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('unsubscribed', 'Unsubscribed'),
        ('failed', 'Failed'),
    )

    campaign = models.ForeignKey(DripCampaign, related_name='recipients', on_delete=models.CASCADE)
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Progress tracking
    current_message_index = models.IntegerField(default=0, help_text="Index of the next message to send")
    last_message_sent_at = models.DateTimeField(null=True, blank=True)
    next_message_at = models.DateTimeField(null=True, blank=True, help_text="When the next message should be sent")
    
    # Statistics
    messages_sent = models.IntegerField(default=0)
    messages_failed = models.IntegerField(default=0)
    
    # Unsubscribe tracking
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    unsubscribe_reason = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.campaign.name} -> {self.contact.name} ({self.status})"

    class Meta:
        unique_together = ['campaign', 'contact']
        ordering = ['-created_at']

class DripMessageLog(models.Model):
    """
    Logs individual message sends within drip campaigns.
    """
    recipient = models.ForeignKey(DripRecipient, related_name='message_logs', on_delete=models.CASCADE)
    message = models.ForeignKey(DripMessage, on_delete=models.CASCADE)
    sequence_number = models.IntegerField(help_text="Sequence number of the message sent")
    
    # Message details
    message_type = models.CharField(max_length=20)
    content = models.TextField(blank=True, null=True)
    template_name = models.CharField(max_length=100, blank=True, null=True)
    template_params = models.JSONField(default=dict, blank=True)
    
    # Send status
    status = models.CharField(max_length=20, default='pending')  # pending, sent, failed
    whatsapp_message_id = models.CharField(max_length=255, blank=True, null=True)
    error = models.TextField(blank=True, null=True)
    
    # Timing
    scheduled_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.recipient.contact.name} - Message {self.sequence_number} ({self.status})"

    class Meta:
        ordering = ['-created_at']

class AutoReplyKeyword(models.Model):
    keyword = models.CharField(max_length=100, unique=True)
    reply_text = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.keyword

class ChatAssignment(models.Model):
    """
    Model to track which agent is assigned to handle a specific WhatsApp conversation.
    """
    ASSIGNMENT_STATUS_CHOICES = [
        ('active', 'Active'),
        ('resolved', 'Resolved'),
        ('transferred', 'Transferred'),
        ('closed', 'Closed'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    phone_number = models.CharField(max_length=20, help_text="Customer's phone number")
    assigned_agent = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_chats')
    assigned_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='chat_assignments_made')
    
    status = models.CharField(max_length=20, choices=ASSIGNMENT_STATUS_CHOICES, default='active')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    
    # Timestamps
    assigned_at = models.DateTimeField(auto_now_add=True)
    last_activity_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    notes = models.TextField(blank=True, help_text="Internal notes about this conversation")
    tags = models.JSONField(default=list, blank=True, help_text="Tags for categorizing conversations")
    
    class Meta:
        ordering = ['-last_activity_at']
        unique_together = ['phone_number', 'status']
        indexes = [
            models.Index(fields=['phone_number', 'status']),
            models.Index(fields=['assigned_agent', 'status']),
            models.Index(fields=['priority', 'status']),
        ]
    
    def __str__(self):
        return f"Chat: {self.phone_number} - {self.assigned_agent or 'Unassigned'}"
    
    @property
    def is_active(self):
        return self.status == 'active'
    
    @property
    def unread_count(self):
        """Get count of unread messages for this conversation"""
        from whatsapp.models import WhatsAppMessage
        return WhatsAppMessage.objects.filter(
            phone_number=self.phone_number,
            status='received',
            is_read=False
        ).count()
    
    @property
    def last_message(self):
        """Get the last message in this conversation"""
        from whatsapp.models import WhatsAppMessage
        return WhatsAppMessage.objects.filter(
            phone_number=self.phone_number
        ).order_by('-timestamp').first()
    
    def mark_resolved(self):
        """Mark this conversation as resolved"""
        from django.utils import timezone
        self.status = 'resolved'
        self.resolved_at = timezone.now()
        self.save()
    
    def transfer_to_agent(self, new_agent, transferred_by):
        """Transfer this conversation to another agent"""
        self.assigned_agent = new_agent
        self.assigned_by = transferred_by
        self.status = 'transferred'
        self.save()
        
        # Create a transfer log entry
        ChatTransferLog.objects.create(
            chat_assignment=self,
            from_agent=self.assigned_by,
            to_agent=new_agent,
            transferred_by=transferred_by
        )

class ChatTransferLog(models.Model):
    """
    Log of chat transfers between agents for audit trail.
    """
    chat_assignment = models.ForeignKey(ChatAssignment, on_delete=models.CASCADE, related_name='transfer_logs')
    from_agent = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='transfers_from')
    to_agent = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='transfers_to')
    transferred_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='transfers_made')
    reason = models.TextField(blank=True, help_text="Reason for transfer")
    transferred_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-transferred_at']
    
    def __str__(self):
        return f"Transfer: {self.from_agent} → {self.to_agent} ({self.transferred_at})"

class AgentAvailability(models.Model):
    """
    Track agent availability and capacity for chat assignments.
    """
    AVAILABILITY_STATUS_CHOICES = [
        ('online', 'Online'),
        ('busy', 'Busy'),
        ('away', 'Away'),
        ('offline', 'Offline'),
    ]
    
    agent = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='availability')
    status = models.CharField(max_length=10, choices=AVAILABILITY_STATUS_CHOICES, default='offline')
    max_concurrent_chats = models.PositiveIntegerField(default=5, help_text="Maximum number of chats this agent can handle simultaneously")
    current_chat_count = models.PositiveIntegerField(default=0, help_text="Current number of active chats")
    
    # Auto-away settings
    auto_away_after_minutes = models.PositiveIntegerField(default=30, help_text="Minutes of inactivity before auto-away")
    last_activity = models.DateTimeField(auto_now=True)
    
    # Working hours (optional)
    working_hours_start = models.TimeField(null=True, blank=True)
    working_hours_end = models.TimeField(null=True, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Agent availabilities"
    
    def __str__(self):
        return f"{self.agent.username} - {self.status}"
    
    @property
    def is_available(self):
        """Check if agent is available for new chat assignments"""
        return (
            self.status in ['online', 'busy'] and 
            self.current_chat_count < self.max_concurrent_chats
        )
    
    @property
    def capacity_remaining(self):
        """Number of additional chats this agent can handle"""
        return max(0, self.max_concurrent_chats - self.current_chat_count)
    
    def update_chat_count(self):
        """Update the current chat count based on active assignments"""
        active_chats = ChatAssignment.objects.filter(
            assigned_agent=self.agent,
            status='active'
        ).count()
        self.current_chat_count = active_chats
        self.save()

class ChatQueue(models.Model):
    """
    Queue for unassigned chats waiting to be picked up by agents.
    """
    QUEUE_STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('assigned', 'Assigned'),
        ('expired', 'Expired'),
    ]
    
    phone_number = models.CharField(max_length=20)
    priority = models.CharField(max_length=10, choices=ChatAssignment.PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=10, choices=QUEUE_STATUS_CHOICES, default='waiting')
    
    # Timestamps
    queued_at = models.DateTimeField(auto_now_add=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    source = models.CharField(max_length=50, default='whatsapp', help_text="Source of the chat (whatsapp, web, etc.)")
    customer_info = models.JSONField(default=dict, blank=True, help_text="Customer information if available")
    
    class Meta:
        ordering = ['priority', 'queued_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"Queue: {self.phone_number} - {self.priority} ({self.status})"
    
    @property
    def wait_time(self):
        """Calculate how long this chat has been waiting"""
        from django.utils import timezone
        if self.assigned_at:
            return self.assigned_at - self.queued_at
        return timezone.now() - self.queued_at
    
    @property
    def is_expired(self):
        """Check if this queue entry has expired"""
        from django.utils import timezone
        return self.expires_at and timezone.now() > self.expires_at

    @property
    def wait_time_minutes(self):
        return int(self.wait_time.total_seconds() / 60) if self.wait_time else 0
