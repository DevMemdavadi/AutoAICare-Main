from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.db import transaction
from decimal import Decimal
from .models import (
    Purchase,
    PurchaseItem,
    PurchaseReturn,
    PurchaseReturnItem,
    PurchasePayment,
    SupplierLedger,
    StockMovement
)


@receiver(post_save, sender=Purchase)
def handle_purchase_approval(sender, instance, created, **kwargs):
    """
    Handle purchase approval:
    - Update part stock
    - Create ledger entry
    - Create stock movements
    """
    # Only process when purchase is approved and not already processed
    if instance.status == 'approved' and instance.approved_at:
        # Check if ledger entry already exists to avoid duplicates
        existing_ledger = SupplierLedger.objects.filter(
            purchase=instance,
            transaction_type='purchase'
        ).exists()
        
        if not existing_ledger:
            with transaction.atomic():
                # Create stock movements (Stock update is handled by the StockMovement signal)
                for item in instance.items.all():
                    
                    # Create stock movement record
                    StockMovement.objects.create(
                        company=instance.company,
                        branch=instance.branch,
                        part=item.part,
                        movement_type='purchase',
                        quantity=item.quantity,
                        reference_type='purchase',
                        reference_id=instance.id,
                        date=instance.purchase_date,
                        notes=f'Purchase: {instance.purchase_number}',
                        created_by=instance.approved_by
                    )
                
                # Get previous balance
                last_ledger = SupplierLedger.objects.filter(
                    supplier=instance.supplier,
                    company=instance.company
                ).order_by('-transaction_date', '-id').first()
                
                previous_balance = last_ledger.balance if last_ledger else instance.supplier.opening_balance
                new_balance = previous_balance + instance.total_amount
                
                # Create supplier ledger entry (debit - increases supplier balance)
                SupplierLedger.objects.create(
                    company=instance.company,
                    supplier=instance.supplier,
                    transaction_date=instance.approved_at,
                    transaction_type='purchase',
                    purchase=instance,
                    debit=instance.total_amount,
                    credit=Decimal('0.00'),
                    balance=new_balance,
                    description=f'Purchase: {instance.purchase_number}'
                )
                
                # Update supplier current balance
                instance.supplier.current_balance = new_balance
                instance.supplier.save(update_fields=['current_balance'])


@receiver(post_save, sender=PurchaseItem)
def update_purchase_totals(sender, instance, created, **kwargs):
    """
    Recalculate purchase totals when items are added/updated.
    """
    purchase = instance.purchase
    
    # Calculate totals from all items
    items = purchase.items.all()
    subtotal = sum(item.quantity * item.unit_price for item in items)
    total_discount = sum(item.discount for item in items)
    total_gst = sum(item.cgst_amount + item.sgst_amount + item.igst_amount for item in items)
    
    # Update purchase
    purchase.subtotal = subtotal
    purchase.discount = total_discount
    purchase.gst_amount = total_gst
    purchase.total_amount = subtotal - total_discount + total_gst
    
    # Use update to avoid triggering signals again
    Purchase.objects.filter(pk=purchase.pk).update(
        subtotal=purchase.subtotal,
        discount=purchase.discount,
        gst_amount=purchase.gst_amount,
        total_amount=purchase.total_amount
    )


@receiver(post_save, sender=PurchasePayment)
def handle_purchase_payment(sender, instance, created, **kwargs):
    """
    Handle purchase payment:
    - Update purchase paid amount and payment status
    - Create ledger entry
    - Create accounting transaction
    """
    if created:
        with transaction.atomic():
            purchase = instance.purchase
            
            # Update paid amount
            total_paid = sum(p.amount for p in purchase.payments.all())
            purchase.paid_amount = total_paid
            
            # Update payment status
            if total_paid >= purchase.total_amount:
                purchase.payment_status = 'paid'
            elif total_paid > 0:
                purchase.payment_status = 'partial'
            else:
                purchase.payment_status = 'unpaid'
            
            purchase.save(update_fields=['paid_amount', 'payment_status'])
            
            # Get previous balance
            last_ledger = SupplierLedger.objects.filter(
                supplier=purchase.supplier,
                company=instance.company
            ).order_by('-transaction_date', '-id').first()
            
            previous_balance = last_ledger.balance if last_ledger else purchase.supplier.opening_balance
            new_balance = previous_balance - instance.amount
            
            # Create supplier ledger entry (credit - decreases supplier balance)
            SupplierLedger.objects.create(
                company=instance.company,
                supplier=purchase.supplier,
                transaction_date=instance.payment_date,
                transaction_type='payment',
                payment=instance,
                debit=Decimal('0.00'),
                credit=instance.amount,
                balance=new_balance,
                description=f'Payment for {purchase.purchase_number} - {instance.payment_mode}'
            )
            
            # Update supplier current balance
            purchase.supplier.current_balance = new_balance
            purchase.supplier.save(update_fields=['current_balance'])
            
            # Create accounting transaction record with branch information
            from accounting.models import Transaction
            Transaction.objects.create(
                company=instance.company,
                branch=purchase.branch,  # Associate with purchase's branch
                transaction_type='expense',
                source='adjustment',  # Use adjustment since purchase payments don't link to Expense model
                amount=instance.amount,
                date=instance.payment_date,
                description=f'Purchase payment: {purchase.purchase_number} - {purchase.supplier.name}',
                reference_id=str(instance.id),
                payment_method=instance.payment_mode
            )


