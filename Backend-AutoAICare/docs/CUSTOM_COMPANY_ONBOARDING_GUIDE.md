# Custom Company Onboarding Guide

## Overview

This guide explains how to onboard real companies with their specific details (custom branch names, staff, services, and parts).

---

## Approach: Two Methods

### Method 1: Dedicated Company Command (Recommended for Production)

Create a dedicated onboarding command for each major client, similar to `onboard_k3car.py`.

**Advantages:**

- ✅ All company data in one place
- ✅ Version controlled
- ✅ Repeatable and testable
- ✅ Easy to review before execution
- ✅ Can be customized per company

**When to use:**

- Production companies
- Companies with complex requirements
- When you have all details upfront

**Example:**

```bash
python manage.py onboard_k3car --admin-password "SecurePass@123"
```

---

### Method 2: Generic Command with Config File

Use the generic `onboard_company` command with custom parameters.

**Advantages:**

- ✅ Quick setup
- ✅ No code changes needed
- ✅ Good for testing

**When to use:**

- Testing/demo companies
- Simple setups
- Quick prototypes

**Example:**

```bash
python manage.py onboard_company \
  --name "Elite Detailing" \
  --email "info@elite.com" \
  --phone "9988776655" \
  --subdomain "elite" \
  --admin-email "admin@elite.com" \
  --admin-name "Elite Admin" \
  --admin-password "Elite@123" \
  --branches 2
```

---

## Creating a Custom Company Command

### Step 1: Gather Company Information

Create a document with all company details:

```markdown
# Company: [Company Name]

## Basic Details
- Company Name: 
- Email:
- Phone:
- Address:
- City/State:
- Subdomain:

## Branches
1. Branch Name:
   - Code:
   - Address:
   - Phone:
   - Email:
   - Manager Name:
   - Manager Phone:
   - Number of Service Bays:

2. Branch Name:
   ...

## Staff (Per Branch)
### Branch Admins (1 per branch)
- Name:
- Email:
- Phone:

### Floor Managers (1 per branch)
- Name:
- Email:
- Phone:

### Supervisors (2 per branch)
- Name 1:
- Name 2:

### Applicators (3 per branch)
- Name 1:
- Name 2:
- Name 3:

## Services (Optional - Custom Services)
- Service Name:
  - Category:
  - Pricing (Hatchback/Sedan/SUV):
  - Duration:

## Parts (Optional - Custom Parts)
- Part Name:
  - Code:
  - Category:
  - Unit Price:
```

---

### Step 2: Create the Command File

Copy the template from `onboard_k3car.py`:

```bash
cp companies/management/commands/onboard_k3car.py \
   companies/management/commands/onboard_[company_slug].py
```

---

### Step 3: Customize the Command

Update the following sections:

#### 1. **Company Details** (in `create_company` method)

```python
company, created = Company.objects.get_or_create(
    slug='your-company-slug',
    defaults={
        'name': 'Your Company Name',
        'display_name': 'Your Company Display Name',
        'email': 'info@yourcompany.com',
        'phone': '+91 XX XXXX XXXX',
        'address_line1': 'Your Address',
        'city': 'Your City',
        'state': 'Your State',
        'pincode': 'XXXXXX',
        'is_active': True
    }
)
```

#### 2. **Branches** (in `create_branches` method)

```python
branches_data = [
    {
        'name': 'Branch 1 Name',
        'code': 'BR1',
        'address': 'Branch Address',
        'city': 'City',
        'state': 'State',
        'pincode': 'XXXXXX',
        'phone': '+91 XX XXXX XXXX',
        'email': 'branch1@company.com',
        'manager_name': 'Manager Name',
        'manager_phone': '+91 XXXXX XXXXX',
    },
    # Add more branches...
]
```

#### 3. **Staff** (in `create_staff_for_branches` method)

```python
branch_configs = [
    {
        'short': 'br1',  # Short code for email
        'admin': 'Admin Name',
        'fm': 'Floor Manager Name',
        'supervisors': ['Supervisor 1', 'Supervisor 2'],
        'applicators': ['Applicator 1', 'Applicator 2', 'Applicator 3']
    },
    # Add more branch configs...
]
```

---

### Step 4: Test the Command

```bash
# Test in development
python manage.py onboard_yourcompany --admin-password "Test@123" --skip-dns

# Verify in Django shell
python manage.py shell
>>> from companies.models import Company
>>> company = Company.objects.get(slug='your-company-slug')
>>> company.branches.all()
>>> company.users.all()
```

