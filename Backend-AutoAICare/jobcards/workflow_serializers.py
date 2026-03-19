"""
Serializers for Workflow Configuration API.
"""

from rest_framework import serializers
from .workflow_config import (
    WorkflowTemplate,
    WorkflowStatus,
    WorkflowTransition,
    RolePermission,
    WorkflowEngine
)
from companies.serializers import TenantSerializerMixin


class WorkflowStatusSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for workflow statuses."""
    
    class Meta:
        model = WorkflowStatus
        fields = [
            'id', 'status_code', 'display_name', 'description',
            'status_type', 'order', 'is_active_status', 'is_terminal',
            'max_duration_hours', 'company'
        ]
        read_only_fields = ['id', 'company']


class WorkflowTransitionSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for workflow transitions."""
    
    class Meta:
        model = WorkflowTransition
        fields = [
            'id', 'from_status', 'to_status', 'action_name',
            'action_description', 'allowed_roles', 'requires_assignment',
            'requires_notes', 'requires_photos', 'condition_field',
            'condition_value', 'is_active', 'company'
        ]
        read_only_fields = ['id', 'company']


class RolePermissionSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for role permissions."""
    
    effective_permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = RolePermission
        fields = [
            'id', 'role', 'can_view_all_jobs', 'can_view_branch_jobs',
            'can_view_assigned_jobs', 'can_create_jobcard', 'can_assign_staff',
            'can_perform_qc', 'can_approve_qc', 'can_execute_work',
            'can_perform_final_qc', 'can_generate_invoice', 'can_deliver_vehicle',
            'can_close_job', 'can_add_parts', 'inherits_from', 'effective_permissions', 'company'
        ]
        read_only_fields = ['id', 'company']
    
    def get_effective_permissions(self, obj):
        return obj.get_effective_permissions()


class WorkflowTemplateSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Full serializer for workflow templates with nested data."""
    
    statuses = WorkflowStatusSerializer(many=True, read_only=True)
    transitions = WorkflowTransitionSerializer(many=True, read_only=True)
    role_permissions = RolePermissionSerializer(many=True, read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True, allow_null=True)
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'description', 'branch', 'branch_name',
            'service_category', 'is_default', 'is_active',
            'skip_customer_approval', 'skip_floor_manager_final_qc',
            'require_supervisor_review', 'auto_assign_applicators',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'statuses', 'transitions', 'role_permissions', 'company'
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at', 'created_by']


class WorkflowTemplateListSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Lightweight serializer for listing templates."""
    
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    status_count = serializers.SerializerMethodField()
    transition_count = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'description', 'branch', 'branch_name',
            'service_category', 'is_default', 'is_active',
            'skip_customer_approval', 'skip_floor_manager_final_qc',
            'created_at', 'status_count', 'transition_count', 'company'
        ]
        read_only_fields = ['id', 'company']
    
    def get_status_count(self, obj):
        return obj.statuses.count()
    
    def get_transition_count(self, obj):
        return obj.transitions.count()


class WorkflowTemplateCreateSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for creating workflow templates."""
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'name', 'description', 'branch', 'service_category',
            'is_default', 'is_active', 'skip_customer_approval',
            'skip_floor_manager_final_qc', 'require_supervisor_review',
            'auto_assign_applicators', 'company'
        ]
        read_only_fields = ['id', 'company']


class AllowedTransitionSerializer(serializers.Serializer):
    """Serializer for allowed transitions response."""
    
    from_status = serializers.CharField()
    to_status = serializers.CharField()
    action_name = serializers.CharField()
    action_description = serializers.CharField(allow_null=True)
    requires_notes = serializers.BooleanField()
    requires_photos = serializers.BooleanField()


class JobCardWorkflowSerializer(serializers.Serializer):
    """Serializer for job card workflow info."""
    
    current_status = serializers.CharField()
    current_status_display = serializers.CharField()
    template_name = serializers.CharField(allow_null=True)
    allowed_transitions = AllowedTransitionSerializer(many=True)
    user_permissions = serializers.DictField()
    workflow_settings = serializers.DictField()


