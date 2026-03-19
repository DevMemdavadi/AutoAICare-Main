from rest_framework import viewsets, permissions, status, filters, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta
from decimal import Decimal

from .models import (
    Expense, Transaction, Vendor, EmployeeSalaryStructure,
    Payroll, PettyCash, RecurringExpense, BranchBudget, InterBranchTransfer
)
from .serializers import (
    ExpenseSerializer, TransactionSerializer, VendorSerializer,
    EmployeeSalaryStructureSerializer, PayrollSerializer, PayrollCreateSerializer,
    PettyCashSerializer, RecurringExpenseSerializer,
    FinancialSummarySerializer, ExpenseCategoryBreakdownSerializer,
    IncomeBreakdownSerializer, BranchFinancialSummarySerializer,
    BranchBudgetSerializer, InterBranchTransferSerializer
)
from billing.models import Invoice
from users.models import User
from .permissions import (
    CanViewBranchData, CanEditBranchData, CanManagePayroll,
    CanViewFinancialReports, filter_queryset_by_branch
)


class VendorViewSet(viewsets.ModelViewSet):
    """ViewSet for managing vendors."""
    
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'contact_person', 'email', 'phone']
    ordering_fields = ['name', 'created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Company filtering - vendors are company-specific
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            queryset = queryset.filter(company=company)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def expenses(self, request, pk=None):
        """Get all expenses for a vendor."""
        vendor = self.get_object()
        expenses = vendor.expenses.all().order_by('-date')
        
        # Apply date filters if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            expenses = expenses.filter(date__gte=start_date)
        if end_date:
            expenses = expenses.filter(date__lte=end_date)
        
        serializer = ExpenseSerializer(expenses, many=True)
        return Response(serializer.data)


class ExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing expenses - Enhanced with filtering."""
    
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'vendor_name']
    ordering_fields = ['date', 'amount', 'created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Branch filtering - consistent with multi-branch system
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(company=company)
            
            if user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(Q(branch=user.branch) | Q(branch__isnull=True))
            elif hasattr(user, 'branch') and user.branch:
                queryset = queryset.filter(branch=user.branch)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by branch query parameter (Supports multi-select)
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            if branch_id == 'null' or branch_id == 'all':
                queryset = queryset.filter(branch__isnull=True)
            elif ',' in str(branch_id):
                # Handle multi-select branches
                branch_ids = [bid.strip() for bid in branch_id.split(',') if bid.strip()]
                if 'null' in branch_ids:
                    queryset = queryset.filter(
                        Q(branch_id__in=[bid for bid in branch_ids if bid != 'null']) | 
                        Q(branch__isnull=True)
                    )
                else:
                    queryset = queryset.filter(branch_id__in=branch_ids)
            else:
                queryset = queryset.filter(branch_id=branch_id)
        
        # Filter by vendor
        vendor_id = self.request.query_params.get('vendor')
        if vendor_id:
            queryset = queryset.filter(vendor_id=vendor_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Filter by payment status
        payment_status = self.request.query_params.get('payment_status')
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        
        return queryset
    
    def perform_create(self, serializer):
        """Auto-populate recorded_by, branch, company, then create transaction"""
        user = self.request.user
        branch = serializer.validated_data.get('branch')
        
        # Security validation for branch consistency
        if not user.is_superuser:
            if user.role == 'branch_admin':
                # Branch admins can only create for their own branch
                if branch and branch != user.branch:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("You can only create expenses for your own branch.")
                branch = user.branch
            elif user.role == 'company_admin':
                # Company admins can create for any branch in their company
                if branch and branch.company != user.company:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("You can only create expenses for your company's branches.")
            elif hasattr(user, 'branch') and user.branch:
                # Other staff roles defaults to their branch
                branch = user.branch
        
        if not branch and hasattr(user, 'branch'):
            branch = user.branch
        
        # Determine company from branch or user
        company = None
        if branch and hasattr(branch, 'company'):
            company = branch.company
        elif hasattr(user, 'company') and user.company:
            company = user.company
        
        # Log creation for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Creating expense: {serializer.validated_data.get('title')} for branch: {branch.id if branch else 'NONE'} by user: {self.request.user.email}")
        
        # Save expense with recorded_by, branch, and company
        expense = serializer.save(
            recorded_by=self.request.user,
            branch=branch or serializer.validated_data.get('branch'),
            company=company
        )
        
        # Create corresponding transaction
        # IMPORTANT: Use the expense's date (not timezone.now()) so the transaction
        # appears correctly when filtering by the expense's date range.
        from django.utils import timezone as tz
        # Combine expense date with current time, then make timezone-aware
        expense_datetime = tz.make_aware(
            datetime.combine(expense.date, datetime.now().time())
        )
        
        Transaction.objects.create(
            company=expense.company,
            transaction_type='expense',
            source='expense',
            amount=expense.amount,
            date=expense_datetime,
            description=f"{expense.title} - {expense.get_category_display()}",
            reference_id=str(expense.id),
            expense=expense,
            branch=expense.branch,
            payment_method=expense.payment_method
        )
    
    @action(detail=False, methods=['get'])
    def category_breakdown(self, request):
        """Get expense breakdown by category."""
        queryset = self.get_queryset()
        
        breakdown = queryset.values('category').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        # Add category display names
        for item in breakdown:
            item['category_display'] = dict(Expense.CATEGORY_CHOICES).get(item['category'], item['category'])
        
        serializer = ExpenseCategoryBreakdownSerializer(breakdown, many=True)
        return Response(serializer.data)


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing transaction history."""
    
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'amount']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Branch filtering - consistent with multi-branch system
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(company=company)
            
            if user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(Q(branch=user.branch) | Q(branch__isnull=True))
            elif hasattr(user, 'branch') and user.branch:
                queryset = queryset.filter(branch=user.branch)
        
        # Filter by type
        transaction_type = self.request.query_params.get('type')
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        
        # Filter by source
        source = self.request.query_params.get('source')
        if source:
            queryset = queryset.filter(source=source)
        
        # Filter by branch query parameter (Supports multi-select)
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            if branch_id == 'null' or branch_id == 'all':
                queryset = queryset.filter(branch__isnull=True)
            elif ',' in str(branch_id):
                # Handle multi-select branches
                branch_ids = [bid.strip() for bid in branch_id.split(',') if bid.strip()]
                if 'null' in branch_ids:
                    queryset = queryset.filter(
                        Q(branch_id__in=[bid for bid in branch_ids if bid != 'null']) | 
                        Q(branch__isnull=True)
                    )
                else:
                    queryset = queryset.filter(branch_id__in=branch_ids)
            else:
                queryset = queryset.filter(branch_id=branch_id)
        
        # Date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__date__lte=end_date)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get comprehensive financial summary for the current branch."""
        # Get query params
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        branch_id = request.query_params.get('branch')
        
        # Base filter (Income/Expense/Net Profit) is handled by get_queryset()
        queryset = self.get_queryset()
        
        # Consolidate ledger aggregations into a single query using conditional aggregation
        ledger_metrics = queryset.aggregate(
            total_income=Sum('amount', filter=Q(transaction_type='income')),
            total_expense=Sum('amount', filter=Q(transaction_type='expense')),
            cash_income=Sum('amount', filter=Q(transaction_type='income', payment_method='cash')),
            cash_expense=Sum('amount', filter=Q(transaction_type='expense', payment_method='cash'))
        )
        
        total_income = ledger_metrics['total_income'] or 0
        total_expense = ledger_metrics['total_expense'] or 0
        cash_income = ledger_metrics['cash_income'] or 0
        cash_expense = ledger_metrics['cash_expense'] or 0
        
        online_income = total_income - cash_income
        online_expense = total_expense - cash_expense
        net_profit = total_income - total_expense
        
        # --- Receivables (Unpaid Invoices) ---
        receivables_filter = Q(status__in=['pending', 'partial'])
        
        # Apply branch/company filter to receivables
        if request.user.is_superuser:
            if branch_id:
                # Handle comma-separated list for multi-branch
                if ',' in str(branch_id):
                    receivables_filter &= Q(branch_id__in=branch_id.split(','))
                else:
                    receivables_filter &= Q(branch_id=branch_id)
        elif request.user.role == 'company_admin' and request.user.company:
            # Company admin sees all branches in their company by default
            receivables_filter &= Q(company=request.user.company)
            # But they can filter by branch if provided
            if branch_id:
                if ',' in str(branch_id):
                    receivables_filter &= Q(branch_id__in=branch_id.split(','))
                else:
                    receivables_filter &= Q(branch_id=branch_id)
        # Other users see only their branch
        elif hasattr(request.user, 'branch') and request.user.branch:
            receivables_filter &= (Q(branch=request.user.branch) | Q(branch__isnull=True))
        
        # Apply date filter to receivables (using issued_date)
        if start_date:
            receivables_filter &= Q(issued_date__gte=start_date)
        if end_date:
            receivables_filter &= Q(issued_date__lte=end_date)
            
        receivables_qs = Invoice.objects.filter(receivables_filter)
        total_inv_amount = receivables_qs.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        
        # Subtract amount already paid for these invoices
        from payments.models import Payment
        total_inv_paid = Payment.objects.filter(
            invoice__in=receivables_qs, 
            payment_status='completed'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        receivables = total_inv_amount - total_inv_paid
        
        # --- Payables (Pending Expenses) ---
        payables_filter = Q(payment_status__in=['pending', 'partial'])
        
        # Branch/company filter
        if request.user.is_superuser:
            if branch_id:
                if ',' in str(branch_id):
                    payables_filter &= Q(branch_id__in=branch_id.split(','))
                else:
                    payables_filter &= Q(branch_id=branch_id)
        elif request.user.role == 'company_admin' and request.user.company:
            # Company admin sees all branches in their company
            payables_filter &= Q(company=request.user.company)
            # Filter by branch if provided
            if branch_id:
                if ',' in str(branch_id):
                    payables_filter &= Q(branch_id__in=branch_id.split(','))
                else:
                    payables_filter &= Q(branch_id=branch_id)
        # Other users see only their branch
        elif hasattr(request.user, 'branch') and request.user.branch:
            payables_filter &= (Q(branch=request.user.branch) | Q(branch__isnull=True))
                
        # Date filter
        if start_date:
            payables_filter &= Q(date__gte=start_date)
        if end_date:
            payables_filter &= Q(date__lte=end_date)
            
        pending_expenses_qs = Expense.objects.filter(payables_filter)
        
        # Consolidate expense aggregations
        expense_metrics = pending_expenses_qs.aggregate(
            total_amount=Sum('amount'),
            partial_paid=Sum('partial_amount', filter=Q(payment_status='partial'))
        )
        total_exp_amount = expense_metrics['total_amount'] or 0
        total_exp_paid = expense_metrics['partial_paid'] or 0
        
        pending_expenses = total_exp_amount - total_exp_paid
        
        # --- Pending Salaries ---
        salaries_filter = Q(status__in=['pending', 'approved'])
        
        # Branch/company filter (via employee__branch)
        if request.user.is_superuser:
            if branch_id:
                if ',' in str(branch_id):
                    salaries_filter &= Q(employee__branch_id__in=branch_id.split(','))
                else:
                    salaries_filter &= Q(employee__branch_id=branch_id)
        else:
            # Company admin sees all branches in their company
            if request.user.role == 'company_admin' and request.user.company:
                salaries_filter &= Q(employee__branch__company=request.user.company)
            # Other users see only their branch
            elif request.user.branch_id:
                salaries_filter &= (Q(employee__branch_id=request.user.branch_id) | Q(employee__branch__isnull=True))
        
        # Date filter (using created_at)
        if start_date:
            salaries_filter &= Q(created_at__date__gte=start_date)
        if end_date:
            salaries_filter &= Q(created_at__date__lte=end_date)
            
        pending_salaries = Payroll.objects.filter(salaries_filter).aggregate(Sum('net_salary'))['net_salary__sum'] or 0
        
        payables = pending_expenses + pending_salaries
        
        summary_data = {
            'total_income': total_income,
            'total_expense': total_expense,
            'net_profit': net_profit,
            'receivables': receivables,
            'payables': payables,
            'pending_salaries': pending_salaries,
            'cash_income': cash_income,
            'online_income': online_income,
            'cash_expense': cash_expense,
            'online_expense': online_expense
        }

        # Calculate comparison if requested
        compare = request.query_params.get('compare', 'false').lower() == 'true'
        if compare and start_date and end_date:
            from datetime import datetime, timedelta
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                period_length = (end - start).days + 1
                
                prev_end = start - timedelta(days=1)
                prev_start = prev_end - timedelta(days=period_length - 1)
                
                # Previous period queryset
                prev_queryset = Transaction.objects.filter(
                    date__date__gte=prev_start,
                    date__date__lte=prev_end
                )
                
                # Apply same branch/company filters as get_queryset()
                user = request.user
                if not user.is_superuser:
                    if user.role == 'company_admin' and user.company:
                        prev_queryset = prev_queryset.filter(company=user.company)
                    elif user.role == 'branch_admin' and user.branch:
                        prev_queryset = prev_queryset.filter(Q(branch=user.branch) | Q(branch__isnull=True))
                    elif hasattr(user, 'branch') and user.branch:
                        prev_queryset = prev_queryset.filter(branch=user.branch)
                
                # Re-apply multi-branch filter if present
                if branch_id:
                    if branch_id == 'null' or branch_id == 'all':
                        prev_queryset = prev_queryset.filter(branch__isnull=True)
                    elif ',' in str(branch_id):
                        branch_ids = [bid.strip() for bid in branch_id.split(',') if bid.strip()]
                        if 'null' in branch_ids:
                            prev_queryset = prev_queryset.filter(Q(branch_id__in=[bid for bid in branch_ids if bid != 'null']) | Q(branch__isnull=True))
                        else:
                            prev_queryset = prev_queryset.filter(branch_id__in=branch_ids)
                    else:
                        prev_queryset = prev_queryset.filter(branch_id=branch_id)

                prev_metrics = prev_queryset.aggregate(
                    income=Sum('amount', filter=Q(transaction_type='income')),
                    expense=Sum('amount', filter=Q(transaction_type='expense'))
                )
                
                prev_income = prev_metrics['income'] or 0
                prev_expense = prev_metrics['expense'] or 0
                prev_profit = prev_income - prev_expense
                
                summary_data.update({
                    'prev_income': prev_income,
                    'prev_expense': prev_expense,
                    'prev_profit': prev_profit,
                    'income_change': float(((total_income - prev_income) / prev_income * 100)) if prev_income > 0 else 0,
                    'expense_change': float(((total_expense - prev_expense) / prev_expense * 100)) if prev_expense > 0 else 0,
                    'profit_change': float(((net_profit - prev_profit) / abs(prev_profit) * 100)) if prev_profit != 0 else 0
                })
            except Exception as e:
                # Log error but don't fail the primary request
                print(f"Comparison error: {str(e)}")
                pass
        
        serializer = FinancialSummarySerializer(summary_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def income_breakdown(self, request):
        """Get income breakdown by source."""
        queryset = self.get_queryset().filter(transaction_type='income')
        
        breakdown = queryset.values('source').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        serializer = IncomeBreakdownSerializer(breakdown, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def monthly_trend(self, request):
        """Get monthly income/expense trend."""
        queryset = self.get_queryset()
        
        # Get last 12 months
        months = queryset.annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            income=Sum('amount', filter=Q(transaction_type='income')),
            expense=Sum('amount', filter=Q(transaction_type='expense'))
        ).annotate(
            profit=F('income') - F('expense')
        ).order_by('month')
        
        return Response(months)
    
    @action(detail=False, methods=['get'])
    def branch_summary(self, request):
        """Get branch-wise financial summary (for super admin or company admin)."""
        if request.user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super admin or company admin can access branch summary'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from branches.models import Branch
        if request.user.role == 'super_admin':
            branches = Branch.objects.filter(is_active=True)
        else:
            branches = Branch.objects.filter(is_active=True, company=request.user.company)
        
        summary = []
        for branch in branches:
            branch_transactions = self.get_queryset().filter(branch=branch)
            
            income = branch_transactions.filter(transaction_type='income').aggregate(Sum('amount'))['amount__sum'] or 0
            expense = branch_transactions.filter(transaction_type='expense').aggregate(Sum('amount'))['amount__sum'] or 0
            
            summary.append({
                'branch_id': branch.id,
                'branch_name': branch.name,
                'total_income': income,
                'total_expense': expense,
                'net_profit': income - expense
            })
            
        # Add Global/General entry
        global_transactions = self.get_queryset().filter(branch__isnull=True)
        global_income = global_transactions.filter(transaction_type='income').aggregate(Sum('amount'))['amount__sum'] or 0
        global_expense = global_transactions.filter(transaction_type='expense').aggregate(Sum('amount'))['amount__sum'] or 0
        
        if global_income > 0 or global_expense > 0:
            summary.append({
                'branch_id': 'all',
                'branch_name': 'Global / General',
                'total_income': global_income,
                'total_expense': global_expense,
                'net_profit': global_income - global_expense
            })
        
        serializer = BranchFinancialSummarySerializer(summary, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def profit_loss_statement(self, request):
        """Generate comprehensive Profit & Loss Statement."""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        compare = request.query_params.get('compare', 'false').lower() == 'true'
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Current period data
        queryset = self.get_queryset().filter(date__date__gte=start_date, date__date__lte=end_date)
        
        # Income breakdown
        income_data = queryset.filter(transaction_type='income').values('source').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        total_income = sum(item['total'] for item in income_data)
        
        # Expense breakdown by category
        expense_data = Expense.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        )
        
        # Apply branch/company filter
        if not request.user.is_superuser:
            if request.user.role == 'company_admin' and request.user.company:
                # Use direct company FK (captures expenses with branch=None too)
                expense_data = expense_data.filter(company=request.user.company)
            elif hasattr(request.user, 'branch') and request.user.branch:
                expense_data = expense_data.filter(branch=request.user.branch)
        else:
            # super_admin — optional branch sub-filter
            branch_id = request.query_params.get('branch')
            if branch_id:
                expense_data = expense_data.filter(branch_id=branch_id)
        
        expense_breakdown = expense_data.values('category').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        # Add category display names
        for item in expense_breakdown:
            item['category_display'] = dict(Expense.CATEGORY_CHOICES).get(item['category'], item['category'])
        
        total_expenses = sum(item['total'] for item in expense_breakdown)
        gross_profit = total_income - total_expenses
        
        # Operating expenses (specific categories)
        operating_categories = ['salary', 'rent', 'utilities', 'marketing', 'software']
        operating_expenses = sum(
            item['total'] for item in expense_breakdown 
            if item['category'] in operating_categories
        )
        
        # COGS (Cost of Goods Sold) - inventory and direct costs
        cogs_categories = ['inventory', 'supplies']
        cogs = sum(
            item['total'] for item in expense_breakdown 
            if item['category'] in cogs_categories
        )
        
        net_profit = gross_profit
        profit_margin = (net_profit / total_income * 100) if total_income > 0 else 0
        
        result = {
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'revenue': {
                'breakdown': list(income_data),
                'total': float(total_income)
            },
            'cost_of_goods_sold': {
                'total': float(cogs),
                'breakdown': [item for item in expense_breakdown if item['category'] in cogs_categories]
            },
            'gross_profit': float(gross_profit),
            'operating_expenses': {
                'total': float(operating_expenses),
                'breakdown': [item for item in expense_breakdown if item['category'] in operating_categories]
            },
            'other_expenses': {
                'total': float(total_expenses - operating_expenses - cogs),
                'breakdown': [item for item in expense_breakdown if item['category'] not in operating_categories + cogs_categories]
            },
            'net_profit': float(net_profit),
            'profit_margin_percent': round(profit_margin, 2),
            'total_expenses': float(total_expenses)
        }
        
        # Comparison with previous period
        if compare:
            from datetime import datetime, timedelta
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            period_length = (end - start).days
            
            prev_end = start - timedelta(days=1)
            prev_start = prev_end - timedelta(days=period_length)
            
            prev_queryset = self.get_queryset().filter(
                date__date__gte=prev_start,
                date__date__lte=prev_end
            )
            
            prev_income = prev_queryset.filter(transaction_type='income').aggregate(
                total=Sum('amount')
            )['total'] or 0
            
            prev_expense_data = Expense.objects.filter(
                date__gte=prev_start,
                date__lte=prev_end
            )
            
            if not request.user.is_superuser:
                if request.user.role == 'company_admin' and request.user.company:
                    # Use direct company FK (captures expenses with branch=None too)
                    prev_expense_data = prev_expense_data.filter(company=request.user.company)
                elif hasattr(request.user, 'branch') and request.user.branch:
                    prev_expense_data = prev_expense_data.filter(branch=request.user.branch)
            
            prev_expenses = prev_expense_data.aggregate(total=Sum('amount'))['total'] or 0
            prev_profit = prev_income - prev_expenses
            
            # Calculate changes
            income_change = ((total_income - prev_income) / prev_income * 100) if prev_income > 0 else 0
            expense_change = ((total_expenses - prev_expenses) / prev_expenses * 100) if prev_expenses > 0 else 0
            profit_change = ((net_profit - prev_profit) / abs(prev_profit) * 100) if prev_profit != 0 else 0
            
            result['comparison'] = {
                'previous_period': {
                    'start_date': str(prev_start),
                    'end_date': str(prev_end),
                    'total_income': float(prev_income),
                    'total_expenses': float(prev_expenses),
                    'net_profit': float(prev_profit)
                },
                'changes': {
                    'income_change_percent': round(income_change, 2),
                    'expense_change_percent': round(expense_change, 2),
                    'profit_change_percent': round(profit_change, 2)
                }
            }
        
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def cash_flow_report(self, request):
        """Generate Cash Flow Report."""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(date__date__gte=start_date, date__date__lte=end_date)
        
        # Operating Activities
        operating_income = queryset.filter(
            transaction_type='income',
            source='invoice'  # Invoice payments are the main income source
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        operating_expenses = queryset.filter(
            transaction_type='expense',
            source__in=['expense', 'salary', 'petty_cash']
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        net_operating_cash = operating_income - operating_expenses
        
        # Investing Activities (equipment, assets)
        investing_expenses = Expense.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
            category__in=['equipment', 'software']
        )
        
        if not request.user.is_superuser:
            if request.user.role == 'company_admin' and request.user.company:
                # Use direct company FK (captures expenses with branch=None too)
                investing_expenses = investing_expenses.filter(company=request.user.company)
            elif hasattr(request.user, 'branch') and request.user.branch:
                investing_expenses = investing_expenses.filter(branch=request.user.branch)
        
        investing_outflow = investing_expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        # Financing Activities (loans, capital)
        # This would need additional models for loans/capital - placeholder for now
        financing_inflow = 0
        financing_outflow = 0
        
        net_financing_cash = financing_inflow - financing_outflow
        
        # Net change in cash
        net_cash_change = net_operating_cash - investing_outflow + net_financing_cash
        
        # Get opening balance (you might want to track this separately)
        # For now, calculate from all previous transactions
        opening_balance_data = Transaction.objects.filter(
            date__date__lt=start_date
        )
        
        if not request.user.is_superuser:
            if request.user.role == 'company_admin' and request.user.company:
                # Transactions have a direct company FK — use it
                opening_balance_data = opening_balance_data.filter(company=request.user.company)
            elif hasattr(request.user, 'branch') and request.user.branch:
                opening_balance_data = opening_balance_data.filter(branch=request.user.branch)
        
        opening_income = opening_balance_data.filter(transaction_type='income').aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        opening_expense = opening_balance_data.filter(transaction_type='expense').aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        opening_balance = opening_income - opening_expense
        closing_balance = opening_balance + net_cash_change
        
        return Response({
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'opening_balance': float(opening_balance),
            'operating_activities': {
                'cash_inflow': float(operating_income),
                'cash_outflow': float(operating_expenses),
                'net_operating_cash': float(net_operating_cash)
            },
            'investing_activities': {
                'cash_outflow': float(investing_outflow),
                'net_investing_cash': float(-investing_outflow)
            },
            'financing_activities': {
                'cash_inflow': float(financing_inflow),
                'cash_outflow': float(financing_outflow),
                'net_financing_cash': float(net_financing_cash)
            },
            'net_cash_change': float(net_cash_change),
            'closing_balance': float(closing_balance)
        })
    
    @action(detail=False, methods=['get'])
    def tax_summary(self, request):
        """Generate Tax Summary Report (GST/Tax breakdown)."""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all invoices in period
        invoices = Invoice.objects.filter(
            issued_date__gte=start_date,
            issued_date__lte=end_date
        )
        
        if not request.user.is_superuser:
            if request.user.role == 'company_admin' and request.user.company:
                invoices = invoices.filter(branch__company=request.user.company)
            elif hasattr(request.user, 'branch'):
                invoices = invoices.filter(branch=request.user.branch)
        elif request.user.is_superuser:
            branch_id = request.query_params.get('branch')
            if branch_id:
                invoices = invoices.filter(branch_id=branch_id)
        
        # Tax collected (output tax)
        total_sales = invoices.aggregate(total=Sum('subtotal'))['total'] or 0
        total_tax_collected = invoices.aggregate(total=Sum('tax_amount'))['total'] or 0
        
        # Tax paid on purchases (input tax) - from expenses with GST
        # This would require a tax_amount field on Expense model
        # For now, estimate based on typical GST rate
        expenses = Expense.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        )
        
        if not request.user.is_superuser:
            if request.user.role == 'company_admin' and request.user.company:
                expenses = expenses.filter(branch__company=request.user.company)
            elif hasattr(request.user, 'branch'):
                expenses = expenses.filter(branch=request.user.branch)
        
        total_purchases = expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        # Assuming 18% GST on purchases (you should track this properly)
        estimated_input_tax = total_purchases * Decimal('0.18') / Decimal('1.18')
        
        # Net tax liability
        net_tax_payable = total_tax_collected - estimated_input_tax
        
        # Breakdown by tax rate
        tax_breakdown = invoices.values('tax_rate').annotate(
            total_sales=Sum('subtotal'),
            total_tax=Sum('tax_amount'),
            count=Count('id')
        ).order_by('-tax_rate')
        
        return Response({
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'output_tax': {
                'total_sales': float(total_sales),
                'total_tax_collected': float(total_tax_collected),
                'breakdown_by_rate': list(tax_breakdown)
            },
            'input_tax': {
                'total_purchases': float(total_purchases),
                'estimated_input_tax': float(estimated_input_tax)
            },
            'net_tax_payable': float(net_tax_payable),
            'note': 'Input tax is estimated. Please verify with actual GST invoices.'
        })


class EmployeeSalaryStructureViewSet(viewsets.ModelViewSet):
    """ViewSet for managing employee salary structures."""
    
    queryset = EmployeeSalaryStructure.objects.all()
    serializer_class = EmployeeSalaryStructureSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset().select_related('employee')
        user = self.request.user
        
        # Branch filtering - consistent with multi-branch system
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(employee__company=company)
            
            if user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(employee__branch=user.branch)
            elif hasattr(user, 'branch') and user.branch:
                queryset = queryset.filter(employee__branch=user.branch)
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset


class PayrollViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payroll."""
    
    queryset = Payroll.objects.all()
    serializer_class = PayrollSerializer
    permission_classes = [permissions.IsAuthenticated, CanManagePayroll]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['year', 'month', 'net_salary']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Branch filtering - consistent with multi-branch system
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(employee__company=company)
            
            if user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(employee__branch=user.branch)
            elif hasattr(user, 'branch') and user.branch:
                queryset = queryset.filter(employee__branch=user.branch)
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by month/year
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        
        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def generate_bulk(self, request):
        """Generate payroll for multiple employees for a given month with integrated leave, performance, and tax calculations."""
        from .services import LeaveService, PerformanceService, TaxService
        
        serializer = PayrollCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        month = serializer.validated_data['month']
        year = serializer.validated_data['year']
        employee_ids = serializer.validated_data.get('employee_ids', [])
        
        # Get employees with salary structures
        if employee_ids:
            salary_structures = EmployeeSalaryStructure.objects.filter(
                employee_id__in=employee_ids,
                is_active=True
            )
        else:
            salary_structures = EmployeeSalaryStructure.objects.filter(is_active=True)
        
        # Apply company/branch scoping for non-superusers
        if not request.user.is_superuser:
            if request.user.role == 'company_admin' and request.user.company:
                salary_structures = salary_structures.filter(employee__company=request.user.company)
            elif request.user.role in ['branch_admin', 'accountant'] and request.user.branch:
                salary_structures = salary_structures.filter(employee__branch=request.user.branch)
        
        created_payrolls = []
        errors = []
        
        for structure in salary_structures:
            try:
                # Check if payroll already exists
                existing = Payroll.objects.filter(
                    employee=structure.employee,
                    month=month,
                    year=year
                ).first()
                
                if existing:
                    errors.append(f"Payroll for {structure.employee.name} already exists for {month}/{year}")
                    continue
                
                # Step 1: Calculate base salary components
                base_salary = structure.base_salary
                hra = structure.hra
                transport_allowance = structure.transport_allowance
                other_allowances = structure.other_allowances
                
                # Step 2: Calculate leave deductions
                leave_deduction_data = LeaveService.calculate_leave_deduction(
                    employee=structure.employee,
                    month=month,
                    year=year,
                    salary_structure=structure
                )
                unpaid_leave_days = leave_deduction_data.get('unpaid_days', 0)
                leave_deduction_amount = Decimal(str(leave_deduction_data.get('deduction_amount', 0)))
                
                # Step 2.5: Fetch attendance data for the month
                try:
                    from attendance.models import MonthlyAttendanceSummary
                    attendance_summary = MonthlyAttendanceSummary.objects.get(
                        employee=structure.employee,
                        month=month,
                        year=year
                    )
                    days_present = attendance_summary.days_present
                    days_absent = attendance_summary.days_absent
                    days_leave = attendance_summary.days_on_leave
                    days_half_day = attendance_summary.days_half_day
                    total_working_days = attendance_summary.total_working_days
                    overtime_hours = float(attendance_summary.total_overtime_hours)
                    late_arrivals = attendance_summary.late_arrivals_count
                    
                    # Calculate overtime amount
                    overtime_amount = Decimal(str(overtime_hours)) * structure.overtime_hourly_rate
                    
                    # Calculate attendance-based salary adjustment
                    # If attendance data exists, adjust salary based on actual working days
                    if total_working_days > 0:
                        attendance_percentage = (days_present + (days_half_day * 0.5) + days_leave) / total_working_days
                        # Note: Leave days are already handled by leave_deduction_amount
                        # Here we only adjust for absences beyond approved leaves
                        absence_deduction = Decimal('0')
                        if days_absent > 0:
                            daily_rate = base_salary / Decimal('30')  # Assuming 30 days per month
                            absence_deduction = daily_rate * Decimal(str(days_absent))
                    else:
                        attendance_percentage = 1.0
                        absence_deduction = Decimal('0')
                    
                    attendance_integrated = True
                    
                except MonthlyAttendanceSummary.DoesNotExist:
                    # No attendance data available, use defaults
                    print(f"No attendance data for {structure.employee.name} for {month}/{year}")
                    days_present = 0
                    days_absent = 0
                    days_leave = 0
                    days_half_day = 0
                    total_working_days = 0
                    overtime_hours = 0
                    overtime_amount = Decimal('0')
                    late_arrivals = 0
                    absence_deduction = Decimal('0')
                    attendance_integrated = False
                except Exception as attendance_error:
                    print(f"Attendance fetch error for {structure.employee.name}: {str(attendance_error)}")
                    days_present = 0
                    days_absent = 0
                    days_leave = 0
                    days_half_day = 0
                    total_working_days = 0
                    overtime_hours = 0
                    overtime_amount = Decimal('0')
                    late_arrivals = 0
                    absence_deduction = Decimal('0')
                    attendance_integrated = False
                
                # Step 3: Get performance metrics and incentives
                try:
                    performance_data = PerformanceService.calculate_monthly_metrics(
                        employee=structure.employee,
                        month=month,
                        year=year
                    )
                    incentive_amount = Decimal(str(performance_data.net_incentive))
                except Exception as perf_error:
                    # If performance calculation fails, log and continue with 0 incentive
                    print(f"Performance calculation failed for {structure.employee.name}: {str(perf_error)}")
                    incentive_amount = Decimal('0')
                
                # Step 4: Calculate gross salary
                gross_before_deductions = base_salary + hra + transport_allowance + other_allowances + incentive_amount
                gross_after_leave_deduction = gross_before_deductions - leave_deduction_amount
                
                # Step 5: Calculate statutory deductions (PF, ESI, Professional Tax)
                pf_deduction = structure.pf_deduction
                esi_deduction = structure.esi_deduction
                professional_tax = Decimal('0')  # Assuming no professional tax field in structure
                
                # Step 6: Calculate TDS on gross salary
                try:
                    tds_amount = TaxService.calculate_monthly_tds(
                        employee=structure.employee,
                        month=month,
                        year=year
                    )
                    tds_amount = Decimal(str(tds_amount))
                except Exception as tax_error:
                    # If TDS calculation fails, log and continue with 0 TDS
                    print(f"TDS calculation failed for {structure.employee.name}: {str(tax_error)}")
                    tds_amount = Decimal('0')
                
                # Step 7: Calculate leave encashment (if any)
                leave_encashment_amount = Decimal('0')  # This comes from approved encashment requests
                
                # Step 8: Calculate total deductions and net salary
                total_deductions = (
                    pf_deduction + 
                    esi_deduction + 
                    professional_tax + 
                    tds_amount + 
                    leave_deduction_amount +
                    absence_deduction  # Add absence deduction
                )
                
                # Add overtime to gross salary
                gross_before_deductions = base_salary + hra + transport_allowance + other_allowances + incentive_amount + overtime_amount
                net_salary = gross_before_deductions - total_deductions + leave_encashment_amount
                
                # Step 9: Create payroll record with all integrated data
                payroll = Payroll.objects.create(
                    employee=structure.employee,
                    salary_structure=structure,
                    month=month,
                    year=year,
                    # Base components
                    base_salary=base_salary,
                    allowances=hra + transport_allowance + other_allowances,
                    # Attendance integration
                    days_present=days_present,
                    days_absent=days_absent,
                    days_leave=days_leave,
                    overtime_hours=Decimal(str(overtime_hours)),
                    overtime_amount=overtime_amount,
                    # Leave integration
                    unpaid_leave_days=unpaid_leave_days,
                    leave_deduction_amount=leave_deduction_amount,
                    leave_encashment_amount=leave_encashment_amount,
                    # Performance integration
                    incentives=incentive_amount,
                    # Tax integration
                    tds_amount=tds_amount,
                    # Totals
                    deductions=total_deductions,
                    gross_salary=gross_before_deductions,
                    net_salary=net_salary,
                    # Metadata
                    generated_by=request.user,
                    notes=f"Auto-generated | Attendance: {days_present}P/{days_absent}A/{days_leave}L | OT: {overtime_hours}h | Leave: {unpaid_leave_days}d | Incentive: ₹{incentive_amount} | TDS: ₹{tds_amount} | {'✓ Attendance Integrated' if attendance_integrated else '⚠ No Attendance Data'}"
                )
                created_payrolls.append(payroll)
                
            except Exception as e:
                errors.append(f"Error processing {structure.employee.name}: {str(e)}")
                print(f"Payroll generation error for {structure.employee.name}: {str(e)}")
                import traceback
                traceback.print_exc()
        
        return Response({
            'created': PayrollSerializer(created_payrolls, many=True).data,
            'errors': errors,
            'message': f'Generated {len(created_payrolls)} payroll records',
            'summary': {
                'total_processed': len(salary_structures),
                'successful': len(created_payrolls),
                'failed': len(errors)
            }
        })

    def _compute_payroll_values(self, structure, month, year, request_user):
        """Helper: compute all payroll fields from a salary structure for a given month/year."""
        from .services import LeaveService, PerformanceService, TaxService

        base_salary = structure.base_salary
        hra = structure.hra
        transport_allowance = structure.transport_allowance
        other_allowances = structure.other_allowances

        # Leave deductions
        leave_deduction_data = LeaveService.calculate_leave_deduction(
            employee=structure.employee, month=month, year=year, salary_structure=structure
        )
        unpaid_leave_days = leave_deduction_data.get('unpaid_days', 0)
        leave_deduction_amount = Decimal(str(leave_deduction_data.get('deduction_amount', 0)))

        # Attendance
        try:
            from attendance.models import MonthlyAttendanceSummary
            attendance_summary = MonthlyAttendanceSummary.objects.get(
                employee=structure.employee, month=month, year=year
            )
            days_present = attendance_summary.days_present
            days_absent = attendance_summary.days_absent
            days_leave = attendance_summary.days_on_leave
            days_half_day = attendance_summary.days_half_day
            total_working_days = attendance_summary.total_working_days
            overtime_hours = float(attendance_summary.total_overtime_hours)
            late_arrivals = attendance_summary.late_arrivals_count
            overtime_amount = Decimal(str(overtime_hours)) * structure.overtime_hourly_rate
            if total_working_days > 0:
                absence_deduction = (base_salary / Decimal('30')) * Decimal(str(days_absent)) if days_absent > 0 else Decimal('0')
            else:
                absence_deduction = Decimal('0')
            attendance_integrated = True
        except Exception:
            days_present = days_absent = days_leave = days_half_day = total_working_days = 0
            overtime_hours = 0
            overtime_amount = Decimal('0')
            late_arrivals = 0
            absence_deduction = Decimal('0')
            attendance_integrated = False

        # Performance incentives
        try:
            performance_data = PerformanceService.calculate_monthly_metrics(
                employee=structure.employee, month=month, year=year
            )
            incentive_amount = Decimal(str(performance_data.net_incentive))
        except Exception:
            incentive_amount = Decimal('0')

        # TDS
        try:
            tds_amount = Decimal(str(TaxService.calculate_monthly_tds(
                employee=structure.employee, month=month, year=year
            )))
        except Exception:
            tds_amount = Decimal('0')

        pf_deduction = structure.pf_deduction
        esi_deduction = structure.esi_deduction
        leave_encashment_amount = Decimal('0')

        gross_salary = base_salary + hra + transport_allowance + other_allowances + incentive_amount + overtime_amount
        total_deductions = pf_deduction + esi_deduction + tds_amount + leave_deduction_amount + absence_deduction
        net_salary = gross_salary - total_deductions + leave_encashment_amount

        return {
            'base_salary': base_salary,
            'allowances': hra + transport_allowance + other_allowances,
            'days_present': days_present,
            'days_absent': days_absent,
            'days_leave': days_leave,
            'overtime_hours': Decimal(str(overtime_hours)),
            'overtime_amount': overtime_amount,
            'unpaid_leave_days': unpaid_leave_days,
            'leave_deduction_amount': leave_deduction_amount,
            'leave_encashment_amount': leave_encashment_amount,
            'incentives': incentive_amount,
            'tds_amount': tds_amount,
            'deductions': total_deductions,
            'gross_salary': gross_salary,
            'net_salary': net_salary,
            'notes': (
                f"Recalculated | Attendance: {days_present}P/{days_absent}A/{days_leave}L | "
                f"OT: {overtime_hours}h | Leave: {unpaid_leave_days}d | "
                f"Incentive: ₹{incentive_amount} | TDS: ₹{tds_amount} | "
                f"{'✓ Attendance Integrated' if attendance_integrated else '⚠ No Attendance Data'}"
            ),
        }

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        """Recalculate a single payroll record from the current salary structure."""
        payroll = self.get_object()

        if payroll.status == 'paid':
            return Response(
                {'error': 'Cannot recalculate a payroll that has already been paid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        structure = payroll.salary_structure
        if not structure:
            # Try to find the active structure for this employee
            structure = EmployeeSalaryStructure.objects.filter(
                employee=payroll.employee, is_active=True
            ).first()
            if not structure:
                return Response(
                    {'error': 'No active salary structure found for this employee.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        values = self._compute_payroll_values(structure, payroll.month, payroll.year, request.user)
        for field, val in values.items():
            setattr(payroll, field, val)
        payroll.salary_structure = structure
        payroll.generated_by = request.user
        payroll.save()

        return Response({
            'payroll': PayrollSerializer(payroll).data,
            'message': f'Payroll for {payroll.employee.name} recalculated successfully.'
        })

    @action(detail=False, methods=['post'])
    def recalculate_bulk(self, request):
        """Recalculate all non-paid payroll records for a given month/year from current salary structures."""
        month = request.data.get('month')
        year = request.data.get('year')

        if not month or not year:
            return Response(
                {'error': 'month and year are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            month = int(month)
            year = int(year)
        except (ValueError, TypeError):
            return Response({'error': 'month and year must be integers.'}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch payrolls to recalculate (only non-paid)
        payrolls_qs = Payroll.objects.filter(month=month, year=year).exclude(status='paid')

        # Apply company/branch scoping
        if not request.user.is_superuser:
            if request.user.role == 'company_admin' and request.user.company:
                payrolls_qs = payrolls_qs.filter(employee__company=request.user.company)
            elif request.user.role in ['branch_admin', 'accountant'] and request.user.branch:
                payrolls_qs = payrolls_qs.filter(employee__branch=request.user.branch)

        updated = []
        errors = []

        for payroll in payrolls_qs:
            try:
                structure = payroll.salary_structure
                if not structure:
                    structure = EmployeeSalaryStructure.objects.filter(
                        employee=payroll.employee, is_active=True
                    ).first()
                if not structure:
                    errors.append(f'No active salary structure for {payroll.employee.name}')
                    continue

                values = self._compute_payroll_values(structure, month, year, request.user)
                for field, val in values.items():
                    setattr(payroll, field, val)
                payroll.salary_structure = structure
                payroll.generated_by = request.user
                payroll.save()
                updated.append(payroll)
            except Exception as e:
                errors.append(f'Error recalculating {payroll.employee.name}: {str(e)}')

        return Response({
            'updated': PayrollSerializer(updated, many=True).data,
            'errors': errors,
            'message': f'Recalculated {len(updated)} payroll records.',
            'summary': {
                'total_processed': payrolls_qs.count(),
                'successful': len(updated),
                'failed': len(errors)
            }
        })


    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark a payroll as paid, with optional salary adjustment."""
        payroll = self.get_object()

        if payroll.status == 'paid':
            return Response(
                {'error': 'Payroll already marked as paid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment_method = request.data.get('payment_method', 'bank_transfer')
        # Normalise to lowercase so DB filter `payment_method='cash'` works correctly
        if isinstance(payment_method, str):
            payment_method = payment_method.lower().replace(' ', '_')
        payment_date = request.data.get('payment_date', timezone.now().date())

        # Optional salary overrides — allow admin to adjust before paying
        net_salary_override = request.data.get('net_salary')
        gross_salary_override = request.data.get('gross_salary')
        deductions_override = request.data.get('deductions')
        salary_note = request.data.get('salary_note', '').strip()

        if net_salary_override is not None:
            try:
                payroll.net_salary = Decimal(str(net_salary_override))
            except Exception:
                return Response({'error': 'Invalid net_salary value.'}, status=status.HTTP_400_BAD_REQUEST)

        if gross_salary_override is not None:
            try:
                payroll.gross_salary = Decimal(str(gross_salary_override))
            except Exception:
                return Response({'error': 'Invalid gross_salary value.'}, status=status.HTTP_400_BAD_REQUEST)

        if deductions_override is not None:
            try:
                payroll.deductions = Decimal(str(deductions_override))
            except Exception:
                return Response({'error': 'Invalid deductions value.'}, status=status.HTTP_400_BAD_REQUEST)

        if salary_note:
            existing_notes = payroll.notes or ''
            payroll.notes = f"{existing_notes}\n[Salary adjusted at payment: {salary_note}]".strip()

        payroll.status = 'paid'
        payroll.payment_date = payment_date
        payroll.payment_method = payment_method
        payroll.save()

        # Create transaction using the (possibly adjusted) net_salary.
        # IMPORTANT: pass payment_method so cash salaries are correctly bucketed
        # as cash_expense in the summary (not online_expense).
        Transaction.objects.create(
            company=payroll.employee.company,
            transaction_type='expense',
            source='salary',
            amount=payroll.net_salary,
            description=f"Salary: {payroll.employee.name} - {payroll.month}/{payroll.year}",
            reference_id=str(payroll.id),
            payroll=payroll,
            branch=payroll.employee.branch,
            payment_method=payment_method
        )

        return Response(PayrollSerializer(payroll).data)

    
    @action(detail=True, methods=['get'])
    def salary_slip(self, request, pk=None):
        """Download salary slip PDF."""
        from django.http import HttpResponse
        from .email_utils import generate_salary_slip_pdf
        
        payroll = self.get_object()
        pdf_buffer = generate_salary_slip_pdf(payroll)
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="salary_slip_{payroll.employee.id}_{payroll.month}_{payroll.year}.pdf"'
        return response
    
    @action(detail=True, methods=['post'])
    def send_salary_slip(self, request, pk=None):
        """Send salary slip via email."""
        from .email_utils import send_salary_slip_email
        
        payroll = self.get_object()
        success = send_salary_slip_email(payroll)
        
        if success:
            return Response({'message': 'Salary slip sent successfully'})
        else:
            return Response(
                {'error': 'Failed to send salary slip'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class PettyCashViewSet(viewsets.ModelViewSet):
    """ViewSet for managing petty cash."""
    
    queryset = PettyCash.objects.all()
    serializer_class = PettyCashSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'amount']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Company / branch isolation
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(branch__company=company)
            
            if user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(branch=user.branch)
            elif hasattr(user, 'branch') and user.branch:
                queryset = queryset.filter(branch=user.branch)

        # Optional branch sub-filter (for superusers or company admins)
        if user.is_superuser or user.role == 'company_admin':
            branch_id = self.request.query_params.get('branch')
            if branch_id:
                queryset = queryset.filter(branch_id=branch_id)

        # Date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset
    
    def perform_create(self, serializer):
        user = self.request.user
        branch = serializer.validated_data.get('branch')
        if not branch and hasattr(user, 'branch'):
            branch = user.branch

        # Security validation
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company or (branch and branch.company != company):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Invalid branch or no company context.")

        # Get current balance
        last_entry = PettyCash.objects.filter(branch=branch).order_by('-date', '-created_at').first()
        
        current_balance = last_entry.balance_after if last_entry else Decimal('0.00')
        amount = serializer.validated_data['amount']
        transaction_type = serializer.validated_data['transaction_type']
        
        # Calculate new balance
        if transaction_type == 'in':
            new_balance = current_balance + amount
        elif transaction_type == 'out':
            new_balance = current_balance - amount
        else:  # adjustment
            new_balance = amount
        
        instance = serializer.save(
            recorded_by=user,
            branch=branch,
            balance_before=current_balance,
            balance_after=new_balance
        )
        
        # Create transaction for petty cash out
        if transaction_type == 'out':
            Transaction.objects.create(
                company=branch.company if branch else None,
                transaction_type='expense',
                source='petty_cash',
                amount=amount,
                description=serializer.validated_data['description'],
                reference_id=str(instance.id),
                petty_cash=instance,
                branch=branch
            )
    
    @action(detail=False, methods=['get'])
    def current_balance(self, request):
        """Get current petty cash balance."""
        branch_id = request.query_params.get('branch')
        
        queryset = self.get_queryset()
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        last_entry = queryset.order_by('-date', '-created_at').first()
        
        return Response({
            'current_balance': last_entry.balance_after if last_entry else 0,
            'last_updated': last_entry.date if last_entry else None
        })


class RecurringExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing recurring expenses."""
    
    queryset = RecurringExpense.objects.all()
    serializer_class = RecurringExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'amount', 'start_date']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Branch filtering - consistent with multi-branch system
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(branch__company=company)
            
            if user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(Q(branch=user.branch) | Q(branch__isnull=True))
            elif hasattr(user, 'branch') and user.branch:
                queryset = queryset.filter(branch=user.branch)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by frequency
        frequency = self.request.query_params.get('frequency')
        if frequency:
            queryset = queryset.filter(frequency=frequency)
        
        return queryset
    
    def perform_create(self, serializer):
        user = self.request.user
        branch = serializer.validated_data.get('branch')
        if not branch and hasattr(user, 'branch'):
            branch = user.branch
            
        # Security validation
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company or (branch and branch.company != company):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Invalid branch or no company context.")
                
        serializer.save(
            created_by=user,
            branch=branch
        )
    
    @action(detail=False, methods=['post'])
    def process_recurring(self, request):
        """Process all active recurring expenses (to be called via cron/scheduler)."""
        today = timezone.now().date()
        processed = []
        
        recurring_expenses = RecurringExpense.objects.filter(
            is_active=True,
            auto_generate=True,
            start_date__lte=today
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=today)
        )
        
        for recurring in recurring_expenses:
            # Check if it's time to generate
            should_generate = False
            
            if not recurring.last_generated_date:
                should_generate = True
            else:
                days_since = (today - recurring.last_generated_date).days
                
                if recurring.frequency == 'daily' and days_since >= 1:
                    should_generate = True
                elif recurring.frequency == 'weekly' and days_since >= 7:
                    should_generate = True
                elif recurring.frequency == 'monthly' and days_since >= 30:
                    should_generate = True
                elif recurring.frequency == 'quarterly' and days_since >= 90:
                    should_generate = True
                elif recurring.frequency == 'yearly' and days_since >= 365:
                    should_generate = True
            
            if should_generate:
                # Create expense
                expense = Expense.objects.create(
                    company=recurring.branch.company if recurring.branch else None,
                    title=recurring.title,
                    category=recurring.category,
                    amount=recurring.amount,
                    date=today,
                    description=f"Auto-generated from recurring expense: {recurring.title}",
                    vendor=recurring.vendor,
                    branch=recurring.branch,
                    payment_status='paid'
                )
                
                # Create transaction
                Transaction.objects.create(
                    company=expense.company,
                    transaction_type='expense',
                    source='expense',
                    amount=expense.amount,
                    description=f"Recurring Expense: {expense.title}",
                    reference_id=str(expense.id),
                    expense=expense,
                    branch=expense.branch
                )
                
                # Update last generated date
                recurring.last_generated_date = today
                recurring.save()
                
                processed.append({
                    'recurring_id': recurring.id,
                    'expense_id': expense.id,
                    'title': expense.title,
                    'amount': expense.amount
                })
        
        return Response({
            'processed': processed,
            'count': len(processed),
            'message': f'Processed {len(processed)} recurring expenses'
        })


class BranchBudgetViewSet(viewsets.ModelViewSet):
    """ViewSet for managing branch budgets."""
    
    queryset = BranchBudget.objects.all()
    serializer_class = BranchBudgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['start_date', 'total_budget']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Branch filtering
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(branch__company=company)
            
            if user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(branch=user.branch)
            elif hasattr(user, 'branch') and user.branch:
                queryset = queryset.filter(branch=user.branch)
        
        # Filter by branch (for superusers or company admins)
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Filter by period type
        period_type = self.request.query_params.get('period_type')
        if period_type:
            queryset = queryset.filter(period_type=period_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def perform_create(self, serializer):
        user = self.request.user
        branch = serializer.validated_data.get('branch')
        
        # Security validation
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("User has no company context.")
            
            if not branch:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("Branch is required for budgets.")
                
            if branch.company != company:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Invalid branch.")
                
        serializer.save(created_by=user)
    
    @action(detail=False, methods=['get'])
    def current_budgets(self, request):
        """Get current active budgets for all branches."""
        today = timezone.now().date()
        
        budgets = BranchBudget.objects.filter(
            is_active=True,
            start_date__lte=today,
            end_date__gte=today
        )
        
        # Apply branch filtering
        if not request.user.is_superuser:
            if request.user.role == 'company_admin' and request.user.company:
                budgets = budgets.filter(branch__company=request.user.company)
            elif request.user.role == 'branch_admin' and request.user.branch:
                budgets = budgets.filter(branch=request.user.branch)
        
        serializer = self.get_serializer(budgets, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def utilization_details(self, request, pk=None):
        """Get detailed budget utilization by category."""
        budget = self.get_object()
        
        # Get expenses by category
        from django.db.models import Sum
        
        expenses_by_category = Expense.objects.filter(
            branch=budget.branch,
            date__gte=budget.start_date,
            date__lte=budget.end_date
        ).values('category').annotate(
            total=Sum('amount')
        )
        
        category_breakdown = []
        for exp in expenses_by_category:
            category = exp['category']
            spent = float(exp['total'])
            budget_field = f"{category}_budget"
            allocated = float(getattr(budget, budget_field, 0))
            
            category_breakdown.append({
                'category': category,
                'category_display': dict(Expense.CATEGORY_CHOICES).get(category, category),
                'allocated': allocated,
                'spent': spent,
                'remaining': allocated - spent,
                'utilization_percentage': (spent / allocated * 100) if allocated > 0 else 0
            })
        
        return Response({
            'budget_id': budget.id,
            'branch': budget.branch.name,
            'period': f"{budget.start_date} to {budget.end_date}",
            'total_budget': float(budget.total_budget),
            'total_spent': float(budget.get_utilization_percentage() * budget.total_budget / 100),
            'total_remaining': float(budget.get_remaining_budget()),
            'utilization_percentage': budget.get_utilization_percentage(),
            'category_breakdown': category_breakdown
        })
    
    @action(detail=False, methods=['get'])
    def consolidated_view(self, request):
        """Get consolidated budget view across all branches."""
        if request.user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'detail': 'Only superadmins or company admins can access consolidated view'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        today = timezone.now().date()
        
        # Get current budgets
        budgets = BranchBudget.objects.filter(
            is_active=True,
            start_date__lte=today,
            end_date__gte=today
        )
        
        if request.user.role == 'company_admin':
            budgets = budgets.filter(branch__company=request.user.company)
        
        consolidated = []
        total_budget = 0
        total_spent = 0
        
        for budget in budgets:
            spent = budget.total_budget - budget.get_remaining_budget()
            total_budget += float(budget.total_budget)
            total_spent += float(spent)
            
            consolidated.append({
                'branch_id': budget.branch.id,
                'branch_name': budget.branch.name,
                'budget': float(budget.total_budget),
                'spent': float(spent),
                'remaining': float(budget.get_remaining_budget()),
                'utilization_percentage': budget.get_utilization_percentage()
            })
        
        return Response({
            'branches': consolidated,
            'totals': {
                'total_budget': total_budget,
                'total_spent': total_spent,
                'total_remaining': total_budget - total_spent,
                'overall_utilization': (total_spent / total_budget * 100) if total_budget > 0 else 0
            }
        })


class InterBranchTransferViewSet(viewsets.ModelViewSet):
    """ViewSet for managing inter-branch transfers."""
    
    queryset = InterBranchTransfer.objects.all()
    serializer_class = InterBranchTransferSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'amount']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Branch filtering - show transfers involving user's branch
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
                
            queryset = queryset.filter(
                Q(from_branch__company=company) | Q(to_branch__company=company)
            )
            
            if user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(
                    Q(from_branch=user.branch) | Q(to_branch=user.branch)
                )
            elif hasattr(user, 'branch') and user.branch:
                queryset = queryset.filter(
                    Q(from_branch=user.branch) | Q(to_branch=user.branch)
                )
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by transfer type
        transfer_type = self.request.query_params.get('transfer_type')
        if transfer_type:
            queryset = queryset.filter(transfer_type=transfer_type)
        
        # Date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset
    
    def perform_create(self, serializer):
        user = self.request.user
        from_branch = serializer.validated_data.get('from_branch')
        to_branch = serializer.validated_data.get('to_branch')
        
        # Security validation
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("User has no company context.")
            
            # Branches must exist and belong to the same company
            if from_branch and from_branch.company != company:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Source branch invalid.")
            if to_branch and to_branch.company != company:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Destination branch invalid.")
                
        serializer.save(created_by=user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a transfer."""
        transfer = self.get_object()
        
        if transfer.status != 'pending':
            return Response(
                {'detail': 'Only pending transfers can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        transfer.status = 'approved'
        transfer.approved_by = request.user
        transfer.save()
        
        # Create transactions for approved transfers
        if transfer.transfer_type == 'fund':
            # Debit from source branch
            Transaction.objects.create(
                company=transfer.from_branch.company,
                transaction_type='expense',
                source='transfer',
                amount=transfer.amount,
                description=f"Transfer to {transfer.to_branch.name}: {transfer.description}",
                reference_id=str(transfer.id),
                transfer=transfer,
                branch=transfer.from_branch
            )
            
            # Credit to destination branch
            Transaction.objects.create(
                company=transfer.to_branch.company,
                transaction_type='income',
                source='transfer',
                amount=transfer.amount,
                description=f"Transfer from {transfer.from_branch.name}: {transfer.description}",
                reference_id=str(transfer.id),
                transfer=transfer,
                branch=transfer.to_branch
            )
        
        serializer = self.get_serializer(transfer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a transfer."""
        transfer = self.get_object()
        
        if transfer.status != 'pending':
            return Response(
                {'detail': 'Only pending transfers can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        transfer.status = 'rejected'
        transfer.approved_by = request.user
        transfer.save()
        
        serializer = self.get_serializer(transfer)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get all pending transfers requiring approval."""
        if request.user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'detail': 'Only superadmins or company admins can approve transfers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        pending = self.get_queryset().filter(status='pending')
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)
