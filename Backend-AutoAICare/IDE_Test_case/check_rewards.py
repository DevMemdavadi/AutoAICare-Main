"""
Debug script to check reward system status

Run with: python manage.py shell < check_rewards.py
"""

from jobcards.models import JobCard, SupervisorReward
from jobcards.reward_service import RewardCalculationService
from jobcards.models import RewardSettings

print("\n" + "="*60)
print("REWARD SYSTEM DEBUG CHECK")
print("="*60)

# Check reward settings
print("\n1. Checking Reward Settings...")
settings = RewardSettings.objects.all()
if settings.exists():
    for s in settings:
        print(f"   ✓ Found settings (ID: {s.id})")
        print(f"     - Branch: {s.branch.name if s.branch else 'Global'}")
        print(f"     - Active: {s.is_active}")
        print(f"     - Tier 1: {s.tier_1_minutes}min = ₹{s.tier_1_amount}")
        print(f"     - Tier 2: {s.tier_2_minutes}min = ₹{s.tier_2_amount}")
        print(f"     - Tier 3: {s.tier_3_minutes}min = ₹{s.tier_3_amount}")
        print(f"     - Deduction enabled: {s.deduction_enabled}")
else:
    print("   ✗ NO REWARD SETTINGS FOUND!")
    print("   → Go to /admin/reward-settings to configure")

# Check completed jobs
print("\n2. Checking Completed Jobs...")
completed_jobs = JobCard.objects.filter(status='work_completed')
print(f"   Found {completed_jobs.count()} jobs with status 'work_completed'")

if completed_jobs.exists():
    for job in completed_jobs[:5]:  # Show first 5
        print(f"\n   Job #{job.id}:")
        print(f"     - Supervisor: {job.supervisor.name if job.supervisor else 'NONE'}")
        print(f"     - Started: {job.job_started_at}")
        print(f"     - Allowed: {job.get_allowed_duration_minutes()} min")
        print(f"     - Elapsed: {job.get_elapsed_minutes()} min")
        
        # Check if rewards exist
        rewards = job.rewards.all()
        if rewards.exists():
            print(f"     - Rewards: {rewards.count()} records")
            for r in rewards:
                print(f"       • {r.transaction_type}: ₹{r.amount} to {r.recipient.name}")
        else:
            print(f"     - Rewards: NONE")
            
            # Try to calculate what the reward should be
            if job.supervisor and job.job_started_at:
                try:
                    trans_type, amount, tier, time_diff = \
                        RewardCalculationService.calculate_reward_or_deduction(job)
                    if trans_type:
                        print(f"     - SHOULD HAVE: {trans_type} of ₹{amount} ({tier})")
                        print(f"       Time diff: {time_diff} minutes")
                    else:
                        print(f"     - No reward/deduction applicable (time diff: {time_diff} min)")
                except Exception as e:
                    print(f"     - Error calculating: {str(e)}")

# Check all reward records
print("\n3. Checking All Reward Records...")
all_rewards = SupervisorReward.objects.all()
print(f"   Total reward records in database: {all_rewards.count()}")

if all_rewards.exists():
    print("\n   Recent rewards:")
    for r in all_rewards.order_by('-created_at')[:10]:
        print(f"   - Job #{r.jobcard_id}: {r.transaction_type} ₹{r.amount} to {r.recipient.name} ({r.status})")

print("\n" + "="*60)
print("END OF DEBUG CHECK")
print("="*60 + "\n")
