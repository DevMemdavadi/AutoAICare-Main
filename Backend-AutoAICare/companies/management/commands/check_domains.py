from django.core.management.base import BaseCommand
from companies.domain_models import Domain
from companies.models import Company


class Command(BaseCommand):
    help = 'Check and display domain-to-company mappings'

    def handle(self, *args, **options):
        self.stdout.write("=" * 80)
        self.stdout.write("DOMAIN MAPPINGS")
        self.stdout.write("=" * 80)
        
        domains = Domain.objects.select_related('company').all()
        
        if not domains.exists():
            self.stdout.write(self.style.WARNING("No domain mappings found!"))
            return
        
        for domain in domains:
            self.stdout.write(f"\nDomain/Subdomain: {domain.subdomain or domain.domain}")
            self.stdout.write(f"  → Company: {domain.company.name} (ID: {domain.company.id})")
            self.stdout.write(f"  → Active: {domain.is_active}")
            self.stdout.write(f"  → Primary: {domain.is_primary}")
        
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("ALL COMPANIES")
        self.stdout.write("=" * 80)
        
        companies = Company.objects.all()
        for company in companies:
            self.stdout.write(f"\nCompany: {company.name} (ID: {company.id})")
            company_domains = Domain.objects.filter(company=company)
            if company_domains.exists():
                self.stdout.write("  Domains:")
                for d in company_domains:
                    self.stdout.write(f"    - {d.subdomain or d.domain}")
            else:
                self.stdout.write(self.style.WARNING("  No domains configured!"))
        
        self.stdout.write("\n" + "=" * 80)
