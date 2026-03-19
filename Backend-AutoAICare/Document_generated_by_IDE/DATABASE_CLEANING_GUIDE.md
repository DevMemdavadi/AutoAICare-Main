# Database Cleaning Command

## Overview

The `clean_data` management command allows you to clean transactional data from the database while preserving essential configuration data like services, branches, and system settings.

## What Gets Deleted (Transactional Data)

### Customer & Booking Data
- Customer accounts and their vehicles
- All bookings and appointments
- Job cards and all related data:
  - Job card photos
  - Parts used
  - QC reports
  - Supervisor reviews
  - Final QC reports
  - Customer approvals
  - Vehicle deliveries
  - Applicator tasks
  - Job card notes and activities
  - Dynamic tasks

### Accounting & Financial Data
- Expenses
- Transactions
- Payroll records
- Petty cash transactions
- Inter-branch transfers
- Leave balances and requests
- Leave encashments
- Tax declarations
- Form 16 records

### Other Data
- Invoices
- Payments
- Feedback
- Notifications
- Pickup requests
- Memberships and coupons

## What Gets Preserved (Configuration Data)

### Service Configuration
- Service packages and pricing
- Add-on services
- Parts catalog

### Branch & Location Data
- Branch information
- Branch settings

### Vehicle Reference Data
- Vehicle brands
- Vehicle models
- Vehicle colors

### System Configuration
- Reward settings
- Vendor information
- Employee salary structures
- Recurring expense templates
- Branch budgets
- Leave type definitions
- Tax slab configurations

### User Accounts
- Admin users (super_admin, branch_admin)
- Staff users (floor_manager, supervisor, applicator)

## Usage

### 1. Preview What Will Be Deleted (Dry Run)

```bash
python manage.py clean_data --dry-run
```

This will show you exactly what will be deleted without actually deleting anything.

### 2. Delete All Transactional Data

```bash
python manage.py clean_data --confirm
```

This will delete all transactional data after confirmation.

### 3. Delete Only Customer Data

```bash
python manage.py clean_data --confirm --customers-only
```

This will delete only customer-related data (bookings, job cards, customers) while preserving accounting data.

### 4. Delete Only Accounting Data

```bash
python manage.py clean_data --confirm --accounting-only
```

This will delete only accounting data while preserving customer and booking data.

### 5. Preserve Staff Users

```bash
python manage.py clean_data --confirm --preserve-staff
```

This will preserve staff user accounts (floor_manager, supervisor, applicator) in addition to admin users.

## Safety Features

### 1. Environment Check
The command will not run in production environment (when `DEBUG=False`) unless you use the `--force` flag.

```bash
# Use with extreme caution in production
python manage.py clean_data --confirm --force
```

### 2. Confirmation Required
You must use either `--dry-run` or `--confirm` flag. The command will not run without one of these flags.

### 3. Double Confirmation
When using `--confirm`, you must type "DELETE" to proceed with the deletion.

### 4. Transaction Safety
All deletions are wrapped in a database transaction. If any error occurs, all changes will be rolled back.

## Example Workflow

### Step 1: Preview the deletion
```bash
python manage.py clean_data --dry-run
```

**Output:**
```
============================================================
  DATABASE CLEANING - DRY RUN MODE
============================================================

Records to be deleted:

  JobCardActivity                :     45 records
  DynamicTask                    :     12 records
  JobCard                        :     23 records
  Booking                        :     23 records
  Customer                       :     15 records
  CustomerUsers                  :     15 records
  Expense                        :     67 records
  Transaction                    :     89 records
  ...

  TOTAL                          :    289 records

Configuration data to be PRESERVED:

  ServicePackage                 :     12 records
  Branch                         :      2 records
  VehicleBrand                   :     45 records
  Admin/Staff Users              :      8 records

✓ Dry run completed. No data was deleted.
```

### Step 2: Confirm and delete
```bash
python manage.py clean_data --confirm
```

**You will be prompted:**
```
============================================================
  WARNING: This will permanently delete data!
============================================================

Type "DELETE" to confirm: DELETE
```

**Output:**
```
Deleting data...

✓ Data deletion completed successfully!

Deleted records:

  JobCardActivity                :     45 records
  JobCard                        :     23 records
  Booking                        :     23 records
  Customer                       :     15 records
  ...

  TOTAL DELETED                  :    289 records

Verified preserved data:

  ✓ ServicePackage               :     12 records
  ✓ Branch                       :      2 records
  ✓ Admin/Staff Users            :      8 records
```

## Common Use Cases

### 1. Clean Development Database
```bash
# Preview first
python manage.py clean_data --dry-run

# Then clean
python manage.py clean_data --confirm
```

### 2. Reset Customer Data Only
```bash
python manage.py clean_data --confirm --customers-only
```

### 3. Reset Accounting Data Only
```bash
python manage.py clean_data --confirm --accounting-only
```

### 4. Clean Everything But Keep Staff
```bash
python manage.py clean_data --confirm --preserve-staff
```

## Important Notes

1. **Always run `--dry-run` first** to preview what will be deleted
2. **Backup your database** before running the command with `--confirm`
3. **Cannot be undone** - deleted data is permanently removed
4. **Production safety** - command will refuse to run in production without `--force` flag
5. **Preserves configuration** - all service packages, branches, and settings are kept

## Troubleshooting

### Command not found
Make sure you're in the Backend directory:
```bash
cd d:\Car_Software\Backend
python manage.py clean_data --dry-run
```

### Permission denied
Run with appropriate permissions or as administrator.

### Foreign key constraint errors
The command deletes data in the correct order to respect foreign key constraints. If you encounter errors, please report them.

## Support

If you encounter any issues or need help, please check:
1. The dry-run output to understand what will be deleted
2. Your database backup is up to date
3. You're using the correct flags for your use case
