"""
Local Testing Credentials Display
"""
from django.core.management.base import BaseCommand
from companies.models import Company, Domain
from users.models import User


class Command(BaseCommand):
    help = 'Display test credentials for local subdomain testing'

    def handle(self, *args, **kwargs):
        print('\n' + '='*70)
        print('LOCAL SUBDOMAIN TESTING - CREDENTIALS')
        print('='*70 + '\n')
        
        # Setup local domains first
        self.setup_domains()
        
        # Display credentials
        companies = Company.objects.all().order_by('name')
        
        for company in companies:
            domain = Domain.objects.filter(company=company, is_primary=True).first()
            domain_url = f'http://{domain.domain}:8000' if domain else 'No domain'
            
            print(f'\n{company.name.upper()}')
            print(f'URL: {domain_url}')
            print(f'Slug: {company.slug}\n')
            
            # Company Admin
            admins = User.objects.filter(company=company, role__in=['super_admin', 'company_admin'])
            if admins.exists():
                print('  Company Admin:')
                for admin in admins:
                    pwd = '(set during creation)' if admin.role == 'super_admin' else 'Test@123'
                    print(f'    Email: {admin.email} ({admin.get_role_display()})')
                    print(f'    Password: {pwd}')
                print('')
            
            # Branch Admin
            branch_admins = User.objects.filter(company=company, role='branch_admin')
            if branch_admins.exists():
                print('  Branch Admin:')
                for ba in branch_admins:
                    branch_name = ba.branch.name if ba.branch else 'No branch'
                    print(f'    Email: {ba.email} ({branch_name})')
                    print(f'    Password: Test@123')
                print('')
            
            # Floor Manager
            fms = User.objects.filter(company=company, role='floor_manager')
            if fms.exists():
                print('  Floor Manager:')
                for fm in fms[:2]:
                    branch_name = fm.branch.name if fm.branch else 'No branch'
                    print(f'    Email: {fm.email} ({branch_name})')
                    print(f'    Password: Test@123')
                if fms.count() > 2:
                    print(f'    ... and {fms.count() - 2} more')
                print('')
            
            # Supervisor
            supervisors = User.objects.filter(company=company, role='supervisor')
            if supervisors.exists():
                print('  Supervisor:')
                for sup in supervisors[:2]:
                    branch_name = sup.branch.name if sup.branch else 'No branch'
                    print(f'    Email: {sup.email} ({branch_name})')
                    print(f'    Password: Test@123')
                if supervisors.count() > 2:
                    print(f'    ... and {supervisors.count() - 2} more')
                print('')
        
        print('\n' + '='*70)
        print('TESTING INSTRUCTIONS')
        print('='*70 + '\n')
        print('1. Start server: python manage.py runserver\n')
        print('2. Access URLs:')
        
        domains = Domain.objects.filter(is_active=True).select_related('company')
        for domain in domains:
            print(f'   {domain.company.name}: http://{domain.domain}:8000/')
        
        print('\n3. Login with credentials above')
        print('\n4. Test data isolation:')
        print('   - Each subdomain shows only that company\'s data')
        print('   - Try accessing /api/customers/ on different subdomains\n')
        
        print('='*70 + '\n')

    def setup_domains(self):
        """Create local domains"""
        companies = [
            ('new-company', 'newco.localhost'),
            ('test-company', 'testco.localhost'),
            ('test-company-a', 'companya.localhost'),
            ('test-company-b', 'companyb.localhost'),
        ]
        
        for slug, domain_name in companies:
            try:
                company = Company.objects.get(slug=slug)
                Domain.objects.get_or_create(
                    domain=domain_name,
                    defaults={
                        'company': company,
                        'is_primary': True,
                        'is_active': True,
                    }
                )
            except Company.DoesNotExist:
                pass
