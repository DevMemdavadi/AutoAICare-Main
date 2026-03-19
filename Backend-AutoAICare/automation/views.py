from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from datetime import timedelta

from .models import (
    WorkflowTemplate, WorkflowExecution, WorkflowAnalytics
)
from .serializers import (
    WorkflowTemplateSerializer, WorkflowTemplateCreateSerializer,
    WorkflowExecutionSerializer, WorkflowExecutionListSerializer,
    WorkflowAnalyticsSerializer, WorkflowTestSerializer
)
from .services import workflow_engine
from customers.models import Customer


class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflow templates
    """
    queryset = WorkflowTemplate.objects.all().prefetch_related('trigger', 'actions')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'trigger_type']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = WorkflowTemplate.objects.all().prefetch_related('trigger', 'actions')

        # Scope by company: workflows are scoped to the company of the user who created them
        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(created_by__company=user.company)
        elif user.role not in ['super_admin']:
            # Branch-level users see workflows created within their company
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if company:
                queryset = queryset.filter(created_by__company=company)
            else:
                return queryset.none()

        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return WorkflowTemplateCreateSerializer
        return WorkflowTemplateSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a workflow"""
        workflow = self.get_object()
        workflow.is_active = True
        workflow.save()
        return Response({
            'message': 'Workflow activated successfully',
            'workflow': WorkflowTemplateSerializer(workflow).data
        })
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a workflow"""
        workflow = self.get_object()
        workflow.is_active = False
        workflow.save()
        return Response({
            'message': 'Workflow deactivated successfully',
            'workflow': WorkflowTemplateSerializer(workflow).data
        })
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test a workflow with sample data"""
        workflow = self.get_object()
        serializer = WorkflowTestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            customer = Customer.objects.get(id=serializer.validated_data['customer_id'])

            # Guard: non-super_admin can only test with customers from their own company
            if request.user.role != 'super_admin':
                user_company = getattr(request.user, 'company', None) or (
                    request.user.branch.company if getattr(request.user, 'branch', None) else None
                )
                if user_company and customer.company_id != user_company.id:
                    return Response(
                        {'error': 'You can only test workflows using customers from your own company.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            context_data = serializer.validated_data.get('context_data', {})

            # Execute workflow
            execution = workflow_engine.execute_workflow(
                workflow=workflow,
                customer=customer,
                reference_type='test',
                reference_id=0,
                context_data=context_data
            )

            return Response({
                'message': 'Workflow test executed successfully',
                'execution': WorkflowExecutionSerializer(execution).data
            })

        except Customer.DoesNotExist:
            return Response(
                {'error': 'Customer not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for a workflow"""
        workflow = self.get_object()
        
        # Get date range from query params
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        analytics = WorkflowAnalytics.objects.filter(
            workflow=workflow,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        serializer = WorkflowAnalyticsSerializer(analytics, many=True)
        
        # Calculate summary
        total_executions = sum(a.total_executions for a in analytics)
        successful_executions = sum(a.successful_executions for a in analytics)
        failed_executions = sum(a.failed_executions for a in analytics)
        
        return Response({
            'workflow': WorkflowTemplateSerializer(workflow).data,
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': days
            },
            'summary': {
                'total_executions': total_executions,
                'successful_executions': successful_executions,
                'failed_executions': failed_executions,
                'success_rate': round((successful_executions / total_executions * 100) if total_executions > 0 else 0, 2),
                'total_customers_reached': sum(a.total_customers_reached for a in analytics)
            },
            'daily_analytics': serializer.data
        })


class WorkflowExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing workflow executions
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'workflow', 'customer']
    search_fields = ['workflow__name', 'customer__name', 'customer__phone']
    ordering_fields = ['triggered_at', 'completed_at']
    ordering = ['-triggered_at']

    def get_queryset(self):
        user = self.request.user
        queryset = WorkflowExecution.objects.all().select_related(
            'workflow', 'customer'
        ).prefetch_related('logs')

        # Scope executions by the customer's company
        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(customer__company=user.company)
        elif user.role != 'super_admin':
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if company:
                queryset = queryset.filter(customer__company=company)
            else:
                return queryset.none()

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkflowExecutionListSerializer
        return WorkflowExecutionSerializer
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent workflow executions"""
        limit = int(request.query_params.get('limit', 10))
        executions = self.get_queryset()[:limit]
        serializer = WorkflowExecutionListSerializer(executions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def failed(self, request):
        """Get failed workflow executions"""
        executions = self.get_queryset().filter(status='failed')
        page = self.paginate_queryset(executions)
        if page is not None:
            serializer = WorkflowExecutionListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = WorkflowExecutionListSerializer(executions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get execution statistics"""
        # Get date range from query params
        days = int(request.query_params.get('days', 7))
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        executions = self.get_queryset().filter(
            triggered_at__gte=start_date,
            triggered_at__lte=end_date
        )
        
        total = executions.count()
        completed = executions.filter(status='completed').count()
        failed = executions.filter(status='failed').count()
        pending = executions.filter(status='pending').count()
        running = executions.filter(status='running').count()
        
        return Response({
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': days
            },
            'stats': {
                'total': total,
                'completed': completed,
                'failed': failed,
                'pending': pending,
                'running': running,
                'success_rate': round((completed / total * 100) if total > 0 else 0, 2)
            }
        })


class WorkflowAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing workflow analytics
    """
    serializer_class = WorkflowAnalyticsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['workflow', 'date']
    ordering_fields = ['date']
    ordering = ['-date']

    def get_queryset(self):
        user = self.request.user
        queryset = WorkflowAnalytics.objects.all().select_related('workflow')

        # Scope analytics by the company that owns the workflow (via created_by)
        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(workflow__created_by__company=user.company)
        elif user.role != 'super_admin':
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if company:
                queryset = queryset.filter(workflow__created_by__company=company)
            else:
                return queryset.none()

        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get overall analytics summary"""
        # Get date range from query params
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        analytics = self.get_queryset().filter(
            date__gte=start_date,
            date__lte=end_date
        )
        
        total_executions = sum(a.total_executions for a in analytics)
        successful_executions = sum(a.successful_executions for a in analytics)
        failed_executions = sum(a.failed_executions for a in analytics)
        total_customers_reached = sum(a.total_customers_reached for a in analytics)
        
        # Get top performing workflows
        workflow_stats = {}
        for a in analytics:
            if a.workflow_id not in workflow_stats:
                workflow_stats[a.workflow_id] = {
                    'workflow': a.workflow,
                    'total_executions': 0,
                    'successful_executions': 0,
                    'failed_executions': 0
                }
            workflow_stats[a.workflow_id]['total_executions'] += a.total_executions
            workflow_stats[a.workflow_id]['successful_executions'] += a.successful_executions
            workflow_stats[a.workflow_id]['failed_executions'] += a.failed_executions
        
        top_workflows = sorted(
            workflow_stats.values(),
            key=lambda x: x['total_executions'],
            reverse=True
        )[:5]
        
        return Response({
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': days
            },
            'summary': {
                'total_executions': total_executions,
                'successful_executions': successful_executions,
                'failed_executions': failed_executions,
                'success_rate': round((successful_executions / total_executions * 100) if total_executions > 0 else 0, 2),
                'total_customers_reached': total_customers_reached
            },
            'top_workflows': [
                {
                    'workflow_id': w['workflow'].id,
                    'workflow_name': w['workflow'].name,
                    'total_executions': w['total_executions'],
                    'success_rate': round((w['successful_executions'] / w['total_executions'] * 100) if w['total_executions'] > 0 else 0, 2)
                }
                for w in top_workflows
            ]
        })
