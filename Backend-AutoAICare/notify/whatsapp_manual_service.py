"""
WhatsApp Manual Mode Service
Generates wa.me links for manual WhatsApp sending (no API required).
"""
from urllib.parse import quote
from django.conf import settings
from .models import WhatsAppMessageLog, WhatsAppTemplate


class WhatsAppManualService:
    """Service for generating manual WhatsApp links (wa.me)."""
    
    @staticmethod
    def generate_whatsapp_link(phone: str, message: str) -> str:
        """
        Generate wa.me link for manual sending.
        
        Args:
            phone: Phone number in E.164 format (+919876543210)
            message: Pre-filled message text
            
        Returns:
            WhatsApp Web/App link (https://wa.me/...)
        """
        # Clean phone number (remove + and spaces)
        clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '')
        
        # URL encode message
        encoded_message = quote(message)
        
        return f"https://wa.me/{clean_phone}?text={encoded_message}"
    
    @staticmethod
    def create_pending_message(company, recipient, template_name, message_content, context_data=None):
        """
        Create a pending WhatsApp message log for manual sending.
        
        Args:
            company: Company instance
            recipient: User instance (recipient)
            template_name: Name of the template used
            message_content: Rendered message content
            context_data: Optional dict with related IDs
            
        Returns:
            WhatsAppMessageLog instance with wa.me link
        """
        if context_data is None:
            context_data = {}
        
        # Get template if exists
        try:
            template = WhatsAppTemplate.objects.get(
                company=company,
                template_name=template_name,
                is_active=True
            )
        except WhatsAppTemplate.DoesNotExist:
            template = None
        
        # Create log entry
        log = WhatsAppMessageLog.objects.create(
            company=company,
            template=template,
            template_name=template_name,
            recipient=recipient,
            recipient_phone=recipient.phone,
            message_content=message_content,
            status='PENDING_MANUAL',
            related_booking_id=context_data.get('booking_id'),
            related_jobcard_id=context_data.get('jobcard_id'),
            related_invoice_id=context_data.get('invoice_id'),
        )
        
        # Generate wa.me link
        log.whatsapp_link = WhatsAppManualService.generate_whatsapp_link(
            recipient.phone,
            message_content
        )
        log.save(update_fields=['whatsapp_link'])
        
        return log
    
    @staticmethod
    def mark_as_sent(log_id: int):
        """
        Mark a manual message as sent by staff.
        
        Args:
            log_id: WhatsAppMessageLog ID
            
        Returns:
            Updated WhatsAppMessageLog instance
        """
        from django.utils import timezone
        
        log = WhatsAppMessageLog.objects.get(id=log_id)
        log.status = 'SENT_MANUAL'
        log.sent_at = timezone.now()
        log.save(update_fields=['status', 'sent_at'])
        
        return log
