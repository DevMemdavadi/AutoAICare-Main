# K3 CAR CARE - COMPLETE SYSTEM SETUP SUMMARY

## Overview
This document describes the complete `setup_complete_system` management command that sets up the entire K3 Car Care system with all branches, staff, services, and data.

## Command Usage
```bash
python manage.py setup_complete_system
```

## What Gets Created

### 1. Super Admin (1)
- **Email**: admin@k3carcare.com
- **Password**: admin123
- **Access**: Full system access across all branches
- **Branch**: None (separate from branches)

### 2. Branches (4)
1. **K3 Car Care - Shree Ramnagar** (K3RAM)
   - Location: Ahmedabad, Gujarat
   - Email: ramnagar@k3carcare.com

2. **K3 Car Care - Chandpur** (K3CDP)
   - Location: Ahmedabad, Gujarat
   - Email: chandpur@k3carcare.com

3. **K3 Car Care - Tarna** (K3TRN)
   - Location: Ahmedabad, Gujarat
   - Email: tarna@k3carcare.com

4. **K3 Car Care - Painting Studio** (K3PNT)
   - Location: Ahmedabad, Gujarat
   - Email: painting@k3carcare.com

### 3. Staff per Branch (24 total)
Each branch gets:
- **1 Branch Admin**: Full admin access for that branch
- **1 Floor Manager**: Manages floor operations
- **2 Supervisors**: Supervise applicators and job cards
- **3 Applicators**: Execute service jobs

**Total Staff**: 4 + 4 + 8 + 12 = 28 staff members

### 4. Service Packages (19 total)

#### Car Wash (1)
- Normal Car Wash

#### Interior Services (1)
- Car Interior Cleaning

#### Exterior Services (4)
- Exterior Beautification
- Premium Exterior Beautification with Ceramic Polish
- Makeover Service
- (+ Paint Protection Films below)

#### Coating Services (3)
- Ceramic Coating (5 Year Warranty)
- Graphene Coating (7 Year Warranty)
- Elite Coating (10 Year Warranty – Polymer Coating)

#### Paint Protection Films - PaintGuard Series (3)
- PaintGuard (5 Years)
- PaintGuard (8 Years)
- PaintGuard (10 Years)

#### Paint Protection Films - GARWARE Series (3)
- GARWARE PROTECT (3 Years)
- GARWARE Plus (5 Years)
- GARWARE Premium (8 Years)

#### Bike Services (5)
- Bike Wash
- Premium Bike Wash
- Bike Detailing Work
- Bike Ceramic Coating
- Bike Graphene Coating

### 5. Add-ons (6 total)
- Engine Bay Cleaning (Rs. 499)
- Tire Dressing & Polish (Rs. 199)
- Odor Removal Treatment (Rs. 599)
- Rain Repellent Coating (Rs. 699)
- Seat Fabric Protection (Rs. 899)
- Alloy Wheel Polish (Rs. 399)

### 6. Customers (20)
- Each with 1-3 vehicles
- Vehicle brands: Toyota, Honda, Ford, BMW, Mercedes, Audi, Tesla, Nissan
- Realistic registration numbers (GJ series for Gujarat)

### 7. Additional Data
- Multiple bookings per customer across branches
- Job cards for confirmed bookings
- Payments for completed bookings
- Pickup/drop requests
- Store products and orders
- Customer feedback

## Sample Login Credentials

### Super Admin
- **Email**: admin@k3carcare.com
- **Password**: admin123

### Shree Ramnagar Branch (K3RAM)
- **Branch Admin**: admin.ram@k3carcare.com / admin123
- **Floor Manager**: fm.ram@k3carcare.com / fm123
- **Supervisor 1**: supervisor1.ram@k3carcare.com / super123
- **Supervisor 2**: supervisor2.ram@k3carcare.com / super123
- **Applicator 1**: applicator1.ram@k3carcare.com / app123
- **Applicator 2**: applicator2.ram@k3carcare.com / app123
- **Applicator 3**: applicator3.ram@k3carcare.com / app123

