from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExpenseViewSet, TransactionViewSet, VendorViewSet,
    EmployeeSalaryStructureViewSet, PayrollViewSet,
    PettyCashViewSet, RecurringExpenseViewSet,
    BranchBudgetViewSet, InterBranchTransferViewSet
)
from .report_views import ReportViewSet
from .enhanced_views import (
    LeaveTypeViewSet, LeaveBalanceViewSet, LeaveRequestViewSet, LeaveEncashmentViewSet,
    TaxSlabViewSet, TaxDeclarationViewSet, Form16ViewSet,
    PerformanceMetricsViewSet
)
from .views_approval import (
    ApprovalWorkflowViewSet, ApprovalRequestViewSet, ApprovalActionViewSet
)
from .views_gst import GSTReportViewSet

router = DefaultRouter()
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'vendors', VendorViewSet, basename='vendor')
router.register(r'salary-structures', EmployeeSalaryStructureViewSet, basename='salary-structure')
router.register(r'payroll', PayrollViewSet, basename='payroll')
router.register(r'petty-cash', PettyCashViewSet, basename='petty-cash')
router.register(r'recurring-expenses', RecurringExpenseViewSet, basename='recurring-expense')
router.register(r'branch-budgets', BranchBudgetViewSet, basename='branch-budget')
router.register(r'inter-branch-transfers', InterBranchTransferViewSet, basename='inter-branch-transfer')
router.register(r'reports', ReportViewSet, basename='report')

# GST Reports
router.register(r'gst-reports', GSTReportViewSet, basename='gst-report')

# Leave Management
router.register(r'leave-types', LeaveTypeViewSet, basename='leave-type')
router.register(r'leave-balances', LeaveBalanceViewSet, basename='leave-balance')
router.register(r'leave-requests', LeaveRequestViewSet, basename='leave-request')
router.register(r'leave-encashments', LeaveEncashmentViewSet, basename='leave-encashment')

# Tax Compliance
router.register(r'tax-slabs', TaxSlabViewSet, basename='tax-slab')
router.register(r'tax-declarations', TaxDeclarationViewSet, basename='tax-declaration')
router.register(r'form16', Form16ViewSet, basename='form16')

# Performance Metrics
router.register(r'performance-metrics', PerformanceMetricsViewSet, basename='performance-metrics')

# Approval Workflows
router.register(r'approval-workflows', ApprovalWorkflowViewSet, basename='approval-workflow')
router.register(r'approval-requests', ApprovalRequestViewSet, basename='approval-request')
router.register(r'approval-actions', ApprovalActionViewSet, basename='approval-action')

urlpatterns = [
    path('', include(router.urls)),
]
