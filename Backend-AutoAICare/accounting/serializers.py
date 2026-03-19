from rest_framework import serializers
from .models import (
    Expense, Transaction, Vendor, EmployeeSalaryStructure, 
    Payroll, PettyCash, RecurringExpense, BranchBudget, InterBranchTransfer,
    LeaveType, LeaveBalance, LeaveRequest, LeaveEncashment,
    TaxSlab, TaxDeclaration, Form16, PerformanceMetrics
)
from users.models import User
from companies.serializers import TenantSerializerMixin


class VendorSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for Vendor model."""
    
    total_expenses = serializers.SerializerMethodField()
    
    class Meta:
        model = Vendor
        fields = '__all__'
        read_only_fields = ('id', 'company', 'created_at', 'updated_at')
    
    def get_total_expenses(self, obj):
        """Calculate total expenses for this vendor"""
        return obj.expenses.aggregate(total=serializers.models.Sum('amount'))['total'] or 0


class ExpenseSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for Expense model - Enhanced."""
    
    vendor_details = VendorSerializer(source='vendor', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    # Computed fields for partial payments
    remaining_amount = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('id', 'company', 'recorded_by', 'created_at', 'updated_at')
    
    def get_remaining_amount(self, obj):
        """Get remaining payable amount"""
        return float(obj.remaining_amount)
    
    def get_paid_amount(self, obj):
        """Get paid amount"""
        return float(obj.paid_amount)
    
    def to_internal_value(self, data):
        """Handle 'all' (Global/General) branch selection"""
        if data.get('branch') == 'all':
            data = data.copy()
            data['branch'] = None
        return super().to_internal_value(data)

    def validate(self, data):
        """Validate expense data"""
        # Branch is required for proper reporting unless explicitly 'Global'
        branch = data.get('branch')
        is_global = self.initial_data.get('branch') == 'all'
        
        if not branch and not is_global:
            # Check if user has a default branch in context
            request = self.context.get('request')
            if request and hasattr(request.user, 'branch') and request.user.branch:
                # We'll default to user's branch in perform_create
                pass
            else:
                raise serializers.ValidationError({
                    'branch': 'Branch is required for all expenses. Please select a branch.'
                })
        
        # Validate partial payment
        if data.get('payment_status') == 'partial':
            if not data.get('partial_amount'):
                raise serializers.ValidationError({
                    'partial_amount': 'Partial amount is required when payment status is "Partially Paid".'
                })
            
            # Ensure partial amount is less than or equal to total amount
            partial_amount = data.get('partial_amount')
            total_amount = data.get('amount')
            
            if partial_amount and total_amount and partial_amount > total_amount:
                raise serializers.ValidationError({
                    'partial_amount': f'Partial amount (₹{partial_amount}) cannot exceed total amount (₹{total_amount}).'
                })
            
            if partial_amount and partial_amount <= 0:
                raise serializers.ValidationError({
                    'partial_amount': 'Partial amount must be greater than zero.'
                })
        
        return data


class TransactionSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for Transaction model."""
    
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True, allow_null=True)
    expense_title = serializers.CharField(source='expense.title', read_only=True, allow_null=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    
    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ('id', 'company', 'date')


class EmployeeSalaryStructureSerializer(serializers.ModelSerializer):
    """Serializer for Employee Salary Structure."""
    
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    employee_role = serializers.CharField(source='employee.role', read_only=True)
    gross_salary = serializers.SerializerMethodField()
    net_salary = serializers.SerializerMethodField()
    total_deductions = serializers.SerializerMethodField()
    
    class Meta:
        model = EmployeeSalaryStructure
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_gross_salary(self, obj):
        return float(obj.calculate_gross_salary())
    
    def get_net_salary(self, obj):
        return float(obj.calculate_net_salary())
    
    def get_total_deductions(self, obj):
        return float(obj.calculate_total_deductions())


class PayrollSerializer(serializers.ModelSerializer):
    """Serializer for Payroll."""
    
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    employee_role = serializers.CharField(source='employee.role', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    month_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Payroll
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_month_name(self, obj):
        """Return month name"""
        months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
        return months[obj.month] if 1 <= obj.month <= 12 else ''


class PayrollCreateSerializer(serializers.Serializer):
    """Serializer for bulk payroll generation."""
    
    month = serializers.IntegerField(min_value=1, max_value=12)
    year = serializers.IntegerField(min_value=2020, max_value=2100)
    employee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Leave empty to generate for all employees with salary structure"
    )


class PettyCashSerializer(serializers.ModelSerializer):
    """Serializer for Petty Cash."""
    
    recorded_by_name = serializers.CharField(source='recorded_by.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    
    class Meta:
        model = PettyCash
        fields = '__all__'
        read_only_fields = ('id', 'recorded_by', 'created_at', 'balance_before', 'balance_after')


class RecurringExpenseSerializer(serializers.ModelSerializer):
    """Serializer for Recurring Expense."""
    
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, allow_null=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True, allow_null=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = RecurringExpense
        fields = '__all__'
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at', 'last_generated_date')


# Summary Serializers
class FinancialSummarySerializer(serializers.Serializer):
    """Financial summary for dashboard."""
    
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    receivables = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    payables = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    pending_salaries = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    
    # Payment method breakdown
    cash_income = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    online_income = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    cash_expense = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    online_expense = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    
    # Comparison fields (optional)
    income_change = serializers.FloatField(required=False, allow_null=True)
    expense_change = serializers.FloatField(required=False, allow_null=True)
    profit_change = serializers.FloatField(required=False, allow_null=True)
    prev_income = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    prev_expense = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    prev_profit = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)


class ExpenseCategoryBreakdownSerializer(serializers.Serializer):
    """Expense breakdown by category."""
    
    category = serializers.CharField()
    category_display = serializers.CharField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    count = serializers.IntegerField()


class IncomeBreakdownSerializer(serializers.Serializer):
    """Income breakdown."""
    
    source = serializers.CharField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    count = serializers.IntegerField()


class BranchFinancialSummarySerializer(serializers.Serializer):
    """Branch-wise financial summary."""
    
    branch_id = serializers.IntegerField()
    branch_name = serializers.CharField()
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_profit = serializers.DecimalField(max_digits=12, decimal_places=2)


class BranchBudgetSerializer(serializers.ModelSerializer):
    """Serializer for Branch Budget."""
    
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True, allow_null=True)
    period_type_display = serializers.CharField(source='get_period_type_display', read_only=True)
    
    # Calculated fields
    utilization_percentage = serializers.SerializerMethodField()
    remaining_budget = serializers.SerializerMethodField()
    spent_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = BranchBudget
        fields = '__all__'
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')
    
    def get_utilization_percentage(self, obj):
        return round(obj.get_utilization_percentage(), 2)
    
    def get_remaining_budget(self, obj):
        return float(obj.get_remaining_budget())
    
    def get_spent_amount(self, obj):
        from django.db.models import Sum
        expenses = Expense.objects.filter(
            branch=obj.branch,
            date__gte=obj.start_date,
            date__lte=obj.end_date
        ).aggregate(total=Sum('amount'))['total'] or 0
        return float(expenses)


class InterBranchTransferSerializer(serializers.ModelSerializer):
    """Serializer for Inter-Branch Transfer."""
    
    from_branch_name = serializers.CharField(source='from_branch.name', read_only=True)
    to_branch_name = serializers.CharField(source='to_branch.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True, allow_null=True)
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True, allow_null=True)
    transfer_type_display = serializers.CharField(source='get_transfer_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    expense_title = serializers.CharField(source='expense.title', read_only=True, allow_null=True)
    
    class Meta:
        model = InterBranchTransfer
        fields = '__all__'
        read_only_fields = ('id', 'created_by', 'approved_by', 'created_at', 'updated_at')


# ==================== LEAVE MANAGEMENT SERIALIZERS ====================

class LeaveTypeSerializer(serializers.ModelSerializer):
    """Serializer for Leave Type."""
    
    class Meta:
        model = LeaveType
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class LeaveBalanceSerializer(serializers.ModelSerializer):
    """Serializer for Leave Balance."""
    
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    leave_type_code = serializers.CharField(source='leave_type.code', read_only=True)
    available_balance = serializers.SerializerMethodField()
    total_balance = serializers.SerializerMethodField()
    
    class Meta:
        model = LeaveBalance
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_available_balance(self, obj):
        return float(obj.available_balance)
    
    def get_total_balance(self, obj):
        return float(obj.total_balance)


class LeaveRequestSerializer(serializers.ModelSerializer):
    """Serializer for Leave Request."""
    
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    leave_type_code = serializers.CharField(source='leave_type.code', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = LeaveRequest
        fields = '__all__'
        read_only_fields = ('id', 'employee', 'approved_by', 'approval_date', 'created_at', 'updated_at')


class LeaveEncashmentSerializer(serializers.ModelSerializer):
    """Serializer for Leave Encashment."""
    
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    leave_type_code = serializers.CharField(source='leave_type.code', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payroll_month = serializers.IntegerField(source='payroll.month', read_only=True, allow_null=True)
    payroll_year = serializers.IntegerField(source='payroll.year', read_only=True, allow_null=True)
    
    class Meta:
        model = LeaveEncashment
        fields = '__all__'
        read_only_fields = ('id', 'employee', 'approved_by', 'approval_date', 'payroll', 'processed_date', 'created_at', 'updated_at')


# ==================== TAX COMPLIANCE SERIALIZERS ====================

class TaxSlabSerializer(serializers.ModelSerializer):
    """Serializer for Tax Slab."""
    
    regime_display = serializers.CharField(source='get_regime_display', read_only=True)
    
    class Meta:
        model = TaxSlab
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class TaxDeclarationSerializer(serializers.ModelSerializer):
    """Serializer for Tax Declaration."""
    
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    regime_display = serializers.CharField(source='get_regime_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.name', read_only=True, allow_null=True)
    total_80c_deduction = serializers.SerializerMethodField()
    total_deductions = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxDeclaration
        fields = '__all__'
        read_only_fields = ('id', 'employee', 'verified_by', 'verification_date', 'created_at', 'updated_at')
    
    def get_total_80c_deduction(self, obj):
        return float(obj.total_80c_deduction)
    
    def get_total_deductions(self, obj):
        return float(obj.total_deductions)


class Form16Serializer(serializers.ModelSerializer):
    """Serializer for Form 16."""
    
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Form16
        fields = '__all__'
        read_only_fields = ('id', 'employee', 'generated_by', 'generated_date', 'created_at', 'updated_at')


# ==================== PERFORMANCE METRICS SERIALIZERS ====================

class PerformanceMetricsSerializer(serializers.ModelSerializer):
    """Serializer for Performance Metrics."""
    
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    employee_role = serializers.CharField(source='employee.role', read_only=True)
    completion_rate = serializers.SerializerMethodField()
    efficiency_score = serializers.SerializerMethodField()
    
    class Meta:
        model = PerformanceMetrics
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_completion_rate(self, obj):
        return round(obj.completion_rate, 2)
    
    def get_efficiency_score(self, obj):
        return round(obj.efficiency_score, 2)


# ==================== ENHANCED PAYROLL SERIALIZER ====================

class PayrollDetailedSerializer(serializers.ModelSerializer):
    """Enhanced Payroll Serializer with leave and tax details."""
    
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    employee_role = serializers.CharField(source='employee.role', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    month_name = serializers.SerializerMethodField()
    
    # Leave details
    leave_encashments = LeaveEncashmentSerializer(many=True, read_only=True)
    
    # Performance metrics
    performance_metrics = serializers.SerializerMethodField()
    
    class Meta:
        model = Payroll
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
    
    def get_month_name(self, obj):
        """Return month name"""
        months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
        return months[obj.month] if 1 <= obj.month <= 12 else ''
    
    def get_performance_metrics(self, obj):
        """Get performance metrics for this payroll period"""
        try:
            metrics = PerformanceMetrics.objects.get(
                employee=obj.employee,
                month=obj.month,
                year=obj.year
            )
            return PerformanceMetricsSerializer(metrics).data
        except PerformanceMetrics.DoesNotExist:
            return None


# ==================== DASHBOARD SERIALIZERS ====================

class PerformanceDashboardSerializer(serializers.Serializer):
    """Performance dashboard summary."""
    
    employee_id = serializers.IntegerField()
    employee_name = serializers.CharField()
    employee_role = serializers.CharField()
    total_jobs = serializers.IntegerField()
    completed_jobs = serializers.IntegerField()
    qc_pass_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    avg_completion_time = serializers.IntegerField()
    total_incentives = serializers.DecimalField(max_digits=10, decimal_places=2)
    rank = serializers.IntegerField()


class LeaderboardSerializer(serializers.Serializer):
    """Leaderboard entry."""
    
    rank = serializers.IntegerField()
    employee_id = serializers.IntegerField()
    employee_name = serializers.CharField()
    supervisor_name = serializers.CharField(required=False)
    employee_role = serializers.CharField()
    branch_name = serializers.CharField()
    total_incentives = serializers.DecimalField(max_digits=10, decimal_places=2)
    jobs_completed = serializers.IntegerField()
    total_jobs_completed = serializers.IntegerField(required=False)
    total_rewards_earned = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    qc_pass_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    efficiency_score = serializers.DecimalField(max_digits=10, decimal_places=2)