---

### Step 5: Run in Production

```bash
# With DNS creation
python manage.py onboard_yourcompany --admin-password "SecurePass@123"

# Without DNS (if already configured)
python manage.py onboard_yourcompany --admin-password "SecurePass@123" --skip-dns

# Without sample data
python manage.py onboard_yourcompany --admin-password "SecurePass@123" --skip-samples
```

---

## Using Existing Commands

If you don't want to create a custom command, you can use the modular approach:

### Step 1: Basic Onboarding

```bash
python manage.py onboard_company \
  --name "Your Company" \
  --email "info@company.com" \
  --phone "XXXXXXXXXX" \
  --subdomain "yourcompany" \
  --admin-email "admin@company.com" \
  --admin-name "Admin Name" \
  --admin-password "SecurePass@123" \
  --branches 3
```

### Step 2: Add Custom Services (if needed)

```bash
# Use default services
python manage.py seed_services --company your-company-slug

# Or create custom services manually via Django admin
```

### Step 3: Add Sample Data (optional)

```bash
python manage.py onboard_company_with_samples --company your-company-slug
```

---

## Custom Services and Parts

### Option 1: Use Default Seed Commands

```bash
python manage.py seed_services --company your-company-slug
python manage.py seed_parts --company your-company-slug
python manage.py seed_service_parts --company your-company-slug
```

### Option 2: Create Custom Services via Django Admin

1. Login to Django admin
2. Navigate to Services > Service Packages
3. Add custom services with company-specific pricing

### Option 3: Create Import Command

Create a command to import services from CSV/JSON:

```python
# companies/management/commands/import_services.py
from django.core.management.base import BaseCommand
import json

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, required=True)
        parser.add_argument('--company', type=str, required=True)
    
    def handle(self, *args, **options):
        with open(options['file'], 'r') as f:
            services_data = json.load(f)
        
        # Import services...
```

---

## Best Practices

### 1. **Data Validation**

- Verify all email addresses are unique
- Ensure phone numbers are in correct format
- Check branch codes don't conflict

### 2. **Password Security**

- Use strong passwords for production
- Store passwords securely (don't commit to git)
- Consider using environment variables

### 3. **Testing**

- Always test in development first
- Verify all data is created correctly
- Check multi-tenancy isolation

### 4. **Documentation**

- Document all custom configurations
- Keep a record of credentials
- Create onboarding summary document

### 5. **Rollback Plan**

- Keep database backups
- Test rollback procedures
- Have a plan for data cleanup

---

## Example Workflow

### For K3 Car Care (Real Example)

1. **Gathered all details** from `setup_complete_system.py`
2. **Created** `onboard_k3car.py` command
3. **Tested** in development:

   ```bash
   python manage.py onboard_k3car --admin-password "Test@123" --skip-dns
   ```

4. **Verified** all data in Django admin
5. **Ran in production**:

   ```bash
   python manage.py onboard_k3car --admin-password "K3Admin@2024"
   ```

6. **Created documentation** in `K3_CAR_CARE_ONBOARDING_SUMMARY.md`

---

## Troubleshooting

### Issue: "Company already exists"

```bash
# Delete existing company
python manage.py shell
>>> from companies.models import Company
>>> Company.objects.filter(slug='company-slug').delete()
```

### Issue: "Email already exists"

```bash
# Delete existing users
>>> from users.models import User
>>> User.objects.filter(email='email@example.com').delete()
```

### Issue: "DNS creation failed"

```bash
# Skip DNS and create manually
python manage.py onboard_company --skip-dns
```

### Issue: "Service seeding failed"

```bash
# Run seed commands separately
python manage.py seed_services --company company-slug
python manage.py seed_parts --company company-slug
```

---

## Summary

**For Production Companies:**

1. Create dedicated command (like `onboard_k3car.py`)
2. Include all real branch and staff details
3. Test thoroughly in development
4. Run in production with proper credentials
5. Document everything

**For Test/Demo Companies:**

1. Use generic `onboard_company` command
2. Add sample data with `onboard_company_with_samples`
3. Quick and simple

**Key Files:**

- `companies/management/commands/onboard_k3car.py` - K3 Car Care example
- `companies/management/commands/onboard_company.py` - Generic onboarding
- `companies/management/commands/onboard_company_with_samples.py` - Sample data
- `docs/K3_CAR_CARE_ONBOARDING_SUMMARY.md` - Example summary

---

**Happy Onboarding! 🚀**
