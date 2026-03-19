# ✅ GST Tracking Added to Performance Dashboard

## Issue Resolved: Cost Mismatch

**Problem:** Performance dashboard was showing service value (₹1,797) but not what the customer actually paid (₹2,120.46 with GST).

**Solution:** Added complete GST tracking to show both service value and customer-paid amount.

---

## What Was Changed

### **Backend Changes:**

#### 1. **Performance Model** (`performance_models.py`)
Added two new fields to `PerformanceMetrics`:
- `gst_amount` - GST charged to customer
- `total_with_gst` - Total amount customer paid (service + GST)

**Migration created:** `0025_add_gst_to_performance.py`

#### 2. **Performance Service** (`performance_service.py`)
Updated `record_job_completion()` to capture GST data from booking:
```python
# Calculate GST (what customer actually paid)
gst_amount = Decimal('0')
total_with_gst = job_value

if jobcard.booking:
    gst_amount = jobcard.booking.gst_amount or Decimal('0')
    total_with_gst = jobcard.booking.total_price or job_value
```

#### 3. **Performance Serializer** (`performance_serializers.py`)
Added `gst_amount` and `total_with_gst` to API response fields.

#### 4. **Management Commands**
Created `update_performance_gst.py` to backfill existing records with GST data.

---

### **Frontend Changes:**

#### 1. **Job Performance Table** (`JobPerformanceTable.jsx`)

**Job Value Column - Now shows:**
- **Primary:** Total amount customer paid (with GST) - ₹2,120.46
- **Secondary:** Service value (without GST) - ₹1,797

**Before:**
```
Job Value
₹1,797
```

**After:**
```
Job Value
₹2,121         ← What customer paid
Service: ₹1,797 ← Service value
```

**Expanded Row - Now shows:**
```
Pricing & Rewards
━━━━━━━━━━━━━━━━━━━━━━
Service Value:    ₹1,797
GST (18%):        ₹  323
Customer Paid:    ₹2,121  ← Highlighted in blue
━━━━━━━━━━━━━━━━━━━━━━
Total Reward:     ₹   27
Supervisor (50%): ₹   14
Applicators (50%): ₹   13
```

---

## Example: Job #353

### **Before Fix:**
```
Job Value: ₹1,497  ❌ (Missing package + wrong total)
```

### **After All Fixes:**
```
Table View:
-----------
Job Value: ₹2,121
Service: ₹1,797

Expanded View:
--------------
Pricing & Rewards
Service Value:    ₹1,797  ✓ (Package ₹300 + Addons ₹1,497)
GST (18%):        ₹  323  ✓
Customer Paid:    ₹2,121  ✓ (What they actually paid)

Breakdown:
- Package (Bike): ₹300
- Add-ons:        ₹1,497
  - Alloy Polish: ₹399
  - Engine Clean: ₹499
  - Odor Removal: ₹599
━━━━━━━━━━━━━━━━━━━━━━
Subtotal:         ₹1,797
GST (18%):        ₹  323
TOTAL:            ₹2,121  ← Invoice total
```

---

## Database Updates

**Command Run:**
```bash
python manage.py update_performance_gst --all
```

**Result:**
- Updated all existing performance records with GST data
- Pulled GST amounts from linked bookings
- Calculated total_with_gst for each job

---

## How It Works

### **Data Flow:**

```
1. Customer places order
   Package: ₹300
   Add-ons: ₹1,497
   ↓
2. Booking calculates GST
   Subtotal: ₹1,797
   GST (18%): ₹323
   Total: ₹2,121
   ↓
3. Job completed
   ↓
4. Performance record created
   job_value: ₹1,797 (service value)
   gst_amount: ₹323 (tax)
   total_with_gst: ₹2,121 (customer paid)
   ↓
5. Dashboard displays
   PRIMARY: ₹2,121 (what customer paid)
   SECONDARY: ₹1,797 (service value)
```

---

## API Response

**GET /api/jobcards/performance/job-details-list/**

```json
{
  "results": [{
    "id": 178,
    "jobcard_id": 353,
    "branch_name": "K3 Car Care - Shree Ramnagar",
    "job_value": "1797.00",
    "package_value": "300.00",
    "addons_value": "1497.00",
    "parts_value": "0.00",
    "gst_amount": "323.46",
    "total_with_gst": "2120.46",
    "reward_amount": "27.00",
    ...
  }]
}
```

---

## Benefits

### **1. Accurate Revenue Tracking**
- See actual customer payments, not just service value
- Critical for accounting and financial analysis

### **2. Clear Cost Breakdown**
- Service value vs. customer-paid amount
- GST clearly separated
- Full transparency

### **3. Better Decision Making**
- Understand true job profitability
- Compare service value to customer cost
- Calculate reward percentages based on service value (not GST-inclusive total)

---

## Commands Reference

### **Update Existing Records:**
```bash
# Update all records with GST data
python manage.py update_performance_gst --all

# Update specific job
python manage.py update_performance_gst --job-id 353
```

### **Verify Data:**
```bash
# Check a specific job
python manage.py shell -c "from jobcards.performance_models import PerformanceMetrics; p = PerformanceMetrics.objects.get(jobcard_id=353); print(f'Service: ₹{p.job_value}'); print(f'GST: ₹{p.gst_amount}'); print(f'Total: ₹{p.total_with_gst}')"
```

**Expected Output:**
```
Service: ₹1797.00
GST: ₹323.46
Total: ₹2120.46
```

---

## UI/UX Design

### **Visual Hierarchy:**

**Primary (Bold, Larger):** Customer-paid amount  
**Secondary (Small, Gray):** Service value

This emphasizes what matters most - the actual revenue.

### **Color Coding:**

- **Blue** - Customer-paid total (important)
- **Green** - Supervisor rewards
- **Blue** - Applicator rewards
- **Gray** - Service values, GST

---

## Migration Details

### **Migration: `0025_add_gst_to_performance.py`**

**Fields Added:**
```python
gst_amount = models.DecimalField(
    max_digits=10,
    decimal_places=2,
    default=0,
    help_text='GST amount charged to customer'
)

total_with_gst = models.DecimalField(
    max_digits=10,
    decimal_places=2,
    default=0,
    help_text='Total amount customer paid (including GST)'
)
```

**Run with:**
```bash
python manage.py migrate jobcards
```

---

## Future Jobs

### **Automatic Tracking:**
All **new** job completions will automatically:
1. Calculate service value (package + addons + parts)
2. Pull GST amount from booking
3. Store total customer-paid amount
4. Display both values in dashboard

**No manual work required!**

---

## Summary

✅ **Package value fixed** (₹0 → ₹300)  
✅ **GST tracking added** (₹323.46)  
✅ **Customer-paid amount shown** (₹2,120.46)  
✅ **Service value still visible** (₹1,797)  
✅ **All existing records updated** (18 jobs)  
✅ **Future jobs auto-tracked**  

**The performance dashboard now shows exactly what customers paid!** 🎉

---

## Comparison

### **Job Card Display:**
```
Premium Bike Wash:         ₹300.00
Add-ons:
  Alloy Wheel Polish:      ₹399.00
  Engine Bay Cleaning:     ₹499.00
  Odor Removal Treatment:  ₹599.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal:                  ₹1,797.00
GST (18%):                 ₹  323.46
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Amount:              ₹2,120.46  ← Customer pays this
```

### **Performance Dashboard Now Shows:**
```
Service Value:             ₹1,797.00
GST (18%):                 ₹  323.46
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Customer Paid:             ₹2,120.46  ← Matches invoice!
```

**Perfect alignment** between job card and performance tracking! ✅
