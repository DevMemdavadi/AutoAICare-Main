from django.db import models
from django.conf import settings
from companies.managers import CompanyManager


class NotificationTemplate(models.Model):
    """Template for email and SMS notifications."""
    
    NOTIFICATION_TYPE_CHOICES = [
        ('booking_created', 'Booking Created'),
        ('booking_confirmed', 'Booking Confirmed'),
        ('booking_cancelled', 'Booking Cancelled'),
        ('appointment_created', 'Appointment Created'),
        ('appointment_approved', 'Appointment Approved'),
        ('appointment_rejected', 'Appointment Rejected'),
        ('technician_assigned', 'Technician Assigned'),
        ('job_created', 'Job Created'),
        ('job_started', 'Job Started'),
        ('job_in_progress', 'Job In Progress'),
        ('job_completed', 'Job Completed'),
        ('job_warning', 'Job Time Warning'),
        ('job_overdue', 'Job Overdue'),
        ('payment_success', 'Payment Success'),
        ('payment_failed', 'Payment Failed'),
        ('invoice_created', 'Invoice Created'),
        ('feedback_request', 'Feedback Request'),
    ]
    
    CHANNEL_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('both', 'Both'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='notification_templates',
        null=True,
        blank=True
    )
    
    name = models.CharField(max_length=100, unique=True)
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPE_CHOICES, unique=True)
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='both')
    
    # Email fields
    email_subject = models.CharField(max_length=200, blank=True, null=True)
    email_body = models.TextField(blank=True, null=True, help_text='Use {{variable}} for dynamic content')
    
    # SMS fields
    sms_body = models.TextField(blank=True, null=True, help_text='Use {{variable}} for dynamic content. Max 160 chars.')
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'notification_templates'
        verbose_name = 'Notification Template'
        verbose_name_plural = 'Notification Templates'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_notification_type_display()})"


