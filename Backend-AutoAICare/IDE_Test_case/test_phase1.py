"""
Quick test script to verify Phase 1 implementation
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from jobcards.models import JobCard
from django.utils import timezone

print("=" * 60)
print("PHASE 1 IMPLEMENTATION VERIFICATION")
print("=" * 60)

# Test 1: Check if new fields exist
print("\n✓ Test 1: Checking new model fields...")
test_fields = [
    'buffer_percentage',
    'buffer_minutes_allocated',
    'is_timer_paused',
    'pause_started_at',
    'total_pause_duration_seconds',
    'pause_reason'
]

for field in test_fields:
    if hasattr(JobCard, field):
        print(f"  ✓ {field} exists")
    else:
        print(f"  ✗ {field} MISSING!")

# Test 2: Check if new methods exist
print("\n✓ Test 2: Checking new model methods...")
test_methods = [
    'calculate_buffer_minutes',
    'get_effective_duration',
    'get_elapsed_work_time',
    'get_remaining_buffer',
    'pause_timer',
    'resume_timer'
]

for method in test_methods:
    if hasattr(JobCard, method):
        print(f"  ✓ {method}() exists")
    else:
        print(f"  ✗ {method}() MISSING!")

# Test 3: Create a test instance and verify defaults
print("\n✓ Test 3: Testing default values...")
try:
    # Get an existing job card or create test values
    jc = JobCard.objects.first()
    if jc:
        print(f"  ✓ Using existing JobCard #{jc.id}")
        print(f"    - buffer_percentage: {jc.buffer_percentage}")
        print(f"    - is_timer_paused: {jc.is_timer_paused}")
        print(f"    - total_pause_duration_seconds: {jc.total_pause_duration_seconds}")
        
        # Test buffer calculation
        if jc.booking and jc.booking.package:
            buffer_mins = jc.calculate_buffer_minutes()
            print(f"    - calculated buffer minutes: {buffer_mins}")
            
            effective_duration = jc.get_effective_duration()
            print(f"    - effective duration: {effective_duration} minutes")
    else:
        print("  ⚠ No existing job cards found to test with")
except Exception as e:
    print(f"  ✗ Error: {e}")

# Test 4: Test pause/resume logic
print("\n✓ Test 4: Testing pause/resume logic...")
try:
    jc = JobCard.objects.filter(job_started_at__isnull=False).first()
    if jc:
        print(f"  ✓ Testing with JobCard #{jc.id}")
        
        # Test pause
        result = jc.pause_timer('manual')
        if result['success']:
            print(f"    ✓ Pause successful: {result['message']}")
            print(f"      Remaining buffer: {result['remaining_buffer']} minutes")
            
            # Test resume
            result = jc.resume_timer()
            if result['success']:
                print(f"    ✓ Resume successful: {result['message']}")
                print(f"      Pause duration: {result['pause_duration_minutes']} minutes")
            else:
                print(f"    ✗ Resume failed: {result['message']}")
        else:
            print(f"    ⚠ Pause not allowed: {result['message']}")
    else:
        print("  ⚠ No started job cards found to test pause/resume")
except Exception as e:
    print(f"  ✗ Error: {e}")

print("\n" + "=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)
