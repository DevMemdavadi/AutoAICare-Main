from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
import random

from companies.models import Company, Domain
from branches.models import Branch
from services.models import ServicePackage, AddOn
from jobcards.parts_catalog import Part

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds multi-tenant data with companies, domains, roles, services and parts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding'
        )

    def handle(self, *args, **kwargs):
        if kwargs.get('clear'):
            self.stdout.write('Clearing existing data...')
            self.clear_all_data()

        # 1. Create Global Super Admin (Platform Level)
        self.stdout.write('Creating Global Super Admin...')
        self.create_global_admin()

        # 2. Define Companies to seed
        companies_to_seed = [
            {
                'name': 'DetailEase Pro',
                'slug': 'pro',
                'subdomain': 'pro',
                'branches': ['North Branch', 'South Branch']
            },
            {
                'name': 'Elite Car Detailing',
                'slug': 'elite',
                'subdomain': 'elite',
                'branches': ['Main Studio', 'Express Point']
            }
        ]

        for company_data in companies_to_seed:
            self.stdout.write(f"\n🏢 Seeding Company: {company_data['name']}")
            
            # Create Company
            company = Company.objects.create(
                name=company_data['name'],
                slug=company_data['slug'],
                email=f"info@{company_data['slug']}.com",
                is_active=True
            )

            # Create Domain for local testing
            Domain.objects.create(
                company=company,
                domain=f"{company_data['subdomain']}.localhost:8000",
                is_primary=True
            )

            # Create Company Super Admin
            self.stdout.write(f"  Creating Company Super Admin...")
            company_admin = User.objects.create_user(
                email=f"admin@{company_data['slug']}.com",
                name=f"{company_data['name']} Admin",
                password='SecurePass@123',
                role='company_admin',
                company=company,
                is_staff=True,
                is_superuser=False, # restricted to company
                is_verified=True
            )

            # Create Branches and Staff
            for b_name in company_data['branches']:
                self.stdout.write(f"  🏢 Creating Branch: {b_name}...")
                branch = Branch.objects.create(
                    company=company,
                    name=b_name,
                    code=f"{company_data['slug'].upper()}-{b_name[:2].upper()}",
                    city="Mumbai",
                    is_active=True
                )

                # Create Branch Admin
                User.objects.create_user(
                    email=f"branch_admin_{branch.code.lower()}@test.com",
                    name=f"{b_name} Admin",
                    password='Test@123',
                    role='branch_admin',
                    company=company,
                    branch=branch,
                    is_staff=True,
                    is_verified=True
                )

                # Create Floor Manager
                User.objects.create_user(
                    email=f"fm_{branch.code.lower()}@test.com",
                    name=f"{b_name} Floor Manager",
                    password='Test@123',
                    role='floor_manager',
                    company=company,
                    branch=branch,
                    is_staff=True,
                    is_verified=True
                )

                # Create Supervisor
                User.objects.create_user(
                    email=f"sup_{branch.code.lower()}@test.com",
                    name=f"{b_name} Supervisor",
                    password='Test@123',
                    role='supervisor',
                    company=company,
                    branch=branch,
                    is_verified=True
                )

                # Create Applicators (2)
                for i in range(1, 3):
                    User.objects.create_user(
                        email=f"app{i}_{branch.code.lower()}@test.com",
                        name=f"{b_name} Applicator {i}",
                        password='Test@123',
                        role='applicator',
                        company=company,
                        branch=branch,
                        is_verified=True
                    )

            # Seed Services
            self.stdout.write(f"  🛠️ Seeding Services...")
            self.seed_services(company)

            # Seed Parts
            self.stdout.write(f"  ⚙️ Seeding Parts...")
            self.seed_parts(company)

        self.stdout.write(self.style.SUCCESS('\n✅ Multi-tenant seed completed successfully!'))

    def create_global_admin(self):
        email = 'superadmin@detailease.com'
        if not User.objects.filter(email=email).exists():
            User.objects.create_superuser(
                email=email,
                name='Global Super Admin',
                password='SuperAdmin@123',
                company=None # Platform level
            )

    def seed_services(self, company):
        services = [
            {'name': 'Full Body Wash', 'hatchback_price': 500, 'sedan_price': 700, 'suv_price': 900, 'category': 'wash'},
            {'name': 'Interior Detailing', 'hatchback_price': 2000, 'sedan_price': 2500, 'suv_price': 3500, 'category': 'interior'},
            {'name': 'Ceramic Coating', 'hatchback_price': 15000, 'sedan_price': 18000, 'suv_price': 25000, 'category': 'coating'},
            {'name': 'Basic Polish', 'hatchback_price': 3000, 'sedan_price': 4000, 'suv_price': 5000, 'category': 'exterior'},
        ]
        
        for s in services:
            ServicePackage.objects.create(
                company=company,
                name=s['name'],
                description=f"Premium {s['name']} service for your car.",
                category=s['category'],
                hatchback_price=s['hatchback_price'],
                sedan_price=s['sedan_price'],
                suv_price=s['suv_price'],
                price=s['sedan_price'],
                duration=random.choice([60, 120, 240]),
                is_active=True
            )

        addons = [
            {'name': 'Engine Cleaning', 'price': 500},
            {'name': 'Ac Sanitization', 'price': 800},
            {'name': 'Rain Repellent', 'price': 400},
        ]
        for a in addons:
            AddOn.objects.create(
                company=company,
                name=a['name'],
                price=a['price'],
                duration=30,
                is_active=True
            )

    def seed_parts(self, company):
        parts_data = [
            {'name': 'Ceramic Coating Bottle', 'sku': f'CER-{company.slug.upper()}', 'price': 2500, 'cat': 'chemical'},
            {'name': 'Microfiber Cloth', 'sku': f'MF-{company.slug.upper()}', 'price': 150, 'cat': 'consumable'},
            {'name': 'Car Shampoo 5L', 'sku': f'SHM-{company.slug.upper()}', 'price': 1200, 'cat': 'chemical'},
            {'name': 'Polishing Pad', 'sku': f'PAD-{company.slug.upper()}', 'price': 450, 'cat': 'consumable'},
        ]
        for p in parts_data:
            Part.objects.create(
                company=company,
                name=p['name'],
                sku=p['sku'],
                category=p['cat'],
                cost_price=Decimal(str(p['price'] * 0.7)),
                selling_price=Decimal(str(p['price'])),
                stock=random.randint(50, 200),
                unit='pieces',
                is_active=True
            )

    def clear_all_data(self):
        Part.objects.all().delete()
        AddOn.objects.all().delete()
        ServicePackage.objects.all().delete()
        User.objects.all().delete()
        Branch.objects.all().delete()
        Domain.objects.all().delete()
        Company.objects.all().delete()
