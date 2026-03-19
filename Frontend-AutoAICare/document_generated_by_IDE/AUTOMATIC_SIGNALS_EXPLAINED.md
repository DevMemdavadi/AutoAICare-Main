# 🔄 Automatic Performance Tracking with Django Signals

## Yes, We Use Signals! ✅

Performance metrics are **automatically** created using **Django signals** when jobs are completed. No manual intervention needed!

---

## How It Works

### **Django Signal Flow:**

```
Job Status Changes
       ↓
Django post_save Signal Triggered
       ↓
Signal Handler: record_performance_on_completion()
       ↓
Check: Is status a completion status?
       ↓
Check: Does job have start time?
       ↓
Check: Does performance record already exist?
       ↓
Call: PerformanceTrackingService.record_job_completion()
       ↓
Performance Metrics Created ✅
       ↓
Team Aggregates Updated ✅
       ↓
Log Success ✅
```

---

## Signal Configuration

### **Location:** `jobcards/signals.py`

```python
@receiver(post_save, sender=JobCard)
def record_performance_on_completion(sender, instance, created, **kwargs):
    """
    Automatically record performance metrics when job is completed.
    
    This signal triggers when a job reaches any completion status:
    - work_completed
    - final_qc_passed
    - ready_for_billing
    - billed
    - ready_for_delivery
    - delivered
    - closed
    """
    completion_statuses = [
        'work_completed',
        'final_qc_passed',
        'ready_for_billing',
        'billed',
        'ready_for_delivery',
        'delivered',
        'closed'
    ]
    
    if instance.status in completion_statuses and instance.job_started_at:
        if not hasattr(instance, 'performance') or not instance.performance:
            PerformanceTrackingService.record_job_completion(instance)
```

---

## Registration

### **Location:** `jobcards/apps.py`

```python
class JobcardsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'jobcards'
    
    def ready(self):
        import jobcards.signals  # ← Signals registered here
        import jobcards.parts_signals
```

**This ensures signals are loaded when Django starts** ✅

---

## Trigger Conditions

### **Performance Metrics Are Created When:**

1. ✅ **Job status** changes to any completion status
2. ✅ **Job has start time** (`job_started_at` is not NULL)
3. ✅ **No existing performance record** (prevents duplicates)

### **Completion Statuses:**

| Status | Description |
|--------|-------------|
| `work_completed` | Initial completion (first trigger) |
| `final_qc_passed` | QC approved |
| `ready_for_billing` | Ready for invoice |
| `billed` | Invoice generated |
| `ready_for_delivery` | Ready to deliver |
| `delivered` | Delivered to customer |
| `closed` | Job fully closed |

**Note:** Performance is created on the **first** completion status reached, not on each subsequent status change.

---

## What Gets Automatically Tracked

When a job is completed, the signal automatically captures:

### **1. Time Metrics**
- Scheduled duration (from package + addons)
- Actual duration (from job_started_at to completion)
- Time difference (saved or delayed)
- On-time status

### **2. Financial Data**
- Package value (vehicle-specific pricing) ✅
- Add-ons value
- Parts value
- Total job value
- **GST amount** ✅ NEW
- **Total customer paid** ✅ NEW

### **3. Team Information**
- Branch
- Floor manager
- Supervisor
- All applicators

### **4. Timestamps**
- Job started at
- Job completed at

---

## Example: Real-World Flow

### **User Completes a Job:**

```
1. Applicator marks job as "Work Completed"
   ↓
2. JobCard.status = 'work_completed'
   ↓
3. JobCard.save() called
   ↓
4. Django post_save signal fires ⚡
   ↓
5. Signal handler checks:
   ✓ Status = 'work_completed' (in completion_statuses)
   ✓ job_started_at = 2026-02-02 09:30:00 (exists)
   ✓ No performance record exists yet
   ↓
6. PerformanceTrackingService.record_job_completion() called
   ↓
7. Service calculates:
   - Package value: ₹300 (bike-specific)
   - Addons value: ₹1,497
   - Parts value: ₹0
   - Job value: ₹1,797
   - GST: ₹323.46 (from booking)
   - Total: ₹2,120.46
   - Time metrics
   ↓
8. PerformanceMetrics record created in database ✅
   ↓
9. Team aggregates updated ✅
   ↓
10. Logger confirms:
    "✓ Performance metrics created for JobCard #353
     (Status: work_completed, Job Value: ₹1797.00)"
```

