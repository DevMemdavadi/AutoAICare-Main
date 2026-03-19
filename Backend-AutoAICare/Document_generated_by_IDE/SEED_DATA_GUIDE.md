# Seed Data Guide - Multi-Tenancy

## 📊 Overview

This guide shows how to populate test data for each company (tenant) in your multi-tenant DetailEase system.

---

## 🎯 Available Commands

### 1. **Create a New Company**

```bash
python manage.py create_company \
  --name "Company Name" \
  --email "contact@company.com" \
  --phone "9876543210" \
  --city "Mumbai" \
  --state "Maharashtra" \
  --admin-email "admin@company.com" \
  --admin-name "Admin Name" \
  --admin-password "SecurePass@123"
```

### 2. **Seed Comprehensive Test Data**

```bash
python manage.py seed_company_data --company <company-slug>
```

**Example:**

```bash
python manage.py seed_company_data --company test-company
```

**What it creates:**

- ✅ 2 Branches with Service Bays
- ✅ 5 Staff Members (Floor Manager, Supervisors, Technicians)
- ✅ 5 Customers with Vehicles
- ✅ 5 Service Packages
- ✅ 3 Add-on Services
- ✅ 10-15 Bookings

### 3. **Quick Test Data (Minimal)**

```bash
python manage.py quick_test_data --company <company-slug>
```

Creates just one branch to verify multi-tenancy works.

---

## 📝 Step-by-Step Workflow

### **Complete Setup for a New Company:**

```bash
# Step 1: Create the company
python manage.py create_company \
  --name "ABC Detailing" \
  --email "contact@abc.com" \
  --phone "9999999999" \
  --city "Mumbai" \
  --state "Maharashtra" \
  --admin-email "admin@abc.com" \
  --admin-name "Admin" \
  --admin-password "Admin@123"

# Step 2: Seed test data
python manage.py seed_company_data --company abc-detailing

# Step 3: Verify
python verify_multitenancy.py
```

---

## 🔍 Verify Data Was Created

After seeding, verify the data:

```bash
# Run verification script
python verify_multitenancy.py
```

Or check via Django shell:

```python
python manage.py shell

from companies.models import Company
from branches.models import Branch
from customers.models import Customer

# Get company
company = Company.objects.get(slug='test-company')

# Check data
print(f"Branches: {Branch.objects.filter(company=company).count()}")
print(f"Customers: {Customer.objects.filter(company=company).count()}")
```

---

## 📦 What Data Gets Created

### **Branches (2)**

- Main Branch (Code: MAIN)
- Andheri Branch (Code: AND)
- Each with 3 service bays

### **Staff Members (5)**

- 1 Floor Manager
- 2 Supervisors  
- 2 Technicians

### **Customers (5)**

- Rajesh Kumar
- Priya Sharma
- Amit Patel
- Sneha Reddy
- Vikram Singh

Each customer gets 1 vehicle with realistic Indian registration numbers.

### **Services (5)**

- Basic Wash (₹500-1000)
- Premium Wash (₹800-1500)
- Interior Detailing (₹1500-2500)
- Ceramic Coating (₹5000-9000)
- Paint Protection (₹3000-5000)

### **Add-ons (3)**

- Engine Wash (₹300)
- Tire Polish (₹200)
- Air Freshener (₹150)

### **Bookings (10-15)**

Random bookings distributed across:

- Different customers
- Different services
- Different branches
- Various statuses (pending, confirmed, in_progress, completed)

---

## 🔄 Create Data for Multiple Companies

```bash
# Company 1
python manage.py create_company --name "K3 Detailing Mumbai" --email "info@k3mumbai.com" --phone "9999000001" --city "Mumbai" --state "Maharashtra" --admin-email "admin@k3mumbai.com" --admin-name "Mumbai Admin" --admin-password "Admin@123"

python manage.py seed_company_data --company k3-detailing-mumbai

# Company 2
python manage.py create_company --name "Premium Auto Care Delhi" --email "info@pacdelhi.com" --phone "9999000002" --city "Delhi" --state "Delhi" --admin-email "admin@pacdelhi.com" --admin-name "Delhi Admin" --admin-password "Admin@123"

python manage.py seed_company_data --company premium-auto-care-delhi

# Company 3
python manage.py create_company --name "Elite Detailing Bangalore" --email "info@elitebangalore.com" --phone "9999000003" --city "Bangalore" --state "Karnataka" --admin-email "admin@elitebangalore.com" --admin-name "Bangalore Admin" --admin-password "Admin@123"

python manage.py seed_company_data --company elite-detailing-bangalore
```

---

## ⚠️ Important Notes

### **Data Isolation**

- Each company's data is completely isolated
- Customers from Company A cannot see data from Company B
- Staff are assigned to specific companies and branches

### **Unique Constraints**

- Registration numbers are unique per company
- Branch codes are unique per company
- Service codes are unique per company

### **Phone Numbers**

- All phone numbers must be exactly 10 digits
- Format: 7000000000 to 9999999999

### **Existing Data**

- If data already exists, the command will skip duplicates
- Use different email addresses for each customer
- Use different registration numbers for vehicles

---

## 🧪 Testing Multi-Tenancy

### **Test 1: Data Isolation**

```bash
# Seed data for two companies
python manage.py seed_company_data --company company-a
python manage.py seed_company_data --company company-b

# Verify isolation
python verify_multitenancy.py
```

### **Test 2: Login and Browse**

1. Login as `admin@company-a.com`
2. Check you only see Company A's data
3. Logout and login as `admin@company-b.com`
4. Verify you only see Company B's data

### **Test 3: API Access**

```bash
# Get auth token for Company A admin
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company-a.com", "password":"password"}'

# Use token to fetch branches (should only see Company A branches)
curl -X GET http://localhost:8000/api/branches/ \
  -H "Authorization: Token YOUR_TOKEN"
```

---

## 🎯 Next Steps After Seeding

1. **Login to Admin Panel**
   - URL: `http://localhost:8000/admin`
   - Use the admin credentials you created

2. **Test Frontend**
   - Start frontend: `cd ../DetailEase-Frontend && npm run dev`
   - Login with customer credentials
   - Create a booking
   - Verify data isolation

3. **Create More Realistic Data**
   - Add more customers
   - Create job cards
   - Generate invoices
   - Record payments

---

## 📞 Troubleshooting

### **"Company not found"**

- Check the company slug with: `python manage.py shell` → `Company.objects.all()`

### **"Unique constraint violation"**

- Data already exists for this company
- Either use a different company or clear existing data first

### **"Phone number validation error"**

- Ensure phone is exactly 10 digits
- No country code, no spaces, no special characters

---

## ✅ Success Criteria

After seeding, you should have:

- [x] Company created
- [x] Admin user created
- [x] Branches with service bays
- [x] Staff members assigned to branches
- [x] Customers with vehicles
- [x] Services and add-ons
- [x] Sample bookings

**Verify with:**

```bash
python verify_multitenancy.py
```

---

*Last Updated: February 6, 2026*  
*Multi-Tenancy Version: 1.0*
