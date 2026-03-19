# Fix for Floor Manager Assignment Error - NOT NULL Constraint Violation

## Problem Description
When assigning a floor manager on the live server, the following error occurs:
```
Error assigning floor manager: null value in column "warning_10min_sent" of relation "job_cards" violates not-null constraint
DETAIL: Failing row contains (214, qc_pending, null, null, 2026-01-10 13:39:05.648679+00, 2026-01-10 13:39:05.648694+00, 323, null, 24, null, null, f, f, 326, null, [], null, null, null, null, null, null).
```

## Root Cause
The `JobCard` model has several warning boolean fields (`warning_10min_sent`, `warning_15min_sent`, etc.) that are defined with `default=False` but without `null=True`. This means they cannot accept NULL values in the database.

When creating a new `JobCard` using `get_or_create()`, if the database schema doesn't properly enforce the default values (which can happen after migrations), NULL values may be inserted, causing the constraint violation.

## Solution Implemented

### 1. Created Migration to Fix Existing Data and Constraints
**File:** `Backend/jobcards/migrations/0021_fix_warning_fields_not_null.py`

This migration:
- Sets all existing NULL warning fields to `False`
- Re-applies the `NOT NULL` constraint with proper defaults

### 2. Updated JobCard Creation Code
**Files Modified:**
- `Backend/bookings/views.py` (2 locations)

**Changes:**
- Explicitly set all warning fields to `False` when creating a `JobCard` in:
  - `assign_floor_manager()` method (line 765-782)
  - `assign_technician()` method (line 860-877)

This ensures that even if the database defaults aren't working correctly, the application code will always provide explicit values.

## Deployment Steps for Live Server

### Step 1: Backup Database
```bash
# SSH into your live server
ssh user@your-server

# Create a database backup
pg_dump -U your_db_user -d your_db_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Pull Latest Code
```bash
cd /path/to/Car_Software/Backend
git pull origin main  # or your production branch
```

### Step 3: Run Migrations
```bash
# Activate virtual environment
source venv/bin/activate  # or your venv path

# Run migrations
python manage.py migrate jobcards 0021_fix_warning_fields_not_null

# Verify migration was applied
python manage.py showmigrations jobcards
```

### Step 4: Restart Application Services
```bash
# Restart Django/Gunicorn
sudo systemctl restart gunicorn  # or your service name

# Restart Celery Worker (if running)
sudo systemctl restart celery-worker

# Restart Celery Beat (if running)
sudo systemctl restart celery-beat
```

### Step 5: Verify Fix
1. Log into the admin panel
2. Try to assign a floor manager to a booking
3. Verify that the assignment completes without errors
4. Check that the job card is created successfully

## Alternative: Manual Database Fix (If Migration Fails)

If the migration fails for any reason, you can manually fix the database:

```sql
-- Connect to your database
psql -U your_db_user -d your_db_name

-- Update all NULL warning fields to False
UPDATE job_cards SET warning_sent = false WHERE warning_sent IS NULL;
UPDATE job_cards SET warning_15min_sent = false WHERE warning_15min_sent IS NULL;
UPDATE job_cards SET warning_10min_sent = false WHERE warning_10min_sent IS NULL;
UPDATE job_cards SET warning_7min_sent = false WHERE warning_7min_sent IS NULL;
UPDATE job_cards SET warning_5min_sent = false WHERE warning_5min_sent IS NULL;
UPDATE job_cards SET warning_3min_sent = false WHERE warning_3min_sent IS NULL;
UPDATE job_cards SET warning_2min_sent = false WHERE warning_2min_sent IS NULL;
UPDATE job_cards SET warning_1min_sent = false WHERE warning_1min_sent IS NULL;
UPDATE job_cards SET overdue_notification_sent = false WHERE overdue_notification_sent IS NULL;

-- Verify the update
SELECT COUNT(*) FROM job_cards WHERE 
    warning_sent IS NULL OR 
    warning_15min_sent IS NULL OR 
    warning_10min_sent IS NULL OR 
    warning_7min_sent IS NULL OR 
    warning_5min_sent IS NULL OR 
    warning_3min_sent IS NULL OR 
    warning_2min_sent IS NULL OR 
    warning_1min_sent IS NULL OR 
    overdue_notification_sent IS NULL;
-- Should return 0
```

## Testing Checklist

After deployment, test the following:

- [ ] Create a new booking
- [ ] Check in the vehicle
- [ ] Assign a floor manager
- [ ] Verify job card is created successfully
- [ ] Check that all warning fields are set to `false` in the database
- [ ] Verify no errors in application logs
- [ ] Test the complete workflow through to job completion

## Rollback Plan

If issues occur after deployment:

1. **Restore from backup:**
   ```bash
   psql -U your_db_user -d your_db_name < backup_YYYYMMDD_HHMMSS.sql
   ```

2. **Revert code changes:**
   ```bash
   git revert <commit_hash>
   git push origin main
   ```

3. **Restart services:**
   ```bash
   sudo systemctl restart gunicorn
   sudo systemctl restart celery-worker
   sudo systemctl restart celery-beat
   ```

## Files Changed

1. `Backend/jobcards/migrations/0021_fix_warning_fields_not_null.py` (NEW)
2. `Backend/bookings/views.py` (MODIFIED)

## Related Issues

This fix resolves the error that was occurring when:
- Branch admin assigns a floor manager to a booking
- The system tries to create a new JobCard record
- Database constraint violation occurs due to NULL values in warning fields

## Notes

- The warning fields were added in migration `0019_jobcard_warning_10min_sent_and_more.py` and `0020_jobcard_warning_2min_sent.py`
- This issue likely occurred because the live database didn't properly apply the default values during migration
- The fix ensures both database-level and application-level defaults are in place
