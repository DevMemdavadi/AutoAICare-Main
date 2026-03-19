from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import FileExtensionValidator, MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from companies.managers import CompanyManager


def validate_file_size(file):
    """Validate file size - max 5MB"""
    max_size = 5 * 1024 * 1024  # 5MB in bytes
    if file.size > max_size:
        raise ValidationError(
            f'File size cannot exceed 5MB. Current size: {file.size / (1024 * 1024):.2f}MB'
        )


class Purchase(models.Model):
    """Main purchase bill/invoice model."""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partial', 'Partially Paid'),
        ('paid', 'Paid'),
    ]
    
    PAYMENT_MODE_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('upi', 'UPI'),
        ('cheque', 'Cheque'),
        ('credit', 'Credit'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='purchases',
        help_text='Company this purchase belongs to'
    )
    
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchases',
        help_text='Branch where purchase was made'
    )
    
    # Supplier Information
    supplier = models.ForeignKey(
        'accounting.Vendor',
        on_delete=models.PROTECT,
        related_name='purchases',
        help_text='Supplier/Vendor'
    )
    
    # Purchase Details
    purchase_number = models.CharField(
        max_length=50,
        unique=True,
        help_text='Auto-generated purchase number (e.g., PUR-K3-2026-001)'
    )
    
    supplier_invoice_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Vendor\'s invoice number'
    )
    
    purchase_date = models.DateField(
        default=timezone.now,
        help_text='Date of purchase'
    )
    
    due_date = models.DateField(
        null=True,
        blank=True,
        help_text='Payment due date'
    )
    
    # Financial Details
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Subtotal before tax and discount'
    )
    
    discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Total discount amount'
    )
    
    gst_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Total GST amount'
    )
    
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Final total amount'
    )
    
    # Payment Tracking
    payment_mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        default='cash'
    )
    
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='unpaid'
    )
    
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Total amount paid so far'
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )
    
    # Additional Information
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Additional notes or comments'
    )
    
    invoice_file = models.FileField(
        upload_to='purchases/invoices/',
        blank=True,
        null=True,
        help_text='Upload supplier invoice (PDF/Image - Max 5MB)',
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png']),
            validate_file_size
        ]
    )
    
    # Tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_purchases',
        help_text='User who created this purchase'
    )
    
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_purchases',
        help_text='User who approved this purchase'
    )
    
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the purchase was approved'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'purchases'
        verbose_name = 'Purchase'
        verbose_name_plural = 'Purchases'
        ordering = ['-purchase_date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'purchase_date']),
            models.Index(fields=['supplier', 'status']),
            models.Index(fields=['purchase_number']),
            models.Index(fields=['status', 'payment_status']),
        ]
    
    def __str__(self):
        return f"{self.purchase_number} - {self.supplier.name} - ₹{self.total_amount}"
    
    @property
    def outstanding_amount(self):
        """Calculate outstanding payment amount."""
        return self.total_amount - self.paid_amount
    
    def save(self, *args, **kwargs):
        """Auto-generate purchase number if not set."""
        if not self.purchase_number:
            self.purchase_number = self.generate_purchase_number()
        super().save(*args, **kwargs)
    
    def generate_purchase_number(self):
        """Generate unique purchase number: PUR-{company_code}-{YYYY}-{sequential}"""
        from datetime import datetime
        year = datetime.now().year
        company_code = self.company.slug.upper()[:3] if self.company else 'XXX'
        
        # Get last purchase number for this company and year
        last_purchase = Purchase.objects.filter(
            company=self.company,
            purchase_number__startswith=f'PUR-{company_code}-{year}-'
        ).order_by('-purchase_number').first()
        
        if last_purchase:
            try:
                last_seq = int(last_purchase.purchase_number.split('-')[-1])
                new_seq = last_seq + 1
            except (ValueError, IndexError):
                new_seq = 1
        else:
            new_seq = 1
        
        return f'PUR-{company_code}-{year}-{new_seq:04d}'


