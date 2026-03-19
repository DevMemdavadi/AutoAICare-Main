"""
Simple test data populator for multi-tenancy verification
"""
from django.core.management.base import BaseCommand
from decimal import Decimal

from companies.models import Company
from branches.models import Branch


class Command(BaseCommand):
    help = 'Populate minimal test data for a company'

    def add_arguments(self, parser):
        parser.add_argument('--company', type=str, required=True)

    def handle(self, *args, **options):
        try:
            company = Company.objects.get(slug=options['company'])
        except Company.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Company not found'))
            return
        
        self.stdout.write(f'\nPopulating data for: {company.name}\n')
        
        # Check if branch exists
        branch_count = Branch.objects.filter(company=company).count()
        self.stdout.write(f'Current branches: {branch_count}')
        
        if branch_count == 0:
            branch = Branch.objects.create(
                company=company,
                code='TEST01',
                name='Test Branch',
                address='Test Address',
                city='Mumbai',
                state='Maharashtra',
                pincode='400001',
                phone='0221234567',
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Created branch: {branch.name}'))
        else:
            self.stdout.write(self.style.WARNING('Branch already exists'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ Done!\n'))
