from django.db import models
from django.utils import timezone
from django.conf import settings
import uuid
import secrets

class WhatsAppMessage(models.Model):
    MESSAGE_TYPES = (
        ('text', 'Text'),
        ('template', 'Template'),
        ('image', 'Image'),
        ('document', 'Document'),
        ('audio', 'Audio'),
        ('video', 'Video'),
        ('sticker', 'Sticker'),
        ('location', 'Location'),
        ('contacts', 'Contacts'),
        ('interactive', 'Interactive'),
    )
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('failed', 'Failed'),
        ('received', 'Received')
    )
    
    # New fields for threading and sender identification
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='sent_whatsapp_messages', on_delete=models.SET_NULL, null=True, blank=True)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='received_whatsapp_messages', on_delete=models.SET_NULL, null=True, blank=True)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    
    phone_number = models.CharField(max_length=20)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES)
    message_content = models.TextField(null=True, blank=True)
    template_name = models.CharField(max_length=100, null=True, blank=True)

    # Field for media file
    media = models.FileField(upload_to='whatsapp_media/', null=True, blank=True, help_text="Media file to be sent")
    
    message_id = models.CharField(max_length=255, null=True, blank=True, help_text="WhatsApp message ID for tracking")
    frontend_id = models.CharField(max_length=255, null=True, blank=True, help_text="Frontend message ID for status updates")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_read = models.BooleanField(default=False)
    status_updated_at = models.DateTimeField(auto_now=True)
    timestamp = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return f"{self.phone_number} - {self.message_type} - {self.status}"
    
    def get_status_indicator(self):
        """
        Get the status indicator for frontend display
        Returns: dict with indicator info for WhatsApp-style status
        """
        if self.status == "pending":
            return {
                "icon": "⏳",
                "text": "Sending...",
                "color": "gray"
            }
        elif self.status == "sent":
            return {
                "icon": "✓",
                "text": "Sent",
                "color": "gray"
            }
        elif self.status == "delivered":
            return {
                "icon": "✓✓",
                "text": "Delivered",
                "color": "gray"
            }
        elif self.status == "read":
            return {
                "icon": "✓✓",
                "text": "Read",
                "color": "blue"
            }
        elif self.status == "failed":
            return {
                "icon": "✗",
                "text": "Failed",
                "color": "red"
            }
        elif self.status == "received":
            return {
                "icon": "",
                "text": "Received",
                "color": "none"
            }
        else:
            return {
                "icon": "?",
                "text": self.status,
                "color": "gray"
            }
    
    class Meta:
        ordering = ['-timestamp']

class ScheduledMessage(models.Model):
    """
    Model to store messages that are scheduled to be sent at a future time.
    """
    SCHEDULE_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    )

    recipient_number = models.CharField(max_length=20, help_text="Recipient's phone number")
    message_type = models.CharField(max_length=20, choices=WhatsAppMessage.MESSAGE_TYPES, default='text')
    message_content = models.TextField(help_text="Text content for the message", null=True, blank=True)
    
    # For template messages
    template_name = models.CharField(max_length=100, null=True, blank=True)
    template_params = models.JSONField(null=True, blank=True, help_text="JSON object of template parameters")

    # For media messages
    media_file = models.FileField(upload_to='scheduled_media/', null=True, blank=True, help_text="Media file to be sent")

    scheduled_at = models.DateTimeField(help_text="The date and time to send the message")
    status = models.CharField(max_length=10, choices=SCHEDULE_STATUS_CHOICES, default='pending')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Scheduled message to {self.recipient_number} at {self.scheduled_at}"

    class Meta:
        ordering = ['scheduled_at']
        verbose_name = "Scheduled Message"
        verbose_name_plural = "Scheduled Messages"

class Workspace(models.Model):
    """
    Represents an external system (like a CRM) that integrates with this WhatsApp Hub.
    Provides API Keys for sending and Webhook URLs for receiving messages.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="Name of the external system or CRM (e.g., AutoAICare)")
    
    # Authentication
    api_key = models.CharField(max_length=64, unique=True, blank=True, help_text="Generated API Key for this workspace")
    api_secret = models.CharField(max_length=64, blank=True, help_text="Generated API Secret for this workspace")
    
    # Webhooks
    webhook_url = models.URLField(blank=True, null=True, help_text="URL to receive incoming WhatsApp messages and status updates")
    webhook_active = models.BooleanField(default=True, help_text="Whether to send webhooks to the URL")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Auto-generate keys if not present
        if not self.api_key:
            self.api_key = secrets.token_urlsafe(32)
        if not self.api_secret:
            self.api_secret = secrets.token_urlsafe(48)
        super().save(*args, **kwargs)
        
    def __str__(self):
        return f"{self.name} (Active: {self.is_active})"
