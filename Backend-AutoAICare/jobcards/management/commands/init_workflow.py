"""
Management command to initialize default workflow templates.
"""

from django.core.management.base import BaseCommand
from jobcards.workflow_config import (
    WorkflowTemplate,
    WorkflowStatus,
    WorkflowTransition,
    RolePermission
)
from jobcards.workflow_serializers import (
    get_default_statuses,
    get_default_transitions,
    get_default_role_permissions
)


class Command(BaseCommand):
    help = 'Initialize default workflow templates for the car detailing system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of default template even if it exists',
        )
        parser.add_argument(
            '--quick-wash',
            action='store_true',
            help='Also create a Quick Wash template with simplified workflow',
        )

    def handle(self, *args, **options):
        force = options['force']
        create_quick_wash = options['quick_wash']

        # Check if global default already exists
        existing = WorkflowTemplate.objects.filter(
            branch__isnull=True,
            service_category__isnull=True,
            is_default=True
        ).first()

        if existing and not force:
            self.stdout.write(
                self.style.WARNING(f'Default workflow template already exists: "{existing.name}"')
            )
            self.stdout.write('Use --force to recreate it.')
        else:
            if existing and force:
                self.stdout.write(f'Deleting existing template: "{existing.name}"')
                existing.delete()
            
            # Create global default template
            template = self._create_default_template()
            self.stdout.write(self.style.SUCCESS(f'Created default workflow template: "{template.name}"'))

        # Create Quick Wash template if requested
        if create_quick_wash:
            self._create_quick_wash_template()

        self.stdout.write(self.style.SUCCESS('Workflow templates initialization complete!'))

    def _create_default_template(self):
        """Create the default full workflow template."""
        template = WorkflowTemplate.objects.create(
            name='Standard Detailing Workflow',
            description='Complete workflow for full car detailing services including QC, supervisor review, customer approval, and delivery.',
            is_default=True,
            is_active=True,
            skip_customer_approval=False,
            skip_floor_manager_final_qc=False,
            require_supervisor_review=True,
            auto_assign_applicators=False
        )

        # Create statuses
        for status_data in get_default_statuses():
            WorkflowStatus.objects.create(template=template, **status_data)

        # Create transitions
        for transition_data in get_default_transitions():
            WorkflowTransition.objects.create(template=template, **transition_data)

        # Create role permissions
        for perm_data in get_default_role_permissions():
            RolePermission.objects.create(template=template, **perm_data)

        return template

    def _create_quick_wash_template(self):
        """Create a simplified Quick Wash workflow template."""
        # Check if already exists
        existing = WorkflowTemplate.objects.filter(
            service_category='wash',
            branch__isnull=True
        ).first()

        if existing:
            self.stdout.write(
                self.style.WARNING(f'Quick Wash template already exists: "{existing.name}"')
            )
            return existing

        template = WorkflowTemplate.objects.create(
            name='Quick Wash Workflow',
            description='Simplified workflow for quick wash services. Skips customer approval and floor manager final QC.',
            service_category='wash',
            is_default=False,
            is_active=True,
            skip_customer_approval=True,
            skip_floor_manager_final_qc=True,
            require_supervisor_review=False,
            auto_assign_applicators=True
        )

        # Simplified statuses for quick wash
        quick_statuses = [
            {'status_code': 'created', 'display_name': 'Job Created', 'status_type': 'initial', 'order': 1},
            {'status_code': 'assigned_to_applicator', 'display_name': 'Assigned', 'status_type': 'work', 'order': 2},
            {'status_code': 'work_in_progress', 'display_name': 'Washing', 'status_type': 'work', 'order': 3},
            {'status_code': 'work_completed', 'display_name': 'Wash Complete', 'status_type': 'work', 'order': 4},
            {'status_code': 'ready_for_billing', 'display_name': 'Ready for Payment', 'status_type': 'billing', 'order': 5},
            {'status_code': 'billed', 'display_name': 'Paid', 'status_type': 'billing', 'order': 6},
            {'status_code': 'delivered', 'display_name': 'Delivered', 'status_type': 'delivery', 'order': 7},
            {'status_code': 'closed', 'display_name': 'Closed', 'status_type': 'terminal', 'order': 8, 'is_terminal': True},
        ]

        for status_data in quick_statuses:
            WorkflowStatus.objects.create(template=template, **status_data)

        # Simplified transitions
        quick_transitions = [
            {'from_status': 'created', 'to_status': 'assigned_to_applicator', 'action_name': 'Assign', 
             'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager', 'supervisor']},
            {'from_status': 'assigned_to_applicator', 'to_status': 'work_in_progress', 'action_name': 'Start Wash', 
             'allowed_roles': ['supervisor', 'applicator']},
            {'from_status': 'work_in_progress', 'to_status': 'work_completed', 'action_name': 'Complete Wash', 
             'allowed_roles': ['supervisor', 'applicator']},
            {'from_status': 'work_completed', 'to_status': 'ready_for_billing', 'action_name': 'Ready for Payment', 
             'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager', 'supervisor']},
            {'from_status': 'ready_for_billing', 'to_status': 'billed', 'action_name': 'Process Payment', 
             'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager']},
            {'from_status': 'billed', 'to_status': 'delivered', 'action_name': 'Deliver Vehicle', 
             'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager']},
            {'from_status': 'delivered', 'to_status': 'closed', 'action_name': 'Close Job', 
             'allowed_roles': ['super_admin', 'branch_admin']},
        ]

        for transition_data in quick_transitions:
            WorkflowTransition.objects.create(template=template, **transition_data)

        # Use same role permissions as default
        for perm_data in get_default_role_permissions():
            RolePermission.objects.create(template=template, **perm_data)

        self.stdout.write(self.style.SUCCESS(f'Created Quick Wash template: "{template.name}"'))
        return template
