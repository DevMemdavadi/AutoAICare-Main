"""
Management command to add a domain/subdomain to a company.
"""
from django.core.management.base import BaseCommand
from companies.models import Company, Domain


class Command(BaseCommand):
    help = 'Add a domain/subdomain to a company for multi-tenant access'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company',
            type=str,
            required=True,
            help='Company slug or ID'
        )
        parser.add_argument(
            '--domain',
            type=str,
            required=True,
            help='Full domain (e.g., k3car.autoaicare.com)'
        )
        parser.add_argument(
            '--primary',
            action='store_true',
            help='Set as primary domain for this company'
        )

    def handle(self, *args, **kwargs):
        company_identifier = kwargs['company']
        domain_name = kwargs['domain']
        is_primary = kwargs.get('primary', False)
        
        # Get company
        try:
            if company_identifier.isdigit():
                company = Company.objects.get(id=int(company_identifier))
            else:
                company = Company.objects.get(slug=company_identifier)
        except Company.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Company "{company_identifier}" not found'))
            return
        
        # Create or update domain
        domain, created = Domain.objects.get_or_create(
            domain=domain_name,
            defaults={
                'company': company,
                'is_primary': is_primary,
                'is_active': True,
            }
        )
        
        if not created:
            # Update existing domain
            domain.company = company
            domain.is_primary = is_primary
            domain.is_active = True
            domain.save()
            action = 'Updated'
        else:
            action = 'Created'
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ {action} domain successfully!'))
        self.stdout.write(f'   Domain: {domain.domain}')
        self.stdout.write(f'   Subdomain: {domain.subdomain}')
        self.stdout.write(f'   Company: {company.name}')
        self.stdout.write(f'   Primary: {"Yes" if domain.is_primary else "No"}')
        self.stdout.write(f'   Active: {"Yes" if domain.is_active else "No"}')
        self.stdout.write('')
        
        # Show access URL
        self.stdout.write(self.style.SUCCESS(f'🌐 Access URL: https://{domain.domain}/'))
        self.stdout.write('')
