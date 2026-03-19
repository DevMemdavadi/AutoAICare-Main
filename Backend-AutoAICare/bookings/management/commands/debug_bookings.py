from django.core.management.base import BaseCommand
from bookings.models import Booking
from companies.models import Company
from branches.models import Branch


class Command(BaseCommand):
    help = 'Debug booking visibility issues'

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("BOOKING DEBUG REPORT")
        self.stdout.write("=" * 80)
        
        # Check total bookings (bypass CompanyManager)
        total_bookings = Booking.objects.using('default').model.objects.using('default').all().count()
        self.stdout.write(f"\nTotal bookings in database (raw query): {total_bookings}")
        
        # Check bookings via CompanyManager
        manager_bookings = Booking.objects.all().count()
        self.stdout.write(f"Bookings via CompanyManager: {manager_bookings}")
        
        # List all companies
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("COMPANIES:")
        for company in Company.objects.all():
            self.stdout.write(f"\n  Company ID {company.id}: {company.name}")
            
            # Count branches
            branches = Branch.objects.filter(company=company)
            self.stdout.write(f"    Branches: {branches.count()}")
            for branch in branches:
                self.stdout.write(f"      - Branch ID {branch.id}: {branch.name}")
                
                # Count bookings for this branch (raw query)
                branch_bookings = Booking.objects.using('default').model.objects.using('default').filter(branch=branch).count()
                self.stdout.write(f"        Bookings: {branch_bookings}")
        
        # Check bookings without branch
        self.stdout.write("\n" + "=" * 80)
        orphan_bookings = Booking.objects.using('default').model.objects.using('default').filter(branch__isnull=True).count()
        self.stdout.write(f"Bookings without branch: {orphan_bookings}")
        
        # Check bookings without company
        orphan_company_bookings = Booking.objects.using('default').model.objects.using('default').filter(company__isnull=True).count()
        self.stdout.write(f"Bookings without company: {orphan_company_bookings}")
        
        # Sample booking details
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("SAMPLE BOOKINGS (first 5):")
        sample_bookings = Booking.objects.using('default').model.objects.using('default').all()[:5]
        for booking in sample_bookings:
            self.stdout.write(f"\n  Booking ID {booking.id}:")
            self.stdout.write(f"    Customer: {booking.customer}")
            self.stdout.write(f"    Branch: {booking.branch} (ID: {booking.branch.id if booking.branch else None})")
            self.stdout.write(f"    Company: {booking.company} (ID: {booking.company.id if booking.company else None})")
            self.stdout.write(f"    Status: {booking.status}")
            self.stdout.write(f"    Created: {booking.created_at}")
        
        self.stdout.write("\n" + "=" * 80)
