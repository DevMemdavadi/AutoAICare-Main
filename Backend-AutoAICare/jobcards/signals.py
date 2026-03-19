from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import JobCard
from bookings.models import Booking
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


# ─── Auto-create RewardSettings when a Branch is created ─────────────────────

def create_default_reward_settings(branch):
    """
    Create a default RewardSettings record for the given branch.
    Safe to call multiple times — uses get_or_create so it never duplicates.
    Returns (settings, created) tuple.
    """
    from .models import RewardSettings
    from decimal import Decimal

    company = getattr(branch, 'company', None)

    settings, created = RewardSettings.objects.get_or_create(
        branch=branch,
        company=company,
        defaults={
            'is_active': True,
            'use_percentage_based_rewards': True,
            # Revenue tiers
            'tier_1_job_value_min':    Decimal('5000'),
            'tier_1_reward_percentage': Decimal('1.00'),
            'tier_2_job_value_min':    Decimal('10000'),
            'tier_2_reward_percentage': Decimal('1.50'),
            'tier_3_job_value_min':    Decimal('12000'),
            'tier_3_reward_percentage': Decimal('1.80'),
            'tier_4_job_value_min':    Decimal('15000'),
            'tier_4_reward_percentage': Decimal('2.00'),
            # Time bonus
            'apply_time_bonus':            True,
            'time_bonus_percentage':       Decimal('0.50'),
            'time_bonus_interval_minutes': 15,
            # Distribution
            'applicator_share_percentage': Decimal('50.00'),
            # Deduction defaults
            'deduction_enabled':           True,
            'deduction_threshold_minutes': 15,
            'deduction_per_minute':        Decimal('5.00'),
            'max_deduction_per_job':       Decimal('500.00'),
        }
    )
    return settings, created


@receiver(post_save, sender='branches.Branch')
def auto_create_reward_settings(sender, instance, created, **kwargs):
    """
    Automatically create a RewardSettings record whenever a new Branch is saved.
    Fires only on creation (created=True) to avoid repeated updates.
    """
    if not created:
        return

    try:
        settings, was_created = create_default_reward_settings(instance)
        if was_created:
            logger.info(
                f"✓ RewardSettings auto-created for new branch: "
                f"{instance.name} (id={instance.id})"
            )
    except Exception as e:
        # Never block branch creation due to settings failure
        logger.error(
            f"✗ Failed to auto-create RewardSettings for branch "
            f"{instance.name} (id={instance.id}): {e}",
            exc_info=True
        )


# NOTE: JobCard notification handling has been moved to notify/signals.py
# to eliminate duplication and centralize all notification logic.
# This file now only contains the sync_jobcard_booking_status helper function.

def sync_jobcard_booking_status(jobcard):
    """
    Synchronize job card status with booking status where appropriate.
    This ensures the booking status reflects the actual job progress.
    """
    if not jobcard.booking:
        return
        
    booking = jobcard.booking
    original_status = booking.status
    
    # Define mappings from job card status to booking status
    status_mapping = {
        'pending': 'pending',
        'confirmed': 'confirmed',
        'vehicle_arrived': 'vehicle_arrived',
        'assigned_to_fm': 'assigned_to_fm',
        'qc_pending': 'qc_pending',
        'qc_completed': 'qc_completed',
        'qc_rejected': 'qc_rejected',
        'supervisor_approved': 'supervisor_approved',
        'supervisor_rejected': 'supervisor_rejected',
        'floor_manager_confirmed': 'floor_manager_confirmed',
        
        # Work in progress statuses
        'assigned_to_applicator': 'assigned_to_applicator',
        'work_in_progress': 'work_in_progress',
        'work_completed': 'work_completed',
        'final_qc_pending': 'final_qc_pending',
        'final_qc_passed': 'final_qc_passed',
        'final_qc_failed': 'final_qc_failed',
        'floor_manager_final_qc_confirmed': 'floor_manager_final_qc_confirmed',
        'customer_approval_pending': 'customer_approval_pending',
        
        # Completion statuses
        'customer_approved': 'customer_approved',
        'customer_revision_requested': 'customer_revision_requested',
        'ready_for_billing': 'ready_for_billing',
        'billed': 'billed',
        'delivered': 'delivered',
        'closed': 'closed',
    }
    
    # Update booking status if there's a mapping
    if jobcard.status in status_mapping:
        new_booking_status = status_mapping[jobcard.status]
        if booking.status != new_booking_status:
            booking.status = new_booking_status
            booking.save(update_fields=['status'])


@receiver(post_save, sender=JobCard)
def record_performance_on_completion(sender, instance, created, **kwargs):
    """
    Automatically record performance metrics when job is completed.
    
    This signal triggers when a job reaches any completion status:
    - work_completed
    - final_qc_passed
    - ready_for_billing
    - billed
    - ready_for_delivery
    - delivered
    - closed
    
    Performance metrics are only created once per job, even if status changes multiple times.
    """
    # List of statuses that indicate job completion
    completion_statuses = [
        'work_completed',
        'final_qc_passed',
        'ready_for_billing',
        'billed',
        'ready_for_delivery',
        'delivered',
        'closed'
    ]
    
    # Only record performance when job reaches completion status
    if instance.status in completion_statuses and instance.job_started_at:
        # Check if performance metrics already exist
        if not hasattr(instance, 'performance') or not instance.performance:
            from .performance_service import PerformanceTrackingService
            import logging
            
            logger = logging.getLogger(__name__)
            
            try:
                performance = PerformanceTrackingService.record_job_completion(instance)
                if performance:
                    logger.info(
                        f"✓ Performance metrics created for JobCard #{instance.id} "
                        f"(Status: {instance.status}, Job Value: ₹{performance.job_value})"
                    )
                else:
                    logger.warning(
                        f"⊘ Performance metrics not created for JobCard #{instance.id} "
                        f"(Status: {instance.status}, missing required data)"
                    )
            except Exception as e:
                # Log error but don't fail the save operation
                logger.error(
                    f"✗ Error recording performance metrics for JobCard #{instance.id}: {e}",
                    exc_info=True
                )
@receiver(post_save, sender=JobCard)
def update_vehicle_service_history(sender, instance, created, **kwargs):
    """
    Update vehicle's last_service_date and next_service_due when job is delivered or closed.
    """
    if instance.status in ['delivered', 'closed']:
        vehicle = instance.booking.vehicle
        today = timezone.now().date()
        
        # Update last service date
        vehicle.last_service_date = today
        
        # Calculate next service due date
        # Use package specific interval if available, otherwise use vehicle default
        interval_days = vehicle.service_interval_days or 90
        
        # If the package has a custom interval (not yet implemented in model, but planned)
        # we could use it here. For now, use vehicle default.
        
        vehicle.next_service_due = today + timedelta(days=interval_days)
        vehicle.save(update_fields=['last_service_date', 'next_service_due'])
        
        # Trigger reminder generation for the next cycle
        from customers.reminder_service import ServiceReminderService
        ServiceReminderService.generate_reminders_for_vehicle(vehicle)
