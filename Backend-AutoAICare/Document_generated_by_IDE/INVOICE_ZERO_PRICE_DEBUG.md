# Invoice Generation Debug Script

## Issue: Draft invoice shows ₹0.00 even though service is ₹5900

### Problem Analysis:

Looking at the invoice data from the frontend:
```json
{
  "id": 97,
  "item_type": "service",
  "description": "Bike Graphene Coating",
  "quantity": "1.00",
  "unit_price": "0.00",  // ❌ PROBLEM: Should be 5000.00
  "total": "0.00"
}
```

But the Service Information shows:
```
Bike Graphene Coating: ₹5000.00
GST (18%): ₹900.00
Total: ₹5900.00
```

### Root Cause:

The `generate_bill` endpoint (line 236-243 in `billing/views.py`) uses:
```python
if jobcard.booking.package:
    InvoiceItem.objects.create(
        invoice=invoice,
        item_type='service',
        description=jobcard.booking.package.name,
        quantity=1,
        unit_price=jobcard.booking.package.price  // ❌ This is 0!
    )
```

**The problem**: `jobcard.booking.package.price` is returning 0, but the booking has the correct price in `price_breakdown`.

### Solution:

The booking stores the actual price in `price_breakdown.package.price`, not in `package.price`.

The `package.price` is the base price from the ServicePackage model, but the actual price paid might be different due to:
- Vehicle type (car vs bike)
- Discounts
- Special pricing

### Fix:

Update the `generate_bill` endpoint to use the price from booking's price_breakdown instead:

```python
# OLD CODE (line 236-243):
if jobcard.booking.package:
    InvoiceItem.objects.create(
        invoice=invoice,
        item_type='service',
        description=jobcard.booking.package.name,
        quantity=1,
        unit_price=jobcard.booking.package.price  # ❌ Wrong!
    )

# NEW CODE:
if jobcard.booking.package:
    # Get the actual price from booking's price_breakdown
    package_price = 0
    if hasattr(jobcard.booking, 'price_breakdown') and jobcard.booking.price_breakdown:
        package_price = jobcard.booking.price_breakdown.get('package', {}).get('price', 0)
    else:
        # Fallback to package base price
        package_price = jobcard.booking.package.price
    
    InvoiceItem.objects.create(
        invoice=invoice,
        item_type='service',
        description=jobcard.booking.package.name,
        quantity=1,
        unit_price=package_price  # ✅ Correct!
    )
```

### Same Fix Needed For:

1. **Add-ons** (line 246-253): Use `price_breakdown.addons[].price`
2. **from_jobcard endpoint** (line 415-422): Same issue

### Files to Modify:

- `Backend/billing/views.py` - Lines 236-253 (generate_bill)
- `Backend/billing/views.py` - Lines 415-432 (from_jobcard)

---

**Status**: Ready to implement fix
**Impact**: Critical - All draft invoices show ₹0.00
**Priority**: High
