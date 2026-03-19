from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q, Prefetch
from .crm_models import ServiceReminder
from .serializers import ServiceReminderSerializer
from .reminder_service import ServiceReminderService
from config.permissions import IsStaff
import datetime

class ReminderPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100

class ServiceReminderListView(generics.ListAPIView):
    """
    List all service reminders with filtering and branch support.
    """
    serializer_class = ServiceReminderSerializer
    permission_classes = [IsAuthenticated, IsStaff]
    pagination_class = ReminderPagination
    
    def get_queryset(self):
        user = self.request.user
        queryset = ServiceReminder.objects.all().select_related(
            'customer__user',
            'vehicle'
        ).order_by('-due_date', '-created_at')

        # Company isolation
        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(customer__company=user.company)
            # Explicit branch filter for company admin
            branch_id = self.request.query_params.get('branch')
            if branch_id and branch_id != 'null':
                from bookings.models import Booking
                branch_customers = Booking.objects.filter(
                    branch_id=branch_id
                ).values_list('customer_id', flat=True).distinct()
                queryset = queryset.filter(customer_id__in=branch_customers)
        elif user.role == 'super_admin':
            # Explicit branch filter for super admin
            branch_id = self.request.query_params.get('branch')
            if branch_id and branch_id != 'null':
                from bookings.models import Booking
                branch_customers = Booking.objects.filter(
                    branch_id=branch_id
                ).values_list('customer_id', flat=True).distinct()
                queryset = queryset.filter(customer_id__in=branch_customers)
        elif hasattr(user, 'branch') and user.branch:
            # Branch-scoped roles: filter by customers who have bookings in this branch
            from bookings.models import Booking
            branch_customers = Booking.objects.filter(
                branch=user.branch
            ).values_list('customer_id', flat=True).distinct()
            queryset = queryset.filter(customer_id__in=branch_customers)
        else:
            return queryset.none()

        # Status filter
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Days filter - show reminders due within N days
        days = self.request.query_params.get('days')
        if days:
            future_date = datetime.date.today() + datetime.timedelta(days=int(days))
            queryset = queryset.filter(due_date__lte=future_date)

        # Search filter
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(customer__user__name__icontains=search) |
                Q(customer__user__phone__icontains=search) |
                Q(vehicle__registration_number__icontains=search)
            )

        return queryset

class ServiceReminderActionView(APIView):
    """
    Perform actions on a service reminder.
    """
    permission_classes = [IsAuthenticated, IsStaff]
    
    def post(self, request, pk):
        reminder = get_object_or_404(ServiceReminder, pk=pk)
        user = request.user

        # Company/branch ownership check
        if user.role == 'company_admin' and user.company:
            if reminder.customer.company_id != user.company.id:
                return Response({'error': 'Reminder does not belong to your company.'},
                                status=status.HTTP_403_FORBIDDEN)
        elif user.role != 'super_admin' and hasattr(user, 'branch') and user.branch:
            from bookings.models import Booking
            has_booking = Booking.objects.filter(
                branch=user.branch, customer=reminder.customer
            ).exists()
            if not has_booking:
                return Response({'error': 'Reminder does not belong to your branch.'},
                                status=status.HTTP_403_FORBIDDEN)

        action = request.data.get('action')

        if action == 'send':
            channel = request.data.get('channel', 'whatsapp')
            ServiceReminderService.send_reminder(reminder, channel)
            return Response({'status': 'sent'})

        elif action == 'complete':
            reminder.status = 'completed'
            reminder.save()
            return Response({'status': 'completed'})

        elif action == 'cancel':
            reminder.status = 'cancelled'
            reminder.save()
            return Response({'status': 'cancelled'})

        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

class ServiceReminderStatsView(APIView):
    """
    Get comprehensive stats for service reminders.
    """
    permission_classes = [IsAuthenticated, IsStaff]
    
    def get(self, request):
        today = datetime.date.today()
        user = request.user

        # Base queryset with company isolation
        queryset = ServiceReminder.objects.all()

        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(customer__company=user.company)
            branch_id = request.query_params.get('branch')
            if branch_id and branch_id != 'null':
                from bookings.models import Booking
                branch_customers = Booking.objects.filter(
                    branch_id=branch_id
                ).values_list('customer_id', flat=True).distinct()
                queryset = queryset.filter(customer_id__in=branch_customers)
        elif user.role == 'super_admin':
            branch_id = request.query_params.get('branch')
            if branch_id and branch_id != 'null':
                from bookings.models import Booking
                branch_customers = Booking.objects.filter(
                    branch_id=branch_id
                ).values_list('customer_id', flat=True).distinct()
                queryset = queryset.filter(customer_id__in=branch_customers)
        elif hasattr(user, 'branch') and user.branch:
            from bookings.models import Booking
            branch_customers = Booking.objects.filter(
                branch=user.branch
            ).values_list('customer_id', flat=True).distinct()
            queryset = queryset.filter(customer_id__in=branch_customers)
        else:
            queryset = queryset.none()
        
        # Calculate stats
        stats = {
            'pending': queryset.filter(status='pending').count(),
            'due_today': queryset.filter(due_date=today, status='pending').count(),
            'overdue': queryset.filter(due_date__lt=today, status='pending').count(),
            'sent_this_month': queryset.filter(
                status='sent', 
                sent_at__month=today.month,
                sent_at__year=today.year
            ).count(),
            'completed_this_month': queryset.filter(
                status='completed',
                created_at__month=today.month,
                created_at__year=today.year
            ).count(),
        }
        
        # Calculate conversion rate (completed / sent)
        total_sent = queryset.filter(status__in=['sent', 'completed']).count()
        total_completed = queryset.filter(status='completed').count()
        stats['conversion_rate'] = round((total_completed / total_sent * 100) if total_sent > 0 else 0, 1)
        
        return Response(stats)

