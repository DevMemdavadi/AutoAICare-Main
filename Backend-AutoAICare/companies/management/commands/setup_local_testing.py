"""
Local Testing Setup for Subdomain Multi-Tenancy
This script sets up local domains and displays test credentials
"""
from django.core.management.base import BaseCommand
from companies.models import Company, Domain
from users.models import User
from branches.models import Branch


class Command(BaseCommand):
    help = 'Setup local testing environment for subdomain multi-tenancy'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('🧪 LOCAL SUBDOMAIN TESTING SETUP'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))
        
        # Setup local domains
        self.setup_local_domains()
        
        # Display test credentials
        self.display_test_credentials()
        
        # Display hosts file instructions
        self.display_hosts_instructions()
        
        # Display testing instructions
        self.display_testing_instructions()

    def setup_local_domains(self):
        """Create local .localhost domains for testing"""
        self.stdout.write('📍 Setting up local domains...\n')
        
        companies = [
            ('new-company', 'newco.localhost'),
            ('test-company', 'testco.localhost'),
            ('test-company-a', 'companya.localhost'),
            ('test-company-b', 'companyb.localhost'),
        ]
        
        for slug, domain_name in companies:
            try:
                company = Company.objects.get(slug=slug)
                domain, created = Domain.objects.get_or_create(
                    domain=domain_name,
                    defaults={
                        'company': company,
                        'is_primary': True,
                        'is_active': True,
                    }
                )
                
                status = '✅ Created' if created else '✓ Exists'
                self.stdout.write(f'  {status}: {domain_name} → {company.name}')
            except Company.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  ⚠️  Company not found: {slug}'))
        
        self.stdout.write('')

    def display_test_credentials(self):
        """Display all test user credentials organized by company and role"""
        self.stdout.write(self.style.SUCCESS('='*70))
        self.stdout.write(self.style.SUCCESS('🔑 TEST CREDENTIALS'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))
        
        companies = Company.objects.all().order_by('name')
        
        for company in companies:
            # Get domain
            domain = Domain.objects.filter(company=company, is_primary=True).first()
            domain_url = f'http://{domain.domain}:8000' if domain else 'No domain'
            
            self.stdout.write(self.style.SUCCESS(f'\n📦 {company.name.upper()}'))
            self.stdout.write(f'   URL: {domain_url}')
            self.stdout.write(f'   Slug: {company.slug}\n')
            
            # Get users by role
            roles = [
                ('super_admin', 'Company Admin'),
                ('branch_admin', 'Branch Admin'),
                ('floor_manager', 'Floor Manager'),
                ('supervisor', 'Supervisor'),
                ('applicator', 'Applicator'),
                ('customer', 'Customer'),
            ]
            
            for role_key, role_name in roles:
                users = User.objects.filter(company=company, role=role_key)
                
                if users.exists():
                    self.stdout.write(f'   {role_name}:')
                    for user in users[:3]:  # Show max 3 per role
                        # Get branch if exists
                        branch_info = f' (Branch: {user.branch.name})' if user.branch else ''
                        self.stdout.write(f'     • {user.email}{branch_info}')
                        self.stdout.write(f'       Password: Test@123')
                    
                    if users.count() > 3:
                        self.stdout.write(f'     ... and {users.count() - 3} more')
                    self.stdout.write('')

    def display_hosts_instructions(self):
        """Display instructions for updating hosts file"""
        self.stdout.write(self.style.SUCCESS('='*70))
        self.stdout.write(self.style.SUCCESS('📝 HOSTS FILE SETUP (Optional)'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))
        
        self.stdout.write('Modern browsers support .localhost automatically!')
        self.stdout.write('No hosts file changes needed.\n')
        
        self.stdout.write('If you want to use custom domains, add to hosts file:\n')
        
        domains = Domain.objects.filter(is_active=True).order_by('domain')
        
        self.stdout.write('Windows: C:\\Windows\\System32\\drivers\\etc\\hosts')
        self.stdout.write('Mac/Linux: /etc/hosts\n')
        
        for domain in domains:
            self.stdout.write(f'127.0.0.1  {domain.domain}')
        
        self.stdout.write('')

    def display_testing_instructions(self):
        """Display testing instructions"""
        self.stdout.write(self.style.SUCCESS('='*70))
        self.stdout.write(self.style.SUCCESS('🧪 TESTING INSTRUCTIONS'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))
        
        self.stdout.write('1. Start the development server:')
        self.stdout.write('   python manage.py runserver\n')
        
        self.stdout.write('2. Access company-specific URLs:\n')
        
        domains = Domain.objects.filter(is_active=True).select_related('company').order_by('company__name')
        for domain in domains:
            self.stdout.write(f'   {domain.company.name}:')
            self.stdout.write(f'   → http://{domain.domain}:8000/\n')
        
        self.stdout.write('3. Login with credentials above\n')
        
        self.stdout.write('4. Verify data isolation:')
        self.stdout.write('   - Each subdomain shows only that company\'s data')
        self.stdout.write('   - Try: http://newco.localhost:8000/api/customers/')
        self.stdout.write('   - Then: http://testco.localhost:8000/api/customers/')
        self.stdout.write('   - Should see different customers!\n')
        
        self.stdout.write('5. Test API endpoints:')
        self.stdout.write('   curl http://newco.localhost:8000/api/customers/')
        self.stdout.write('   curl http://testco.localhost:8000/api/customers/\n')
        
        self.stdout.write(self.style.SUCCESS('='*70))
        self.stdout.write(self.style.SUCCESS('✅ Setup Complete! Ready for testing.'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))