**All automatic - no manual intervention!** 🎉

---

## Duplicate Prevention

### **How We Prevent Duplicate Records:**

```python
# Check if performance metrics already exist
if not hasattr(instance, 'performance') or not instance.performance:
    # Only create if doesn't exist
    PerformanceTrackingService.record_job_completion(instance)
```

**Example Scenario:**
```
Job Status: work_completed
  → Performance created ✅

Job Status: final_qc_passed
  → Performance already exists, skip ⊘

Job Status: billed
  → Performance already exists, skip ⊘

Job Status: delivered
  → Performance already exists, skip ⊘
```

**Result:** One performance record per job ✅

---

## Error Handling

### **Graceful Failure:**

```python
try:
    performance = PerformanceTrackingService.record_job_completion(instance)
    logger.info(f"✓ Performance metrics created for JobCard #{instance.id}")
except Exception as e:
    # Log error but don't fail the save operation
    logger.error(f"✗ Error recording performance metrics: {e}", exc_info=True)
```

**Key Points:**
- ✅ Errors are **logged** with full traceback
- ✅ Job save operation **doesn't fail** if performance tracking errors
- ✅ System remains stable even if performance service has issues

---

## Logging

### **What Gets Logged:**

**Success:**
```
INFO: ✓ Performance metrics created for JobCard #353 
      (Status: work_completed, Job Value: ₹1797.00)
```

**Warning (Missing Data):**
```
WARNING: ⊘ Performance metrics not created for JobCard #354 
         (Status: work_completed, missing required data)
```

**Error:**
```
ERROR: ✗ Error recording performance metrics for JobCard #355: 
       'NoneType' object has no attribute 'gst_amount'
       [Full traceback...]
```

### **Where to Find Logs:**

**Development:**
- Console output (terminal where `python manage.py runserver` is running)

**Production:**
- Log files (configured in Django settings)
- Example: `/var/log/django/performance.log`

---

## When Performance Is NOT Created

### **Scenarios Where Signal Won't Create Performance:**

❌ **Job has no start time:**
```python
if not instance.job_started_at:
    # Skip - can't calculate duration
```

❌ **Job status is not a completion status:**
```python
if instance.status == 'pending':
    # Skip - job not completed yet
```

❌ **Performance record already exists:**
```python
if instance.performance:
    # Skip - already tracked
```

❌ **Missing required team members:**
```python
# Service will return None if critical data missing
# (e.g., no applicators assigned)
```

---

## Testing the Signal

### **Test 1: Complete a New Job**

```python
# In Django shell
from jobcards.models import JobCard

job = JobCard.objects.get(id=353)
job.status = 'work_completed'
job.save()

# Signal fires automatically!
# Check if performance created:
print(f"Performance created: {hasattr(job, 'performance') and job.performance is not None}")
```

### **Test 2: Check Logs**

```bash
# Watch logs in terminal
tail -f /path/to/django/logs

# You should see:
# ✓ Performance metrics created for JobCard #353 ...
```

### **Test 3: Verify Database**

```python
from jobcards.performance_models import PerformanceMetrics

perf = PerformanceMetrics.objects.filter(jobcard_id=353).first()
print(f"Job Value: ₹{perf.job_value}")
print(f"GST: ₹{perf.gst_amount}")
print(f"Total: ₹{perf.total_with_gst}")
```

---

## Signal vs. Manual Tracking

### **❌ Without Signals (Manual):**

```python
# Somewhere in your code after job completion
from jobcards.performance_service import PerformanceTrackingService

# You'd have to remember to call this everywhere!
PerformanceTrackingService.record_job_completion(job)
```

**Problems:**
- Easy to forget
- Must add to every completion point
- Inconsistent tracking
- Hard to maintain

### **✅ With Signals (Automatic):**

```python
# Just update the job status - that's it!
job.status = 'work_completed'
job.save()

# Performance tracking happens automatically! 🎉
```

**Benefits:**
- Never forget to track
- Consistent across all code paths
- Centralized logic
- Easy to maintain

---

## Advanced: Signal Customization

### **Add Custom Logic:**

You can easily extend the signal to do more:

