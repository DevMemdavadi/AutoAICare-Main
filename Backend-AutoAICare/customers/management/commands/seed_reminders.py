from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from customers.models import Vehicle, Customer
from customers.reminder_service import ServiceReminderService
import random

class Command(BaseCommand):
    help = 'Seed service reminders for testing'

    def handle(self, *args, **options):
        self.stdout.write("Seeding service reminders...")
        
        vehicles = Vehicle.objects.all()
        if not vehicles.exists():
            self.stdout.write(self.style.ERROR("No vehicles found in database. Seed customers and vehicles first."))
            return

        count = 0
        now = timezone.now().date()
        
        # Create different types of reminders (overdue, due today, upcoming)
        scenarios = [
            -5, # Overdue
            0,  # Due today
            2,  # Due in 2 days
            7,  # Due in 7 days
            15  # Due in 15 days
        ]
        
        for i, vehicle in enumerate(vehicles[:15]): # Limit to first 15 for seeding
            due_offset = scenarios[i % len(scenarios)]
            due_date = now + timedelta(days=due_offset)
            
            # Update vehicle record (this will trigger the signal too)
            vehicle.next_service_due = due_date
            vehicle.save()
            count += 1
            
        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {count} service reminders across various dates."))
