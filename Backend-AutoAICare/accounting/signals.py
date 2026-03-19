from django.db.models.signals import post_save
from django.dispatch import receiver
from jobcards.models import JobCard
from billing.models import Invoice, InvoiceItem
from .models import Expense, Transaction
from django.db import transaction as db_transaction

@receiver(post_save, sender=JobCard)
def create_invoice_from_jobcard(sender, instance, created, **kwargs):
    """
    Auto-generate an invoice when JobCard status changes to 'customer_approved', 'ready_for_billing', or 'floor_manager_final_qc_confirmed'.
    This ensures invoice is created immediately after final approval.
    
    FIXED: Now includes GST, discounts, dynamic tasks, and QC additional tasks.
    """
    if instance.status in ['customer_approved', 'ready_for_billing', 'floor_manager_final_qc_confirmed']:
        # Check if invoice already exists
        if Invoice.objects.filter(jobcard=instance).exists():
            return
            
        with db_transaction.atomic():
            from billing.utils import generate_invoice_number
            from config.models import GlobalSettings
            
            invoice_number = generate_invoice_number()
            # Get tax rate with branch-specific override logic
            tax_rate = 18  # Default fallback
            if instance.branch:
                company = instance.branch.company
                if company:
                    overrides = company.settings.get('branch_overrides', {})
                    branch_data = overrides.get(str(instance.branch.id), {})
                    if 'default_tax_rate' in branch_data:
                        tax_rate = branch_data['default_tax_rate']
                    else:
                        try:
                            tax_rate = company.company_settings.default_tax_rate
                        except:
                            settings = GlobalSettings.load()
                            tax_rate = settings.default_tax_rate if settings.default_tax_rate > 0 else 18
            else:
                settings = GlobalSettings.load()
                tax_rate = settings.default_tax_rate if settings.default_tax_rate > 0 else 18
            
            # Get booking discount (refresh to ensure we have latest data)
            instance.booking.refresh_from_db()
            booking_discount = instance.booking.discount_amount
                        
            # Create invoice with discount from booking
            # Changed to 'draft' so staff can review before finalizing
            invoice = Invoice.objects.create(
                company=instance.branch.company if instance.branch else None,
                invoice_number=invoice_number,
                tax_rate=tax_rate,
                customer=instance.booking.customer,
                booking=instance.booking,
                jobcard=instance,
                branch=instance.branch,
                status='draft',  # ✅ Changed from 'pending' to 'draft'
                system_discount_amount=booking_discount,  # ✅ FIXED: Use system_discount_amount instead of discount_amount
                discount_reason=f"Referral discount from Booking #{instance.booking.id}" if booking_discount > 0 else "",
                notes=f"Auto-generated from Job Card #{instance.id}"
            )
                        
            # Add ALL service packages as individual InvoiceItems with GST
            for pkg in instance.booking.get_packages_list():
                package_price = pkg.get_price_for_vehicle_type(instance.booking.vehicle_type)
                package_gst = pkg.calculate_gst(package_price)
                package_total = package_price + package_gst
                
                InvoiceItem.objects.create(
                    company=invoice.company,
                    invoice=invoice,
                    item_type='service',
                    description=f"Service Package: {pkg.name} ({instance.booking.vehicle_type})",
                    quantity=1,
                    unit_price=package_price,
                    total=package_total  # Includes GST
                )
            
            # Add add-ons with GST
            for addon in instance.booking.addons.all():
                addon_gst = addon.calculate_gst()
                addon_total = addon.price + addon_gst
                
                InvoiceItem.objects.create(
                    company=invoice.company,
                    invoice=invoice,
                    item_type='addon',
                    description=f"Add-on: {addon.name}",
                    quantity=1,
                    unit_price=addon.price,
                    total=addon_total  # ✅ Includes GST
                )
                
            # Add parts used — skip service-default parts (included in package price)
            for part in instance.parts_used.all():
                if part.is_service_default:
                    continue  # Included in service — don't bill or show on invoice
                InvoiceItem.objects.create(
                    company=invoice.company,
                    invoice=invoice,
                    item_type='part',
                    description=f"Part: {part.part_name}",
                    quantity=part.quantity,
                    unit_price=part.price,
                    total=part.total_price
                )
            
            # ✅ Add dynamic tasks (extra work approved by customer)
            for task in instance.dynamic_tasks.filter(
                approved_by_customer=True,
                status__in=['approved', 'completed']
            ):
                InvoiceItem.objects.create(
                    company=invoice.company,
                    invoice=invoice,
                    item_type='other',
                    description=f"Extra Work: {task.title}",
                    quantity=1,
                    unit_price=task.estimated_price,
                    total=task.estimated_price
                )
            
            # ✅ Add QC additional tasks (upselling opportunities)
            if hasattr(instance, 'qc_report') and instance.qc_report:
                if instance.qc_report.additional_tasks_price > 0:
                    InvoiceItem.objects.create(
                        company=invoice.company,
                        invoice=invoice,
                        item_type='other',
                        description=f"Additional Services: {instance.qc_report.additional_tasks}",
                        quantity=1,
                        unit_price=instance.qc_report.additional_tasks_price,
                        total=instance.qc_report.additional_tasks_price
                    )
                
            # Calculate totals (will sum all item totals and apply discount)
            invoice.calculate_totals()
            
            # Don't change status to 'billed' yet - invoice is still a draft
            # Status will be changed to 'billed' when invoice is finalized
            # instance.status = 'billed'
            # instance.save(update_fields=['status'])

# NOTE: Transaction creation for expenses is now handled in ExpenseViewSet.perform_create()
# This signal has been disabled to prevent duplicate transaction records
# @receiver(post_save, sender=Expense)
# def create_transaction_from_expense(sender, instance, created, **kwargs):
#     """
#     Auto-create a Transaction record when a PAID Expense is created.
#     Only creates transaction for paid expenses.
#     """
#     if created and instance.payment_status == 'paid':
#         # Check if transaction already exists for this expense
#         if not Transaction.objects.filter(expense=instance).exists():
#             Transaction.objects.create(
#                 transaction_type='expense',
#                 source='expense',
#                 amount=instance.amount,
#                 description=f"Expense: {instance.title} ({instance.get_category_display()})",
#                 reference_id=str(instance.id),
#                 expense=instance,
#                 branch=instance.branch  # Include branch tracking
#             )


# NOTE: Transaction creation from payments is handled in payments/signals.py
# This duplicate signal has been removed to prevent duplicate transaction records

