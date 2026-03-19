from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Complete system setup with Super Admin, K3 real branches, and all staff roles'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Starting complete system setup...'))
        
        # Clear existing data
        self.stdout.write('Clearing existing data...')
        self.clear_data()
        
        # Create Super Admin (separate, no branch)
        self.stdout.write('Creating Super Admin...')
        super_admin = self.create_super_admin()
        
        # Create K3 real branches
        self.stdout.write('Creating K3 real branches...')
        branches = self.create_k3_branches()
        
        # Create all staff for each branch
        self.stdout.write('Creating staff for all branches...')
        staff_data = self.create_staff_for_branches(branches)
        
        # Create customers and vehicles
        self.stdout.write('Creating customers and vehicles...')
        customers = self.create_customers()
        
        # Create service packages and add-ons
        self.stdout.write('Creating service packages and add-ons...')
        packages, addons = self.create_services(branches)
        
        # Create bookings
        self.stdout.write('Creating bookings...')
        bookings = self.create_bookings(customers, packages, addons, branches)
        
        # Create job cards
        self.stdout.write('Creating job cards...')
        jobcards = self.create_jobcards(bookings, staff_data['all_staff'])
        
        # Create pickup requests
        self.stdout.write('Creating pickup requests...')
        self.create_pickup_requests(bookings, staff_data['all_staff'])
        
        # Create payments
        self.stdout.write('Creating payments...')
        self.create_payments(bookings)
        
        # Create store products and orders
        self.stdout.write('Creating store products and orders...')
        self.create_store_data(customers, branches)
        
        # Create feedback
        self.stdout.write('Creating feedback...')
        self.create_feedback(bookings)
        
        self.print_summary(super_admin, branches, staff_data, customers, packages, addons, bookings)

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

    def create_super_admin(self):
        """Create Super Admin (no branch assignment)"""
        super_admin = User.objects.create_user(
            email='admin@k3carcare.com',
            name='Super Admin',
            password='admin123',
            role='super_admin',
            phone='9000000000',
            is_verified=True,
            is_active=True,
            is_staff=True,
            is_superuser=True,
            branch=None  # Super admin has no branch
        )
        self.stdout.write(self.style.SUCCESS(f'[OK] Super Admin created: {super_admin.email}'))
        return super_admin

    def create_k3_branches(self):
        """Create real K3 branches"""
        from branches.models import Branch
        
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
                'is_active': True
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
                'is_active': True
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
                'is_active': True
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
                'is_active': True
            }
        ]
        
        branches = []
        for data in branches_data:
            branch = Branch.objects.create(**data)
            branches.append(branch)
            self.stdout.write(self.style.SUCCESS(f'  [OK] Branch created: {branch.name} ({branch.code})'))
        
        return branches

    def create_staff_for_branches(self, branches):
        """Create all staff roles for each branch"""
        staff_data = {
            'branch_admins': [],
            'floor_managers': [],
            'supervisors': [],
            'applicators': [],
            'all_staff': []
        }
        
        branch_names_short = ['RAM', 'CDP', 'TRN', 'PNT']
        
        # Branch Admin Names
        admin_names = [
            'Prashant Kumar',
            'Nitin Sharma', 
            'Vishal Patel',
            'Arun Mehta'
        ]
        
        # Floor Manager Names
        fm_names = [
            'Rohit Mehta',
            'Amit Desai',
            'Akash Trivedi',
            'Karan Shah'
        ]
        
        # Supervisor Names (2 per branch)
        supervisor_names = [
            ['Vikram Singh', 'Sunil Joshi'],              # Shree Ramnagar
            ['Deepak Yadav', 'Ravi Kumar'],               # Chandpur
            ['Manoj Gupta', 'Sachin Patel'],              # Tarna
            ['Harish Verma', 'Naveen Sharma']             # Painting
        ]
        
        # Applicator Names (3 per branch)
        applicator_names = [
            ['Raj Kumar', 'Amit Patel', 'Suresh Sharma'],              # Shree Ramnagar
            ['Vijay Rana', 'Dinesh Verma', 'Ramesh Gupta'],            # Chandpur
            ['Prakash Joshi', 'Ashok Yadav', 'Mukesh Thakur'],         # Tarna
            ['Sanjay Singh', 'Anil Kumar', 'Bharat Yadav']             # Painting
        ]
        
        for i, branch in enumerate(branches):
            branch_short = branch_names_short[i]
            
            # Create Branch Admin (1 per branch)
            admin = User.objects.create_user(
                email=f'admin.{branch_short.lower()}@k3carcare.com',
                name=admin_names[i],
                password='admin123',
                role='branch_admin',
                phone=f'910100000{i}',
                is_verified=True,
                is_active=True,
                is_staff=True,
                branch=branch
            )
            staff_data['branch_admins'].append(admin)
            staff_data['all_staff'].append(admin)
            self.stdout.write(f'    [OK] Branch Admin: {admin.name} - {branch.name}')
            
            # Create Floor Manager (1 per branch)
            fm = User.objects.create_user(
                email=f'fm.{branch_short.lower()}@k3carcare.com',
                name=fm_names[i],
                password='fm123',
                role='floor_manager',
                phone=f'910300000{i}',
                is_verified=True,
                is_active=True,
                is_staff=True,
                branch=branch
            )
            staff_data['floor_managers'].append(fm)
            staff_data['all_staff'].append(fm)
            self.stdout.write(f'    [OK] Floor Manager: {fm.name} - {branch.name}')
            
            # Create Supervisors (2 per branch)
            for j, name in enumerate(supervisor_names[i]):
                supervisor = User.objects.create_user(
                    email=f'supervisor{j+1}.{branch_short.lower()}@k3carcare.com',
                    name=name,
                    password='super123',
                    role='supervisor',
                    phone=f'91040000{i}{j}',
                    is_verified=True,
                    is_active=True,
                    branch=branch
                )
                staff_data['supervisors'].append(supervisor)
                staff_data['all_staff'].append(supervisor)
                self.stdout.write(f'    [OK] Supervisor: {supervisor.name} - {branch.name}')
            
            # Create Applicators (3 per branch)
            for j, name in enumerate(applicator_names[i]):
                applicator = User.objects.create_user(
                    email=f'applicator{j+1}.{branch_short.lower()}@k3carcare.com',
                    name=name,
                    password='app123',
                    role='applicator',
                    phone=f'91050000{i}{j}',
                    is_verified=True,
                    is_active=True,
                    branch=branch
                )
                staff_data['applicators'].append(applicator)
                staff_data['all_staff'].append(applicator)
                self.stdout.write(f'    [OK] Applicator: {applicator.name} - {branch.name}')
        
        return staff_data

    def create_customers(self):
        """Create customer profiles and vehicles"""
        from customers.models import Customer, Vehicle
        
        customer_names = [
            'Arjun Kapoor', 'Priya Sharma', 'Rohit Verma', 'Sneha Gupta',
            'Kunal Mehta', 'Ananya Singh', 'Varun Patel', 'Diya Joshi',
            'Karan Rao', 'Ishita Shah', 'Siddharth Kumar', 'Neha Desai',
            'Aditya Trivedi', 'Riya Pandey', 'Harsh Malhotra', 'Pooja Agarwal',
            'Vivek Reddy', 'Meera Kulkarni', 'Rahul Nair', 'Simran Chopra'
        ]
        
        # Comprehensive vehicle data from seed_data.py
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
        
        customers = []
        vehicle_counter = 1000
        
        for i, name in enumerate(customer_names):
            # Create user
            user = User.objects.create_user(
                email=f'customer{i+1}@email.com',
                name=name,
                password='customer123',
                role='customer',
                phone=f'98000000{i:02d}',
                is_verified=True,
                is_active=True,
                branch=None  # Customers have no branch
            )
            
            # Create customer profile
            customer = Customer.objects.create(
                user=user,
                reward_points=random.randint(0, 1000)
            )
            customers.append(customer)
            
            # Create 1-3 vehicles per customer (matching seed_data.py behavior)
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
        
        self.stdout.write(self.style.SUCCESS(f'  [OK] Created {len(customers)} customers with vehicles'))
        return customers

    def create_services(self, branches):
        """Create service packages and add-ons"""
        from services.models import ServicePackage, AddOn
        
        # K3 Car Care Service Packages - Complete list from seed_data.py
        packages_data = [
            # Car Wash Services
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
            
            # Interior Services
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
            
            # Exterior Services
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
            
            # Premium Exterior
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
            
            # Coating Services
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
            
            # Paint Protection Films - PaintGuard Series
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
            
            # Paint Protection Films - GARWARE Series
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
            
            # Bike Services
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
        for data in packages_data:
            data['price'] = data['sedan_price']  # Set legacy price field
            package = ServicePackage.objects.create(**data)
            packages.append(package)
        
        # Add-ons - Complete from seed_data.py
        addons_data = [
            {'name': 'Engine Bay Cleaning', 'price': 499, 'duration': 30, 'is_global': True, 'is_active': True},
            {'name': 'Tire Dressing & Polish', 'price': 199, 'duration': 15, 'is_global': True, 'is_active': True},
            {'name': 'Odor Removal Treatment', 'price': 599, 'duration': 45, 'is_global': True, 'is_active': True},
            {'name': 'Rain Repellent Coating', 'price': 699, 'duration': 30, 'is_global': True, 'is_active': True},
            {'name': 'Seat Fabric Protection', 'price': 899, 'duration': 60, 'is_global': True, 'is_active': True},
            {'name': 'Alloy Wheel Polish', 'price': 399, 'duration': 45, 'is_global': True, 'is_active': True},
        ]
        
        addons = []
        for data in addons_data:
            addon = AddOn.objects.create(**data)
            addons.append(addon)
        
        self.stdout.write(self.style.SUCCESS(f'  [OK] Created {len(packages)} packages and {len(addons)} add-ons'))
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
            
            # Create 2-4 bookings per customer
            for _ in range(random.randint(2, 4)):
                vehicle = random.choice(vehicles)
                package = random.choice(packages)
                selected_addons = random.sample(addons, random.randint(0, 2))
                branch = random.choice(branches)
                
                # Random date within last 2 months or next month
                days_offset = random.randint(-60, 30)
                booking_datetime = timezone.now() + timedelta(days=days_offset)
                
                status = random.choice(statuses)
                if days_offset < 0:
                    status = random.choice(['completed', 'cancelled'])
                elif days_offset > 7:
                    status = random.choice(['pending', 'confirmed'])
                else:
                    status = random.choice(['confirmed', 'in_progress'])
                
                total_price = float(package.sedan_price or package.price or 0) + sum(float(addon.price) for addon in selected_addons)
                
                booking = Booking.objects.create(
                    customer=customer,
                    vehicle=vehicle,
                    package=package,
                    booking_datetime=booking_datetime,
                    total_price=total_price,
                    status=status,
                    branch=branch,
                    notes=f'Customer requested service for {vehicle.brand} {vehicle.model} at {branch.name}'
                )
                
                booking.addons.set(selected_addons)
                
                # Add pickup request for some bookings
                if random.choice([True, False]):
                    booking.pickup_required = True
                    booking.location = f'{random.randint(100, 9999)} {random.choice(["Satellite", "Vastrapur", "Paldi", "Navrangpura"])} Road, {branch.city}'
                    booking.save()
                
                bookings.append(booking)
        
        self.stdout.write(self.style.SUCCESS(f'  [OK] Created {len(bookings)} bookings'))
        return bookings

    def create_jobcards(self, bookings, staff_users):
        """Create job cards for confirmed/in_progress/completed bookings"""
        from jobcards.models import JobCard
        
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
                branch=booking.branch,
                company=booking.company,  # Set company for multi-tenancy filtering
                status=status,
                estimated_delivery_time=estimated_time,
                technician_notes=f'Working on {booking.vehicle.brand} {booking.vehicle.model}. ' + 
                               random.choice([
                                   'Service in progress.',
                                   'Quality check completed.',
                                   'All tasks completed successfully.',
                                   'Customer vehicle ready for delivery.'
                               ])
            )
            
            if status in ['started', 'in_progress', 'completed']:
                jobcard.started_at = booking.booking_datetime + timedelta(hours=random.randint(1, 2))
                jobcard.save()
            
            if status == 'completed':
                jobcard.completed_at = estimated_time - timedelta(minutes=random.randint(0, 30))
                jobcard.save()
            
            jobcards.append(jobcard)
        
        self.stdout.write(self.style.SUCCESS(f'  [OK] Created {len(jobcards)} job cards'))
        return jobcards

    def create_pickup_requests(self, bookings, staff_users):
        """Create pickup/drop requests"""
        from pickup.models import PickupDropRequest
        
        pickup_bookings = [b for b in bookings if b.pickup_required]
        
        for booking in pickup_bookings[:20]:
            branch_staff = [s for s in staff_users if s.branch == booking.branch]
            driver = random.choice(branch_staff) if branch_staff and random.choice([True, False]) else None
            
            PickupDropRequest.objects.create(
                booking=booking,
                driver=driver,
                pickup_time=booking.booking_datetime - timedelta(hours=1) if random.choice([True, False]) else None,
                drop_time=booking.booking_datetime + timedelta(minutes=booking.package.duration + 120) if booking.status == 'completed' else None,
                status=random.choice(['pending', 'driver_assigned', 'picked_up', 'in_service', 'delivered']),
                pickup_notes=f'Scheduled for pickup from {booking.location}',
                drop_notes=f'Delivered to customer' if booking.status == 'completed' else ''
            )
        
        self.stdout.write(self.style.SUCCESS(f'  [OK] Created pickup requests'))

    def create_payments(self, bookings):
        """Create payments for completed bookings"""
        from payments.models import Payment
        
        completed_bookings = [b for b in bookings if b.status == 'completed']
        
        for booking in completed_bookings:
            payment_methods = ['card', 'cash', 'upi', 'stripe']
            
            Payment.objects.create(
                booking=booking,
                amount=booking.total_price,
                payment_method=random.choice(payment_methods),
                payment_status='completed',
                transaction_id=f'K3TXN{random.randint(100000, 999999)}'
            )
        
        self.stdout.write(self.style.SUCCESS(f'  [OK] Created {len(completed_bookings)} payments'))

    def create_store_data(self, customers, branches):
        """Create store products and orders"""
        from store.models import Product, Order, OrderItem
        
        products_data = [
            {'name': 'K3 Premium Car Wax', 'description': 'Professional grade car wax', 'price': 599, 'stock': 50, 'is_global': True},
            {'name': 'Microfiber Towel Set (5 pcs)', 'description': 'Ultra-soft microfiber towels', 'price': 399, 'stock': 100, 'is_global': True},
            {'name': 'Car Air Freshener', 'description': 'Long-lasting premium fragrance', 'price': 199, 'stock': 200, 'is_global': True},
            {'name': 'Dashboard Polish', 'description': 'Premium dashboard cleaner', 'price': 249, 'stock': 75, 'is_global': True},
            {'name': 'Tire Shine Spray', 'description': 'Long-lasting tire shine', 'price': 299, 'stock': 60, 'is_global': True},
        ]
        
        products = []
        for data in products_data:
            product = Product.objects.create(**data)
            products.append(product)
        
        # Create some orders
        for customer in customers[:10]:
            for _ in range(random.randint(0, 2)):
                order = Order.objects.create(
                    customer=customer,
                    status=random.choice(['pending', 'processing', 'shipped', 'delivered']),
                    total_amount=0,
                    shipping_address=customer.user.name + ', ' + random.choice(['Ahmedabad', 'Surat', 'Vadodara'])
                )
                
                total = 0
                for _ in range(random.randint(1, 3)):
                    product = random.choice(products)
                    quantity = random.randint(1, 2)
                    
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=quantity
                    )
                    total += float(product.price) * quantity
                
                order.total_amount = total
                order.save()
        
        self.stdout.write(self.style.SUCCESS(f'  [OK] Created {len(products)} products and orders'))

    def create_feedback(self, bookings):
        """Create feedback for completed bookings"""
        from feedback.models import Feedback
        
        completed_bookings = [b for b in bookings if b.status == 'completed']
        
        reviews = [
            'Excellent service! Very professional team at K3 Car Care.',
            'Great experience, my car looks brand new!',
            'Professional staff and quality work.',
            'Quick and efficient service. Highly recommended.',
            'Best car detailing service in the city.',
            'Staff was very helpful and knowledgeable.',
            'Amazing work! Will definitely come back.',
            'Service was completed on time with great quality.',
        ]
        
        for booking in completed_bookings[:15]:
            Feedback.objects.create(
                booking=booking,
                rating=random.randint(4, 5),
                review=random.choice(reviews)
            )
        
        self.stdout.write(self.style.SUCCESS(f'  [OK] Created feedback'))

    def print_summary(self, super_admin, branches, staff_data, customers, packages, addons, bookings):
        """Print comprehensive summary"""
        self.stdout.write('\n' + '='*80)
        self.stdout.write(self.style.SUCCESS('COMPLETE SYSTEM SETUP SUCCESSFUL!'))
        self.stdout.write('='*80 + '\n')
        
        self.stdout.write(self.style.WARNING('CREDENTIALS:'))
        self.stdout.write(f'  Super Admin: {super_admin.email} / admin123\n')
        
        self.stdout.write(self.style.WARNING('BRANCHES CREATED:'))
        for branch in branches:
            self.stdout.write(f'  • {branch.name} ({branch.code})')
            self.stdout.write(f'    Location: {branch.city}, {branch.state}')
            self.stdout.write(f'    Email: {branch.email}\n')
        
        self.stdout.write(self.style.WARNING('STAFF SUMMARY (PER BRANCH):'))
        self.stdout.write(f'  • Branch Admins: {len(staff_data["branch_admins"])} (1 per branch)')
        self.stdout.write(f'  • Floor Managers: {len(staff_data["floor_managers"])} (1 per branch)')
        self.stdout.write(f'  • Supervisors: {len(staff_data["supervisors"])} (2 per branch)')
        self.stdout.write(f'  • Applicators: {len(staff_data["applicators"])} (3 per branch)')
        self.stdout.write(f'  • Total Staff: {len(staff_data["all_staff"])}\n')
        
        self.stdout.write(self.style.WARNING('DATA CREATED:'))
        self.stdout.write(f'  • Customers: {len(customers)}')
        self.stdout.write(f'  • Service Packages: {len(packages)}')
        self.stdout.write(f'  • Add-ons: {len(addons)}')
        self.stdout.write(f'  • Bookings: {len(bookings)}')
        
        self.stdout.write('\n' + self.style.SUCCESS('[SUCCESS] Your K3 Car Care system is ready to use!'))
        self.stdout.write('='*80)
        
        # Print login credentials for each role
        self.stdout.write('\n' + self.style.WARNING('SAMPLE LOGIN CREDENTIALS:'))
        self.stdout.write(f'\n  Super Admin:')
        self.stdout.write(f'    Email: admin@k3carcare.com')
        self.stdout.write(f'    Password: admin123\n')
        
        for i, branch in enumerate(branches):
            branch_short = ['RAM', 'CDP', 'TRN', 'PNT'][i]
            self.stdout.write(f'  {branch.name}:')
            self.stdout.write(f'    Branch Admin: admin.{branch_short.lower()}@k3carcare.com / admin123')
            self.stdout.write(f'    Floor Manager: fm.{branch_short.lower()}@k3carcare.com / fm123')
            self.stdout.write(f'    Supervisor: supervisor1.{branch_short.lower()}@k3carcare.com / super123')
            self.stdout.write(f'    Applicator: applicator1.{branch_short.lower()}@k3carcare.com / app123\n')
        
        self.stdout.write(f'  Customer Sample:')
        self.stdout.write(f'    Email: customer1@email.com')
        self.stdout.write(f'    Password: customer123\n')
