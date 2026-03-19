from django.core.management.base import BaseCommand
from companies.models import Company, CompanySettings
from users.models import User


class Command(BaseCommand):
    help = 'Create a new company with admin user'
    
    def add_arguments(self, parser):
        parser.add_argument('--name', type=str, required=True, help='Company name')
        parser.add_argument('--email', type=str, required=True, help='Company email')
        parser.add_argument('--phone', type=str, required=True, help='Company phone')
        parser.add_argument('--city', type=str, default='City', help='City')
        parser.add_argument('--state', type=str, default='State', help='State')
        parser.add_argument('--admin-email', type=str, required=True, help='Admin user email')
        parser.add_argument('--admin-name', type=str, required=True, help='Admin user name')
        parser.add_argument('--admin-password', type=str, required=True, help='Admin password')
    
    def handle(self, *args, **options):
        try:
            # Create company
            company = Company.objects.create(
                name=options['name'],
                display_name=options['name'],
                email=options['email'],
                phone=options['phone'],
                address_line1='Default Address',
                city=options['city'],
                state=options['state'],
                pincode='000000',
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Created company: {company.name} (ID: {company.id})')
            )
            
            # Create company settings
            settings = CompanySettings.objects.create(company=company)
            self.stdout.write(
                self.style.SUCCESS(f'✓ Created company settings for {company.name}')
            )
            
            # Create admin user
            admin = User.objects.create_superuser(
                email=options['admin_email'],
                name=options['admin_name'],
                password=options['admin_password'],
                company=company,
                role='super_admin'
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Created super admin: {admin.email}')
            )
            
            self.stdout.write('\n' + '='*60)
            self.stdout.write(self.style.SUCCESS('🎉 Company setup complete!'))
            self.stdout.write('='*60)
            self.stdout.write(f'Company: {company.name}')
            self.stdout.write(f'Company ID: {company.id}')
            self.stdout.write(f'Slug: {company.slug}')
            self.stdout.write(f'Admin Email: {admin.email}')
            self.stdout.write('='*60)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error creating company: {str(e)}')
            )
            raise
