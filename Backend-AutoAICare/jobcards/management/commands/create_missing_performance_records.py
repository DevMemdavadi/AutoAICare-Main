from django.core.management.base import BaseCommand
from django.db import transaction
from jobcards.models import JobCard
from jobcards.performance_models import PerformanceMetrics
from jobcards.performance_service import PerformanceTrackingService


class Command(BaseCommand):
    help = 'Create performance records for completed jobs that are missing them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating records',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        self.stdout.write("="*60)
        self.stdout.write("CREATE MISSING PERFORMANCE RECORDS")
        self.stdout.write("="*60 + "\n")

        # Find completed jobs without performance records
        # Check multiple completion statuses
        completion_statuses = [
            'work_completed',
            'qc_pending', 
            'qc_passed',
            'final_qc_pending',
            'final_qc_passed',
            'ready_for_billing',
            'billed',
            'ready_for_delivery',
            'delivered',
            'closed'
        ]
        
        completed_jobs = JobCard.objects.filter(
            status__in=completion_statuses,
            job_started_at__isnull=False,
            performance__isnull=True
        ).select_related('branch', 'supervisor', 'floor_manager')
        
        total_jobs = completed_jobs.count()
        
        self.stdout.write(f"Found {total_jobs} completed jobs without performance records\n")
        
        if total_jobs == 0:
            self.stdout.write(self.style.SUCCESS("✓ All completed jobs already have performance records!"))
            return
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No records will be created\n"))
            for job in completed_jobs[:10]:  # Show first 10
                self.stdout.write(f"  Job #{job.id}")
                self.stdout.write(f"    Status: {job.status}")
                self.stdout.write(f"    Branch: {job.branch.name if job.branch else 'None'}")
                self.stdout.write(f"    Supervisor: {job.supervisor.name if job.supervisor else 'None'}")
                self.stdout.write(f"    Started: {job.job_started_at}")
                self.stdout.write("")
            
            if total_jobs > 10:
                self.stdout.write(f"  ... and {total_jobs - 10} more jobs\n")
            
            self.stdout.write(self.style.WARNING(f"\nRun without --dry-run to create {total_jobs} performance records"))
            return
        
        # Create performance records
        created_count = 0
        skipped_count = 0
        error_count = 0
        
        self.stdout.write("Creating performance records...\n")
        
        for job in completed_jobs:
            try:
                # Temporarily set status to work_completed for the service
                original_status = job.status
                job.status = 'work_completed'
                
                performance = PerformanceTrackingService.record_job_completion(job)
                
                # Restore original status
                job.status = original_status
                job.save(update_fields=['status'])
                
                if performance:
                    created_count += 1
                    self.stdout.write(f"  ✓ Created performance record for Job #{job.id}")
                else:
                    skipped_count += 1
                    self.stdout.write(f"  ⊘ Skipped Job #{job.id} (missing required data)")
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f"  ✗ Error for Job #{job.id}: {str(e)}"))
        
        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write("SUMMARY")
        self.stdout.write("="*60)
        self.stdout.write(f"  Total jobs processed: {total_jobs}")
        self.stdout.write(self.style.SUCCESS(f"  ✓ Created: {created_count}"))
        if skipped_count > 0:
            self.stdout.write(self.style.WARNING(f"  ⊘ Skipped: {skipped_count}"))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f"  ✗ Errors: {error_count}"))
        self.stdout.write("="*60)
        
        if created_count > 0:
            self.stdout.write(self.style.SUCCESS(f"\n✅ Successfully created {created_count} performance records!"))
            self.stdout.write("These jobs will now appear in the Performance Dashboard.")
