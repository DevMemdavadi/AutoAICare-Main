from django.db import models
from django.conf import settings
from customers.models import Customer
from bookings.models import Booking
from jobcards.models import JobCard
from store.models import Product
from companies.managers import CompanyManager


class Invoice(models.Model):
    """Invoice model for billing customers."""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    
    DISCOUNT_TYPE_CHOICES = [
        ('none', 'No Discount'),
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
        ('coupon', 'Coupon Code'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='invoices',
        null=True,
        blank=True
    )
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices')
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    jobcard = models.ForeignKey(JobCard, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    branch = models.ForeignKey('branches.Branch', on_delete=models.CASCADE, related_name='invoices', null=True, blank=True)
    
    invoice_number = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Amount breakdown
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text='Tax percentage')
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Discount fields
    # 1. System Discount (Carried over from booking - referral, coupon, etc.)
    system_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Discount carried over from booking')
    
    # 2. Additional Discount (Manually added on the invoice)
    additional_discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='none')
    additional_discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    additional_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Legacy fields for backward compatibility/total tracking
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='none')
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Total combined discount amount')
    discount_reason = models.CharField(max_length=255, blank=True, null=True, help_text='Reason for discount')
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    notes = models.TextField(blank=True, null=True)
    
    issued_date = models.DateField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='invoices_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'invoices'
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        ordering = ['-created_at']
        # Invoice number unique per company
        unique_together = [['company', 'invoice_number']]
    
    def __str__(self):
        return f"Invoice #{self.invoice_number} - {self.customer.user.name} - ${self.total_amount}"
    
    def calculate_totals(self):
        """
        Calculate invoice totals from line items and discounts.
        
        GST is applied ONLY on service and addon items — parts already have
        their tax built into the selling price (tax-inclusive).
        
        Total = (Subtotal + GST on services/addons) - discounts
        """
        from decimal import Decimal, ROUND_HALF_UP
        
        items = list(self.items.all())
        
        # Taxable items: service & addon (GST applied on top)
        TAX_ITEM_TYPES = {'service', 'addon', 'other'}
        
        taxable_subtotal = Decimal('0')
        non_taxable_subtotal = Decimal('0')
        
        for item in items:
            item_total = Decimal(str(item.total))
            if item.item_type in TAX_ITEM_TYPES:
                taxable_subtotal += item_total
            else:
                # Parts / products already include their own tax — add as-is
                non_taxable_subtotal += item_total
        
        # Full subtotal shown on invoice (all items)
        subtotal = taxable_subtotal + non_taxable_subtotal
        self.subtotal = subtotal.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Ensure tax_rate is Decimal
        tax_rate = Decimal(str(self.tax_rate)) if self.tax_rate else Decimal('0')
        
        # GST only on taxable (service/addon) portion
        self.tax_amount = ((taxable_subtotal * tax_rate) / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Calculate additional discount
        # Ensure additional_discount_percentage is Decimal (guards against raw string from request.data)
        additional_discount_percentage = Decimal(str(self.additional_discount_percentage)) if self.additional_discount_percentage else Decimal('0')
        if self.additional_discount_type == 'percentage' and additional_discount_percentage > 0:
            percentage = additional_discount_percentage
            self.additional_discount_amount = ((self.subtotal * percentage) / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        elif self.additional_discount_type == 'fixed':
            pass
        elif self.additional_discount_type == 'none':
            self.additional_discount_amount = Decimal('0.00')
            
        # Combine discounts
        self.discount_amount = self.system_discount_amount + self.additional_discount_amount
        
        # Update legacy discount_type
        if self.system_discount_amount > 0 and self.additional_discount_amount == 0:
            self.discount_type = 'fixed'
        elif self.additional_discount_type != 'none':
            self.discount_type = self.additional_discount_type
        else:
            self.discount_type = 'none'
        
        # Total = Subtotal + GST (on services only) - Total Discount
        self.total_amount = (self.subtotal + self.tax_amount - self.discount_amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.save()
    
    def mark_as_paid(self):
        """Mark invoice as paid and update job card status."""
        from django.utils import timezone
        self.status = 'paid'
        self.paid_date = timezone.now().date()
        self.save()
        
        # Update related JobCard status to 'billed'
        # Workflow: ready_for_billing → billed (when invoice paid) → ready_for_delivery
        if self.jobcard:
            # Only update if job card is in a billing-ready state
            if self.jobcard.status in ['ready_for_billing', 'customer_approved', 'final_qc_passed']:
                self.jobcard.status = 'billed'
                self.jobcard.save(update_fields=['status'])
        
        # Update booking status
        if self.booking:
            self.booking.status = 'completed'
            self.booking.save(update_fields=['status'])
    
    def get_amount_paid(self):
        """Calculate total amount paid for this invoice from completed payments."""
        from payments.models import Payment
        total_paid = sum(
            p.amount for p in self.payments.filter(payment_status='completed')
        )
        return total_paid
    
    def get_amount_remaining(self):
        """Calculate remaining amount to be paid."""
        return self.total_amount - self.get_amount_paid()
    
    def is_fully_paid(self):
        """Check if invoice is fully paid."""
        return self.get_amount_paid() >= self.total_amount
    
    def is_partially_paid(self):
        """Check if invoice has partial payment."""
        amount_paid = self.get_amount_paid()
        return 0 < amount_paid < self.total_amount



class InvoiceItem(models.Model):
    """Individual line items in an invoice."""
    
    ITEM_TYPE_CHOICES = [
        ('service', 'Service'),
        ('part', 'Part'),
        ('product', 'Product'),
        ('addon', 'Add-on'),
        ('other', 'Other'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='invoice_items',
        null=True,
        blank=True
    )
    
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Optional foreign keys for reference
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'invoice_items'
        verbose_name = 'Invoice Item'
        verbose_name_plural = 'Invoice Items'
    
    def __str__(self):
        return f"{self.description} - {self.quantity} x ${self.unit_price}"
    
    def save(self, *args, **kwargs):
        """Calculate total before saving."""
        from decimal import Decimal
        
        # Ensure quantity and unit_price are Decimal (not string)
        quantity = Decimal(str(self.quantity)) if self.quantity else Decimal('0')
        unit_price = Decimal(str(self.unit_price)) if self.unit_price else Decimal('0')
        
        self.total = quantity * unit_price
        super().save(*args, **kwargs)
