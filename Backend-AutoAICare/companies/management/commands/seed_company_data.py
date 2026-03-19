# Multi-Tenancy Seed Data Command
# This command creates comprehensive test data for a specific company

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds comprehensive test data for a specific company'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company',
            type=str,
            required=True,
            help='Company slug or ID to populate data for'
        )

    def handle(self, *args, **kwargs):
        from companies.models import Company
        
        company_identifier = kwargs['company']
        
        # Get company
        try:
            if company_identifier.isdigit():
                self.company = Company.objects.get(id=int(company_identifier))
            else:
                self.company = Company.objects.get(slug=company_identifier)
        except Company.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Company "{company_identifier}" not found'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'\n🏢 Seeding data for: {self.company.name}'))
        self.stdout.write("="*60)
        
        try:
            # Create data
            self.stdout.write("1. Creating branches...")
            branches = self.create_branches()
            
            self.stdout.write("2. Creating users...")
            users = self.create_users(branches)
            
            self.stdout.write("3. Creating customers...")
            customers = self.create_customers(users['customers'])
            
            self.stdout.write("4. Creating services...")
            packages, addons = self.create_services()
            
            self.stdout.write("5. Creating bookings...")
            bookings = self.create_bookings(customers, packages, addons, branches)
            
            # Summary
            self.stdout.write("\n" + "="*60)
            self.stdout.write(self.style.SUCCESS('✅ DATA SEEDING COMPLETED!'))
            self.stdout.write("="*60)
            self.stdout.write(f"Company: {self.company.name}")
            self.stdout.write(f"  - Branches: {len(branches)}")
            self.stdout.write(f"  - Staff: {len(users['staff'])}")
            self.stdout.write(f"  - Customers: {len(customers)}")
            self.stdout.write(f"  - Services: {len(packages)}")
            self.stdout.write(f"  - Add-ons: {len(addons)}")
            self.stdout.write(f"  - Bookings: {len(bookings)}")
            self.stdout.write("")
        except Exception as e:
            import traceback
            self.stdout.write(self.style.ERROR(f"❌ Error during seeding: {str(e)}"))
            self.stdout.write(traceback.format_exc())

    def create_branches(self):
        from branches.models import Branch, ServiceBay
        from django.db.models import Q
        
        branches_data = [
            {'name': 'Main Branch', 'code': 'MAIN', 'city': 'Mumbai', 'state': 'Maharashtra'},
            {'name': 'Andheri Branch', 'code': 'AND', 'city': 'Mumbai', 'state': 'Maharashtra'},
        ]
        
        branches = []
        for i, data in enumerate(branches_data):
            branch = Branch.objects.filter(company=self.company).filter(
                Q(name=data['name']) | Q(code=data['code'])
            ).first()
            
            if not branch:
                branch = Branch.objects.create(
                    company=self.company,
                    code=data['code'],
                    name=data['name'],
                    address=f'{random.randint(1, 999)} MG Road',
                    city=data['city'],
                    state=data['state'],
                    pincode=f'40000{i+1}',
                    phone=f'{random.randint(7000000000, 9999999999)}',
                    email=f"{data['code'].lower()}@{self.company.slug}.com",
                )
                
                # Create service bays
                for bay_name in ['Bay 1', 'Bay 2', 'Bay 3']:
                    ServiceBay.objects.get_or_create(
                        branch=branch,
                        company=self.company,
                        name=bay_name,
                        defaults={'bay_type': 'detailing', 'is_active': True}
                    )
            branches.append(branch)
        return branches

    def create_users(self, branches):
        users = {'all': [], 'customers': [], 'staff': []}
        
        # 1. Create Company Admin (one per company)
        company_admin_email = f'admin_{self.company.slug}@test.com'
        company_admin = User.objects.filter(email=company_admin_email).first()
        if not company_admin:
            company_admin = User.objects.create_user(
                email=company_admin_email,
                password='Test@123',
                name=f'Admin {self.company.name}',
                phone=f'{random.randint(7000000000, 9999999999)}',
                role='company_admin',
                company=self.company,
            )
        users['all'].append(company_admin)
        users['staff'].append(company_admin)

        # 2. Create Branch Admins (one per branch)
        for branch in branches:
            email = f'admin_{branch.code.lower()}_{self.company.slug}@test.com'
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.create_user(
                    email=email,
                    password='Test@123',
                    name=f'Admin {branch.name}',
                    phone=f'{random.randint(7000000000, 9999999999)}',
                    role='branch_admin',
                    company=self.company,
                    branch=branch,
                )
            users['all'].append(user)
            users['staff'].append(user)

        # 3. Create other staff
        roles_data = [
            ('floor_manager', 'Floor Manager'),
            ('supervisor', 'Supervisor'),
            ('supervisor', 'Supervisor 2'),
            ('applicator', 'Applicator'),
            ('applicator', 'Applicator 2'),
        ]
        
        for i, (role, name) in enumerate(roles_data):
            branch = branches[i % len(branches)]
            email = f'{role}{i+1}_{self.company.slug}@test.com'
            
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.create_user(
                    email=email,
                    password='Test@123',
                    name=name,
                    phone=f'{random.randint(7000000000, 9999999999)}',
                    role=role,
                    company=self.company,
                    branch=branch,
                )
            users['all'].append(user)
            users['staff'].append(user)
        
        customer_names = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh']
        
        for i, name in enumerate(customer_names):
            email = f'customer{i+1}_{self.company.slug}@test.com'
            
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.create_user(
                    email=email,
                    password='Test@123',
                    name=name,
                    phone=f'{random.randint(7000000000, 9999999999)}',
                    role='customer',
                    company=self.company,
                )
            users['all'].append(user)
            users['customers'].append(user)
        return users

    def create_customers(self, customer_users):
        from customers.models import Customer, Vehicle
        
        customers = []
        
        vehicle_data = [
            {'make': 'Maruti Suzuki', 'model': 'Swift', 'type': 'hatchback'},
            {'make': 'Hyundai', 'model': 'i20', 'type': 'hatchback'},
            {'make': 'Honda', 'model': 'City', 'type': 'sedan'},
            {'make': 'Toyota', 'model': 'Innova', 'type': 'suv'},
            {'make': 'Maruti Suzuki', 'model': 'Brezza', 'type': 'suv'},
        ]
        
        for i, user in enumerate(customer_users):
            customer, _ = Customer.objects.get_or_create(
                company=self.company,
                user=user,
                defaults={'reward_points': random.randint(0, 500)}
            )
            customers.append(customer)
            
            if not Vehicle.objects.filter(customer=customer).exists():
                veh_data = vehicle_data[i % len(vehicle_data)]
                reg = f'MH{random.randint(1,50):02d}AB{random.randint(1000,9999)}'
                
                Vehicle.objects.create(
                    company=self.company,
                    customer=customer,
                    registration_number=reg,
                    brand=veh_data['make'],
                    model=veh_data['model'],
                    year=random.randint(2018, 2024),
                    vehicle_type=veh_data['type'],
                    color=random.choice(['White', 'Black', 'Silver', 'Red']),
                )
        return customers

    def create_services(self):
        from services.models import ServicePackage, AddOn
        
        services_data = [
            ('Basic Wash', 'wash', 500, 700, 1000, 30),
            ('Premium Wash', 'wash', 800, 1200, 1500, 60),
            ('Interior Detailing', 'interior', 1500, 2000, 2500, 90),
            ('Ceramic Coating', 'coating', 5000, 7000, 9000, 180),
            ('Paint Protection', 'exterior', 3000, 4000, 5000, 120),
        ]
        
        packages = []
        for name, cat, h_price, s_price, suv_price, duration in services_data:
            pkg, _ = ServicePackage.objects.get_or_create(
                company=self.company,
                name=name,
                defaults={
                    'category': cat,
                    'description': f'{name} service',
                    'hatchback_price': Decimal(str(h_price)),
                    'sedan_price': Decimal(str(s_price)),
                    'suv_price': Decimal(str(suv_price)),
                    'duration': duration,
                    'is_active': True,
                }
            )
            packages.append(pkg)
        
        addon_data = [
            ('Engine Wash', 300),
            ('Tire Polish', 200),
            ('Air Freshener', 150),
        ]
        
        addons = []
        for name, price in addon_data:
            addon, _ = AddOn.objects.get_or_create(
                company=self.company,
                name=name,
                defaults={
                    'price': Decimal(str(price)),
                    'duration': 15,
                    'is_active': True,
                    'is_global': True,
                }
            )
            addons.append(addon)
        return packages, addons

    def create_bookings(self, customers, packages, addons, branches):
        from bookings.models import Booking
        
        bookings = []
        statuses = ['pending', 'confirmed', 'in_progress', 'completed']
        
        for customer in customers:
            vehicles = list(customer.vehicles.all())
            if not vehicles:
                continue
            
            if not Booking.objects.filter(customer=customer).exists():
                for _ in range(random.randint(1, 2)):
                    vehicle = random.choice(vehicles)
                    package = random.choice(packages)
                    branch = random.choice(branches)
                    
                    booking_date = timezone.now() - timedelta(days=random.randint(1, 30))
                    
                    # Calculate subtotal and GST
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
                    
                    if addons:
                        selected_addons = random.sample(addons, random.randint(0, min(2, len(addons))))
                        booking.addons.set(selected_addons)
                    
                    bookings.append(booking)
        return bookings
