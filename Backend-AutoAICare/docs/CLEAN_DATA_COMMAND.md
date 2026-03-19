# Clean Data Command - Company-Wise Data Cleaning

## Overview

The `clean_data` management command allows you to clean non-essential transactional data while preserving configuration data. It now supports **company-specific cleaning** to remove data for a specific company without affecting other companies.

---

## Features

✅ **Company-Specific Cleaning** - Clean data for a specific company only
✅ **Dry Run Mode** - Preview what will be deleted before actual deletion
✅ **Selective Cleaning** - Clean only customer data or only accounting data
✅ **Configuration Preservation** - Automatically preserves services, branches, staff users
✅ **Multi-Tenancy Safe** - Respects company boundaries
✅ **Safety Checks** - Requires confirmation and prevents accidental production runs

---

## Usage

### 1. Preview What Will Be Deleted (Dry Run)

```bash
# Preview all companies
python manage.py clean_data --dry-run

# Preview specific company
python manage.py clean_data --dry-run --company k3-car-care
```

### 2. Clean All Transactional Data

```bash
# Clean all companies (requires typing "DELETE" to confirm)
python manage.py clean_data --confirm

# Clean specific company only
python manage.py clean_data --confirm --company k3-car-care
```

### 3. Clean Only Customer Data

```bash
# Clean customer data for all companies
python manage.py clean_data --confirm --customers-only

# Clean customer data for specific company
python manage.py clean_data --confirm --customers-only --company k3-car-care
```

### 4. Clean Only Accounting Data

```bash
# Clean accounting data for all companies
python manage.py clean_data --confirm --accounting-only

# Clean accounting data for specific company
python manage.py clean_data --confirm --accounting-only --company k3-car-care
```

---

## What Gets Deleted (Non-Essential Data)

### Customer & Booking Data

- ✅ Job Cards and all related data
  - Job Card Activities
  - Dynamic Tasks
  - Job Card Notes
  - Applicator Tasks
  - Vehicle Deliveries
  - Customer Approvals
  - QC Reports (Initial, Supervisor, Final)
  - Parts Used
  - Job Card Photos
- ✅ Bookings
- ✅ Invoices
- ✅ Payments
- ✅ Appointments
- ✅ Feedback
- ✅ Pickup/Drop Requests
- ✅ Memberships
- ✅ Coupons
- ✅ Leads
- ✅ Vehicles
- ✅ Customers
- ✅ Customer Users (role='customer')
- ✅ Parts Catalog
- ✅ Notifications (in-app and logs)

### Accounting Data

- ✅ Expenses
- ✅ Transactions
- ✅ Payroll
- ✅ Petty Cash
- ✅ Inter-Branch Transfers
- ✅ Leave Balances
- ✅ Leave Requests
- ✅ Leave Encashments
- ✅ Tax Declarations
- ✅ Form 16

---

## What Gets Preserved (Configuration Data)

### Always Preserved

- ✅ Service Packages
- ✅ Add-ons
- ✅ Branches
- ✅ Vehicle Brands (global)
- ✅ Vehicle Models (global)
- ✅ Vehicle Colors (global)
- ✅ Staff Users (all roles except 'customer')
  - company_admin
  - branch_admin
  - floor_manager
  - supervisor
  - applicator
- ✅ Company Settings
- ✅ Attendance Policies
- ✅ Workflow Templates
- ✅ Lead Sources
- ✅ Domain Mappings

---

## Company-Specific Cleaning

When you use the `--company` flag, the command will:

1. **Filter all deletions** to only affect data belonging to that company
2. **Show company name** in the header
3. **Preserve other companies' data** completely untouched
4. **Verify** that only the specified company's data was affected

### Example: Clean K3 Car Care Data Only

```bash
# Dry run first
python manage.py clean_data --dry-run --company k3-car-care

# Output:
# ======================================================================
# DATABASE CLEANING - DRY RUN MODE - K3 Car Care
# ======================================================================
# ✓ Found company: K3 Car Care (k3-car-care)
#
# Records to be deleted:
#   JobCard                        :     50 records
#   Booking                        :     75 records
#   Customer                       :     30 records
#   ...
#
# Configuration data to be PRESERVED:
#   ServicePackage                 :     19 records
#   Branch                         :      4 records
#   Admin/Staff Users              :     28 records

# If satisfied, run actual deletion
python manage.py clean_data --confirm --company k3-car-care
# Type "DELETE" to confirm
```

---

## Safety Features

### 1. Environment Check

- **Prevents running in production** unless `--force` flag is used
- Checks `DEBUG` setting

```bash
# In production, you must use --force
python manage.py clean_data --confirm --force --company test-company
```

### 2. Confirmation Required

- Must use either `--dry-run` or `--confirm`
- Must type "DELETE" to proceed with actual deletion