class NotificationLog(models.Model):
    """Log of sent notifications for tracking and debugging."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]
    
    template = models.ForeignKey(NotificationTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    
    notification_type = models.CharField(max_length=50)
    channel = models.CharField(max_length=10)
    
    recipient_email = models.EmailField(blank=True, null=True)
    recipient_phone = models.CharField(max_length=15, blank=True, null=True)
    
    subject = models.CharField(max_length=200, blank=True, null=True)
    message = models.TextField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True, null=True)
    
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notification_logs'
        verbose_name = 'Notification Log'
        verbose_name_plural = 'Notification Logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} to {self.recipient.email} - {self.status}"


class InAppNotification(models.Model):
    """In-app notifications for users."""
    
    TYPE_CHOICES = [
        ('booking_created', 'Booking Created'),
        ('booking_confirmed', 'Booking Confirmed'),
        ('booking_cancelled', 'Booking Cancelled'),
        ('appointment_created', 'Appointment Created'),
        ('appointment_approved', 'Appointment Approved'),
        ('appointment_rejected', 'Appointment Rejected'),
        ('technician_assigned', 'Technician Assigned'),
        ('job_created', 'Job Created'),
        ('job_started', 'Job Started'),
        ('job_in_progress', 'Job In Progress'),
        ('job_work_completed', 'Job Work Completed'),
        ('job_completed', 'Job Completed'),
        ('job_delivered', 'Job Delivered'),
        ('job_warning', 'Job Time Warning'),
        ('job_overdue', 'Job Overdue'),
        ('payment_success', 'Payment Success'),
        ('payment_failed', 'Payment Failed'),
        ('invoice_created', 'Invoice Created'),
        ('feedback_request', 'Feedback Request'),
        ('job_status_update', 'Job Status Update'),
        ('google_review_request', 'Google Review Request'),
        ('new_booking_alert', 'New Booking Alert'),
        ('booking_cancelled_alert', 'Booking Cancelled Alert'),
        ('ready_for_delivery_alert', 'Ready for Delivery Alert'),
        ('reward_earned', 'Reward Earned'),
        ('deduction_earned', 'Deduction Applied'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='in_app_notifications',
        null=True,
        blank=True
    )
    
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='in_app_notifications'
    )
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    
    # Optional: Link to related object
    related_booking_id = models.IntegerField(null=True, blank=True)
    related_jobcard_id = models.IntegerField(null=True, blank=True)
    related_invoice_id = models.IntegerField(null=True, blank=True)
    
    # Additional data as JSON
    extra_data = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'in_app_notifications'
        verbose_name = 'In-App Notification'
        verbose_name_plural = 'In-App Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.recipient.name} ({'Read' if self.is_read else 'Unread'})"
    
    def mark_as_read(self):
        """Mark notification as read."""
        from django.utils import timezone
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=['is_read', 'read_at'])


class WhatsAppTemplate(models.Model):
    """WhatsApp message templates for each company."""
    
    CATEGORY_CHOICES = [
        ('TRANSACTIONAL', 'Transactional'),
        ('MARKETING', 'Marketing'),
        ('AUTHENTICATION', 'Authentication'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='whatsapp_templates'
    )
    
    # Template identification
    template_name = models.CharField(
        max_length=100,
        help_text="Template name in WhatsApp (lowercase, underscores only)"
    )
    notification_type = models.CharField(
        max_length=50,
        help_text="Maps to NotificationTemplate.notification_type"
    )
    
    # Template configuration
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='TRANSACTIONAL')
    language = models.CharField(max_length=10, default='en', help_text="Language code (e.g., 'en', 'hi')")
    
    # Template content (for reference, actual template is in WhatsApp)
    header_text = models.CharField(max_length=60, blank=True, help_text="Optional header text")
    body_text = models.TextField(help_text="Body text with {{1}}, {{2}} placeholders")
    footer_text = models.CharField(max_length=60, blank=True, help_text="Optional footer text")
    
    # Variable mapping (JSON)
    # Example: {"1": "customer_name", "2": "booking_id", "3": "service_date"}
    variable_mapping = models.JSONField(
        default=dict,
        blank=True,
        help_text="Maps {{1}}, {{2}} to context variables"
    )
    
    # Button configuration (JSON)
    # Example: [{"type": "URL", "text": "View Booking", "url": "https://example.com/booking/{{1}}"}]
    button_config = models.JSONField(default=list, blank=True)
    
    # WhatsApp API details
    whatsapp_template_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Template ID from WhatsApp API"
    )
    approval_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'whatsapp_templates'
        verbose_name = 'WhatsApp Template'
        verbose_name_plural = 'WhatsApp Templates'
        unique_together = [('company', 'template_name')]
        ordering = ['company', 'template_name']
    
    def __str__(self):
        return f"{self.company.name} - {self.template_name} ({self.get_approval_status_display()})"


class WhatsAppMessageLog(models.Model):
    """Log of WhatsApp messages sent."""
    
    STATUS_CHOICES = [
        ('QUEUED', 'Queued'),
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('READ', 'Read'),
        ('FAILED', 'Failed'),
        ('PENDING_MANUAL', 'Pending Manual Send'),
        ('SENT_MANUAL', 'Sent Manually'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='whatsapp_messages'
    )
    
    # Recipient
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='whatsapp_messages'
    )
    recipient_phone = models.CharField(max_length=20)
    
    # Template used
    template = models.ForeignKey(
        WhatsAppTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_messages'
    )
    template_name = models.CharField(max_length=100)
    
    # Message content (for logging)
    message_content = models.TextField(help_text="Rendered message content")
    
    # WhatsApp API response
    whatsapp_message_id = models.CharField(max_length=100, blank=True, help_text="Message ID from WhatsApp API")
    
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='QUEUED')
    error_message = models.TextField(blank=True)
    error_code = models.CharField(max_length=50, blank=True)
    
    # Manual mode (wa.me link)
    whatsapp_link = models.URLField(
        max_length=500,
        blank=True,
        help_text="wa.me link for manual sending (manual mode only)"
    )
    
    # Related objects
    related_booking_id = models.IntegerField(null=True, blank=True)
    related_jobcard_id = models.IntegerField(null=True, blank=True)
    related_invoice_id = models.IntegerField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'whatsapp_message_logs'
        verbose_name = 'WhatsApp Message Log'
        verbose_name_plural = 'WhatsApp Message Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['whatsapp_message_id']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.template_name} to {self.recipient_phone} - {self.status}"
