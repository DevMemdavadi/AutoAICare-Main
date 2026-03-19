/**
 * Vehicle data for Indian car and bike brands with their models and years
 * This data is used for autocomplete in vehicle registration forms
 */

// Generate years from 1990 to current year + 1
const currentYear = new Date().getFullYear();
export const VEHICLE_YEARS = Array.from(
    { length: currentYear - 1989 + 2 },
    (_, i) => (1990 + i).toString()
).reverse(); // Reverse to show newest years first

// Common car colors
export const VEHICLE_COLORS = [
    'White',
    'Black',
    'Silver',
    'Grey',
    'Red',
    'Blue',
    'Brown',
    'Green',
    'Orange',
    'Yellow',
    'Beige',
    'Gold',
    'Purple',
    'Pink',
    'Maroon',
    'Other',
];

// Indian car brands and their models
export const CAR_BRANDS = {
    'Maruti Suzuki': [
        'Alto',
        'Alto K10',
        'S-Presso',
        'Wagon R',
        'Celerio',
        'Swift',
        'Dzire',
        'Baleno',
        'Ignis',
        'Ciaz',
        'Ertiga',
        'XL6',
        'Brezza',
        'S-Cross',
        'Fronx',
        'Grand Vitara',
        'Jimny',
        'Eeco',
        'Omni',
    ],
    Hyundai: [
        'Santro',
        'Grand i10 NIOS',
        'i20',
        'i20 N Line',
        'Aura',
        'Verna',
        'Elantra',
        'Venue',
        'Venue N Line',
        'Creta',
        'Alcazar',
        'Tucson',
        'Kona Electric',
        'Ioniq 5',
    ],
    Tata: [
        'Tiago',
        'Tiago NRG',
        'Tigor',
        'Tigor EV',
        'Altroz',
        'Punch',
        'Nexon',
        'Nexon EV',
        'Harrier',
        'Safari',
        'Hexa',
        'Aria',
        'Sumo',
        'Indica',
        'Indigo',
    ],
    Mahindra: [
        'KUV100',
        'XUV300',
        'XUV400',
        'Bolero',
        'Bolero Neo',
        'Thar',
        'Scorpio',
        'Scorpio N',
        'Scorpio Classic',
        'XUV500',
        'XUV700',
        'Marazzo',
        'Alturas G4',
    ],
    Kia: [
        'Sonet',
        'Seltos',
        'Carens',
        'EV6',
    ],
    Honda: [
        'Amaze',
        'Jazz',
        'City',
        'City e:HEV',
        'Elevate',
        'CR-V',
    ],
    Toyota: [
        'Glanza',
        'Urban Cruiser Hyryder',
        'Innova Crysta',
        'Innova Hycross',
        'Fortuner',
        'Hilux',
        'Camry',
        'Vellfire',
    ],
    Renault: [
        'Kwid',
        'Triber',
        'Kiger',
        'Duster',
    ],
    Nissan: [
        'Magnite',
        'Kicks',
    ],
    Skoda: [
        'Kushaq',
        'Slavia',
        'Kodiaq',
        'Superb',
    ],
    Volkswagen: [
        'Polo',
        'Vento',
        'Taigun',
        'Virtus',
        'Tiguan',
    ],
    MG: [
        'Comet EV',
        'Astor',
        'Hector',
        'Hector Plus',
        'ZS EV',
        'Gloster',
    ],
    Jeep: [
        'Compass',
        'Meridian',
        'Wrangler',
    ],
    Citroen: [
        'C3',
        'C3 Aircross',
        'eC3',
    ],
    Ford: [
        'EcoSport',
        'Figo',
        'Aspire',
        'Endeavour',
    ],
    Chevrolet: [
        'Beat',
        'Spark',
        'Sail',
        'Cruze',
        'Tavera',
    ],
    Fiat: [
        'Punto',
        'Linea',
        'Avventura',
    ],
};

