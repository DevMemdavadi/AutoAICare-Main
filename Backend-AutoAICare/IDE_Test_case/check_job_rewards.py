"""
Check specific job card for rewards
Usage: python manage.py shell
Then paste this code
"""

from jobcards.models import JobCard, SupervisorReward

# Get a job that should have rewards
job_id = input("Enter Job Card ID to check (or press Enter for latest completed): ").strip()

if job_id:
    try:
        job = JobCard.objects.get(id=int(job_id))
    except JobCard.DoesNotExist:
        print(f"Job #{job_id} not found!")
        exit()
else:
    # Get latest completed job
    job = JobCard.objects.filter(
        status__in=['work_completed', 'qc_completed', 'qc_pending', 'final_qc_passed']
    ).order_by('-id').first()
    
    if not job:
        print("No completed jobs found!")
        exit()

print(f"\n{'='*60}")
print(f"JOB CARD #{job.id} DETAILS")
print(f"{'='*60}")
print(f"Status: {job.status}")
print(f"Supervisor: {job.supervisor.name if job.supervisor else 'NONE'}")
print(f"Started: {job.job_started_at}")
print(f"Allowed: {job.get_allowed_duration_minutes()} min")
if job.job_started_at:
    print(f"Elapsed: {job.get_elapsed_minutes()} min")

print(f"\n{'='*60}")
print(f"REWARD RECORDS")
print(f"{'='*60}")

# Direct query
rewards = SupervisorReward.objects.filter(jobcard=job)
print(f"Direct query: {rewards.count()} rewards found")

# Using related name
rewards_via_related = job.rewards.all()
print(f"Via related name: {rewards_via_related.count()} rewards found")

if rewards.exists():
    print(f"\nReward Details:")
    for r in rewards:
        print(f"  - ID: {r.id}")
        print(f"    Type: {r.transaction_type}")
        print(f"    Amount: ₹{r.amount}")
        print(f"    Recipient: {r.recipient.name}")
        print(f"    Status: {r.status}")
        print(f"    Tier: {r.tier}")
        print(f"    Time diff: {r.time_difference_minutes} min")
        print(f"    Is applicator share: {r.is_applicator_share}")
        print()
else:
    print("\nNo rewards found for this job!")
    print("\nPossible reasons:")
    print("1. Job was completed before reward system was implemented")
    print("2. No supervisor was assigned when job was completed")
    print("3. No reward settings were configured")
    print("4. Job completion time didn't qualify for reward/deduction")

# Check if we can create rewards now
print(f"\n{'='*60}")
print(f"REWARD CALCULATION TEST")
print(f"{'='*60}")

if job.supervisor and job.job_started_at:
    from jobcards.reward_service import RewardCalculationService
    
    try:
        trans_type, amount, tier, time_diff = \
            RewardCalculationService.calculate_reward_or_deduction(job)
        
        if trans_type:
            print(f"✓ Reward calculation successful:")
            print(f"  Type: {trans_type}")
            print(f"  Amount: ₹{amount}")
            print(f"  Tier: {tier}")
            print(f"  Time difference: {time_diff} min")
            
            if not rewards.exists():
                create = input("\nNo rewards exist. Create them now? (yes/no): ").strip().lower()
                if create == 'yes':
                    created_rewards = RewardCalculationService.create_reward_records(job)
                    print(f"\n✓ Created {len(created_rewards)} reward records!")
                    for r in created_rewards:
                        print(f"  - {r.transaction_type} ₹{r.amount} to {r.recipient.name}")
        else:
            print(f"✗ No reward/deduction applicable")
            print(f"  Time difference: {time_diff} min")
    except Exception as e:
        print(f"✗ Error calculating reward: {str(e)}")
        import traceback
        traceback.print_exc()
else:
    if not job.supervisor:
        print("✗ No supervisor assigned")
    if not job.job_started_at:
        print("✗ Job not started")

print(f"\n{'='*60}\n")
