from django.contrib import admin
from .models import (
    Expense, Transaction, Vendor, EmployeeSalaryStructure,
    Payroll, PettyCash, RecurringExpense, BranchBudget, InterBranchTransfer,
    LeaveType, LeaveBalance, LeaveRequest, LeaveEncashment,
    TaxSlab, TaxDeclaration, Form16, PerformanceMetrics,
    ApprovalWorkflow, ApprovalRequest, ApprovalAction
)



@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'phone', 'email', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'contact_person', 'email', 'phone']
    ordering = ['name']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'amount', 'date', 'vendor', 'branch', 'payment_status', 'recorded_by']
    list_filter = ['category', 'payment_status', 'branch', 'date', 'created_at']
    search_fields = ['title', 'description', 'vendor_name']
    ordering = ['-date', '-created_at']
    date_hierarchy = 'date'


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['transaction_type', 'source', 'amount', 'date', 'branch', 'reference_id']
    list_filter = ['transaction_type', 'source', 'branch', 'date']
    search_fields = ['description', 'reference_id']
    ordering = ['-date']
    date_hierarchy = 'date'


@admin.register(EmployeeSalaryStructure)
class EmployeeSalaryStructureAdmin(admin.ModelAdmin):
    list_display = ['employee', 'base_salary', 'is_active', 'effective_from']
    list_filter = ['is_active', 'effective_from']
    search_fields = ['employee__name', 'employee__email']
    ordering = ['-effective_from']


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ['employee', 'month', 'year', 'gross_salary', 'net_salary', 'status', 'payment_date']
    list_filter = ['status', 'year', 'month', 'payment_date']
    search_fields = ['employee__name', 'employee__email']
    ordering = ['-year', '-month', 'employee']


@admin.register(PettyCash)
class PettyCashAdmin(admin.ModelAdmin):
    list_display = ['date', 'transaction_type', 'amount', 'balance_after', 'branch', 'recorded_by']
    list_filter = ['transaction_type', 'branch', 'date']
    search_fields = ['description']
    ordering = ['-date', '-created_at']
    date_hierarchy = 'date'


@admin.register(RecurringExpense)
class RecurringExpenseAdmin(admin.ModelAdmin):
    list_display = ['title', 'amount', 'frequency', 'start_date', 'end_date', 'is_active', 'auto_generate', 'last_generated_date']
    list_filter = ['frequency', 'is_active', 'auto_generate', 'category']
    search_fields = ['title', 'description']
    ordering = ['title']


@admin.register(BranchBudget)
class BranchBudgetAdmin(admin.ModelAdmin):
    list_display = ['branch', 'period_type', 'start_date', 'end_date', 'total_budget', 'is_active', 'created_by']
    list_filter = ['period_type', 'is_active', 'branch', 'start_date']
    search_fields = ['branch__name', 'notes']
    ordering = ['-start_date']
    date_hierarchy = 'start_date'


@admin.register(InterBranchTransfer)
class InterBranchTransferAdmin(admin.ModelAdmin):
    list_display = ['from_branch', 'to_branch', 'transfer_type', 'amount', 'date', 'status', 'created_by', 'approved_by']
    list_filter = ['transfer_type', 'status', 'from_branch', 'to_branch', 'date']
    search_fields = ['description']
    ordering = ['-date', '-created_at']
    date_hierarchy = 'date'


# ==================== LEAVE MANAGEMENT ADMIN ====================

@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'annual_quota', 'is_paid', 'is_carry_forward', 'is_encashable', 'is_active']
    list_filter = ['is_paid', 'is_carry_forward', 'is_encashable', 'is_active', 'requires_approval']
    search_fields = ['name', 'code', 'description']
    ordering = ['name']


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'year', 'opening_balance', 'credited', 'used', 'encashed', 'available_balance']
    list_filter = ['year', 'leave_type']
    search_fields = ['employee__name', 'employee__email']
    ordering = ['-year', 'employee']
    
    def available_balance(self, obj):
        return obj.available_balance
    available_balance.short_description = 'Available'


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'start_date', 'end_date', 'total_days', 'status', 'approved_by', 'created_at']
    list_filter = ['status', 'leave_type', 'start_date']
    search_fields = ['employee__name', 'employee__email', 'reason']
    ordering = ['-start_date', '-created_at']
    date_hierarchy = 'start_date'


@admin.register(LeaveEncashment)
class LeaveEncashmentAdmin(admin.ModelAdmin):
    list_display = ['employee', 'leave_type', 'days_to_encash', 'total_amount', 'status', 'requested_date', 'approved_by']
    list_filter = ['status', 'leave_type', 'requested_date']
    search_fields = ['employee__name', 'employee__email']
    ordering = ['-requested_date']
    date_hierarchy = 'requested_date'


# ==================== TAX COMPLIANCE ADMIN ====================

@admin.register(TaxSlab)
class TaxSlabAdmin(admin.ModelAdmin):
    list_display = ['regime', 'financial_year', 'min_income', 'max_income', 'tax_rate', 'is_active']
    list_filter = ['regime', 'financial_year', 'is_active']
    search_fields = ['financial_year']
    ordering = ['financial_year', 'regime', 'min_income']


@admin.register(TaxDeclaration)
class TaxDeclarationAdmin(admin.ModelAdmin):
    list_display = ['employee', 'financial_year', 'regime', 'status', 'submitted_date', 'verified_by']
    list_filter = ['regime', 'status', 'financial_year']
    search_fields = ['employee__name', 'employee__email']
    ordering = ['-financial_year', 'employee']


@admin.register(Form16)
class Form16Admin(admin.ModelAdmin):
    list_display = ['employee', 'financial_year', 'gross_salary', 'taxable_income', 'tds_deducted', 'is_issued', 'generated_date']
    list_filter = ['financial_year', 'is_issued', 'generated_date']
    search_fields = ['employee__name', 'employee__email', 'employee_pan']
    ordering = ['-financial_year', 'employee']


# ==================== PERFORMANCE METRICS ADMIN ====================

@admin.register(PerformanceMetrics)
class PerformanceMetricsAdmin(admin.ModelAdmin):
    list_display = ['employee', 'month', 'year', 'jobs_completed', 'qc_pass_rate', 'net_incentive', 'is_top_performer', 'branch_rank']
    list_filter = ['year', 'month', 'is_top_performer']
    search_fields = ['employee__name', 'employee__email']
    ordering = ['-year', '-month', '-net_incentive']


# ==================== APPROVAL WORKFLOW ADMIN ====================

@admin.register(ApprovalWorkflow)
class ApprovalWorkflowAdmin(admin.ModelAdmin):
    list_display = ['name', 'model_type', 'threshold_amount', 'levels', 'branch', 'is_active', 'created_by']
    list_filter = ['model_type', 'is_active', 'branch', 'levels']
    search_fields = ['name']
    filter_horizontal = ['approvers']
    ordering = ['model_type', '-threshold_amount']


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'workflow', 'requested_by', 'amount', 'current_level', 'required_levels', 'status', 'created_at']
    list_filter = ['status', 'workflow__model_type', 'created_at']
    search_fields = ['description', 'requested_by__name']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    readonly_fields = ['content_type', 'object_id', 'created_at', 'updated_at', 'completed_at']


@admin.register(ApprovalAction)
class ApprovalActionAdmin(admin.ModelAdmin):
    list_display = ['request', 'approver', 'action', 'level', 'created_at']
    list_filter = ['action', 'level', 'created_at']
    search_fields = ['approver__name', 'comments']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at']
