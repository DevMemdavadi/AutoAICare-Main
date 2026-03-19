"""
Signal handlers for automatic parts deduction when services are performed.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from jobcards.models import JobCard
from services.service_parts import ServicePackagePart
import logging

logger = logging.getLogger(__name__)


def _deduct_parts_for_package(package, instance, vehicle_type, company):
    """
    Deduct inventory parts for a single service package on a given JobCard.
    Returns (parts_deducted, parts_skipped) lists for logging.
    """
    from django.db.models import Q

    # First try company-specific parts
    required_parts = ServicePackagePart.objects.all_companies().filter(
        package=package,
        is_active=True,
        company=company
    ).select_related('part')

    # Fall back to global defaults if no company-specific config
    if not required_parts.exists():
        required_parts = ServicePackagePart.objects.all_companies().filter(
            package=package,
            is_active=True,
            company__isnull=True
        ).select_related('part')

    if not required_parts.exists():
        logger.info(
            f"No parts configured for service '{package.name}' (JobCard #{instance.id})"
        )
        return [], []

    parts_deducted = []
    parts_skipped = []

    for service_part in required_parts:
        try:
            part_used = service_part.deduct_stock(
                vehicle_type=vehicle_type,
                multiplier=1,
                jobcard=instance
            )

            if part_used:
                parts_deducted.append(
                    f"{service_part.part.name} ({part_used.quantity} {service_part.part.unit})"
                )
            else:
                # Part was optional and out of stock
                parts_skipped.append(f"{service_part.part.name} (optional, out of stock)")

        except ValueError as e:
            logger.error(
                f"Failed to deduct part '{service_part.part.name}' for "
                f"service '{package.name}' on JobCard #{instance.id}: {e}"
            )
            parts_skipped.append(f"{service_part.part.name} (insufficient stock)")

    return parts_deducted, parts_skipped


@receiver(post_save, sender=JobCard)
def auto_deduct_service_parts(sender, instance, created, **kwargs):
    """
    Automatically deduct parts for ALL service packages when a JobCard is created.
    Supports both single-service and multi-service (M2M) bookings.
    """
    if not created or not instance.booking:
        return

    # Get all packages for this booking (multi-service aware)
    packages = instance.booking.get_packages_list()
    if not packages:
        return

    vehicle_type = instance.booking.vehicle_type or 'sedan'
    company = instance.company

    try:
        all_deducted = []
        all_skipped = []

        for package in packages:
            deducted, skipped = _deduct_parts_for_package(
                package, instance, vehicle_type, company
            )
            if deducted:
                all_deducted.append(f"[{package.name}]: {', '.join(deducted)}")
            if skipped:
                all_skipped.append(f"[{package.name}]: {', '.join(skipped)}")

        if all_deducted:
            logger.info(
                f"Auto-deducted parts for JobCard #{instance.id} — "
                f"{len(packages)} service(s):\n  " + "\n  ".join(all_deducted)
            )

        if all_skipped:
            logger.warning(
                f"Skipped parts for JobCard #{instance.id}:\n  " + "\n  ".join(all_skipped)
            )

    except Exception as e:
        logger.error(
            f"Error auto-deducting parts for JobCard #{instance.id}: {e}",
            exc_info=True
        )
