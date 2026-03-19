
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta, datetime
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with dummy data for all models'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company',
            type=str,
            required=False,
            help='Company slug or ID to populate data for (required for multi-tenancy)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding'
        )

    def handle(self, *args, **kwargs):
        from companies.models import Company
        
        # Get company parameter
        company_identifier = kwargs.get('company')
        
        if not company_identifier:
            self.stdout.write(self.style.ERROR('❌ --company parameter is required!'))
            self.stdout.write('Usage: python manage.py seed_data --company <slug-or-id>')
            return
        
        # Get company
        try:
            if company_identifier.isdigit():
                self.company = Company.objects.get(id=int(company_identifier))
            else:
                self.company = Company.objects.get(slug=company_identifier)
        except Company.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Company "{company_identifier}" not found'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'\n🏢 Seeding data for: {self.company.name} (ID: {self.company.id})'))
        self.stdout.write(self.style.SUCCESS('Starting data seeding...'))
        
        # Clear existing data (optional - comment out if you want to keep existing data)
        self.stdout.write('Clearing existing data...')
        self.clear_data()
        
        # Create branches first
        self.stdout.write('Creating branches...')
        branches = self.create_branches()
        
        # Create users
        self.stdout.write('Creating users...')
        users = self.create_users(branches)
        
        # Create customers and vehicles
        self.stdout.write('Creating customers and vehicles...')
        customers = self.create_customers(users['customers'])
        
        # Create service packages and add-ons
        self.stdout.write('Creating service packages and add-ons...')
        packages, addons = self.create_services(branches)
        
        # Create bookings
        self.stdout.write('Creating bookings...')
        bookings = self.create_bookings(customers, packages, addons, branches)
        
        # Create job cards
        self.stdout.write('Creating job cards...')
        jobcards = self.create_jobcards(bookings, users['staff'])
        
        # Create pickup requests
        self.stdout.write('Creating pickup requests...')
        self.create_pickup_requests(bookings, users['staff'])
        
        # Create payments
        self.stdout.write('Creating payments...')
        self.create_payments(bookings)
        
        # Create store products and orders
        self.stdout.write('Creating store products and orders...')
        self.create_store_data(customers, branches)
        
        # Create feedback
        self.stdout.write('Creating feedback...')
        self.create_feedback(bookings, customers)
        
        self.stdout.write(self.style.SUCCESS('Data seeding completed successfully!'))
        self.stdout.write(self.style.SUCCESS(f'Created:'))
        self.stdout.write(f'  - {len(branches)} Branches')
        self.stdout.write(f'  - {len(users["all"])} Users (1 super admin, {len(branches)} branch admins, {len(users["staff"])} staff, {len(users["customers"])} customers)')
        self.stdout.write(f'  - {len(customers)} Customers with vehicles')
        self.stdout.write(f'  - {len(packages)} Service packages')
        self.stdout.write(f'  - {len(addons)} Add-ons')
        self.stdout.write(f'  - {len(bookings)} Bookings (distributed across branches)')
        self.stdout.write(f'  - Store products and orders')
        self.stdout.write(f'  - Feedback and reviews')

    def clear_data(self):
        """Clear existing data from all models"""
        from customers.models import Customer, Vehicle
        from services.models import ServicePackage, AddOn
        from bookings.models import Booking
        from jobcards.models import JobCard, JobCardPhoto
        from pickup.models import PickupDropRequest
        from payments.models import Payment
        from store.models import Product, Order, OrderItem
        from feedback.models import Feedback
        from branches.models import Branch
        
        Feedback.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        Product.objects.all().delete()
        Payment.objects.all().delete()
        PickupDropRequest.objects.all().delete()
        JobCardPhoto.objects.all().delete()
        JobCard.objects.all().delete()
        Booking.objects.all().delete()
        Vehicle.objects.all().delete()
        Customer.objects.all().delete()
        AddOn.objects.all().delete()
        ServicePackage.objects.all().delete()
        User.objects.all().delete()
        Branch.objects.all().delete()

    def create_branches(self):
        """Create branch locations"""
        from branches.models import Branch
        
        branches_data = [
            {
                'name': 'Downtown Branch',
                'code': 'DT001',
                'address': '123 Main Street',
                'city': 'Springfield',
                'state': 'Illinois',
                'pincode': '62701',
                'phone': '+1234567890',
                'email': 'downtown@carservice.com',
                'manager_name': 'John Manager',
                'manager_phone': '+1234567891',
                'is_active': True
            },
            {
                'name': 'Northside Branch',
                'code': 'NS002',
                'address': '456 Oak Avenue',
                'city': 'Riverside',
                'state': 'California',
                'pincode': '92501',
                'phone': '+1234567892',
                'email': 'northside@carservice.com',
                'manager_name': 'Sarah Director',
                'manager_phone': '+1234567893',
                'is_active': True
            },
            {
                'name': 'Eastside Branch',
                'code': 'ES003',
                'address': '789 Elm Street',
                'city': 'Lakeside',
                'state': 'Texas',
                'pincode': '75001',
                'phone': '+1234567894',
                'email': 'eastside@carservice.com',
                'manager_name': 'Mike Supervisor',
                'manager_phone': '+1234567895',
                'is_active': True
            }
        ]
        
        branches = []
        for data in branches_data:
            branch = Branch.objects.create(**data)
            branches.append(branch)
        
        return branches

    def create_users(self, branches):
        """Create users with different roles and branch assignments"""
        users = {'all': [], 'customers': [], 'staff': [], 'admins': [], 'floor_managers': [], 'applicators': []}
        
        # Create super admin (no branch)
        super_admin = User.objects.create_user(
            email='admin@carservice.com',
            name='Super Admin',
            password='admin123',
            role='super_admin',
            phone='9000000001',
            is_verified=True,
            is_active=True,
            is_staff=True,
            is_superuser=True,
            branch=None  # Super admin has no branch
        )
        users['all'].append(super_admin)
        users['admins'].append(super_admin)
        
        # Create branch admins (one per branch)
        for i, branch in enumerate(branches):
            admin = User.objects.create_user(
                email=f'admin.{branch.code.lower()}@carservice.com',
                name=f'{branch.name} Admin',
                password='admin123',
                role='branch_admin',
                phone=f'901000000{i}',
                is_verified=True,
                is_active=True,
                is_staff=True,
                branch=branch  # Assign to specific branch
            )
            users['all'].append(admin)
            users['admins'].append(admin)
        
        # Create floor managers (one per branch)
        floor_manager_names = ['Robert Chen', 'Sarah Parker', 'James Wilson']
        for i, branch in enumerate(branches):
            name = floor_manager_names[i] if i < len(floor_manager_names) else f'Floor Manager {i+1}'
            fm = User.objects.create_user(
                email=f'floormanager.{branch.code.lower()}@carservice.com',
                name=name,
                password='fm123',
                role='floor_manager',
                phone=f'903000000{i}',
                is_verified=True,
                is_active=True,
                is_staff=True,
                branch=branch
            )
            users['all'].append(fm)
            users['staff'].append(fm)
            users['floor_managers'].append(fm)
        
        # Create supervisors (2 per branch)
        supervisor_names = [
            'John Smith', 'Mike Johnson',      # Branch 1
            'David Brown', 'Chris Wilson',     # Branch 2
            'Tom Davis', 'Emma White'          # Branch 3
        ]
        for i, name in enumerate(supervisor_names):
            branch = branches[i // 2 % len(branches)]  # 2 per branch
            staff = User.objects.create_user(
                email=f'supervisor{i+1}.{branch.code.lower()}@carservice.com',
                name=name,
                password='super123',
                role='supervisor',
                phone=f'904000000{i}',
                is_verified=True,
                is_active=True,
                branch=branch
            )
            users['all'].append(staff)
            users['staff'].append(staff)
        
        # Create applicators (3 per branch)
        applicator_names = [
            'Raj Kumar', 'Amit Patel', 'Suresh Sharma',           # Branch 1
            'Vikram Singh', 'Deepak Verma', 'Arun Gupta',         # Branch 2
            'Rahul Joshi', 'Manish Yadav', 'Pradeep Thakur'       # Branch 3
        ]
        for i, name in enumerate(applicator_names):
            branch = branches[i // 3 % len(branches)]  # 3 per branch
            applicator = User.objects.create_user(
                email=f'applicator{i+1}.{branch.code.lower()}@carservice.com',
                name=name,
                password='app123',
                role='applicator',
                phone=f'905000000{i}',
                is_verified=True,
                is_active=True,
                branch=branch
            )
            users['all'].append(applicator)
            users['staff'].append(applicator)
            users['applicators'].append(applicator)
        
        # Create customers (no branch assignment)
        customer_names = [
            'Alice Johnson', 'Bob Smith', 'Carol Williams', 'Daniel Brown',
            'Emma Davis', 'Frank Miller', 'Grace Wilson', 'Henry Moore',
            'Isabella Taylor', 'Jack Anderson', 'Kate Thomas', 'Liam Jackson',
            'Mia White', 'Noah Harris', 'Olivia Martin'
        ]
        for i, name in enumerate(customer_names):
            customer = User.objects.create_user(
                email=f'customer{i+1}@email.com',
                name=name,
                password='customer123',
                role='customer',
                phone=f'98000000{i:02d}',
                is_verified=True,
                is_active=True,
                branch=None  # Customers have no branch
            )
            users['all'].append(customer)
            users['customers'].append(customer)
        
        return users

    def create_customers(self, customer_users):
        """Create customer profiles and vehicles"""
        from customers.models import Customer, Vehicle
        
        customers = []
        vehicle_brands = ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes', 'Audi', 'Tesla', 'Nissan']
        vehicle_models = {
            'Toyota': ['Camry', 'Corolla', 'RAV4'],
            'Honda': ['Civic', 'Accord', 'CR-V'],
            'Ford': ['F-150', 'Mustang', 'Explorer'],
            'BMW': ['3 Series', '5 Series', 'X5'],
            'Mercedes': ['C-Class', 'E-Class', 'GLC'],
            'Audi': ['A4', 'A6', 'Q5'],
            'Tesla': ['Model 3', 'Model S', 'Model Y'],
            'Nissan': ['Altima', 'Maxima', 'Rogue']
        }
        colors = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Gray', 'Green']
        vehicle_counter = 1000
        
        for user in customer_users:
            customer = Customer.objects.create(
                user=user,
                reward_points=random.randint(0, 500)
            )
            customers.append(customer)
            
            # Create 1-3 vehicles per customer
            for _ in range(random.randint(1, 3)):
                brand = random.choice(vehicle_brands)
                model = random.choice(vehicle_models[brand])
                vehicle_counter += 1
                Vehicle.objects.create(
                    customer=customer,
                    registration_number=f'GJ01AB{vehicle_counter}',
                    brand=brand,
                    model=model,
                    year=random.randint(2015, 2024),
                    color=random.choice(colors)
                )
        
        return customers

    def create_services(self, branches=None):
        """Create service packages and add-ons (global and branch-specific)"""
        from services.models import ServicePackage, AddOn
        
        # Global packages with vehicle-type pricing (available to all branches)
        global_packages_data = [
            # K3 Car Care Services
            # Normal Car Wash
            {
                'name': 'Normal Car Wash',
                'description': 'Standard car washing service with quality foam, rinse, and air dry. Includes tire cleaning and window wipe.',
                'category': 'wash',
                'hatchback_price': 600,
                'sedan_price': 700,
                'suv_price': 800,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 40,
                'duration_max': 50,

                'is_global': True,
                'is_active': True,
            },
            
            # Car Interior Cleaning
            {
                'name': 'Car Interior Cleaning',
                'description': 'Complete interior detailing including seats, carpet, dashboard, and all surfaces. Steam cleaning included.',
                'category': 'interior',
                'hatchback_price': 2360,
                'sedan_price': 2714,
                'suv_price': 3540,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 90,
                'duration_max': 120,

                'is_global': True,
                'is_active': True,
            },
            
            # Exterior Beautification
            {
                'name': 'Exterior Beautification',
                'description': 'Complete exterior beautification service with premium polish and protective coatings.',
                'category': 'exterior',
                'hatchback_price': 2360,
                'sedan_price': 3186,
                'suv_price': 4130,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 90,
                'duration_max': 120,

                'is_global': True,
                'is_active': True,
            },
            
            # Premium Exterior Beautification with Ceramic Polish
            {
                'name': 'Premium Exterior Beautification with Ceramic Polish',
                'description': 'Premium exterior beautification with professional ceramic polish for enhanced shine and protection.',
                'category': 'exterior',
                'hatchback_price': 5310,
                'sedan_price': 5310,
                'suv_price': 5310,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 150,
                'duration_max': 180,

                'is_global': True,
                'is_active': True,
            },
            
            # Makeover Service
            {
                'name': 'Makeover Service',
                'description': 'Complete car makeover service including exterior and interior detailing for a refreshed look.',
                'category': 'makeover',
                'hatchback_price': 5900,
                'sedan_price': 7080,
                'suv_price': 8260,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 150,
                'duration_max': 180,

                'is_global': True,
                'is_active': True,
            },
            
            # Ceramic Coating (5 Year Warranty)
            {
                'name': 'Ceramic Coating (5 Year Warranty)',
                'description': 'Professional ceramic coating with 5-year warranty for long-lasting paint protection.',
                'category': 'coating',
                'hatchback_price': 20000,
                'sedan_price': 24000,
                'suv_price': 28000,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 240,
                'duration_max': 300,

                'is_global': True,
                'is_active': True,
            },
            
            # Graphene Coating (7 Year Warranty)
            {
                'name': 'Graphene Coating (7 Year Warranty)',
                'description': 'Advanced graphene coating with 7-year warranty for superior paint protection.',
                'category': 'coating',
                'hatchback_price': 24000,
                'sedan_price': 28000,
                'suv_price': 32000,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 240,
                'duration_max': 300,

                'is_global': True,
                'is_active': True,
            },
            
            # Elite Coating (10 Year Warranty – Polymer Coating)
            {
                'name': 'Elite Coating (10 Year Warranty – Polymer Coating)',
                'description': 'Premium polymer coating with 10-year warranty for ultimate paint protection.',
                'category': 'coating',
                'hatchback_price': 28000,
                'sedan_price': 32000,
                'suv_price': 38000,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 240,
                'duration_max': 300,

                'is_global': True,
                'is_active': True,
            },
            
            # Paint Protection Film - PaintGuard (5 Years)
            {
                'name': 'PaintGuard (5 Years)',
                'description': 'High-quality paint protection film with 5-year warranty. Includes front bumper, hood, and fenders.',
                'category': 'exterior',
                'hatchback_price': 60000,
                'sedan_price': 65000,
                'suv_price': 85000,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 240,
                'duration_max': 300,

                'is_global': True,
                'is_active': True,
            },
            
            # Paint Protection Film - PaintGuard (8 Years)
            {
                'name': 'PaintGuard (8 Years)',
                'description': 'Premium paint protection film with 8-year warranty for long-lasting protection.',
                'category': 'exterior',
                'hatchback_price': 65000,
                'sedan_price': 75000,
                'suv_price': 95000,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 240,
                'duration_max': 300,

                'is_global': True,
                'is_active': True,
            },
            
            # Paint Protection Film - PaintGuard (10 Years)
            {
                'name': 'PaintGuard (10 Years)',
                'description': 'Ultimate paint protection film with 10-year warranty for maximum protection.',
                'category': 'exterior',
                'hatchback_price': 65000,
                'sedan_price': 85000,
                'suv_price': 115000,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 240,
                'duration_max': 300,

                'is_global': True,
                'is_active': True,
            },
            
            # Paint Protection Film - GARWARE PROTECT (3 Years)
            {
                'name': 'GARWARE PROTECT (3 Years)',
                'description': 'Reliable paint protection film with 3-year warranty for essential protection.',
                'category': 'exterior',
                'hatchback_price': 55000,
                'sedan_price': 65000,
                'suv_price': 75000,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 240,
                'duration_max': 300,

                'is_global': True,
                'is_active': True,
            },
            
            # Paint Protection Film - GARWARE Plus (5 Years)
            {
                'name': 'GARWARE Plus (5 Years)',
                'description': 'Enhanced paint protection film with 5-year warranty for improved durability.',
                'category': 'exterior',
                'hatchback_price': 65000,
                'sedan_price': 75000,
                'suv_price': 85000,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 240,
                'duration_max': 300,

                'is_global': True,
                'is_active': True,
            },
            
            # Paint Protection Film - GARWARE Premium (8 Years)
            {
                'name': 'GARWARE Premium (8 Years)',
                'description': 'Premium paint protection film with 8-year warranty for superior protection.',
                'category': 'exterior',
                'hatchback_price': 75000,
                'sedan_price': 85000,
                'suv_price': 95000,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 240,
                'duration_max': 300,

                'is_global': True,
                'is_active': True,
            },
            
            # ============ BIKE SERVICES ============
            
            # Bike Wash
            {
                'name': 'Bike Wash',
                'description': 'Standard bike washing service with quality foam, rinse, and air dry. Includes chain cleaning and tire shine.',
                'category': 'bike_services',
                'bike_price': 150,
                'hatchback_price': 0,
                'sedan_price': 0,
                'suv_price': 0,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 20,
                'duration_max': 30,

                'is_global': True,
                'is_active': True,
            },
            
            # Premium Bike Wash
            {
                'name': 'Premium Bike Wash',
                'description': 'Premium bike washing with deep cleaning, chain lubrication, and protective wax coating.',
                'category': 'bike_services',
                'bike_price': 300,
                'hatchback_price': 0,
                'sedan_price': 0,
                'suv_price': 0,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 40,
                'duration_max': 50,

                'is_global': True,
                'is_active': True,
            },
            
            # Bike Detailing Work
            {
                'name': 'Bike Detailing Work',
                'description': 'Complete bike detailing including engine cleaning, chrome polishing, and protective coating application.',
                'category': 'bike_services',
                'bike_price': 800,
                'hatchback_price': 0,
                'sedan_price': 0,
                'suv_price': 0,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 90,
                'duration_max': 120,

                'is_global': True,
                'is_active': True,
            },
            
            # Bike Ceramic Coating
            {
                'name': 'Bike Ceramic Coating',
                'description': 'Professional ceramic coating for bikes with 2-year warranty. Provides superior paint protection and shine.',
                'category': 'bike_services',
                'bike_price': 3500,
                'hatchback_price': 0,
                'sedan_price': 0,
                'suv_price': 0,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 120,
                'duration_max': 150,

                'is_global': True,
                'is_active': True,
            },
            
            # Bike Graphene Coating
            {
                'name': 'Bike Graphene Coating',
                'description': 'Advanced graphene coating for bikes with 3-year warranty. Ultimate protection against scratches and weather.',
                'category': 'bike_services',
                'bike_price': 5000,
                'hatchback_price': 0,
                'sedan_price': 0,
                'suv_price': 0,
                'gst_applicable': True,
                'gst_rate': 18.00,
                'duration': 150,
                'duration_max': 180,

                'is_global': True,
                'is_active': True,
            },
        ]        
        packages = []
        for data in global_packages_data:
            # Also set the legacy price field
            data['price'] = data['sedan_price']
            package = ServicePackage.objects.create(**data)
            packages.append(package)        
        # Branch-specific packages (if branches provided)
        if branches:
            branch_specific_packages = [
                {
                    'name': 'Premium Teflon Coating',
                    'description': 'Advanced teflon coating for enhanced paint protection and shine. Downtown exclusive.',
                    'category': 'coating',
                    'hatchback_price': 4999,
                    'sedan_price': 5999,
                    'suv_price': 7499,
                    'gst_applicable': True,
                    'gst_rate': 18.00,
                    'duration': 240,

                    'price': 5999,
                    'is_global': False,
                    'branch': branches[0]  # Downtown only
                },
                {
                    'name': 'Luxury Interior Detailing',
                    'description': 'Premium leather care, fabric protection, and cabin sanitization. Northside specialty.',
                    'category': 'interior',
                    'hatchback_price': 2499,
                    'sedan_price': 2999,
                    'suv_price': 3799,
                    'gst_applicable': True,
                    'gst_rate': 18.00,
                    'duration': 180,

                    'price': 2999,
                    'is_global': False,
                    'branch': branches[1]  # Northside only
                },
            ]
            
            for data in branch_specific_packages:
                package = ServicePackage.objects.create(**data)
                packages.append(package)
        
        # Global add-ons with proper pricing
        global_addons_data = [
            {
                'name': 'Engine Bay Cleaning',

                'price': 499,
                'duration': 30,
                'is_global': True,
                'is_active': True
            },
            {
                'name': 'Tire Dressing & Polish',

                'price': 199,
                'duration': 15,
                'is_global': True,
                'is_active': True
            },
            {
                'name': 'Odor Removal Treatment',

                'price': 599,
                'duration': 45,
                'is_global': True,
                'is_active': True
            },
            {
                'name': 'Rain Repellent Coating',

                'price': 699,
                'duration': 30,
                'is_global': True,
                'is_active': True
            },
            {
                'name': 'Seat Fabric Protection',

                'price': 899,
                'duration': 60,
                'is_global': True,
                'is_active': True
            },
            {
                'name': 'Alloy Wheel Polish',

                'price': 399,
                'duration': 45,
                'is_global': True,
                'is_active': True
            },
        ]
        
        addons = []
        for data in global_addons_data:
            addon = AddOn.objects.create(**data)
            addons.append(addon)
        
        # Branch-specific add-ons
        if branches:
            branch_specific_addons = [
                {
                    'name': 'Leather Conditioning',

                    'price': 799,
                    'duration': 45,
                    'is_global': False,
                    'branch': branches[0]
                },
                {
                    'name': 'Quick Interior Vacuum',

                    'price': 149,
                    'duration': 15,
                    'is_global': False,
                    'branch': branches[1]
                },
            ]
            
            for data in branch_specific_addons:
                addon = AddOn.objects.create(**data)
                addons.append(addon)
        
        return packages, addons

    def create_bookings(self, customers, packages, addons, branches):
        """Create bookings distributed across branches"""
        from bookings.models import Booking
        from customers.models import Vehicle
        
        bookings = []
        statuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
        
        for customer in customers:
            vehicles = list(customer.vehicles.all())
            if not vehicles:
                continue
            
            # Create 2-5 bookings per customer
            for _ in range(random.randint(2, 5)):
                vehicle = random.choice(vehicles)
                package = random.choice(packages)
                selected_addons = random.sample(addons, random.randint(0, 3))
                branch = random.choice(branches)  # Randomly assign to a branch
                
                # Random date within last 3 months or next month
                days_offset = random.randint(-90, 30)
                booking_datetime = timezone.now() + timedelta(days=days_offset)
                
                status = random.choice(statuses)
                if days_offset < 0:  # Past bookings
                    status = random.choice(['completed', 'cancelled'])
                elif days_offset > 7:  # Future bookings
                    status = random.choice(['pending', 'confirmed'])
                else:  # Near-term bookings
                    status = random.choice(['confirmed', 'in_progress'])
                
                total_price = float(package.sedan_price or package.price or 0) + sum(float(addon.price) for addon in selected_addons)
                
                booking = Booking.objects.create(
                    customer=customer,
                    vehicle=vehicle,
                    package=package,
                    booking_datetime=booking_datetime,
                    total_price=total_price,
                    status=status,
                    branch=branch,  # Assign to branch
                    notes=f'Customer requested service for {vehicle.brand} {vehicle.model} at {branch.name}'
                )
                
                # Add addons
                booking.addons.set(selected_addons)
                
                # Add pickup request for some bookings
                if random.choice([True, False]):
                    booking.pickup_required = True
                    booking.location = f'{random.randint(100, 9999)} {random.choice(["Main", "Oak", "Pine", "Maple"])} Street, {branch.city}'
                    booking.save()
                
                bookings.append(booking)
        
        return bookings

    def create_jobcards(self, bookings, staff_users):
        """Create job cards for confirmed/in_progress/completed bookings"""
        from jobcards.models import JobCard, JobCardPhoto
        
        jobcards = []
        confirmed_bookings = [b for b in bookings if b.status in ['confirmed', 'in_progress', 'completed']]
        
        for booking in confirmed_bookings:
            # Assign technician from the same branch
            branch_staff = [s for s in staff_users if s.branch == booking.branch]
            if not branch_staff:
                continue
                
            technician = random.choice(branch_staff)
            
            status = 'assigned'
            if booking.status == 'in_progress':
                status = random.choice(['started', 'in_progress'])
            elif booking.status == 'completed':
                status = 'completed'
            
            estimated_time = booking.booking_datetime + timedelta(minutes=booking.package.duration)
            
            jobcard = JobCard.objects.create(
                booking=booking,
                technician=technician,
                branch=booking.branch,  # Assign to same branch as booking
                company=booking.company,  # Set company for multi-tenancy filtering
                status=status,
                estimated_delivery_time=estimated_time,
                technician_notes=f'Working on {booking.vehicle.brand} {booking.vehicle.model} at {booking.branch.name}. ' + 
                               random.choice([
                                   'All systems checked.',
                                   'Minor issues found and fixed.',
                                   'Replaced necessary parts.',
                                   'Service completed successfully.'
                               ])
            )
            
            if status in ['started', 'in_progress', 'completed']:
                jobcard.started_at = booking.booking_datetime + timedelta(hours=random.randint(1, 3))
                jobcard.save()
            
            if status == 'completed':
                jobcard.completed_at = estimated_time - timedelta(minutes=random.randint(0, 60))
                jobcard.save()
            
            jobcards.append(jobcard)
        
        return jobcards

    def create_pickup_requests(self, bookings, staff_users):
        """Create pickup/drop requests"""
        from pickup.models import PickupDropRequest
        
        pickup_bookings = [b for b in bookings if b.pickup_required]
        
        for booking in pickup_bookings[:30]:  # Create for first 30 pickup requests
            # Assign driver from the same branch
            branch_staff = [s for s in staff_users if s.branch == booking.branch]
            driver = random.choice(branch_staff) if branch_staff and random.choice([True, False]) else None
            
            # Create pickup/drop request
            PickupDropRequest.objects.create(
                booking=booking,
                driver=driver,
                pickup_time=booking.booking_datetime - timedelta(hours=1) if random.choice([True, False]) else None,
                drop_time=booking.booking_datetime + timedelta(minutes=booking.package.duration + 120) if booking.status == 'completed' else None,
                status=random.choice(['pending', 'driver_assigned', 'picked_up', 'in_service', 'delivered']),
                pickup_notes=f'Scheduled for pickup from {booking.location}',
                drop_notes=f'Delivered to customer at {booking.branch.name}' if booking.status == 'completed' else ''
            )

    def create_payments(self, bookings):
        """Create payments"""
        from payments.models import Payment
        
        completed_bookings = [b for b in bookings if b.status == 'completed']
        
        for booking in completed_bookings:
            payment_methods = ['card', 'cash', 'upi', 'stripe']
            
            payment = Payment.objects.create(
                booking=booking,
                amount=booking.total_price,
                payment_method=random.choice(payment_methods),
                payment_status='completed',
                transaction_id=f'TXN{random.randint(100000, 999999)}'
            )

    def create_store_data(self, customers, branches=None):
        """Create store products and orders (global and branch-specific)"""
        from store.models import Product, Order, OrderItem
        
        # Global products
        global_products_data = [
            {'name': 'Premium Car Wax', 'description': 'Professional grade car wax', 'price': 29.99, 'stock': 50, 'is_global': True},
            {'name': 'Microfiber Towels (Pack of 10)', 'description': 'Ultra-soft microfiber towels', 'price': 19.99, 'stock': 100, 'is_global': True},
            {'name': 'Air Freshener', 'description': 'Long-lasting car air freshener', 'price': 9.99, 'stock': 200, 'is_global': True},
            {'name': 'Floor Mats Set', 'description': 'All-weather floor mats', 'price': 49.99, 'stock': 75, 'is_global': True},
            {'name': 'Dash Cam HD', 'description': '1080p dash camera with night vision', 'price': 89.99, 'stock': 30, 'is_global': True},
        ]
        
        products = []
        for data in global_products_data:
            product = Product.objects.create(**data)
            products.append(product)
        
        # Branch-specific products
        if branches:
            branch_products_data = [
                {'name': 'Custom Floor Mats - Downtown', 'description': 'Exclusive downtown design', 'price': 59.99, 'stock': 20, 'is_global': False, 'branch': branches[0]},
                {'name': 'LED Headlight Kit - Northside', 'description': 'High-performance LED kit', 'price': 79.99, 'stock': 15, 'is_global': False, 'branch': branches[1]},
                {'name': 'Premium Seat Covers - Eastside', 'description': 'Luxury leather seat covers', 'price': 149.99, 'stock': 10, 'is_global': False, 'branch': branches[2]},
            ]
            
            for data in branch_products_data:
                product = Product.objects.create(**data)
                products.append(product)
        
        # Create some orders
        for customer in customers[:10]:  # First 10 customers
            for _ in range(random.randint(0, 2)):
                order = Order.objects.create(
                    customer=customer,
                    status=random.choice(['pending', 'processing', 'shipped', 'delivered']),
                    total_amount=0,
                    shipping_address=f'{random.randint(100, 9999)} {random.choice(["Main", "Oak", "Pine", "Maple"])} Street, {random.choice(["Springfield", "Riverside", "Lakeside"])}'
                )
                
                # Add 1-4 items to order (only global products for orders)
                total = 0
                global_products = [p for p in products if p.is_global]
                for _ in range(random.randint(1, 4)):
                    product = random.choice(global_products)
                    quantity = random.randint(1, 3)
                    
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=quantity
                    )
                    total += float(product.price) * quantity
                
                order.total_amount = total
                order.save()

    def create_feedback(self, bookings, customers):
        """Create feedback for completed bookings"""
        from feedback.models import Feedback
        
        completed_bookings = [b for b in bookings if b.status == 'completed']
        
        reviews = [
            'Excellent service! Very satisfied with the work done.',
            'Great experience, will definitely come back.',
            'Professional staff and quality work.',
            'Quick and efficient service.',
            'Good value for money.',
            'Staff was very helpful and knowledgeable.',
            'Clean facility and friendly atmosphere.',
            'Service was completed on time.',
            'Minor delays but overall satisfied.',
            'Could improve communication about progress.'
        ]
        
        for booking in completed_bookings[:25]:  # Create feedback for 25 completed bookings
            Feedback.objects.create(
                booking=booking,
                rating=random.randint(3, 5),
                review=random.choice(reviews)
            )
