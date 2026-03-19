from rest_framework.views import APIView, status
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from datetime import timedelta, datetime, date
from django.contrib.auth import get_user_model
from bookings.models import Booking
from payments.models import Payment
from feedback.models import Feedback
from jobcards.models import JobCard
from services.models import ServicePackage
from customers.models import Customer
from config.permissions import IsAdmin, IsStaff
import csv
from django.http import HttpResponse

User = get_user_model()


class DashboardAnalyticsView(APIView):
    """API endpoint for dashboard analytics."""
    permission_classes = [IsStaff]
    
    def get(self, request):
        today = timezone.now().date()
        user = request.user
        
        # Apply branch filtering
        branch_filter = {}
        if user.role in ['branch_admin', 'floor_manager', 'supervisor', 'applicator'] and user.branch:
            branch_filter['branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                branch_filter['branch_id'] = branch_id
            elif user.role == 'company_admin':
                branch_filter['branch__company'] = user.company
                
        # Revenue filter must be scoped to the same company/branch as the dashboard
        revenue_filter = {'payment_status': 'completed'}
        for key, value in branch_filter.items():
            if key == 'branch':
                revenue_filter['booking__branch'] = value
            elif key == 'branch_id':
                revenue_filter['booking__branch_id'] = value
            elif key == 'branch__company':
                revenue_filter['booking__company'] = value
        
        # Total revenue - scoped correctly to company/branch
        total_revenue = Payment.objects.filter(**revenue_filter).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Combine other dashboard metrics into a single optimized query
        stats = Booking.objects.filter(**branch_filter).aggregate(
            today_jobs_count=Count('jobcard', filter=Q(jobcard__created_at__date=today)),
            pending_count=Count('id', filter=Q(status='pending'), distinct=True),
            completed_count=Count('id', filter=Q(status='completed'), distinct=True),
            average_rating=Avg('feedback__rating'),
            active_customers_count=Count('customer', distinct=True)
        )
        
        return Response({
            'total_revenue': float(total_revenue),
            'today_jobs': stats['today_jobs_count'],
            'pending_bookings': stats['pending_count'],
            'completed_bookings': stats['completed_count'],
            'average_rating': float(stats['average_rating'] or 0),
            'active_customers': stats['active_customers_count']
        })


class RevenueAnalyticsView(APIView):
    """API endpoint for revenue analytics."""
    permission_classes = [IsAdmin]
    
    def get(self, request):
        period = request.query_params.get('period', 'month')  # week, month, year
        
        today = timezone.now().date()
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        
        if start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
                days_count = (end_date - start_date).days + 1
                period = 'custom'
            except ValueError:
                # Fallback to period if dates are invalid
                period = 'month'
                start_date = today - timedelta(days=30)
                end_date = today
                days_count = 30
        else:
            end_date = today
            if period == 'week':
                start_date = today - timedelta(days=7)
                days_count = 7
            elif period == 'month':
                start_date = today - timedelta(days=30)
                days_count = 30
            else:  # year
                start_date = today - timedelta(days=365)
                days_count = 12  # months
        
        # Apply branch filtering
        user = request.user
        branch_filter = {}
        if user.role in ['branch_admin', 'floor_manager', 'supervisor', 'applicator'] and user.branch:
            branch_filter['booking__branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                branch_filter['booking__branch_id'] = branch_id
            elif user.role == 'company_admin':
                branch_filter['booking__company'] = user.company
                
        # Calculate total revenue and growth
        current_revenue = Payment.objects.filter(
            payment_status='completed',
            created_at__date__gte=start_date,
            **branch_filter
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Previous period for growth calculation
        prev_start = start_date - (today - start_date)
        prev_revenue = Payment.objects.filter(
            payment_status='completed',
            created_at__date__gte=prev_start,
            created_at__date__lt=start_date,
            **branch_filter
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        growth = 0
        if prev_revenue > 0:
            growth = round(((current_revenue - prev_revenue) / prev_revenue) * 100, 2)
        
        # Revenue by period
        by_period = []
        from django.db.models.functions import TruncDate, TruncMonth
        
        if period == 'year':
            # Group by month for the last 12 months
            revenue_by_period = Payment.objects.filter(
                payment_status='completed',
                created_at__date__gte=start_date,
                **branch_filter
            ).annotate(
                month=TruncMonth('created_at')
            ).values('month').annotate(
                amount=Sum('amount')
            ).order_by('month')
            
            # Create a map for quick lookup
            revenue_map = {item['month'].strftime('%b'): item['amount'] for item in revenue_by_period}
            
            # Ensure all 12 months are present
            for i in range(12):
                month_date = today - timedelta(days=30 * (11 - i))
                label = month_date.strftime('%b')
                by_period.append({
                    'label': label,
                    'amount': float(revenue_map.get(label, 0))
                })
        else:
            # Dynamically calculate interval based on days_count
            if days_count <= 60:
                interval = 1
            elif days_count <= 180:
                interval = 3
            else:
                interval = 7
                
            # Optimized bulk query for daily revenue using TruncDate
            revenue_by_day = Payment.objects.filter(
                payment_status='completed',
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
                **branch_filter
            ).annotate(
                day=TruncDate('created_at')
            ).values('day').annotate(
                total=Sum('amount')
            ).order_by('day')
            
            # Create a map for quick lookup
            revenue_map = {str(item['day']): item['total'] for item in revenue_by_day}
            
            # Fill the by_period list using the map
            current_start = start_date
            while current_start <= end_date:
                # Calculate the end of this interval
                day_end = current_start + timedelta(days=interval)
                
                # Sum revenue for the interval from our map
                interval_total = 0
                temp_date = current_start
                while temp_date < day_end and temp_date <= end_date:
                    interval_total += float(revenue_map.get(str(temp_date), 0))
                    temp_date += timedelta(days=1)
                
                label = current_start.strftime('%m/%d')
                by_period.append({
                    'label': label,
                    'amount': interval_total
                })
                
                # Move to the next interval
                current_start = day_end
        
        # Payment methods breakdown
        payment_methods = Payment.objects.filter(
            payment_status='completed',
            created_at__date__gte=start_date,
            **branch_filter
        ).values('payment_method').annotate(
            count=Count('id'),
            total=Sum('amount')
        )
        
        return Response({
            'total': float(current_revenue),
            'growth': growth,
            'by_period': by_period,
            'payment_methods': list(payment_methods)
        })


class TopServicesView(APIView):
    """API endpoint for top services analytics."""
    permission_classes = [IsAdmin]
    
    def get(self, request):
        # Apply branch filtering
        user = request.user
        booking_branch_filter = {}
        
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            booking_branch_filter['branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                booking_branch_filter['branch_id'] = branch_id
            elif user.role == 'company_admin':
                booking_branch_filter['branch__company'] = user.company
        
        top_services = Booking.objects.filter(**booking_branch_filter).values('primary_package__name').annotate(
            count=Count('id'),
            revenue=Sum('total_price')
        ).order_by('-count')[:10]
        
        return Response({
            'top_services': list(top_services)
        })


class BookingsAnalyticsView(APIView):
    """API endpoint for bookings analytics."""
    permission_classes = [IsAdmin]
    
    def get(self, request):
        from django.db.models import Case, When, F, Q
        from jobcards.models import JobCard
        
        period = request.query_params.get('period', 'month')
        today = timezone.now().date()
        
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        
        if start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
            except ValueError:
                start_date = today - timedelta(days=30)
                end_date = today
        else:
            end_date = today
            if period == 'week':
                start_date = today - timedelta(days=7)
            elif period == 'month':
                start_date = today - timedelta(days=30)
            else:  # year
                start_date = today - timedelta(days=365)
        
        # Apply branch filtering
        user = request.user
        branch_filter = {}
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            branch_filter['branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                branch_filter['branch_id'] = branch_id
            elif user.role == 'company_admin':
                branch_filter['branch__company'] = user.company
        
        # Get bookings in period
        bookings = Booking.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            **branch_filter
        )
        
        # Status distribution - Optimized to single query
        # We prioritize JobCard status if it exists, matching the Bookings table logic
        status_counts = bookings.annotate(
            effective_status=Case(
                When(jobcard__isnull=False, then=F('jobcard__status')),
                default=F('status')
            )
        ).values('effective_status').annotate(count=Count('id'))
        
        status_map = {}
        for item in status_counts:
            status_key = (item['effective_status'] or '').strip()
            status_map[status_key] = status_map.get(status_key, 0) + item['count']
        
        # Merge human-readable labels from both models
        status_all_choices = dict(Booking.STATUS_CHOICES)
        status_all_choices.update(dict(JobCard.STATUS_CHOICES))
        
        # Prepare by_status with ALL unique statuses from model and current results
        by_status = {status: status_map.get(status, 0) for status in status_all_choices.keys()}
        for s_key, s_count in status_map.items():
            if s_key not in by_status:
                by_status[s_key] = s_count

        # Aggregated stats for summary (inclusive of terminal statuses)
        success_statuses = ['completed', 'delivered', 'closed', 'billed', 'work_completed', 'final_qc_passed', 'ready_for_delivery']
        completed_count = sum(status_map.get(s, 0) for s in success_statuses)
        cancelled_count = status_map.get('cancelled', 0)
        
        # Build comprehensive labels map
        full_status_labels = {k: status_all_choices.get(k, k.replace('_', ' ').title()) for k in by_status.keys()}
        
        return Response({
            'total': bookings.count(),
            'completed': completed_count,
            'cancelled': cancelled_count,
            'by_status': by_status,
            'status_labels': full_status_labels
        })


class CustomersAnalyticsView(APIView):
    """API endpoint for customers analytics."""
    permission_classes = [IsAdmin]
    
    def get(self, request):
        period = request.query_params.get('period', 'month')
        
        today = timezone.now().date()
        
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        
        if start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
            except ValueError:
                start_date = today - timedelta(days=30)
                end_date = today
        else:
            end_date = today
            if period == 'week':
                start_date = today - timedelta(days=7)
            elif period == 'month':
                start_date = today - timedelta(days=30)
            else:  # year
                start_date = today - timedelta(days=365)
        
        # Apply branch filtering
        # NOTE: Customer model has no direct branch FK — only company.
        # Branch-level filtering must go through the bookings reverse relation.
        user = request.user
        booking_branch_filter = {}   # For filtering Booking queryset
        customer_booking_filter = {} # For filtering Customer via bookings__
        customer_company_filter = {} # For filtering Customer directly by company

        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            booking_branch_filter['branch'] = user.branch
            customer_booking_filter['bookings__branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                booking_branch_filter['branch_id'] = branch_id
                customer_booking_filter['bookings__branch_id'] = branch_id
            elif user.role == 'company_admin' and user.company:
                booking_branch_filter['branch__company'] = user.company
                customer_company_filter['company'] = user.company

        # Build the base customer queryset:
        # If branch filter is active, scope to customers who have booked at that branch.
        # Otherwise (company admin without branch), scope by company directly.
        if customer_booking_filter:
            base_customer_qs = Customer.objects.filter(**customer_booking_filter).distinct()
        elif customer_company_filter:
            base_customer_qs = Customer.objects.filter(**customer_company_filter)
        else:
            base_customer_qs = Customer.objects.all()

        # Total customers — scoped to company/branch
        total = base_customer_qs.count()

        # New customers in period — scoped to company/branch
        new = base_customer_qs.filter(
            created_at__date__gte=start_date,
        ).count()

        # Active customers (with bookings in period and branch)
        active = Booking.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            **booking_branch_filter
        ).values('customer').distinct().count()

        # Retention rate (customers with multiple bookings in branch)
        repeat_customers = Booking.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            **booking_branch_filter
        ).values('customer').annotate(
            booking_count=Count('id')
        ).filter(booking_count__gt=1).count()

        retention_rate = 0
        if active > 0:
            retention_rate = round((repeat_customers / active) * 100, 2)

        return Response({
            'total': total,
            'new': new,
            'active': active,
            'retention_rate': retention_rate
        })


class ServicesAnalyticsView(APIView):
    """API endpoint for services analytics."""
    permission_classes = [IsAdmin]
    
    def get(self, request):
        period = request.query_params.get('period', 'month')
        today = timezone.now().date()
        
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        
        if start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
            except ValueError:
                start_date = today - timedelta(days=30)
                end_date = today
        else:
            end_date = today
            if period == 'week':
                start_date = today - timedelta(days=7)
            elif period == 'month':
                start_date = today - timedelta(days=30)
            else:  # year
                start_date = today - timedelta(days=365)

        # Apply branch filtering
        user = request.user
        booking_branch_filter = {}
        
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            booking_branch_filter['branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                booking_branch_filter['branch_id'] = branch_id
            elif user.role == 'company_admin':
                booking_branch_filter['branch__company'] = user.company

        # Terminal/Success statuses for revenue calculation
        success_statuses = ['completed', 'delivered', 'closed', 'billed', 'work_completed', 'final_qc_passed']
        
        # Popular services in the selected period
        popular = []
        services_data = Booking.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            **booking_branch_filter
        ).values(
            'primary_package__id',
            'primary_package__name'
        ).annotate(
            bookings=Count('id'),
            revenue=Sum('total_price', filter=Q(status__in=success_statuses))
        ).order_by('-bookings')[:10]
        
        for service in services_data:
            popular.append({
                'id': service['primary_package__id'],
                'name': service['primary_package__name'],
                'bookings': service['bookings'],
                'revenue': float(service['revenue'] or 0)
            })
        
        # Revenue by service with growth (comparing current period with previous same-length period)
        revenue_by_service = []
        days_count = (end_date - start_date).days + 1
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=days_count - 1)
        
        # Optimized: Fetch ALL previous metrics for these packages in ONE query
        package_ids = [s['primary_package__id'] for s in services_data]
        prev_all_metrics = Booking.objects.filter(
            primary_package__id__in=package_ids,
            created_at__date__gte=prev_start_date,
            created_at__date__lte=prev_end_date,
            **booking_branch_filter
        ).values('primary_package__id').annotate(
            count=Count('id'),
            rev=Sum('total_price', filter=Q(status__in=success_statuses))
        )
        prev_metrics_map = {m['primary_package__id']: m for m in prev_all_metrics}
        
        for service in services_data:
            current_bookings = service['bookings'] or 0
            current_rev = service['revenue'] or 0
            
            p_metrics = prev_metrics_map.get(service['primary_package__id'], {})
            prev_bookings = p_metrics.get('count', 0)
            
            growth = 0
            if prev_bookings > 0:
                growth = round(((current_bookings - prev_bookings) / prev_bookings) * 100, 2)
            
            avg_price = 0
            if current_bookings > 0:
                avg_price = float(current_rev) / current_bookings
            
            revenue_by_service.append({
                'id': service['primary_package__id'],
                'name': service['primary_package__name'],
                'bookings': current_bookings,
                'revenue': float(current_rev),
                'avg_price': round(avg_price, 2),
                'growth': growth
            })
        
        return Response({
            'popular': popular,
            'revenue_by_service': revenue_by_service
        })


class ExportAnalyticsView(APIView):
    """API endpoint to export analytics as CSV."""
    permission_classes = [IsAdmin]
    
    def get(self, request):
        period = request.query_params.get('period', 'month')
        
        today = timezone.now().date()
        
        if period == 'week':
            start_date = today - timedelta(days=7)
        elif period == 'month':
            start_date = today - timedelta(days=30)
        else:  # year
            start_date = today - timedelta(days=365)
        
        # Apply branch filtering
        user = request.user
        branch_filter = {}
        booking_branch_filter = {}
        payment_branch_filter = {}
        
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            branch_filter['branch'] = user.branch
            booking_branch_filter['branch'] = user.branch
            payment_branch_filter['booking__branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                branch_filter['branch_id'] = branch_id
                booking_branch_filter['branch_id'] = branch_id
                payment_branch_filter['booking__branch_id'] = branch_id
            elif user.role == 'company_admin':
                branch_filter['branch__company'] = user.company
                booking_branch_filter['branch__company'] = user.company
                payment_branch_filter['booking__company'] = user.company
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="analytics-{period}-{today}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Analytics Report', f'Period: {period}', f'Date: {today}'])
        writer.writerow([])
        
        # Revenue data
        writer.writerow(['Revenue Analytics'])
        writer.writerow(['Total Revenue', Payment.objects.filter(
            payment_status='completed',
            created_at__date__gte=start_date,
            **payment_branch_filter
        ).aggregate(Sum('amount'))['amount__sum'] or 0])
        writer.writerow([])
        
        # Bookings data - Optimized with bulk aggregation
        writer.writerow(['Booking Analytics'])
        writer.writerow(['Status', 'Count'])
        
        status_counts = Booking.objects.filter(
            created_at__date__gte=start_date,
            **booking_branch_filter
        ).values('status').annotate(count=Count('id'))
        
        counts_map = {item['status']: item['count'] for item in status_counts}
        
        for status, label in Booking.STATUS_CHOICES:
            count = counts_map.get(status, 0)
            writer.writerow([label, count])
        writer.writerow([])
        
        # Top services
        writer.writerow(['Top Services'])
        writer.writerow(['Service', 'Bookings', 'Revenue'])
        services = Booking.objects.filter(
            created_at__date__gte=start_date,
            **booking_branch_filter
        ).values('primary_package__name').annotate(
            bookings=Count('id'),
            revenue=Sum('total_price')
        ).order_by('-bookings')[:10]
        
        for service in services:
            writer.writerow([
                service['primary_package__name'],
                service['bookings'],
                float(service['revenue'] or 0)
            ])
        writer.writerow([])
        
        # Peak Hours data
        writer.writerow(['Peak Booking Hours'])
        writer.writerow(['Hour', 'Bookings'])
        from django.db.models.functions import ExtractHour, TruncDate
        peak_hours = Booking.objects.filter(**booking_branch_filter).annotate(
            hour=ExtractHour('booking_datetime')
        ).values('hour').annotate(
            count=Count('id')
        ).order_by('hour')
        
        for hour_data in peak_hours:
            writer.writerow([
                f"{int(hour_data['hour'])}:00",
                hour_data['count']
            ])
        writer.writerow([])
        
        # Booking Trends data
        writer.writerow(['Booking Trends'])
        writer.writerow(['Date', 'Bookings'])
        bookings_by_date = Booking.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=today,
            **booking_branch_filter
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        for booking_data in bookings_by_date:
            writer.writerow([
                booking_data['date'],
                booking_data['count']
            ])
        writer.writerow([])
        
        # Branch Performance (Super Admin or Company Admin only)
        if user.role in ['super_admin', 'company_admin']:
            writer.writerow(['Branch Performance Comparison'])
            writer.writerow(['Branch', 'Code', 'Bookings', 'Completed', 'Completion %', 'Revenue', 'Job Cards', 'Job Completion %', 'Avg Rating'])
            
            from branches.models import Branch
            if user.role == 'super_admin':
                branches = Branch.objects.filter(is_active=True)
            else:
                branches = Branch.objects.filter(is_active=True, company=user.company)
            
            for branch in branches:
                total_bookings = Booking.objects.filter(
                    branch=branch,
                    created_at__date__gte=start_date
                ).count()
                
                completed_bookings = Booking.objects.filter(
                    branch=branch,
                    status='completed',
                    created_at__date__gte=start_date
                ).count()
                
                revenue = Payment.objects.filter(
                    booking__branch=branch,
                    payment_status='completed',
                    created_at__date__gte=start_date
                ).aggregate(total=Sum('amount'))['total'] or 0
                
                job_cards = JobCard.objects.filter(
                    branch=branch,
                    created_at__date__gte=start_date
                ).count()
                
                completed_jobs = JobCard.objects.filter(
                    branch=branch,
                    status='completed',
                    created_at__date__gte=start_date
                ).count()
                
                avg_rating = Feedback.objects.filter(
                    booking__branch=branch,
                    created_at__date__gte=start_date
                ).aggregate(avg=Avg('rating'))['avg'] or 0
                
                completion_rate = round((completed_bookings / total_bookings * 100), 2) if total_bookings > 0 else 0
                job_completion_rate = round((completed_jobs / job_cards * 100), 2) if job_cards > 0 else 0
                
                writer.writerow([
                    branch.name,
                    branch.code,
                    total_bookings,
                    completed_bookings,
                    completion_rate,
                    float(revenue),
                    job_cards,
                    job_completion_rate,
                    round(float(avg_rating), 2)
                ])
        
        return response


class PeakHoursView(APIView):
    """API endpoint for peak hours analytics."""
    permission_classes = [IsAdmin]
    
    def get(self, request):
        # Apply branch filtering
        user = request.user
        branch_filter = {}
        
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            branch_filter['branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                branch_filter['branch_id'] = branch_id
            elif user.role == 'company_admin':
                branch_filter['branch__company'] = user.company
        
        # Analyze bookings by hour
        from django.db.models.functions import ExtractHour
        
        # Get all hours 0-23 to ensure a full chart
        peak_hours_data = Booking.objects.filter(**branch_filter).annotate(
            hour_val=ExtractHour('booking_datetime')
        ).values('hour_val').annotate(
            count=Count('id')
        ).order_by('hour_val')
        
        # Create a map for quick lookup
        hour_map = {item['hour_val']: item['count'] for item in peak_hours_data}
        
        # Return common business hours (e.g., 8 AM to 8 PM) or all 24 hours
        # Let's return the most active hours or a reasonable range
        peak_hours = []
        for h in range(8, 21):  # 8 AM to 8 PM
            peak_hours.append({
                'hour': h,
                'count': hour_map.get(h, 0)
            })
        
        return Response({
            'peak_hours': peak_hours
        })


class AnalyticsOverviewView(APIView):
    """Get overview analytics for dashboard."""
    permission_classes = [IsStaff]
    
    def get(self, request):
        # Today's date
        today = timezone.now().date()
        
        # Apply branch filtering
        user = request.user
        branch_filter = {}     # For Booking / JobCard (have direct branch FK)
        revenue_filter = {}    # For Payment (reached via booking__)
        customer_filter = {}   # For Customer (has direct company FK)

        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            branch_filter['branch'] = user.branch
            revenue_filter['booking__branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                branch_filter['branch_id'] = branch_id
                revenue_filter['booking__branch_id'] = branch_id
                customer_filter['branch_id'] = branch_id
            elif user.role == 'company_admin' and user.company:
                branch_filter['branch__company'] = user.company
                revenue_filter['booking__company'] = user.company
                customer_filter['company'] = user.company

        # Consolidate bookings aggregation
        booking_metrics = Booking.objects.filter(**branch_filter).aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='pending'))
        )
        total_bookings = booking_metrics['total'] or 0
        pending_bookings = booking_metrics['pending'] or 0

        # Consolidate revenue aggregation — scoped correctly
        month_start = today.replace(day=1)
        revenue_metrics = Payment.objects.filter(
            payment_status='completed',
            **revenue_filter
        ).aggregate(
            total=Sum('amount'),
            month=Sum('amount', filter=Q(created_at__gte=month_start))
        )
        total_revenue = revenue_metrics['total'] or 0
        month_revenue = revenue_metrics['month'] or 0

        # Consolidate job cards status aggregation
        job_cards_metrics = JobCard.objects.filter(**branch_filter).aggregate(
            assigned=Count('id', filter=Q(status='assigned')),
            in_progress=Count('id', filter=Q(status__in=['started', 'in_progress'])),
            completed=Count('id', filter=Q(status='completed'))
        )
        job_cards_assigned = job_cards_metrics['assigned'] or 0
        job_cards_in_progress = job_cards_metrics['in_progress'] or 0
        job_cards_completed = job_cards_metrics['completed'] or 0

        # Upcoming pickups (bookings with pickup_required=True and pending/confirmed)
        upcoming_pickups = Booking.objects.filter(
            pickup_required=True,
            status__in=['pending', 'confirmed'],
            booking_datetime__gte=timezone.now(),
            **branch_filter
        ).count()

        # Total customers — scoped to company/branch
        total_customers = Customer.objects.filter(**customer_filter).count()

        return Response({
            'total_bookings': total_bookings,
            'pending_bookings': pending_bookings,
            'total_revenue': float(total_revenue),
            'month_revenue': float(month_revenue),
            'job_cards': {
                'assigned': job_cards_assigned,
                'in_progress': job_cards_in_progress,
                'completed': job_cards_completed,
                'total': job_cards_assigned + job_cards_in_progress + job_cards_completed
            },
            'upcoming_pickups': upcoming_pickups,
            'total_customers': total_customers
        }, status=status.HTTP_200_OK)


class BookingTrendsView(APIView):
    """Get booking trends over time."""
    permission_classes = [IsStaff]
    
    def get(self, request):
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        
        if start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
                days = (end_date - start_date).days
            except ValueError:
                days = int(request.query_params.get('days', 30))
                end_date = timezone.now().date()
                start_date = end_date - timedelta(days=days)
        else:
            days = int(request.query_params.get('days', 30))
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=days)
        
        # Apply branch filtering
        user = request.user
        branch_filter = {}
        
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            branch_filter['branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                branch_filter['branch_id'] = branch_id
            elif user.role == 'company_admin':
                branch_filter['branch__company'] = user.company
        
        # Get bookings grouped by date
        from django.db.models.functions import TruncDate
        
        bookings_data = Booking.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            **branch_filter
        ).annotate(
            truncated_date=TruncDate('created_at')
        ).values('truncated_date').annotate(
            count=Count('id')
        ).order_by('truncated_date')
        
        # Map to final format with zeros for missing days
        data = []
        revenue_map = {item['truncated_date'].strftime('%m/%d'): item['count'] for item in bookings_data}
        
        for i in range(days + 1):
            current_day = start_date + timedelta(days=i)
            label = current_day.strftime('%m/%d')
            data.append({
                'date': label,
                'count': revenue_map.get(label, 0)
            })
        
        return Response({
            'period': f'Last {days} days',
            'data': data
        }, status=status.HTTP_200_OK)


class JobStatusView(APIView):
    """Get job card status summary."""
    permission_classes = [IsStaff]
    
    def get(self, request):
        # Apply branch filtering
        user = request.user
        branch_filter = {}
        
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            branch_filter['branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                branch_filter['branch_id'] = branch_id
            elif user.role == 'company_admin':
                branch_filter['branch__company'] = user.company
        
        status_summary = JobCard.objects.filter(**branch_filter).values('status').annotate(
            count=Count('id')
        )
        
        return Response({
            'status_distribution': list(status_summary)
        }, status=status.HTTP_200_OK)


class RevenueTrendsView(APIView):
    """Get revenue analytics."""
    permission_classes = [IsStaff]
    
    def get(self, request):
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        
        if start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
                days = (end_date - start_date).days
            except ValueError:
                days = int(request.query_params.get('days', 30))
                end_date = timezone.now().date()
                start_date = end_date - timedelta(days=days)
        else:
            days = int(request.query_params.get('days', 30))
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=days)
        
        # Apply branch filtering
        user = request.user
        revenue_filter = {}
        payment_methods_filter = {}
        
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            revenue_filter['booking__branch'] = user.branch
            payment_methods_filter['booking__branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                revenue_filter['booking__branch_id'] = branch_id
                payment_methods_filter['booking__branch_id'] = branch_id
            elif user.role == 'company_admin':
                revenue_filter['booking__company'] = user.company
                payment_methods_filter['booking__company'] = user.company
        
        # Revenue over time
        revenue_data = Payment.objects.filter(
            payment_status='completed',
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            **revenue_filter
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            total=Sum('amount')
        ).order_by('date')
        
        # Payment method breakdown
        payment_methods = Payment.objects.filter(
            payment_status='completed',
            created_at__date__gte=start_date,
            **payment_methods_filter
        ).values('payment_method').annotate(
            count=Count('id'),
            total=Sum('amount')
        )
        
        return Response({
            'period': f'Last {days} days',
            'revenue_trend': list(revenue_data),
            'payment_methods': list(payment_methods)
        }, status=status.HTTP_200_OK)


class TodaysJobsView(APIView):
    """Get today's job cards for the dashboard."""
    permission_classes = [IsStaff]
    
    def get(self, request):
        today = timezone.now().date()
        user = request.user
        
        # Apply branch filtering
        branch_filter = {}
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            branch_filter['branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                branch_filter['branch_id'] = branch_id
            elif user.role == 'company_admin':
                branch_filter['branch__company'] = user.company
        
        # Get today's job cards with optimized queries
        todays_jobs = JobCard.objects.filter(
            created_at__date=today,
            **branch_filter
        ).select_related(
            'booking',
            'booking__customer',
            'booking__customer__user',
            'booking__vehicle',
            'booking__primary_package',
            'floor_manager',
            'branch'
        ).order_by('-created_at')
        
        # Serialize the data
        jobs_data = []
        for job in todays_jobs:
            jobs_data.append({
                'id': job.id,
                'status': job.status,
                'booking_id': job.booking.id,
                'customer_name': job.booking.customer.user.name,
                'vehicle': job.booking.vehicle.registration_number if job.booking.vehicle else 'N/A',
                'service': job.booking.primary_package.name if job.booking.primary_package else 'N/A',
                'technician': job.floor_manager.name if job.floor_manager else 'Not assigned',
                'floor_manager': job.floor_manager.name if job.floor_manager else 'Not assigned',
                'branch': job.branch.name if job.branch else 'N/A',
                'created_at': job.created_at,
                'estimated_delivery': job.estimated_delivery_time,
            })
        
        # Get summary counts using a single optimized query with actual JobCard statuses
        summary_agg = todays_jobs.aggregate(
            total=Count('id'),
            assigned=Count('id', filter=Q(status='assigned_to_applicator')),
            in_progress=Count('id', filter=Q(status='work_in_progress')),
            completed=Count('id', filter=Q(status='work_completed')),
        )
        
        return Response({
            'summary': summary_agg,
            'jobs': jobs_data
        }, status=status.HTTP_200_OK)


class RecentBookingsView(APIView):
    """Get top 10 recent bookings for the admin dashboard."""
    permission_classes = [IsStaff]
    
    def get(self, request):
        user = request.user
        
        # Apply branch filtering
        branch_filter = {}
        if user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            branch_filter['branch'] = user.branch
        elif user.role in ['super_admin', 'company_admin']:
            branch_id = request.query_params.get('branch')
            if branch_id:
                branch_filter['branch_id'] = branch_id
            elif user.role == 'company_admin':
                branch_filter['branch__company'] = user.company
        
        # Get today's date
        today = date.today()
        
        # Count today's bookings
        today_bookings_count = Booking.objects.filter(
            **branch_filter,
            created_at__date=today
        ).count()
        
        # Get top 10 recent bookings with optimized related lookups
        recent_bookings = Booking.objects.filter(**branch_filter).select_related(
            'customer',
            'customer__user',
            'vehicle',
            'primary_package',
            'branch',
            'jobcard',
            'jobcard__floor_manager',
            'jobcard__supervisor',
            'jobcard__technician'
        ).order_by('-created_at')[:10]
        
        # Serialize the data
        bookings_data = []
        for booking in recent_bookings:
            # Get job card details if exists
            job_card_info = None
            has_jobcard = False
            if hasattr(booking, 'jobcard') and booking.jobcard:
                job_card = booking.jobcard
                job_card_info = {
                    'id': job_card.id,
                    'status': job_card.status,
                    'floor_manager': job_card.floor_manager.name if job_card.floor_manager else 'Not assigned',
                    'supervisor': job_card.supervisor.name if job_card.supervisor else 'Not assigned',
                    'technician': job_card.technician.name if job_card.technician else 'Not assigned',
                    'created_at': job_card.created_at,
                    'estimated_delivery': job_card.estimated_delivery_time,
                }
                has_jobcard = True
            
            bookings_data.append({
                'id': booking.id,
                'status': booking.status,
                'booking_datetime': booking.booking_datetime,
                'created_at': booking.created_at,
                'total_price': float(booking.total_price),
                'customer_name': booking.customer.user.name if booking.customer and booking.customer.user else 'N/A',
                'package_details': {
                    'name': booking.primary_package.name if booking.primary_package else 'N/A'
                },
                'branch_name': booking.branch.name if booking.branch else 'N/A',
                'job_card': job_card_info,  # Add job card details
                'has_jobcard': has_jobcard  # Add frontend-safe job card availability flag
            })
        
        return Response({
            'bookings': bookings_data,
            'today_bookings_count': today_bookings_count,
            'show_pagination': today_bookings_count > 10
        }, status=status.HTTP_200_OK)


class BranchPerformanceView(APIView):
    """Get branch-wise performance analytics (Super Admin and Company Admin)."""
    permission_classes = [IsStaff]
    
    def get(self, request):
        # Only super admin or company admin can access this
        if request.user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super admin or company admin can access branch performance analytics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        from branches.models import Branch
        if request.user.role == 'super_admin':
            branches = Branch.objects.all_companies().filter(is_active=True)
        else:
            branches = Branch.objects.all_companies().filter(is_active=True, company=request.user.company)
        
        # Evaluate branches to IDs to avoid redundant subqueries
        branch_id_list = list(branches.values_list('id', flat=True))
        if not branch_id_list:
            return Response({
                'period': f'Last {days} days',
                'branches': []
            }, status=status.HTTP_200_OK)

        branch_performance = []
        
        # Bulk fetch metrics using the ID list
        # 1. Bookings Metrics
        bookings_metrics = Booking.objects.filter(
            branch_id__in=branch_id_list,
            created_at__date__gte=start_date
        ).values('branch_id').annotate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='completed'))
        ).order_by()
        bookings_map = {m['branch_id']: m for m in bookings_metrics}

        # 2. Revenue Metrics
        revenue_metrics = Payment.objects.filter(
            booking__branch_id__in=branch_id_list,
            payment_status='completed',
            created_at__date__gte=start_date
        ).values('booking__branch_id').annotate(
            total=Sum('amount')
        ).order_by()
        revenue_map = {m['booking__branch_id']: m['total'] for m in revenue_metrics}

        # 3. JobCard Metrics
        jobcards_metrics = JobCard.objects.filter(
            branch_id__in=branch_id_list,
            created_at__date__gte=start_date
        ).values('branch_id').annotate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='completed'))
        ).order_by()
        jobcards_map = {m['branch_id']: m for m in jobcards_metrics}

        # 4. Feedback Metrics
        feedback_metrics = Feedback.objects.filter(
            booking__branch_id__in=branch_id_list,
            created_at__date__gte=start_date
        ).values('booking__branch_id').annotate(
            avg=Avg('rating')
        ).order_by()
        feedback_map = {m['booking__branch_id']: m['avg'] for m in feedback_metrics}

        # Assemble the results
        for branch in branches:
            b_metrics = bookings_map.get(branch.id, {'total': 0, 'completed': 0})
            j_metrics = jobcards_map.get(branch.id, {'total': 0, 'completed': 0})
            
            total_bookings = b_metrics['total']
            completed_bookings = b_metrics['completed']
            revenue = revenue_map.get(branch.id, 0)
            job_cards = j_metrics['total']
            completed_jobs = j_metrics['completed']
            avg_rating = feedback_map.get(branch.id, 0)
            
            branch_performance.append({
                'branch_id': branch.id,
                'branch_name': branch.name,
                'branch_code': branch.code,
                'total_bookings': total_bookings,
                'completed_bookings': completed_bookings,
                'completion_rate': round((completed_bookings / total_bookings * 100), 2) if total_bookings > 0 else 0,
                'revenue': float(revenue),
                'total_job_cards': job_cards,
                'completed_jobs': completed_jobs,
                'job_completion_rate': round((completed_jobs / job_cards * 100), 2) if job_cards > 0 else 0,
                'avg_rating': round(float(avg_rating), 2),
            })
        
        # Sort by revenue (highest first)
        branch_performance.sort(key=lambda x: x['revenue'], reverse=True)
        
        return Response({   
            'period': f'Last {days} days',
            'branches': branch_performance
        }, status=status.HTTP_200_OK)
