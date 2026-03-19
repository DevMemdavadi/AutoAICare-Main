from django.core.management.base import BaseCommand
from customers.models import VehicleBrand, VehicleModel, VehicleColor


class Command(BaseCommand):
    help = 'Seed the database with Indian car and bike brands, models, and colors'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding vehicle data...')
        
        # Clear existing data
        if input('Do you want to clear existing vehicle data? (yes/no): ').lower() == 'yes':
            VehicleModel.objects.all().delete()
            VehicleBrand.objects.all().delete()
            VehicleColor.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing data cleared'))
        
        # Seed colors
        self.stdout.write('Seeding colors...')
        colors = [
            'White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Brown',
            'Green', 'Orange', 'Yellow', 'Beige', 'Gold', 'Purple',
            'Pink', 'Maroon', 'Other'
        ]
        for color_name in colors:
            VehicleColor.objects.get_or_create(name=color_name)
        self.stdout.write(self.style.SUCCESS(f'✓ Seeded {len(colors)} colors'))
        
        # Seed car brands and models
        self.stdout.write('Seeding car brands and models...')
        car_brands_data = {
            'Maruti Suzuki': [
                'Alto', 'Alto K10', 'S-Presso', 'Wagon R', 'Celerio', 'Swift',
                'Dzire', 'Baleno', 'Ignis', 'Ciaz', 'Ertiga', 'XL6',
                'Brezza', 'S-Cross', 'Fronx', 'Grand Vitara', 'Jimny', 'Eeco', 'Omni'
            ],
            'Hyundai': [
                'Santro', 'Grand i10 NIOS', 'i20', 'i20 N Line', 'Aura', 'Verna',
                'Elantra', 'Venue', 'Venue N Line', 'Creta', 'Alcazar', 'Tucson',
                'Kona Electric', 'Ioniq 5'
            ],
            'Tata': [
                'Tiago', 'Tiago NRG', 'Tigor', 'Tigor EV', 'Altroz', 'Punch',
                'Nexon', 'Nexon EV', 'Harrier', 'Safari', 'Hexa', 'Aria',
                'Sumo', 'Indica', 'Indigo'
            ],
            'Mahindra': [
                'KUV100', 'XUV300', 'XUV400', 'Bolero', 'Bolero Neo', 'Thar',
                'Scorpio', 'Scorpio N', 'Scorpio Classic', 'XUV500', 'XUV700',
                'Marazzo', 'Alturas G4'
            ],
            'Kia': ['Sonet', 'Seltos', 'Carens', 'EV6'],
            'Honda': ['Amaze', 'Jazz', 'City', 'City e:HEV', 'Elevate', 'CR-V'],
            'Toyota': [
                'Glanza', 'Urban Cruiser Hyryder', 'Innova Crysta',
                'Innova Hycross', 'Fortuner', 'Hilux', 'Camry', 'Vellfire'
            ],
            'Renault': ['Kwid', 'Triber', 'Kiger', 'Duster'],
            'Nissan': ['Magnite', 'Kicks'],
            'Skoda': ['Kushaq', 'Slavia', 'Kodiaq', 'Superb'],
            'Volkswagen': ['Polo', 'Vento', 'Taigun', 'Virtus', 'Tiguan'],
            'MG': ['Comet EV', 'Astor', 'Hector', 'Hector Plus', 'ZS EV', 'Gloster'],
            'Jeep': ['Compass', 'Meridian', 'Wrangler'],
            'Citroen': ['C3', 'C3 Aircross', 'eC3'],
            'Ford': ['EcoSport', 'Figo', 'Aspire', 'Endeavour'],
            'Chevrolet': ['Beat', 'Spark', 'Sail', 'Cruze', 'Tavera'],
            'Fiat': ['Punto', 'Linea', 'Avventura'],
        }
        
        car_count = 0
        for brand_name, models in car_brands_data.items():
            brand, _ = VehicleBrand.objects.get_or_create(
                name=brand_name,
                defaults={'vehicle_type': 'car'}
            )
            
            # Explicit vehicle type mapping — accurate per real-world Indian market classification
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

            for model_name in models:
                if model_name in HATCHBACKS:
                    vehicle_type = 'hatchback'
                elif model_name in SUVS:
                    vehicle_type = 'suv'
                elif model_name in SEDANS:
                    vehicle_type = 'sedan'
                else:
                    vehicle_type = 'sedan'  # safe default

                VehicleModel.objects.get_or_create(
                    brand=brand,
                    name=model_name,
                    defaults={'vehicle_type': vehicle_type}
                )
                car_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'✓ Seeded {len(car_brands_data)} car brands with {car_count} models'
        ))
        
        # Seed bike brands and models
        self.stdout.write('Seeding bike brands and models...')
        bike_brands_data = {
            'Hero MotoCorp': [
                'Splendor Plus', 'HF Deluxe', 'Passion Pro', 'Super Splendor',
                'Glamour', 'Xtreme 160R', 'Xpulse 200', 'Xpulse 200 4V',
                'Karizma XMR', 'Maestro Edge', 'Pleasure Plus', 'Destini 125', 'Vida V1'
            ],
            'Bajaj': [
                'Platina', 'CT 110', 'Pulsar 125', 'Pulsar 150', 'Pulsar N150',
                'Pulsar N160', 'Pulsar 220F', 'Pulsar NS200', 'Pulsar NS160',
                'Pulsar RS200', 'Dominar 250', 'Dominar 400', 'Avenger Cruise 220',
                'Avenger Street 160', 'Chetak Electric'
            ],
            'TVS': [
                'Sport', 'Star City Plus', 'Radeon', 'Apache RTR 160',
                'Apache RTR 160 4V', 'Apache RTR 180', 'Apache RTR 200 4V',
                'Apache RR 310', 'Ronin', 'Jupiter', 'Jupiter 125',
                'Ntorq 125', 'iQube Electric', 'XL100'
            ],
            'Honda': [
                'Shine', 'SP 125', 'Unicorn', 'CB350', 'Hornet 2.0',
                'CB300F', 'CB300R', 'Activa', 'Activa 125', 'Dio', 'Grazia'
            ],
            'Royal Enfield': [
                'Classic 350', 'Bullet 350', 'Hunter 350', 'Meteor 350',
                'Scram 411', 'Himalayan', 'Continental GT 650', 'Interceptor 650',
                'Super Meteor 650', 'Shotgun 650'
            ],
            'Yamaha': [
                'Saluto', 'FZ-S', 'FZ-X', 'FZS-Fi', 'MT-15', 'R15', 'R15M',
                'Aerox 155', 'Ray ZR', 'Fascino', 'Fascino 125'
            ],
            'Suzuki': [
                'Hayate', 'Gixxer', 'Gixxer SF', 'Gixxer 250', 'Gixxer SF 250',
                'Avenis', 'Access 125', 'Burgman Street'
            ],
            'KTM': [
                '125 Duke', '200 Duke', '250 Duke', '390 Duke', 'RC 125',
                'RC 200', 'RC 390', '250 Adventure', '390 Adventure'
            ],
            'Ola Electric': ['S1 Pro', 'S1 Air', 'S1 X'],
            'Ather': ['450X', '450S', '450 Apex'],
            'Jawa': ['Jawa 42', 'Jawa Perak', 'Jawa 350'],
            'Yezdi': ['Roadster', 'Scrambler', 'Adventure'],
        }
        
        bike_count = 0
        for brand_name, models in bike_brands_data.items():
            brand, _ = VehicleBrand.objects.get_or_create(
                name=brand_name,
                defaults={'vehicle_type': 'bike'}
            )
            
            # All bikes have vehicle_type 'bike'
            for model_name in models:
                VehicleModel.objects.get_or_create(
                    brand=brand, 
                    name=model_name,
                    defaults={'vehicle_type': 'bike'}
                )
                bike_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'✓ Seeded {len(bike_brands_data)} bike brands with {bike_count} models'
        ))
        
        self.stdout.write(self.style.SUCCESS('\n✅ Vehicle data seeding completed successfully!'))
        self.stdout.write(self.style.SUCCESS(f'Total: {len(car_brands_data) + len(bike_brands_data)} brands, {car_count + bike_count} models, {len(colors)} colors'))
