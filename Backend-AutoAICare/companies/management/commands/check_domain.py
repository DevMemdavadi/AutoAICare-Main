from django.core.management.base import BaseCommand
from companies.domain_models import Domain
from companies.models import Company


class Command(BaseCommand):
    help = 'Check and display domain configuration for debugging'

    def add_arguments(self, parser):
        parser.add_argument(
            '--domain',
            type=str,
            help='Domain to check (e.g., api.autoaicare.com)',
        )
        parser.add_argument(
            '--add',
            action='store_true',
            help='Add the domain if it doesn\'t exist',
        )
        parser.add_argument(
            '--company-id',
            type=int,
            help='Company ID to associate with the domain (required with --add)',
        )

    def handle(self, *args, **options):
        domain_name = options.get('domain')
        add_domain = options.get('add')
        company_id = options.get('company_id')

        if not domain_name:
            # List all domains
            self.stdout.write(self.style.SUCCESS('\n=== All Registered Domains ===\n'))
            domains = Domain.objects.select_related('company').all()
            
            if not domains:
                self.stdout.write(self.style.WARNING('No domains found in the database!'))
                return
            
            for domain in domains:
                self.stdout.write(
                    f"Domain: {domain.domain or 'N/A'} | "
                    f"Subdomain: {domain.subdomain or 'N/A'} | "
                    f"Company: {domain.company.name if domain.company else 'N/A'} (ID: {domain.company.id if domain.company else 'N/A'}) | "
                    f"Active: {domain.is_active}"
                )
            return

        # Check specific domain
        self.stdout.write(self.style.SUCCESS(f'\n=== Checking domain: {domain_name} ===\n'))
        
        # Try to find the domain
        domain_obj = Domain.objects.filter(
            domain=domain_name,
            is_active=True
        ).select_related('company').first()
        
        if not domain_obj:
            # Try subdomain
            subdomain = domain_name.split('.')[0]
            domain_obj = Domain.objects.filter(
                subdomain=subdomain,
                is_active=True
            ).select_related('company').first()
        
        if domain_obj:
            self.stdout.write(self.style.SUCCESS(f'✓ Domain found!'))
            self.stdout.write(f'  Domain: {domain_obj.domain or "N/A"}')
            self.stdout.write(f'  Subdomain: {domain_obj.subdomain or "N/A"}')
            self.stdout.write(f'  Company: {domain_obj.company.name if domain_obj.company else "N/A"}')
            self.stdout.write(f'  Company ID: {domain_obj.company.id if domain_obj.company else "N/A"}')
            self.stdout.write(f'  Active: {domain_obj.is_active}')
        else:
            self.stdout.write(self.style.WARNING(f'✗ Domain not found: {domain_name}'))
            
            if add_domain:
                if not company_id:
                    self.stdout.write(self.style.ERROR('Error: --company-id is required when using --add'))
                    return
                
                try:
                    company = Company.objects.get(id=company_id)
                    
                    # Create the domain
                    new_domain = Domain.objects.create(
                        domain=domain_name,
                        subdomain=domain_name.split('.')[0],
                        company=company,
                        is_active=True
                    )
                    
                    self.stdout.write(self.style.SUCCESS(f'\n✓ Domain added successfully!'))
                    self.stdout.write(f'  Domain: {new_domain.domain}')
                    self.stdout.write(f'  Subdomain: {new_domain.subdomain}')
                    self.stdout.write(f'  Company: {new_domain.company.name} (ID: {new_domain.company.id})')
                    
                except Company.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f'Error: Company with ID {company_id} not found'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error creating domain: {str(e)}'))
            else:
                self.stdout.write(self.style.WARNING('\nTo add this domain, run:'))
                self.stdout.write(f'  python manage.py check_domain --domain {domain_name} --add --company-id <COMPANY_ID>')
                self.stdout.write('\nAvailable companies:')
                companies = Company.objects.all()
                for company in companies:
                    self.stdout.write(f'  ID: {company.id} - {company.name}')
