from django.core.management.base import BaseCommand
from django.utils import timezone
from customers.crm_models import ServiceReminder
from customers.reminder_service import ServiceReminderService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Check for due service reminders and perform automated actions'

    def handle(self, *args, **options):
        today = timezone.now().date()
        
        self.stdout.write(f"Checking for service reminders due on {today}...")
        
        # 1. Logic to auto-send reminders if they are due today
        # In a real app, this might send WhatsApp/SMS
        reminders_due = ServiceReminder.objects.filter(
            due_date=today,
            status='pending'
        )
        
        count = 0
        for reminder in reminders_due:
            # For now we just mark them as 'sent' via the mock service
            success = ServiceReminderService.send_reminder(reminder, channel='whatsapp')
            if success:
                count += 1
                
        self.stdout.write(self.style.SUCCESS(f"Successfully processed {count} reminders"))
