from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from billing.models import Invoice
from decimal import Decimal
from companies.managers import CompanyManager


def validate_file_size(file):
    """Validate file size - max 5MB"""
    max_size = 5 * 1024 * 1024  # 5MB in bytes
    if file.size > max_size:
        raise ValidationError(
            f'File size cannot exceed 5MB. Current size: {file.size / (1024 * 1024):.2f}MB'
        )


class Vendor(models.Model):
    """Vendors for expenses (inventory, equipment, supplies, etc.)"""
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='vendors',
        null=True,
        blank=True
    )
    
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=200, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    # Tax details
    gst_number = models.CharField(max_length=50, blank=True, null=True, help_text="GST Number")
    pan_number = models.CharField(max_length=20, blank=True, null=True, help_text="PAN Number")
    
    # Payment terms
    payment_terms = models.CharField(max_length=100, blank=True, null=True, help_text="e.g., Net 30, COD")
    payment_terms_days = models.IntegerField(
        default=30,
        help_text="Payment terms in days (e.g., 30 for Net 30)"
    )
    
    # Financial tracking (for purchase module)
    opening_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Opening balance (amount owed to supplier)"
    )
    
    current_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Current outstanding balance"
    )
    
    credit_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Maximum credit limit allowed"
    )
    
    # Supplier management
    supplier_rating = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Supplier rating (1-5 stars)"
    )
    
    is_approved = models.BooleanField(
        default=True,
        help_text="Whether this supplier is approved for purchases"
    )
    
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'vendors'
        ordering = ['name']
        # Vendor names unique per company
        unique_together = [['company', 'name']]
    
    def __str__(self):
        return self.name


class Expense(models.Model):
    """Operational expenses - Enhanced with branch, vendor, and staff tracking"""
    
    CATEGORY_CHOICES = [
        ('inventory', 'Inventory Purchase'),
        ('salary', 'Salary/Wages'),
        ('utilities', 'Utilities (Electricity, Water, etc.)'),
        ('rent', 'Rent'),
        ('maintenance', 'Maintenance & Repairs'),
        ('marketing', 'Marketing & Advertising'),
        ('software', 'Software & Subscriptions'),
        ('equipment', 'Equipment Purchase'),
        ('supplies', 'Office Supplies'),
        ('fuel', 'Fuel & Transport'),
        ('insurance', 'Insurance'),
        ('taxes', 'Taxes & Fees'),
        ('other', 'Other'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='expenses',
        null=True,
        blank=True
    )
    
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    
    description = models.TextField(blank=True, null=True)
    receipt = models.FileField(
        upload_to='expenses/receipts/', 
        blank=True, 
        null=True, 
        help_text="Upload receipt (PDF/Image - Max 5MB)",
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png']),
            validate_file_size
        ]
    )
    
    # Vendor tracking
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    vendor_name = models.CharField(max_length=200, blank=True, null=True, help_text="Vendor name if not in system")
    
    # Branch tracking (for multi-branch) - Validated in code, not enforced at DB level
    branch = models.ForeignKey('branches.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    
    # Staff tracking (who incurred the expense)
    staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='incurred_expenses', help_text="Staff who incurred this expense")
    
    PAYMENT_STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('pending', 'Pending'),
        ('partial', 'Partially Paid'),
    ]
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='paid')
    
    # Payment method
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('online', 'Online'),
    ]
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash', help_text="Payment method")
    
    # Partial payment tracking
    partial_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Amount paid if payment_status is 'partial'"
    )
    
    # Tracking
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='recorded_expenses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'expenses'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['category', 'date']),
            models.Index(fields=['branch', 'date']),
            models.Index(fields=['vendor', 'date']),
        ]
        
    def __str__(self):
        return f"{self.title} - ₹{self.amount}"
    
    @property
    def remaining_amount(self):
        """Calculate remaining payable amount for partial payments"""
        if self.payment_status == 'partial' and self.partial_amount:
            return self.amount - self.partial_amount
        elif self.payment_status == 'pending':
            return self.amount
        return Decimal('0.00')
    
    @property
    def paid_amount(self):
        """Calculate amount paid"""
        if self.payment_status == 'paid':
            return self.amount
        elif self.payment_status == 'partial' and self.partial_amount:
            return self.partial_amount
        return Decimal('0.00')