@receiver(post_save, sender=PurchaseReturn)
def handle_purchase_return_approval(sender, instance, created, **kwargs):
    """
    Handle purchase return approval:
    - Reduce part stock
    - Create ledger entry
    - Create stock movements
    """
    # Only process when return is approved and not already processed
    if instance.status == 'approved' and instance.approved_at:
        # Check if ledger entry already exists to avoid duplicates
        existing_ledger = SupplierLedger.objects.filter(
            return_entry=instance,
            transaction_type='return'
        ).exists()
        
        if not existing_ledger:
            with transaction.atomic():
                # Create stock movements (Stock update is handled by the StockMovement signal)
                for item in instance.items.all():
                    
                    # Create stock movement record
                    StockMovement.objects.create(
                        company=instance.company,
                        branch=instance.purchase.branch,
                        part=item.purchase_item.part,
                        movement_type='purchase_return',
                        quantity=-item.quantity_returned,  # Negative for return
                        reference_type='purchase_return',
                        reference_id=instance.id,
                        date=instance.return_date,
                        notes=f'Return: {instance.return_number}',
                        created_by=instance.approved_by
                    )
                
                # Get previous balance
                last_ledger = SupplierLedger.objects.filter(
                    supplier=instance.purchase.supplier,
                    company=instance.company
                ).order_by('-transaction_date', '-id').first()
                
                previous_balance = last_ledger.balance if last_ledger else instance.purchase.supplier.opening_balance
                new_balance = previous_balance - instance.total_amount
                
                # Create supplier ledger entry (credit - decreases supplier balance)
                SupplierLedger.objects.create(
                    company=instance.company,
                    supplier=instance.purchase.supplier,
                    transaction_date=instance.approved_at,
                    transaction_type='return',
                    return_entry=instance,
                    debit=Decimal('0.00'),
                    credit=instance.total_amount,
                    balance=new_balance,
                    description=f'Return: {instance.return_number} for {instance.purchase.purchase_number}'
                )
                
                # Update supplier current balance
                instance.purchase.supplier.current_balance = new_balance
                instance.purchase.supplier.save(update_fields=['current_balance'])


@receiver(post_save, sender=PurchaseReturnItem)
def update_return_totals(sender, instance, created, **kwargs):
    """
    Recalculate return totals when items are added/updated.
    """
    purchase_return = instance.purchase_return
    
    # Calculate total from all return items
    items = purchase_return.items.all()
    total_amount = sum(item.amount for item in items)
    
    # Update return total
    PurchaseReturn.objects.filter(pk=purchase_return.pk).update(
        total_amount=total_amount
    )


@receiver(pre_save, sender=PurchaseItem)
def calculate_gst_split(sender, instance, **kwargs):
    """
    Calculate CGST/SGST or IGST based on company and supplier GST numbers.
    This runs before save to determine intra-state vs inter-state.
    """
    if instance.purchase and instance.purchase.supplier:
        company = instance.purchase.company
        supplier = instance.purchase.supplier
        
        # Extract state code from GST number (first 2 digits)
        def get_state_code(gst_number):
            if gst_number and len(gst_number) >= 2:
                return gst_number[:2]
            return None
        
        company_state = get_state_code(company.gst_number) if company.gst_number else None
        supplier_state = get_state_code(supplier.gst_number) if supplier.gst_number else None
        
        # Calculate base amount
        base_amount = (instance.quantity * instance.unit_price) - instance.discount
        gst_total = (base_amount * instance.gst_rate) / Decimal('100')
        
        # Determine if intra-state or inter-state
        if company_state and supplier_state and company_state == supplier_state:
            # Intra-state: Split into CGST and SGST
            instance.cgst_amount = gst_total / Decimal('2')
            instance.sgst_amount = gst_total / Decimal('2')
            instance.igst_amount = Decimal('0.00')
        else:
            # Inter-state: Use IGST
            instance.cgst_amount = Decimal('0.00')
            instance.sgst_amount = Decimal('0.00')
            instance.igst_amount = gst_total
        
        # Calculate total
        instance.total_amount = base_amount + gst_total
