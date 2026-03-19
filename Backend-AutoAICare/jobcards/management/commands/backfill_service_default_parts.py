"""
Backfill is_service_default=True for existing PartUsed records
that were auto-added from service package configuration.
"""
from django.core.management.base import BaseCommand
from jobcards.models import PartUsed
from services.service_parts import ServicePackagePart


class Command(BaseCommand):
    help = 'Backfill is_service_default for existing PartUsed records'

    def handle(self, *args, **options):
        # Get all PartUsed records that have a linked part and jobcard with a booking+package
        parts_used = PartUsed.objects.filter(
            is_service_default=False,
            part__isnull=False,
            jobcard__booking__primary_package__isnull=False,
        ).select_related('part', 'jobcard__booking__primary_package')

        updated = 0
        for pu in parts_used:
            package = pu.jobcard.booking.package
            # Check if this part is configured as a service package part
            is_configured = ServicePackagePart.objects.filter(
                package=package,
                part=pu.part,
                is_active=True,
            ).exists()

            if is_configured:
                pu.is_service_default = True
                pu.save(update_fields=['is_service_default'])
                updated += 1
                self.stdout.write(f"  ✓ PartUsed #{pu.id} ({pu.part_name}) → is_service_default=True")

        self.stdout.write(self.style.SUCCESS(f"\nDone. Updated {updated} records."))
