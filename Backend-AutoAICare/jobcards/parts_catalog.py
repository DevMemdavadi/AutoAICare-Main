from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from decimal import Decimal
from companies.managers import CompanyManager


class Part(models.Model):
    """Pre-defined parts catalog for job cards with stock management."""
    
    CATEGORY_CHOICES = [
        ('consumable', 'Consumable'),
        ('spare', 'Spare Part'),
        ('material', 'Material'),
        ('chemical', 'Chemical/Product'),
        ('tool', 'Tool/Equipment'),
    ]
    
    UNIT_CHOICES = [
        ('pieces', 'Pieces'),
        ('liters', 'Liters'),
        ('kg', 'Kilograms'),
        ('sets', 'Sets'),
        ('meters', 'Meters'),
        ('bottles', 'Bottles'),
    ]
    
    STOCK_TRACKING_CHOICES = [
        ('global', 'Global - Single stock pool for all branches'),
        ('branch', 'Branch - Track stock separately per branch'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='parts',
        null=True,  # Temporary for migration
        blank=True
    )
    
    # Basic Information
    name = models.CharField(max_length=200, help_text='Part name')
    sku = models.CharField(max_length=50, help_text='Stock Keeping Unit (identifier)')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='spare')
    description = models.TextField(blank=True, null=True)
    
    # Pricing
    cost_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text='Purchase/cost price per unit'
    )
    selling_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text='Selling price per unit (charged to customer)'
    )
    
    # Stock Management
    stock = models.IntegerField(default=0, help_text='Current stock quantity')
    min_stock_level = models.IntegerField(default=5, help_text='Minimum stock level for alerts')
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='pieces')
    
    # GST Configuration
    gst_applicable = models.BooleanField(default=True, help_text='Whether GST is applicable')
    gst_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('18.00'),
        help_text='GST percentage (e.g., 18.00 for 18%)'
    )
    hsn_code = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        help_text='HSN code for GST'
    )
    
    # Branch Support
    is_global = models.BooleanField(
        default=True, 
        help_text='If True, available to all branches'
    )
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='parts',
        help_text='Specific branch (only if is_global=False)'
    )
    
    # Stock Tracking Mode
    stock_tracking_mode = models.CharField(
        max_length=10,
        choices=STOCK_TRACKING_CHOICES,
        default='global',
        help_text='How stock is tracked: global pool or per branch'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'parts'
        verbose_name = 'Part'
        verbose_name_plural = 'Parts'
        ordering = ['name']
        unique_together = [['company', 'sku']]
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.sku}) - ₹{self.selling_price}/{self.unit}"
    
    def clean(self):
        """Validate model fields."""
        if self.selling_price < self.cost_price:
            raise ValidationError('Selling price cannot be less than cost price')
        
        if not self.is_global and not self.branch:
            raise ValidationError('Branch must be specified if part is not global')
    
    def deduct_stock(self, quantity):
        """Deduct stock quantity."""
        if quantity <= 0:
            raise ValidationError('Quantity must be positive')
        
        if self.stock < quantity:
            raise ValidationError(
                f'Insufficient stock for {self.name}. '
                f'Available: {self.stock}, Required: {quantity}'
            )
        
        self.stock -= quantity
        self.save(update_fields=['stock', 'updated_at'])
    
    def add_stock(self, quantity):
        """Add stock quantity."""
        if quantity <= 0:
            raise ValidationError('Quantity must be positive')
        
        self.stock += quantity
        self.save(update_fields=['stock', 'updated_at'])
    
    def calculate_gst(self, base_price=None):
        """Calculate GST amount."""
        if not self.gst_applicable:
            return Decimal('0.00')
        
        price = base_price if base_price is not None else self.selling_price
        
        if not isinstance(price, Decimal):
            price = Decimal(str(price))
        
        return (price * self.gst_rate) / Decimal('100')
    
    def get_price_with_gst(self):
        """Get price with GST."""
        return self.selling_price + self.calculate_gst()
    
    def get_profit_margin(self):
        """Calculate profit margin."""
        return self.selling_price - self.cost_price
    
    def get_profit_percentage(self):
        """Calculate profit percentage."""
        if self.cost_price == 0:
            return Decimal('0.00')
        return (self.get_profit_margin() / self.cost_price) * Decimal('100')
    
    def is_low_stock(self):
        """Check if stock is low."""
        return self.stock <= self.min_stock_level
    
    @property
    def stock_status(self):
        """Get stock status."""
        if self.stock == 0:
            return 'out_of_stock'
        elif self.is_low_stock():
            return 'low_stock'
        else:
            return 'in_stock'