class Transaction(models.Model):
    """Financial transaction ledger - Enhanced with branch tracking"""
    
    TYPE_CHOICES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]
    
    SOURCE_CHOICES = [
        ('invoice', 'Invoice Payment'),
        ('expense', 'Operational Expense'),
        ('salary', 'Salary Payment'),
        ('adjustment', 'Manual Adjustment'),
        ('petty_cash', 'Petty Cash'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='transactions',
        null=True,
        blank=True
    )
    
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateTimeField(default=timezone.now)
    
    description = models.CharField(max_length=255)
    reference_id = models.CharField(max_length=100, blank=True, null=True, help_text="ID of related Invoice or Expense")
    
    # Payment method tracking (for income and expense transactions)
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('upi', 'UPI'),
        ('cheque', 'Cheque'),
        ('bank_transfer', 'Bank Transfer'),
        ('stripe', 'Stripe'),
        ('wallet', 'Wallet'),
        ('gift_card', 'Gift Card'),
        ('online', 'Online'),
        ('other', 'Other'),
    ]
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHOD_CHOICES, 
        blank=True, 
        null=True,
        help_text="Payment method used for this transaction"
    )
    
    # Branch tracking
    branch = models.ForeignKey('branches.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    
    # Links
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    expense = models.ForeignKey(Expense, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    payroll = models.ForeignKey('Payroll', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    petty_cash = models.ForeignKey('PettyCash', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    transfer = models.ForeignKey('InterBranchTransfer', on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'transactions'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['transaction_type', 'date']),
            models.Index(fields=['branch', 'date']),
        ]
    
    def clean(self):
        """Validate that transaction is linked to a source record."""
        from django.core.exceptions import ValidationError
        
        # Define source-to-link requirement mapping
        source_links = {
            'invoice': self.invoice,
            'expense': self.expense,
            'salary': self.payroll,
            'petty_cash': self.petty_cash,
            'transfer': self.transfer,
        }
        
        # Check if the source has its required link
        if self.source in source_links and not source_links[self.source]:
            raise ValidationError(
                f"Transaction source '{self.source}' must be linked to its corresponding {self.source} record."
            )
            
        # Manual adjustments must have a description at least
        if self.source == 'adjustment' and not self.description:
            raise ValidationError("Manual adjustments must have a clear description.")
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.full_clean()
        super().save(*args, **kwargs)
        
    def __str__(self):
        return f"{self.transaction_type.upper()}: ₹{self.amount} ({self.date.date()})"


class EmployeeSalaryStructure(models.Model):
    """Salary structure for employees (staff members)"""
    
    employee = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='salary_structure')
    
    # Salary components
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, help_text="Base monthly salary")
    hra = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="House Rent Allowance")
    transport_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_allowances = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Deductions
    pf_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Provident Fund")
    esi_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="ESI")
    tds_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Tax Deducted at Source")
    
    # Incentive rules
    incentive_per_job = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Incentive per completed job")
    incentive_per_qc_pass = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Bonus for QC passed jobs")
    
    # Overtime
    overtime_hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    is_active = models.BooleanField(default=True)
    effective_from = models.DateField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'employee_salary_structures'
        ordering = ['-effective_from']
    
    def calculate_gross_salary(self):
        """Calculate gross salary (before deductions)"""
        return self.base_salary + self.hra + self.transport_allowance + self.other_allowances
    
    def calculate_total_deductions(self):
        """Calculate total deductions"""
        return self.pf_deduction + self.esi_deduction + self.tds_deduction
    
    def calculate_net_salary(self):
        """Calculate net salary (after deductions, before incentives)"""
        return self.calculate_gross_salary() - self.calculate_total_deductions()
    
    def __str__(self):
        return f"{self.employee.name} - ₹{self.base_salary}"


