"""
Report generation views for accounting module
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.db.models import Sum, Q, F
from django.utils import timezone
from decimal import Decimal

from .models import Expense, Transaction, Payroll, Vendor
from .utils import (
    generate_profit_loss_pdf, 
    generate_profit_loss_excel,
    generate_expense_report_excel
)


class ReportViewSet(viewsets.ViewSet):
    """ViewSet for generating various financial reports"""
    permission_classes = [IsAuthenticated]

    def _get_date_filters(self, request):
        """Extract and validate date filters from request with security scoping"""
        user = request.user
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        branch_param = request.query_params.get('branch')
        
        filters = Q()
        
        # --- Security Scoping (MANDATORY) ---
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            # If no company context, return filters that will yield nothing
            if not company:
                return Q(id__isnull=True), None, None, None
            
            # Everyone except super admin must be scoped by company
            filters &= Q(company=company)
            
            if user.role == 'branch_admin' and user.branch:
                # Branch admin see their branch + global records for their company
                filters &= (Q(branch=user.branch) | Q(branch__isnull=True))
            elif user.role not in ['super_admin', 'company_admin', 'branch_admin'] and hasattr(user, 'branch') and user.branch:
                # Regular staff see only their branch
                filters &= Q(branch=user.branch)
        
        # --- Date Filters ---
        if start_date:
            filters &= Q(date__gte=start_date)
        if end_date:
            filters &= Q(date__lte=end_date)
            
        # --- Explicit Branch Filter (Sub-filtering) ---
        if branch_param:
            if branch_param == 'all' or branch_param == 'null':
                filters &= Q(branch__isnull=True)
            elif ',' in str(branch_param):
                branch_ids = [bid.strip() for bid in branch_param.split(',') if bid.strip()]
                if 'all' in branch_ids or 'null' in branch_ids:
                    filters &= (Q(branch_id__in=[b for b in branch_ids if b not in ['all', 'null']]) | Q(branch__isnull=True))
                else:
                    filters &= Q(branch_id__in=branch_ids)
            else:
                filters &= Q(branch_id=branch_param)
        
        return filters, start_date, end_date, branch_param

    @action(detail=False, methods=['get'])
    def profit_loss(self, request):
        """Generate Profit & Loss statement"""
        filters, start_date, end_date, branch_id = self._get_date_filters(request)
        
        # Get income transactions
        income_transactions = Transaction.objects.filter(
            filters,
            transaction_type='income'
        ).values('source').annotate(total=Sum('amount'))
        
        income = []
        total_income = Decimal('0.00')
        for item in income_transactions:
            amount = item['total'] or Decimal('0.00')
            income.append({
                'description': item['source'].replace('_', ' ').title(),
                'amount': float(amount)
            })
            total_income += amount
        
        # Get expense by category
        expense_filters = filters.copy()
        expense_filters &= Q(payment_status='paid')
        
        expenses = Expense.objects.filter(expense_filters).values(
            'category', 'category'
        ).annotate(total=Sum('amount')).order_by('-total')
        
        expense_list = []
        total_expenses = Decimal('0.00')
        for expense in expenses:
            amount = expense['total'] or Decimal('0.00')
            category_display = dict(Expense.CATEGORY_CHOICES).get(expense['category'], expense['category'])
            expense_list.append({
                'description': expense['category'],
                'category_display': category_display,
                'amount': float(amount)
            })
            total_expenses += amount
        
        net_profit = total_income - total_expenses
        
        data = {
            'income': income,
            'total_income': float(total_income),
            'expenses': expense_list,
            'total_expenses': float(total_expenses),
            'net_profit': float(net_profit),
            'start_date': start_date,
            'end_date': end_date,
            'branch_id': branch_id
        }
        
        # Handle export format
        export_format = request.query_params.get('format')
        if export_format == 'pdf':
            branch_name = None
            if branch_id:
                from branches.models import Branch
                branch = Branch.objects.filter(id=branch_id).first()
                branch_name = branch.name if branch else None
                
            pdf_buffer = generate_profit_loss_pdf(data, start_date or 'Beginning', end_date or 'Today', branch_name)
            response = HttpResponse(pdf_buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="profit_loss_{timezone.now().strftime("%Y%m%d")}.pdf"'
            return response
        elif export_format == 'excel':
            branch_name = None
            if branch_id:
                from branches.models import Branch
                branch = Branch.objects.filter(id=branch_id).first()
                branch_name = branch.name if branch else None
                
            excel_buffer = generate_profit_loss_excel(data, start_date or 'Beginning', end_date or 'Today', branch_name)
            response = HttpResponse(excel_buffer, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="profit_loss_{timezone.now().strftime("%Y%m%d")}.xlsx"'
            return response
        
        return Response(data)

    @action(detail=False, methods=['get'])
    def expense_report(self, request):
        """Generate detailed expense report"""
        filters, start_date, end_date, branch_id = self._get_date_filters(request)
        
        expenses = Expense.objects.filter(filters).select_related('vendor', 'branch').order_by('-date')
        
        expense_list = []
        total = Decimal('0.00')
        for expense in expenses:
            expense_list.append({
                'date': expense.date.strftime('%Y-%m-%d'),
                'category': expense.category,
                'category_display': expense.get_category_display(),
                'title': expense.title,
                'amount': float(expense.amount),
                'vendor': expense.vendor.name if expense.vendor else expense.vendor_name,
                'branch_name': expense.branch.name if expense.branch else 'Global / General',
                'payment_status': expense.payment_status
            })
            total += expense.amount
        
        data = {
            'expenses': expense_list,
            'total': float(total),
            'start_date': start_date,
            'end_date': end_date
        }
        
        # Handle export
        export_format = request.query_params.get('format')
        if export_format == 'excel':
            branch_name = None
            if branch_id:
                from branches.models import Branch
                branch = Branch.objects.filter(id=branch_id).first()
                branch_name = branch.name if branch else None
                
            excel_buffer = generate_expense_report_excel(expense_list, start_date or 'Beginning', end_date or 'Today', branch_name)
            response = HttpResponse(excel_buffer, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="expense_report_{timezone.now().strftime("%Y%m%d")}.xlsx"'
            return response
        
        return Response(data)

    @action(detail=False, methods=['get'])
    def income_report(self, request):
        """Generate income report"""
        filters, start_date, end_date, branch_id = self._get_date_filters(request)
        
        transactions = Transaction.objects.filter(
            filters,
            transaction_type='income'
        ).select_related('invoice').order_by('-date')
        
        income_list = []
        total = Decimal('0.00')
        for txn in transactions:
            income_list.append({
                'date': txn.date.strftime('%Y-%m-%d'),
                'source': txn.get_source_display(),
                'description': txn.description,
                'amount': float(txn.amount),
                'invoice_number': txn.invoice.invoice_number if txn.invoice else ''
            })
            total += txn.amount
        
        return Response({
            'income': income_list,
            'total': float(total),
            'start_date': start_date,
            'end_date': end_date
        })

    @action(detail=False, methods=['get'])
    def salary_summary(self, request):
        """Generate salary summary report"""
        filters, start_date, end_date, branch_id = self._get_date_filters(request)
        
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        payroll_filters = Q()
        if month:
            payroll_filters &= Q(month=int(month))
        if year:
            payroll_filters &= Q(year=int(year))
        
        payrolls = Payroll.objects.filter(payroll_filters).select_related('employee').order_by('-year', '-month', 'employee__name')
        
        payroll_list = []
        total_gross = Decimal('0.00')
        total_deductions = Decimal('0.00')
        total_net = Decimal('0.00')
        
        for payroll in payrolls:
            payroll_list.append({
                'employee': payroll.employee.name,
                'month': payroll.get_month_name(),
                'year': payroll.year,
                'gross_salary': float(payroll.gross_salary),
                'deductions': float(payroll.deductions),
                'net_salary': float(payroll.net_salary),
                'status': payroll.get_status_display()
            })
            total_gross += payroll.gross_salary
            total_deductions += payroll.deductions
            total_net += payroll.net_salary
        
        return Response({
            'payrolls': payroll_list,
            'total_gross': float(total_gross),
            'total_deductions': float(total_deductions),
            'total_net': float(total_net),
            'month': month,
            'year': year
        })

    @action(detail=False, methods=['get'])
    def vendor_ledger(self, request):
        """Generate vendor ledger report"""
        filters, start_date, end_date, branch_id = self._get_date_filters(request)
        
        vendor_id = request.query_params.get('vendor')
        if vendor_id:
            filters &= Q(vendor_id=vendor_id)
        
        expenses = Expense.objects.filter(filters).select_related('vendor').order_by('vendor__name', 'date')
        
        vendor_data = {}
        for expense in expenses:
            vendor_key = expense.vendor_id or 'unassigned'
            vendor_name = expense.vendor.name if expense.vendor else expense.vendor_name or 'Unassigned'
            
            if vendor_key not in vendor_data:
                vendor_data[vendor_key] = {
                    'vendor_name': vendor_name,
                    'expenses': [],
                    'total': Decimal('0.00')
                }
            
            vendor_data[vendor_key]['expenses'].append({
                'date': expense.date.strftime('%Y-%m-%d'),
                'title': expense.title,
                'amount': float(expense.amount),
                'payment_status': expense.get_payment_status_display()
            })
            vendor_data[vendor_key]['total'] += expense.amount
        
        # Convert to list
        ledger = []
        for vendor_id, data in vendor_data.items():
            ledger.append({
                'vendor_id': vendor_id,
                'vendor_name': data['vendor_name'],
                'expenses': data['expenses'],
                'total': float(data['total'])
            })
        
        return Response({
            'vendors': ledger,
            'start_date': start_date,
            'end_date': end_date
        })

    @action(detail=False, methods=['get'])
    def gst_report(self, request):
        """Generate GST/Tax report"""
        filters, start_date, end_date, branch_id = self._get_date_filters(request)
        
        # Get transactions with invoices (which have GST)
        transactions = Transaction.objects.filter(
            filters,
            transaction_type='income',
            invoice__isnull=False
        ).select_related('invoice').order_by('date')
        
        gst_data = []
        total_cgst = Decimal('0.00')
        total_sgst = Decimal('0.00')
        total_igst = Decimal('0.00')
        total_tax = Decimal('0.00')
        
        for txn in transactions:
            invoice = txn.invoice
            if invoice:
                # Calculate GST (assuming 18% GST: 9% CGST + 9% SGST)
                taxable_amount = invoice.final_amount / Decimal('1.18')  # Remove GST to get base
                gst_amount = invoice.final_amount - taxable_amount
                cgst = gst_amount / 2
                sgst = gst_amount / 2
                igst = Decimal('0.00')  # For interstate, would be full GST
                
                gst_data.append({
                    'invoice_number': invoice.invoice_number,
                    'date': invoice.created_at.strftime('%Y-%m-%d'),
                    'customer': invoice.customer.user.name if hasattr(invoice.customer, 'user') else 'N/A',
                    'taxable_amount': float(taxable_amount),
                    'cgst': float(cgst),
                    'sgst': float(sgst),
                    'igst': float(igst),
                    'total_tax': float(gst_amount)
                })
                
                total_cgst += cgst
                total_sgst += sgst
                total_igst += igst
                total_tax += gst_amount
        
        return Response({
            'transactions': gst_data,
            'cgst': float(total_cgst),
            'sgst': float(total_sgst),
            'igst': float(total_igst),
            'total_tax': float(total_tax),
            'start_date': start_date,
            'end_date': end_date
        })

    @action(detail=False, methods=['get'])
    def branch_comparison(self, request):
        """Generate branch comparison report with security scoping"""
        user = request.user
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        from branches.models import Branch
        
        # Security scoping for branches
        if user.is_superuser:
            branches = Branch.objects.all()
            company = None
        else:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return Response({'branches': [], 'start_date': start_date, 'end_date': end_date})
            branches = Branch.objects.filter(company=company)
        
        comparison = []
        for branch in branches:
            filters = Q(branch=branch)
            if company:
                filters &= Q(company=company)
                
            if start_date:
                filters &= Q(date__gte=start_date)
            if end_date:
                filters &= Q(date__lte=end_date)
            
            income = Transaction.objects.filter(filters, transaction_type='income').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            expenses = Transaction.objects.filter(filters, transaction_type='expense').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            comparison.append({
                'branch_id': branch.id,
                'branch_name': branch.name,
                'total_income': float(income),
                'total_expenses': float(expenses),
                'net_profit': float(income - expenses)
            })
            
        # Add Global/General
        global_filters = Q(branch__isnull=True)
        if company:
            global_filters &= Q(company=company)
            
        if start_date:
            global_filters &= Q(date__gte=start_date)
        if end_date:
            global_filters &= Q(date__lte=end_date)
            
        global_income = Transaction.objects.filter(global_filters, transaction_type='income').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        global_expenses = Transaction.objects.filter(global_filters, transaction_type='expense').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        if global_income > 0 or global_expenses > 0:
            comparison.append({
                'branch_id': 'all',
                'branch_name': 'Global / General',
                'total_income': float(global_income),
                'total_expenses': float(global_expenses),
                'net_profit': float(global_income - global_expenses)
            })
        
        return Response({
            'branches': comparison,
            'start_date': start_date,
            'end_date': end_date
        })