// Indian bike brands and their models
export const BIKE_BRANDS = {
    'Hero MotoCorp': [
        'Splendor Plus',
        'HF Deluxe',
        'Passion Pro',
        'Super Splendor',
        'Glamour',
        'Xtreme 160R',
        'Xpulse 200',
        'Xpulse 200 4V',
        'Karizma XMR',
        'Maestro Edge',
        'Pleasure Plus',
        'Destini 125',
        'Vida V1',
    ],
    'Bajaj': [
        'Platina',
        'CT 110',
        'Pulsar 125',
        'Pulsar 150',
        'Pulsar N150',
        'Pulsar N160',
        'Pulsar 220F',
        'Pulsar NS200',
        'Pulsar NS160',
        'Pulsar RS200',
        'Dominar 250',
        'Dominar 400',
        'Avenger Cruise 220',
        'Avenger Street 160',
        'Chetak Electric',
    ],
    'TVS': [
        'Sport',
        'Star City Plus',
        'Radeon',
        'Apache RTR 160',
        'Apache RTR 160 4V',
        'Apache RTR 180',
        'Apache RTR 200 4V',
        'Apache RR 310',
        'Ronin',
        'Jupiter',
        'Jupiter 125',
        'Ntorq 125',
        'iQube Electric',
        'XL100',
    ],
    'Honda': [
        'Shine',
        'SP 125',
        'Unicorn',
        'CB350',
        'Hornet 2.0',
        'CB300F',
        'CB300R',
        'Activa',
        'Activa 125',
        'Dio',
        'Grazia',
    ],
    'Royal Enfield': [
        'Classic 350',
        'Bullet 350',
        'Hunter 350',
        'Meteor 350',
        'Scram 411',
        'Himalayan',
        'Continental GT 650',
        'Interceptor 650',
        'Super Meteor 650',
        'Shotgun 650',
    ],
    'Yamaha': [
        'Saluto',
        'FZ-S',
        'FZ-X',
        'FZS-Fi',
        'MT-15',
        'R15',
        'R15M',
        'Aerox 155',
        'Ray ZR',
        'Fascino',
        'Fascino 125',
    ],
    'Suzuki': [
        'Hayate',
        'Gixxer',
        'Gixxer SF',
        'Gixxer 250',
        'Gixxer SF 250',
        'Avenis',
        'Access 125',
        'Burgman Street',
    ],
    'KTM': [
        '125 Duke',
        '200 Duke',
        '250 Duke',
        '390 Duke',
        'RC 125',
        'RC 200',
        'RC 390',
        '250 Adventure',
        '390 Adventure',
    ],
    'Ola Electric': [
        'S1 Pro',
        'S1 Air',
        'S1 X',
    ],
    'Ather': [
        '450X',
        '450S',
        '450 Apex',
    ],
    'Jawa': [
        'Jawa 42',
        'Jawa Perak',
        'Jawa 350',
    ],
    'Yezdi': [
        'Roadster',
        'Scrambler',
        'Adventure',
    ],
};

// Get all car brand names
export const CAR_BRAND_NAMES = Object.keys(CAR_BRANDS).sort();

// Get all bike brand names
export const BIKE_BRAND_NAMES = Object.keys(BIKE_BRANDS).sort();

// Get all brands (cars + bikes)
export const ALL_BRAND_NAMES = [...CAR_BRAND_NAMES, ...BIKE_BRAND_NAMES].sort();

/**
 * Get models for a specific brand
 * @param {string} brand - Brand name
 * @returns {Array<string>} - Array of model names
 */
export const getModelsForBrand = (brand) => {
    if (!brand) return [];

    // Check in car brands
    if (CAR_BRANDS[brand]) {
        return CAR_BRANDS[brand];
    }

    // Check in bike brands
    if (BIKE_BRANDS[brand]) {
        return BIKE_BRANDS[brand];
    }

    return [];
};

/**
 * Check if a brand is a car brand
 * @param {string} brand - Brand name
 * @returns {boolean}
 */
export const isCarBrand = (brand) => {
    return CAR_BRAND_NAMES.includes(brand);
};

/**
 * Check if a brand is a bike brand
 * @param {string} brand - Brand name
 * @returns {boolean}
 */
export const isBikeBrand = (brand) => {
    return BIKE_BRAND_NAMES.includes(brand);
};

/**
 * Get vehicle type based on brand
 * @param {string} brand - Brand name
 * @returns {string} - 'car', 'bike', or 'unknown'
 */
export const getVehicleType = (brand) => {
    if (isCarBrand(brand)) return 'car';
    if (isBikeBrand(brand)) return 'bike';
    return 'unknown';
};
