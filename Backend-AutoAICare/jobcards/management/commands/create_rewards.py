"""
Management command to create reward records for completed jobs
"""
from django.core.management.base import BaseCommand
from jobcards.models import JobCard, SupervisorReward
from jobcards.reward_service import RewardCalculationService


class Command(BaseCommand):
    help = 'Create reward records for completed jobs that don\'t have them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--job-id',
            type=int,
            help='Process specific job ID only',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation even if rewards exist',
        )

    def handle(self, *args, **options):
        job_id = options.get('job_id')
        dry_run = options.get('dry_run', False)
        force = options.get('force', False)

        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('REWARD CREATION FOR COMPLETED JOBS'))
        self.stdout.write(self.style.SUCCESS('='*60 + '\n'))

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made\n'))

        # Get completed jobs
        if job_id:
            jobs = JobCard.objects.filter(id=job_id)
            if not jobs.exists():
                self.stdout.write(self.style.ERROR(f'Job #{job_id} not found!'))
                return
        else:
            jobs = JobCard.objects.filter(
                status__in=['work_completed', 'qc_completed', 'qc_pending', 
                           'final_qc_passed', 'final_qc_pending', 'ready_for_billing',
                           'billed', 'delivered', 'closed']
            ).filter(
                job_started_at__isnull=False  # Only jobs that were started
            )

        total_jobs = jobs.count()
        self.stdout.write(f'Found {total_jobs} completed jobs\n')

        processed = 0
        created = 0
        skipped = 0
        errors = 0

        for job in jobs:
            processed += 1
            
            # Check if rewards already exist
            existing_rewards = job.rewards.count()
            
            if existing_rewards > 0 and not force:
                self.stdout.write(
                    self.style.WARNING(
                        f'[{processed}/{total_jobs}] Job #{job.id}: '
                        f'Already has {existing_rewards} rewards - SKIPPED'
                    )
                )
                skipped += 1
                continue

            # Check if job has supervisor
            if not job.supervisor:
                self.stdout.write(
                    self.style.WARNING(
                        f'[{processed}/{total_jobs}] Job #{job.id}: '
                        f'No supervisor assigned - SKIPPED'
                    )
                )
                skipped += 1
                continue

            # Calculate what the reward should be
            try:
                trans_type, amount, tier, time_diff = \
                    RewardCalculationService.calculate_reward_or_deduction(job)

                if not trans_type or amount == 0:
                    self.stdout.write(
                        self.style.WARNING(
                            f'[{processed}/{total_jobs}] Job #{job.id}: '
                            f'No reward/deduction applicable (time diff: {time_diff} min) - SKIPPED'
                        )
                    )
                    skipped += 1
                    continue

                # Show what will be created
                self.stdout.write(
                    f'[{processed}/{total_jobs}] Job #{job.id}: '
                    f'{trans_type.upper()} of ₹{amount} ({tier or "N/A"}) - '
                    f'{abs(time_diff)} min {"early" if time_diff > 0 else "late"}'
                )

                if not dry_run:
                    # Delete existing if force mode
                    if force and existing_rewards > 0:
                        job.rewards.all().delete()
                        self.stdout.write(
                            self.style.WARNING(f'  → Deleted {existing_rewards} existing rewards')
                        )

                    # Create reward records
                    rewards = RewardCalculationService.create_reward_records(job)
                    
                    if rewards:
                        created += len(rewards)
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ Created {len(rewards)} reward records:')
                        )
                        for r in rewards:
                            self.stdout.write(
                                f'    - {r.transaction_type} ₹{r.amount} to {r.recipient.name}'
                            )
                    else:
                        self.stdout.write(
                            self.style.ERROR(f'  ✗ Failed to create rewards')
                        )
                        errors += 1
                else:
                    self.stdout.write(
                        self.style.WARNING(f'  → Would create reward records (dry run)')
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'[{processed}/{total_jobs}] Job #{job.id}: ERROR - {str(e)}'
                    )
                )
                errors += 1
                import traceback
                traceback.print_exc()

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('SUMMARY'))
        self.stdout.write('='*60)
        self.stdout.write(f'Total jobs processed: {processed}')
        self.stdout.write(f'Reward records created: {created}')
        self.stdout.write(f'Jobs skipped: {skipped}')
        self.stdout.write(f'Errors: {errors}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a DRY RUN - no changes were made'))
            self.stdout.write('Run without --dry-run to actually create rewards')
        
        self.stdout.write('='*60 + '\n')
