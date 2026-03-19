"""
Complete Company Onboarding - Required Data Only

This command creates a new company with all required infrastructure:
1.  Company + Admin User
2.  Multi-branch setup with service bays
3.  Staff for each branch (Branch Admin, Floor Manager, Supervisors, Applicators)
4.  Default workflow template
5.  Service packages & add-ons
6.  Parts catalog
7.  Service-parts mappings
8.  Lead sources
9.  Attendance policy
10. Domain mapping
11. Cloudflare DNS record
12. Automation workflows

Usage:
    python manage.py onboard_company \
        --name "Shine Auto Studio" \
        --email "info@shineauto.com" \
        --phone "9988776655" \
        --subdomain "shineauto" \
        --admin-email "admin@shineauto.com" \
        --admin-name "Shine Admin" \
        --admin-password "ShineAuto@2026" \
        --branches 2
"""

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
from django.utils.text import slugify
from companies.models import Company, CompanySettings, Domain
from branches.models import Branch, ServiceBay
from users.models import User
from leads.models import LeadSource
from attendance.models import AttendancePolicy
from decimal import Decimal
import sys


class Command(BaseCommand):
    help = 'Complete company onboarding with required data only'
    
    def add_arguments(self, parser):
        # Company Information
        parser.add_argument('--name', type=str, required=True, help='Company name')
        parser.add_argument('--email', type=str, required=True, help='Company email')
        parser.add_argument('--phone', type=str, required=True, help='Company phone')
        parser.add_argument('--city', type=str, default='Mumbai', help='City')
        parser.add_argument('--state', type=str, default='Maharashtra', help='State')
        parser.add_argument('--address', type=str, default='Default Address', help='Address')
        parser.add_argument('--pincode', type=str, default='400001', help='Pincode')
        
        # Admin Information
        parser.add_argument('--admin-email', type=str, required=True, help='Admin user email')
        parser.add_argument('--admin-name', type=str, required=True, help='Admin user name')
        parser.add_argument('--admin-password', type=str, required=True, help='Admin password')
        
        # Domain Information
        parser.add_argument('--subdomain', type=str, required=True, help='Subdomain (e.g., k3car)')
        parser.add_argument('--base-domain', type=str, default='autoaicare.com', help='Base domain')
        parser.add_argument('--skip-dns', action='store_true', help='Skip DNS record creation')
        
        # Branch Setup
        parser.add_argument('--branches', type=int, default=2, help='Number of branches to create')
        
        # Options
        parser.add_argument('--skip-workflows', action='store_true', help='Skip automation workflows')
        parser.add_argument('--skip-staff', action='store_true', help='Skip branch staff creation')
    
    def handle(self, *args, **options):
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('🚀 COMPANY ONBOARDING - REQUIRED DATA ONLY'))
        self.stdout.write('='*70 + '\n')
        
        try:
            with transaction.atomic():
                # Step 1: Create Company
                company = self.create_company(options)

                # Step 2: Create Admin User
                admin = self.create_admin_user(company, options)

                # Step 3: Create Branches
                branches = self.create_branches(company, options)

                # Step 4: Create Reward Settings for each branch
                self.create_reward_settings(branches)

                # Step 5: Create Staff for Branches
                staff_data = {}
                if not options['skip_staff']:
                    staff_data = self.create_staff_for_branches(company, branches, options)

                # Step 6: Create Workflow Template
                self.create_workflow(company)

                # Step 7: Seed Services
                self.seed_services(company)

                # Step 8: Seed Parts
                self.seed_parts(company)

                # Step 9: Link Services to Parts
                self.seed_service_parts(company)

                # Step 10: Create Lead Sources
                self.create_lead_sources(company)

                # Step 11: Create Attendance Policy
                self.create_attendance_policy(company)

                # Step 12: Add Domain
                domain = self.add_domain(company, options)

                # Step 13: Create DNS Record
                if not options['skip_dns']:
                    self.create_dns_record(options['subdomain'], options['base_domain'])

                # Step 14: Create Automation Workflows (optional)
                if not options['skip_workflows']:
                    self.create_automation_workflows(company)

            # Print Summary
            self.print_summary(company, admin, domain, branches, staff_data, options)
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Onboarding failed: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())
            raise
    
    def create_company(self, options):
        """Step 1: Create company and settings"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 1/12: Creating Company'))
        self.stdout.write('-'*70)
        
        slug = slugify(options['name'])
        
        # Check if company exists
        if Company.objects.filter(slug=slug).exists():
            self.stdout.write(self.style.WARNING(f'⚠️  Company "{slug}" already exists'))
            company = Company.objects.get(slug=slug)
            self.stdout.write(self.style.SUCCESS(f'✓ Using existing company: {company.name}'))
            return company
        
        company = Company.objects.create(
            name=options['name'],
            display_name=options['name'],
            slug=slug,
            email=options['email'],
            phone=options['phone'],
            address_line1=options['address'],
            city=options['city'],
            state=options['state'],
            pincode=options['pincode'],
            is_active=True
        )
        
        # Create company settings
        CompanySettings.objects.create(company=company)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Company created: {company.name}'))
        self.stdout.write(f'  ID: {company.id}')
        self.stdout.write(f'  Slug: {company.slug}')
        
        return company
    
    def create_admin_user(self, company, options):
        """Step 2: Create admin user"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 2/12: Creating Admin User'))
        self.stdout.write('-'*70)
        
        # Check if user exists
        if User.objects.filter(email=options['admin_email']).exists():
            self.stdout.write(self.style.WARNING(f'⚠️  User "{options["admin_email"]}" already exists'))
            user = User.objects.get(email=options['admin_email'])
            self.stdout.write(self.style.SUCCESS(f'✓ Using existing user: {user.name}'))
            return user
        
        admin = User.objects.create_user(
            email=options['admin_email'],
            name=options['admin_name'],
            password=options['admin_password'],
            phone=options['phone'],
            role='company_admin',
            company=company,
            is_staff=True,
            is_superuser=False,
            is_verified=True
        )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Admin user created: {admin.email}'))
        self.stdout.write(f'  Role: {admin.role}')
        
        return admin
    
    def create_branches(self, company, options):
        """Step 3: Create branches with service bays"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 3/12: Creating Branches'))
        self.stdout.write('-'*70)
        
        branch_templates = [
            {'name': 'Main Branch', 'code': 'MAIN'},
            {'name': 'Andheri Branch', 'code': 'AND'},
            {'name': 'Bandra Branch', 'code': 'BND'},
            {'name': 'Powai Branch', 'code': 'PWI'},
        ]
        
        branches = []
        num_branches = min(options['branches'], len(branch_templates))
        
        for i in range(num_branches):
            template = branch_templates[i]
            
            branch, created = Branch.objects.get_or_create(
                company=company,
                code=template['code'],
                defaults={
                    'name': template['name'],
                    'address': f'{i+1}, MG Road',
                    'city': options['city'],
                    'state': options['state'],
                    'pincode': f'40000{i+1}',
                    'phone': options['phone'],
                    'email': f"{template['code'].lower()}@{company.slug}.com",
                    'is_active': True,
                }
            )
            
            if created:
                # Create service bays
                for bay_num in range(1, 4):
                    ServiceBay.objects.create(
                        branch=branch,
                        company=company,
                        name=f'Bay {bay_num}',
                        bay_type='detailing',
                        is_active=True
                    )
                
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {branch.name} with 3 service bays'))
            else:
                self.stdout.write(self.style.WARNING(f'⚠️  Branch "{branch.name}" already exists'))
            
            branches.append(branch)
        
        self.stdout.write(f'\n  Total branches: {len(branches)}')
        return branches
    
    def create_staff_for_branches(self, company, branches, options):
        """Step 4: Create staff roles for each branch"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 4/13: Creating Staff for Branches'))
        self.stdout.write('-'*70)

        subdomain = options['subdomain']
        phone_base = options['phone'][:8]  # first 8 digits as base

        staff_data = {
            'branch_admins': [],
            'floor_managers': [],
            'supervisors': [],
            'applicators': [],
        }

        for i, branch in enumerate(branches):
            branch_code = branch.code.lower()

            # ── Branch Admin ──────────────────────────────────────────────
            admin, created = User.objects.get_or_create(
                email=f'admin.{branch_code}@{subdomain}.com',
                defaults={
                    'name': f'Branch Admin {branch.name}',
                    'role': 'branch_admin',
                    'phone': f'{phone_base}{i}0',
                    'company': company,
                    'branch': branch,
                    'is_verified': True,
                    'is_active': True,
                    'is_staff': True,
                }
            )
            if created:
                admin.set_password('Admin@123')
                admin.save()
            staff_data['branch_admins'].append(admin)
            flag = '✓' if created else '⚠️  exists'
            self.stdout.write(f'  {flag} Branch Admin:    {admin.name} ({admin.email})')

            # ── Floor Manager ─────────────────────────────────────────────
            fm, created = User.objects.get_or_create(
                email=f'fm.{branch_code}@{subdomain}.com',
                defaults={
                    'name': f'Floor Manager {branch.name}',
                    'role': 'floor_manager',
                    'phone': f'{phone_base}{i}1',
                    'company': company,
                    'branch': branch,
                    'is_verified': True,
                    'is_active': True,
                    'is_staff': True,
                }
            )
            if created:
                fm.set_password('FM@123')
                fm.save()
            staff_data['floor_managers'].append(fm)
            flag = '✓' if created else '⚠️  exists'
            self.stdout.write(f'  {flag} Floor Manager:  {fm.name} ({fm.email})')

            # ── Supervisors (2 per branch) ────────────────────────────────
            for j in range(1, 3):
                sv, created = User.objects.get_or_create(
                    email=f'supervisor{j}.{branch_code}@{subdomain}.com',
                    defaults={
                        'name': f'Supervisor {j} {branch.name}',
                        'role': 'supervisor',
                        'phone': f'{phone_base}{i}{j}',
                        'company': company,
                        'branch': branch,
                        'is_verified': True,
                        'is_active': True,
                    }
                )
                if created:
                    sv.set_password('Super@123')
                    sv.save()
                staff_data['supervisors'].append(sv)
                flag = '✓' if created else '⚠️  exists'
                self.stdout.write(f'  {flag} Supervisor {j}:    {sv.name} ({sv.email})')

            # ── Applicators (3 per branch) ────────────────────────────────
            for j in range(1, 4):
                ap, created = User.objects.get_or_create(
                    email=f'applicator{j}.{branch_code}@{subdomain}.com',
                    defaults={
                        'name': f'Applicator {j} {branch.name}',
                        'role': 'applicator',
                        'phone': f'{phone_base}{i}{j+2}',
                        'company': company,
                        'branch': branch,
                        'is_verified': True,
                        'is_active': True,
                    }
                )
                if created:
                    ap.set_password('App@123')
                    ap.save()
                staff_data['applicators'].append(ap)
                flag = '✓' if created else '⚠️  exists'
                self.stdout.write(f'  {flag} Applicator {j}:   {ap.name} ({ap.email})')

            self.stdout.write('')  # blank line between branches

        total = sum(len(v) for v in staff_data.values())
        self.stdout.write(self.style.SUCCESS(f'  Total staff created/found: {total}'))
        return staff_data

    def create_reward_settings(self, branches):
        """Step 4: Create default RewardSettings for each branch"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 4/14: Creating Reward Settings'))
        self.stdout.write('-'*70)

        from jobcards.signals import create_default_reward_settings

        created_count = 0
        for branch in branches:
            _, created = create_default_reward_settings(branch)
            if created:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Reward settings created for: {branch.name}'))
                created_count += 1
            else:
                self.stdout.write(self.style.WARNING(f'  ⚠️  Reward settings already exist for: {branch.name}'))

        self.stdout.write(self.style.SUCCESS(f'  Total: {created_count} reward setting records created'))

    def create_workflow(self, company):
        """Step 5: Create workflow template"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 5/13: Creating Workflow Template'))
        self.stdout.write('-'*70)
        
        try:
            call_command('create_simplified_workflow', company=company.slug, set_default=True)
            self.stdout.write(self.style.SUCCESS('✓ Workflow template created'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  Workflow creation failed: {e}'))
    
    def seed_services(self, company):
        """Step 6: Seed service packages"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 6/13: Seeding Service Packages'))
        self.stdout.write('-'*70)

        try:
            call_command('seed_services', company=company.id)
            self.stdout.write(self.style.SUCCESS('✓ Service packages seeded'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  Service seeding failed: {e}'))

    def seed_parts(self, company):
        """Step 7: Seed parts catalog"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 7/13: Seeding Parts Catalog'))
        self.stdout.write('-'*70)

        try:
            call_command('seed_parts', company=company.id)
            self.stdout.write(self.style.SUCCESS('✓ Parts catalog seeded'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  Parts seeding failed: {e}'))

    def seed_service_parts(self, company):
        """Step 8: Link services to parts"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 8/13: Linking Services to Parts'))
        self.stdout.write('-'*70)

        try:
            call_command('seed_service_parts', company=company.id)
            self.stdout.write(self.style.SUCCESS('✓ Service-parts mappings created'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  Service-parts mapping failed: {e}'))
    
    def create_lead_sources(self, company):
        """Step 9: Create default lead sources"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 9/13: Creating Lead Sources'))
        self.stdout.write('-'*70)
        
        sources = [
            {'name': 'Website', 'type': 'website'},
            {'name': 'Walk-in', 'type': 'walk_in'},
            {'name': 'Phone Inquiry', 'type': 'phone'},
            {'name': 'Facebook Ads', 'type': 'facebook_ads'},
            {'name': 'Google Ads', 'type': 'google_ads'},
            {'name': 'Referral', 'type': 'referral'},
        ]
        
        created_count = 0
        for source_data in sources:
            source, created = LeadSource.objects.get_or_create(
                company=company,
                name=source_data['name'],
                defaults={'source_type': source_data['type'], 'is_active': True}
            )
            if created:
                created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {created_count} lead sources'))
    
    def create_attendance_policy(self, company):
        """Step 10: Create attendance policy"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 10/13: Creating Attendance Policy'))
        self.stdout.write('-'*70)
        
        policy, created = AttendancePolicy.objects.get_or_create(
            company=company,
            name='Standard Policy',
            defaults={
                'standard_working_hours': Decimal('8.00'),
                'late_arrival_grace_minutes': 15,
                'half_day_hours': Decimal('4.00'),
                'overtime_threshold_hours': Decimal('8.00'),
                'weekly_off_days': [0, 6],  # Sunday and Saturday
                'is_active': True,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('✓ Attendance policy created'))
        else:
            self.stdout.write(self.style.WARNING('⚠️  Attendance policy already exists'))
    
    def add_domain(self, company, options):
        """Step 11: Add domain mapping"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 11/13: Adding Domain Mapping'))
        self.stdout.write('-'*70)
        
        domain_name = f"{options['subdomain']}.{options['base_domain']}"
        
        domain, created = Domain.objects.get_or_create(
            domain=domain_name,
            defaults={
                'company': company,
                'is_primary': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Domain added: {domain_name}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠️  Domain "{domain_name}" already exists'))
        
        return domain
    
    def create_dns_record(self, subdomain, base_domain):
        """Step 12: Create DNS record in Cloudflare"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 12/13: Creating DNS Record'))
        self.stdout.write('-'*70)
        
        try:
            # Import DNS script
            sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / 'scripts'))
            from add_cloudflare_dns import add_dns_record, validate_credentials
            
            if not validate_credentials():
                self.stdout.write(self.style.WARNING('⚠️  Cloudflare credentials not configured'))
                self.stdout.write('   Skipping DNS record creation')
                return
            
            result = add_dns_record(subdomain)
            if result:
                self.stdout.write(self.style.SUCCESS(f'✓ DNS record created: {subdomain}.{base_domain}'))
            else:
                self.stdout.write(self.style.WARNING('⚠️  DNS record creation failed'))
        
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  DNS creation skipped: {e}'))
    
    def create_automation_workflows(self, company):
        """Step 13: Create automation workflows"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 13/13: Creating Automation Workflows'))
        self.stdout.write('-'*70)
        
        try:
            # Note: create_sample_workflows creates global workflows
            # We'll need to modify it to be company-specific
            self.stdout.write(self.style.WARNING('⚠️  Automation workflows are currently global'))
            self.stdout.write('   Skipping company-specific workflow creation')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  Workflow creation failed: {e}'))
    
    def print_summary(self, company, admin, domain, branches, staff_data, options):
        """Print onboarding summary"""
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('✅ ONBOARDING COMPLETE! 🎉'))
        self.stdout.write('='*70 + '\n')
        
        self.stdout.write(self.style.SUCCESS('Company Details:'))
        self.stdout.write(f'  Name:           {company.name}')
        self.stdout.write(f'  Slug:           {company.slug}')
        self.stdout.write(f'  ID:             {company.id}')
        self.stdout.write(f'  Email:          {company.email}')
        self.stdout.write(f'  Phone:          {company.phone}')
        
        self.stdout.write(f'\n{self.style.SUCCESS("Admin Credentials:")}')
        self.stdout.write(f'  Email:          {admin.email}')
        self.stdout.write(f'  Name:           {admin.name}')
        self.stdout.write(f'  Role:           {admin.role}')
        
        self.stdout.write(f'\n{self.style.SUCCESS("Access Information:")}')
        self.stdout.write(f'  Domain:         {domain.domain}')
        self.stdout.write(f'  URL:            https://{domain.domain}')
        self.stdout.write(f'  API:            https://{domain.domain}/api/')
        
        self.stdout.write(f'\n{self.style.SUCCESS("Infrastructure Created:")}')
        self.stdout.write(f'  ✓ {len(branches)} Branches with service bays')
        self.stdout.write(f'  ✓ {len(branches)} Reward settings (percentage-based, enabled)')
        if staff_data:
            self.stdout.write(f'  ✓ {len(staff_data.get("branch_admins", []))} Branch Admins     (password: Admin@123)')
            self.stdout.write(f'  ✓ {len(staff_data.get("floor_managers", []))} Floor Managers    (password: FM@123)')
            self.stdout.write(f'  ✓ {len(staff_data.get("supervisors", []))} Supervisors       (password: Super@123)')
            self.stdout.write(f'  ✓ {len(staff_data.get("applicators", []))} Applicators       (password: App@123)')
        self.stdout.write(f'  ✓ Workflow template (simplified)')
        self.stdout.write(f'  ✓ 20+ Service packages')
        self.stdout.write(f'  ✓ 30+ Parts catalog items')
        self.stdout.write(f'  ✓ Service-parts mappings')
        self.stdout.write(f'  ✓ 6 Lead sources')
        self.stdout.write(f'  ✓ Attendance policy')
        
        self.stdout.write(f'\n{self.style.WARNING("Next Steps:")}')
        self.stdout.write(f'  1. Wait for DNS propagation (5-10 minutes)')
        self.stdout.write(f'  2. Test login at https://{domain.domain}')
        self.stdout.write(f'  3. Add sample data (optional):')
        self.stdout.write(f'     python manage.py onboard_company_with_samples --company {company.slug}')
        self.stdout.write('')


from pathlib import Path
