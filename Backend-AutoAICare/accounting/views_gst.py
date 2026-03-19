from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from decimal import Decimal
from datetime import datetime
import calendar

from billing.models import Invoice
from .models import Expense, Transaction
from customers.models import Customer


class GSTReportViewSet(viewsets.ViewSet):
    """ViewSet for GST Reports - GSTR-1, GSTR-3B, etc."""
    permission_classes = [IsAuthenticated]
    
    def _get_month_dates(self, month, year):
        """Get start and end dates for a month"""
        start_date = datetime(year, month, 1).date()
        last_day = calendar.monthrange(year, month)[1]
        end_date = datetime(year, month, last_day).date()
        return start_date, end_date
    
    def _filter_by_branch(self, queryset, request):
        """Apply branch and company isolation based on user permissions"""
        user = request.user
        if user.is_superuser:
            branch_id = request.query_params.get('branch')
            if branch_id:
                return queryset.filter(branch_id=branch_id)
            return queryset

        # Standard isolation
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        if not company:
            return queryset.none()
        
        # Scope by company
        queryset = queryset.filter(branch__company=company)
        
        if user.role == 'branch_admin' and user.branch:
            return queryset.filter(branch=user.branch)
        elif hasattr(user, 'branch') and user.branch:
            # Regular staff see only their branch
            return queryset.filter(branch=user.branch)
        
        # Company admin sees all filtered branches (already scoped by company)
        branch_id = request.query_params.get('branch')
        if branch_id:
            return queryset.filter(branch_id=branch_id)
            
        return queryset
    
    @action(detail=False, methods=['get'])
    def gstr1(self, request):
        """
        Generate GSTR-1 Report (Outward Supplies)
        
        GSTR-1 includes:
        - B2B Supplies (with GSTIN)
        - B2C Large Supplies (>2.5 lakhs)
        - B2C Small Supplies (<2.5 lakhs)
        - Credit/Debit Notes
        - Exports
        """
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not month or not year:
            return Response(
                {'error': 'month and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            month = int(month)
            year = int(year)
        except ValueError:
            return Response(
                {'error': 'Invalid month or year'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        start_date, end_date = self._get_month_dates(month, year)
        
        # Get all paid invoices for the period
        invoices = Invoice.objects.filter(
            issued_date__gte=start_date,
            issued_date__lte=end_date,
            status='paid'
        ).select_related('booking', 'booking__customer', 'branch')
        
        invoices = self._filter_by_branch(invoices, request)
        
        # B2B Supplies (customers with GSTIN)
        b2b_invoices = invoices.filter(
            booking__customer__gst_number__isnull=False
        ).exclude(booking__customer__gst_number='')
        
        b2b_supplies = []
        for invoice in b2b_invoices:
            customer = invoice.booking.customer if invoice.booking else None
            b2b_supplies.append({
                'invoice_number': invoice.invoice_number,
                'invoice_date': str(invoice.issued_date),
                'customer_name': customer.name if customer else 'N/A',
                'customer_gstin': customer.gst_number if customer else 'N/A',
                'place_of_supply': customer.state if customer else 'N/A',
                'taxable_value': float(invoice.subtotal),
                'tax_rate': float(invoice.tax_rate),
                'cgst': float(invoice.tax_amount / 2) if invoice.tax_amount else 0,
                'sgst': float(invoice.tax_amount / 2) if invoice.tax_amount else 0,
                'igst': 0,  # Assuming intra-state
                'total_tax': float(invoice.tax_amount),
                'invoice_value': float(invoice.total_amount)
            })
        
        # B2C Large Supplies (>2.5 lakhs without GSTIN)
        b2c_large_threshold = Decimal('250000')
        b2c_large_invoices = invoices.filter(
            Q(booking__customer__gst_number__isnull=True) | Q(booking__customer__gst_number=''),
            total_amount__gte=b2c_large_threshold
        )
        
        b2c_large_supplies = []
        for invoice in b2c_large_invoices:
            customer = invoice.booking.customer if invoice.booking else None
            b2c_large_supplies.append({
                'invoice_number': invoice.invoice_number,
                'invoice_date': str(invoice.issued_date),
                'place_of_supply': customer.state if customer else 'N/A',
                'taxable_value': float(invoice.subtotal),
                'tax_rate': float(invoice.tax_rate),
                'total_tax': float(invoice.tax_amount),
                'invoice_value': float(invoice.total_amount)
            })
        
        # B2C Small Supplies (<2.5 lakhs) - Consolidated by tax rate
        b2c_small_invoices = invoices.filter(
            Q(booking__customer__gst_number__isnull=True) | Q(booking__customer__gst_number=''),
            total_amount__lt=b2c_large_threshold
        )
        
        b2c_small_summary = b2c_small_invoices.values('tax_rate').annotate(
            total_taxable_value=Sum('subtotal'),
            total_tax=Sum('tax_amount'),
            total_invoice_value=Sum('total_amount'),
            invoice_count=Count('id')
        ).order_by('-tax_rate')
        
        # Summary calculations
        total_b2b_value = sum(item['invoice_value'] for item in b2b_supplies)
        total_b2b_tax = sum(item['total_tax'] for item in b2b_supplies)
        
        total_b2c_large_value = sum(item['invoice_value'] for item in b2c_large_supplies)
        total_b2c_large_tax = sum(item['total_tax'] for item in b2c_large_supplies)
        
        total_b2c_small_value = sum(float(item['total_invoice_value']) for item in b2c_small_summary)
        total_b2c_small_tax = sum(float(item['total_tax']) for item in b2c_small_summary)
        
        return Response({
            'report_type': 'GSTR-1',
            'period': {
                'month': month,
                'year': year,
                'start_date': str(start_date),
                'end_date': str(end_date)
            },
            'b2b_supplies': {
                'count': len(b2b_supplies),
                'total_taxable_value': total_b2b_value - total_b2b_tax,
                'total_tax': total_b2b_tax,
                'total_invoice_value': total_b2b_value,
                'details': b2b_supplies
            },
            'b2c_large_supplies': {
                'count': len(b2c_large_supplies),
                'total_taxable_value': total_b2c_large_value - total_b2c_large_tax,
                'total_tax': total_b2c_large_tax,
                'total_invoice_value': total_b2c_large_value,
                'details': b2c_large_supplies
            },
            'b2c_small_supplies': {
                'count': sum(item['invoice_count'] for item in b2c_small_summary),
                'total_taxable_value': total_b2c_small_value - total_b2c_small_tax,
                'total_tax': total_b2c_small_tax,
                'total_invoice_value': total_b2c_small_value,
                'summary_by_rate': list(b2c_small_summary)
            },
            'grand_total': {
                'total_invoices': invoices.count(),
                'total_taxable_value': (total_b2b_value + total_b2c_large_value + total_b2c_small_value) - (total_b2b_tax + total_b2c_large_tax + total_b2c_small_tax),
                'total_tax_collected': total_b2b_tax + total_b2c_large_tax + total_b2c_small_tax,
                'total_invoice_value': total_b2b_value + total_b2c_large_value + total_b2c_small_value
            }
        })
    
    @action(detail=False, methods=['get'])
    def gstr3b(self, request):
        """
        Generate GSTR-3B Report (Monthly Return)
        
        GSTR-3B includes:
        - Outward Supplies (from invoices)
        - Inward Supplies (from expenses)
        - ITC Available
        - Tax Liability
        """
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not month or not year:
            return Response(
                {'error': 'month and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            month = int(month)
            year = int(year)
        except ValueError:
            return Response(
                {'error': 'Invalid month or year'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        start_date, end_date = self._get_month_dates(month, year)
        
        # Outward Supplies (Sales)
        invoices = Invoice.objects.filter(
            issued_date__gte=start_date,
            issued_date__lte=end_date,
            status='paid'
        )
        invoices = self._filter_by_branch(invoices, request)
        
        outward_taxable = invoices.aggregate(total=Sum('subtotal'))['total'] or 0
        outward_tax = invoices.aggregate(total=Sum('tax_amount'))['total'] or 0
        
        # Inward Supplies (Purchases/Expenses)
        expenses = Expense.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
            payment_status='paid'
        )
        expenses = self._filter_by_branch(expenses, request)
        
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        # Calculate input tax (assuming 18% GST embedded in expense amount)
        # Formula: Tax = Amount × (GST Rate / (100 + GST Rate))
        gst_rate = Decimal('18')
        input_tax_credit = total_expenses * gst_rate / (Decimal('100') + gst_rate)
        inward_taxable = total_expenses - input_tax_credit
        
        # Tax Liability
        net_tax_liability = outward_tax - input_tax_credit
        
        # Interest and Late Fee (if any)
        interest = Decimal('0')
        late_fee = Decimal('0')
        
        # Total Tax Payable
        total_tax_payable = net_tax_liability + interest + late_fee
        
        return Response({
            'report_type': 'GSTR-3B',
            'period': {
                'month': month,
                'year': year,
                'start_date': str(start_date),
                'end_date': str(end_date)
            },
            'outward_supplies': {
                'taxable_value': float(outward_taxable),
                'integrated_tax': 0,  # IGST
                'central_tax': float(outward_tax / 2),  # CGST
                'state_tax': float(outward_tax / 2),  # SGST
                'cess': 0,
                'total_tax': float(outward_tax)
            },
            'inward_supplies': {
                'taxable_value': float(inward_taxable),
                'integrated_tax': 0,
                'central_tax': float(input_tax_credit / 2),
                'state_tax': float(input_tax_credit / 2),
                'cess': 0,
                'total_input_tax_credit': float(input_tax_credit)
            },
            'itc_available': {
                'import_of_goods': 0,
                'import_of_services': 0,
                'inward_supplies': float(input_tax_credit),
                'input_tax_credit_reversed': 0,
                'net_itc_available': float(input_tax_credit)
            },
            'tax_liability': {
                'integrated_tax': 0,
                'central_tax': float((outward_tax - input_tax_credit) / 2),
                'state_tax': float((outward_tax - input_tax_credit) / 2),
                'cess': 0,
                'interest': float(interest),
                'late_fee': float(late_fee),
                'total_tax_payable': float(total_tax_payable)
            },
            'summary': {
                'total_outward_supplies': float(outward_taxable + outward_tax),
                'total_inward_supplies': float(total_expenses),
                'net_tax_liability': float(net_tax_liability),
                'total_tax_payable': float(total_tax_payable)
            },
            'note': 'Input tax credit is calculated assuming 18% GST. Please verify with actual GST invoices.'
        })
    
    @action(detail=False, methods=['get'])
    def hsn_summary(self, request):
        """
        Generate HSN-wise Summary
        
        HSN Summary shows tax collected grouped by HSN codes
        """
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not month or not year:
            return Response(
                {'error': 'month and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            month = int(month)
            year = int(year)
        except ValueError:
            return Response(
                {'error': 'Invalid month or year'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        start_date, end_date = self._get_month_dates(month, year)
        
        # Get all invoices
        invoices = Invoice.objects.filter(
            issued_date__gte=start_date,
            issued_date__lte=end_date,
            status='paid'
        )
        invoices = self._filter_by_branch(invoices, request)
        
        # Group by tax rate (as proxy for HSN since we don't have HSN codes)
        # In a real implementation, you'd group by actual HSN codes
        hsn_summary = invoices.values('tax_rate').annotate(
            total_quantity=Count('id'),
            total_taxable_value=Sum('subtotal'),
            total_tax=Sum('tax_amount'),
            total_value=Sum('total_amount')
        ).order_by('-tax_rate')
        
        # Add HSN code placeholders
        for item in hsn_summary:
            # Map tax rate to common service HSN codes
            if item['tax_rate'] == 18:
                item['hsn_code'] = '9987'  # Car washing services
                item['description'] = 'Car Detailing Services'
            elif item['tax_rate'] == 12:
                item['hsn_code'] = '9988'
                item['description'] = 'Other Services'
            else:
                item['hsn_code'] = '9999'
                item['description'] = 'Other'
            
            item['uqc'] = 'NOS'  # Unit of Quantity Code
        
        return Response({
            'report_type': 'HSN Summary',
            'period': {
                'month': month,
                'year': year,
                'start_date': str(start_date),
                'end_date': str(end_date)
            },
            'hsn_summary': list(hsn_summary),
            'total': {
                'total_quantity': sum(item['total_quantity'] for item in hsn_summary),
                'total_taxable_value': float(sum(item['total_taxable_value'] for item in hsn_summary)),
                'total_tax': float(sum(item['total_tax'] for item in hsn_summary)),
                'total_value': float(sum(item['total_value'] for item in hsn_summary))
            },
            'note': 'HSN codes are mapped based on tax rates. Please update with actual HSN codes for your services.'
        })
    
    @action(detail=False, methods=['get'])
    def tax_liability_register(self, request):
        """
        Tax Liability Register - Month-wise tax summary
        """
        year = request.query_params.get('year')
        
        if not year:
            return Response(
                {'error': 'year is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            year = int(year)
        except ValueError:
            return Response(
                {'error': 'Invalid year'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        monthly_data = []
        
        for month in range(1, 13):
            start_date, end_date = self._get_month_dates(month, year)
            
            # Outward supplies
            invoices = Invoice.objects.filter(
                issued_date__gte=start_date,
                issued_date__lte=end_date,
                status='paid'
            )
            invoices = self._filter_by_branch(invoices, request)
            
            outward_taxable = invoices.aggregate(total=Sum('subtotal'))['total'] or 0
            outward_tax = invoices.aggregate(total=Sum('tax_amount'))['total'] or 0
            
            # Inward supplies
            expenses = Expense.objects.filter(
                date__gte=start_date,
                date__lte=end_date,
                payment_status='paid'
            )
            expenses = self._filter_by_branch(expenses, request)
            
            total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
            gst_rate = Decimal('18')
            input_tax = total_expenses * gst_rate / (Decimal('100') + gst_rate)
            
            net_tax = outward_tax - input_tax
            
            monthly_data.append({
                'month': month,
                'month_name': calendar.month_name[month],
                'outward_taxable_value': float(outward_taxable),
                'output_tax': float(outward_tax),
                'inward_taxable_value': float(total_expenses - input_tax),
                'input_tax_credit': float(input_tax),
                'net_tax_liability': float(net_tax)
            })
        
        # Calculate totals
        total_outward = sum(item['outward_taxable_value'] for item in monthly_data)
        total_output_tax = sum(item['output_tax'] for item in monthly_data)
        total_inward = sum(item['inward_taxable_value'] for item in monthly_data)
        total_input_tax = sum(item['input_tax_credit'] for item in monthly_data)
        total_net_tax = sum(item['net_tax_liability'] for item in monthly_data)
        
        return Response({
            'report_type': 'Tax Liability Register',
            'year': year,
            'monthly_data': monthly_data,
            'annual_summary': {
                'total_outward_taxable_value': total_outward,
                'total_output_tax': total_output_tax,
                'total_inward_taxable_value': total_inward,
                'total_input_tax_credit': total_input_tax,
                'net_tax_liability': total_net_tax
            }
        })
