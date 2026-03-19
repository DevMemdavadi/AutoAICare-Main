from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.contrib.contenttypes.models import ContentType

from .models_approval import ApprovalWorkflow, ApprovalRequest, ApprovalAction
from .serializers_approval import (
    ApprovalWorkflowSerializer, ApprovalRequestSerializer,
    ApprovalActionSerializer, ApprovalRequestCreateSerializer,
    ApprovalActionCreateSerializer
)


class ApprovalWorkflowViewSet(viewsets.ModelViewSet):
    """ViewSet for managing approval workflows"""
    queryset = ApprovalWorkflow.objects.all()
    serializer_class = ApprovalWorkflowSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ApprovalWorkflow.objects.prefetch_related('approvers')
        user = self.request.user
        
        # Security Scoping
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            # Show workflows for user's company branches or global workflows created by company admins
            queryset = queryset.filter(
                Q(branch__company=company) | Q(branch__isnull=True, created_by__company=company)
            )
        
        # Filter by model type
        model_type = self.request.query_params.get('model_type')
        if model_type:
            queryset = queryset.filter(model_type=model_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by branch
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(Q(branch_id=branch_id) | Q(branch__isnull=True))
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ApprovalRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for managing approval requests"""
    queryset = ApprovalRequest.objects.all()
    serializer_class = ApprovalRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ApprovalRequest.objects.select_related(
            'workflow', 'requested_by', 'content_type'
        ).prefetch_related('actions')
        
        user = self.request.user
        
        # Security Scoping
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
                
            # MUST be from the same company
            queryset = queryset.filter(requested_by__company=company)
            
            # Further filter based on user role (requester or approver)
            queryset = queryset.filter(
                Q(requested_by=user) |
                Q(workflow__approvers=user) |
                Q(workflow__approver_roles__contains=[user.role])
            ).distinct()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by model type
        model_type = self.request.query_params.get('model_type')
        if model_type:
            queryset = queryset.filter(workflow__model_type=model_type)
        
        # Filter pending approvals for current user
        pending_for_me = self.request.query_params.get('pending_for_me')
        if pending_for_me == 'true':
            queryset = queryset.filter(
                status='pending'
            ).filter(
                Q(workflow__approvers=user) |
                Q(workflow__approver_roles__contains=[user.role])
            )
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ApprovalRequestCreateSerializer
        return ApprovalRequestSerializer
    
    def create(self, request):
        """Create a new approval request"""
        serializer = ApprovalRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        workflow = serializer.validated_data['workflow']
        model_type = serializer.validated_data['model_type']
        object_id = serializer.validated_data['object_id']
        amount = serializer.validated_data['amount']
        description = serializer.validated_data['description']
        
        # Get content type
        content_type = ContentType.objects.get(
            app_label='accounting',
            model=model_type
        )
        
        # Create approval request
        approval_request = ApprovalRequest.objects.create(
            workflow=workflow,
            content_type=content_type,
            object_id=object_id,
            requested_by=request.user,
            amount=amount,
            description=description,
            required_levels=workflow.levels
        )
        
        # Send notification to approvers
        self._send_approval_notification(approval_request)
        
        return Response(
            ApprovalRequestSerializer(approval_request).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an approval request"""
        approval_request = self.get_object()
        
        if not approval_request.can_approve(request.user):
            return Response(
                {'error': 'You are not authorized to approve this request'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ApprovalActionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        comments = serializer.validated_data.get('comments', '')
        
        try:
            approval_request.approve(request.user, comments)
            
            # Send notification
            if approval_request.status == 'approved':
                self._send_approval_completed_notification(approval_request, 'approved')
            else:
                self._send_next_level_notification(approval_request)
            
            return Response({
                'message': 'Request approved successfully',
                'request': ApprovalRequestSerializer(approval_request).data
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an approval request"""
        approval_request = self.get_object()
        
        if not approval_request.can_approve(request.user):
            return Response(
                {'error': 'You are not authorized to reject this request'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ApprovalActionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if serializer.validated_data['action'] != 'rejected':
            return Response(
                {'error': 'Action must be "rejected"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = serializer.validated_data.get('comments', '')
        
        try:
            approval_request.reject(request.user, reason)
            
            # Send notification
            self._send_approval_completed_notification(approval_request, 'rejected')
            
            return Response({
                'message': 'Request rejected',
                'request': ApprovalRequestSerializer(approval_request).data
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def my_pending_approvals(self, request):
        """Get all pending approvals for current user"""
        user = request.user
        
        pending = ApprovalRequest.objects.filter(
            status='pending'
        ).filter(
            Q(workflow__approvers=user) |
            Q(workflow__approver_roles__contains=[user.role])
        ).select_related('workflow', 'requested_by').prefetch_related('actions')
        
        serializer = self.get_serializer(pending, many=True)
        return Response({
            'count': pending.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get approval statistics"""
        user = request.user
        
        # Total requests
        total = ApprovalRequest.objects.count()
        
        # By status
        by_status = ApprovalRequest.objects.values('status').annotate(
            count=Count('id')
        )
        
        # Pending for user
        pending_for_user = ApprovalRequest.objects.filter(
            status='pending'
        ).filter(
            Q(workflow__approvers=user) |
            Q(workflow__approver_roles__contains=[user.role])
        ).count()
        
        # User's requests
        user_requests = ApprovalRequest.objects.filter(
            requested_by=user
        ).values('status').annotate(count=Count('id'))
        
        return Response({
            'total_requests': total,
            'by_status': list(by_status),
            'pending_for_me': pending_for_user,
            'my_requests': list(user_requests)
        })
    
    def _send_approval_notification(self, approval_request):
        """Send notification to approvers"""
        try:
            from notify.models import Notification
            
            approvers = approval_request.workflow.get_approvers_for_level(1)
            for approver in approvers:
                Notification.objects.create(
                    user=approver,
                    title="Approval Required",
                    message=f"{approval_request.requested_by.name} requested approval for {approval_request.description} (₹{approval_request.amount})",
                    notification_type="approval_request",
                    related_object_id=approval_request.id,
                    related_object_type="approval_request",
                    priority="high"
                )
        except Exception as e:
            print(f"Failed to send notification: {str(e)}")
    
    def _send_next_level_notification(self, approval_request):
        """Send notification to next level approvers"""
        try:
            from notify.models import Notification
            
            approvers = approval_request.workflow.get_approvers_for_level(
                approval_request.current_level
            )
            for approver in approvers:
                Notification.objects.create(
                    user=approver,
                    title="Approval Required (Level {})".format(approval_request.current_level),
                    message=f"Approval request for {approval_request.description} (₹{approval_request.amount}) needs your approval",
                    notification_type="approval_request",
                    related_object_id=approval_request.id,
                    related_object_type="approval_request",
                    priority="high"
                )
        except Exception as e:
            print(f"Failed to send notification: {str(e)}")
    
    def _send_approval_completed_notification(self, approval_request, result):
        """Send notification when approval is completed"""
        try:
            from notify.models import Notification
            
            Notification.objects.create(
                user=approval_request.requested_by,
                title=f"Approval Request {result.title()}",
                message=f"Your approval request for {approval_request.description} has been {result}",
                notification_type="approval_completed",
                related_object_id=approval_request.id,
                related_object_type="approval_request",
                priority="medium"
            )
        except Exception as e:
            print(f"Failed to send notification: {str(e)}")


class ApprovalActionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing approval actions (read-only)"""
    queryset = ApprovalAction.objects.all()
    serializer_class = ApprovalActionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ApprovalAction.objects.select_related('request', 'approver')
        
        # Filter by request
        request_id = self.request.query_params.get('request')
        if request_id:
            queryset = queryset.filter(request_id=request_id)
        
        # Filter by approver
        approver_id = self.request.query_params.get('approver')
        if approver_id:
            queryset = queryset.filter(approver_id=approver_id)
        
        return queryset
