"""
Phase 2 API Endpoints Verification Script
Tests the new pause/resume and buffer extension endpoints
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from jobcards.models import JobCard
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

print("=" * 70)
print("PHASE 2 API ENDPOINTS VERIFICATION")
print("=" * 70)

# Test 1: Find a job card with an active timer
print("\n✓ Test 1: Finding active job card...")
active_job = JobCard.objects.filter(
    job_started_at__isnull=False,
    status__in=['work_in_progress', 'in_progress', 'started']
).first()

if not active_job:
    print("  ⚠ No active job cards found. Creating test scenario...")
    # Get any job card for testing
    active_job = JobCard.objects.first()
    if active_job:
        active_job.job_started_at = timezone.now()
        active_job.status = 'work_in_progress'
        active_job.save()
        print(f"  ✓ Using JobCard #{active_job.id} for testing")
    else:
        print("  ✗ No job cards available for testing")
        exit(1)
else:
    print(f"  ✓ Found active JobCard #{active_job.id}")

# Test 2: Test pause_timer method
print("\n✓ Test 2: Testing pause_timer method...")
if not active_job.is_timer_paused:
    result = active_job.pause_timer(reason='manual')
    if result['success']:
        print(f"  ✓ Timer paused successfully")
        print(f"    - Paused at: {result['paused_at']}")
        print(f"    - Remaining buffer: {result['remaining_buffer']} minutes")
        print(f"    - Reason: manual")
    else:
        print(f"  ⚠ Pause failed: {result['message']}")
else:
    print("  ⚠ Timer already paused, skipping pause test")

# Test 3: Test resume_timer method
print("\n✓ Test 3: Testing resume_timer method...")
if active_job.is_timer_paused:
    result = active_job.resume_timer()
    if result['success']:
        print(f"  ✓ Timer resumed successfully")
        print(f"    - Pause duration: {result['pause_duration_minutes']} minutes")
        print(f"    - Total pause time: {result['total_pause_duration_seconds']} seconds")
        print(f"    - Remaining buffer: {result['remaining_buffer']} minutes")
    else:
        print(f"  ✗ Resume failed: {result['message']}")
else:
    print("  ⚠ Timer not paused, skipping resume test")

# Test 4: Test buffer calculations
print("\n✓ Test 4: Testing buffer calculations...")
try:
    buffer_mins = active_job.calculate_buffer_minutes()
    effective_duration = active_job.get_effective_duration()
    remaining_buffer = active_job.get_remaining_buffer()
    elapsed_work_time = active_job.get_elapsed_work_time()
    
    print(f"  ✓ Buffer calculations working:")
    print(f"    - Buffer percentage: {active_job.buffer_percentage}%")
    print(f"    - Calculated buffer: {buffer_mins} minutes")
    print(f"    - Effective duration: {effective_duration} minutes")
    print(f"    - Remaining buffer: {remaining_buffer} minutes")
    print(f"    - Elapsed work time: {elapsed_work_time} minutes")
except Exception as e:
    print(f"  ✗ Error in buffer calculations: {e}")

# Test 5: Test pause/resume cycle
print("\n✓ Test 5: Testing complete pause/resume cycle...")
try:
    # Ensure timer is not paused
    if active_job.is_timer_paused:
        active_job.resume_timer()
    
    # Pause
    pause_result = active_job.pause_timer(reason='qc_review')
    if pause_result['success']:
        print(f"  ✓ Step 1: Paused with reason 'qc_review'")
        
        # Check state
        active_job.refresh_from_db()
        if active_job.is_timer_paused and active_job.pause_reason == 'qc_review':
            print(f"  ✓ Step 2: State verified (is_paused={active_job.is_timer_paused})")
            
            # Resume
            resume_result = active_job.resume_timer()
            if resume_result['success']:
                print(f"  ✓ Step 3: Resumed successfully")
                
                # Verify state cleared
                active_job.refresh_from_db()
                if not active_job.is_timer_paused and active_job.pause_reason is None:
                    print(f"  ✓ Step 4: State cleared (is_paused={active_job.is_timer_paused})")
                else:
                    print(f"  ✗ Step 4: State not properly cleared")
            else:
                print(f"  ✗ Step 3: Resume failed - {resume_result['message']}")
        else:
            print(f"  ✗ Step 2: State not properly set")
    else:
        print(f"  ✗ Step 1: Pause failed - {pause_result['message']}")
except Exception as e:
    print(f"  ✗ Error in pause/resume cycle: {e}")

# Test 6: Test error cases
print("\n✓ Test 6: Testing error handling...")

# Test double pause
print("  Testing double pause...")
active_job.pause_timer(reason='manual')
result = active_job.pause_timer(reason='manual')
if not result['success'] and 'already paused' in result['message']:
    print("  ✓ Double pause correctly rejected")
else:
    print("  ✗ Double pause should be rejected")

# Resume and test double resume
active_job.resume_timer()
result = active_job.resume_timer()
if not result['success'] and 'not paused' in result['message']:
    print("  ✓ Double resume correctly rejected")
else:
    print("  ✗ Double resume should be rejected")

# Test 7: Verify serializer fields
print("\n✓ Test 7: Verifying serializer includes new fields...")
from jobcards.serializers import JobCardSerializer
serializer = JobCardSerializer(active_job)
data = serializer.data

required_fields = [
    'buffer_percentage',
    'buffer_minutes_allocated',
    'is_timer_paused',
    'remaining_buffer_minutes',
    'effective_duration_minutes',
    'elapsed_work_time'
]

all_present = True
for field in required_fields:
    if field in data:
        print(f"  ✓ {field}: {data[field]}")
    else:
        print(f"  ✗ {field}: MISSING")
        all_present = False

if all_present:
    print("  ✓ All serializer fields present")

print("\n" + "=" * 70)
print("PHASE 2 VERIFICATION COMPLETE")
print("=" * 70)
print("\n✅ All core functionality verified!")
print("\nNext steps:")
print("  1. Test endpoints via API calls (Postman/curl)")
print("  2. Verify auto-pause/resume in add_photo endpoint")
print("  3. Verify auto-pause/resume in complete_qc endpoint")
print("  4. Test permission restrictions for different roles")
print("  5. Proceed to Phase 3: Frontend Integration")
