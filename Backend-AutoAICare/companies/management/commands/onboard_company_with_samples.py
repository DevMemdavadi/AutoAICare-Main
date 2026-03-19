"""
Add Sample Data to Existing Company

This command adds comprehensive sample/test data to an existing company:
1. Staff users (branch admins, floor managers, supervisors, applicators)
2. Customer users with vehicles
3. Sample bookings
4. Sample leads
5. Membership plans
6. Vendors and expenses
7. Products

Usage:
    # Add sample data to existing company
    python manage.py onboard_company_with_samples --company k3-car-care
    
    # Or use company ID
    python manage.py onboard_company_with_samples --company 1
    
    # Full sample data set
    python manage.py onboard_company_with_samples --company k3-car-care --full
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import random

from companies.models import Company
from branches.models import Branch
from users.models import User
from customers.models import Customer, Vehicle
from services.models import ServicePackage, AddOn
from bookings.models import Booking
from leads.models import Lead, LeadSource
from memberships.models import MembershipPlan, MembershipBenefit
from accounting.models import Vendor, Expense
from store.models import Product


class Command(BaseCommand):
    help = 'Add comprehensive sample data to an existing company'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--company',
            type=str,
            required=True,
            help='Company slug or ID'
        )
        parser.add_argument(
            '--full',
            action='store_true',
            help='Create more comprehensive sample data'
        )
    
    def handle(self, *args, **options):
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('📊 ADDING SAMPLE DATA TO COMPANY'))
        self.stdout.write('='*70 + '\n')
        
        # Get company
        company_identifier = options['company']
        try:
            if company_identifier.isdigit():
                self.company = Company.objects.get(id=int(company_identifier))
            else:
                self.company = Company.objects.get(slug=company_identifier)
        except Company.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Company "{company_identifier}" not found'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'✓ Found company: {self.company.name}'))
        self.is_full = options['full']
        
        try:
            with transaction.atomic():
                # Get branches
                branches = list(Branch.objects.filter(company=self.company))
                if not branches:
                    self.stdout.write(self.style.ERROR('❌ No branches found. Run onboard_company first.'))
                    return
                
                # Step 1: Create Staff Users
                staff = self.create_staff_users(branches)
                
                # Step 2: Create Customer Users
                customers = self.create_customers()
                
                # Step 3: Create Vehicles
                vehicles = self.create_vehicles(customers)
                
                # Step 4: Create Bookings
                bookings = self.create_bookings(customers, branches)
                
                # Step 5: Create Leads
                leads = self.create_leads(branches)
                
                # Step 6: Create Membership Plans
                plans = self.create_membership_plans()
                
                # Step 7: Create Vendors
                vendors = self.create_vendors()
                
                # Step 8: Create Products
                products = self.create_products()
            
            # Print Summary
            self.print_summary(staff, customers, vehicles, bookings, leads, plans, vendors, products)
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Sample data creation failed: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())
            raise
    
    def create_staff_users(self, branches):
        """Step 1: Create staff users"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 1/8: Creating Staff Users'))
        self.stdout.write('-'*70)
        
        staff = []
        
        # Branch admins (one per branch)
        for i, branch in enumerate(branches):
            email = f'admin_{branch.code.lower()}_{self.company.slug}@test.com'
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'name': f'Admin {branch.name}',
                    'password': 'pbkdf2_sha256$260000$test$test',  # Test@123
                    'phone': f'{random.randint(7000000000, 9999999999)}',
                    'role': 'branch_admin',
                    'company': self.company,
                    'branch': branch,
                    'is_verified': True,
                }
            )
            if created:
                user.set_password('Test@123')
                user.save()
                staff.append(user)
                self.stdout.write(f'  ✓ Created: {user.email} (Branch Admin)')
        
        # Floor managers, supervisors, applicators
        roles_data = [
            ('floor_manager', 'Floor Manager', 2 if self.is_full else 1),
            ('supervisor', 'Supervisor', 3 if self.is_full else 2),
            ('applicator', 'Applicator', 4 if self.is_full else 2),
        ]
        
        for role, role_name, count in roles_data:
            for i in range(count):
                branch = branches[i % len(branches)]
                email = f'{role}{i+1}_{self.company.slug}@test.com'
                
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'name': f'{role_name} {i+1}',
                        'password': 'pbkdf2_sha256$260000$test$test',
                        'phone': f'{random.randint(7000000000, 9999999999)}',
                        'role': role,
                        'company': self.company,
                        'branch': branch,
                        'is_verified': True,
                    }
                )
                if created:
                    user.set_password('Test@123')
                    user.save()
                    staff.append(user)
                    self.stdout.write(f'  ✓ Created: {user.email} ({role_name})')
        
        self.stdout.write(self.style.SUCCESS(f'\n  Total staff created: {len(staff)}'))
        return staff
    
    def create_customers(self):
        """Step 2: Create customer users"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 2/8: Creating Customer Users'))
        self.stdout.write('-'*70)
        
        customer_names = [
            'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 
            'Vikram Singh', 'Anjali Iyer', 'Rahul Desai', 'Deepika Shah',
            'Arjun Mehta', 'Kavya Nair'
        ]
        
        count = 10 if self.is_full else 5
        customers = []
        
        for i in range(count):
            name = customer_names[i % len(customer_names)]
            email = f'customer{i+1}_{self.company.slug}@test.com'
            
            user, user_created = User.objects.get_or_create(
                email=email,
                defaults={
                    'name': name,
                    'password': 'pbkdf2_sha256$260000$test$test',
                    'phone': f'{random.randint(7000000000, 9999999999)}',
                    'role': 'customer',
                    'company': self.company,
                    'is_verified': True,
                }
            )
            if user_created:
                user.set_password('Test@123')
                user.save()
            
            customer, created = Customer.objects.get_or_create(
                company=self.company,
                user=user,
                defaults={'reward_points': random.randint(0, 500)}
            )
            
            if created:
                customers.append(customer)
                self.stdout.write(f'  ✓ Created: {user.email}')
        
        self.stdout.write(self.style.SUCCESS(f'\n  Total customers created: {len(customers)}'))
        return customers
    
    def create_vehicles(self, customers):
        """Step 3: Create vehicles for customers"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 3/8: Creating Vehicles'))
        self.stdout.write('-'*70)
        
        vehicle_data = [
            {'make': 'Maruti Suzuki', 'model': 'Swift', 'type': 'hatchback'},
            {'make': 'Hyundai', 'model': 'i20', 'type': 'hatchback'},
            {'make': 'Honda', 'model': 'City', 'type': 'sedan'},
            {'make': 'Toyota', 'model': 'Innova', 'type': 'suv'},
            {'make': 'Maruti Suzuki', 'model': 'Brezza', 'type': 'suv'},
            {'make': 'Tata', 'model': 'Nexon', 'type': 'suv'},
            {'make': 'Hyundai', 'model': 'Creta', 'type': 'suv'},
            {'make': 'Volkswagen', 'model': 'Polo', 'type': 'hatchback'},
        ]
        
        vehicles = []
        for customer in customers:
            # Create 1-2 vehicles per customer
            num_vehicles = random.randint(1, 2)
            for v in range(num_vehicles):
                veh_data = vehicle_data[(len(vehicles) + v) % len(vehicle_data)]
                reg = f'MH{random.randint(1,50):02d}AB{random.randint(1000,9999)}'
                
                vehicle, created = Vehicle.objects.get_or_create(
                    company=self.company,
                    registration_number=reg,
                    defaults={
                        'customer': customer,
                        'brand': veh_data['make'],
                        'model': veh_data['model'],
                        'year': random.randint(2018, 2024),
                        'vehicle_type': veh_data['type'],
                        'color': random.choice(['White', 'Black', 'Silver', 'Red', 'Blue']),
                    }
                )
                if created:
                    vehicles.append(vehicle)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(vehicles)} vehicles'))
        return vehicles
    
    def create_bookings(self, customers, branches):
        """Step 4: Create sample bookings"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 4/8: Creating Sample Bookings'))
        self.stdout.write('-'*70)
        
        packages = list(ServicePackage.objects.filter(company=self.company, is_active=True))
        addons = list(AddOn.objects.filter(company=self.company, is_active=True))
        
        if not packages:
            self.stdout.write(self.style.WARNING('  ⚠️  No service packages found. Skipping bookings.'))
            return []
        
        bookings = []
        statuses = ['pending', 'confirmed', 'in_progress', 'completed']
        
        for customer in customers:
            vehicles = list(customer.vehicles.all())
            if not vehicles:
                continue
            
            # Create 1-3 bookings per customer
            num_bookings = random.randint(1, 3) if self.is_full else random.randint(1, 2)
            for _ in range(num_bookings):
                vehicle = random.choice(vehicles)
                package = random.choice(packages)
                branch = random.choice(branches)
                
                booking_date = timezone.now() - timedelta(days=random.randint(1, 60))
                
                # Calculate pricing
                subtotal = package.get_price_for_vehicle_type(vehicle.vehicle_type)
                gst_amount = package.calculate_gst(subtotal)
                
                booking = Booking.objects.create(
                    company=self.company,
                    customer=customer,
                    vehicle=vehicle,
                    package=package,
                    branch=branch,
                    booking_datetime=booking_date,
                    status=random.choice(statuses),
                    vehicle_type=vehicle.vehicle_type,
                    subtotal=subtotal,
                    gst_amount=gst_amount,
                )
                
                # Add random addons
                if addons:
                    selected_addons = random.sample(addons, random.randint(0, min(2, len(addons))))
                    booking.addons.set(selected_addons)
                
                bookings.append(booking)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(bookings)} bookings'))
        return bookings
    
    def create_leads(self, branches):
        """Step 5: Create sample leads"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 5/8: Creating Sample Leads'))
        self.stdout.write('-'*70)
        
        sources = list(LeadSource.objects.filter(company=self.company, is_active=True))
        if not sources:
            self.stdout.write(self.style.WARNING('  ⚠️  No lead sources found. Skipping leads.'))
            return []
        
        lead_names = [
            'Rohan Verma', 'Sanjay Gupta', 'Meera Joshi', 'Karthik Reddy',
            'Pooja Nair', 'Aditya Kapoor', 'Neha Agarwal', 'Suresh Pillai'
        ]
        
        count = 8 if self.is_full else 5
        leads = []
        
        for i in range(count):
            name = lead_names[i % len(lead_names)]
            phone = f'{random.randint(7000000000, 9999999999)}'
            
            lead = Lead.objects.create(
                company=self.company,
                name=f'{name} {i+1}',
                email=f'lead{i+1}@example.com',
                phone=phone,
                source=random.choice(sources),
                status=random.choice(['new', 'contacted', 'qualified', 'converted']),
                priority=random.choice(['low', 'medium', 'high']),
                branch=random.choice(branches),
                interested_services='Car detailing and ceramic coating',
                score=random.randint(50, 100),
            )
            leads.append(lead)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(leads)} leads'))
        return leads
    
    def create_membership_plans(self):
        """Step 6: Create membership plans"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 6/8: Creating Membership Plans'))
        self.stdout.write('-'*70)
        
        plans_data = [
            {'name': 'Silver Plan', 'tier': 'silver', 'price': 5000, 'washes': 4},
            {'name': 'Gold Plan', 'tier': 'gold', 'price': 10000, 'washes': 10},
            {'name': 'Platinum Plan', 'tier': 'platinum', 'price': 20000, 'washes': 20},
        ]
        
        plans = []
        for plan_data in plans_data:
            plan, created = MembershipPlan.objects.get_or_create(
                company=self.company,
                name=plan_data['name'],
                defaults={
                    'tier': plan_data['tier'],
                    'description': f"{plan_data['name']} - Best value for regular customers!",
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
            
            if created:
                # Create benefit
                MembershipBenefit.objects.create(
                    company=self.company,
                    plan=plan,
                    benefit_type='discount',
                    title='10% Discount on All Services',
                    description='Get 10% off on every service',
                    discount_percentage=Decimal('10.00'),
                )
                plans.append(plan)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(plans)} membership plans'))
        return plans
    
    def create_vendors(self):
        """Step 7: Create vendors and expenses"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 7/8: Creating Vendors'))
        self.stdout.write('-'*70)
        
        vendor_names = [
            'AutoChem Supplies', 'Premium Polish Co', 'CarCare Products',
            'DetailPro Supplies', 'CleanMaster India'
        ]
        
        vendors = []
        for i, vendor_name in enumerate(vendor_names):
            vendor, created = Vendor.objects.get_or_create(
                company=self.company,
                name=vendor_name,
                defaults={
                    'contact_person': f'Manager {i+1}',
                    'email': f'vendor{i+1}@example.com',
                    'phone': f'{random.randint(7000000000, 9999999999)}',
                    'is_active': True,
                }
            )
            
            if created:
                # Create 2-3 expenses for this vendor
                for _ in range(random.randint(2, 3)):
                    Expense.objects.create(
                        company=self.company,
                        title=f'Purchase from {vendor_name}',
                        category=random.choice(['inventory', 'supplies', 'equipment']),
                        amount=Decimal(str(random.randint(1000, 10000))),
                        date=timezone.now().date() - timedelta(days=random.randint(1, 30)),
                        vendor=vendor,
                        payment_status='paid',
                        payment_method=random.choice(['cash', 'online']),
                    )
                vendors.append(vendor)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(vendors)} vendors'))
        return vendors
    
    def create_products(self):
        """Step 8: Create products"""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write(self.style.SUCCESS('Step 8/8: Creating Products'))
        self.stdout.write('-'*70)
        
        product_templates = [
            {'name': 'Car Air Freshener', 'price': 199},
            {'name': 'Premium Wax', 'price': 599},
            {'name': 'Microfiber Cloth Set', 'price': 299},
            {'name': 'Dashboard Polish', 'price': 349},
            {'name': 'Tire Shine Spray', 'price': 249},
            {'name': 'Glass Cleaner', 'price': 199},
            {'name': 'Leather Conditioner', 'price': 449},
            {'name': 'All-Purpose Cleaner', 'price': 279},
        ]
        
        products = []
        for template in product_templates:
            product, created = Product.objects.get_or_create(
                company=self.company,
                name=template['name'],
                defaults={
                    'description': f"High-quality {template['name'].lower()} for your vehicle",
                    'price': Decimal(str(template['price'])),
                    'stock': random.randint(10, 100),
                    'is_active': True,
                    'is_global': False,
                }
            )
            if created:
                products.append(product)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(products)} products'))
        return products
    
    def print_summary(self, staff, customers, vehicles, bookings, leads, plans, vendors, products):
        """Print summary"""
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('✅ SAMPLE DATA ADDED SUCCESSFULLY! 🎉'))
        self.stdout.write('='*70 + '\n')
        
        self.stdout.write(self.style.SUCCESS(f'Company: {self.company.name}'))
        self.stdout.write(f'\n{self.style.SUCCESS("Sample Data Created:")}')
        self.stdout.write(f'  ✓ {len(staff)} Staff users')
        self.stdout.write(f'  ✓ {len(customers)} Customers')
        self.stdout.write(f'  ✓ {len(vehicles)} Vehicles')
        self.stdout.write(f'  ✓ {len(bookings)} Bookings')
        self.stdout.write(f'  ✓ {len(leads)} Leads')
        self.stdout.write(f'  ✓ {len(plans)} Membership plans')
        self.stdout.write(f'  ✓ {len(vendors)} Vendors')
        self.stdout.write(f'  ✓ {len(products)} Products')
        
        self.stdout.write(f'\n{self.style.WARNING("Test Credentials:")}')
        self.stdout.write(f'  All test users have password: Test@123')
        self.stdout.write(f'  Floor Manager:  floormanager1_{self.company.slug}@test.com')
        self.stdout.write(f'  Supervisor:     supervisor1_{self.company.slug}@test.com')
        self.stdout.write(f'  Customer:       customer1_{self.company.slug}@test.com')
        self.stdout.write('')
