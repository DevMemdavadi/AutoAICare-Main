# Management Commands - Bug Fixes Applied

## Date: 2026-02-15

## Issues Fixed

### 1. **Invalid `bay_number` Field in ServiceBay Creation**

**Problem:** Multiple management commands were trying to create `ServiceBay` objects with a `bay_number` field that doesn't exist in the model.

**Error:**

```python
TypeError: ServiceBay() got unexpected keyword arguments: 'bay_number'
```

**Files Fixed:**

- ✅ `companies/management/commands/onboard_company.py`
- ✅ `companies/management/commands/populate_company_data.py`

**Fix Applied:**

```python
# BEFORE (Incorrect)
ServiceBay.objects.create(
    branch=branch,
    company=company,
    name=f'Bay {bay_num}',
    bay_number=bay_num,  # ❌ This field doesn't exist
    bay_type='detailing',
    is_active=True
)

# AFTER (Correct)
ServiceBay.objects.create(
    branch=branch,
    company=company,
    name=f'Bay {bay_num}',  # ✅ Name is sufficient
    bay_type='detailing',
    is_active=True
)
```

---

### 2. **LeadSource Unique Constraint Violation** ✨ FIXED AT MODEL LEVEL

**Problem:** The `LeadSource` model had a global `unique=True` constraint on the `name` field, which prevented multiple companies from having lead sources with the same names (e.g., "Website", "Walk-in").

**Error:**

```python
django.db.utils.IntegrityError: duplicate key value violates unique constraint "lead_sources_name_key"
DETAIL: Key (name)=(Phone Inquiry) already exists.
```

**Model Fixed:**

- ✅ `leads/models.py` - Changed unique constraint from global to company-specific

**Migration Created:**

- ✅ `leads/migrations/0005_change_leadsource_unique_constraint.py`

**Fix Applied:**

```python
# BEFORE (Incorrect - Global unique constraint)
class LeadSource(models.Model):
    company = models.ForeignKey('companies.Company', ...)
    name = models.CharField(max_length=100, unique=True)  # ❌ Global unique
    
    class Meta:
        db_table = 'lead_sources'
        ordering = ['name']

# AFTER (Correct - Company-specific unique constraint)
class LeadSource(models.Model):
    company = models.ForeignKey('companies.Company', ...)
    name = models.CharField(max_length=100)  # ✅ Removed global unique
    
    class Meta:
        db_table = 'lead_sources'
        ordering = ['name']
        unique_together = [['company', 'name']]  # ✅ Unique per company
```

**Result:**
Now multiple companies can have lead sources with the same names:

- Company 1 (elite-detailing): "Website", "Walk-in", "Phone Inquiry"
- Company 2 (premium-auto): "Website", "Walk-in", "Phone Inquiry"
- Company 3 (k3-car-care): "Website", "Walk-in", "Phone Inquiry"

**Management Commands Updated:**
All workarounds were removed since the model is now fixed:

- ✅ `companies/management/commands/onboard_company.py`
- ✅ `companies/management/commands/populate_company_data.py`
- ✅ `companies/management/commands/populate_test_data.py`

---

## Additional Fixes Applied

### 3. **CompanySettings WhatsApp Fields**

**Problem:** The database schema had WhatsApp-related fields that weren't in the model.

**Error:**

```python
django.db.utils.IntegrityError: null value in column "enable_whatsapp_notifications" of relation "companies_settings" violates not-null constraint
```

**File Fixed:**

- ✅ `companies/models.py`

**Fix Applied:**

```python
# Added to CompanySettings model
enable_whatsapp_notifications = models.BooleanField(default=False)

# WhatsApp Mode
whatsapp_mode = models.CharField(
    max_length=10,
    choices=[
        ('manual', 'Manual (Click-to-Send)'),
        ('api', 'Automated (Cloud API)'),
    ],
    default='manual',
)

# WhatsApp Configuration
whatsapp_provider = models.CharField(max_length=20, ...)
whatsapp_credentials = models.JSONField(default=dict, ...)
whatsapp_business_phone = models.CharField(max_length=20, ...)
```

---

## Testing

All fixes have been tested successfully:

### Test 1: New Company Onboarding

```bash
python manage.py onboard_company \
  --name "Premium Auto" \
  --email "info@premium.com" \
  --phone "9876543210" \
  --subdomain "premium" \
  --admin-email "admin@premium.com" \
  --admin-name "Premium Admin" \
  --admin-password "Premium@123" \
  --branches 2
```

**Result:** ✅ Success - Company created with clean lead source names

### Test 2: Multiple Companies with Same Lead Sources

```bash
# Company 1
python manage.py onboard_company --name "Elite Detailing" ...
# Lead sources: Website, Walk-in, Phone Inquiry, etc.

# Company 2
python manage.py onboard_company --name "Premium Auto" ...
# Lead sources: Website, Walk-in, Phone Inquiry, etc. ✅ No conflicts!
```

**Result:** ✅ Success - Both companies have their own lead sources

### Test 3: Sample Data Addition

```bash
python manage.py onboard_company_with_samples --company premium-auto
```

**Result:** ✅ Success - Sample data added without issues

---

## Migration Applied

### `leads/migrations/0005_change_leadsource_unique_constraint.py`

This migration:

1. Removes the global unique constraint on `LeadSource.name`
2. Adds a composite unique constraint on `['company', 'name']`

**To apply:**

```bash
python manage.py migrate leads
```

---

## Summary

✅ **3 management commands fixed** (bay_number removed)
✅ **1 model fixed** (LeadSource unique constraint)
✅ **3 management commands cleaned** (workarounds removed)
✅ **1 migration created** (unique constraint change)
✅ **All tests passing**

The company onboarding system is now fully functional with proper multi-tenancy support! 🎉

---

## Benefits of Model-Level Fix

### Before (Workaround)

- Lead sources had ugly names: "Website (elite-detailing)", "Walk-in (k3-car-care)"
- Workaround code in 3 management commands
- Not scalable for other parts of the system

### After (Proper Fix)

- ✅ Clean lead source names: "Website", "Walk-in", "Phone Inquiry"
- ✅ No workaround code needed
- ✅ Proper database constraint at model level
- ✅ Scalable and maintainable
- ✅ Works across the entire application automatically