```python
@receiver(post_save, sender=JobCard)
def record_performance_on_completion(sender, instance, created, **kwargs):
    # ... existing code ...
    
    if performance:
        # Send notification to manager
        notify_manager_job_completed(instance, performance)
        
        # Update dashboard cache
        update_performance_cache(instance.branch)
        
        # Send webhook to external system
        send_webhook('job_completed', performance)
```

---

## Architecture Benefits

### **Separation of Concerns:**

```
JobCard Model
  ↓ (saves)
Signals Layer ← Decoupled from business logic
  ↓ (triggers)
Performance Service ← Isolated, testable
  ↓ (creates)
Performance Metrics ← Clean data layer
```

**Benefits:**
- ✅ JobCard doesn't know about performance tracking
- ✅ Performance logic is centralized
- ✅ Easy to test each component independently
- ✅ Can disable/enable tracking without changing JobCard code

---

## Troubleshooting

### **Performance Not Being Created?**

**Check 1: Signal is registered**
```bash
# In Django shell
from jobcards import apps
apps.JobcardsConfig.ready  # Should exist
```

**Check 2: Job has start time**
```python
job = JobCard.objects.get(id=353)
print(f"Started: {job.job_started_at}")  # Should not be None
```

**Check 3: Status is correct**
```python
print(f"Status: {job.status}")  # Should be in completion_statuses
```

**Check 4: Check logs**
```bash
# Look for errors in console/logs
grep "Performance metrics" /var/log/django/app.log
```

**Check 5: Check database**
```python
from jobcards.performance_models import PerformanceMetrics
PerformanceMetrics.objects.filter(jobcard_id=353).exists()  # Should be True
```

---

## Performance Impact

### **Is the Signal Slow?**

**No!** The signal is very efficient:

- ✅ Runs **once** per job completion
- ✅ Uses **database transactions** (atomic)
- ✅ Has **early returns** if conditions not met
- ✅ **Async-friendly** (can be moved to background task if needed)

### **Database Queries:**

```
1. Check if performance exists (1 query)
2. Get booking data (1 query, already loaded)
3. Get team members (1 query, with select_related)
4. Create performance record (1 query)
5. Update team aggregates (2-3 queries)
```

**Total: ~6-8 queries** - Very acceptable for the value it provides!

---

## Future Enhancements

### **Potential Improvements:**

1. **Async Processing:**
   ```python
   # Move to background task for very high-volume systems
   @receiver(post_save, sender=JobCard)
   def record_performance_on_completion(sender, instance, **kwargs):
       if should_track_performance(instance):
           create_performance_task.delay(instance.id)
   ```

2. **Webhook Notifications:**
   ```python
   # Notify external systems when performance is tracked
   if performance:
       send_performance_webhook(performance)
   ```

3. **Real-time Dashboard Updates:**
   ```python
   # Push updates to connected clients via WebSockets
   if performance:
       broadcast_performance_update(performance)
   ```

---

## Summary

### **✅ Yes, We Use Signals:**

- Django `post_save` signal on `JobCard` model
- Automatically triggers on job completion
- Registered in `apps.py`
- No manual intervention needed

### **✅ How It Updates Automatically:**

1. Job status changes to completion status
2. Signal fires
3. Performance service called
4. Metrics calculated and saved
5. Team aggregates updated
6. Success logged

### **✅ Benefits:**

- 🚀 **Automatic** - Never forget to track
- 🎯 **Consistent** - Same logic everywhere  
- 🔧 **Maintainable** - Centralized code
- 💪 **Robust** - Error handling built-in
- 📊 **Logged** - Full audit trail

### **✅ Zero Manual Work:**

Just complete jobs normally - performance tracking happens automatically! 🎉

---

## Quick Reference

### **Signal File:**
`jobcards/signals.py` - Line 61

### **Registration:**
`jobcards/apps.py` - Line 9

### **Service:**
`jobcards/performance_service.py` - Line 15

### **Trigger Statuses:**
```
work_completed
final_qc_passed
ready_for_billing
billed
ready_for_delivery
delivered
closed
```

### **Check If Working:**
```python
# Complete a job and check
job.status = 'work_completed'
job.save()
job.refresh_from_db()
print(job.performance)  # Should exist!
```

**Everything is automatic! Just focus on your business, not on tracking.** ✨
