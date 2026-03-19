from django.core.management.base import BaseCommand
from jobcards.models import JobCard
from jobcards.performance_models import PerformanceMetrics
from django.db.models import Count


class Command(BaseCommand):
    help = 'Diagnose why completed jobs are not showing in performance view'

    def handle(self, *args, **options):
        self.stdout.write("="*60)
        self.stdout.write("PERFORMANCE DATA DIAGNOSTIC")
        self.stdout.write("="*60 + "\n")

        # Check job statuses
        self.stdout.write("1. JOB CARD STATUSES:")
        self.stdout.write("-" * 40)
        statuses = JobCard.objects.values('status').annotate(count=Count('id')).order_by('-count')
        for s in statuses:
            self.stdout.write(f"  {s['status']}: {s['count']} jobs")
        
        # Check completed jobs
        self.stdout.write("\n2. COMPLETED JOBS:")
        self.stdout.write("-" * 40)
        completed_jobs = JobCard.objects.filter(status='work_completed')
        self.stdout.write(f"  Total work_completed jobs: {completed_jobs.count()}")
        
        # Check jobs with start time
        jobs_with_start = completed_jobs.exclude(job_started_at__isnull=True)
        self.stdout.write(f"  Jobs with start time: {jobs_with_start.count()}")
        
        # Check performance records
        self.stdout.write("\n3. PERFORMANCE RECORDS:")
        self.stdout.write("-" * 40)
        perf_count = PerformanceMetrics.objects.count()
        self.stdout.write(f"  Total performance records: {perf_count}")
        
        # Check which jobs have performance records
        jobs_with_perf = completed_jobs.filter(performance__isnull=False).count()
        jobs_without_perf = completed_jobs.filter(performance__isnull=True).count()
        self.stdout.write(f"  Completed jobs WITH performance: {jobs_with_perf}")
        self.stdout.write(f"  Completed jobs WITHOUT performance: {jobs_without_perf}")
        
        # Sample job without performance
        if jobs_without_perf > 0:
            self.stdout.write("\n4. SAMPLE JOB WITHOUT PERFORMANCE:")
            self.stdout.write("-" * 40)
            job = completed_jobs.filter(performance__isnull=True).first()
            self.stdout.write(f"  Job ID: {job.id}")
            self.stdout.write(f"  Status: {job.status}")
            self.stdout.write(f"  Started at: {job.job_started_at}")
            self.stdout.write(f"  Branch: {job.branch.name if job.branch else 'None'}")
            self.stdout.write(f"  Supervisor: {job.supervisor.name if job.supervisor else 'None'}")
            self.stdout.write(f"  Floor Manager: {job.floor_manager.name if job.floor_manager else 'None'}")
            self.stdout.write(f"  Applicators: {job.applicator_team.count()}")
            
            # Check why performance wasn't created
            self.stdout.write("\n  Why no performance record?")
            if not job.job_started_at:
                self.stdout.write("    ❌ No start time (job_started_at is NULL)")
            else:
                self.stdout.write("    ✓ Has start time")
            
            if job.status != 'work_completed':
                self.stdout.write(f"    ❌ Status is '{job.status}', not 'work_completed'")
            else:
                self.stdout.write("    ✓ Status is 'work_completed'")
            
            if not job.supervisor:
                self.stdout.write("    ⚠️  No supervisor assigned")
            else:
                self.stdout.write("    ✓ Has supervisor")
        
        # Check performance records by branch
        self.stdout.write("\n5. PERFORMANCE RECORDS BY BRANCH:")
        self.stdout.write("-" * 40)
        from branches.models import Branch
        branches = Branch.objects.all()
        for branch in branches:
            count = PerformanceMetrics.objects.filter(branch=branch).count()
            self.stdout.write(f"  {branch.name}: {count} records")
        
        # Recommendations
        self.stdout.write("\n6. RECOMMENDATIONS:")
        self.stdout.write("-" * 40)
        if jobs_without_perf > 0:
            self.stdout.write("  ⚠️  Some completed jobs don't have performance records!")
            self.stdout.write("  ")
            self.stdout.write("  To create performance records for existing jobs:")
            self.stdout.write("  Run: python manage.py create_missing_performance_records")
            self.stdout.write("  ")
            self.stdout.write("  For future jobs, performance records will be created")
            self.stdout.write("  automatically when jobs are completed.")
        else:
            self.stdout.write("  ✓ All completed jobs have performance records!")
        
        self.stdout.write("\n" + "="*60)
