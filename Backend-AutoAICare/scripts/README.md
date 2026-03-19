# Scripts Directory

This directory contains automation scripts for managing the AutoAICare platform.

---

## 📋 Available Scripts

### 🚀 Client Onboarding

#### **onboard_client.py** (Recommended)

Complete Python-based client onboarding automation.

```bash
# Interactive mode
python scripts/onboard_client.py --seed-data

# Non-interactive mode
python scripts/onboard_client.py \
  --company-name "K3 Car Care" \
  --company-email "info@k3car.com" \
  --company-phone "9876543210" \
  --city "Mumbai" \
  --state "Maharashtra" \
  --admin-name "K3 Admin" \
  --admin-email "admin@k3car.com" \
  --admin-password "K3Admin@2026" \
  --subdomain "k3car" \
  --seed-data \
  --yes
```

**Features:**

- ✅ Creates company and admin user
- ✅ Sets up domain mapping
- ✅ Creates DNS record in Cloudflare
- ✅ Seeds comprehensive test data (optional)
- ✅ Colored output and progress tracking
- ✅ Interactive and non-interactive modes
- ✅ Detailed summary report

#### **onboard_client.ps1** (Windows)

PowerShell wrapper for Windows users.

```powershell
# Interactive mode
.\scripts\onboard_client.ps1 -SeedData

# Non-interactive mode
.\scripts\onboard_client.ps1 `
  -CompanyName "K3 Car Care" `
  -CompanyEmail "info@k3car.com" `
  -CompanyPhone "9876543210" `
  -City "Mumbai" `
  -State "Maharashtra" `
  -AdminName "K3 Admin" `
  -AdminEmail "admin@k3car.com" `
  -AdminPassword "K3Admin@2026" `
  -Subdomain "k3car" `
  -SeedData `
  -Yes
```

#### **onboard_tenant.sh** (Legacy Bash)

Original bash-based onboarding script.

```bash
./scripts/onboard_tenant.sh
```

---

### 🌐 DNS Management

#### **add_cloudflare_dns.py**

Manage DNS records in Cloudflare.

```bash
# Add A record
python scripts/add_cloudflare_dns.py add k3car

# Delete record
python scripts/add_cloudflare_dns.py delete k3car

# List all records
python scripts/add_cloudflare_dns.py list
```

**Features:**

- ✅ Creates A records (not CNAME)
- ✅ Default IP: 77.37.44.137
- ✅ Proxied through Cloudflare
- ✅ Auto TTL
- ✅ Update existing records
- ✅ List all DNS records

---

### 🚢 Deployment

#### **deploy_backend.sh**

Deploy backend to production server.

```bash
./scripts/deploy_backend.sh
```

#### **deploy_frontend.sh**

Deploy frontend to production server.

```bash
./scripts/deploy_frontend.sh
```

---

### ⚙️ Server Configuration

#### **setup_nginx.sh**

Initial Nginx setup for multi-tenant configuration.

```bash
./scripts/setup_nginx.sh
```

#### **migrate_to_wildcard_nginx.sh**

Migrate to wildcard Nginx configuration.

```bash
./scripts/migrate_to_wildcard_nginx.sh
```

---

## 📚 Documentation

### **ONBOARDING_GUIDE.md**

Comprehensive guide for client onboarding with:

- Quick start instructions
- Detailed command reference
- Test data documentation
- Verification steps
- Troubleshooting guide
- Best practices

### **QUICK_REFERENCE.md**

Quick reference card with:

- One-line commands
- Common examples
- Manual steps
- Verification commands
- Test credentials

---

## 🎯 Quick Start

### Onboard a New Client (Recommended)

```bash
# Navigate to project directory
cd d:\Product\AutoAICare\Backend-AutoAICare

