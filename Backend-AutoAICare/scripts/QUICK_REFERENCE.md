# 🚀 Quick Onboarding Reference

## One-Line Onboarding

```bash
python scripts/onboard_client.py --seed-data
```

---

## Full Command (Non-Interactive)

```bash
python scripts/onboard_client.py \
  --company-name "Company Name" \
  --company-email "info@company.com" \
  --company-phone "9876543210" \
  --city "Mumbai" \
  --state "Maharashtra" \
  --admin-name "Admin Name" \
  --admin-email "admin@company.com" \
  --admin-password "SecurePass@123" \
  --subdomain "subdomain" \
  --seed-data \
  --yes
```

---

## Common Examples

### Example 1: K3 Car Care

```bash
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

### Example 2: Elite Detailing

```bash
python scripts/onboard_client.py \
  --company-name "Elite Detailing" \
  --company-email "info@elite.com" \
  --company-phone "9999888877" \
  --city "Bangalore" \
  --state "Karnataka" \
  --admin-name "Elite Admin" \
  --admin-email "admin@elite.com" \
  --admin-password "Elite@2026" \
  --subdomain "elite" \
  --seed-data \
  --yes
```

### Example 3: Premium Auto Care

```bash
python scripts/onboard_client.py \
  --company-name "Premium Auto Care" \
  --company-email "info@premium.com" \
  --company-phone "8888777766" \
  --city "Delhi" \
  --state "Delhi" \
  --admin-name "Premium Admin" \
  --admin-email "admin@premium.com" \
  --admin-password "Premium@2026" \
  --subdomain "premium" \
  --seed-data \
  --yes
```

---

## Manual Steps (If Needed)

### 1. Create Company

```bash
python manage.py create_company \
  --name "Company Name" \
  --email "info@company.com" \
  --phone "9876543210" \
  --city "Mumbai" \
  --state "Maharashtra" \
  --admin-email "admin@company.com" \
  --admin-name "Admin Name" \
  --admin-password "SecurePass@123"
```

### 2. Add Domain

```bash
python manage.py add_domain \
  --company "company-slug" \
  --domain "subdomain.autoaicare.com" \
  --primary
```

### 3. Create DNS

```bash
python scripts/add_cloudflare_dns.py add subdomain
```

### 4. Seed Data

```bash
python manage.py seed_company_data --company company-slug
```

---

## Verification

```bash
# Test DNS
nslookup subdomain.autoaicare.com

# Test API
curl https://subdomain.autoaicare.com/api/

# Test Login
curl -X POST https://subdomain.autoaicare.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.com", "password": "password"}'
```

---

## Test Credentials (After Seeding)

```
Company Admin:
  Email: admin@company.com
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

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Company exists | Use different name or check existing |
| Email exists | Use different email |
| Phone validation | Use 10 digits, no spaces |
| DNS not resolving | Wait 5-10 minutes for propagation |
| Cloudflare error | Check credentials in `.env` |

---

## Help

```bash
python scripts/onboard_client.py --help
```

For full documentation, see: [ONBOARDING_GUIDE.md](./ONBOARDING_GUIDE.md)