class PurchaseItem(models.Model):
    """Line items in a purchase."""
    
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.CASCADE,
        related_name='items',
        help_text='Purchase this item belongs to'
    )
    
    part = models.ForeignKey(
        'jobcards.Part',
        on_delete=models.PROTECT,
        related_name='purchase_items',
        help_text='Part/inventory item being purchased'
    )
    
    # Quantity and Pricing
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Quantity purchased'
    )
    
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Price per unit'
    )
    
    discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Discount on this item'
    )
    
    # GST Details
    gst_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('18.00'),
        help_text='GST percentage'
    )
    
    cgst_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='CGST amount (for intra-state)'
    )
    
    sgst_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='SGST amount (for intra-state)'
    )
    
    igst_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='IGST amount (for inter-state)'
    )
    
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Total amount for this item'
    )
    
    # Batch Tracking (optional)
    batch_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Batch/Lot number'
    )
    
    expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text='Expiry date (if applicable)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'purchase_items'
        verbose_name = 'Purchase Item'
        verbose_name_plural = 'Purchase Items'
        ordering = ['purchase', 'id']
    
    def __str__(self):
        return f"{self.part.name} x {self.quantity} @ ₹{self.unit_price}"
    
    def calculate_totals(self):
        """Calculate GST and total amounts."""
        # Base amount after discount
        base_amount = (self.quantity * self.unit_price) - self.discount
        
        # Calculate GST
        gst_total = (base_amount * self.gst_rate) / Decimal('100')
        
        # Determine if intra-state or inter-state based on company and supplier GST
        # For now, we'll split equally for intra-state (will be enhanced in signals)
        self.cgst_amount = gst_total / Decimal('2')
        self.sgst_amount = gst_total / Decimal('2')
        self.igst_amount = Decimal('0.00')
        
        # Total amount
        self.total_amount = base_amount + gst_total
    
    def save(self, *args, **kwargs):
        """Auto-calculate totals before saving."""
        self.calculate_totals()
        super().save(*args, **kwargs)


class PurchaseReturn(models.Model):
    """Purchase return/debit note model."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='purchase_returns',
        help_text='Company this return belongs to'
    )
    
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.PROTECT,
        related_name='returns',
        help_text='Original purchase'
    )
    
    return_number = models.CharField(
        max_length=50,
        unique=True,
        help_text='Auto-generated return number (e.g., PRET-K3-2026-001)'
    )
    
    return_date = models.DateField(
        default=timezone.now,
        help_text='Date of return'
    )
    
    reason = models.TextField(
        help_text='Reason for return'
    )
    
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Total return amount'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Additional notes'
    )
    
    # Tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_purchase_returns',
        help_text='User who created this return'
    )
    
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_purchase_returns',
        help_text='User who approved this return'
    )
    
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the return was approved'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'purchase_returns'
        verbose_name = 'Purchase Return'
        verbose_name_plural = 'Purchase Returns'
        ordering = ['-return_date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'return_date']),
            models.Index(fields=['purchase', 'status']),
            models.Index(fields=['return_number']),
        ]
    
    def __str__(self):
        return f"{self.return_number} - {self.purchase.purchase_number} - ₹{self.total_amount}"
    
    def save(self, *args, **kwargs):
        """Auto-generate return number if not set."""
        if not self.return_number:
            self.return_number = self.generate_return_number()
        super().save(*args, **kwargs)
    
    def generate_return_number(self):
        """Generate unique return number: PRET-{company_code}-{YYYY}-{sequential}"""
        from datetime import datetime
        year = datetime.now().year
        company_code = self.company.slug.upper()[:3] if self.company else 'XXX'
        
        # Get last return number for this company and year
        last_return = PurchaseReturn.objects.filter(
            company=self.company,
            return_number__startswith=f'PRET-{company_code}-{year}-'
        ).order_by('-return_number').first()
        
        if last_return:
            try:
                last_seq = int(last_return.return_number.split('-')[-1])
                new_seq = last_seq + 1
            except (ValueError, IndexError):
                new_seq = 1
        else:
            new_seq = 1
        
        return f'PRET-{company_code}-{year}-{new_seq:04d}'


class PurchaseReturnItem(models.Model):
    """Items being returned in a purchase return."""
    
    purchase_return = models.ForeignKey(
        PurchaseReturn,
        on_delete=models.CASCADE,
        related_name='items',
        help_text='Purchase return this item belongs to'
    )
    
    purchase_item = models.ForeignKey(
        PurchaseItem,
        on_delete=models.PROTECT,
        related_name='return_items',
        help_text='Original purchase item being returned'
    )
    
    quantity_returned = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Quantity being returned'
    )
    
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Return amount for this item'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'purchase_return_items'
        verbose_name = 'Purchase Return Item'
        verbose_name_plural = 'Purchase Return Items'
        ordering = ['purchase_return', 'id']
    
    def __str__(self):
        return f"{self.purchase_item.part.name} x {self.quantity_returned}"
    
    def clean(self):
        """Validate that return quantity doesn't exceed purchased quantity."""
        if self.quantity_returned > self.purchase_item.quantity:
            raise ValidationError(
                f'Return quantity ({self.quantity_returned}) cannot exceed '
                f'purchased quantity ({self.purchase_item.quantity})'
            )


