"""
Management command to create service-to-parts mappings based on common usage patterns.
This links service packages to the parts they typically require.

Usage: python manage.py seed_service_parts
"""

from django.core.management.base import BaseCommand
from decimal import Decimal
from services.models import ServicePackage
from services.service_parts import ServicePackagePart
from jobcards.parts_catalog import Part


class Command(BaseCommand):
    help = 'Create service-to-parts mappings for automatic inventory deduction'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing service-parts mappings before creating new ones',
        )
        parser.add_argument(
            '--company',
            type=int,
            help='Company ID to seed service parts for (required)',
            required=True,
        )

    def handle(self, *args, **options):
        from companies.models import Company
        
        # Get the company
        company_id = options['company']
        try:
            company = Company.objects.get(id=company_id)
            self.stdout.write(self.style.SUCCESS(f'Seeding service parts for company: {company.name}'))
        except Company.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Company with ID {company_id} not found'))
            return
        
        if options['clear']:
            self.stdout.write('Clearing existing service-parts mappings for this company...')
            ServicePackagePart.objects.all_companies().filter(company=company).delete()
            self.stdout.write(self.style.SUCCESS('✓ Cleared'))

        self.stdout.write('Creating service-to-parts mappings...')
        
        created_count = 0
        skipped_count = 0

        # Define service-to-parts mappings
        # Format: {service_name_pattern: [(part_sku, quantity, vehicle_overrides)]}
        mappings = {
            # Car Wash Services
            'Car Wash': [
                ('SHMP-PREM-5L', 0.05, {}),  # 50ml shampoo per wash
                ('MF-TWL-40', 2, {}),  # 2 microfiber towels
            ],
            'Premium Wash': [
                ('SHMP-PREM-5L', 0.1, {}),  # 100ml shampoo
                ('TIRE-DRS-500', 0.05, {}),  # 50ml tire dressing
                ('DASH-POL-500', 0.03, {}),  # 30ml dashboard polish
                ('MF-TWL-40', 3, {}),  # 3 towels
            ],
            'Bike Wash': [
                ('SHMP-PREM-5L', 0.03, {}),  # 30ml shampoo
                ('MF-TWL-40', 1, {}),  # 1 towel
            ],
            
            # Interior Cleaning
            'Interior Cleaning': [
                ('APC-5L', 0.3, {'sedan': 0.3, 'suv': 0.4}),  # All purpose cleaner
                ('FAB-CLN-1L', 0.2, {'sedan': 0.2, 'suv': 0.3}),  # Fabric cleaner
                ('DASH-POL-500', 0.05, {}),  # Dashboard polish
                ('MF-TWL-40', 4, {}),  # 4 towels
            ],
            'Interior Deep Cleaning': [
                ('APC-5L', 0.5, {'sedan': 0.5, 'suv': 0.7}),
                ('FAB-CLN-1L', 0.3, {'sedan': 0.3, 'suv': 0.5}),
                ('LEATH-CLN-500', 0.1, {}),  # Leather cleaner
                ('DASH-POL-500', 0.05, {}),
                ('MF-TWL-40', 6, {}),
            ],
            
            # Exterior Services
            'Exterior Beautification': [
                ('SHMP-PREM-5L', 0.15, {}),
                ('POL-COMP-1L', 0.1, {'sedan': 0.1, 'suv': 0.15}),  # Compound polish
                ('POL-FIN-1L', 0.1, {'sedan': 0.1, 'suv': 0.15}),  # Finishing polish
                ('WAX-CARN-200', 0.02, {}),  # Carnauba wax
                ('MF-TWL-40', 8, {}),
                ('POL-PAD-CUT', 2, {}),  # Cutting pads
                ('POL-PAD-FIN', 2, {}),  # Finishing pads
            ],
            'Exterior Detailing': [
                ('SHMP-PREM-5L', 0.1, {}),
                ('CLAY-MED-100', 1, {}),  # Clay bar
                ('IRON-REM-500', 0.1, {}),  # Iron remover
                ('POL-COMP-1L', 0.08, {}),
                ('WAX-CARN-200', 0.02, {}),
                ('MF-TWL-40', 6, {}),
            ],
            
            # Coating Services
            'Ceramic Coating': [
                ('CER-9H-30', 1, {}),  # 1 bottle ceramic coating
                ('CER-PREP-500', 0.2, {}),  # Prep spray
                ('CLAY-MED-100', 1, {}),
                ('IRON-REM-500', 0.15, {}),
                ('POL-COMP-1L', 0.1, {}),
                ('MF-TWL-40', 10, {}),
                ('FOAM-APP-PAD', 5, {}),
            ],
            'Graphene Coating': [
                ('CER-9H-30', 1, {}),  # Using ceramic as placeholder for graphene
                ('CER-PREP-500', 0.2, {}),
                ('CLAY-MED-100', 1, {}),
                ('IRON-REM-500', 0.15, {}),
                ('MF-TWL-40', 10, {}),
                ('FOAM-APP-PAD', 5, {}),
            ],
            
            # Makeover Services
            'Makeover': [
                ('SHMP-PREM-5L', 0.15, {}),
                ('APC-5L', 0.3, {}),
                ('FAB-CLN-1L', 0.2, {}),
                ('DASH-POL-500', 0.05, {}),
                ('TIRE-DRS-500', 0.05, {}),
                ('MF-TWL-40', 8, {}),
            ],
        }

        from django.db import models

        # Process each mapping
        for service_pattern, parts_list in mappings.items():
            # Find matching service packages for this company or global
            services = ServicePackage.objects.all_companies().filter(
                models.Q(company=company) | models.Q(company__isnull=True),
                name__icontains=service_pattern,
                is_active=True,
            )
            
            if not services.exists():
                self.stdout.write(
                    self.style.WARNING(f'  ⚠ No services found matching "{service_pattern}" for {company.name}')
                )
                continue
            
            for service in services:
                for part_sku, quantity, vehicle_overrides in parts_list:
                    try:
                        # Find the part for this company or global
                        part = Part.objects.all_companies().filter(
                            models.Q(company=company) | models.Q(company__isnull=True),
                            sku=part_sku,
                            is_active=True,
                        ).order_by('company').first() # Prefer company-specific part if both exist
                        
                        if not part:
                            self.stdout.write(
                                self.style.WARNING(f'  ⚠ Part not found: {part_sku} for {company.name}')
                            )
                            skipped_count += 1
                            continue
                        
                        # Use update_or_create for the mapping
                        mapping, created = ServicePackagePart.objects.all_companies().update_or_create(
                            company=company,
                            package=service,
                            part=part,
                            defaults={
                                'quantity': Decimal(str(quantity)),
                                'hatchback_quantity': Decimal(str(vehicle_overrides.get('hatchback'))) if 'hatchback' in vehicle_overrides else None,
                                'sedan_quantity': Decimal(str(vehicle_overrides.get('sedan'))) if 'sedan' in vehicle_overrides else None,
                                'suv_quantity': Decimal(str(vehicle_overrides.get('suv'))) if 'suv' in vehicle_overrides else None,
                                'bike_quantity': Decimal(str(vehicle_overrides.get('bike'))) if 'bike' in vehicle_overrides else None,
                                'is_active': True,
                            }
                        )
                        
                        if created:
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f'  ✓ Created: {service.name} → {part.name} ({quantity} {part.unit})'
                                )
                            )
                            created_count += 1
                        else:
                            self.stdout.write(
                                f'  - Updated: {service.name} → {part.name}'
                            )
                            skipped_count += 1
                            
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'  ✗ Error creating/updating mapping: {e}')
                        )
                        skipped_count += 1

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'✅ Seed complete for {company.name}!'))
        self.stdout.write(f'   Created: {created_count} mappings')
        self.stdout.write(f'   Skipped: {skipped_count} mappings')
        total_mappings = ServicePackagePart.objects.all_companies().filter(company=company).count()
        self.stdout.write(f'   Total: {total_mappings} mappings in database for this company')
        self.stdout.write('='*60)
