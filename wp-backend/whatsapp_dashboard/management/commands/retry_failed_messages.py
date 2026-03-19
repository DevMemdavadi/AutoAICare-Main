from django.core.management.base import BaseCommand
from whatsapp.models import WhatsAppMessage
from whatsapp.services import WhatsAppService

class Command(BaseCommand):
    help = 'Retry all failed WhatsApp messages'

    def handle(self, *args, **kwargs):
        failed = WhatsAppMessage.objects.filter(status='failed')
        service = WhatsAppService()
        retried = 0
        for msg in failed:
            try:
                service.send_message(
                    to_phone=msg.phone_number,
                    message_type=msg.message_type,
                    content=msg.message_content,
                    template_name=msg.template_name,
                )
                msg.status = 'sent'
                msg.save()
                retried += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to resend {msg.message_id}: {e}"))
        self.stdout.write(self.style.SUCCESS(f"Retried {retried} messages.")) 