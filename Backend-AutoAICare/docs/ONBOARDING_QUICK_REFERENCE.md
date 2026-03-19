# Company Onboarding - Quick Reference Guide

## 🚀 New Unified Commands

We've created **2 new management commands** that simplify company onboarding:

### 1. **`onboard_company`** - Required Data Only

Creates company with all essential infrastructure (NO sample data).

### 2. **`onboard_company_with_samples`** - Add Sample Data

Adds sample/test data to an existing company.

---

## 📋 Complete Onboarding Workflow

### **Option A: Production Setup (No Sample Data)**

```bash
# Step 1: Create company with required data
python manage.py onboard_company \
  --name "K3 Car Care" \
  --email "info@k3car.com" \
  --phone "9876543210" \
  --city "Mumbai" \
  --state "Maharashtra" \
  --subdomain "k3car" \
  --admin-email "admin@k3car.com" \
  --admin-name "K3 Admin" \
  --admin-password "SecurePass@123" \
  --branches 2

# Done! Company is ready for production use.
```

**What gets created:**

- ✅ Company + Admin user
- ✅ 2 Branches with 3 service bays each
- ✅ Workflow template (simplified)
- ✅ 20+ Service packages
- ✅ 6 Add-ons
- ✅ 30+ Parts catalog
- ✅ Service-parts mappings
- ✅ 6 Lead sources
- ✅ Attendance policy
- ✅ Domain mapping (k3car.autoaicare.com)
- ✅ Cloudflare DNS record

---

### **Option B: Development/Testing Setup (With Sample Data)**

```bash
# Step 1: Create company with required data
python manage.py onboard_company \
  --name "Test Client 1" \
  --email "info@testclient1.com" \
  --phone "9876543210" \
  --subdomain "testclient1" \
  --admin-email "admin@testclient1.com" \
  --admin-name "Test Admin" \
  --admin-password "Test@123" \
  --branches 2

# Step 2: Add sample data
python manage.py onboard_company_with_samples --company testclient1

# Or use company ID
python manage.py onboard_company_with_samples --company 1

# For more comprehensive sample data
python manage.py onboard_company_with_samples --company testclient1 --full
```

**Additional sample data created:**

- ✅ 5-10 Staff users (branch admins, floor managers, supervisors, applicators)
- ✅ 5-10 Customer users with vehicles
- ✅ 10-30 Sample bookings
- ✅ 5-8 Sample leads
- ✅ 3 Membership plans
- ✅ 5 Vendors with expenses
- ✅ 8 Products

---

## 🎯 Command Options

### `onboard_company` Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--name` | ✅ Yes | - | Company name |
| `--email` | ✅ Yes | - | Company email |
| `--phone` | ✅ Yes | - | Company phone |
| `--subdomain` | ✅ Yes | - | Subdomain (e.g., k3car) |
| `--admin-email` | ✅ Yes | - | Admin user email |
| `--admin-name` | ✅ Yes | - | Admin user name |
| `--admin-password` | ✅ Yes | - | Admin password |
| `--city` | ❌ No | Mumbai | City |
| `--state` | ❌ No | Maharashtra | State |
| `--address` | ❌ No | Default Address | Address |
| `--pincode` | ❌ No | 400001 | Pincode |
| `--base-domain` | ❌ No | autoaicare.com | Base domain |
| `--branches` | ❌ No | 2 | Number of branches |
| `--skip-dns` | ❌ No | False | Skip DNS creation |
| `--skip-workflows` | ❌ No | False | Skip automation workflows |

### `onboard_company_with_samples` Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--company` | ✅ Yes | - | Company slug or ID |
| `--full` | ❌ No | False | Create more sample data |

---

## 📝 Examples

### Example 1: Quick Production Setup

```bash
python manage.py onboard_company \
  --name "Elite Detailing" \
  --email "contact@elitedetailing.com" \
  --phone "9988776655" \
  --subdomain "elite" \
  --admin-email "admin@elitedetailing.com" \
  --admin-name "Elite Admin" \
  --admin-password "Secure@2024"
```

### Example 2: Multi-Branch Setup

```bash
python manage.py onboard_company \
  --name "Premium Auto Care" \
  --email "info@premiumauto.com" \
  --phone "9876543210" \
  --city "Bangalore" \
  --state "Karnataka" \
  --subdomain "premium" \
  --admin-email "admin@premiumauto.com" \
  --admin-name "Premium Admin" \
  --admin-password "Premium@123" \
  --branches 4
```

### Example 3: Skip DNS (Manual DNS Setup)

```bash
python manage.py onboard_company \
  --name "Local Test" \
  --email "test@local.com" \
  --phone "1234567890" \
  --subdomain "localtest" \
  --admin-email "admin@local.com" \
  --admin-name "Local Admin" \
  --admin-password "Test@123" \
  --skip-dns
```