### Chandpur Branch (K3CDP)
- **Branch Admin**: admin.cdp@k3carcare.com / admin123
- **Floor Manager**: fm.cdp@k3carcare.com / fm123
- **Supervisor 1**: supervisor1.cdp@k3carcare.com / super123
- **Supervisor 2**: supervisor2.cdp@k3carcare.com / super123
- **Applicator 1**: applicator1.cdp@k3carcare.com / app123
- **Applicator 2**: applicator2.cdp@k3carcare.com / app123
- **Applicator 3**: applicator3.cdp@k3carcare.com / app123

### Tarna Branch (K3TRN)
- **Branch Admin**: admin.trn@k3carcare.com / admin123
- **Floor Manager**: fm.trn@k3carcare.com / fm123
- **Supervisor 1**: supervisor1.trn@k3carcare.com / super123
- **Supervisor 2**: supervisor2.trn@k3carcare.com / super123
- **Applicator 1**: applicator1.trn@k3carcare.com / app123
- **Applicator 2**: applicator2.trn@k3carcare.com / app123
- **Applicator 3**: applicator3.trn@k3carcare.com / app123

### Painting Studio Branch (K3PNT)
- **Branch Admin**: admin.pnt@k3carcare.com / admin123
- **Floor Manager**: fm.pnt@k3carcare.com / fm123
- **Supervisor 1**: supervisor1.pnt@k3carcare.com / super123
- **Supervisor 2**: supervisor2.pnt@k3carcare.com / super123
- **Applicator 1**: applicator1.pnt@k3carcare.com / app123
- **Applicator 2**: applicator2.pnt@k3carcare.com / app123
- **Applicator 3**: applicator3.pnt@k3carcare.com / app123

### Sample Customer
- **Email**: customer1@email.com
- **Password**: customer123

## Key Features

### ✅ Complete Data Cleanup
The command **clears ALL existing data** before seeding:
- All users (including existing admins)
- All branches
- All bookings, job cards, payments
- All customers and vehicles
- All services and add-ons
- All store data

This ensures a clean, fresh start every time.

### ✅ Comprehensive Services
- **19 service packages** covering all K3 Car Care offerings
- Includes premium services like paint protection films
- Bike services for motorcycle customers
- Multiple coating options with varying warranties
- Vehicle-type specific pricing (Hatchback/Sedan/SUV)

### ✅ Realistic Data
- Indian vehicle brands and realistic names
- Proper Gujarat registration numbers (GJ series)
- Realistic booking patterns and statuses
- Proper branch assignments for all staff

### ✅ Role-Based Access
- Super Admin: System-wide access
- Branch Admin: Single branch management
- Floor Manager: Operations oversight
- Supervisor: Job card supervision
- Applicator: Service execution

## Notes

### Redis Connection Errors
During seeding, you may see Redis connection errors like:
```
Error broadcasting booking update: Error connecting to Redis...
```

These are **expected and can be ignored**. They occur because the WebSocket notification system tries to broadcast booking updates, but Redis may not be running locally. The core data seeding still works perfectly.

### Running Time
The complete setup takes approximately 2-3 minutes depending on your system and database connection speed.

## Verification Commands

Check the seeded data:
```bash
python manage.py check_status
python manage.py check_services
```

## Staff Hierarchy

```
Super Admin (1)
└── No branch assignment, full system access

Per Branch (x4):
├── Branch Admin (1)
│   └── Full branch management
├── Floor Manager (1)
│   └── Operations oversight
├── Supervisors (2)
│   └── Job card supervision
└── Applicators (3)
    └── Service execution
```

## Total Counts Summary
- **Branches**: 4
- **Staff**: 28 (1 Super Admin + 27 branch staff)
- **Customers**: 20
- **Service Packages**: 19
- **Add-ons**: 6
- **Vehicles**: 20-60 (1-3 per customer)
- **Bookings**: Variable (2-4 per customer)

## Important Security Note
⚠️ **These are development credentials only!** 
Change all passwords before deploying to production.
