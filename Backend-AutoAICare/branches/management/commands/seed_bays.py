from django.core.management.base import BaseCommand
from branches.models import Branch, ServiceBay
import random

class Command(BaseCommand):
    help = 'Seed service bays for all branches'

    def handle(self, *args, **options):
        branches = Branch.objects.all()
        if not branches.exists():
            self.stdout.write(self.style.ERROR('No branches found. Please create branches first.'))
            return

        bay_types = ['washing', 'detailing', 'drying', 'inspection', 'other']
        
        for branch in branches:
            self.stdout.write(f"Seeding bays for branch: {branch.name}")
            
            # Create a few bays for each branch
            for i in range(1, 6):
                bay_name = f"Bay {i}"
                bay_type = random.choice(bay_types)
                
                ServiceBay.objects.get_or_create(
                    branch=branch,
                    name=bay_name,
                    defaults={'bay_type': bay_type}
                )
            
            self.stdout.write(self.style.SUCCESS(f"Successfully seeded 5 bays for {branch.name}"))
