"""
Billing signals for automatic transaction creation

NOTE: Transaction creation from invoices has been DISABLED.
Transactions are now created from Payment records in payments/signals.py
This supports multiple partial payments per invoice.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from decimal import Decimal
from .models import Invoice


# DISABLED: This signal conflicts with the new payment system
# Transaction creation is now handled in payments/signals.py
# which supports multiple partial payments per invoice
#
# @receiver(post_save, sender=Invoice)
# def create_income_transaction_on_payment(sender, instance, created, **kwargs):
#     """
#     Create or update income transaction when invoice is paid
#     This ensures all paid invoices have corresponding income transactions
#     """
#     from accounting.models import Transaction
#     
#     # Only create transaction if invoice is paid or partially paid
#     if instance.status in ['paid', 'partial'] and instance.paid_date:
#         # Calculate the amount to record
#         # For partial payments, we should track the paid amount
#         if instance.status == 'partial':
#             # If there's a paid_amount field, use it; otherwise use total_amount
#             amount = getattr(instance, 'paid_amount', instance.total_amount)
#         else:
#             amount = instance.total_amount
#         
#         # Create or update the transaction
#         Transaction.objects.update_or_create(
#             invoice=instance,
#             defaults={
#                 'transaction_type': 'income',
#                 'source': 'invoice',
#                 'amount': amount,
#                 'description': f'Payment for {instance.invoice_number}',
#                 'branch': instance.branch,
#                 'date': instance.paid_date or instance.issued_date,
#             }
#         )
#     
#     # If invoice status changed from paid to pending/cancelled, delete the transaction
#     elif instance.status in ['pending', 'cancelled']:
#         from accounting.models import Transaction
#         Transaction.objects.filter(invoice=instance).delete()


# DISABLED: No longer needed since invoice payment signal is disabled
# @receiver(pre_save, sender=Invoice)
# def track_payment_status_change(sender, instance, **kwargs):
#     """
#     Track when payment status changes to trigger transaction updates
#     """
#     if instance.pk:
#         try:
#             old_instance = Invoice.objects.get(pk=instance.pk)
#             instance._old_status = old_instance.status
#             instance._old_paid_date = old_instance.paid_date
#         except Invoice.DoesNotExist:
#             instance._old_status = None
#             instance._old_paid_date = None