class BranchStock(models.Model):
    """Track stock levels per branch for each part."""
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='branch_stocks'
    )
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        related_name='stock_levels'
    )
    part = models.ForeignKey(
        Part,
        on_delete=models.CASCADE,
        related_name='branch_stocks'
    )
    
    # Stock Information
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Current stock quantity at this branch'
    )
    min_stock_level = models.IntegerField(
        default=5,
        help_text='Minimum stock level for this branch'
    )
    location = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Storage location within branch (e.g., Shelf A1, Bin 5)'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'branch_stocks'
        verbose_name = 'Branch Stock'
        verbose_name_plural = 'Branch Stocks'
        unique_together = [['company', 'branch', 'part']]
        ordering = ['branch__name', 'part__name']
        indexes = [
            models.Index(fields=['branch', 'part']),
            models.Index(fields=['quantity']),
        ]
    
    def __str__(self):
        return f"{self.part.name} @ {self.branch.name}: {self.quantity} {self.part.unit}"
    
    def is_low_stock(self):
        """Check if stock is low at this branch."""
        return self.quantity <= self.min_stock_level
    
    @property
    def stock_status(self):
        """Get stock status for this branch."""
        if self.quantity == 0:
            return 'out_of_stock'
        elif self.is_low_stock():
            return 'low_stock'
        else:
            return 'in_stock'


class StockTransfer(models.Model):
    """Track stock transfers between branches."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('in_transit', 'In Transit'),
        ('received', 'Received'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='stock_transfers'
    )
    
    # Transfer Information
    transfer_number = models.CharField(
        max_length=50,
        unique=True,
        help_text='Auto-generated transfer number'
    )
    part = models.ForeignKey(
        Part,
        on_delete=models.PROTECT,
        related_name='transfers'
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Quantity to transfer'
    )
    
    # Branch Information
    from_branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.PROTECT,
        related_name='stock_transfers_out',
        help_text='Source branch'
    )
    to_branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.PROTECT,
        related_name='stock_transfers_in',
        help_text='Destination branch'
    )
    
    # Status and Workflow
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    reason = models.TextField(
        help_text='Reason for transfer request'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Additional notes'
    )
    
    # User Tracking
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='stock_transfers_requested'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='stock_transfers_approved'
    )
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='stock_transfers_received'
    )
    
    # Timestamps
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'stock_transfers'
        verbose_name = 'Stock Transfer'
        verbose_name_plural = 'Stock Transfers'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['transfer_number']),
            models.Index(fields=['status']),
            models.Index(fields=['from_branch', 'to_branch']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.transfer_number}: {self.part.name} ({self.quantity}) from {self.from_branch.name} to {self.to_branch.name}"
    
    def clean(self):
        """Validate transfer."""
        if self.from_branch == self.to_branch:
            raise ValidationError('Cannot transfer to the same branch')
        
        if self.quantity <= 0:
            raise ValidationError('Transfer quantity must be positive')
    
    def save(self, *args, **kwargs):
        # Auto-generate transfer number if not set
        if not self.transfer_number:
            from django.utils import timezone
            date_str = timezone.now().strftime('%Y%m%d')
            # Get last transfer number for today
            last_transfer = StockTransfer.objects.filter(
                company=self.company,
                transfer_number__startswith=f'STR-{date_str}'
            ).order_by('-transfer_number').first()
            
            if last_transfer:
                last_num = int(last_transfer.transfer_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.transfer_number = f'STR-{date_str}-{new_num:04d}'
        
        super().save(*args, **kwargs)