### Example 4: Add Sample Data Later

```bash
# First create company
python manage.py onboard_company \
  --name "Test Company" \
  --email "test@test.com" \
  --phone "9999999999" \
  --subdomain "test" \
  --admin-email "admin@test.com" \
  --admin-name "Test Admin" \
  --admin-password "Test@123"

# Then add sample data
python manage.py onboard_company_with_samples --company test

# Or with more data
python manage.py onboard_company_with_samples --company test --full
```

---

## 🔍 What Happens Behind the Scenes

### `onboard_company` Execution Flow

```
1. Create Company + Settings
   └─> Company record
   └─> CompanySettings

2. Create Admin User
   └─> company_admin role
   └─> is_staff=True

3. Create Branches
   └─> Main Branch, Andheri Branch, etc.
   └─> 3 Service Bays per branch

4. Create Workflow Template
   └─> Simplified workflow (12 statuses, 10+ transitions)

5. Seed Services
   └─> 20+ service packages (washes, coatings, PPF, bike services)
   └─> 6 add-ons

6. Seed Parts
   └─> 30+ parts (chemicals, materials, consumables, tools)

7. Link Services to Parts
   └─> Automatic inventory deduction mappings

8. Create Lead Sources
   └─> Website, Walk-in, Phone, Facebook, Google, Referral

9. Create Attendance Policy
   └─> 8-hour workday, 15-min grace period

10. Add Domain
    └─> subdomain.autoaicare.com

11. Create DNS Record
    └─> Cloudflare A record (proxied)

12. Create Automation Workflows (optional)
    └─> Booking confirmations, reminders, etc.
```

### `onboard_company_with_samples` Execution Flow

```
1. Create Staff Users
   └─> Branch admins (1 per branch)
   └─> Floor managers (1-2)
   └─> Supervisors (2-3)
   └─> Applicators (2-4)

2. Create Customer Users
   └─> 5-10 customers with login credentials

3. Create Vehicles
   └─> 1-2 vehicles per customer
   └─> Various makes/models/types

4. Create Bookings
   └─> 10-30 bookings with various statuses
   └─> Linked to services and add-ons

5. Create Leads
   └─> 5-8 leads with different statuses

6. Create Membership Plans
   └─> Silver, Gold, Platinum plans

7. Create Vendors
   └─> 5 vendors with sample expenses

8. Create Products
   └─> 8 retail products
```

---

## ✅ Verification Steps

After onboarding, verify everything is working:

### 1. Check DNS Propagation

```bash
nslookup k3car.autoaicare.com
```

### 2. Test API

```bash
curl https://k3car.autoaicare.com/api/
```

### 3. Test Login

```bash
curl -X POST https://k3car.autoaicare.com/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email": "admin@k3car.com", "password": "SecurePass@123"}'
```

### 4. Check Database

```bash
python manage.py shell
>>> from companies.models import Company
>>> company = Company.objects.get(slug='k3car')
>>> company.branches.count()  # Should be 2
>>> company.users.count()  # Should be 1 (admin only) or more (with samples)
```

---

## 🆚 Comparison: Old vs New

### Old Way (4-6 Commands)

```bash
# Step 1
python manage.py create_company --name "..." --email "..." ...

# Step 2
python manage.py seed_company_data --company k3car

# Step 3
python manage.py create_simplified_workflow --company k3car

# Step 4
python manage.py seed_services --company 1

# Step 5
python manage.py seed_parts --company 1

# Step 6
python manage.py seed_service_parts --company 1

# Step 7 (manual)
python scripts/add_cloudflare_dns.py add k3car
```

### New Way (1-2 Commands)

```bash
# Step 1: Required data
python manage.py onboard_company --name "..." --email "..." --subdomain k3car ...

# Step 2 (optional): Sample data
python manage.py onboard_company_with_samples --company k3car
```

**Time saved:** ~5-10 minutes per onboarding ⚡

---

## 🔧 Troubleshooting

### DNS Record Creation Failed

```bash
# Check Cloudflare credentials in .env
CLOUDFLARE_API_KEY=your_key
CLOUDFLARE_EMAIL=your_email
CLOUDFLARE_ZONE_ID=your_zone_id

# Or skip DNS and create manually
python manage.py onboard_company ... --skip-dns
python scripts/add_cloudflare_dns.py add k3car
```

### Company Already Exists

The command will detect existing companies and skip creation. Safe to re-run.

### Missing Dependencies

```bash
# Install required packages
pip install python-decouple requests
```

---

## 📞 Support

For issues or questions:

1. Check the command help: `python manage.py onboard_company --help`
2. Review the onboarding summary output
3. Check Django logs for detailed error messages

---

## 🎉 Success

Your company is now fully onboarded and ready to use! 🚀

Access the platform at: `https://[subdomain].autoaicare.com`