class PerformTransitionSerializer(serializers.Serializer):
    """Serializer for performing a workflow transition."""
    
    target_status = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    photos = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )


# ============================================================================
# Default Workflow Template Data
# ============================================================================

def get_default_statuses():
    """Get the default status configuration for a new template."""
    return [
        {'status_code': 'created', 'display_name': 'Job Card Created', 'status_type': 'initial', 'order': 1},
        {'status_code': 'qc_pending', 'display_name': 'QC Pending', 'status_type': 'qc', 'order': 2},
        {'status_code': 'qc_completed', 'display_name': 'QC Completed', 'status_type': 'qc', 'order': 3},
        {'status_code': 'qc_rejected', 'display_name': 'QC Rejected', 'status_type': 'qc', 'order': 4},
        {'status_code': 'supervisor_approved', 'display_name': 'Supervisor Approved', 'status_type': 'approval', 'order': 5},
        {'status_code': 'supervisor_rejected', 'display_name': 'Supervisor Rejected', 'status_type': 'approval', 'order': 6},
        {'status_code': 'floor_manager_confirmed', 'display_name': 'Floor Manager Confirmed', 'status_type': 'approval', 'order': 7},
        {'status_code': 'assigned_to_applicator', 'display_name': 'Assigned to Applicator', 'status_type': 'work', 'order': 8},
        {'status_code': 'work_in_progress', 'display_name': 'Work In Progress', 'status_type': 'work', 'order': 9},
        {'status_code': 'work_completed', 'display_name': 'Work Completed', 'status_type': 'work', 'order': 10},
        {'status_code': 'final_qc_pending', 'display_name': 'Final QC Pending', 'status_type': 'final_qc', 'order': 11},
        {'status_code': 'final_qc_passed', 'display_name': 'Final QC Passed', 'status_type': 'final_qc', 'order': 12},
        {'status_code': 'final_qc_failed', 'display_name': 'Final QC Failed', 'status_type': 'final_qc', 'order': 13},
        {'status_code': 'floor_manager_final_qc_confirmed', 'display_name': 'FM Final QC Confirmed', 'status_type': 'approval', 'order': 14},
        {'status_code': 'customer_approval_pending', 'display_name': 'Customer Approval Pending', 'status_type': 'customer', 'order': 15},
        {'status_code': 'customer_approved', 'display_name': 'Customer Approved', 'status_type': 'customer', 'order': 16},
        {'status_code': 'customer_revision_requested', 'display_name': 'Revision Requested', 'status_type': 'customer', 'order': 17},
        {'status_code': 'ready_for_billing', 'display_name': 'Ready for Billing', 'status_type': 'billing', 'order': 18},
        {'status_code': 'billed', 'display_name': 'Billed', 'status_type': 'billing', 'order': 19},
        {'status_code': 'ready_for_delivery', 'display_name': 'Ready for Delivery', 'status_type': 'delivery', 'order': 20},
        {'status_code': 'delivered', 'display_name': 'Delivered', 'status_type': 'delivery', 'order': 21},
        {'status_code': 'closed', 'display_name': 'Closed', 'status_type': 'terminal', 'order': 22, 'is_terminal': True},
    ]


