from django.core.management.base import BaseCommand
from django.db.models import Max
from whatsapp.models import WhatsAppMessage
from chats.models import Conversation

class Command(BaseCommand):
    help = 'Synchronizes existing WhatsApp messages into Conversation views'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting synchronization of conversations...")
        
        # Get all unique phone numbers
        phone_numbers = WhatsAppMessage.objects.values_list('phone_number', flat=True).distinct()
        
        for phone in phone_numbers:
            messages = WhatsAppMessage.objects.filter(phone_number=phone).order_by('-timestamp')
            if not messages.exists():
                continue
                
            latest_message = messages.first()
            unread_count = messages.filter(status='received', is_read=False).count()
            
            Conversation.objects.update_or_create(
                phone_number=phone,
                defaults={
                    'last_message': latest_message.message_content,
                    'last_message_time': latest_message.timestamp,
                    'unread_count': unread_count,
                }
            )
            
        self.stdout.write(self.style.SUCCESS(f"Successfully synchronized {len(phone_numbers)} conversations."))
