from django.core.management.base import BaseCommand
from services.models import ServicePackage

class Command(BaseCommand):
    help = 'Populate compatible_vehicle_types field for existing services'

    def handle(self, *args, **options):
        # Update all services to set compatible_vehicle_types based on category
        updated_count = 0
        
        for service in ServicePackage.objects.all():
            # Only update if compatible_vehicle_types is empty or None
            if not service.compatible_vehicle_types:
                if service.category == 'bike_services':
                    service.compatible_vehicle_types = ['bike']
                else:
                    # For car services, compatible with all car types
                    service.compatible_vehicle_types = ['hatchback', 'sedan', 'suv']
                
                service.save()
                updated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated {updated_count} services with compatible vehicle types'
            )
        )