class Payroll(models.Model):
    """Monthly payroll records"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]
    
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payrolls')
    salary_structure = models.ForeignKey(EmployeeSalaryStructure, on_delete=models.SET_NULL, null=True)
    
    # Period
    month = models.IntegerField(help_text="Month (1-12)")
    year = models.IntegerField(help_text="Year")
    
    # Calculated amounts
    base_salary = models.DecimalField(max_digits=10, decimal_places=2)
    allowances = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Variable components
    incentives = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overtime_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Penalties
    penalties = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Late attendance, quality issues, etc.")
    
    # Attendance (auto-populated if attendance module exists)
    days_present = models.IntegerField(default=0)
    days_absent = models.IntegerField(default=0)
    days_leave = models.IntegerField(default=0)
    
    # Leave deductions
    unpaid_leave_days = models.DecimalField(max_digits=5, decimal_places=2, default=0, 
                                           help_text="Unpaid leave days")
    leave_deduction_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, 
                                                 help_text="Deduction for unpaid leaves")
    leave_encashment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, 
                                                  help_text="Leave encashment added to salary")
    
    # TDS (Tax Deducted at Source)
    tds_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, 
                                    help_text="TDS deducted this month")
    
    # Performance metrics (auto-calculated from job cards)
    jobs_completed = models.IntegerField(default=0)
    qc_pass_count = models.IntegerField(default=0)
    
    # Final amount
    gross_salary = models.DecimalField(max_digits=10, decimal_places=2)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True, help_text="Cash, Bank Transfer, etc.")
    
    notes = models.TextField(blank=True, null=True)
    
    # Tracking
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='generated_payrolls')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payrolls'
        ordering = ['-year', '-month', 'employee']
        unique_together = ['employee', 'month', 'year']
        indexes = [
            models.Index(fields=['month', 'year']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.employee.name} - {self.month}/{self.year} - ₹{self.net_salary}"


class PettyCash(models.Model):
    """Petty cash register for daily operational expenses"""
    
    TRANSACTION_TYPE_CHOICES = [
        ('in', 'Cash In'),
        ('out', 'Cash Out'),
        ('adjustment', 'Adjustment'),
    ]
    
    date = models.DateField()
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    description = models.CharField(max_length=255)
    category = models.CharField(max_length=50, blank=True, null=True)
    
    # Running balance
    balance_before = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Branch tracking
    branch = models.ForeignKey('branches.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='petty_cash')
    
    # Tracking
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    receipt = models.FileField(upload_to='petty_cash/', blank=True, null=True)
    
    class Meta:
        db_table = 'petty_cash'
        ordering = ['-date', '-created_at']
        verbose_name_plural = 'Petty Cash'
    
    def __str__(self):
        return f"{self.transaction_type.upper()} - ₹{self.amount} on {self.date}"


class RecurringExpense(models.Model):
    """Recurring expenses (rent, subscriptions, utilities, etc.)"""
    
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]
    
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=Expense.CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True, help_text="Leave blank for indefinite")
    
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True)
    branch = models.ForeignKey('branches.Branch', on_delete=models.SET_NULL, null=True, blank=True)
    
    description = models.TextField(blank=True, null=True)
    
    # Auto-generation settings
    auto_generate = models.BooleanField(default=True, help_text="Automatically create expenses")
    last_generated_date = models.DateField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'recurring_expenses'
        ordering = ['title']
    
    def __str__(self):
        return f"{self.title} - {self.frequency} - ₹{self.amount}"


class BranchBudget(models.Model):
    """Budget allocation for branches"""
    
    PERIOD_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]
    
    branch = models.ForeignKey('branches.Branch', on_delete=models.CASCADE, related_name='budgets')
    period_type = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    
    # Period dates
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Budget amounts by category
    total_budget = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Category-wise budgets (optional breakdown)
    inventory_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    salary_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    utilities_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rent_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    maintenance_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    marketing_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Tracking
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'branch_budgets'
        ordering = ['-start_date']
        unique_together = ['branch', 'start_date', 'end_date']
    
    def __str__(self):
        return f"{self.branch.name} - {self.period_type} - ₹{self.total_budget}"
    
    def get_utilization_percentage(self):
        """Calculate budget utilization percentage"""
        from django.db.models import Sum
        
        expenses = Expense.objects.filter(
            branch=self.branch,
            date__gte=self.start_date,
            date__lte=self.end_date
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        if self.total_budget > 0:
            return (expenses / self.total_budget) * 100
        return 0
    
    def get_remaining_budget(self):
        """Calculate remaining budget"""
        from django.db.models import Sum
        
        expenses = Expense.objects.filter(
            branch=self.branch,
            date__gte=self.start_date,
            date__lte=self.end_date
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        return self.total_budget - expenses


class InterBranchTransfer(models.Model):
    """Track fund transfers between branches"""
    
    TRANSFER_TYPE_CHOICES = [
        ('fund', 'Fund Transfer'),
        ('expense_reallocation', 'Expense Reallocation'),
    ]
    
    from_branch = models.ForeignKey('branches.Branch', on_delete=models.CASCADE, related_name='outgoing_transfers')
    to_branch = models.ForeignKey('branches.Branch', on_delete=models.CASCADE, related_name='incoming_transfers')
    
    transfer_type = models.CharField(max_length=30, choices=TRANSFER_TYPE_CHOICES, default='fund')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    date = models.DateField()
    description = models.TextField()
    
    # Reference to expense if it's a reallocation
    expense = models.ForeignKey(Expense, on_delete=models.SET_NULL, null=True, blank=True, related_name='reallocations')
    
    # Approval workflow
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Tracking
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_transfers')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_transfers')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'inter_branch_transfers'
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.from_branch.name} → {self.to_branch.name} - ₹{self.amount}"


# ==================== LEAVE MANAGEMENT MODELS ====================

class LeaveType(models.Model):
    """Types of leaves available (Casual, Sick, Earned, etc.)"""
    
    name = models.CharField(max_length=100, help_text="Leave type name (e.g., Casual Leave, Sick Leave)")
    code = models.CharField(max_length=20, unique=True, help_text="Short code (e.g., CL, SL, EL)")
    
    # Leave policy
    annual_quota = models.IntegerField(help_text="Annual leave quota in days")
    max_consecutive_days = models.IntegerField(default=0, help_text="Max consecutive days allowed (0 = unlimited)")
    min_notice_days = models.IntegerField(default=0, help_text="Minimum notice required in days")
    
    # Carry forward rules
    is_carry_forward = models.BooleanField(default=False, help_text="Can be carried forward to next year")
    max_carry_forward_days = models.IntegerField(default=0, help_text="Maximum days that can be carried forward")
    
    # Encashment rules
    is_encashable = models.BooleanField(default=False, help_text="Can be encashed")
    encashment_rate = models.DecimalField(max_digits=5, decimal_places=2, default=100.00, 
                                         help_text="Encashment rate as % of daily salary")
    
    # Applicability
    applies_to_roles = models.JSONField(default=list, blank=True, 
                                       help_text="List of roles this leave applies to (empty = all)")
    
    is_paid = models.BooleanField(default=True, help_text="Is this a paid leave")
    requires_approval = models.BooleanField(default=True)
    requires_document = models.BooleanField(default=False, help_text="Requires medical certificate or document")
    
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'leave_types'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class LeaveBalance(models.Model):
    """Employee leave balance tracking"""
    
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='leave_balances')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name='balances')
    
    # Financial year
    year = models.IntegerField(help_text="Financial year")
    
    # Balance tracking
    opening_balance = models.DecimalField(max_digits=5, decimal_places=2, default=0, 
                                         help_text="Opening balance (carried forward)")
    credited = models.DecimalField(max_digits=5, decimal_places=2, default=0, 
                                  help_text="Leaves credited this year")
    used = models.DecimalField(max_digits=5, decimal_places=2, default=0, 
                              help_text="Leaves used")
    encashed = models.DecimalField(max_digits=5, decimal_places=2, default=0, 
                                  help_text="Leaves encashed")
    lapsed = models.DecimalField(max_digits=5, decimal_places=2, default=0, 
                                help_text="Leaves lapsed (not carried forward)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'leave_balances'
        unique_together = ['employee', 'leave_type', 'year']
        ordering = ['-year', 'employee', 'leave_type']
    
    def __str__(self):
        return f"{self.employee.name} - {self.leave_type.code} - {self.year}"
    
    @property
    def available_balance(self):
        """Calculate available leave balance"""
        return self.opening_balance + self.credited - self.used - self.encashed - self.lapsed
    
    @property
    def total_balance(self):
        """Total balance before any usage"""
        return self.opening_balance + self.credited


class LeaveRequest(models.Model):
    """Employee leave requests"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name='requests')
    
    # Leave period
    start_date = models.DateField()
    end_date = models.DateField()
    total_days = models.DecimalField(max_digits=5, decimal_places=2, help_text="Total leave days (can be half days)")
    
    # Request details
    reason = models.TextField()
    contact_during_leave = models.CharField(max_length=200, blank=True, null=True, 
                                           help_text="Contact number during leave")
    supporting_document = models.FileField(upload_to='leave_documents/', blank=True, null=True)
    
    # Approval workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                   null=True, blank=True, related_name='approved_leaves')
    approval_date = models.DateTimeField(null=True, blank=True)
    approval_notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    # Leave balance reference
    leave_balance = models.ForeignKey(LeaveBalance, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'leave_requests'
        ordering = ['-start_date', '-created_at']
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.employee.name} - {self.leave_type.code} - {self.start_date} to {self.end_date}"
    
    def calculate_total_days(self):
        """Calculate total leave days between start and end date"""
        from datetime import timedelta
        delta = self.end_date - self.start_date
        return delta.days + 1  # Include both start and end date


