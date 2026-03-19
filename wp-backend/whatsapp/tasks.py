from celery import shared_task
from django.utils import timezone
from .models import ScheduledMessage
from .services import WhatsAppService
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_scheduled_messages():
    """
    Celery task to send scheduled WhatsApp messages.
    """
    now = timezone.now()
    # Get all pending messages that are due to be sent
    messages_to_send = ScheduledMessage.objects.filter(
        scheduled_at__lte=now,
        status='pending'
    )

    if not messages_to_send.exists():
        logger.info("No scheduled messages to send.")
        return "No scheduled messages to send."

    logger.info(f"Found {messages_to_send.count()} scheduled messages to send.")
    
    service = WhatsAppService()

    for message in messages_to_send:
        try:
            media_path = message.media_file.path if message.media_file else None
            
            service.send_message(
                to_phone=message.recipient_number,
                message_type=message.message_type,
                content=message.message_content,
                template_name=message.template_name,
                template_params=message.template_params,
                media_path=media_path,
            )
            message.status = 'sent'
            logger.info(f"Successfully sent scheduled message {message.id} to {message.recipient_number}")
        
        except Exception as e:
            message.status = 'failed'
            logger.error(f"Failed to send scheduled message {message.id} to {message.recipient_number}. Error: {e}")
        
        finally:
            message.save()

    return f"Processed {messages_to_send.count()} scheduled messages." 
