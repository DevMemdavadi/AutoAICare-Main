"""
Management command to populate test data for a company.
This creates sample data across all models to test multi-tenancy.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta, datetime
import random

from companies.models import Company
from branches.models import Branch, ServiceBay
from users.models import User
from customers.models import Customer, Vehicle
from services.models import ServicePackage, AddOn
from bookings.models import Booking
from jobcards.models import JobCard
from billing.models import Invoice, InvoiceItem
from payments.models import Payment
from memberships.models import MembershipPlan, MembershipBenefit
from leads.models import Lead, LeadSource
from accounting.models import Vendor, Expense
from store.models import Product
from attendance.models import AttendanceRecord, AttendancePolicy


class Command(BaseCommand):
    help = 'Populate test data for a company to verify multi-tenancy'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company',
            type=str,
            required=True,
            help='Company slug or ID to populate data for'
        )
        parser.add_argument(
            '--full',
            action='store_true',
            help='Create comprehensive test data (more records)'
        )

    def handle(self, *args, **options):
        company_identifier = options['company']
        is_full = options.get('full', False)
        
        self.stdout.write("\n" + "="*60)
        self.stdout.write("🔄 POPULATING COMPANY TEST DATA")
        self.stdout.write("="*60 + "\n")
        
        # Get company
        try:
            if company_identifier.isdigit():
                company = Company.objects.get(id=int(company_identifier))
            else:
                company = Company.objects.get(slug=company_identifier)
        except Company.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Company "{company_identifier}" not found'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'✓ Found company: {company.name} (ID: {company.id})'))
        self.company = company
        
        # Populate data sections
        self.stdout.write("\n" + "-"*60)
        self.create_branches(2 if is_full else 1)
        self.create_staff(5 if is_full else 2)
        self.create_services(10 if is_full else 5)
        self.create_membership_plans(3 if is_full else 2)
        self.create_customers(10 if is_full else 5)
        self.create_leads(5 if is_full else 3)
        self.create_vendors(5 if is_full else 3)
        self.create_products(8 if is_full else 4)
        self.create_attendance_policy()
        
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS('✅ DATA POPULATION COMPLETE!'))
        self.stdout.write("="*60)
        self.stdout.write(f"\n📊 Summary for {company.name}:")
        self.print_summary()
        self.stdout.write("")

    def create_branches(self, count):
        self.stdout.write(f"\n📍 Creating branches...")
        
        branch_data = [
            {"name": "Main Branch", "city": "Mumbai", "state": "Maharashtra", "code": "MB01"},
            {"name": "Andheri Branch", "city": "Mumbai", "state": "Maharashtra", "code": "AB01"},
            {"name": "Bandra Branch", "city": "Mumbai", "state": "Maharashtra", "code": "BB01"},
        ]
        
        created = 0
        for i in range(min(count, len(branch_data))):
            data = branch_data[i]
            branch, created_new = Branch.objects.get_or_create(
                company=self.company,
                code=data['code'],
                defaults={
                    'name': data['name'],
                    'address': f"{random.randint(1, 999)} MG Road",
                    'city': data['city'],
                    'state': data['state'],
                    'pincode': f"40000{i+1}",
                    'phone': f"022-{random.randint(10000000, 99999999)}",
                    'email': f"{data['name'].lower().replace(' ', '_')}@{self.company.slug}.com",
                    'is_active': True,
                }
            )
            if created_new:
                created += 1
                # Create service bays
                for bay_num in range(1, 4):
                    ServiceBay.objects.get_or_create(
                        branch=branch,
                        company=self.company,
                        name=f'Bay {bay_num}',
                        defaults={'is_active': True}
                    )
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {created} branches with service bays'))

    def create_staff(self, count):
        self.stdout.write(f"\n👥 Creating staff members...")
        
        roles = ['technician', 'supervisor', 'floor_manager', 'receptionist']
        branch = Branch.objects.filter(company=self.company).first()
        
        created = 0
        for i in range(count):
            role = roles[i % len(roles)]
            email = f"{role}{i+1}@{self.company.slug}.com"
            
            if not User.objects.filter(email=email).exists():
                User.objects.create_user(
                    email=email,
                    password='Test@123',
                    name=f"{role.title()} {i+1}",
                    phone=f"98765{random.randint(10000, 99999)}",
                    role=role,
                    company=self.company,
                    branch=branch,
                    is_active=True
                )
                created += 1
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {created} staff members'))

    def create_services(self, count):
        self.stdout.write(f"\n🚗 Creating services...")
        
        service_templates = [
            {"name": "Basic Wash", "category": "wash", "duration": 30},
            {"name": "Premium Wash", "category": "wash", "duration": 60},
            {"name": "Interior Detailing", "category": "detailing", "duration": 120},
            {"name": "Ceramic Coating", "category": "coating", "duration": 240},
            {"name": "Paint Protection", "category": "protection", "duration": 180},
            {"name": "Polishing", "category": "polish", "duration": 150},
            {"name": "Teflon Coating", "category": "coating", "duration": 120},
            {"name": "Engine Wash", "category": "wash", "duration": 45},
            {"name": "Headlight Restoration", "category": "restoration", "duration": 60},
            {"name": "Scratch Removal", "category": "repair", "duration": 90},
        ]
        
        created = 0
        for i, template in enumerate(service_templates[:count]):
            code = f"SVC{i+1:03d}"
            service, created_new = ServicePackage.objects.get_or_create(
                company=self.company,
                service_code=code,
                defaults={
                    'name': template['name'],
                    'category': template['category'],
                    'description': f"Professional {template['name'].lower()} service",
                    'hatchback_price': Decimal(str(500 + random.randint(0, 1000))),
                    'sedan_price': Decimal(str(700 + random.randint(0, 1500))),
                    'suv_price': Decimal(str(1000 + random.randint(0, 2000))),
                    'duration_minutes': template['duration'],
                    'is_active': True,
                    'is_global': True,
                }
            )
            if created_new:
                created += 1
                
                # Create add-ons
                AddOn.objects.get_or_create(
                    company=self.company,
                    name=f"Premium {template['name']} Add-on",
                    defaults={
                        'description': f"Enhanced version of {template['name']}",
                        'price': Decimal(str(200 + random.randint(0, 500))),
                        'is_active': True,
                    }
                )
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {created} services with add-ons'))

    def create_membership_plans(self, count):
        self.stdout.write(f"\n💎 Creating membership plans...")
        
        plans = [
            {"name": "Silver Plan", "tier": "silver", "price": 5000, "washes": 4},
            {"name": "Gold Plan", "tier": "gold", "price": 10000, "washes": 10},
            {"name": "Platinum Plan", "tier": "platinum", "price": 20000, "washes": 20},
        ]
        
        created = 0
        for plan_data in plans[:count]:
            plan, created_new = MembershipPlan.objects.get_or_create(
                company=self.company,
                name=plan_data['name'],
                defaults={
                    'tier': plan_data['tier'],
                    'description': f"{plan_data['name']} - Best value!",
                    'sedan_price': Decimal(str(plan_data['price'])),
                    'hatchback_price': Decimal(str(plan_data['price'] - 1000)),
                    'suv_price': Decimal(str(plan_data['price'] + 2000)),
                    'duration_value': 12,
                    'duration_unit': 'months',
                    'free_washes_count': plan_data['washes'],
                    'discount_percentage': Decimal('10.00'),
                    'is_active': True,
                }
            )
            if created_new:
                created += 1
                
                # Create benefits
                MembershipBenefit.objects.get_or_create(
                    company=self.company,
                    plan=plan,
                    benefit_type='discount',
                    defaults={
                        'title': '10% Discount on All Services',
                        'description': 'Get 10% off on every service',
                        'discount_percentage': Decimal('10.00'),
                    }
                )
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {created} membership plans'))

    def create_customers(self, count):
        self.stdout.write(f"\n👤 Creating customers with vehicles...")
        
        first_names = ["Rajesh", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Rahul", "Deepika", "Arjun", "Kavya"]
        last_names = ["Sharma", "Patel", "Kumar", "Singh", "Reddy", "Iyer", "Desai", "Shah", "Mehta", "Nair"]
        vehicle_brands = ["Maruti", "Hyundai", "Honda", "Toyota", "Ford"]
        vehicle_models = ["Swift", "i20", "City", "Innova", "EcoSport"]
        
        created_customers = 0
        created_vehicles = 0
        
        for i in range(count):
            name = f"{random.choice(first_names)} {random.choice(last_names)}"
            email = f"customer{i+1}@example.com"
            phone = f"98{random.randint(10000000, 99999999)}"
            
            # Create user
            user, user_created = User.objects.get_or_create(
                email=email,
                defaults={
                    'name': name,
                    'phone': phone,
                    'role': 'customer',
                    'company': self.company,
                    'is_active': True,
                }
            )
            if user_created:
                user.set_password('Test@123')
                user.save()
            
            # Create customer
            customer, cust_created = Customer.objects.get_or_create(
                company=self.company,
                user=user,
                defaults={
                    'loyalty_points': random.randint(0, 500),
                }
            )
            if cust_created:
                created_customers += 1
                
                # Create 1-2 vehicles per customer
                for v in range(random.randint(1, 2)):
                    reg_num = f"MH{random.randint(1,99):02d}{random.choice(['AB','CD','EF','GH'])}{random.randint(1000,9999)}"
                    
                    vehicle, veh_created = Vehicle.objects.get_or_create(
                        company=self.company,
                        registration_number=reg_num,
                        defaults={
                            'customer': customer,
                            'make': random.choice(vehicle_brands),
                            'model': random.choice(vehicle_models),
                            'year': random.randint(2015, 2024),
                            'vehicle_type': random.choice(['hatchback', 'sedan', 'suv']),
                            'color': random.choice(['White', 'Black', 'Silver', 'Red', 'Blue']),
                        }
                    )
                    if veh_created:
                        created_vehicles += 1
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {created_customers} customers with {created_vehicles} vehicles'))

    def create_leads(self, count):
        self.stdout.write(f"\n📞 Creating leads...")
        
        # Create lead sources first
        sources_data = [
            {"name": "Website", "type": "website"},
            {"name": "Walk-in", "type": "walk_in"},
            {"name": "Phone Inquiry", "type": "phone"},
            {"name": "Facebook Ads", "type": "facebook_ads"},
            {"name": "Google Ads", "type": "google_ads"},
        ]
        
        sources_created = 0
        for source_data in sources_data:
            source, created = LeadSource.objects.get_or_create(
                company=self.company,
                name=source_data['name'],
                defaults={'source_type': source_data['type'], 'is_active': True}
            )
            if created:
                sources_created += 1
        
        # Create leads
        lead_names = ["Rohan Verma", "Sanjay Gupta", "Meera Joshi", "Karthik Reddy", "Pooja Nair"]
        created_leads = 0
        
        source = LeadSource.objects.filter(company=self.company).first()
        branch = Branch.objects.filter(company=self.company).first()
        
        for i in range(count):
            name = lead_names[i % len(lead_names)] + f" {i+1}"
            phone = f"97{random.randint(10000000, 99999999)}"
            
            lead, created = Lead.objects.get_or_create(
                company=self.company,
                phone=phone,
                defaults={
                    'name': name,
                    'email': f"lead{i+1}@example.com",
                    'source': source,
                    'status': random.choice(['new', 'contacted', 'qualified']),
                    'priority': random.choice(['low', 'medium', 'high']),
                    'branch': branch,
                    'interested_services': 'Car detailing services',
                    'score': random.randint(50, 100),
                }
            )
            if created:
                created_leads += 1
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {sources_created} lead sources and {created_leads} leads'))

    def create_vendors(self, count):
        self.stdout.write(f"\n🏪 Creating vendors and expenses...")
        
        vendor_names = [
            "AutoChem Supplies",
            "Premium Polish Co",
            "CarCare Products",
            "DetailPro Supplies",
            "CleanMaster India",
        ]
        
        created_vendors = 0
        created_expenses = 0
        
        for i, vendor_name in enumerate(vendor_names[:count]):
            vendor, created = Vendor.objects.get_or_create(
                company=self.company,
                name=vendor_name,
                defaults={
                    'contact_person': f"Manager {i+1}",
                    'email': f"vendor{i+1}@example.com",
                    'phone': f"022-{random.randint(10000000, 99999999)}",
                    'is_active': True,
                }
            )
            if created:
                created_vendors += 1
                
                # Create some expenses for this vendor
                for _ in range(2):
                    Expense.objects.create(
                        company=self.company,
                        title=f"Purchase from {vendor_name}",
                        category=random.choice(['inventory', 'supplies', 'equipment']),
                        amount=Decimal(str(random.randint(1000, 10000))),
                        date=timezone.now().date() - timedelta(days=random.randint(1, 30)),
                        vendor=vendor,
                        payment_status='paid',
                        payment_method=random.choice(['cash', 'online']),
                    )
                    created_expenses += 1
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {created_vendors} vendors with {created_expenses} expenses'))

    def create_products(self, count):
        self.stdout.write(f"\n🛍️ Creating products...")
        
        product_templates = [
            {"name": "Car Air Freshener", "price": 199},
            {"name": "Premium Wax", "price": 599},
            {"name": "Microfiber Cloth Set", "price": 299},
            {"name": "Dashboard Polish", "price": 349},
            {"name": "Tire Shine Spray", "price": 249},
            {"name": "Glass Cleaner", "price": 199},
            {"name": "Leather Conditioner", "price": 449},
            {"name": "All-Purpose Cleaner", "price": 279},
        ]
        
        created = 0
        for template in product_templates[:count]:
            product, created_new = Product.objects.get_or_create(
                company=self.company,
                name=template['name'],
                defaults={
                    'description': f"High-quality {template['name'].lower()} for your vehicle",
                    'price': Decimal(str(template['price'])),
                    'stock': random.randint(10, 100),
                    'is_active': True,
                    'is_global': True,
                }
            )
            if created_new:
                created += 1
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {created} products'))

    def create_attendance_policy(self):
        self.stdout.write(f"\n📋 Creating attendance policy...")
        
        policy, created = AttendancePolicy.objects.get_or_create(
            company=self.company,
            name="Standard Policy",
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
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created attendance policy'))
        else:
            self.stdout.write(self.style.WARNING(f'  ⚠️  Attendance policy already exists'))

    def print_summary(self):
        """Print summary of created data"""
        
        summary = [
            ('Branches', Branch.objects.filter(company=self.company).count()),
            ('Service Bays', ServiceBay.objects.filter(company=self.company).count()),
            ('Staff', User.objects.filter(company=self.company).exclude(role='customer').count()),
            ('Customers', Customer.objects.filter(company=self.company).count()),
            ('Vehicles', Vehicle.objects.filter(company=self.company).count()),
            ('Services', ServicePackage.objects.filter(company=self.company).count()),
            ('Add-ons', AddOn.objects.filter(company=self.company).count()),
            ('Membership Plans', MembershipPlan.objects.filter(company=self.company).count()),
            ('Leads', Lead.objects.filter(company=self.company).count()),
            ('Lead Sources', LeadSource.objects.filter(company=self.company).count()),
            ('Vendors', Vendor.objects.filter(company=self.company).count()),
            ('Expenses', Expense.objects.filter(company=self.company).count()),
            ('Products', Product.objects.filter(company=self.company).count()),
            ('Attendance Policies', AttendancePolicy.objects.filter(company=self.company).count()),
        ]
        
        for item, count in summary:
            self.stdout.write(f"   - {item:<25} {count:>3}")
