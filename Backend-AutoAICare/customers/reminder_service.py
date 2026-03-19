from django.utils import timezone
from datetime import timedelta
from .crm_models import ServiceReminder
from .models import Vehicle, Customer

class ServiceReminderService:
    @staticmethod
    def generate_reminders_for_vehicle(vehicle):
        """
        Creates a pending service reminder for a vehicle based on its next_service_due date.
        """
        if not vehicle.next_service_due:
            return None
        
        # Check if a pending reminder already exists for this vehicle
        existing_reminder = ServiceReminder.objects.filter(
            vehicle=vehicle,
            status='pending'
        ).first()
        
        if existing_reminder:
            # Update the existing one
            existing_reminder.due_date = vehicle.next_service_due
            existing_reminder.save()
            return existing_reminder
        else:
            # Create a new one
            reminder = ServiceReminder.objects.create(
                customer=vehicle.customer,
                vehicle=vehicle,
                due_date=vehicle.next_service_due,
                reminder_type='regular_service',
                status='pending'
            )
            return reminder

    @staticmethod
    def get_upcoming_reminders(days=7, branch_id=None):
        """
        Get reminders due within the next N days.
        """
        today = timezone.now().date()
        future_date = today + timedelta(days=days)
        
        reminders = ServiceReminder.objects.filter(
            due_date__lte=future_date,
            status='pending'
        ).select_related('customer__user', 'vehicle')
        
        if branch_id:
            # Since ServiceReminder doesn't have a branch field, 
            # we filter based on the customer's last booking branch or the vehicle's branch 
            # For simplicity in Phase 1, we can filter by the vehicle's customer's profile branch if it existed
            # but usually branch-specific reminders are handled by the branch workers.
            pass
            
        return reminders

    @staticmethod
    def send_reminder(reminder, channel='email'):
        """
        Logic for sending the actual reminder.
        """
        # This would integrate with SMS/WhatsApp/Email APIs
        # For now, we mock it
        
        # 1. Update status
        reminder.status = 'sent'
        reminder.sent_at = timezone.now()
        reminder.sent_via = channel
        reminder.save()
        
        return True
