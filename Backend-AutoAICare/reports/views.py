"""
Advanced Reporting API Views
Handles PDF, Excel, and scheduled report generation
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Sum, Count, Avg, Q
from .models import ScheduledReport
from .serializers import ScheduledReportSerializer
from utils.report_generators import (
    generate_revenue_report_pdf,
    generate_revenue_report_excel,
    generate_customer_report_pdf,
    generate_customer_report_excel
)
from bookings.models import Booking
from customers.models import Customer
from leads.models import Lead


class ReportViewSet(viewsets.ViewSet):
    """
    ViewSet for generating various reports in PDF and Excel formats
    """
    permission_classes = [IsAuthenticated]
    
    def _parse_date_range(self, request):
        """Parse date range from request parameters"""
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Allow custom date range
        if 'start_date' in request.query_params:
            start_date = datetime.strptime(request.query_params['start_date'], '%Y-%m-%d').date()
        if 'end_date' in request.query_params:
            end_date = datetime.strptime(request.query_params['end_date'], '%Y-%m-%d').date()
        
        return start_date, end_date
    
    @action(detail=False, methods=['get'])
    def revenue_pdf(self, request):
        """Generate revenue report in PDF format"""
        try:
            start_date, end_date = self._parse_date_range(request)
            
            # Get bookings data
            bookings = Booking.objects.filter(
                booking_datetime__date__range=[start_date, end_date]
            ).select_related('customer', 'customer__user', 'primary_package').prefetch_related('payments').order_by('-booking_datetime')
            
            # Apply branch/company filtering
            user = request.user
            branch_id = request.query_params.get('branch')
            
            if user.role == 'super_admin':
                if branch_id and branch_id != 'null':
                    bookings = bookings.filter(branch_id=branch_id)
            elif user.role == 'company_admin' and user.company:
                if branch_id and branch_id != 'null':
                    bookings = bookings.filter(branch_id=branch_id, branch__company=user.company)
                else:
                    bookings = bookings.filter(branch__company=user.company)
            elif hasattr(user, 'branch') and user.branch:
                bookings = bookings.filter(branch=user.branch)
            else:
                bookings = bookings.none()
            
            # Generate PDF
            pdf_buffer = generate_revenue_report_pdf(start_date, end_date, bookings)
            
            # Create response
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            filename = f'revenue_report_{start_date}_{end_date}.pdf'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def revenue_excel(self, request):
        """Generate revenue report in Excel format"""
        try:
            start_date, end_date = self._parse_date_range(request)
            
            # Get bookings data
            bookings = Booking.objects.filter(
                booking_datetime__date__range=[start_date, end_date]
            ).select_related('customer', 'customer__user', 'primary_package').prefetch_related('payments').order_by('-booking_datetime')
            
            # Apply branch/company filtering
            user = request.user
            branch_id = request.query_params.get('branch')
            
            if user.role == 'super_admin':
                if branch_id and branch_id != 'null':
                    bookings = bookings.filter(branch_id=branch_id)
            elif user.role == 'company_admin' and user.company:
                if branch_id and branch_id != 'null':
                    bookings = bookings.filter(branch_id=branch_id, branch__company=user.company)
                else:
                    bookings = bookings.filter(branch__company=user.company)
            elif hasattr(user, 'branch') and user.branch:
                bookings = bookings.filter(branch=user.branch)
            else:
                bookings = bookings.none()
            
            # Generate Excel
            excel_buffer = generate_revenue_report_excel(start_date, end_date, bookings)
            
            # Create response
            response = HttpResponse(
                excel_buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            filename = f'revenue_report_{start_date}_{end_date}.xlsx'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def customer_pdf(self, request):
        """Generate customer report in PDF format"""
        try:
            # Get customers data
            customers = Customer.objects.all().select_related('user')
            
            # Apply filters
            user = request.user
            branch_id = request.query_params.get('branch')
            
            if user.role == 'super_admin':
                if branch_id and branch_id != 'null':
                    customers = customers.filter(user__branch_id=branch_id)
            elif user.role == 'company_admin' and user.company:
                if branch_id and branch_id != 'null':
                    customers = customers.filter(user__branch_id=branch_id, user__company=user.company)
                else:
                    customers = customers.filter(user__company=user.company)
            elif hasattr(user, 'branch') and user.branch:
                customers = customers.filter(user__branch=user.branch)
            else:
                customers = customers.none()

            if request.query_params.get('active_only') == 'true':
                customers = customers.filter(user__is_active=True)
            
            # Generate PDF
            pdf_buffer = generate_customer_report_pdf(customers)
            
            # Create response
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            filename = f'customer_report_{timezone.now().date()}.pdf'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def customer_excel(self, request):
        """Generate customer report in Excel format"""
        try:
            # Get customers data
            customers = Customer.objects.all().select_related('user')
            
            # Apply filters
            user = request.user
            branch_id = request.query_params.get('branch')
            
            if user.role == 'super_admin':
                if branch_id and branch_id != 'null':
                    customers = customers.filter(user__branch_id=branch_id)
            elif user.role == 'company_admin' and user.company:
                if branch_id and branch_id != 'null':
                    customers = customers.filter(user__branch_id=branch_id, user__company=user.company)
                else:
                    customers = customers.filter(user__company=user.company)
            elif hasattr(user, 'branch') and user.branch:
                customers = customers.filter(user__branch=user.branch)
            else:
                customers = customers.none()

            if request.query_params.get('active_only') == 'true':
                customers = customers.filter(user__is_active=True)
            
            # Generate Excel
            excel_buffer = generate_customer_report_excel(customers)
            
            # Create response
            response = HttpResponse(
                excel_buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            filename = f'customer_report_{timezone.now().date()}.xlsx'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def lead_pdf(self, request):
        """Generate lead report in PDF format"""
        try:
            from utils.report_generators import PDFReportGenerator
            
            # Get leads data
            leads = Lead.objects.all().select_related('source', 'assigned_to').order_by('-created_at')
            
            # Apply filters
            user = request.user
            branch_id = request.query_params.get('branch')
            
            if user.role == 'super_admin':
                if branch_id and branch_id != 'null':
                    leads = leads.filter(branch_id=branch_id)
            elif user.role == 'company_admin' and user.company:
                if branch_id and branch_id != 'null':
                    leads = leads.filter(branch_id=branch_id, company=user.company)
                else:
                    leads = leads.filter(company=user.company)
            elif hasattr(user, 'branch') and user.branch:
                leads = leads.filter(branch=user.branch)
            else:
                leads = leads.none()

            if request.query_params.get('status'):
                leads = leads.filter(status=request.query_params['status'])
            
            # Create PDF
            pdf = PDFReportGenerator(title="Lead Report")
            pdf.add_header()
            
            # Summary
            total_leads = leads.count()
            qualified_leads = leads.filter(status='qualified').count()
            won_leads = leads.filter(status='won').count()
            conversion_rate = (won_leads / total_leads * 100) if total_leads > 0 else 0
            
            pdf.add_section("Lead Statistics")
            pdf.add_summary_box("Total Leads", total_leads)
            pdf.add_summary_box("Qualified Leads", qualified_leads)
            pdf.add_summary_box("Won Leads", won_leads)
            pdf.add_summary_box("Conversion Rate", f"{conversion_rate:.2f}%")
            
            # Lead table
            pdf.add_section("Lead Details")
            table_data = [['Name', 'Phone', 'Source', 'Status', 'Score', 'Assigned To']]
            
            for lead in leads[:50]:
                table_data.append([
                    lead.name,
                    lead.phone,
                    lead.source.name if lead.source else 'N/A',
                    lead.status,
                    str(lead.score or 0),
                    lead.assigned_to.get_full_name() if lead.assigned_to else 'Unassigned'
                ])
            
            pdf.add_table(table_data)
            pdf_buffer = pdf.generate()
            
            # Create response
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            filename = f'lead_report_{timezone.now().date()}.pdf'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def analytics_summary_pdf(self, request):
        """Generate comprehensive analytics summary in PDF"""
        try:
            from utils.report_generators import PDFReportGenerator
            
            start_date, end_date = self._parse_date_range(request)
            
            # Create PDF
            pdf = PDFReportGenerator(title="Business Analytics Summary")
            pdf.add_header()
            
            # Revenue Analytics
            bookings = Booking.objects.filter(booking_datetime__date__range=[start_date, end_date])
            branch_id = request.query_params.get('branch')
            
            # Apply company/branch filtering
            user = request.user
            if user.role == 'super_admin':
                if branch_id and branch_id != 'null':
                    bookings = bookings.filter(branch_id=branch_id)
            elif user.role == 'company_admin' and user.company:
                if branch_id and branch_id != 'null':
                    bookings = bookings.filter(branch_id=branch_id, branch__company=user.company)
                else:
                    bookings = bookings.filter(branch__company=user.company)
            elif hasattr(user, 'branch') and user.branch:
                bookings = bookings.filter(branch=user.branch)
            else:
                bookings = bookings.none()
            
            total_revenue = bookings.aggregate(total=Sum('total_price'))['total'] or 0
            total_bookings = bookings.count()
            
            pdf.add_section("Revenue Analytics")
            pdf.add_summary_box("Total Revenue", f"₹{total_revenue:,.2f}")
            pdf.add_summary_box("Total Bookings", total_bookings)
            
            # Customer Analytics
            customers = Customer.objects.select_related('user').all()
            if user.role == 'super_admin':
                if branch_id and branch_id != 'null':
                    customers = customers.filter(user__branch_id=branch_id)
            elif user.role == 'company_admin' and user.company:
                if branch_id and branch_id != 'null':
                    customers = customers.filter(user__branch_id=branch_id, user__company=user.company)
                else:
                    customers = customers.filter(user__company=user.company)
            elif hasattr(user, 'branch') and user.branch:
                customers = customers.filter(user__branch=user.branch)
            else:
                customers = customers.none()
            
            total_customers = customers.count()
            active_customers = customers.filter(user__is_active=True).count()
            
            pdf.add_section("Customer Analytics")
            pdf.add_summary_box("Total Customers", total_customers)
            pdf.add_summary_box("Active Customers", active_customers)
            
            # Lead Analytics
            leads = Lead.objects.all()
            if user.role == 'super_admin':
                if branch_id and branch_id != 'null':
                    leads = leads.filter(branch_id=branch_id)
            elif user.role == 'company_admin' and user.company:
                if branch_id and branch_id != 'null':
                    leads = leads.filter(branch_id=branch_id, company=user.company)
                else:
                    leads = leads.filter(company=user.company)
            elif hasattr(user, 'branch') and user.branch:
                leads = leads.filter(branch=user.branch)
            else:
                leads = leads.none()
            
            total_leads = leads.count()
            won_leads = leads.filter(status='won').count()
            
            pdf.add_section("Lead Analytics")
            pdf.add_summary_box("Total Leads", total_leads)
            pdf.add_summary_box("Won Leads", won_leads)
            
            pdf_buffer = pdf.generate()
            
            # Create response
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            filename = f'analytics_summary_{timezone.now().date()}.pdf'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ScheduledReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing scheduled reports
    """
    queryset = ScheduledReport.objects.all()
    serializer_class = ScheduledReportSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter reports by user role and company."""
        user = self.request.user
        branch_id = self.request.query_params.get('branch')
        
        if user.role == 'super_admin':
            queryset = ScheduledReport.objects.all()
            if branch_id and branch_id != 'null':
                queryset = queryset.filter(created_by__branch_id=branch_id)
            return queryset
        elif user.role == 'company_admin' and user.company:
            queryset = ScheduledReport.objects.filter(created_by__company=user.company)
            if branch_id and branch_id != 'null':
                queryset = queryset.filter(created_by__branch_id=branch_id)
            return queryset
        elif hasattr(user, 'branch') and user.branch:
            return ScheduledReport.objects.filter(created_by__branch=user.branch)
        return ScheduledReport.objects.filter(created_by=user)
    
    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """Manually trigger a scheduled report"""
        scheduled_report = self.get_object()
        
        try:
            # Generate and send report
            scheduled_report.generate_and_send()
            
            return Response({
                'message': 'Report generated and sent successfully',
                'last_run': scheduled_report.last_run
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle scheduled report active status"""
        scheduled_report = self.get_object()
        scheduled_report.is_active = not scheduled_report.is_active
        scheduled_report.save()
        
        return Response({
            'message': f'Report {"activated" if scheduled_report.is_active else "deactivated"}',
            'is_active': scheduled_report.is_active
        })