### 3. Transaction Safety

- All deletions happen in a single database transaction
- If any error occurs, all changes are rolled back

### 4. Verification

- Shows before and after counts
- Verifies preserved data wasn't affected

---

## Common Use Cases

### 1. Clean Test Data After Demo

```bash
# Clean all test bookings and customers for demo company
python manage.py clean_data --confirm --company demo-company
```

### 2. Reset Company to Fresh State

```bash
# Remove all transactional data but keep configuration
python manage.py clean_data --confirm --company k3-car-care
```

### 3. Clean Old Customer Data

```bash
# Remove only customer-related data
python manage.py clean_data --confirm --customers-only --company old-company
```

### 4. Clean Accounting Records

```bash
# Remove only accounting data for year-end cleanup
python manage.py clean_data --confirm --accounting-only --company company-slug
```

---

## Example Output

### Dry Run Output

```
======================================================================
DATABASE CLEANING - DRY RUN MODE - K3 Car Care
======================================================================
✓ Found company: K3 Car Care (k3-car-care)

Records to be deleted:

  JobCardActivity                :     120 records
  DynamicTask                    :      45 records
  JobCard                        :      50 records
  Booking                        :      75 records
  Invoice                        :      50 records
  Payment                        :      48 records
  Vehicle                        :      30 records
  Customer                       :      25 records
  CustomerUsers                  :      25 records
  Lead                           :      15 records
  NotificationLog                :     200 records

  TOTAL                          :     683 records

Configuration data to be PRESERVED:

  ServicePackage                 :      19 records
  AddOn                          :       6 records
  Branch                         :       4 records
  VehicleBrand                   :      50 records
  VehicleModel                   :     300 records
  VehicleColor                   :      20 records
  Admin/Staff Users              :      28 records

[OK] Dry run completed. No data was deleted.
```

### Actual Deletion Output

```
======================================================================
DATABASE CLEANING - DELETION MODE - K3 Car Care
======================================================================
✓ Found company: K3 Car Care (k3-car-care)

Records to be deleted:
  ... (same as dry run)

Configuration data to be PRESERVED:
  ... (same as dry run)

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  WARNING: This will permanently delete data!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

Type "DELETE" to confirm: DELETE

Deleting data...

[OK] Data deletion completed successfully!

Deleted records:
  JobCardActivity                :     120 records
  JobCard                        :      50 records
  Booking                        :      75 records
  Customer                       :      25 records
  ...

  TOTAL DELETED                  :     683 records

Verified preserved data:
  [OK] ServicePackage            :      19 records
  [OK] AddOn                     :       6 records
  [OK] Branch                    :       4 records
  [OK] Admin/Staff Users         :      28 records
```

---

## Important Notes

### 1. Cascade Deletions

- Django's CASCADE delete will automatically remove related records
- Example: Deleting a Customer will also delete their Vehicles, Bookings, etc.

### 2. Company Filtering

- All models are filtered by company using appropriate foreign key relationships
- Some models use direct `company` field
- Others use `job_card__company`, `booking__company`, `customer__company`, etc.

### 3. Global Data

- Vehicle Brands, Models, and Colors are global (not company-specific)
- These are never deleted, regardless of company filter

### 4. Staff Users

- Staff users (non-customer roles) are always preserved
- Only customer users are deleted

---

## Troubleshooting

### Error: "Company with slug 'xxx' not found"

- Check the company slug is correct
- List companies: `python manage.py shell -c "from companies.models import Company; print(list(Company.objects.values_list('slug', flat=True)))"`

### Error: "Cannot run in production"

- Use `--force` flag if you're sure
- Or set `DEBUG=True` temporarily (not recommended)

### Error: Foreign key constraint violation

- This shouldn't happen as deletions are ordered correctly
- If it does, report the issue

---

## Best Practices

1. **Always run dry-run first**

   ```bash
   python manage.py clean_data --dry-run --company your-company
   ```

2. **Backup database before cleaning**

   ```bash
   pg_dump your_database > backup_before_clean.sql
   ```

3. **Use company-specific cleaning in production**

   ```bash
   # Safer than cleaning all companies
   python manage.py clean_data --confirm --company specific-company
   ```

4. **Clean in stages if unsure**

   ```bash
   # First clean only customer data
   python manage.py clean_data --confirm --customers-only --company test-co
   
   # Then clean accounting if needed
   python manage.py clean_data --confirm --accounting-only --company test-co
   ```

---

## Related Commands

- `onboard_company` - Create a new company with configuration
- `onboard_k3car` - Onboard K3 Car Care with real data
- `seed_services` - Add service packages to a company
- `seed_parts` - Add parts catalog to a company

---

**Use this command carefully! Always run with `--dry-run` first to preview deletions.**
