"""
Views for Workflow Configuration API.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .workflow_config import (
    WorkflowTemplate,
    WorkflowStatus,
    WorkflowTransition,
    RolePermission,
    WorkflowEngine
)
from .workflow_serializers import (
    WorkflowTemplateSerializer,
    WorkflowTemplateListSerializer,
    WorkflowTemplateCreateSerializer,
    WorkflowStatusSerializer,
    WorkflowTransitionSerializer,
    RolePermissionSerializer,
    JobCardWorkflowSerializer,
    PerformTransitionSerializer,
    AllowedTransitionSerializer,
    get_default_statuses,
    get_default_transitions,
    get_default_role_permissions
)
from .models import JobCard


class IsAdminUser(permissions.BasePermission):
    """Permission class for admin users only."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['super_admin', 'company_admin', 'branch_admin']


class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflow templates.
    Only admins can create/update/delete templates.
    """
    
    queryset = WorkflowTemplate.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'initialize_defaults']:
            return [IsAdminUser()]
        return super().get_permissions()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return WorkflowTemplateListSerializer
        elif self.action == 'create':
            return WorkflowTemplateCreateSerializer
        return WorkflowTemplateSerializer
    
    def perform_create(self, serializer):
        """Set created_by and company, and initialize with defaults if requested."""
        user = self.request.user
        
        # Determine company context
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        
        # Super admin can create global templates (no company, no branch)
        # Template branch should also belong to the same company
        template = serializer.save(created_by=user, company=company)
        
        # Check if we should initialize with defaults
        if self.request.data.get('initialize_defaults', True):
            self._initialize_template_defaults(template)
    
    def get_queryset(self):
        """Filter templates based on user role and company."""
        user = self.request.user
        
        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return WorkflowTemplate.objects.none()

        # Super admin sees everything
        if user.role == 'super_admin' or user.is_superuser:
            queryset = WorkflowTemplate.objects.all_companies()
        # Company admin sees company templates + global ones
        elif user.role == 'company_admin':
            queryset = WorkflowTemplate.objects.all_companies().filter(
                models.Q(company=company) | models.Q(company__isnull=True)
            )
        # Branch admins can only see their branch templates and company/global ones
        elif user.role == 'branch_admin' and user.branch:
            queryset = WorkflowTemplate.objects.all_companies().filter(
                models.Q(branch=user.branch) | 
                models.Q(company=company) | 
                models.Q(company__isnull=True)
            )
        else:
            # Other roles can only see active templates within their company context
            queryset = WorkflowTemplate.objects.filter(company=company)
            queryset = queryset.filter(is_active=True)
        
        return queryset.select_related('branch', 'created_by', 'company')
    
    
    def _initialize_template_defaults(self, template):
        """Initialize a new template with default statuses, transitions, and permissions."""
        # Create default statuses
        for status_data in get_default_statuses():
            WorkflowStatus.objects.create(template=template, company=template.company, **status_data)
        
        # Create default transitions
        for transition_data in get_default_transitions():
            WorkflowTransition.objects.create(template=template, company=template.company, **transition_data)
        
        # Create default role permissions
        for perm_data in get_default_role_permissions():
            RolePermission.objects.create(template=template, company=template.company, **perm_data)
    
    @action(detail=False, methods=['post'])
    def initialize_defaults(self, request):
        """
        Initialize the global default workflow template.
        Creates a new default template if one doesn't exist.
        """
        # Check if global default already exists
        existing = WorkflowTemplate.objects.filter(
            branch__isnull=True,
            service_category__isnull=True,
            is_default=True
        ).first()
        
        if existing:
            return Response({
                'message': 'Global default template already exists',
                'template': WorkflowTemplateSerializer(existing).data
            })
        
        # Create new global/company default
        company = request.user.company if hasattr(request.user, 'company') else None
        template = WorkflowTemplate.objects.create(
            name='Default Workflow',
            description='Standard workflow for all car detailing services',
            is_default=True,
            is_active=True,
            created_by=request.user,
            company=company
        )
        
        self._initialize_template_defaults(template)
        
        return Response({
            'message': 'Global default template created successfully',
            'template': WorkflowTemplateSerializer(template).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate an existing template with a new name and optional customizations.
        """
        template = self.get_object()
        
        new_name = request.data.get('name', f"{template.name} (Copy)")
        new_branch = request.data.get('branch')
        new_category = request.data.get('service_category')
        
        # Create the new template
        new_template = WorkflowTemplate.objects.create(
            name=new_name,
            description=template.description,
            branch_id=new_branch,
            service_category=new_category,
            is_default=False,
            is_active=True,
            skip_customer_approval=template.skip_customer_approval,
            skip_floor_manager_final_qc=template.skip_floor_manager_final_qc,
            require_supervisor_review=template.require_supervisor_review,
            auto_assign_applicators=template.auto_assign_applicators,
            created_by=request.user,
            company=template.company
        )
        
        # Copy statuses
        for status_obj in template.statuses.all():
            WorkflowStatus.objects.create(
                template=new_template,
                company=new_template.company,
                status_code=status_obj.status_code,
                display_name=status_obj.display_name,
                description=status_obj.description,
                status_type=status_obj.status_type,
                order=status_obj.order,
                is_active_status=status_obj.is_active_status,
                is_terminal=status_obj.is_terminal,
                max_duration_hours=status_obj.max_duration_hours
            )
        
        # Copy transitions
        for transition in template.transitions.all():
            WorkflowTransition.objects.create(
                template=new_template,
                company=new_template.company,
                from_status=transition.from_status,
                to_status=transition.to_status,
                action_name=transition.action_name,
                action_description=transition.action_description,
                allowed_roles=transition.allowed_roles,
                requires_assignment=transition.requires_assignment,
                requires_notes=transition.requires_notes,
                requires_photos=transition.requires_photos,
                condition_field=transition.condition_field,
                condition_value=transition.condition_value,
                is_active=transition.is_active
            )
        
        # Copy role permissions
        for perm in template.role_permissions.all():
            RolePermission.objects.create(
                template=new_template,
                company=new_template.company,
                role=perm.role,
                can_view_all_jobs=perm.can_view_all_jobs,
                can_view_branch_jobs=perm.can_view_branch_jobs,
                can_view_assigned_jobs=perm.can_view_assigned_jobs,
                can_create_jobcard=perm.can_create_jobcard,
                can_assign_staff=perm.can_assign_staff,
                can_perform_qc=perm.can_perform_qc,
                can_approve_qc=perm.can_approve_qc,
                can_execute_work=perm.can_execute_work,
                can_perform_final_qc=perm.can_perform_final_qc,
                can_generate_invoice=perm.can_generate_invoice,
                can_deliver_vehicle=perm.can_deliver_vehicle,
                can_close_job=perm.can_close_job,
                can_add_parts=perm.can_add_parts,
                can_manage_parts_inventory=perm.can_manage_parts_inventory,
                inherits_from=perm.inherits_from
            )
        
        return Response({
            'message': 'Template duplicated successfully',
            'template': WorkflowTemplateSerializer(new_template).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def validate_workflow(self, request, pk=None):
        """
        Validate workflow integrity before saving changes.
        Checks for duplicates, loops, orphaned statuses, dead ends.
        """
        template = self.get_object()
        is_valid, errors, warnings = WorkflowEngine.validate_workflow_integrity(template)
        
        return Response({
            'is_valid': is_valid,
            'errors': errors,
            'warnings': warnings
        })
    
    # ==================== Phase 2: Advanced Validation Endpoints ====================
    
    @action(detail=True, methods=['get'], url_path='detect-conflicts')
    def detect_permission_conflicts(self, request, pk=None):
        """
        Detect permission conflicts and inconsistencies in workflow transitions.
        
        Returns conflicts, warnings, and recommendations.
        """
        template = self.get_object()
        result = WorkflowEngine.detect_permission_conflicts(template)
        return Response(result)
    
    @action(detail=True, methods=['get'], url_path='analyze-paths')
    def analyze_workflow_paths(self, request, pk=None):
        """
        Analyze all possible paths through the workflow.
        
        Returns path analysis including:
        - Average path length
        - Bottlenecks
        - Alternative routes
        """
        template = self.get_object()
        result = WorkflowEngine.analyze_workflow_paths(template)
        return Response(result)
    
    @action(detail=True, methods=['get'], url_path='coverage-report')
    def get_coverage_report(self, request, pk=None):
        """
        Generate a coverage report showing which roles can perform which actions.
        """
        template = self.get_object()
        result = WorkflowEngine.get_workflow_coverage_report(template)
        return Response(result)
    
    @action(detail=True, methods=['get'], url_path='optimization-suggestions')
    def get_optimization_suggestions(self, request, pk=None):
        """
        Get optimization suggestions for the workflow.
        
        Returns actionable suggestions categorized by priority.
        """
        template = self.get_object()
        result = WorkflowEngine.get_optimization_suggestions(template)
        return Response(result)
    
    @action(detail=True, methods=['get'], url_path='comprehensive-analysis')
    def comprehensive_analysis(self, request, pk=None):
        """
        Run all analysis and validation checks and return a complete report.
        
        Includes:
        - Workflow integrity validation
        - Permission conflict detection
        - Path analysis
        - Coverage report
        - Optimization suggestions
        - Overall health score (0-100)
        """
        template = self.get_object()
        report = WorkflowEngine.comprehensive_workflow_analysis(template)
        return Response(report)
    
    @action(detail=True, methods=['post'])
    def reset_to_default(self, request, pk=None):
        """
        Reset template to default configuration.
        Removes all custom transitions and restores defaults.
        """
        template = self.get_object()
        
        # Log the reset action
        from .workflow_config import WorkflowChangeLog
        WorkflowChangeLog.objects.create(
            change_type='template_updated',
            template=template,
            changed_by=request.user,
            object_type='template',
            object_id=template.id,
            old_values={'action': 'custom_configuration'},
            new_values={'action': 'reset_to_default'},
            change_reason='Template reset to default configuration',
            ip_address=self._get_client_ip(request),
            company=template.company
        )
        
        # Delete existing transitions and statuses
        template.transitions.all().delete()
        template.statuses.all().delete()
        template.role_permissions.all().delete()
        
        # Reinitialize with defaults
        self._initialize_template_defaults(template)
        
        return Response({
            'message': 'Template reset to default successfully',
            'template': WorkflowTemplateSerializer(template).data
        }, status=status.HTTP_200_OK)
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @action(detail=True, methods=['get', 'post'])
    def statuses(self, request, pk=None):
        """Get or add statuses for this template."""
        template = self.get_object()
        
        if request.method == 'GET':
            statuses = template.statuses.all()
            serializer = WorkflowStatusSerializer(statuses, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            if request.user.role not in ['super_admin', 'company_admin', 'branch_admin']:
                raise PermissionDenied("Only admins can add statuses")
            
            serializer = WorkflowStatusSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(template=template)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get', 'post'])
    def transitions(self, request, pk=None):
        """Get or add transitions for this template."""
        template = self.get_object()
        
        if request.method == 'GET':
            transitions = template.transitions.all()
            serializer = WorkflowTransitionSerializer(transitions, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            if request.user.role not in ['super_admin', 'company_admin', 'branch_admin']:
                raise PermissionDenied("Only admins can add transitions")
            
            serializer = WorkflowTransitionSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(template=template)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get', 'post'])
    def permissions(self, request, pk=None):
        """Get or add role permissions for this template."""
        template = self.get_object()
        
        if request.method == 'GET':
            perms = template.role_permissions.all()
            serializer = RolePermissionSerializer(perms, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            if request.user.role not in ['super_admin', 'company_admin', 'branch_admin']:
                raise PermissionDenied("Only admins can add permissions")
            
            serializer = RolePermissionSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(template=template)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def user_permissions(self, request):
        """
        Get the current user's effective workflow permissions.
        Returns permissions based on workflow configuration or defaults.
        """
        user = request.user
        permissions_dict = WorkflowEngine.get_user_permissions(user)
        
        return Response(permissions_dict)


class WorkflowStatusViewSet(viewsets.ModelViewSet):
    """ViewSet for managing individual workflow statuses."""
    
    queryset = WorkflowStatus.objects.all()
    serializer_class = WorkflowStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        return queryset


class WorkflowTransitionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing individual workflow transitions."""
    
    queryset = WorkflowTransition.objects.all()
    serializer_class = WorkflowTransitionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new transition with validation and audit logging."""
        from .workflow_config import WorkflowChangeLog, WorkflowEngine
        from django.db import transaction
        
        with transaction.atomic():
            # Validate before creating
            template_id = request.data.get('template')
            from_status = request.data.get('from_status')
            to_status = request.data.get('to_status')
            
            if not template_id:
                return Response(
                    {'error': 'Template ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check for duplicate transition
            existing = WorkflowTransition.objects.filter(
                template_id=template_id,
                from_status=from_status,
                to_status=to_status
            ).first()
            
            if existing:
                return Response(
                    {'error': f'Transition from {from_status} to {to_status} already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check for self-loop
            if from_status == to_status:
                return Response(
                    {'error': 'Cannot create transition from a status to itself (infinite loop)'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create the transition
            response = super().create(request, *args, **kwargs)
            
            if response.status_code == status.HTTP_201_CREATED:
                transition = WorkflowTransition.objects.get(id=response.data['id'])
                
                # Validate workflow integrity after creation
                template = transition.template
                is_valid, errors, warnings = WorkflowEngine.validate_workflow_integrity(template)
                
                if not is_valid:
                    # Rollback the creation
                    transition.delete()
                    return Response(
                        {'error': 'Creating this transition would break workflow integrity', 'details': errors},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Log the creation
                WorkflowChangeLog.objects.create(
                    change_type='transition_created',
                    template=transition.template,
                    changed_by=request.user,
                    object_type='transition',
                    object_id=transition.id,
                    old_values={},
                    new_values={
                        'from_status': transition.from_status,
                        'to_status': transition.to_status,
                        'action_name': transition.action_name,
                        'allowed_roles': transition.allowed_roles,
                    },
                    change_reason=f'Created transition: {from_status} → {to_status}',
                    ip_address=self._get_client_ip(request),
                    company=transition.company
                )
                
                # Add warnings to response if any
                if warnings:
                    response.data['warnings'] = warnings
            
            return response
    
    def update(self, request, *args, **kwargs):
        """Update transition with audit logging."""
        from .workflow_config import WorkflowChangeLog, WorkflowEngine
        from django.db import transaction
        
        with transaction.atomic():
            transition = self.get_object()
        
            # Store old values
            old_values = {
                'from_status': transition.from_status,
                'to_status': transition.to_status,
                'action_name': transition.action_name,
                'action_description': transition.action_description,
                'allowed_roles': list(transition.allowed_roles) if transition.allowed_roles else [],
                'requires_assignment': transition.requires_assignment,
                'requires_notes': transition.requires_notes,
                'requires_photos': transition.requires_photos,
                'is_active': transition.is_active,
            }
            
            # Perform update
            response = super().update(request, *args, **kwargs)
            
            if response.status_code == status.HTTP_200_OK:
                transition.refresh_from_db()
                
                # Validate workflow integrity after update
                is_valid, errors, warnings = WorkflowEngine.validate_workflow_integrity(transition.template)
                
                if not is_valid:
                    # Revert the changes to maintain integrity
                    for field, value in old_values.items():
                        setattr(transition, field, value)
                    transition.save()
                    
                    return Response(
                        {'error': 'This change would break workflow integrity', 'details': errors},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Add warnings to response if any
                if warnings:
                    response.data['warnings'] = warnings
                
                # Log the update
                new_values = {
                    'from_status': transition.from_status,
                    'to_status': transition.to_status,
                    'action_name': transition.action_name,
                    'action_description': transition.action_description,
                    'allowed_roles': transition.allowed_roles,
                    'requires_assignment': transition.requires_assignment,
                    'requires_notes': transition.requires_notes,
                    'requires_photos': transition.requires_photos,
                    'is_active': transition.is_active,
                }
                
                WorkflowChangeLog.objects.create(
                    change_type='transition_updated',
                    template=transition.template,
                    changed_by=request.user,
                    object_type='transition',
                    object_id=transition.id,
                    old_values=old_values,
                    new_values=new_values,
                    change_reason=f'Updated transition: {transition.from_status} → {transition.to_status}',
                    ip_address=self._get_client_ip(request),
                    company=transition.company
                )
            
            return response
    
    def destroy(self, request, *args, **kwargs):
        """Delete transition with validation and audit logging."""
        from .workflow_config import WorkflowChangeLog, WorkflowEngine
        
        transition = self.get_object()
        template = transition.template
        
        # Store values before deletion
        old_values = {
            'from_status': transition.from_status,
            'to_status': transition.to_status,
            'action_name': transition.action_name,
        }
        
        # Check if deleting this would break the workflow
        # Temporarily mark as inactive to test
        transition.is_active = False
        transition.save()
        
        is_valid, errors, warnings = WorkflowEngine.validate_workflow_integrity(template)
        
        if not is_valid:
            # Restore
            transition.is_active = True
            transition.save()
            return Response(
                {'error': 'Cannot delete this transition as it would break workflow integrity', 'details': errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Log the deletion
        WorkflowChangeLog.objects.create(
            change_type='transition_deleted',
            template=template,
            changed_by=request.user,
            object_type='transition',
            object_id=transition.id,
            old_values=old_values,
            new_values={},
            change_reason=f'Deleted transition: {old_values["from_status"]} → {old_values["to_status"]}',
            ip_address=self._get_client_ip(request),
            company=transition.company
        )
        
        # Perform deletion
        return super().destroy(request, *args, **kwargs)
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @action(detail=False, methods=['post'], url_path='bulk-update-permissions')
    def bulk_update_permissions(self, request):
        """
        Bulk add or remove a role from multiple transitions.
        
        Body:
        {
            "role": "branch_admin",
            "action": "add",  // or "remove"
            "template_id": 1,  // optional
            "transition_pattern": "billing",  // optional, keywords to match in action names
            "transition_ids": [1, 2, 3]  // optional, specific transitions
        }
        """
        from .workflow_config import WorkflowEngine, WorkflowTemplate
        
        role = request.data.get('role')
        action = request.data.get('action', 'add')
        template_id = request.data.get('template_id')
        transition_pattern = request.data.get('transition_pattern')
        transition_ids = request.data.get('transition_ids')
        
        if not role:
            return Response(
                {'error': 'role is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action not in ['add', 'remove']:
            return Response(
                {'error': 'action must be "add" or "remove"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get template if specified
        template = None
        if template_id:
            try:
                template = WorkflowTemplate.objects.get(id=template_id)
            except WorkflowTemplate.DoesNotExist:
                return Response(
                    {'error': f'Template with id {template_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Build transition filter
        transition_filter = {}
        if transition_pattern:
            transition_filter['action_name__icontains'] = transition_pattern
        
        if transition_ids:
            transition_filter['id__in'] = transition_ids
        
        # Get user's company for multi-tenancy
        company = request.user.company if hasattr(request.user, 'company') else None
        
        # Perform bulk update
        result = WorkflowEngine.bulk_update_transition_permissions(
            role=role,
            action=action,
            template=template,
            transition_filter=transition_filter if transition_filter else None,
            company=company
        )
        
        return Response({
            'message': f'Bulk permission update completed',
            'result': result
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='sync-role')
    def sync_role(self, request):
        """
        Sync a role across all workflow templates for specific transition types.
        
        Body:
        {
            "role": "branch_admin",
            "action": "add",  // or "remove"
            "transition_pattern": "billing"  // optional, keywords to match
        }
        """
        from .workflow_config import WorkflowEngine
        
        role = request.data.get('role')
        action = request.data.get('action', 'add')
        transition_pattern = request.data.get('transition_pattern')
        
        if not role:
            return Response(
                {'error': 'role is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action not in ['add', 'remove']:
            return Response(
                {'error': 'action must be "add" or "remove"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user's company for multi-tenancy
        company = request.user.company if hasattr(request.user, 'company') else None
        
        # Perform sync across all templates
        result = WorkflowEngine.sync_role_across_workflow_types(
            role=role,
            action=action,
            transition_pattern=transition_pattern,
            company=company
        )
        
        return Response({
            'message': f'Role sync completed across {result["templates_processed"]} templates',
            'result': result
        }, status=status.HTTP_200_OK)


class RolePermissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing individual role permissions."""
    
    queryset = RolePermission.objects.all()
    serializer_class = RolePermissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        return queryset


# Import models for Q objects
from django.db import models
