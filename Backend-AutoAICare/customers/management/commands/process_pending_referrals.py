from django.core.management.base import BaseCommand
from customers.referral_models import Referral
from django.db import transaction


class Command(BaseCommand):
    help = 'Process all pending referrals that should be completed'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force process even if no completed jobs found (for testing)',
        )

    def handle(self, *args, **options):
        from jobcards.models import JobCard
        
        force = options.get('force', False)
        
        # Find all pending referrals
        pending_referrals = Referral.objects.filter(status='pending')
        
        self.stdout.write(f'Found {pending_referrals.count()} pending referrals\n')
        
        processed = 0
        skipped = 0
        
        for referral in pending_referrals:
            self.stdout.write(f'\nChecking referral #{referral.id}:')
            self.stdout.write(f'  Referrer: {referral.referrer.user.name} ({referral.referrer.user.phone})')
            self.stdout.write(f'  Referee: {referral.referee.user.name} ({referral.referee.user.phone})')
            
            # Check if referee has ANY jobs (completed or otherwise)
            all_jobs = JobCard.objects.filter(booking__customer=referral.referee)
            completed_jobs = all_jobs.filter(status='closed')
            
            self.stdout.write(f'  Total jobs: {all_jobs.count()}')
            self.stdout.write(f'  Completed jobs: {completed_jobs.count()}')
            
            if completed_jobs.count() > 0 or force:
                self.stdout.write(self.style.WARNING(f'  → Processing...'))
                
                try:
                    with transaction.atomic():
                        # Mark as completed
                        referral.mark_completed()
                        self.stdout.write(f'     Marked as completed')
                        
                        # Process rewards
                        success, message = referral.process_rewards()
                        if success:
                            self.stdout.write(self.style.SUCCESS(f'     ✓ {message}'))
                            processed += 1
                        else:
                            self.stdout.write(self.style.ERROR(f'     ✗ {message}'))
                            skipped += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'     ✗ Error: {str(e)}'))
                    skipped += 1
            else:
                self.stdout.write(f'  → Skipped (no completed jobs)')
                skipped += 1
        
        self.stdout.write(self.style.SUCCESS(f'\n\nSummary:'))
        self.stdout.write(f'  Processed: {processed}')
        self.stdout.write(f'  Skipped: {skipped}')

