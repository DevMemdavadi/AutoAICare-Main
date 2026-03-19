from django.core.management.base import BaseCommand
from customers.models import VehicleModel


class Command(BaseCommand):
    help = 'Fix incorrect vehicle_type values for existing car models in the database'

    # ── Correct classifications based on real-world Indian market ──────────────

    HATCHBACKS = {
        # Maruti Suzuki
        'Alto', 'Alto K10', 'S-Presso', 'Wagon R', 'Celerio', 'Swift',
        'Baleno', 'Ignis', 'Eeco', 'Omni', 'XL6',
        # Hyundai
        'Santro', 'Grand i10 NIOS', 'i20', 'i20 N Line',
        # Tata
        'Tiago', 'Tiago NRG', 'Tigor', 'Tigor EV', 'Altroz', 'Indica',
        # Mahindra
        'KUV100',
        # Renault
        'Kwid', 'Triber', 'Kiger', 'Duster',
        # Nissan
        'Magnite', 'Kicks',
        # Honda
        'Jazz',
        # Toyota
        'Glanza',
        # Volkswagen
        'Polo',
        # Chevrolet
        'Beat', 'Spark',
        # Fiat
        'Punto',
        # MG
        'Comet EV',
        # Citroen
        'C3', 'eC3',
        # Ford
        'Figo',
    }

    SEDANS = {
        # Maruti Suzuki
        'Dzire', 'Ciaz',
        # Hyundai
        'Aura', 'Verna', 'Elantra',
        # Tata
        'Indigo',
        # Honda
        'Amaze', 'City', 'City e:HEV',
        # Toyota
        'Camry', 'Hilux',
        # Volkswagen
        'Vento', 'Virtus',
        # Chevrolet
        'Cruze', 'Sail',
        # Fiat
        'Linea',
        # Skoda
        'Slavia', 'Superb',
        # Kia
        'EV6',
        # Ford
        'Aspire',
    }

    SUVS = {
        # Maruti Suzuki
        'Ertiga', 'Brezza', 'S-Cross', 'Fronx', 'Grand Vitara', 'Jimny',
        # Hyundai
        'Venue', 'Venue N Line', 'Creta', 'Alcazar', 'Tucson',
        'Kona Electric', 'Ioniq 5',
        # Tata
        'Punch', 'Nexon', 'Nexon EV', 'Harrier', 'Safari', 'Hexa', 'Aria', 'Sumo',
        # Mahindra
        'XUV300', 'XUV400', 'Bolero', 'Bolero Neo', 'Thar',
        'Scorpio', 'Scorpio N', 'Scorpio Classic', 'XUV500', 'XUV700',
        'Marazzo', 'Alturas G4',
        # Kia
        'Sonet', 'Seltos', 'Carens',
        # Honda
        'Elevate', 'CR-V',
        # Toyota
        'Innova Crysta', 'Innova Hycross', 'Fortuner', 'Vellfire',
        'Urban Cruiser Hyryder',
        # Skoda
        'Kushaq', 'Kodiaq',
        # Volkswagen
        'Taigun', 'Tiguan',
        # MG
        'Astor', 'Hector', 'Hector Plus', 'ZS EV', 'Gloster',
        # Jeep
        'Compass', 'Meridian', 'Wrangler',
        # Citroen
        'C3 Aircross',
        # Ford
        'EcoSport', 'Endeavour',
        # Chevrolet
        'Tavera',
        # Fiat
        'Avventura',
    }

    def handle(self, *args, **kwargs):
        self.stdout.write('🔧 Fixing vehicle types in the database...\n')

        hatchback_fixed = 0
        sedan_fixed = 0
        suv_fixed = 0
        skipped = 0

        # Only update car models (exclude bikes)
        car_models = VehicleModel.objects.exclude(vehicle_type='bike')

        for model in car_models:
            if model.name in self.HATCHBACKS:
                correct_type = 'hatchback'
            elif model.name in self.SUVS:
                correct_type = 'suv'
            elif model.name in self.SEDANS:
                correct_type = 'sedan'
            else:
                skipped += 1
                continue  # already correct or unknown — leave untouched

            if model.vehicle_type != correct_type:
                self.stdout.write(
                    f'  ✏️  {model.brand.name} {model.name}: '
                    f'{model.vehicle_type} → {correct_type}'
                )
                model.vehicle_type = correct_type
                model.save(update_fields=['vehicle_type'])

                if correct_type == 'hatchback':
                    hatchback_fixed += 1
                elif correct_type == 'suv':
                    suv_fixed += 1
                else:
                    sedan_fixed += 1
            else:
                skipped += 1

        total_fixed = hatchback_fixed + sedan_fixed + suv_fixed
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'✅ Done! Fixed {total_fixed} models:'))
        self.stdout.write(self.style.SUCCESS(f'   → hatchback: {hatchback_fixed}'))
        self.stdout.write(self.style.SUCCESS(f'   → sedan:     {sedan_fixed}'))
        self.stdout.write(self.style.SUCCESS(f'   → suv:       {suv_fixed}'))
        self.stdout.write(f'   (skipped {skipped} already-correct or unrecognised models)')
