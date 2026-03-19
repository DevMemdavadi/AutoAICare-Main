from django.core.management.base import BaseCommand
from django.db import transaction
from jobcards.performance_models import PerformanceMetrics
from decimal import Decimal


class Command(BaseCommand):
    help = 'Recalculate performance metrics for jobs with incorrect package values'

    def add_arguments(self, parser):
        parser.add_argument(
            '--job-id',
            type=int,
            help='Recalculate specific job ID',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Recalculate all performance records',
        )
        parser.add_argument(
            '--fix-package-values',
            action='store_true',
            help='Fix package values that are incorrectly ₹0',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        job_id = options.get('job_id')
        recalc_all = options.get('all')
        fix_packages = options.get('fix_package_values')

        self.stdout.write("="*60)
        self.stdout.write("RECALCULATE PERFORMANCE METRICS")
        self.stdout.write("="*60 + "\n")

        # Get performance records to update
        if job_id:
            records = PerformanceMetrics.objects.filter(jobcard_id=job_id)
            self.stdout.write(f"Recalculating Job #{job_id}...")
        elif fix_packages:
            records = PerformanceMetrics.objects.filter(package_value=0).exclude(jobcard__booking__isnull=True)
            self.stdout.write(f"Found {records.count()} records with ₹0 package value\n")
        elif recalc_all:
            records = PerformanceMetrics.objects.all()
            self.stdout.write(f"Recalculating ALL {records.count()} records...\n")
        else:
            self.stdout.write(self.style.ERROR("Please specify --job-id, --fix-package-values, or --all"))
            return

        if not records.exists():
            self.stdout.write(self.style.WARNING("No records found to update"))
            return

        updated_count = 0
        error_count = 0

        for perf in records:
            try:
                # Recalculate package value
                old_package_value = perf.package_value
                old_job_value = perf.job_value

                if perf.jobcard and perf.jobcard.booking and perf.jobcard.booking.package:
                    vehicle_type = perf.jobcard.booking.vehicle_type or 'sedan'
                    new_package_value = perf.jobcard.booking.package.get_price_for_vehicle_type(vehicle_type)
                    
                    if new_package_value != old_package_value:
                        perf.package_value = new_package_value
                        perf.job_value = new_package_value + perf.addons_value + perf.parts_value
                        perf.save(update_fields=['package_value', 'job_value'])
                        
                        updated_count += 1
                        self.stdout.write(
                            f"  ✓ Job #{perf.jobcard_id}: "
                            f"Package ₹{old_package_value} → ₹{new_package_value}, "
                            f"Total ₹{old_job_value} → ₹{perf.job_value}"
                        )
                    else:
                        self.stdout.write(f"  ⊘ Job #{perf.jobcard_id}: Already correct")
                else:
                    self.stdout.write(f"  ⊘ Job #{perf.jobcard_id}: No booking/package data")

            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f"  ✗ Job #{perf.jobcard_id}: {str(e)}"))

        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write("SUMMARY")
        self.stdout.write("="*60)
        self.stdout.write(f"  Total records processed: {records.count()}")
        self.stdout.write(self.style.SUCCESS(f"  ✓ Updated: {updated_count}"))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f"  ✗ Errors: {error_count}"))
        self.stdout.write("="*60)

        if updated_count > 0:
            self.stdout.write(self.style.SUCCESS(f"\n✅ Successfully updated {updated_count} performance records!"))
            self.stdout.write("Refresh the Performance Dashboard to see updated values.")
