# 🚀 Client Onboarding Guide

Complete guide for onboarding new clients to the AutoAICare platform.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Onboarding Script](#onboarding-script)
3. [Manual Onboarding](#manual-onboarding)
4. [Test Data](#test-data)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Start

### Interactive Mode (Recommended)

```bash
# Navigate to project directory
cd d:\Product\AutoAICare\Backend-AutoAICare

# Run onboarding script
python scripts/onboard_client.py --seed-data
```

The script will prompt you for all required information and create everything automatically.

### Non-Interactive Mode

```bash
python scripts/onboard_client.py \
  --company-name "K3 Car Care" \
  --company-email "info@k3car.com" \
  --company-phone "9876543210" \
  --city "Mumbai" \
  --state "Maharashtra" \
  --admin-name "K3 Admin" \
  --admin-email "admin@k3car.com" \
  --admin-password "SecurePass@123" \
  --subdomain "k3car" \
  --seed-data \
  --yes
```

---

## 🔧 Onboarding Script

### What It Does

The `onboard_client.py` script automates the entire onboarding process:

1. ✅ **Creates Company** - Sets up company record in database
2. ✅ **Creates Admin User** - Sets up company admin with full permissions
3. ✅ **Adds Domain Mapping** - Maps subdomain to company
4. ✅ **Creates DNS Record** - Adds A record in Cloudflare
5. ✅ **Seeds Test Data** (optional) - Populates comprehensive test data

### Command Line Options

```bash
# Company Information
--company-name "Company Name"
--company-email "contact@company.com"
--company-phone "9876543210"
--city "Mumbai"
--state "Maharashtra"

# Admin Information
--admin-name "Admin Name"
--admin-email "admin@company.com"
--admin-password "SecurePass@123"

# Domain
--subdomain "subdomain"  # e.g., k3car for k3car.autoaicare.com

# Options
--seed-data              # Seed comprehensive test data
--skip-dns               # Skip DNS record creation
-y, --yes                # Skip confirmation prompt
```

### Examples

#### 1. Basic Onboarding (Interactive)

```bash
python scripts/onboard_client.py
```

#### 2. With Test Data

```bash
python scripts/onboard_client.py --seed-data
```

#### 3. Complete Non-Interactive

```bash
python scripts/onboard_client.py \
  --company-name "Elite Detailing" \
  --company-email "info@elite.com" \
  --company-phone "9999888877" \
  --city "Bangalore" \
  --state "Karnataka" \
  --admin-name "Elite Admin" \
  --admin-email "admin@elite.com" \
  --admin-password "Admin@2026" \
  --subdomain "elite" \
  --seed-data \
  --yes
```

#### 4. Skip DNS Creation (for local testing)

```bash
python scripts/onboard_client.py \
  --subdomain "testclient" \
  --skip-dns \
  --seed-data
```

---

## 🛠️ Manual Onboarding

If you prefer to run each step manually:

### Step 1: Create Company

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

### Step 2: Add Domain

```bash
# Get company slug (auto-generated from name)
# For "K3 Car Care" → slug is "k3-car-care"

python manage.py add_domain \
  --company "k3-car-care" \
  --domain "k3car.autoaicare.com" \
  --primary
```

### Step 3: Create DNS Record

```bash
python scripts/add_cloudflare_dns.py add k3car
```

### Step 4: Seed Test Data (Optional)

```bash
python manage.py seed_company_data --company k3-car-care
```

---

## 📊 Test Data

### What Gets Created

When using `--seed-data` flag, the following test data is created:

#### **Branches (2)**

- Main Branch (Code: MAIN)
- Andheri Branch (Code: AND)
- Each with 3 service bays

#### **Staff Members (5)**

- 1 Floor Manager
- 2 Supervisors
- 2 Applicators/Technicians

#### **Customers (5)**

- Rajesh Kumar
- Priya Sharma
- Amit Patel
- Sneha Reddy
- Vikram Singh
- Each with 1 vehicle

#### **Services (5)**

- Basic Wash (₹500-1000)
- Premium Wash (₹800-1500)
- Interior Detailing (₹1500-2500)
- Ceramic Coating (₹5000-9000)
- Paint Protection (₹3000-5000)

#### **Add-ons (3)**

- Engine Wash (₹300)
- Tire Polish (₹200)
- Air Freshener (₹150)

#### **Bookings (10-15)**

- Random bookings across customers, services, and branches
- Various statuses (pending, confirmed, in_progress, completed)

### Test Credentials

After seeding, you can login with:

```
Company Admin:
  Email: admin@company.com (as provided during setup)
  Password: [as provided during setup]

Floor Manager:
  Email: floor_manager1_<company-slug>@test.com
  Password: Test@123

Supervisor:
  Email: supervisor1_<company-slug>@test.com
  Password: Test@123

Customer:
  Email: customer1_<company-slug>@test.com
  Password: Test@123
```

---

## ✅ Verification

### 1. Check Company Created

```bash
python manage.py shell
```

```python
from companies.models import Company
company = Company.objects.get(slug='k3-car-care')
print(f"Company: {company.name}")
print(f"Email: {company.email}")
print(f"Active: {company.is_active}")
```

### 2. Check Domain Mapping

```python
from companies.models import Domain
domains = Domain.objects.filter(company=company)
for domain in domains:
    print(f"Domain: {domain.domain}, Primary: {domain.is_primary}")
```

### 3. Check Admin User

```python
from django.contrib.auth import get_user_model
User = get_user_model()
admin = User.objects.get(email='admin@company.com')
print(f"Admin: {admin.name}")
print(f"Role: {admin.role}")
print(f"Company: {admin.company.name}")
```

### 4. Test DNS Resolution

```bash
# Windows
nslookup k3car.autoaicare.com

# Linux/Mac
dig k3car.autoaicare.com
```

### 5. Test API Access

```bash
# Test API endpoint
curl https://k3car.autoaicare.com/api/

# Test login
curl -X POST https://k3car.autoaicare.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com", "password": "password"}'
```

### 6. Run Verification Script

```bash
python verify_multitenancy.py
```

---

## 🔍 Troubleshooting

### Issue: "Company already exists"

**Solution:** The company with that slug already exists. Either:

- Use a different company name
- Or use the existing company

```bash
# Check existing companies
python manage.py shell
>>> from companies.models import Company
>>> Company.objects.all().values('id', 'name', 'slug')
```

### Issue: "Email already exists"

**Solution:** A user with that email already exists. Use a different email or update the existing user.

```bash
# Check existing users
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> User.objects.filter(email='admin@company.com')
```

### Issue: "Phone number validation error"

**Solution:** Ensure phone number is exactly 10 digits, no spaces, no country code.

```
✅ Correct: 9876543210
❌ Wrong: +91 9876543210
❌ Wrong: 98765 43210
❌ Wrong: 987654321 (only 9 digits)
```

### Issue: "Cloudflare API error"

**Solution:** Check your Cloudflare credentials in `.env` file:

```bash
CLOUDFLARE_API_KEY=your_api_key
CLOUDFLARE_EMAIL=your_email
CLOUDFLARE_ZONE_ID=your_zone_id
```

Or skip DNS creation and create manually:

```bash
python scripts/onboard_client.py --skip-dns
```

### Issue: "DNS not resolving"

**Solution:** DNS propagation can take 5-10 minutes. Wait and try again.

```bash
# Check DNS propagation
nslookup k3car.autoaicare.com

# Or use online tools
# https://dnschecker.org
```

### Issue: "Nginx not reloading"

**Solution:** Manually reload Nginx:

```bash
# Test configuration
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

---

## 📝 Best Practices

### 1. Company Naming

- Use clear, descriptive names
- Avoid special characters
- Keep it professional

```
✅ Good: "K3 Car Care", "Elite Detailing Mumbai"
❌ Bad: "K3!!!", "test123"
```

### 2. Subdomain Selection

- Keep it short and memorable
- Use lowercase letters only
- Avoid numbers if possible

```
✅ Good: k3car, elite, premium
❌ Bad: k3-car-care-mumbai-2024
```

### 3. Password Security

- Minimum 8 characters
- Include uppercase, lowercase, numbers, and special characters
- Don't use common passwords

```
✅ Good: SecurePass@123, Admin#2026
❌ Bad: password, 12345678
```

### 4. Email Addresses

- Use professional email addresses
- Ensure they're valid and accessible
- Use company domain if available

```
✅ Good: admin@k3car.com, info@elite.com
❌ Bad: test@test.com, admin@gmail.com
```

---

## 🔄 Batch Onboarding

To onboard multiple clients at once, create a script:

```bash
#!/bin/bash

# clients.txt format:
# company_name|email|phone|city|state|admin_name|admin_email|admin_password|subdomain

while IFS='|' read -r name email phone city state admin_name admin_email admin_pass subdomain; do
  echo "Onboarding: $name"
  
  python scripts/onboard_client.py \
    --company-name "$name" \
    --company-email "$email" \
    --company-phone "$phone" \
    --city "$city" \
    --state "$state" \
    --admin-name "$admin_name" \
    --admin-email "$admin_email" \
    --admin-password "$admin_pass" \
    --subdomain "$subdomain" \
    --seed-data \
    --yes
    
  echo "Completed: $name"
  echo "---"
done < clients.txt
```

---

## 📞 Support

If you encounter any issues:

1. Check this guide's troubleshooting section
2. Review the error messages carefully
3. Check Django logs: `tail -f logs/django.log`
4. Check Nginx logs: `tail -f /var/log/nginx/error.log`

---

## 📚 Related Documentation

- [SEED_DATA_GUIDE.md](../Document_generated_by_IDE/SEED_DATA_GUIDE.md) - Detailed seed data documentation
- [MULTI_TENANT_TESTING_CREDENTIALS.md](../Document_generated_by_IDE/MULTI_TENANT_TESTING_CREDENTIALS.md) - Test credentials
- [add_cloudflare_dns.py](./add_cloudflare_dns.py) - DNS management script

---

*Last Updated: February 8, 2026*  
*Version: 1.0*
