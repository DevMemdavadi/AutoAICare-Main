from django.db.models.signals import post_save
from django.dispatch import receiver
from whatsapp.models import WhatsAppMessage
from .models import Conversation

@receiver(post_save, sender=WhatsAppMessage)
def update_conversation(sender, instance, created, **kwargs):
    phone_number = instance.phone_number
    if not phone_number:
        return

    # Update or create conversation
    conversation, created_conv = Conversation.objects.get_or_create(
        phone_number=phone_number,
        defaults={
            'last_message': instance.message_content,
            'last_message_time': instance.timestamp,
            'unread_count': 1 if instance.status == 'received' else 0
        }
    )

    if not created_conv:
        # If timestamp is newer, update last message fields
        if not conversation.last_message_time or instance.timestamp >= conversation.last_message_time:
            conversation.last_message = instance.message_content
            conversation.last_message_time = instance.timestamp
            
        # If it's an incoming message and newly created WhatsAppMessage, bump unread tally
        if created and instance.status == 'received':
            conversation.unread_count += 1
            
        conversation.save()