def get_default_transitions():
    """Get the default transition configuration for a new template."""
    return [
        # Initial to QC
        {'from_status': 'created', 'to_status': 'qc_pending', 'action_name': 'Start QC', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']},
        
        # QC Flow
        {'from_status': 'qc_pending', 'to_status': 'qc_completed', 'action_name': 'Complete QC', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager'], 'requires_assignment': True},
        {'from_status': 'qc_pending', 'to_status': 'qc_rejected', 'action_name': 'Reject QC', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager'], 'requires_notes': True},
        
        # Supervisor Review
        {'from_status': 'qc_completed', 'to_status': 'supervisor_approved', 'action_name': 'Approve QC', 'allowed_roles': ['super_admin', 'company_admin', 'supervisor']},
        {'from_status': 'qc_completed', 'to_status': 'supervisor_rejected', 'action_name': 'Reject QC', 'allowed_roles': ['super_admin', 'company_admin', 'supervisor'], 'requires_notes': True},
        {'from_status': 'supervisor_rejected', 'to_status': 'qc_pending', 'action_name': 'Redo QC', 'allowed_roles': ['super_admin', 'company_admin', 'floor_manager']},
        
        # Floor Manager Confirmation
        {'from_status': 'supervisor_approved', 'to_status': 'floor_manager_confirmed', 'action_name': 'Confirm Supervisor Approval', 'allowed_roles': ['super_admin', 'company_admin', 'floor_manager']},
        {'from_status': 'supervisor_approved', 'to_status': 'supervisor_rejected', 'action_name': 'Reject Supervisor Decision', 'allowed_roles': ['super_admin', 'company_admin', 'floor_manager'], 'requires_notes': True},
        
        # Applicator Assignment
        {'from_status': 'floor_manager_confirmed', 'to_status': 'assigned_to_applicator', 'action_name': 'Assign Applicators', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor']},
        
        # Direct Start (skip assigned_to_applicator — supervisor can start work directly, optionally assigning applicators)
        {'from_status': 'qc_completed', 'to_status': 'work_in_progress', 'action_name': 'Start Work', 'allowed_roles': ['super_admin', 'company_admin', 'supervisor']},
        {'from_status': 'floor_manager_confirmed', 'to_status': 'work_in_progress', 'action_name': 'Start Work', 'allowed_roles': ['super_admin', 'company_admin', 'supervisor']},
        
        # Work Execution
        {'from_status': 'assigned_to_applicator', 'to_status': 'work_in_progress', 'action_name': 'Start Work', 'allowed_roles': ['super_admin', 'company_admin', 'supervisor', 'applicator']},
        {'from_status': 'work_in_progress', 'to_status': 'work_completed', 'action_name': 'Complete Work', 'allowed_roles': ['super_admin', 'company_admin', 'supervisor', 'applicator']},
        
        # Final QC
        {'from_status': 'work_completed', 'to_status': 'final_qc_pending', 'action_name': 'Submit for Final QC', 'allowed_roles': ['super_admin', 'company_admin', 'supervisor']},
        {'from_status': 'final_qc_pending', 'to_status': 'final_qc_passed', 'action_name': 'Pass Final QC', 'allowed_roles': ['super_admin', 'company_admin', 'supervisor'], 'requires_photos': True},
        {'from_status': 'final_qc_pending', 'to_status': 'final_qc_failed', 'action_name': 'Fail Final QC', 'allowed_roles': ['super_admin', 'company_admin', 'supervisor'], 'requires_notes': True},
        {'from_status': 'final_qc_failed', 'to_status': 'work_in_progress', 'action_name': 'Redo Work', 'allowed_roles': ['super_admin', 'company_admin', 'supervisor', 'applicator']},
        
        # FM Final QC Confirmation
        {'from_status': 'final_qc_passed', 'to_status': 'floor_manager_final_qc_confirmed', 'action_name': 'Confirm Final QC', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']},
        {'from_status': 'final_qc_passed', 'to_status': 'work_completed', 'action_name': 'Reject Final QC', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager'], 'requires_notes': True},
        
        # Customer Approval
        {'from_status': 'floor_manager_final_qc_confirmed', 'to_status': 'customer_approval_pending', 'action_name': 'Send for Customer Approval', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']},
        {'from_status': 'customer_approval_pending', 'to_status': 'customer_approved', 'action_name': 'Approve Work', 'allowed_roles': ['customer']},
        {'from_status': 'customer_approval_pending', 'to_status': 'customer_revision_requested', 'action_name': 'Request Revision', 'allowed_roles': ['customer'], 'requires_notes': True},
        {'from_status': 'customer_revision_requested', 'to_status': 'work_in_progress', 'action_name': 'Start Revision', 'allowed_roles': ['super_admin', 'company_admin', 'supervisor', 'applicator']},
        
        # Billing
        {'from_status': 'customer_approved', 'to_status': 'ready_for_billing', 'action_name': 'Mark Ready for Billing', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']},
        {'from_status': 'ready_for_billing', 'to_status': 'billed', 'action_name': 'Generate Invoice', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']},
        
        # Delivery
        {'from_status': 'billed', 'to_status': 'ready_for_delivery', 'action_name': 'Payment Received', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']},
        {'from_status': 'ready_for_delivery', 'to_status': 'delivered', 'action_name': 'Deliver Vehicle', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']},
        
        # Close
        {'from_status': 'delivered', 'to_status': 'closed', 'action_name': 'Close Job', 'allowed_roles': ['super_admin', 'company_admin', 'branch_admin']},
    ]


def get_default_role_permissions():
    """Get the default role permissions for a new template."""
    return [
        {
            'role': 'company_admin',
            'can_view_all_jobs': True,
            'can_view_branch_jobs': True,
            'can_view_assigned_jobs': True,
            'can_create_jobcard': True,
            'can_assign_staff': True,
            'can_perform_qc': True,
            'can_approve_qc': True,
            'can_execute_work': True,
            'can_perform_final_qc': True,
            'can_generate_invoice': True,
            'can_deliver_vehicle': True,
            'can_close_job': True,
            'can_add_parts': True,
        },
        {
            'role': 'super_admin',
            'can_view_all_jobs': True,
            'can_view_branch_jobs': True,
            'can_view_assigned_jobs': True,
            'can_create_jobcard': True,
            'can_assign_staff': True,
            'can_perform_qc': True,
            'can_approve_qc': True,
            'can_execute_work': True,
            'can_perform_final_qc': True,
            'can_generate_invoice': True,
            'can_deliver_vehicle': True,
            'can_close_job': True,
            'can_add_parts': True,
        },
        {
            'role': 'branch_admin',
            'can_view_all_jobs': False,
            'can_view_branch_jobs': True,
            'can_view_assigned_jobs': True,
            'can_create_jobcard': True,
            'can_assign_staff': True,
            'can_perform_qc': False,
            'can_approve_qc': False,
            'can_execute_work': False,
            'can_perform_final_qc': False,
            'can_generate_invoice': True,
            'can_deliver_vehicle': True,
            'can_close_job': True,
            'can_add_parts': True,
        },
        {
            'role': 'floor_manager',
            'can_view_all_jobs': False,
            'can_view_branch_jobs': True,
            'can_view_assigned_jobs': True,
            'can_create_jobcard': False,
            'can_assign_staff': False,
            'can_perform_qc': True,
            'can_approve_qc': True,
            'can_execute_work': False,
            'can_perform_final_qc': False,
            'can_generate_invoice': True,
            'can_deliver_vehicle': True,
            'can_close_job': False,
            'can_add_parts': True,
        },
        {
            'role': 'supervisor',
            'can_view_all_jobs': False,
            'can_view_branch_jobs': True,
            'can_view_assigned_jobs': True,
            'can_create_jobcard': False,
            'can_assign_staff': True,
            'can_perform_qc': False,
            'can_approve_qc': True,
            'can_execute_work': True,
            'can_perform_final_qc': True,
            'can_generate_invoice': False,
            'can_deliver_vehicle': False,
            'can_close_job': False,
            'can_add_parts': True,
        },
        {
            'role': 'applicator',
            'can_view_all_jobs': False,
            'can_view_branch_jobs': False,
            'can_view_assigned_jobs': True,
            'can_create_jobcard': False,
            'can_assign_staff': False,
            'can_perform_qc': False,
            'can_approve_qc': False,
            'can_execute_work': True,
            'can_perform_final_qc': False,
            'can_generate_invoice': False,
            'can_deliver_vehicle': False,
            'can_close_job': False,
            'can_add_parts': True,
        },
        {
            'role': 'customer',
            'can_view_all_jobs': False,
            'can_view_branch_jobs': False,
            'can_view_assigned_jobs': True,
            'can_create_jobcard': False,
            'can_assign_staff': False,
            'can_perform_qc': False,
            'can_approve_qc': False,
            'can_execute_work': False,
            'can_perform_final_qc': False,
            'can_generate_invoice': False,
            'can_deliver_vehicle': False,
            'can_close_job': False,
            'can_add_parts': False,
        },
    ]
