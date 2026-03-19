"""
Views for WhatsApp manual mode - pending messages management.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import WhatsAppMessageLog
from .serializers import WhatsAppMessageLogSerializer
from .whatsapp_manual_service import WhatsAppManualService


class PendingWhatsAppMessagesViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for pending manual WhatsApp messages.
    Staff can view pending messages and mark them as sent.
    """
    
    serializer_class = WhatsAppMessageLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get pending manual messages for staff."""
        user = self.request.user
        
        if not user.is_authenticated:
            return WhatsAppMessageLog.objects.none()
            
        # Only staff roles can see pending messages
        if getattr(user, 'role', None) not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            return WhatsAppMessageLog.objects.none()
        
        queryset = WhatsAppMessageLog.objects.filter(
            status='PENDING_MANUAL'
        ).select_related('recipient', 'company').order_by('-created_at')
        
        # Apply company filtering
        if user.role == 'super_admin':
            pass  # see all
        elif user.role == 'company_admin' and user.company:
            queryset = queryset.filter(company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            queryset = queryset.filter(company=user.branch.company)
        else:
            queryset = queryset.none()
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def mark_sent(self, request, pk=None):
        """
        Mark a manual message as sent by staff.
        Called after staff manually sends the message via WhatsApp.
        """
        message = self.get_object()
        
        # Update status
        message.status = 'SENT_MANUAL'
        message.sent_at = timezone.now()
        message.save(update_fields=['status', 'sent_at'])
        
        return Response({
            'status': 'success',
            'message': 'Message marked as sent',
            'data': self.get_serializer(message).data
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get statistics for pending manual messages."""
        user = request.user
        
        if not user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
        if getattr(user, 'role', None) not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        queryset = WhatsAppMessageLog.objects.all()
        
        if user.role == 'super_admin':
            pass  # see all
        elif user.role == 'company_admin' and user.company:
            queryset = queryset.filter(company=user.company)
        elif hasattr(user, 'branch') and user.branch:
            queryset = queryset.filter(company=user.branch.company)
        else:
            queryset = queryset.none()
        
        stats = {
            'pending': queryset.filter(status='PENDING_MANUAL').count(),
            'sent_manual': queryset.filter(status='SENT_MANUAL').count(),
            'total_manual': queryset.filter(status__in=['PENDING_MANUAL', 'SENT_MANUAL']).count(),
        }
        
        return Response(stats)
