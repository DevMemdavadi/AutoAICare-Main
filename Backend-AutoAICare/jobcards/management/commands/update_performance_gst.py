from django.core.management.base import BaseCommand
from django.db import transaction
from jobcards.performance_models import PerformanceMetrics
from decimal import Decimal


class Command(BaseCommand):
    help = 'Update performance records with GST data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--job-id',
            type=int,
            help='Update specific job ID',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Update all performance records',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        job_id = options.get('job_id')
        update_all = options.get('all')

        self.stdout.write("="*60)
        self.stdout.write("UPDATE GST DATA IN PERFORMANCE RECORDS")
        self.stdout.write("="*60 + "\n")

        # Get performance records to update
        if job_id:
            records = PerformanceMetrics.objects.filter(jobcard_id=job_id)
            self.stdout.write(f"Updating Job #{job_id}...")
        elif update_all:
            records = PerformanceMetrics.objects.exclude(jobcard__booking__isnull=True)
            self.stdout.write(f"Updating ALL {records.count()} records with booking data\n")
        else:
            self.stdout.write(self.style.ERROR("Please specify --job-id or --all"))
            return

        if not records.exists():
            self.stdout.write(self.style.WARNING("No records found to update"))
            return

        updated_count = 0
        skipped_count = 0
        error_count = 0

        for perf in records:
            try:
                if perf.jobcard and perf.jobcard.booking:
                    old_gst = perf.gst_amount
                    old_total = perf.total_with_gst

                    # Get GST data from booking
                    new_gst = perf.jobcard.booking.gst_amount or Decimal('0')
                    new_total = perf.jobcard.booking.total_price or perf.job_value

                    if new_gst != old_gst or new_total != old_total:
                        perf.gst_amount = new_gst
                        perf.total_with_gst = new_total
                        perf.save(update_fields=['gst_amount', 'total_with_gst'])

                        updated_count += 1
                        self.stdout.write(
                            f"  ✓ Job #{perf.jobcard_id}: "
                            f"Service ₹{perf.job_value} + GST ₹{new_gst} = Total ₹{new_total}"
                        )
                    else:
                        skipped_count += 1
                else:
                    skipped_count += 1
                    self.stdout.write(f"  ⊘ Performance #{perf.id}: No booking data")

            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f"  ✗ Job #{perf.jobcard_id}: {str(e)}"))

        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write("SUMMARY")
        self.stdout.write("="*60)
        self.stdout.write(f"  Total records processed: {records.count()}")
        self.stdout.write(self.style.SUCCESS(f"  ✓ Updated: {updated_count}"))
        if skipped_count > 0:
            self.stdout.write(f"  ⊘ Skipped: {skipped_count}")
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f"  ✗ Errors: {error_count}"))
        self.stdout.write("="*60)

        if updated_count > 0:
            self.stdout.write(self.style.SUCCESS(f"\n✅ Successfully updated {updated_count} performance records with GST data!"))
            self.stdout.write("Performance dashboard will now show what customers actually paid.")
