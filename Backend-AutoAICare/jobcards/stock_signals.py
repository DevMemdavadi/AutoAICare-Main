from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Sum
from django.utils import timezone
from .parts_catalog import Part, BranchStock
from branches.models import Branch
from purchases.models import StockMovement

@receiver(post_save, sender=Part)
def ensure_branch_stock_records(sender, instance, created, **kwargs):
    """
    Ensure BranchStock records exist for parts so they are visible in the Branch Stock tab.
    - If part is not global: Create BranchStock for its specific branch.
    - If part is global: Create BranchStock for all active branches.
    - If created with initial stock: Generate initial StockMovement to sync counts.
    """
    # 1. Ensure records exist
    if instance.is_global:
        branches = Branch.objects.filter(company=instance.company, is_active=True)
        for branch in branches:
            BranchStock.objects.get_or_create(
                company=instance.company,
                branch=branch,
                part=instance,
                defaults={
                    'quantity': 0,
                    'min_stock_level': instance.min_stock_level
                }
            )
    elif instance.branch:
        BranchStock.objects.get_or_create(
            company=instance.company,
            branch=instance.branch,
            part=instance,
            defaults={
                'quantity': 0,
                'min_stock_level': instance.min_stock_level
            }
        )

    # 2. Handle initial stock on creation
    if created and instance.stock > 0:
        # To avoid double-counting (since the StockMovement signal also updates Part.stock),
        # we treat the balance as a movement.
        initial_qty = instance.stock
        
        # Determine the target branch for initial stock
        target_branch = instance.branch if not instance.is_global else None
        if not target_branch and instance.stock_tracking_mode == 'branch':
            target_branch = Branch.objects.filter(company=instance.company, is_active=True).first()

        # Temporarily set part stock to 0 so the movement signal can set it correctly
        Part.objects.filter(pk=instance.pk).update(stock=0)
        
        StockMovement.objects.create(
            company=instance.company,
            branch=target_branch,
            part=instance,
            movement_type='adjustment',
            quantity=initial_qty,
            reference_type='initial_stock',
            reference_id=instance.id,
            notes='Initial stock on creation',
            date=timezone.now()
        )

@receiver(post_save, sender=StockMovement)
def sync_stock_on_movement(sender, instance, created, **kwargs):
    """
    Automatically update BranchStock and Part stock whenever a StockMovement is recorded.
    This is the single source of truth for stock level property updates.
    """
    if created:
        # 1. Update Branch-specific stock (only if a branch is assigned)
        if instance.branch:
            branch_stock, _ = BranchStock.objects.get_or_create(
                company=instance.company,
                branch=instance.branch,
                part=instance.part,
                defaults={
                    'quantity': 0,
                    'min_stock_level': instance.part.min_stock_level
                }
            )
            
            # Update branch quantity
            branch_stock.quantity += instance.quantity
            branch_stock.save()
        
        # 2. Update Global Part stock
        if instance.part.stock_tracking_mode == 'branch':
            # If tracking by branch, the global stock is the sum of all branch stocks
            total_stock = BranchStock.objects.filter(
                part=instance.part
            ).aggregate(total=Sum('quantity'))['total'] or 0
            instance.part.stock = int(total_stock)
        else:
            # If global tracking, update the global stock directly by movement quantity
            # This handles purchases, usage, and adjustments for global-pool parts
            instance.part.stock += int(instance.quantity)
            
        instance.part.save(update_fields=['stock', 'updated_at'])
