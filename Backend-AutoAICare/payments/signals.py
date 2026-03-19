from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Payment
from accounting.models import Transaction
from billing.models import Invoice
from jobcards.models import JobCard


@receiver(post_save, sender=Payment)
def create_transaction_and_update_invoice(sender, instance, created, **kwargs):
    """
    When a Payment is completed:
    1. Create a Transaction record in the accounting ledger
    2. Update the associated Invoice status based on payment status
    3. Update the associated JobCard status when invoice is fully paid
    """
    # Only process when payment status changes to 'completed'
    if instance.payment_status == 'completed':
        # Create Transaction record for accounting
        if not Transaction.objects.filter(
            source='invoice',
            reference_id=str(instance.id)
        ).exists():
            # Build description with payment method
            payment_method_display = instance.get_payment_method_display()
            description = f"Payment received via {payment_method_display}"
            
            if instance.invoice:
                description += f" - Invoice #{instance.invoice.invoice_number}"
            elif instance.booking:
                description += f" - Booking #{instance.booking.id}"
            
            # Derive company: prefer payment.company, then invoice.company, then invoice.branch.company
            transaction_company = instance.company
            if not transaction_company and instance.invoice:
                transaction_company = instance.invoice.company
                if not transaction_company and instance.invoice.branch:
                    transaction_company = getattr(instance.invoice.branch, 'company', None)
            
            Transaction.objects.create(
                company=transaction_company,
                transaction_type='income',
                source='invoice',
                amount=instance.amount,
                description=description,
                reference_id=str(instance.id),
                invoice=instance.invoice,
                branch=instance.invoice.branch if instance.invoice else None,
                payment_method=instance.payment_method,  # Track payment method
            )
        
        # Update Invoice status based on payment status
        if instance.invoice:
            invoice = instance.invoice
            
            # Check if invoice is fully paid
            if invoice.is_fully_paid():
                # Only mark as paid and update jobcard when FULLY paid
                if invoice.status != 'paid':
                    invoice.mark_as_paid()
            elif invoice.is_partially_paid():
                # Partial payment - update status to pending (from draft)
                if invoice.status == 'draft':
                    invoice.status = 'pending'
                    invoice.save(update_fields=['status'])
        
        # Update JobCard status if linked through invoice (only if invoice is fully paid)
        if instance.invoice and instance.invoice.jobcard and instance.invoice.is_fully_paid():
            jobcard = instance.invoice.jobcard
            # Only update if jobcard is in a state that should transition to billed
            if jobcard.status in ['ready_for_billing', 'final_qc_passed', 'customer_approved']:
                jobcard.status = 'billed'
                jobcard.save()

            # Refresh performance metrics with the real paid invoice amounts
            try:
                from jobcards.performance_service import PerformanceTrackingService
                PerformanceTrackingService.update_on_payment(
                    jobcard=instance.invoice.jobcard,
                    invoice=instance.invoice,
                )
            except Exception as exc:
                import logging
                logging.getLogger(__name__).error(
                    f"Error updating PerformanceMetrics on payment for "
                    f"JobCard #{instance.invoice.jobcard_id}: {exc}",
                    exc_info=True,
                )

        # Update JobCard status if linked directly through booking (only if fully paid via invoice)
        elif hasattr(instance.booking, 'jobcard') and instance.booking.jobcard:
            jobcard = instance.booking.jobcard
            # Only update if there's an associated invoice that's fully paid
            if instance.invoice and instance.invoice.is_fully_paid():
                if jobcard.status in ['ready_for_billing', 'final_qc_passed', 'customer_approved']:
                    jobcard.status = 'billed'
                    jobcard.save()

                # Refresh performance metrics with the real paid invoice amounts
                try:
                    from jobcards.performance_service import PerformanceTrackingService
                    PerformanceTrackingService.update_on_payment(
                        jobcard=instance.booking.jobcard,
                        invoice=instance.invoice,
                    )
                except Exception as exc:
                    import logging
                    logging.getLogger(__name__).error(
                        f"Error updating PerformanceMetrics on booking payment for "
                        f"JobCard #{instance.booking.jobcard.id}: {exc}",
                        exc_info=True,
                    )