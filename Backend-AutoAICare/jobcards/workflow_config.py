"""
Dynamic Workflow Configuration System

This module provides a configurable workflow engine for job cards,
allowing admins to customize status transitions, role permissions,
and workflow rules per service type or branch.
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from companies.managers import CompanyManager
from django.utils import timezone


class WorkflowTemplate(models.Model):
    """
    A workflow template defines a complete workflow configuration.
    Can be global, branch-specific, or service-type specific.
    """
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='workflow_templates',
        null=True,
        blank=True
    )
    
    objects = CompanyManager()
    
    name = models.CharField(max_length=100, help_text="Template name (e.g., 'Standard Detailing', 'Quick Wash')")
    description = models.TextField(blank=True, null=True)
    
    # Scope of this template
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='workflow_templates',
        help_text="If set, this template applies only to this branch"
    )
    service_category = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="If set, applies to services of this category (e.g., 'detailing', 'wash', 'coating')"
    )
    
    # Template settings
    is_default = models.BooleanField(
        default=False,
        help_text="If true, this is the default template when no specific match is found"
    )
    is_active = models.BooleanField(default=True)
    
    # Optional workflow customizations
    skip_customer_approval = models.BooleanField(
        default=False,
        help_text="Skip customer approval step (e.g., for walk-in customers)"
    )
    skip_floor_manager_final_qc = models.BooleanField(
        default=False,
        help_text="Skip floor manager final QC approval (for smaller operations)"
    )
    require_supervisor_review = models.BooleanField(
        default=True,
        help_text="Require supervisor to review QC before work starts"
    )
    auto_assign_applicators = models.BooleanField(
        default=False,
        help_text="Auto-assign applicators based on availability"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_workflow_templates'
    )
    
    class Meta:
        db_table = 'workflow_templates'
        verbose_name = 'Workflow Template'
        verbose_name_plural = 'Workflow Templates'
        ordering = ['-is_default', 'name']
        # Ensure only one default template per branch/category combination
        constraints = [
            models.UniqueConstraint(
                fields=['branch', 'service_category', 'is_default'],
                condition=models.Q(is_default=True),
                name='unique_default_template'
            )
        ]
    
    def __str__(self):
        scope = []
        if self.branch:
            scope.append(f"Branch: {self.branch.name}")
        if self.service_category:
            scope.append(f"Category: {self.service_category}")
        if not scope:
            scope.append("Global")
        return f"{self.name} ({', '.join(scope)})"
    
    def clean(self):
        # Ensure only one default template per scope
        if self.is_default:
            existing = WorkflowTemplate.objects.filter(
                branch=self.branch,
                service_category=self.service_category,
                is_default=True
            ).exclude(pk=self.pk)
            if existing.exists():
                raise ValidationError("Only one default template allowed per branch/category combination")


class WorkflowStatus(models.Model):
    """
    Defines a status within a workflow template.
    Allows customization of which statuses are used and their order.
    """
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='workflow_statuses',
        null=True,
        blank=True
    )
    
    objects = CompanyManager()
    
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='statuses'
    )
    
    # Status definition
    status_code = models.CharField(
        max_length=50,
        help_text="Internal status code (e.g., 'qc_pending', 'work_in_progress')"
    )
    display_name = models.CharField(
        max_length=100,
        help_text="User-friendly display name"
    )
    description = models.TextField(blank=True, null=True)
    
    # Status type for categorization
    STATUS_TYPES = [
        ('initial', 'Initial'),
        ('qc', 'Quality Check'),
        ('approval', 'Approval'),
        ('work', 'Work Execution'),
        ('final_qc', 'Final QC'),
        ('customer', 'Customer Action'),
        ('billing', 'Billing'),
        ('delivery', 'Delivery'),
        ('terminal', 'Terminal/Closed'),
    ]
    status_type = models.CharField(max_length=20, choices=STATUS_TYPES, default='work')
    
    # Order in the workflow
    order = models.PositiveIntegerField(default=0, help_text="Display order in the workflow")
    
    # Status flags
    is_active_status = models.BooleanField(
        default=True,
        help_text="If false, this status is skipped in this workflow"
    )
    is_terminal = models.BooleanField(
        default=False,
        help_text="Terminal status (job complete or cancelled)"
    )
    
    # Timing requirements
    max_duration_hours = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum time job should stay in this status"
    )
    
    class Meta:
        db_table = 'workflow_statuses'
        verbose_name = 'Workflow Status'
        verbose_name_plural = 'Workflow Statuses'
        ordering = ['template', 'order']
        unique_together = ['template', 'status_code']
    
    def __str__(self):
        return f"{self.template.name}: {self.display_name}"


class WorkflowTransition(models.Model):
    """
    Defines allowed transitions between statuses.
    Controls which status can move to which, and who can perform the transition.
    """
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='workflow_transitions',
        null=True,
        blank=True
    )
    
    objects = CompanyManager()
    
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='transitions'
    )
    
    from_status = models.CharField(
        max_length=50,
        help_text="Source status code"
    )
    to_status = models.CharField(
        max_length=50,
        help_text="Target status code"
    )
    
    # Transition metadata
    action_name = models.CharField(
        max_length=100,
        help_text="Name of the action (e.g., 'Complete QC', 'Start Work')"
    )
    action_description = models.TextField(blank=True, null=True)
    
    # Role-based permissions for this transition
    ROLE_CHOICES = [
        ('company_admin', 'Company Admin'),
        ('super_admin', 'Super Admin'),
        ('branch_admin', 'Branch Admin'),
        ('floor_manager', 'Floor Manager'),
        ('supervisor', 'Supervisor'),
        ('applicator', 'Applicator'),
        ('customer', 'Customer'),
    ]
    allowed_roles = models.JSONField(
        default=list,
        help_text="List of roles that can perform this transition"
    )
    
    # Additional transition rules
    requires_assignment = models.BooleanField(
        default=True,
        help_text="User must be assigned to the job to perform this transition"
    )
    requires_notes = models.BooleanField(
        default=False,
        help_text="Notes/reason required for this transition"
    )
    requires_photos = models.BooleanField(
        default=False,
        help_text="Photos required for this transition"
    )
    
    # Conditional transitions
    condition_field = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Field to check for conditional transition (e.g., 'qc_report.is_completed')"
    )
    condition_value = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Required value for the condition field"
    )
    
    is_active = models.BooleanField(default=True)
    
    # Display order in the workflow
    order = models.PositiveIntegerField(
        default=0,
        help_text="Order of this transition in the workflow sequence"
    )
    
    class Meta:
        db_table = 'workflow_transitions'
        verbose_name = 'Workflow Transition'
        verbose_name_plural = 'Workflow Transitions'
        ordering = ['template', 'order', 'from_status']
        unique_together = ['template', 'from_status', 'to_status']
    
    def __str__(self):
        return f"{self.template.name}: {self.from_status} → {self.to_status}"
    
    def can_user_perform(self, user, jobcard=None):
        """Check if a user can perform this transition."""
        # Check role
        if user.role not in self.allowed_roles:
            # Super admin and company admin can always perform any transition
            if user.role not in ['super_admin', 'company_admin']:
                return False, f"Role '{user.role}' is not allowed for this action"
        
        # Check assignment if required
        if self.requires_assignment and jobcard:
            if user.role == 'floor_manager' and jobcard.floor_manager_id != user.id:
                return False, "You are not assigned as floor manager for this job"
            elif user.role == 'supervisor' and jobcard.supervisor_id != user.id:
                return False, "You are not assigned as supervisor for this job"
            elif user.role == 'applicator':
                if not jobcard.applicator_team.filter(id=user.id).exists():
                    return False, "You are not assigned to this job's applicator team"
        
        return True, "Transition allowed"


class RolePermission(models.Model):
    """
    Dynamic role permissions that can be configured per template.
    Allows role hierarchy and permission inheritance.
    """
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='workflow_role_permissions',
        null=True,
        blank=True
    )
    
    objects = CompanyManager()
    
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='role_permissions'
    )
    
    role = models.CharField(max_length=20)
    
    # Permission flags
    can_view_all_jobs = models.BooleanField(default=False)
    can_view_branch_jobs = models.BooleanField(default=True)
    can_view_assigned_jobs = models.BooleanField(default=True)
    
    can_create_jobcard = models.BooleanField(default=False)
    can_assign_staff = models.BooleanField(default=False)
    can_perform_qc = models.BooleanField(default=False)
    can_approve_qc = models.BooleanField(default=False)
    can_execute_work = models.BooleanField(default=False)
    can_perform_final_qc = models.BooleanField(default=False)
    can_generate_invoice = models.BooleanField(default=False)
    can_deliver_vehicle = models.BooleanField(default=False)
    can_close_job = models.BooleanField(default=False)
    can_add_parts = models.BooleanField(default=False, help_text='Can add parts to job cards')
    can_manage_parts_inventory = models.BooleanField(default=False, help_text='Can manage parts catalog and inventory')
    
    # Role hierarchy - inherit permissions from another role
    inherits_from = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Inherit all permissions from this role"
    )
    
    class Meta:
        db_table = 'role_permissions'
        verbose_name = 'Role Permission'
        verbose_name_plural = 'Role Permissions'
        unique_together = ['template', 'role']
    
    def __str__(self):
        return f"{self.template.name}: {self.role}"
    
    def get_effective_permissions(self):
        """Get all permissions including inherited ones."""
        perms = {
            'can_view_all_jobs': self.can_view_all_jobs,
            'can_view_branch_jobs': self.can_view_branch_jobs,
            'can_view_assigned_jobs': self.can_view_assigned_jobs,
            'can_create_jobcard': self.can_create_jobcard,
            'can_assign_staff': self.can_assign_staff,
            'can_perform_qc': self.can_perform_qc,
            'can_approve_qc': self.can_approve_qc,
            'can_execute_work': self.can_execute_work,
            'can_perform_final_qc': self.can_perform_final_qc,
            'can_generate_invoice': self.can_generate_invoice,
            'can_deliver_vehicle': self.can_deliver_vehicle,
            'can_close_job': self.can_close_job,
            'can_add_parts': self.can_add_parts,
            'can_manage_parts_inventory': self.can_manage_parts_inventory,
        }
        
        if self.inherits_from:
            try:
                parent = RolePermission.objects.get(
                    template=self.template,
                    role=self.inherits_from
                )
                parent_perms = parent.get_effective_permissions()
                # Merge - any True value wins
                for key, value in parent_perms.items():
                    if value:
                        perms[key] = True
            except RolePermission.DoesNotExist:
                pass
        
        return perms


# ============================================================================
# Workflow Engine - Service Layer
# ============================================================================

class WorkflowEngine:
    """
    Engine for processing workflow transitions dynamically.
    Uses workflow templates to determine allowed actions and transitions.
    """
    
    @classmethod
    def get_template_for_jobcard(cls, jobcard):
        """
        Get the appropriate workflow template for a job card.
        Priority (per company): Branch+Category > Branch > Category > Company default > Global default
        Always prefers the company-specific template over the global fallback.
        """
        # Determine jobcard company
        jobcard_company = getattr(jobcard, 'company', None) or (
            jobcard.branch.company if jobcard.branch else None
        )

        service_category = None
        if jobcard.booking and jobcard.booking.package:
            service_category = jobcard.booking.package.category

        branch = jobcard.branch

        from django.db.models import Q

        # We run two passes: first scoped to the jobcard's company,
        # then fall back to global (company__isnull=True) templates.
        def _find_template(qs):
            """Try to find the best template from the given queryset."""
            query_conditions = []

            if branch and service_category:
                query_conditions.append(
                    Q(branch=branch, service_category=service_category, is_active=True)
                )
            if branch:
                query_conditions.append(
                    Q(branch=branch, service_category__isnull=True, is_active=True, is_default=True)
                )
            if service_category:
                query_conditions.append(
                    Q(branch__isnull=True, service_category=service_category, is_active=True)
                )
            # Company/global default
            query_conditions.append(
                Q(branch__isnull=True, service_category__isnull=True, is_default=True, is_active=True)
            )

            combined = query_conditions[0]
            for cond in query_conditions[1:]:
                combined |= cond

            templates = list(qs.filter(combined))

            for cond_idx, _ in enumerate(query_conditions):
                for t in templates:
                    if branch and service_category and t.branch_id == branch.id and t.service_category == service_category:
                        return t
                    elif branch and t.branch_id == branch.id and not t.service_category and t.is_default:
                        return t
                    elif service_category and not t.branch_id and t.service_category == service_category:
                        return t
                    elif not t.branch_id and not t.service_category and t.is_default:
                        return t

            # Catch-all: if no specific match, return any active default template from this queryset
            # (handles legacy templates that have a service_category but should act as company default)
            return qs.filter(is_default=True, is_active=True).order_by('id').first()

        # Pass 1: company-specific templates only
        template = None
        if jobcard_company:
            company_qs = WorkflowTemplate.objects.all_companies().filter(company=jobcard_company)
            template = _find_template(company_qs)

        # Pass 2: global templates (company=NULL) as fallback
        if not template:
            global_qs = WorkflowTemplate.objects.all_companies().filter(company__isnull=True)
            template = _find_template(global_qs)

        return template
    
    @classmethod
    def get_allowed_transitions(cls, jobcard, user, debug=False):
        """
        Get all allowed transitions for a job card given the current user.
        Returns list of transition objects that the user can perform.
        
        Args:
            jobcard: JobCard instance
            user: User instance
            debug: If True, returns debug information
        
        Returns:
            List of allowed transition objects, or dict with debug info if debug=True
        """
        import logging
        logger = logging.getLogger(__name__)
        
        debug_info = {
            'jobcard_id': jobcard.id,
            'jobcard_status': jobcard.status,
            'user_id': user.id,
            'user_role': user.role,
            'user_branch_id': getattr(user, 'branch_id', None),
            'user_company_id': getattr(user, 'company_id', None),
            'template_found': False,
            'template_id': None,
            'template_name': None,
            'transitions_from_status': 0,
            'active_transitions': 0,
            'allowed_transitions': 0,
            'rejected_transitions': [],
            'allowed_transition_details': []
        }
        
        # Step 1: Get template
        template = cls.get_template_for_jobcard(jobcard)
        if not template:
            debug_info['error'] = 'No workflow template found for this job card'
            debug_info['jobcard_branch_id'] = jobcard.branch_id
            debug_info['jobcard_service_category'] = jobcard.booking.package.category if jobcard.booking and jobcard.booking.package else None
            
            if debug:
                logger.warning(f"[WORKFLOW] No template found for JobCard {jobcard.id}")
                return debug_info
            return []
        
        debug_info['template_found'] = True
        debug_info['template_id'] = template.id
        debug_info['template_name'] = template.name
        
        current_status = jobcard.status
        
        # Step 2: Get all transitions from current status
        # Use all_companies() to bypass CompanyManager thread-local filtering —
        # we already scope via template=template which is authoritative.
        all_transitions = WorkflowTransition.objects.all_companies().select_related(
            'template'
        ).filter(
            template=template,
            from_status=current_status
        )
        
        debug_info['transitions_from_status'] = all_transitions.count()
        
        # Step 3: Filter active transitions
        active_transitions = all_transitions.filter(is_active=True)
        debug_info['active_transitions'] = active_transitions.count()
        
        if debug and debug_info['transitions_from_status'] > debug_info['active_transitions']:
            inactive_count = debug_info['transitions_from_status'] - debug_info['active_transitions']
            debug_info['warning'] = f"{inactive_count} transition(s) are inactive"
        
        # Step 4: Check user permissions for each transition
        allowed = []
        for transition in active_transitions:
            can_perform, rejection_reason = transition.can_user_perform(user, jobcard)
            
            transition_info = {
                'id': transition.id,
                'action_name': transition.action_name,
                'to_status': transition.to_status,
                'allowed_roles': transition.allowed_roles,
                'requires_assignment': transition.requires_assignment
            }
            
            if can_perform:
                allowed.append(transition)
                debug_info['allowed_transition_details'].append(transition_info)
            else:
                transition_info['rejection_reason'] = rejection_reason
                debug_info['rejected_transitions'].append(transition_info)
        
        debug_info['allowed_transitions'] = len(allowed)
        
        # Log if no transitions are allowed
        if debug_info['allowed_transitions'] == 0 and debug_info['active_transitions'] > 0:
            logger.warning(
                f"[WORKFLOW] User {user.id} ({user.role}) has NO allowed transitions "
                f"for JobCard {jobcard.id} (status: {current_status}). "
                f"Found {debug_info['active_transitions']} active transitions but all were rejected."
            )
        
        if debug:
            return debug_info
        
        return allowed
    
    @classmethod
    def get_workflow_diagnostic(cls, jobcard, user):
        """
        Get comprehensive diagnostic information about workflow state.
        Useful for debugging why transitions aren't appearing.
        
        Returns:
            Dict with detailed diagnostic information
        """
        return cls.get_allowed_transitions(jobcard, user, debug=True)
    
    @classmethod
    def get_next_status(cls, jobcard, action_name):
        """
        Determine the next status based on current status and action.
        Accounts for workflow customizations like skip_customer_approval.
        """
        template = cls.get_template_for_jobcard(jobcard)
        if not template:
            return None
        
        current_status = jobcard.status
        
        # Find the transition with optimized query (bypass CompanyManager via all_companies)
        transition = WorkflowTransition.objects.all_companies().select_related('template').filter(
            template=template,
            from_status=current_status,
            action_name=action_name,
            is_active=True
        ).first()
        
        if not transition:
            return None
        
        next_status = transition.to_status
        
        # Apply workflow customizations
        if template.skip_customer_approval and next_status == 'customer_approval_pending':
            next_status = 'ready_for_billing'
        
        if template.skip_floor_manager_final_qc and next_status == 'floor_manager_final_qc_confirmed':
            if template.skip_customer_approval:
                next_status = 'ready_for_billing'
            else:
                next_status = 'customer_approval_pending'
        
        return next_status
    
    @classmethod
    def can_user_perform_action(cls, jobcard, user, action_name=None, target_status=None):
        """
        Check if user can perform a specific action on the job card.
        
        Can check by either:
        - action_name: e.g., 'Complete QC', 'Start Work'
        - target_status: e.g., 'qc_completed', 'work_in_progress'
        
        Returns (can_perform, error_message)
        """
        template = cls.get_template_for_jobcard(jobcard)
        if not template:
            return False, "No workflow template configured"
        
        # Build query for transitions from current status
        query = {
            'template': template,
            'from_status': jobcard.status,
            'is_active': True,
        }
        
        if target_status:
            query['to_status'] = target_status
        
        if action_name:
            query['action_name__icontains'] = action_name
        
        # Optimize with select_related (bypass CompanyManager via all_companies)
        transitions = WorkflowTransition.objects.all_companies().select_related(
            'template'
        ).filter(**query)
        
        if not transitions.exists():
            return False, f"No valid transition from status '{jobcard.status}'"
        
        # Check if user can perform any of the matching transitions
        for transition in transitions:
            can_perform, error = transition.can_user_perform(user, jobcard)
            if can_perform:
                return True, None
        
        # User can't perform any of the transitions
        allowed_roles = set()
        for t in transitions:
            allowed_roles.update(t.allowed_roles or [])
        
        return False, f"Action requires one of these roles: {', '.join(allowed_roles)}"
    
    @classmethod
    def validate_transition(cls, jobcard, user, target_status, notes=None, photos=None):
        """
        Validate if a transition is allowed.
        Returns (is_valid, error_message)
        """
        template = cls.get_template_for_jobcard(jobcard)
        if not template:
            return False, "No workflow template found for this job"
        
        # Find the transition with optimized query (bypass CompanyManager via all_companies)
        transition = WorkflowTransition.objects.all_companies().select_related(
            'template'
        ).filter(
            template=template,
            from_status=jobcard.status,
            to_status=target_status,
            is_active=True
        ).first()
        
        if not transition:
            return False, f"Transition from '{jobcard.status}' to '{target_status}' is not allowed"
        
        # Check user permissions
        can_perform, error = transition.can_user_perform(user, jobcard)
        if not can_perform:
            return False, error
        
        # Check required fields
        if transition.requires_notes and not notes:
            return False, "Notes are required for this action"
        
        if transition.requires_photos and not photos:
            return False, "Photos are required for this action"
        
        return True, "Transition is valid"
    
    @classmethod
    def perform_transition(cls, jobcard, user, target_status, notes=None, photos=None):
        """
        Perform a workflow transition.
        Returns (success, error_message_or_jobcard)
        """
        is_valid, error = cls.validate_transition(jobcard, user, target_status, notes, photos)
        if not is_valid:
            return False, error
        
        # Record activity
        from jobcards.models import JobCardActivity
        old_status = jobcard.status
        
        # Update status
        jobcard.status = target_status
        jobcard.save(update_fields=['status', 'updated_at'])
        
        # Sync booking status with job card status
        cls._sync_booking_status(jobcard, target_status)
        
        # Log the activity
        JobCardActivity.objects.create(
            jobcard=jobcard,
            activity_type='status_change',
            performed_by=user,
            description=f"Status changed from '{old_status}' to '{target_status}'",
            metadata={
                'old_status': old_status,
                'new_status': target_status,
                'notes': notes,
                'via_workflow_engine': True
            }
        )
        
        return True, jobcard
    
    @classmethod
    def _sync_booking_status(cls, jobcard, jobcard_status):
        """
        Sync booking status when job card status changes.
        Maps job card statuses to booking statuses.
        """
        # Mapping from job card status to booking status
        # Now that booking has all the same statuses, most map 1:1
        STATUS_MAP = {
            'created': 'confirmed',  # Job created means booking confirmed
            'qc_pending': 'qc_pending',
            'qc_completed': 'qc_completed',
            'qc_rejected': 'qc_rejected',
            'supervisor_approved': 'supervisor_approved',
            'supervisor_rejected': 'supervisor_rejected',
            'floor_manager_confirmed': 'floor_manager_confirmed',
            'assigned_to_applicator': 'assigned_to_applicator',
            'work_in_progress': 'work_in_progress',
            'work_completed': 'work_completed',
            'final_qc_pending': 'final_qc_pending',
            'final_qc_passed': 'final_qc_passed',
            'final_qc_failed': 'final_qc_failed',
            'floor_manager_final_qc_confirmed': 'floor_manager_final_qc_confirmed',
            'customer_approval_pending': 'customer_approval_pending',
            'customer_approved': 'customer_approved',
            'customer_revision_requested': 'customer_revision_requested',
            'ready_for_billing': 'ready_for_billing',
            'billed': 'billed',
            'ready_for_delivery': 'ready_for_delivery',
            'delivered': 'delivered',
            'closed': 'closed',
        }
        
        booking_status = STATUS_MAP.get(jobcard_status)
        if booking_status and hasattr(jobcard, 'booking') and jobcard.booking:
            try:
                booking = jobcard.booking
                booking.status = booking_status
                booking.save(update_fields=['status', 'updated_at'])
            except Exception as e:
                # Log error but don't fail the transition
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to sync booking status: {e}")
    
    @classmethod
    def get_user_permissions(cls, user, jobcard=None):
        """
        Get effective permissions for a user on a job card.
        """
        if jobcard:
            template = cls.get_template_for_jobcard(jobcard)
        else:
            # Get global default template
            template = WorkflowTemplate.objects.filter(
                branch__isnull=True,
                service_category__isnull=True,
                is_default=True,
                is_active=True
            ).first()
        
        if not template:
            # Return default permissions based on role
            return cls._get_default_permissions(user.role)
        
        try:
            role_perm = RolePermission.objects.get(template=template, role=user.role)
            return role_perm.get_effective_permissions()
        except RolePermission.DoesNotExist:
            return cls._get_default_permissions(user.role)
    
    @classmethod
    def _get_default_permissions(cls, role):
        """Default permissions when no template-specific permissions exist."""
        defaults = {
            'company_admin': {
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
                'can_manage_parts_inventory': True,
            },
            'super_admin': {
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
                'can_manage_parts_inventory': True,
            },
            'branch_admin': {
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
                'can_manage_parts_inventory': True,
            },
            'floor_manager': {
                'can_view_all_jobs': False,
                'can_view_branch_jobs': True,
                'can_view_assigned_jobs': True,
                'can_create_jobcard': False,
                'can_assign_staff': True,
                'can_perform_qc': True,
                'can_approve_qc': True,
                'can_execute_work': False,
                'can_perform_final_qc': False,
                'can_generate_invoice': True,
                'can_deliver_vehicle': True,
                'can_close_job': False,
                'can_add_parts': True,
                'can_manage_parts_inventory': False,
            },
            'supervisor': {
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
                'can_manage_parts_inventory': False,
            },
            'applicator': {
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
                'can_manage_parts_inventory': False,
            },
            'customer': {
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
                'can_manage_parts_inventory': False,
            },
        }
        return defaults.get(role, defaults['customer'])
    
    @classmethod
    def validate_workflow_integrity(cls, template):
        """
        Validate workflow integrity to prevent:
        - Duplicate transitions
        - Infinite loops
        - Orphaned statuses
        - Dead ends
        
        Returns (is_valid, errors, warnings)
        """
        errors = []
        warnings = []
        
        # 1. Fetch all data IN-MEMORY once to avoid N+1 queries in recursion/loops
        statuses_list = list(template.statuses.filter(is_active_status=True))
        all_transitions_list = list(template.transitions.all())
        active_transitions_list = [t for t in all_transitions_list if t.is_active]
        
        # Build lookup dictionaries for O(1) access
        statuses_by_code = {s.status_code: s for s in statuses_list}
        active_transitions_by_from = {}
        active_transitions_by_to = {}
        
        for t in active_transitions_list:
            active_transitions_by_from.setdefault(t.from_status, []).append(t)
            active_transitions_by_to.setdefault(t.to_status, []).append(t)
        
        # 2. Get statuses that are actually used in active transitions
        used_status_codes = set()
        for t in active_transitions_list:
            used_status_codes.add(t.from_status)
            used_status_codes.add(t.to_status)
        
        # Filter to only statuses that are part of the active workflow
        active_statuses = [s for s in statuses_list if s.status_code in used_status_codes]
        
        # 3. Check for duplicate transitions
        seen_transitions = set()
        for transition in all_transitions_list:
            key = (transition.from_status, transition.to_status)
            if key in seen_transitions:
                errors.append(
                    f"Duplicate transition: {transition.from_status} → {transition.to_status}"
                )
            seen_transitions.add(key)
        
        # 4. Check for infinite loops (self-referencing transitions)
        for transition in active_transitions_list:
            if transition.from_status == transition.to_status:
                errors.append(
                    f"Infinite loop detected: {transition.from_status} → {transition.to_status}"
                )
        
        # 5. Check for circular dependencies - only immediate problematic loops
        def find_immediate_loop_path(start, current, visited, path, depth=0):
            """Find the exact path of immediate circular loops (2-3 steps only)"""
            if depth > 3:
                return None
            if current == start and depth >= 2:
                return path
            if current in visited:
                return None
            
            visited.add(current)
            next_transitions = active_transitions_by_from.get(current, [])
            for t in next_transitions:
                new_path = path + [{'from': current, 'to': t.to_status, 'action': t.action_name}]
                result = find_immediate_loop_path(start, t.to_status, visited.copy(), new_path, depth + 1)
                if result:
                    return result
            return None
        
        checked_cycles = set()
        for status in active_statuses:
            if status.status_code not in checked_cycles:
                loop_path = find_immediate_loop_path(status.status_code, status.status_code, set(), [])
                if loop_path:
                    path_description = ' → '.join([step['action'] for step in loop_path])
                    warnings.append(
                        f"Short loop: '{status.display_name}' → {path_description} → '{status.display_name}'"
                    )
                    checked_cycles.add(status.status_code)
        
        # 6. Check for orphaned statuses (no incoming transitions)
        initial_status_codes = {s.status_code for s in statuses_list if s.status_type == 'initial'}
        for status in active_statuses:
            if status.status_code in initial_status_codes:
                continue
            
            incoming = active_transitions_by_to.get(status.status_code, [])
            if not incoming:
                warnings.append(
                    f"Orphaned status: '{status.display_name}' has no active incoming transitions"
                )
        
        # 7. Check for dead ends (no outgoing transitions from non-terminal statuses)
        for status in active_statuses:
            if status.is_terminal:
                continue
            
            outgoing = active_transitions_by_from.get(status.status_code, [])
            if not outgoing:
                warnings.append(
                    f"Dead end: '{status.display_name}' has no active outgoing transitions"
                )
            else:
                role_coverage = set()
                for trans in outgoing:
                    role_coverage.update(trans.allowed_roles or [])
                
                if len(role_coverage) == 1:
                    single_role = list(role_coverage)[0]
                    warnings.append(
                        f"Single role dependency: '{status.display_name}' can only be progressed by '{single_role}'"
                    )
                elif len(role_coverage) == 0:
                    warnings.append(
                        f"Configuration error: '{status.display_name}' has transitions but none have allowed roles"
                    )
        
        # 8. Check for unreachable terminal statuses
        terminal_statuses = [s for s in active_statuses if s.is_terminal]
        
        # Pre-cache reachability helper to avoid redundant logic
        def can_reach(current, target, visited):
            if current == target:
                return True
            if current in visited:
                return False
            visited.add(current)
            
            next_trans = active_transitions_by_from.get(current, [])
            for t in next_trans:
                if can_reach(t.to_status, target, visited.copy()):
                    return True
            return False
            
        for terminal in terminal_statuses:
            reachable = False
            for initial_code in initial_status_codes:
                if can_reach(initial_code, terminal.status_code, set()):
                    reachable = True
                    break
            
            if not reachable:
                warnings.append(
                    f"Unreachable terminal status: '{terminal.display_name}' cannot be reached from initial status"
                )
        
        # 9. Warn about unused statuses
        active_status_codes = {s.status_code for s in active_statuses}
        unused_statuses = [s for s in statuses_list if s.status_code not in used_status_codes]
        if unused_statuses:
            unused_names = [s.display_name for s in unused_statuses]
            if len(unused_names) <= 3:
                warnings.append(
                    f"Unused statuses: {', '.join(unused_names)} (no active transitions)"
                )
            else:
                warnings.append(
                    f"{len(unused_names)} statuses are not used in any active transitions"
                )
        
        is_valid = len(errors) == 0
        return is_valid, errors, warnings
    
    @classmethod
    def bulk_update_transition_permissions(cls, role, action='add', template=None, transition_filter=None, company=None):
        """
        Bulk add or remove a role from multiple transitions.
        
        Args:
            role: Role to add/remove (e.g., 'branch_admin', 'floor_manager')
            action: 'add' or 'remove'
            template: Optional WorkflowTemplate instance to limit scope
            transition_filter: Dict to filter transitions (e.g., {'action_name__icontains': 'billing'})
            company: Optional company filter for multi-tenancy
        
        Returns:
            Dict with summary of changes made
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Build base query
        query = WorkflowTransition.objects.all()
        
        # Apply filters
        if template:
            query = query.filter(template=template)
        
        if company:
            query = query.filter(company=company)
        
        if transition_filter:
            query = query.filter(**transition_filter)
        
        # Track changes
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        transitions = list(query)
        
        for transition in transitions:
            try:
                roles_list = transition.allowed_roles or []
                
                if action == 'add':
                    if role not in roles_list:
                        roles_list.append(role)
                        transition.allowed_roles = roles_list
                        transition.save(update_fields=['allowed_roles'])
                        updated_count += 1
                        logger.info(f"Added {role} to transition: {transition.action_name}")
                    else:
                        skipped_count += 1
                        
                elif action == 'remove':
                    if role in roles_list:
                        roles_list.remove(role)
                        transition.allowed_roles = roles_list
                        transition.save(update_fields=['allowed_roles'])
                        updated_count += 1
                        logger.info(f"Removed {role} from transition: {transition.action_name}")
                    else:
                        skipped_count += 1
                else:
                    logger.error(f"Invalid action: {action}. Use 'add' or 'remove'.")
                    continue
                    
            except Exception as e:
                error_count += 1
                logger.error(f"Error updating transition {transition.id}: {str(e)}")
        
        return {
            'total_checked': len(transitions),
            'updated': updated_count,
            'skipped': skipped_count,
            'errors': error_count,
            'action': action,
            'role': role
        }
    
    @classmethod
    def sync_role_across_workflow_types(cls, role, action='add', transition_pattern=None, company=None):
        """
        Sync a role across all workflow templates for specific transition types.
        
        Args:
            role: Role to sync
            action: 'add' or 'remove'
            transition_pattern: Keywords to match in action names (e.g., 'billing', 'qc', 'assign')
            company: Optional company filter
        
        Returns:
            Dict with summary of changes across all templates
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Get all active templates
        templates_query = WorkflowTemplate.objects.filter(is_active=True)
        if company:
            templates_query = templates_query.filter(company=company)
        
        templates = list(templates_query)
        
        total_summary = {
            'templates_processed': 0,
            'total_updated': 0,
            'total_skipped': 0,
            'total_errors': 0,
            'details_by_template': []
        }
        
        for template in templates:
            # Build filter for this template
            transition_filter = {}
            if transition_pattern:
                transition_filter['action_name__icontains'] = transition_pattern
            
            result = cls.bulk_update_transition_permissions(
                role=role,
                action=action,
                template=template,
                transition_filter=transition_filter,
                company=company
            )
            
            total_summary['templates_processed'] += 1
            total_summary['total_updated'] += result['updated']
            total_summary['total_skipped'] += result['skipped']
            total_summary['total_errors'] += result['errors']
            
            total_summary['details_by_template'].append({
                'template_id': template.id,
                'template_name': template.name,
                **result
            })
            
            logger.info(
                f"Template '{template.name}': "
                f"Updated {result['updated']}, "
                f"Skipped {result['skipped']}, "
                f"Errors {result['errors']}"
            )
        
        return total_summary
    
    # ==================== Phase 2: Advanced Validation & Analysis ====================
    
    @classmethod
    def detect_permission_conflicts(cls, template):
        """
        Detect permission conflicts and inconsistencies in workflow transitions.
        
        Returns:
            Dict with conflicts, warnings, and recommendations
        """
        import logging
        logger = logging.getLogger(__name__)
        
        conflicts = []
        warnings = []
        recommendations = []
        
        # Get all active transitions
        transitions = list(template.transitions.filter(is_active=True))
        
        # 1. Check for transitions with no allowed roles
        for t in transitions:
            if not t.allowed_roles or len(t.allowed_roles) == 0:
                conflicts.append({
                    'type': 'NO_ROLES',
                    'severity': 'HIGH',
                    'transition': t.action_name,
                    'from_status': t.from_status,
                    'to_status': t.to_status,
                    'message': f"Transition '{t.action_name}' has no allowed roles - nobody can perform this action"
                })
        
        # 2. Check for role inconsistencies across similar transitions
        # Group transitions by action type
        action_patterns = {
            'billing': ['bill', 'invoice', 'payment'],
            'qc': ['qc', 'quality', 'check', 'review'],
            'delivery': ['deliver', 'handover', 'customer'],
            'assignment': ['assign', 'allocate'],
        }
        
        for pattern_name, keywords in action_patterns.items():
            pattern_transitions = []
            for t in transitions:
                if any(kw in t.action_name.lower() for kw in keywords):
                    pattern_transitions.append(t)
            
            if len(pattern_transitions) > 1:
                # Check role consistency
                role_sets = [set(t.allowed_roles) for t in pattern_transitions]
                if len(set(frozenset(rs) for rs in role_sets)) > 1:
                    # Different role sets found
                    warnings.append({
                        'type': 'ROLE_INCONSISTENCY',
                        'severity': 'MEDIUM',
                        'category': pattern_name,
                        'message': f"Inconsistent roles across {pattern_name} transitions",
                        'details': [
                            {
                                'action': t.action_name,
                                'roles': t.allowed_roles
                            }
                            for t in pattern_transitions
                        ]
                    })
        
        # 3. Check for overly restrictive permissions (single role)
        for t in transitions:
            if t.allowed_roles and len(t.allowed_roles) == 1:
                role = t.allowed_roles[0]
                if role not in ['super_admin', 'company_admin']:  # These can be exclusive
                    warnings.append({
                        'type': 'SINGLE_ROLE',
                        'severity': 'LOW',
                        'transition': t.action_name,
                        'role': role,
                        'message': f"Only '{role}' can perform '{t.action_name}' - consider adding backup roles"
                    })
        
        # 4. Check for missing critical roles
        critical_roles = ['super_admin', 'company_admin', 'branch_admin']
        for t in transitions:
            if t.allowed_roles:
                has_critical = any(role in critical_roles for role in t.allowed_roles)
                if not has_critical and not t.requires_assignment:
                    recommendations.append({
                        'type': 'MISSING_ADMIN_ROLE',
                        'severity': 'LOW',
                        'transition': t.action_name,
                        'message': f"Consider adding admin role to '{t.action_name}' for flexibility"
                    })
        
        # 5. Check for redundant permissions (everyone has access)
        all_roles = {'super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator'}
        for t in transitions:
            if t.allowed_roles and set(t.allowed_roles) >= all_roles:
                warnings.append({
                    'type': 'OVER_PERMISSIVE',
                    'severity': 'LOW',
                    'transition': t.action_name,
                    'message': f"All roles can access '{t.action_name}' - review if this is intentional"
                })
        
        # 6. Detect role hierarchy violations
        # Lower-privilege roles shouldn't have permissions that higher roles don't have
        role_hierarchy = {
            'applicator': 1,
            'supervisor': 2,
            'floor_manager': 3,
            'branch_admin': 4,
            'company_admin': 5,
            'super_admin': 6
        }
        
        # Group transitions by from_status -> to_status
        transition_map = {}
        for t in transitions:
            key = (t.from_status, t.to_status)
            if key not in transition_map:
                transition_map[key] = []
            transition_map[key].append(t)
        
        # Check each unique transition path
        for (from_st, to_st), trans_list in transition_map.items():
            if len(trans_list) > 1:
                conflicts.append({
                    'type': 'DUPLICATE_PATH',
                    'severity': 'MEDIUM',
                    'from_status': from_st,
                    'to_status': to_st,
                    'count': len(trans_list),
                    'actions': [t.action_name for t in trans_list],
                    'message': f"Multiple transitions exist from '{from_st}' to '{to_st}'"
                })
        
        result = {
            'has_conflicts': len(conflicts) > 0,
            'conflict_count': len(conflicts),
            'warning_count': len(warnings),
            'recommendation_count': len(recommendations),
            'conflicts': conflicts,
            'warnings': warnings,
            'recommendations': recommendations,
            'summary': {
                'high_severity': len([c for c in conflicts if c.get('severity') == 'HIGH']),
                'medium_severity': len([c for c in conflicts + warnings if c.get('severity') == 'MEDIUM']),
                'low_severity': len([c for c in warnings + recommendations if c.get('severity') == 'LOW'])
            }
        }
        
        return result
    
    @classmethod
    def analyze_workflow_paths(cls, template):
        """
        Analyze all possible paths through the workflow.
        
        Returns:
            Dict with path analysis including:
            - Possible paths from initial to terminal states
            - Average path length
            - Bottlenecks
            - Alternative routes
        """
        statuses = list(template.statuses.filter(is_active_status=True))
        transitions = list(template.transitions.filter(is_active=True))
        
        # Build adjacency graph
        graph = {}
        for t in transitions:
            if t.from_status not in graph:
                graph[t.from_status] = []
            graph[t.from_status].append({
                'to': t.to_status,
                'action': t.action_name,
                'roles': t.allowed_roles
            })
        
        # Find initial and terminal statuses
        initial_statuses = [s.status_code for s in statuses if s.status_type == 'initial']
        terminal_statuses = [s.status_code for s in statuses if s.is_terminal]
        
        # Find all paths from initial to terminal
        all_paths = []
        
        def find_paths(current, target_list, path, visited):
            """DFS to find all paths"""
            if current in target_list:
                all_paths.append(path[:])
                return
            
            if current in visited:
                return  # Avoid cycles
            
            visited.add(current)
            
            for next_step in graph.get(current, []):
                path.append({
                    'from': current,
                    'to': next_step['to'],
                    'action': next_step['action'],
                    'roles': next_step['roles']
                })
                find_paths(next_step['to'], target_list, path, visited.copy())
                path.pop()
        
        # Find paths from each initial status
        for init_status in initial_statuses:
            find_paths(init_status, terminal_statuses, [], set())
        
        # Analyze paths
        path_lengths = [len(p) for p in all_paths] if all_paths else [0]
        
        # Find bottlenecks (statuses that all paths must go through)
        status_frequency = {}
        for path in all_paths:
            statuses_in_path = set(step['from'] for step in path) | set(step['to'] for step in path)
            for status in statuses_in_path:
                status_frequency[status] = status_frequency.get(status, 0) + 1
        
        total_paths = len(all_paths)
        bottlenecks = []
        if total_paths > 0:
            for status, count in status_frequency.items():
                if count == total_paths and status not in initial_statuses and status not in terminal_statuses:
                    bottlenecks.append({
                        'status': status,
                        'frequency': count,
                        'percentage': 100.0
                    })
        
        # Find alternative routes (statuses with multiple outgoing transitions)
        alternative_routes = {}
        for status, next_steps in graph.items():
            if len(next_steps) > 1:
                alternative_routes[status] = {
                    'count': len(next_steps),
                    'options': [
                        {'action': ns['action'], 'to': ns['to']}
                        for ns in next_steps
                    ]
                }
        
        return {
            'total_paths': total_paths,
            'shortest_path_length': min(path_lengths) if path_lengths else 0,
            'longest_path_length': max(path_lengths) if path_lengths else 0,
            'average_path_length': sum(path_lengths) / len(path_lengths) if path_lengths else 0,
            'paths': all_paths[:10],  # Return first 10 paths as examples
            'bottlenecks': bottlenecks,
            'alternative_routes': alternative_routes,
            'initial_statuses': initial_statuses,
            'terminal_statuses': terminal_statuses
        }
    
    @classmethod
    def get_workflow_coverage_report(cls, template):
        """
        Generate a coverage report showing which roles can perform which actions.
        
        Returns:
            Dict with role coverage analysis
        """
        transitions = list(template.transitions.filter(is_active=True))
        statuses = list(template.statuses.filter(is_active_status=True))
        
        # All possible roles
        all_roles = ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator']
        
        # Role coverage matrix
        role_coverage = {role: {'can_perform': [], 'cannot_perform': []} for role in all_roles}
        
        for transition in transitions:
            allowed_roles = transition.allowed_roles or []
            for role in all_roles:
                if role in allowed_roles:
                    role_coverage[role]['can_perform'].append(transition.action_name)
                else:
                    role_coverage[role]['cannot_perform'].append(transition.action_name)
        
        # Calculate coverage percentage
        total_transitions = len(transitions)
        for role in all_roles:
            can_perform_count = len(role_coverage[role]['can_perform'])
            role_coverage[role]['coverage_percentage'] = (
                (can_perform_count / total_transitions * 100) if total_transitions > 0 else 0
            )
            role_coverage[role]['can_perform_count'] = can_perform_count
            role_coverage[role]['cannot_perform_count'] = total_transitions - can_perform_count
        
        # Find gaps (actions that very few roles can perform)
        action_role_count = {}
        for transition in transitions:
            role_count = len(transition.allowed_roles) if transition.allowed_roles else 0
            action_role_count[transition.action_name] = {
                'role_count': role_count,
                'roles': transition.allowed_roles or [],
                'from_status': transition.from_status,
                'to_status': transition.to_status
            }
        
        coverage_gaps = [
            {'action': action, **info}
            for action, info in action_role_count.items()
            if info['role_count'] <= 1
        ]
        
        return {
            'total_transitions': total_transitions,
            'total_roles': len(all_roles),
            'role_coverage': role_coverage,
            'coverage_gaps': coverage_gaps,
            'fully_covered_actions': [
                t.action_name for t in transitions
                if t.allowed_roles and len(t.allowed_roles) >= 3
            ]
        }
    
    @classmethod
    def get_optimization_suggestions(cls, template):
        """
        Provide optimization suggestions for the workflow.
        
        Returns:
            List of actionable suggestions
        """
        suggestions = []
        
        # Run all analysis
        integrity = cls.validate_workflow_integrity(template)
        conflicts = cls.detect_permission_conflicts(template)
        paths = cls.analyze_workflow_paths(template)
        coverage = cls.get_workflow_coverage_report(template)
        
        # 1. Suggest fixing high-priority conflicts
        if conflicts.get('summary', {}).get('high_severity', 0) > 0:
            suggestions.append({
                'priority': 'HIGH',
                'category': 'CONFLICTS',
                'title': 'Fix High-Severity Permission Conflicts',
                'description': f"Found {conflicts['summary']['high_severity']} high-severity conflicts",
                'action': 'Review and fix transitions with no allowed roles',
                'details': [c for c in conflicts.get('conflicts', []) if c.get('severity') == 'HIGH']
            })
        
        # 2. Suggest reducing bottlenecks
        if paths.get('bottlenecks'):
            suggestions.append({
                'priority': 'MEDIUM',
                'category': 'WORKFLOW_STRUCTURE',
                'title': 'Consider Alternative Paths',
                'description': f"Found {len(paths['bottlenecks'])} bottleneck status(es) that all workflows must pass through",
                'action': 'Add alternative transitions to reduce dependency on single status',
                'details': paths['bottlenecks']
            })
        
        # 3. Suggest improving role coverage
        low_coverage_roles = [
            role for role, data in coverage['role_coverage'].items()
            if data['coverage_percentage'] < 30 and role not in ['applicator', 'customer']
        ]
        
        if low_coverage_roles:
            suggestions.append({
                'priority': 'LOW',
                'category': 'PERMISSIONS',
                'title': 'Improve Role Coverage',
                'description': f"Roles {', '.join(low_coverage_roles)} have low workflow coverage",
                'action': 'Consider expanding permissions for these roles',
                'details': {role: coverage['role_coverage'][role] for role in low_coverage_roles}
            })
        
        # 4. Suggest fixing coverage gaps
        if coverage['coverage_gaps']:
            critical_gaps = [g for g in coverage['coverage_gaps'] if g['role_count'] == 0]
            if critical_gaps:
                suggestions.append({
                    'priority': 'HIGH',
                    'category': 'PERMISSIONS',
                    'title': 'Fix Actions With No Permissions',
                    'description': f"Found {len(critical_gaps)} action(s) that nobody can perform",
                    'action': 'Add roles to these transitions immediately',
                    'details': critical_gaps
                })
        
        # 5. Suggest simplifying complex workflows
        if paths.get('average_path_length', 0) > 15:
            suggestions.append({
                'priority': 'LOW',
                'category': 'WORKFLOW_STRUCTURE',
                'title': 'Consider Simplifying Workflow',
                'description': f"Average workflow path has {paths['average_path_length']:.1f} steps",
                'action': 'Review if some steps can be combined or made optional',
                'details': {
                    'shortest_path': paths['shortest_path_length'],
                    'longest_path': paths['longest_path_length'],
                    'average_path': paths['average_path_length']
                }
            })
        
        # Sort by priority
        priority_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
        suggestions.sort(key=lambda x: priority_order.get(x['priority'], 99))
        
        return {
            'total_suggestions': len(suggestions),
            'high_priority': len([s for s in suggestions if s['priority'] == 'HIGH']),
            'medium_priority': len([s for s in suggestions if s['priority'] == 'MEDIUM']),
            'low_priority': len([s for s in suggestions if s['priority'] == 'LOW']),
            'suggestions': suggestions
        }
    
    @classmethod
    def comprehensive_workflow_analysis(cls, template):
        """
        Run all analysis and validation checks and return a complete report.
        
        Returns:
            Comprehensive dict with all analysis results
        """
        import time
        start_time = time.time()
        
        report = {
            'template_id': template.id,
            'template_name': template.name,
            'analyzed_at': timezone.now().isoformat(),
            'integrity': None,
            'permission_conflicts': None,
            'path_analysis': None,
            'coverage_report': None,
            'optimization_suggestions': None,
            'overall_health_score': 0,
            'analysis_duration_ms': 0
        }
        
        try:
            # Run all analyses
            is_valid, errors, warnings = cls.validate_workflow_integrity(template)
            report['integrity'] = {
                'is_valid': is_valid,
                'errors': errors,
                'warnings': warnings,
                'error_count': len(errors),
                'warning_count': len(warnings)
            }
            
            report['permission_conflicts'] = cls.detect_permission_conflicts(template)
            report['path_analysis'] = cls.analyze_workflow_paths(template)
            report['coverage_report'] = cls.get_workflow_coverage_report(template)
            report['optimization_suggestions'] = cls.get_optimization_suggestions(template)
            
            # Calculate overall health score (0-100)
            score = 100
            
            # Deduct for errors and conflicts
            score -= len(errors) * 10
            score -= report['permission_conflicts']['summary']['high_severity'] * 10
            score -= report['permission_conflicts']['summary']['medium_severity'] * 5
            score -= len(warnings) * 2
            
            # Bonus for good coverage
            avg_coverage = sum(
                data['coverage_percentage']
                for data in report['coverage_report']['role_coverage'].values()
            ) / len(report['coverage_report']['role_coverage'])
            score += (avg_coverage / 10)  # Max +10 for perfect coverage
            
            # Ensure score is between 0-100
            report['overall_health_score'] = max(0, min(100, int(score)))
            
        except Exception as e:
            report['error'] = str(e)
            report['overall_health_score'] = 0
        
        end_time = time.time()
        report['analysis_duration_ms'] = int((end_time - start_time) * 1000)
        
        return report


class WorkflowChangeLog(models.Model):
    """
    Audit log for workflow configuration changes.
    Tracks all modifications to templates, statuses, transitions, and permissions.
    """
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='workflow_change_logs',
        null=True,
        blank=True
    )
    
    objects = CompanyManager()
    
    CHANGE_TYPES = [
        ('template_created', 'Template Created'),
        ('template_updated', 'Template Updated'),
        ('template_deleted', 'Template Deleted'),
        ('transition_created', 'Transition Created'),
        ('transition_updated', 'Transition Updated'),
        ('transition_deleted', 'Transition Deleted'),
        ('status_updated', 'Status Updated'),
        ('permission_updated', 'Permission Updated'),
    ]
    
    change_type = models.CharField(max_length=50, choices=CHANGE_TYPES)
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='change_logs',
        null=True,
        blank=True
    )
    
    # Change details
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='workflow_changes'
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    
    # What changed
    object_type = models.CharField(max_length=50)  # 'transition', 'status', 'template', etc.
    object_id = models.IntegerField(null=True, blank=True)
    
    # Old and new values
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    
    # Additional context
    change_reason = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        db_table = 'workflow_change_logs'
        verbose_name = 'Workflow Change Log'
        verbose_name_plural = 'Workflow Change Logs'
        ordering = ['-changed_at']
    
    def __str__(self):
        return f"{self.change_type} by {self.changed_by} at {self.changed_at}"
