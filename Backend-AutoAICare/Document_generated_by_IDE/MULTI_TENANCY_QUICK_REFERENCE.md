# Multi-Tenancy Quick Reference Guide

## 🚀 Quick Start

### Create a New Company

```bash
python manage.py create_company \
  --name "Company Name" \
  --email "contact@company.com" \
  --phone "1234567890" \
  --city "City" \
  --state "State" \
  --admin-email "admin@company.com" \
  --admin-name "Admin Name" \
  --admin-password "SecurePassword123"
```

### Verify Multi-Tenancy

```bash
python verify_multitenancy.py
```

---

## 📋 Updated Models by App

| App | Models Updated | Migration File |
|-----|----------------|----------------|
| **companies** | Company, CompanySettings | `0001_initial` |
| **users** | User | `user_company` |
| **branches** | Branch, ServiceBay | `0004_branch_company...` |
| **customers** | Customer, Vehicle | `0012_customer_company...` |
| **services** | ServicePackage, AddOn | `0009_addon_company...` |
| **bookings** | Booking | `0014_booking_company` |
| **jobcards** | JobCard, JobCardPhoto, PartUsed | `0026_jobcard_company...` |
| **billing** | Invoice, InvoiceItem | `0005_invoice_company...` |
| **payments** | Payment | `0006_payment_company` |
| **accounting** | Vendor, Expense, Transaction | `0011_expense_company...` |
| **memberships** | Plan, Benefit, Membership, Coupon | `0005_coupon_company...` |
| **leads** | Lead, LeadSource | `0002_lead_company_ref...` |
| **store** | Product, Order | `0003_order_company...` |
| **feedback** | Feedback | `0003_feedback_company` |
| **attendance** | AttendanceRecord, AttendancePolicy | `0002_attendancepolicy_company...` |
| **notify** | NotificationTemplate, InAppNotification | `0010_inappnotification_company...` |

**Total: 30+ models across 16 apps**

---

## 🔑 Key Components

### 1. CompanyManager

**Location:** `companies/managers.py`

Automatically filters queries by current company:

```python
from companies.managers import CompanyManager

class MyModel(models.Model):
    company = models.ForeignKey('companies.Company', ...)
    objects = CompanyManager()  # ← Add this
```

### 2. CompanyMiddleware

**Location:** `companies/middleware.py`  
**Config:** `config/settings.py` (MIDDLEWARE)

Sets company context from authenticated user.

### 3. Model Pattern

```python
from companies.managers import CompanyManager

class YourModel(models.Model):
    # Multi-tenancy field
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='your_models',
        null=True,
        blank=True
    )
    
    # Your fields...
    
    # Company-aware manager
    objects = CompanyManager()
    
    class Meta:
        # Company-specific unique constraints
        unique_together = [['company', 'unique_field']]
```

---

## 💡 Usage Examples

### In Views/ViewSets

```python
# Automatic filtering (recommended)
branches = Branch.objects.all()  # Already filtered by company
customers = Customer.objects.filter(name__icontains="John")  # Already scoped

# Manual override (admin only)
all_branches = Branch.objects.filter(company__isnull=False)
```

### In Serializers

```python
class BookingSerializer(serializers.ModelSerializer):
    def validate(self, data):
        # Ensure related objects belong to same company
        if data['vehicle'].customer.company != data['service'].company:
            raise ValidationError("Company mismatch")
        return data
    
    def create(self, validated_data):
        # Auto-set company from context/user
        validated_data['company'] = self.context['request'].user.company
        return super().create(validated_data)
```

### Manual Context Setting

```python
from companies.middleware import set_current_company
from companies.models import Company

company = Company.objects.get(id=1)
set_current_company(company)

# All queries now use this company
data = MyModel.objects.all()

# Don't forget to clear!
from companies.middleware import clear_current_company
clear_current_company()
```

---

## ⚙️ Configuration

### Settings Required

```python
# config/settings.py

INSTALLED_APPS = [
    ...
    'companies',  # Must be added
    ...
]

MIDDLEWARE = [
    ...
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'companies.middleware.CompanyMiddleware',  # After auth
    ...
]
```

---

## 🔍 Troubleshooting

### Issue: Queries returning all data

**Solution:** Ensure CompanyManager is set on model

```python
objects = CompanyManager()  # Add this line
```

### Issue: Company context not set

**Solution:** Check middleware order and user.company exists

```python
# Middleware must come AFTER AuthenticationMiddleware
# User must have company field populated
```

### Issue: Unique constraint errors

**Solution:** Update unique constraints to be company-scoped

```python
class Meta:
    unique_together = [['company', 'field_name']]
```

### Issue: Related objects from different companies

**Solution:** Add validation in serializer or model save

```python
def clean(self):
    if self.related_obj.company != self.company:
        raise ValidationError("Company mismatch")
```

---

## 📊 Verification Checklist

- [ ] Migrations applied: `python manage.py migrate`
- [ ] Test company created: `python manage.py create_company ...`
- [ ] Verification script run: `python verify_multitenancy.py`
- [ ] All models have `company` field
- [ ] All models use `CompanyManager`
- [ ] Middleware configured in settings
- [ ] User model has company field
- [ ] Test queries filtering correctly

---

## 🎯 Best Practices

1. **Always use CompanyManager** on models with company field
2. **Validate company relationships** in serializers
3. **Don't bypass filtering** unless absolutely necessary
4. **Use unique_together** for company-scoped uniqueness
5. **Auto-set company** from request.user in create operations
6. **Test isolation** between companies regularly
7. **Document exceptions** where global data is appropriate

---

## 📞 Support

For issues or questions:

1. Check this guide first
2. Review `MULTI_TENANCY_IMPLEMENTATION_COMPLETE.md`
3. Run verification script
4. Check Django logs for company context issues

---

**Last Updated:** February 6, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