class LeaveEncashment(models.Model):
    """Leave encashment records"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('processed', 'Processed'),
        ('rejected', 'Rejected'),
    ]
    
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='leave_encashments')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name='encashments')
    leave_balance = models.ForeignKey(LeaveBalance, on_delete=models.CASCADE, related_name='encashments')
    
    # Encashment details
    days_to_encash = models.DecimalField(max_digits=5, decimal_places=2)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, help_text="Daily salary rate")
    encashment_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, 
                                                  help_text="Encashment rate %")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requested_date = models.DateField(auto_now_add=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                   null=True, blank=True, related_name='approved_encashments')
    approval_date = models.DateTimeField(null=True, blank=True)
    
    # Payment tracking
    payroll = models.ForeignKey(Payroll, on_delete=models.SET_NULL, null=True, blank=True, 
                               related_name='leave_encashments')
    processed_date = models.DateField(null=True, blank=True)
    
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'leave_encashments'
        ordering = ['-requested_date']
    
    def __str__(self):
        return f"{self.employee.name} - {self.leave_type.code} - {self.days_to_encash} days - ₹{self.total_amount}"


# ==================== TAX COMPLIANCE MODELS ====================

class TaxSlab(models.Model):
    """Income tax slabs for TDS calculation"""
    
    REGIME_CHOICES = [
        ('old', 'Old Tax Regime'),
        ('new', 'New Tax Regime'),
    ]
    
    regime = models.CharField(max_length=10, choices=REGIME_CHOICES, default='new')
    financial_year = models.CharField(max_length=10, help_text="e.g., 2024-25")
    
    # Slab details
    min_income = models.DecimalField(max_digits=12, decimal_places=2, help_text="Minimum income for this slab")
    max_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, 
                                    help_text="Maximum income (null = no upper limit)")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Tax rate in percentage")
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tax_slabs'
        ordering = ['financial_year', 'regime', 'min_income']
        unique_together = ['regime', 'financial_year', 'min_income']
    
    def __str__(self):
        max_str = f"₹{self.max_income}" if self.max_income else "Above"
        return f"{self.regime.upper()} - {self.financial_year} - ₹{self.min_income} to {max_str} - {self.tax_rate}%"


class TaxDeclaration(models.Model):
    """Employee tax declarations for deductions"""
    
    REGIME_CHOICES = [
        ('old', 'Old Tax Regime'),
        ('new', 'New Tax Regime'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]
    
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tax_declarations')
    financial_year = models.CharField(max_length=10, help_text="e.g., 2024-25")
    regime = models.CharField(max_length=10, choices=REGIME_CHOICES, default='new')
    
    # Section 80C deductions (Old regime)
    section_80c_ppf = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="PPF")
    section_80c_elss = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="ELSS")
    section_80c_life_insurance = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Life Insurance")
    section_80c_home_loan_principal = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Home Loan Principal")
    section_80c_others = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Other 80C investments")
    
    # Other deductions (Old regime)
    section_80d_health_insurance = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Health Insurance")
    section_80e_education_loan = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Education Loan Interest")
    section_24_home_loan_interest = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Home Loan Interest")
    hra_exemption = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="HRA Exemption")
    
    # Standard deduction (both regimes)
    standard_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=50000, 
                                            help_text="Standard deduction (auto-calculated)")
    
    # Supporting documents
    documents = models.JSONField(default=list, blank=True, help_text="List of uploaded document URLs")
    
    # Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    submitted_date = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                   null=True, blank=True, related_name='verified_declarations')
    verification_date = models.DateTimeField(null=True, blank=True)
    verification_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tax_declarations'
        unique_together = ['employee', 'financial_year']
        ordering = ['-financial_year', 'employee']
    
    def __str__(self):
        return f"{self.employee.name} - {self.financial_year} - {self.regime.upper()}"
    
    @property
    def total_80c_deduction(self):
        """Calculate total 80C deduction (max 1.5 lakh)"""
        total = (self.section_80c_ppf + self.section_80c_elss + 
                self.section_80c_life_insurance + self.section_80c_home_loan_principal + 
                self.section_80c_others)
        return min(total, Decimal('150000'))  # Max 1.5 lakh
    
    @property
    def total_deductions(self):
        """Calculate total deductions"""
        if self.regime == 'new':
            return self.standard_deduction
        else:
            return (self.total_80c_deduction + self.section_80d_health_insurance + 
                   self.section_80e_education_loan + self.section_24_home_loan_interest + 
                   self.hra_exemption + self.standard_deduction)


class Form16(models.Model):
    """Form 16 - Annual tax certificate"""
    
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='form16_records')
    financial_year = models.CharField(max_length=10, help_text="e.g., 2024-25")
    
    # Employer details
    employer_name = models.CharField(max_length=200, default="Car Detailing Service")
    employer_tan = models.CharField(max_length=20, help_text="TAN number")
    employer_pan = models.CharField(max_length=20, help_text="PAN number")
    
    # Employee details
    employee_pan = models.CharField(max_length=20, help_text="Employee PAN")
    
    # Salary details
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    perquisites = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_salary = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Deductions
    standard_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=50000)
    professional_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Chapter VI-A deductions (from TaxDeclaration)
    chapter_via_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Taxable income
    taxable_income = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Tax calculation
    tax_on_income = models.DecimalField(max_digits=12, decimal_places=2)
    education_cess = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_tax_liability = models.DecimalField(max_digits=12, decimal_places=2)
    
    # TDS details
    tds_deducted = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Tax relief
    relief_under_89 = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Net tax payable/refundable
    net_tax_payable = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Quarter-wise TDS breakdown
    q1_tds = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    q2_tds = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    q3_tds = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    q4_tds = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Generation details
    generated_date = models.DateField(auto_now_add=True)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                    null=True, related_name='generated_form16')
    pdf_file = models.FileField(upload_to='form16/', blank=True, null=True)
    
    # Status
    is_issued = models.BooleanField(default=False)
    issue_date = models.DateField(null=True, blank=True)
    
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'form16_records'
        unique_together = ['employee', 'financial_year']
        ordering = ['-financial_year', 'employee']
    
    def __str__(self):
        return f"Form 16 - {self.employee.name} - {self.financial_year}"


# ==================== PERFORMANCE METRICS MODEL ====================

class PerformanceMetrics(models.Model):
    """Aggregated performance metrics for employees"""
    
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='performance_metrics')
    
    # Period
    month = models.IntegerField(help_text="Month (1-12)")
    year = models.IntegerField(help_text="Year")
    
    # Job completion metrics
    jobs_assigned = models.IntegerField(default=0)
    jobs_completed = models.IntegerField(default=0)
    jobs_in_progress = models.IntegerField(default=0)
    
    # QC metrics
    qc_passed = models.IntegerField(default=0)
    qc_failed = models.IntegerField(default=0)
    qc_pass_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="QC pass rate %")
    
    # Time metrics
    avg_completion_time_minutes = models.IntegerField(default=0, help_text="Average job completion time")
    total_time_saved_minutes = models.IntegerField(default=0, help_text="Total time saved (early completions)")
    total_time_overrun_minutes = models.IntegerField(default=0, help_text="Total time overrun (late completions)")
    
    # Reward metrics
    total_rewards = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_incentive = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Customer satisfaction
    avg_customer_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0, 
                                             help_text="Average customer rating (0-5)")
    total_feedback_count = models.IntegerField(default=0)
    
    # Attendance (if integrated)
    days_present = models.IntegerField(default=0)
    days_absent = models.IntegerField(default=0)
    days_leave = models.IntegerField(default=0)
    
    # Rank/Position
    branch_rank = models.IntegerField(null=True, blank=True, help_text="Rank within branch")
    overall_rank = models.IntegerField(null=True, blank=True, help_text="Overall rank across all branches")
    
    # Auto-calculated
    is_top_performer = models.BooleanField(default=False, help_text="Top 10% performer")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'performance_metrics'
        unique_together = ['employee', 'month', 'year']
        ordering = ['-year', '-month', '-net_incentive']
        indexes = [
            models.Index(fields=['month', 'year']),
            models.Index(fields=['employee', 'year']),
        ]
    
    def __str__(self):
        return f"{self.employee.name} - {self.month}/{self.year} - ₹{self.net_incentive}"
    
    @property
    def completion_rate(self):
        """Calculate job completion rate"""
        if self.jobs_assigned > 0:
            return (self.jobs_completed / self.jobs_assigned) * 100
        return 0
    
    @property
    def efficiency_score(self):
        """Calculate efficiency score based on time saved/overrun"""
        if self.jobs_completed == 0:
            return 0
        time_diff = self.total_time_saved_minutes - self.total_time_overrun_minutes
        return time_diff / self.jobs_completed  # Average time diff per job


# Import approval workflow models
from .models_approval import ApprovalWorkflow, ApprovalRequest, ApprovalAction
