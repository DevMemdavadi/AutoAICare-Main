from django.db import models
from companies.models import Company

class PendingWhatsAppEvent(models.Model):
    """
    Stores incoming WhatsApp messages / Webhook events from the WP Gateway
    for review and processing in the CRM side.
    """
    company = models.ForeignKey(
        Company, 
        on_delete=models.CASCADE, 
        related_name='whatsapp_events',
        null=True, blank=True
    )
    
    # Event original details
    event_type = models.CharField(max_length=50, default='message_received')
    phone_number = models.CharField(max_length=20)
    message_type = models.CharField(max_length=20, default='text')
    message_content = models.TextField(blank=True, null=True)
    message_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Event Payload
    raw_payload = models.JSONField(default=dict, help_text="Raw webhook json payload")
    
    # Processing Status
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processed', 'Processed'),
        ('ignored', 'Ignored'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.event_type} from {self.phone_number} ({self.status})"
        
    class Meta:
        ordering = ['-received_at']