class PurchasePayment(models.Model):
    """Payment tracking for purchases."""
    
    PAYMENT_MODE_CHOICES = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('upi', 'UPI'),
        ('cheque', 'Cheque'),
        ('credit', 'Credit'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='purchase_payments',
        help_text='Company this payment belongs to'
    )
    
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.PROTECT,
        related_name='payments',
        help_text='Purchase this payment is for'
    )
    
    payment_date = models.DateField(
        default=timezone.now,
        help_text='Date of payment'
    )
    
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Payment amount'
    )
    
    payment_mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        default='cash'
    )
    
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Transaction/Cheque reference number'
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Payment notes'
    )
    
    # Tracking
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='recorded_purchase_payments',
        help_text='User who recorded this payment'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'purchase_payments'
        verbose_name = 'Purchase Payment'
        verbose_name_plural = 'Purchase Payments'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'payment_date']),
            models.Index(fields=['purchase', 'payment_date']),
        ]
    
    def __str__(self):
        return f"Payment ₹{self.amount} for {self.purchase.purchase_number}"


class SupplierLedger(models.Model):
    """Supplier account ledger for tracking all transactions."""
    
    TRANSACTION_TYPE_CHOICES = [
        ('purchase', 'Purchase'),
        ('payment', 'Payment'),
        ('return', 'Purchase Return'),
        ('adjustment', 'Adjustment'),
        ('opening_balance', 'Opening Balance'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='supplier_ledger_entries',
        help_text='Company this ledger entry belongs to'
    )
    
    supplier = models.ForeignKey(
        'accounting.Vendor',
        on_delete=models.CASCADE,
        related_name='ledger_entries',
        help_text='Supplier this entry is for'
    )
    
    transaction_date = models.DateTimeField(
        default=timezone.now,
        help_text='Date and time of transaction'
    )
    
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        help_text='Type of transaction'
    )
    
    # References
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ledger_entries',
        help_text='Related purchase (if applicable)'
    )
    
    payment = models.ForeignKey(
        PurchasePayment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ledger_entries',
        help_text='Related payment (if applicable)'
    )
    
    return_entry = models.ForeignKey(
        PurchaseReturn,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ledger_entries',
        help_text='Related return (if applicable)'
    )
    
    # Amounts
    debit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Debit amount (increases supplier balance)'
    )
    
    credit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Credit amount (decreases supplier balance)'
    )
    
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Running balance after this transaction'
    )
    
    description = models.TextField(
        help_text='Transaction description'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'supplier_ledger'
        verbose_name = 'Supplier Ledger Entry'
        verbose_name_plural = 'Supplier Ledger Entries'
        ordering = ['supplier', '-transaction_date']
        indexes = [
            models.Index(fields=['supplier', 'transaction_date']),
            models.Index(fields=['company', 'transaction_date']),
            models.Index(fields=['transaction_type']),
        ]
    
    def __str__(self):
        return f"{self.supplier.name} - {self.transaction_type} - ₹{self.debit or self.credit}"


class StockMovement(models.Model):
    """Track all stock movements for inventory."""
    
    MOVEMENT_TYPE_CHOICES = [
        ('purchase', 'Purchase'),
        ('purchase_return', 'Purchase Return'),
        ('job_card_usage', 'Job Card Usage'),
        ('adjustment', 'Stock Adjustment'),
        ('transfer', 'Branch Transfer'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='stock_movements',
        help_text='Company this movement belongs to'
    )
    
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_movements',
        help_text='Branch where movement occurred'
    )
    
    part = models.ForeignKey(
        'jobcards.Part',
        on_delete=models.PROTECT,
        related_name='stock_movements',
        help_text='Part/inventory item'
    )
    
    movement_type = models.CharField(
        max_length=20,
        choices=MOVEMENT_TYPE_CHOICES,
        help_text='Type of stock movement'
    )
    
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Quantity moved (positive for increase, negative for decrease)'
    )
    
    # Generic reference to source document
    reference_type = models.CharField(
        max_length=50,
        help_text='Type of reference document (purchase, purchase_return, job_card, etc.)'
    )
    
    reference_id = models.IntegerField(
        help_text='ID of reference document'
    )
    
    date = models.DateTimeField(
        default=timezone.now,
        help_text='Date and time of movement'
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Additional notes'
    )
    
    # Tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_stock_movements',
        help_text='User who created this movement'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'stock_movements'
        verbose_name = 'Stock Movement'
        verbose_name_plural = 'Stock Movements'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['part', 'date']),
            models.Index(fields=['branch', 'date']),
            models.Index(fields=['movement_type', 'date']),
            models.Index(fields=['reference_type', 'reference_id']),
        ]
    
    def __str__(self):
        direction = "+" if self.quantity > 0 else ""
        return f"{self.part.name} {direction}{self.quantity} ({self.movement_type})"
