from django.core.management.base import BaseCommand
from whatsapp.models import PendingWhatsAppEvent
from chats.models import Conversation

class Command(BaseCommand):
    help = 'Synchronizes existing WhatsApp messages into Conversation views'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting synchronization of conversations...")
        phone_numbers = PendingWhatsAppEvent.objects.values_list('phone_number', flat=True).distinct()
        for phone in phone_numbers:
            messages = PendingWhatsAppEvent.objects.filter(phone_number=phone).order_by('-received_at')
            if not messages.exists():
                continue
                
            latest_message = messages.first()
            # For backfilled data, we'll tentatively set everything as read or unread based on status.
            unread_count = messages.filter(event_type='message_received', status='pending').count()
            
            Conversation.objects.update_or_create(
                phone_number=phone,
                defaults={
                    'last_message': latest_message.message_content,
                    'last_message_time': latest_message.received_at,
                    'unread_count': unread_count,
                }
            )
            
        self.stdout.write(self.style.SUCCESS(f"Successfully synchronized {len(phone_numbers)} conversations."))
