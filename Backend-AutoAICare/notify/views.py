from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from config.permissions import IsStaff
from .models import NotificationTemplate, NotificationLog, InAppNotification, WhatsAppMessageLog
from .serializers import (
    NotificationTemplateSerializer, 
    NotificationLogSerializer,
    InAppNotificationSerializer,
    WhatsAppMessageLogSerializer
)
from .tasks import send_notification


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification templates (admin only)."""
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsStaff]
    
    def get_queryset(self):
        """Filter templates by company."""
        user = self.request.user
        if user.role == 'super_admin':
            return NotificationTemplate.objects.all()
        elif user.role == 'company_admin' and user.company:
            return NotificationTemplate.objects.filter(company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            return NotificationTemplate.objects.filter(company=user.branch.company)
        return NotificationTemplate.objects.none()
    
    def perform_create(self, serializer):
        """Set company on new notification template."""
        user = self.request.user
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        serializer.save(company=company)


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing notification logs."""
    queryset = NotificationLog.objects.all()
    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter logs based on user role."""
        user = self.request.user
        if user.role == 'super_admin':
            return NotificationLog.objects.all()
        elif user.role == 'company_admin' and user.company:
            return NotificationLog.objects.filter(recipient__company=user.company)
        elif user.role in ['branch_admin', 'floor_manager', 'supervisor', 'applicator']:
            if hasattr(user, 'branch') and user.branch:
                return NotificationLog.objects.filter(recipient__branch=user.branch)
            return NotificationLog.objects.none()
        else:
            # Customers see only their notifications
            return NotificationLog.objects.filter(recipient=user)
    
    @action(detail=False, methods=['post'], permission_classes=[IsStaff])
    def send_test(self, request):
        """Send a test notification."""
        user_id = request.data.get('user_id')
        notification_type = request.data.get('notification_type')
        context_data = request.data.get('context_data', {})
        
        if not user_id or not notification_type:
            return Response(
                {'error': 'user_id and notification_type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Send notification asynchronously
        result = send_notification.delay(user_id, notification_type, context_data)
        
        return Response({
            'message': 'Test notification sent',
            'task_id': result.id
        }, status=status.HTTP_200_OK)


class InAppNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for in-app notifications."""
    serializer_class = InAppNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter notifications for current user."""
        return InAppNotification.objects.filter(recipient=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response(
                {'error': 'You do not have permission to mark this notification as read.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Mark all notifications as read for current user."""
        updated = InAppNotification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({
            'message': f'{updated} notification(s) marked as read.',
            'updated_count': updated
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = InAppNotification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        
        return Response({
            'unread_count': count
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent notifications (last 10)."""
        notifications = self.get_queryset()[:10]
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class WhatsAppMessageLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing WhatsApp message logs."""
    serializer_class = WhatsAppMessageLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter logs based on user's company."""
        user = self.request.user
        queryset = WhatsAppMessageLog.objects.all().order_by('-created_at')
        
        if user.role == 'super_admin':
            pass  # see all
        elif user.role == 'company_admin' and user.company:
            queryset = queryset.filter(company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            queryset = queryset.filter(company=user.branch.company)
        else:
            queryset = queryset.none()
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by branch if provided (using subqueries since there's no direct relation)
        branch_id = self.request.query_params.get('branch', None)
        if branch_id:
            from django.db.models import Q
            from bookings.models import Booking
            from jobcards.models import JobCard
            from billing.models import Invoice
            
            queryset = queryset.filter(
                Q(recipient__branch_id=branch_id) |
                Q(related_booking_id__in=Booking.objects.filter(branch_id=branch_id).values_list('id', flat=True)) |
                Q(related_jobcard_id__in=JobCard.objects.filter(branch_id=branch_id).values_list('id', flat=True)) |
                Q(related_invoice_id__in=Invoice.objects.filter(branch_id=branch_id).values_list('id', flat=True))
            )

        # Filter by phone number if provided
        phone_filter = self.request.query_params.get('phone', None)
        if phone_filter:
            queryset = queryset.filter(recipient_phone__icontains=phone_filter)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get WhatsApp message statistics."""
        user = request.user
        queryset = WhatsAppMessageLog.objects.all()
        
        if user.role == 'super_admin':
            pass  # see all
        elif user.role == 'company_admin' and user.company:
            queryset = queryset.filter(company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            queryset = queryset.filter(company=user.branch.company)
        else:
            queryset = queryset.none()

        # Filter by branch if provided
        branch_id = request.query_params.get('branch', None)
        if branch_id:
            from django.db.models import Q
            from bookings.models import Booking
            from jobcards.models import JobCard
            from billing.models import Invoice

            queryset = queryset.filter(
                Q(recipient__branch_id=branch_id) |
                Q(related_booking_id__in=Booking.objects.filter(branch_id=branch_id).values_list('id', flat=True)) |
                Q(related_jobcard_id__in=JobCard.objects.filter(branch_id=branch_id).values_list('id', flat=True)) |
                Q(related_invoice_id__in=Invoice.objects.filter(branch_id=branch_id).values_list('id', flat=True))
            )
        
        total = queryset.count()
        sent = queryset.filter(status='SENT').count()
        delivered = queryset.filter(status='DELIVERED').count()
        read = queryset.filter(status='READ').count()
        failed = queryset.filter(status='FAILED').count()
        
        # Success rate should count delivered and read
        success_count = delivered + read
        success_rate = round((success_count / total * 100), 2) if total > 0 else 0
        
        return Response({
            'total': total,
            'sent': sent,
            'delivered': delivered,
            'read': read,
            'failed': failed,
            'success_rate': success_rate
        }, status=status.HTTP_200_OK)
