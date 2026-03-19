"""
Simplified management command to populate basic test data for a company.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import random

from companies.models import Company
from branches.models import Branch
from users.models import User
from customers.models import Customer, Vehicle
from services.models import ServicePackage
from memberships.models import MembershipPlan
from leads.models import Lead, LeadSource
from accounting.models import Vendor
from store.models import Product


class Command(BaseCommand):
    help = 'Populate basic test data for a company'

    def add_arguments(self, parser):
        parser.add_argument('--company', type=str, required=True, help='Company slug or ID')

    def handle(self, *args, **options):
        company_identifier = options['company']
        
        print("\n" + "="*60)
        print("🔄 POPULATING COMPANY TEST DATA")
        print("="*60 + "\n")
        
        # Get company
        try:
            if company_identifier.isdigit():
                company = Company.objects.get(id=int(company_identifier))
            else:
                company = Company.objects.get(slug=company_identifier)
        except Company.DoesNotExist:
            print(f'❌ Company "{company_identifier}" not found')
            return
        
        print(f'✓ Found company: {company.name} (ID: {company.id})')
        
        # Create branch
        print("\n📍 Creating branch...")
        branch = Branch.objects.filter(company=company, name='Main Branch').first()
        if not branch:
            branch = Branch.objects.create(
                company=company,
                code='MAIN',
                name='Main Branch',
                address='123 Test Street',
                city='Mumbai',
                state='Maharashtra',
                pincode='400001',
                phone='022-12345678',
                email=f'main@{company.slug}.com',
            )
            print(f"  ✓ Created branch: {branch.name}")
        else:
            print(f"  ⚠️  Branch already exists: {branch.name}")
        
        # Create services
        print("\n🚗 Creating services...")
        services_created = 0
        service_templates = [
            ("Basic Wash", "SVC001", 500, 700, 1000),
            ("Premium Wash", "SVC002", 800, 1200, 1500),
            ("Interior Detail", "SVC003", 1500, 2000, 2500),
        ]
        for name, code, h_price, s_price, suv_price in service_templates:
            service, created = ServicePackage.objects.get_or_create(
                company=company,
                service_code=code,
                defaults={
                    'name': name,
                    'category': 'wash',
                    'description': f'{name} service',
                    'hatchback_price': Decimal(str(h_price)),
                    'sedan_price': Decimal(str(s_price)),
                    'suv_price': Decimal(str(suv_price)),
                    'duration_minutes': 60,
                    'is_active': True,
                }
            )
            if created:
                services_created += 1
        print(f"  ✓ Created {services_created} services")
        
        # Create membership plans
        print("\n💎 Creating membership plans...")
        plans_created = 0
        plan_templates = [
            ("Silver Plan", "silver", 5000),
            ("Gold Plan", "gold", 10000),
        ]
        for plan_name, tier, price in plan_templates:
            plan, created = MembershipPlan.objects.get_or_create(
                company=company,
                name=plan_name,
                defaults={
                    'tier': tier,
                    'sedan_price': Decimal(str(price)),
                    'hatchback_price': Decimal(str(price - 1000)),
                    'suv_price': Decimal(str(price + 2000)),
                    'duration_value': 12,
                    'duration_unit': 'months',
                    'free_washes_count': price // 1000,
                    'is_active': True,
                }
            )
            if created:
                plans_created += 1
        print(f"  ✓ Created {plans_created} plans")
        
        # Create customers
        print("\n👤 Creating customers...")
        customers_created = 0
        for i in range(3):
            email = f"customer{i+1}@test.com"
            user, user_created = User.objects.get_or_create(
                email=email,
                defaults={
                    'name': f'Test Customer {i+1}',
                    'phone': f'98765{i:05d}',
                    'role': 'customer',
                    'company': company,
                }
            )
            if user_created:
                user.set_password('Test@123')
                user.save()
                customer, _ = Customer.objects.get_or_create(
                    company=company,
                    user=user,
                )
                # Create vehicle
                Vehicle.objects.get_or_create(
                    company=company,
                    registration_number=f'MH01AB{1000+i}',
                    defaults={
                        'customer': customer,
                        'make': 'Maruti',
                        'model': 'Swift',
                        'year': 2020,
                        'vehicle_type': 'hatchback',
                    }
                )
                customers_created += 1
        print(f"  ✓ Created {customers_created} customers with vehicles")
        
        # Create lead source and leads
        print("\n📞 Creating leads...")
        source, _ = LeadSource.objects.get_or_create(
            company=company,
            name='Website',
            defaults={'source_type': 'website'}
        )
        leads_created = 0
        for i in range(2):
            lead, created = Lead.objects.get_or_create(
                company=company,
                phone=f'97{random.randint(10000000, 99999999)}',
                defaults={
                    'name': f'Lead {i+1}',
                    'email': f'lead{i+1}@test.com',
                    'source': source,
                    'status': 'new',
                }
            )
            if created:
                leads_created += 1
        print(f"  ✓ Created {leads_created} leads")
        
        # Create vendors
        print("\n🏪 Creating vendors...")
        vendors_created = 0
        for i in range(2):
            vendor, created = Vendor.objects.get_or_create(
                company=company,
                name=f'Vendor {i+1}',
                defaults={
                    'email': f'vendor{i+1}@test.com',
                    'phone': f'022{random.randint(10000000, 99999999)}',
                }
            )
            if created:
                vendors_created += 1
        print(f"  ✓ Created {vendors_created} vendors")
        
        # Create products
        print("\n🛍️ Creating products...")
        products_created = 0
        for i in range(3):
            product, created = Product.objects.get_or_create(
                company=company,
                name=f'Product {i+1}',
                defaults={
                    'description': f'Test product {i+1}',
                    'price': Decimal(str(100 + i * 50)),
                    'stock': 10,
                }
            )
            if created:
                products_created += 1
        print(f"  ✓ Created {products_created} products")
        
        # Summary
        print("\n" + "="*60)
        print("✅ DATA POPULATION COMPLETE!")
        print("="*60)
        print(f"\n📊 Summary for {company.name}:")
        print(f"   - Branches: {Branch.objects.filter(company=company).count()}")
        print(f"   - Services: {ServicePackage.objects.filter(company=company).count()}")
        print(f"   - Membership Plans: {MembershipPlan.objects.filter(company=company).count()}")
        print(f"   - Customers: {Customer.objects.filter(company=company).count()}")
        print(f"   - Vehicles: {Vehicle.objects.filter(company=company).count()}")
        print(f"   - Leads: {Lead.objects.filter(company=company).count()}")
        print(f"   - Vendors: {Vendor.objects.filter(company=company).count()}")
        print(f"   - Products: {Product.objects.filter(company=company).count()}")
        print("")
