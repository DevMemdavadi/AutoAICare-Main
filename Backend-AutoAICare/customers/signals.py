from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Vehicle
from .reminder_service import ServiceReminderService

@receiver(post_save, sender=Vehicle)
def sync_vehicle_reminders(sender, instance, created, **kwargs):
    """
    Ensure a pending ServiceReminder exists whenever a vehicle's 
    next_service_due date is set or updated.
    """
    if instance.next_service_due:
        ServiceReminderService.generate_reminders_for_vehicle(instance)
