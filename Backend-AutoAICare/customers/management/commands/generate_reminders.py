"""
Management command to generate sample service reminders for testing
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from customers.models import Customer, Vehicle
from customers.crm_models import ServiceReminder
import random


class Command(BaseCommand):
    help = 'Generate sample service reminders for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=20,
            help='Number of reminders to create'
        )

    def handle(self, *args, **options):
        count = options['count']
        
        # Get all vehicles with customers
        vehicles = Vehicle.objects.select_related('customer').all()
        
        if not vehicles.exists():
            self.stdout.write(self.style.ERROR('No vehicles found. Please create some vehicles first.'))
            return
        
        reminder_types = [
            'regular_service',
            'oil_change',
            'tire_rotation',
            'brake_inspection',
            'detailing',
            'wash_and_wax',
        ]
        
        statuses = ['pending', 'sent', 'completed', 'cancelled']
        status_weights = [0.5, 0.25, 0.15, 0.1]  # More pending reminders
        
        created_count = 0
        
        for i in range(count):
            # Select a random vehicle
            vehicle = random.choice(vehicles)
            
            # Generate a due date (some in past, some in future)
            days_offset = random.randint(-30, 60)
            due_date = timezone.now().date() + timedelta(days=days_offset)
            
            # Select status based on weights
            status = random.choices(statuses, weights=status_weights)[0]
            
            # Set sent_at and sent_via if status is sent or completed
            sent_at = None
            sent_via = None
            if status in ['sent', 'completed']:
                sent_at = timezone.now() - timedelta(days=random.randint(1, 10))
                sent_via = random.choice(['email', 'sms', 'whatsapp'])
            
            # Create the reminder
            reminder = ServiceReminder.objects.create(
                customer=vehicle.customer,
                vehicle=vehicle,
                due_date=due_date,
                reminder_type=random.choice(reminder_types),
                message=f"It's time for your {random.choice(reminder_types).replace('_', ' ')}!",
                status=status,
                sent_at=sent_at,
                sent_via=sent_via
            )
            
            created_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created reminder {created_count}/{count}: {reminder.customer.user.name} - '
                    f'{reminder.vehicle.registration_number} - {reminder.reminder_type} - '
                    f'{reminder.status} - Due: {reminder.due_date}'
                )
            )
        
        self.stdout.write(
            self.style.SUCCESS(f'\nSuccessfully created {created_count} service reminders!')
        )
