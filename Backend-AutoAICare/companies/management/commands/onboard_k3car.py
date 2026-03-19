"""
K3 Car Care - Complete Company Onboarding
Uses real company data from setup_complete_system.py

This command creates the K3 Car Care company with:
- Company details
- 4 Real branches (Shree Ramnagar, Chandpur, Tarna, Painting Studio)
- All staff (Branch Admins, Floor Managers, Supervisors, Applicators)
- All K3 services (20+ packages)
- Sample customers and bookings

Usage:
    python manage.py onboard_k3car
    
    # With custom admin password
    python manage.py onboard_k3car --admin-password "SecurePass@123"
    
    # Skip DNS creation
    python manage.py onboard_k3car --skip-dns
    
    # Skip sample data
    python manage.py onboard_k3car --skip-samples
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import random

from companies.models import Company, CompanySettings, Domain
from branches.models import Branch, ServiceBay
from users.models import User
from services.models import ServicePackage, AddOn
from leads.models import LeadSource
from attendance.models import AttendancePolicy


class Command(BaseCommand):
    help = 'Onboard K3 Car Care with real company data'
    
    def add_arguments(self, parser):
        parser.add_argument('--admin-password', type=str, default='admin123', help='Super admin password')
        parser.add_argument('--skip-dns', action='store_true', help='Skip DNS record creation')
        parser.add_argument('--skip-samples', action='store_true', help='Skip sample customers and bookings')
        parser.add_argument('--subdomain', type=str, default='k3car', help='Subdomain for K3 Car Care')
    
    def handle(self, *args, **options):
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('🚀 K3 CAR CARE - COMPLETE ONBOARDING'))
        self.stdout.write('='*70 + '\n')
        
        try:
            with transaction.atomic():
                # Step 1: Create Company
                company = self.create_company()
                
                # Step 2: Create Company Admin
                company_admin = self.create_company_admin(company, options['admin_password'])
                
                # Step 3: Create Real K3 Branches
                branches = self.create_k3_branches(company)
                
                # Step 4: Create Staff for All Branches
                staff_data = self.create_staff_for_branches(company, branches)
                
                # Step 5: Create K3 Services
                packages, addons = self.create_k3_services(company)
                
                # Step 6: Create Lead Sources
                self.create_lead_sources(company)
                
                # Step 7: Create Attendance Policy
                self.create_attendance_policy(company)
                
                # Step 8: Create Workflow
                self.create_workflow(company)
                
                # Step 9: Add Domain
                domain = self.add_domain(company, options['subdomain'])
                
                # Step 10: Create DNS Record
                if not options['skip_dns']:
                    self.create_dns_record(options['subdomain'])
            
            # Step 11: Create Sample Data (outside transaction for flexibility)
            if not options['skip_samples']:
                self.create_sample_data(company, branches, packages, addons, staff_data)
            
            # Print Summary
            self.print_summary(company, company_admin, branches, staff_data, packages, addons, domain, options)
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Onboarding failed: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())
            raise
    
    def create_company(self):
        """Step 1: Create K3 Car Care company"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 1/11: Creating K3 Car Care Company'))
        self.stdout.write('-'*70)
        
        company, created = Company.objects.get_or_create(
            slug='k3-car-care',
            defaults={
                'name': 'K3 Car Care',
                'display_name': 'K3 Car Care',
                'email': 'info@k3carcare.com',
                'phone': '+91 79 4001 5000',
                'address_line1': 'Auto Hub, Industrial Area',
                'city': 'Ahmedabad',
                'state': 'Gujarat',
                'pincode': '380001',
                'is_active': True
            }
        )
        
        if created:
            CompanySettings.objects.create(company=company)
            self.stdout.write(self.style.SUCCESS(f'✓ Company created: {company.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠️  Company already exists: {company.name}'))
        
        return company
    
    def create_company_admin(self, company, password):
        """Step 2: Create Company Admin"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 2/11: Creating Company Admin'))
        self.stdout.write('-'*70)
        
        admin, created = User.objects.get_or_create(
            email='admin@k3carcare.com',
            defaults={
                'name': 'K3 Admin',
                'role': 'company_admin',
                'phone': '+91 90000 00000',
                'company': company,
                'is_verified': True,
                'is_active': True,
                'is_staff': True,
            }
        )
        
        if created:
            admin.set_password(password)
            admin.save()
            self.stdout.write(self.style.SUCCESS(f'✓ Company Admin created: {admin.email}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠️  Company Admin already exists: {admin.email}'))
        
        return admin
    
    def create_k3_branches(self, company):
        """Step 3: Create real K3 branches"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 3/11: Creating K3 Real Branches'))
        self.stdout.write('-'*70)
        
        branches_data = [
            {
                'name': 'K3 Car Care - Shree Ramnagar',
                'code': 'K3RAM',
                'address': 'Shree Ramnagar Area, Main Road',
                'city': 'Ahmedabad',
                'state': 'Gujarat',
                'pincode': '380001',
                'phone': '+91 79 4001 5000',
                'email': 'ramnagar@k3carcare.com',
                'manager_name': 'Rajesh Patel',
                'manager_phone': '+91 98250 12345',
            },
            {
                'name': 'K3 Car Care - Chandpur',
                'code': 'K3CDP',
                'address': 'Chandpur Main Road, Near Circle',
                'city': 'Ahmedabad',
                'state': 'Gujarat',
                'pincode': '380002',
                'phone': '+91 79 4001 6000',
                'email': 'chandpur@k3carcare.com',
                'manager_name': 'Kiran Shah',
                'manager_phone': '+91 98251 12345',
            },
            {
                'name': 'K3 Car Care - Tarna',
                'code': 'K3TRN',
                'address': 'Tarna Road, Commercial Complex',
                'city': 'Ahmedabad',
                'state': 'Gujarat',
                'pincode': '380003',
                'phone': '+91 79 4001 7000',
                'email': 'tarna@k3carcare.com',
                'manager_name': 'Mehul Desai',
                'manager_phone': '+91 98252 12345',
            },
            {
                'name': 'K3 Car Care - Painting Studio',
                'code': 'K3PNT',
                'address': 'Auto Hub, Industrial Area',
                'city': 'Ahmedabad',
                'state': 'Gujarat',
                'pincode': '380004',
                'phone': '+91 79 4001 8000',
                'email': 'painting@k3carcare.com',
                'manager_name': 'Vishal Sharma',
                'manager_phone': '+91 98253 12345',
            }
        ]
        
        branches = []
        for data in branches_data:
            branch, created = Branch.objects.get_or_create(
                company=company,
                code=data['code'],
                defaults={**data, 'is_active': True}
            )
            
            if created:
                # Create 3-4 service bays per branch
                num_bays = 4 if 'Painting' in branch.name else 3
                for bay_num in range(1, num_bays + 1):
                    ServiceBay.objects.create(
                        branch=branch,
                        company=company,
                        name=f'Bay {bay_num}',
                        bay_type='detailing',
                        is_active=True
                    )
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {branch.name} with {num_bays} bays'))
            else:
                self.stdout.write(self.style.WARNING(f'⚠️  Branch already exists: {branch.name}'))
            
            branches.append(branch)
        
        return branches
    
    def create_staff_for_branches(self, company, branches):
        """Step 4: Create all staff roles for each branch"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 4/11: Creating Staff for All Branches'))
        self.stdout.write('-'*70)
        
        staff_data = {
            'branch_admins': [],
            'floor_managers': [],
            'supervisors': [],
            'applicators': [],
        }
        
        # Real staff names from setup_complete_system.py
        branch_configs = [
            {
                'short': 'ram',
                'admin': 'Prashant Kumar',
                'fm': 'Rohit Mehta',
                'supervisors': ['Vikram Singh', 'Sunil Joshi'],
                'applicators': ['Raj Kumar', 'Amit Patel', 'Suresh Sharma']
            },
            {
                'short': 'cdp',
                'admin': 'Nitin Sharma',
                'fm': 'Amit Desai',
                'supervisors': ['Deepak Yadav', 'Ravi Kumar'],
                'applicators': ['Vijay Rana', 'Dinesh Verma', 'Ramesh Gupta']
            },
            {
                'short': 'trn',
                'admin': 'Vishal Patel',
                'fm': 'Akash Trivedi',
                'supervisors': ['Manoj Gupta', 'Sachin Patel'],
                'applicators': ['Prakash Joshi', 'Ashok Yadav', 'Mukesh Thakur']
            },
            {
                'short': 'pnt',
                'admin': 'Arun Mehta',
                'fm': 'Karan Shah',
                'supervisors': ['Harish Verma', 'Naveen Sharma'],
                'applicators': ['Sanjay Singh', 'Anil Kumar', 'Bharat Yadav']
            }
        ]
        
        for i, (branch, config) in enumerate(zip(branches, branch_configs)):
            # Branch Admin
            admin, created = User.objects.get_or_create(
                email=f'admin.{config["short"]}@k3carcare.com',
                defaults={
                    'name': config['admin'],
                    'role': 'branch_admin',
                    'phone': f'+91 91010 0000{i}',
                    'company': company,
                    'branch': branch,
                    'is_verified': True,
                    'is_active': True,
                    'is_staff': True,
                }
            )
            if created:
                admin.set_password('admin123')
                admin.save()
            staff_data['branch_admins'].append(admin)
            self.stdout.write(f'  ✓ Branch Admin: {admin.name} - {branch.name}')
            
            # Floor Manager
            fm, created = User.objects.get_or_create(
                email=f'fm.{config["short"]}@k3carcare.com',
                defaults={
                    'name': config['fm'],
                    'role': 'floor_manager',
                    'phone': f'+91 91030 0000{i}',
                    'company': company,
                    'branch': branch,
                    'is_verified': True,
                    'is_active': True,
                    'is_staff': True,
                }
            )
            if created:
                fm.set_password('fm123')
                fm.save()
            staff_data['floor_managers'].append(fm)
            self.stdout.write(f'  ✓ Floor Manager: {fm.name} - {branch.name}')
            
            # Supervisors
            for j, name in enumerate(config['supervisors']):
                supervisor, created = User.objects.get_or_create(
                    email=f'supervisor{j+1}.{config["short"]}@k3carcare.com',
                    defaults={
                        'name': name,
                        'role': 'supervisor',
                        'phone': f'+91 91040 000{i}{j}',
                        'company': company,
                        'branch': branch,
                        'is_verified': True,
                        'is_active': True,
                    }
                )
                if created:
                    supervisor.set_password('super123')
                    supervisor.save()
                staff_data['supervisors'].append(supervisor)
                self.stdout.write(f'  ✓ Supervisor: {supervisor.name} - {branch.name}')
            
            # Applicators
            for j, name in enumerate(config['applicators']):
                applicator, created = User.objects.get_or_create(
                    email=f'applicator{j+1}.{config["short"]}@k3carcare.com',
                    defaults={
                        'name': name,
                        'role': 'applicator',
                        'phone': f'+91 91050 000{i}{j}',
                        'company': company,
                        'branch': branch,
                        'is_verified': True,
                        'is_active': True,
                    }
                )
                if created:
                    applicator.set_password('app123')
                    applicator.save()
                staff_data['applicators'].append(applicator)
                self.stdout.write(f'  ✓ Applicator: {applicator.name} - {branch.name}')
        
        total_staff = sum(len(v) for v in staff_data.values())
        self.stdout.write(self.style.SUCCESS(f'\n  Total staff created: {total_staff}'))
        return staff_data
    
    def create_k3_services(self, company):
        """Step 5: Create K3 service packages (truncated for brevity - use seed_services command)"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 5/11: Creating K3 Services'))
        self.stdout.write('-'*70)
        
        # Use existing seed commands
        from django.core.management import call_command
        try:
            call_command('seed_services', company=company.id)
            call_command('seed_parts', company=company.id)
            call_command('seed_service_parts', company=company.id)
            
            packages = list(ServicePackage.objects.filter(company=company))
            addons = list(AddOn.objects.filter(company=company))
            
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(packages)} packages and {len(addons)} add-ons'))
            return packages, addons
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  Service seeding failed: {e}'))
            return [], []
    
    def create_lead_sources(self, company):
        """Step 6: Create lead sources"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 6/11: Creating Lead Sources'))
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
        """Step 7: Create attendance policy"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 7/11: Creating Attendance Policy'))
        self.stdout.write('-'*70)
        
        policy, created = AttendancePolicy.objects.get_or_create(
            company=company,
            name='K3 Standard Policy',
            defaults={
                'standard_working_hours': Decimal('8.00'),
                'late_arrival_grace_minutes': 15,
                'half_day_hours': Decimal('4.00'),
                'overtime_threshold_hours': Decimal('8.00'),
                'weekly_off_days': [0],  # Sunday
                'is_active': True,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('✓ Attendance policy created'))
        else:
            self.stdout.write(self.style.WARNING('⚠️  Attendance policy already exists'))
    
    def create_workflow(self, company):
        """Step 8: Create workflow template"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 8/11: Creating Workflow Template'))
        self.stdout.write('-'*70)
        
        from django.core.management import call_command
        try:
            call_command('create_simplified_workflow', company=company.slug, set_default=True)
            self.stdout.write(self.style.SUCCESS('✓ Workflow template created'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  Workflow creation failed: {e}'))
    
    def add_domain(self, company, subdomain):
        """Step 9: Add domain mapping"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 9/11: Adding Domain Mapping'))
        self.stdout.write('-'*70)
        
        domain_name = f"{subdomain}.autoaicare.com"
        
        domain, created = Domain.objects.get_or_create(
            domain=domain_name,
            defaults={'company': company, 'is_primary': True}
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Domain added: {domain_name}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠️  Domain already exists: {domain_name}'))
        
        return domain
    
    def create_dns_record(self, subdomain):
        """Step 10: Create DNS record in Cloudflare"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 10/11: Creating DNS Record'))
        self.stdout.write('-'*70)
        
        try:
            import sys
            from pathlib import Path
            sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / 'scripts'))
            from add_cloudflare_dns import add_dns_record, validate_credentials
            
            if not validate_credentials():
                self.stdout.write(self.style.WARNING('⚠️  Cloudflare credentials not configured'))
                return
            
            result = add_dns_record(subdomain)
            if result:
                self.stdout.write(self.style.SUCCESS(f'✓ DNS record created: {subdomain}.autoaicare.com'))
            else:
                self.stdout.write(self.style.WARNING('⚠️  DNS record creation failed'))
        
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  DNS creation skipped: {e}'))
    
    def create_sample_data(self, company, branches, packages, addons, staff_data):
        """Step 11: Create sample customers and bookings"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 11/11: Creating Sample Data'))
        self.stdout.write('-'*70)
        
        from django.core.management import call_command
        try:
            call_command('onboard_company_with_samples', company=company.slug, full=True)
            self.stdout.write(self.style.SUCCESS('✓ Sample data created'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'⚠️  Sample data creation failed: {e}'))
    
    def print_summary(self, company, company_admin, branches, staff_data, packages, addons, domain, options):
        """Print onboarding summary"""
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('✅ K3 CAR CARE ONBOARDING COMPLETE! 🎉'))
        self.stdout.write('='*70 + '\n')
        
        self.stdout.write(self.style.SUCCESS('Company Details:'))
        self.stdout.write(f'  Name:           {company.name}')
        self.stdout.write(f'  Slug:           {company.slug}')
        self.stdout.write(f'  Email:          {company.email}')
        self.stdout.write(f'  Phone:          {company.phone}')
        self.stdout.write(f'  Location:       {company.city}, {company.state}')
        
        self.stdout.write(f'\n{self.style.SUCCESS("Company Admin Credentials:")}')
        self.stdout.write(f'  Email:          {company_admin.email}')
        self.stdout.write(f'  Password:       {options["admin_password"]}')
        self.stdout.write(f'  Role:           company_admin')
        
        self.stdout.write(f'\n{self.style.SUCCESS("Branches Created:")}')
        for branch in branches:
            self.stdout.write(f'  ✓ {branch.name} ({branch.code})')
            self.stdout.write(f'    Manager: {branch.manager_name}')
            self.stdout.write(f'    Email: {branch.email}')
        
        self.stdout.write(f'\n{self.style.SUCCESS("Staff Summary:")}')
        self.stdout.write(f'  ✓ {len(staff_data["branch_admins"])} Branch Admins (1 per branch)')
        self.stdout.write(f'  ✓ {len(staff_data["floor_managers"])} Floor Managers (1 per branch)')
        self.stdout.write(f'  ✓ {len(staff_data["supervisors"])} Supervisors (2 per branch)')
        self.stdout.write(f'  ✓ {len(staff_data["applicators"])} Applicators (3 per branch)')
        
        self.stdout.write(f'\n{self.style.SUCCESS("Access Information:")}')
        self.stdout.write(f'  Domain:         {domain.domain}')
        self.stdout.write(f'  URL:            https://{domain.domain}')
        self.stdout.write(f'  API:            https://{domain.domain}/api/')
        
        self.stdout.write(f'\n{self.style.WARNING("Sample Login Credentials:")}')
        self.stdout.write(f'  Company Admin:  admin@k3carcare.com / {options["admin_password"]}')
        self.stdout.write(f'  Branch Admin:   admin.ram@k3carcare.com / admin123')
        self.stdout.write(f'  Floor Manager:  fm.ram@k3carcare.com / fm123')
        self.stdout.write(f'  Supervisor:     supervisor1.ram@k3carcare.com / super123')
        self.stdout.write(f'  Applicator:     applicator1.ram@k3carcare.com / app123')
        
        self.stdout.write('')
