from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Vehicle


@shared_task
def send_maintenance_reminders():
    """Send bi-weekly maintenance reminders to customers."""
    today = timezone.now().date()
    upcoming_days = today + timedelta(days=7)  # Next week
    
    # Get vehicles that are due for service in the next week
    vehicles = Vehicle.objects.filter(
        next_service_due__lte=upcoming_days,
        next_service_due__gte=today
    ).select_related('customer__user')
    
    for vehicle in vehicles:
        user = vehicle.customer.user
        # TODO: Send notification via email/SMS
        print(f"Reminder sent to {user.email} for vehicle {vehicle.registration_number}")
    
    return f"Sent {vehicles.count()} maintenance reminders"
