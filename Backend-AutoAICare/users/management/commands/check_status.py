from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from branches.models import Branch

User = get_user_model()

class Command(BaseCommand):
    help = 'Check seeded data status'

    def handle(self, *args, **kwargs):
        self.stdout.write("="*60)
        self.stdout.write("DATABASE STATUS CHECK")
        self.stdout.write("="*60)
        
        total_users = User.objects.count()
        self.stdout.write(f"\nTotal users: {total_users}")
        self.stdout.write(f"  - Super admins: {User.objects.filter(role='super_admin').count()}")
        self.stdout.write(f"  - Branch admins: {User.objects.filter(role='branch_admin').count()}")
        self.stdout.write(f"  - Floor managers: {User.objects.filter(role='floor_manager').count()}")
        self.stdout.write(f"  - Supervisors: {User.objects.filter(role='supervisor').count()}")
        self.stdout.write(f"  - Applicators: {User.objects.filter(role='applicator').count()}")
        self.stdout.write(f"  - Customers: {User.objects.filter(role='customer').count()}")
        
        branch_count = Branch.objects.count()
        self.stdout.write(f"\nBranches: {branch_count}")
        for branch in Branch.objects.all():
            self.stdout.write(f"  - {branch.name} ({branch.code})")
        
        self.stdout.write("\n" + "="*60)
        
        if total_users > 0 and branch_count > 0:
            self.stdout.write(self.style.SUCCESS("\n[OK] Data seeding appears successful!"))
        else:
            self.stdout.write(self.style.ERROR(" \n[ERROR] No data found - seeding may have failed"))
