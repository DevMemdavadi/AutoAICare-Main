"""
Seed realistic parts data for car detailing services.
Run with: python manage.py shell < jobcards/seed_parts_data.py
"""

from decimal import Decimal
from jobcards.parts_catalog import Part
from branches.models import Branch

# Get the first branch or create a default one
try:
    branch = Branch.objects.first()
except:
    branch = None

# Clear existing parts (optional - comment out if you want to keep existing data)
# Part.objects.all().delete()

parts_data = [
    # Ceramic Coating Materials
    {
        'name': '9H Ceramic Coating - 30ml',
        'sku': 'CER-9H-30',
        'category': 'chemical',
        'description': 'Professional grade 9H ceramic coating for paint protection',
        'cost_price': Decimal('2500.00'),
        'selling_price': Decimal('3500.00'),
        'stock': 25,
        'min_stock_level': 5,
        'unit': 'bottles',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3214',
        'is_global': True
    },
    {
        'name': 'Ceramic Coating Prep Spray - 500ml',
        'sku': 'CER-PREP-500',
        'category': 'chemical',
        'description': 'Surface preparation spray for ceramic coating application',
        'cost_price': Decimal('450.00'),
        'selling_price': Decimal('650.00'),
        'stock': 40,
        'min_stock_level': 10,
        'unit': 'bottles',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3402',
        'is_global': True
    },
    
    # PPF Materials
    {
        'name': 'PPF Film Roll - 1.52m x 15m',
        'sku': 'PPF-ROLL-15',
        'category': 'material',
        'description': 'Premium paint protection film, self-healing technology',
        'cost_price': Decimal('18000.00'),
        'selling_price': Decimal('25000.00'),
        'stock': 8,
        'min_stock_level': 2,
        'unit': 'meters',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3919',
        'is_global': True
    },
    {
        'name': 'PPF Installation Solution - 1L',
        'sku': 'PPF-SOL-1L',
        'category': 'chemical',
        'description': 'Application solution for PPF installation',
        'cost_price': Decimal('350.00'),
        'selling_price': Decimal('500.00'),
        'stock': 30,
        'min_stock_level': 8,
        'unit': 'liters',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3402',
        'is_global': True
    },
    
    # Detailing Chemicals
    {
        'name': 'Premium Car Shampoo - 5L',
        'sku': 'SHMP-PREM-5L',
        'category': 'chemical',
        'description': 'pH neutral car wash shampoo with foam booster',
        'cost_price': Decimal('800.00'),
        'selling_price': Decimal('1200.00'),
        'stock': 50,
        'min_stock_level': 15,
        'unit': 'liters',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3402',
        'is_global': True
    },
    {
        'name': 'Iron Remover - 500ml',
        'sku': 'IRON-REM-500',
        'category': 'chemical',
        'description': 'Professional iron fallout remover for paint decontamination',
        'cost_price': Decimal('450.00'),
        'selling_price': Decimal('700.00'),
        'stock': 35,
        'min_stock_level': 10,
        'unit': 'bottles',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3402',
        'is_global': True
    },
    {
        'name': 'Clay Bar - Medium Grade',
        'sku': 'CLAY-MED-100',
        'category': 'material',
        'description': 'Medium grade clay bar for paint decontamination',
        'cost_price': Decimal('200.00'),
        'selling_price': Decimal('350.00'),
        'stock': 60,
        'min_stock_level': 20,
        'unit': 'pieces',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3407',
        'is_global': True
    },
    {
        'name': 'All Purpose Cleaner - 5L',
        'sku': 'APC-5L',
        'category': 'chemical',
        'description': 'Multi-surface all purpose cleaner concentrate',
        'cost_price': Decimal('600.00'),
        'selling_price': Decimal('900.00'),
        'stock': 45,
        'min_stock_level': 12,
        'unit': 'liters',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3402',
        'is_global': True
    },
    
    # Polish & Wax
    {
        'name': 'Compound Polish - 1L',
        'sku': 'POL-COMP-1L',
        'category': 'chemical',
        'description': 'Heavy cut compound for paint correction',
        'cost_price': Decimal('1200.00'),
        'selling_price': Decimal('1800.00'),
        'stock': 20,
        'min_stock_level': 5,
        'unit': 'liters',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3405',
        'is_global': True
    },
    {
        'name': 'Finishing Polish - 1L',
        'sku': 'POL-FIN-1L',
        'category': 'chemical',
        'description': 'Fine finishing polish for final refinement',
        'cost_price': Decimal('1000.00'),
        'selling_price': Decimal('1500.00'),
        'stock': 25,
        'min_stock_level': 6,
        'unit': 'liters',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3405',
        'is_global': True
    },
    {
        'name': 'Carnauba Wax - 200g',
        'sku': 'WAX-CARN-200',
        'category': 'chemical',
        'description': 'Premium carnauba paste wax',
        'cost_price': Decimal('1500.00'),
        'selling_price': Decimal('2200.00'),
        'stock': 15,
        'min_stock_level': 4,
        'unit': 'pieces',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3404',
        'is_global': True
    },
    
    # Interior Care
    {
        'name': 'Leather Cleaner - 500ml',
        'sku': 'LEATH-CLN-500',
        'category': 'chemical',
        'description': 'pH balanced leather cleaner and conditioner',
        'cost_price': Decimal('400.00'),
        'selling_price': Decimal('600.00'),
        'stock': 30,
        'min_stock_level': 8,
        'unit': 'bottles',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3402',
        'is_global': True
    },
    {
        'name': 'Dashboard Polish - 500ml',
        'sku': 'DASH-POL-500',
        'category': 'chemical',
        'description': 'UV protection dashboard and trim polish',
        'cost_price': Decimal('250.00'),
        'selling_price': Decimal('400.00'),
        'stock': 40,
        'min_stock_level': 10,
        'unit': 'bottles',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3405',
        'is_global': True
    },
    {
        'name': 'Fabric Cleaner - 1L',
        'sku': 'FAB-CLN-1L',
        'category': 'chemical',
        'description': 'Deep cleaning fabric and upholstery cleaner',
        'cost_price': Decimal('500.00'),
        'selling_price': Decimal('750.00'),
        'stock': 35,
        'min_stock_level': 10,
        'unit': 'liters',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3402',
        'is_global': True
    },
    
    # Glass Care
    {
        'name': 'Glass Cleaner - 500ml',
        'sku': 'GLS-CLN-500',
        'category': 'chemical',
        'description': 'Streak-free glass cleaner',
        'cost_price': Decimal('150.00'),
        'selling_price': Decimal('250.00'),
        'stock': 50,
        'min_stock_level': 15,
        'unit': 'bottles',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3402',
        'is_global': True
    },
    {
        'name': 'Rain Repellent - 100ml',
        'sku': 'RAIN-REP-100',
        'category': 'chemical',
        'description': 'Hydrophobic glass coating for windshield',
        'cost_price': Decimal('600.00'),
        'selling_price': Decimal('900.00'),
        'stock': 20,
        'min_stock_level': 5,
        'unit': 'bottles',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3214',
        'is_global': True
    },
    
    # Consumables
    {
        'name': 'Microfiber Towel - 40x40cm',
        'sku': 'MF-TWL-40',
        'category': 'consumable',
        'description': 'Premium 400GSM microfiber towel',
        'cost_price': Decimal('80.00'),
        'selling_price': Decimal('150.00'),
        'stock': 200,
        'min_stock_level': 50,
        'unit': 'pieces',
        'gst_rate': Decimal('12.00'),
        'hsn_code': '6307',
        'is_global': True
    },
    {
        'name': 'Foam Applicator Pad',
        'sku': 'FOAM-APP-PAD',
        'category': 'consumable',
        'description': 'Foam applicator pad for wax and sealant',
        'cost_price': Decimal('30.00'),
        'selling_price': Decimal('60.00'),
        'stock': 150,
        'min_stock_level': 40,
        'unit': 'pieces',
        'gst_rate': Decimal('12.00'),
        'hsn_code': '3926',
        'is_global': True
    },
    {
        'name': 'Polishing Pad - Cutting',
        'sku': 'POL-PAD-CUT',
        'category': 'consumable',
        'description': '6-inch cutting pad for machine polisher',
        'cost_price': Decimal('250.00'),
        'selling_price': Decimal('400.00'),
        'stock': 40,
        'min_stock_level': 10,
        'unit': 'pieces',
        'gst_rate': Decimal('12.00'),
        'hsn_code': '6805',
        'is_global': True
    },
    {
        'name': 'Polishing Pad - Finishing',
        'sku': 'POL-PAD-FIN',
        'category': 'consumable',
        'description': '6-inch finishing pad for machine polisher',
        'cost_price': Decimal('220.00'),
        'selling_price': Decimal('350.00'),
        'stock': 45,
        'min_stock_level': 12,
        'unit': 'pieces',
        'gst_rate': Decimal('12.00'),
        'hsn_code': '6805',
        'is_global': True
    },
    {
        'name': 'Masking Tape - 2 inch',
        'sku': 'MASK-TAPE-2',
        'category': 'consumable',
        'description': 'Automotive masking tape roll',
        'cost_price': Decimal('120.00'),
        'selling_price': Decimal('200.00'),
        'stock': 80,
        'min_stock_level': 20,
        'unit': 'pieces',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3919',
        'is_global': True
    },
    
    # Tools & Equipment (Spare Parts)
    {
        'name': 'Dual Action Polisher Backing Plate',
        'sku': 'DA-BACK-PLATE',
        'category': 'spare',
        'description': 'Replacement backing plate for DA polisher',
        'cost_price': Decimal('800.00'),
        'selling_price': Decimal('1200.00'),
        'stock': 10,
        'min_stock_level': 3,
        'unit': 'pieces',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '8467',
        'is_global': True
    },
    {
        'name': 'Pressure Washer Nozzle Set',
        'sku': 'PW-NOZZLE-SET',
        'category': 'spare',
        'description': 'Quick connect nozzle set for pressure washer',
        'cost_price': Decimal('400.00'),
        'selling_price': Decimal('650.00'),
        'stock': 15,
        'min_stock_level': 4,
        'unit': 'sets',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '8424',
        'is_global': True
    },
    {
        'name': 'Vacuum Cleaner Filter',
        'sku': 'VAC-FILTER',
        'category': 'spare',
        'description': 'HEPA filter for wet/dry vacuum',
        'cost_price': Decimal('300.00'),
        'selling_price': Decimal('500.00'),
        'stock': 20,
        'min_stock_level': 6,
        'unit': 'pieces',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '8421',
        'is_global': True
    },
    
    # Tire & Wheel Care
    {
        'name': 'Tire Dressing - 500ml',
        'sku': 'TIRE-DRS-500',
        'category': 'chemical',
        'description': 'Long-lasting tire shine and protectant',
        'cost_price': Decimal('300.00'),
        'selling_price': Decimal('500.00'),
        'stock': 40,
        'min_stock_level': 10,
        'unit': 'bottles',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3403',
        'is_global': True
    },
    {
        'name': 'Wheel Cleaner - 1L',
        'sku': 'WHL-CLN-1L',
        'category': 'chemical',
        'description': 'Acid-free wheel and brake dust cleaner',
        'cost_price': Decimal('400.00'),
        'selling_price': Decimal('650.00'),
        'stock': 35,
        'min_stock_level': 10,
        'unit': 'liters',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '3402',
        'is_global': True
    },
    {
        'name': 'Tire Brush - Stiff Bristle',
        'sku': 'TIRE-BRSH',
        'category': 'tool',
        'description': 'Stiff bristle brush for tire cleaning',
        'cost_price': Decimal('150.00'),
        'selling_price': Decimal('250.00'),
        'stock': 30,
        'min_stock_level': 8,
        'unit': 'pieces',
        'gst_rate': Decimal('18.00'),
        'hsn_code': '9603',
        'is_global': True
    },
]

print("Creating parts...")
created_count = 0
updated_count = 0

for part_data in parts_data:
    # Check if part exists by SKU
    existing_part = Part.objects.filter(sku=part_data['sku']).first()
    
    if existing_part:
        # Update existing part
        for key, value in part_data.items():
            setattr(existing_part, key, value)
        existing_part.save()
        updated_count += 1
        print(f"Updated: {part_data['name']} ({part_data['sku']})")
    else:
        # Create new part
        Part.objects.create(**part_data)
        created_count += 1
        print(f"Created: {part_data['name']} ({part_data['sku']})")

print(f"\n✅ Seed complete!")
print(f"   Created: {created_count} parts")
print(f"   Updated: {updated_count} parts")
print(f"   Total: {Part.objects.count()} parts in database")
