from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import PartUsed
from .parts_catalog import Part
from purchases.models import StockMovement


@receiver(post_save, sender=PartUsed)
def handle_part_usage(sender, instance, created, **kwargs):
    """
    Handle stock deduction when a part is used in a job card.
    Also auto-populate fields from catalog if part is selected.
    """
    if created and instance.part:
        # Auto-populate fields from catalog
        if not instance.part_name:
            instance.part_name = instance.part.name
        
        if not instance.price or instance.price == 0:
            instance.price = instance.part.selling_price
        
        if not instance.cost_price or instance.cost_price == 0:
            instance.cost_price = instance.part.cost_price
        
        # Save the auto-populated fields (avoid recursion with update_fields)
        PartUsed.objects.filter(pk=instance.pk).update(
            part_name=instance.part_name,
            price=instance.price,
            cost_price=instance.cost_price
        )
        
        # Deduct stock from catalog
        try:
            # 1. Validate stock availability
            if instance.part.stock < instance.quantity:
                raise ValidationError(
                    f'Insufficient stock for {instance.part.name}. '
                    f'Available: {instance.part.stock}, Required: {instance.quantity}'
                )

            # 2. Create stock movement record
            # The signal in jobcards/stock_signals.py will update both BranchStock and Part stock
            branch = instance.jobcard.branch
            company = instance.company or instance.jobcard.company or instance.part.company
            
            StockMovement.objects.create(
                company=company,
                branch=branch,
                part=instance.part,
                movement_type='job_card_usage',
                quantity=-instance.quantity,  # Negative for usage
                reference_type='job_card',
                reference_id=instance.jobcard.id,
                date=timezone.now(),
                notes=f'Used in Job Card #{instance.jobcard.id}',
                created_by=None
            )
        except ValidationError as e:
            # If stock validation fails, delete the PartUsed record
            instance.delete()
            raise ValidationError(f"Cannot use part: {str(e)}")


@receiver(pre_delete, sender=PartUsed)
def handle_part_usage_deletion(sender, instance, **kwargs):
    """
    Return stock to catalog when a PartUsed record is deleted.
    Safe for cascade-deletes (e.g. when the parent JobCard is deleted).
    """
    import logging
    logger = logging.getLogger(__name__)

    if not instance.part:
        return

    try:
        # Access jobcard safely — it may already be in a deletion state
        jobcard = instance.jobcard
        if jobcard is None:
            return

        branch = jobcard.branch
        company = instance.company or jobcard.company or (instance.part.company if instance.part else None)

        if not company:
            logger.warning(
                f"PartUsed #{instance.pk} has no company — skipping stock reversal."
            )
            return

        StockMovement.objects.create(
            company=company,
            branch=branch,
            part=instance.part,
            movement_type='adjustment',
            quantity=instance.quantity,  # Positive to return stock
            reference_type='job_card_reversal',
            reference_id=jobcard.id,
            date=timezone.now(),
            notes=f'Usage reversed for Job Card #{jobcard.id}',
        )
    except Exception as e:
        # Log but never block the deletion itself
        logger.error(
            f"Error reversing stock for PartUsed #{instance.pk} during deletion: {e}",
            exc_info=True
        )
