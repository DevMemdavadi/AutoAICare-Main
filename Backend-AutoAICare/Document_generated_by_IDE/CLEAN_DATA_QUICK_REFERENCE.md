# Quick Reference: Database Cleaning Command

## Quick Commands

### Preview what will be deleted (recommended first step)
```bash
python manage.py clean_data --dry-run
```

### Delete all transactional data
```bash
python manage.py clean_data --confirm
```

### Delete only customer data
```bash
python manage.py clean_data --confirm --customers-only
```

### Delete only accounting data
```bash
python manage.py clean_data --confirm --accounting-only
```

## What Gets Deleted

- ❌ Customer accounts & vehicles
- ❌ Bookings & appointments
- ❌ Job cards & related data
- ❌ Accounting records (expenses, payroll, transactions)
- ❌ Notifications & feedback
- ❌ Invoices & payments

## What Gets Preserved

- ✅ Service packages & add-ons
- ✅ Branches & settings
- ✅ Vehicle reference data (brands, models, colors)
- ✅ Parts catalog
- ✅ Admin & staff users
- ✅ System configuration

## Safety Features

1. **Dry-run mode** - Preview before deleting
2. **Confirmation required** - Must type "DELETE" to proceed
3. **Environment check** - Won't run in production without --force
4. **Transaction safety** - All changes rolled back on error

## Example Output

```
============================================================
  DATABASE CLEANING - DRY RUN MODE
============================================================

Records to be deleted:

  JobCard                        :     57 records
  Booking                        :     82 records
  Customer                       :     43 records
  NotificationLog                :   1120 records
  Expense                        :      9 records
  ...

  TOTAL                          :   3125 records

Configuration data to be PRESERVED:

  ServicePackage                 :     19 records
  Branch                         :      4 records
  Admin/Staff Users              :     29 records
  ...

[OK] Dry run completed. No data was deleted.
```

## Important Notes

⚠️ **Always backup your database before running with --confirm**
⚠️ **Run --dry-run first to preview changes**
⚠️ **This action cannot be undone**

For detailed documentation, see: DATABASE_CLEANING_GUIDE.md
