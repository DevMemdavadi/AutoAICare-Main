from django.core.management.base import BaseCommand
from services.models import ServicePackage, AddOn

class Command(BaseCommand):
    help = 'Check service packages and add-ons'

    def handle(self, *args, **kwargs):
        packages = ServicePackage.objects.all()
        addons = AddOn.objects.all()
        
        self.stdout.write("="*60)
        self.stdout.write(f"SERVICE PACKAGES: {packages.count()}")
        self.stdout.write("="*60)
        
        for pkg in packages:
            self.stdout.write(f"  - {pkg.name} ({pkg.category})")
        
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"ADD-ONS: {addons.count()}")
        self.stdout.write("="*60)
        
        for addon in addons:
            self.stdout.write(f"  - {addon.name} (Rs. {addon.price})")
        
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("[OK] Services check complete!"))
