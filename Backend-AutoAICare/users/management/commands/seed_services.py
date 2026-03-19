from django.core.management.base import BaseCommand
from services.models import ServicePackage, AddOn


class Command(BaseCommand):
    help = "Seed only service packages and add-ons"

    def add_arguments(self, parser):
        parser.add_argument(
            '--company',
            type=int,
            help='Company ID to seed services for (optional)',
        )

    def handle(self, *args, **options):
        from companies.models import Company
        
        company = None
        if options.get('company'):
            try:
                company = Company.objects.get(id=options['company'])
                self.stdout.write(self.style.SUCCESS(f"Seeding services for company: {company.name}"))
            except Company.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Company {options['company']} not found"))
                return

        self.stdout.write(self.style.SUCCESS("Seeding services..."))

        packages, addons = self.create_services(company)

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Created {len(packages)} packages and {len(addons)} add-ons"
            )
        )

    def create_services(self, company=None):
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
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
                'is_global': True if company is None else False,
                'is_active': True,
            },
        ]
        
        packages = []
        for data in packages_data:
            data['price'] = data['sedan_price']  # Set legacy price field
            data['company'] = company
            
            # Use update_or_create to avoid duplicates
            package, created = ServicePackage.objects.all_companies().update_or_create(
                company=company,
                name=data['name'],
                defaults=data
            )
            packages.append(package)
        
        # Add-ons - Complete from seed_data.py
        addons_data = [
            {'name': 'Engine Bay Cleaning', 'price': 499, 'duration': 30, 'is_active': True},
            {'name': 'Tire Dressing & Polish', 'price': 199, 'duration': 15, 'is_active': True},
            {'name': 'Odor Removal Treatment', 'price': 599, 'duration': 45, 'is_active': True},
            {'name': 'Rain Repellent Coating', 'price': 699, 'duration': 30, 'is_active': True},
            {'name': 'Seat Fabric Protection', 'price': 899, 'duration': 60, 'is_active': True},
            {'name': 'Alloy Wheel Polish', 'price': 399, 'duration': 45, 'is_active': True},
        ]
        
        addons = []
        for data in addons_data:
            data['company'] = company
            data['is_global'] = True if company is None else False
            
            addon, created = AddOn.objects.all_companies().update_or_create(
                company=company,
                name=data['name'],
                defaults=data
            )
            addons.append(addon)
        
        return packages, addons