# Run onboarding script (interactive)
python scripts/onboard_client.py --seed-data
```

### What It Does

1. **Creates Company** - Sets up company record in database
2. **Creates Admin User** - Company admin with full permissions
3. **Adds Domain** - Maps subdomain to company
4. **Creates DNS** - Adds A record in Cloudflare
5. **Seeds Data** - Populates test data (optional)

### Result

- ✅ Fully configured company
- ✅ Working subdomain (e.g., k3car.autoaicare.com)
- ✅ Admin credentials
- ✅ Test data (branches, staff, customers, services, bookings)
- ✅ Ready to use immediately

---

## 🔧 Common Tasks

### 1. Onboard New Client with Test Data

```bash
python scripts/onboard_client.py --seed-data
```

### 2. Onboard Client Without Test Data

```bash
python scripts/onboard_client.py
```

### 3. Add DNS Record Only

```bash
python scripts/add_cloudflare_dns.py add subdomain
```

### 4. Seed Data for Existing Company

```bash
python manage.py seed_company_data --company company-slug
```

### 5. List All DNS Records

```bash
python scripts/add_cloudflare_dns.py list
```

---

## 📊 Test Data

When using `--seed-data`, the following is created:

- **2 Branches** with 3 service bays each
- **5 Staff Members** (Floor Manager, Supervisors, Technicians)
- **5 Customers** with vehicles
- **5 Service Packages** (Wash, Detailing, Coating, etc.)
- **3 Add-ons** (Engine Wash, Tire Polish, Air Freshener)
- **10-15 Bookings** with various statuses

### Test Credentials

```
Company Admin:
  Email: admin@company.com (as provided)
  Password: [as provided]

Floor Manager:
  Email: floor_manager1_<slug>@test.com
  Password: Test@123

Supervisor:
  Email: supervisor1_<slug>@test.com
  Password: Test@123

Customer:
  Email: customer1_<slug>@test.com
  Password: Test@123
```

---

## ✅ Verification

### Check Company Created

```bash
python manage.py shell
>>> from companies.models import Company
>>> Company.objects.all()
```

### Test DNS Resolution

```bash
nslookup subdomain.autoaicare.com
```

### Test API Access

```bash
curl https://subdomain.autoaicare.com/api/
```

### Test Login

```bash
curl -X POST https://subdomain.autoaicare.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com", "password": "password"}'
```

---

## 🔍 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Company already exists | Use different name or check existing companies |
| Email already exists | Use different email address |
| Phone validation error | Use exactly 10 digits, no spaces |
| DNS not resolving | Wait 5-10 minutes for propagation |
| Cloudflare API error | Check credentials in `.env` file |

### Get Help

```bash
# Python script help
python scripts/onboard_client.py --help

# PowerShell script help
.\scripts\onboard_client.ps1 -Help

# DNS script help
python scripts/add_cloudflare_dns.py
```

---

## 📝 Environment Variables

Required for DNS management:

```env
CLOUDFLARE_API_KEY=your_api_key
CLOUDFLARE_EMAIL=your_email
CLOUDFLARE_ZONE_ID=your_zone_id
BASE_DOMAIN=autoaicare.com
```

---

## 🔗 Related Documentation

- [ONBOARDING_GUIDE.md](./ONBOARDING_GUIDE.md) - Complete onboarding guide
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference card
- [../Document_generated_by_IDE/SEED_DATA_GUIDE.md](../Document_generated_by_IDE/SEED_DATA_GUIDE.md) - Seed data guide
- [../Document_generated_by_IDE/MULTI_TENANT_TESTING_CREDENTIALS.md](../Document_generated_by_IDE/MULTI_TENANT_TESTING_CREDENTIALS.md) - Test credentials

---

## 💡 Tips

1. **Use Interactive Mode** for first-time onboarding to understand the process
2. **Use Non-Interactive Mode** for batch onboarding or automation
3. **Always use --seed-data** for testing and development
4. **Skip --seed-data** for production clients
5. **Verify DNS** before testing the application
6. **Save credentials** in a secure location

---

## 🚀 Next Steps After Onboarding

1. Wait for DNS propagation (5-10 minutes)
2. Test login at `https://subdomain.autoaicare.com`
3. Verify SSL certificate is working
4. Test API endpoints
5. Customize company settings
6. Add real branches, services, and staff
7. Train client on the system

---

*Last Updated: February 8, 2026*  
*Version: 1.0*
