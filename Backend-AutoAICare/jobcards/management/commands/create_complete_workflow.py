"""
Management command to create a complete workflow with ALL statuses and transitions.
Supervisor is optional - FM handles QC approval and can assign supervisor + applicators.
"""

from django.core.management.base import BaseCommand
from jobcards.workflow_config import (
    WorkflowTemplate,
    WorkflowStatus,
    WorkflowTransition,
    RolePermission
)


class Command(BaseCommand):
    help = 'Create a complete workflow template with FM-centric QC and optional supervisor'

    def handle(self, *args, **options):
        # Check if already exists
        existing = WorkflowTemplate.objects.filter(name='Complete Flow').first()
        if existing:
            self.stdout.write(self.style.WARNING('Deleting existing Complete Flow template...'))
            existing.delete()

        # Also set other templates as non-default
        WorkflowTemplate.objects.filter(is_default=True).update(is_default=False)

        # Create the complete template
        template = WorkflowTemplate.objects.create(
            name='Complete Flow',
            description='FM handles QC/approval, assigns supervisor + applicators. Supervisor optional.',
            is_default=True,
            is_active=True,
            skip_customer_approval=True,  # Skip customer approval by default
            skip_floor_manager_final_qc=True,  # Skip FM final QC (simplified)
            require_supervisor_review=False,  # FM handles everything
            auto_assign_applicators=False
        )

        # All 22 statuses in workflow order
        statuses = [
            # Phase 1: Creation & Initial QC (FM's domain)
            {'status_code': 'created', 'display_name': 'Job Created', 'status_type': 'initial', 'order': 1},
            {'status_code': 'qc_pending', 'display_name': 'QC Pending', 'status_type': 'qc', 'order': 2},
            {'status_code': 'qc_completed', 'display_name': 'QC Completed', 'status_type': 'qc', 'order': 3},
            {'status_code': 'qc_rejected', 'display_name': 'QC Rejected', 'status_type': 'qc', 'order': 4},
            
            # Phase 2: Legacy approval statuses (kept for backward compatibility)
            {'status_code': 'supervisor_approved', 'display_name': 'Supervisor Approved', 'status_type': 'approval', 'order': 5},
            {'status_code': 'supervisor_rejected', 'display_name': 'Supervisor Rejected', 'status_type': 'approval', 'order': 6},
            {'status_code': 'floor_manager_confirmed', 'display_name': 'FM Confirmed', 'status_type': 'approval', 'order': 7},
            
            # Phase 3: Work Execution
            {'status_code': 'assigned_to_applicator', 'display_name': 'Team Assigned', 'status_type': 'work', 'order': 8},
            {'status_code': 'work_in_progress', 'display_name': 'Work In Progress', 'status_type': 'work', 'order': 9},
            {'status_code': 'work_completed', 'display_name': 'Work Completed', 'status_type': 'work', 'order': 10},
            
            # Phase 4: Final QC (optional)
            {'status_code': 'final_qc_pending', 'display_name': 'Final QC Pending', 'status_type': 'final_qc', 'order': 11},
            {'status_code': 'final_qc_passed', 'display_name': 'Final QC Passed', 'status_type': 'final_qc', 'order': 12},
            {'status_code': 'final_qc_failed', 'display_name': 'Final QC Failed', 'status_type': 'final_qc', 'order': 13},
            {'status_code': 'floor_manager_final_qc_confirmed', 'display_name': 'FM Final QC Confirmed', 'status_type': 'final_qc', 'order': 14},
            
            # Phase 5: Customer Approval (optional)
            {'status_code': 'customer_approval_pending', 'display_name': 'Customer Approval Pending', 'status_type': 'customer', 'order': 15},
            {'status_code': 'customer_approved', 'display_name': 'Customer Approved', 'status_type': 'customer', 'order': 16},
            {'status_code': 'customer_revision_requested', 'display_name': 'Revision Requested', 'status_type': 'customer', 'order': 17},
            
            # Phase 6: Billing & Delivery
            {'status_code': 'ready_for_billing', 'display_name': 'Ready for Billing', 'status_type': 'billing', 'order': 18},
            {'status_code': 'billed', 'display_name': 'Billed', 'status_type': 'billing', 'order': 19},
            {'status_code': 'ready_for_delivery', 'display_name': 'Ready for Delivery', 'status_type': 'delivery', 'order': 20},
            {'status_code': 'delivered', 'display_name': 'Delivered', 'status_type': 'delivery', 'order': 21},
            {'status_code': 'closed', 'display_name': 'Closed', 'status_type': 'terminal', 'order': 22, 'is_terminal': True},
        ]

        for status_data in statuses:
            is_terminal = status_data.pop('is_terminal', False)
            WorkflowStatus.objects.create(template=template, is_terminal=is_terminal, **status_data)

        # All transitions in CORRECT WORKFLOW ORDER
        # Key changes:
        # - FM handles QC approval (not supervisor)
        # - FM assigns supervisor + applicators after QC
        # - Supervisor can start/manage work (optional)
        # - Applicators do the actual work
        transitions = [
            # ═══════════════════════════════════════════════════════════════
            # PHASE 1: Job Creation → QC (FM's Domain)
            # ═══════════════════════════════════════════════════════════════
            {
                'from_status': 'created',
                'to_status': 'qc_pending',
                'action_name': 'Start QC',
                'action_description': 'Assign Floor Manager and start QC inspection',
                'allowed_roles': ['super_admin', 'branch_admin'],
            },
            {
                'from_status': 'qc_pending',
                'to_status': 'qc_completed',
                'action_name': 'Complete QC',
                'action_description': 'Complete the initial QC inspection',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager'],
            },
            {
                'from_status': 'qc_pending',
                'to_status': 'qc_rejected',
                'action_name': 'Reject QC',
                'action_description': 'Reject due to issues found during QC',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager'],
                'requires_notes': True,
            },
            {
                'from_status': 'qc_rejected',
                'to_status': 'qc_pending',
                'action_name': 'Retry QC',
                'action_description': 'Issues fixed, retry the QC inspection',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager'],
            },

            # ═══════════════════════════════════════════════════════════════
            # PHASE 2: Team Assignment (FM assigns Supervisor + Applicators)
            # ═══════════════════════════════════════════════════════════════
            {
                'from_status': 'qc_completed',
                'to_status': 'assigned_to_applicator',
                'action_name': 'Assign Team',
                'action_description': 'Assign supervisor and applicator team to execute the work',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager'],
            },
            # Legacy transitions for backward compatibility
            {
                'from_status': 'supervisor_approved',
                'to_status': 'assigned_to_applicator',
                'action_name': 'Assign Team',
                'action_description': 'Assign applicator team (legacy)',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager'],
            },
            {
                'from_status': 'floor_manager_confirmed',
                'to_status': 'assigned_to_applicator',
                'action_name': 'Assign Team',
                'action_description': 'Assign applicator team (legacy)',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager'],
            },

            # ═══════════════════════════════════════════════════════════════
            # PHASE 3: Work Execution (Supervisor optional, FM can do it too)
            # ═══════════════════════════════════════════════════════════════
            {
                'from_status': 'assigned_to_applicator',
                'to_status': 'work_in_progress',
                'action_name': 'Start Work',
                'action_description': 'Start work execution (timer begins)',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager', 'supervisor'],
            },
            {
                'from_status': 'work_in_progress',
                'to_status': 'work_completed',
                'action_name': 'Complete Work',
                'action_description': 'Mark work as completed by the team',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator'],
            },

            # ═══════════════════════════════════════════════════════════════
            # PHASE 4: Ready for Billing (Skip final QC in simplified flow)
            # ═══════════════════════════════════════════════════════════════
            {
                'from_status': 'work_completed',
                'to_status': 'ready_for_billing',
                'action_name': 'Ready for Billing',
                'action_description': 'Mark job as ready for invoice',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager'],
            },
            # Optional: Final QC path (for detailed flow)
            {
                'from_status': 'work_completed',
                'to_status': 'final_qc_pending',
                'action_name': 'Submit for Final QC',
                'action_description': 'Submit for quality check before billing',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager', 'supervisor'],
            },
            {
                'from_status': 'final_qc_pending',
                'to_status': 'final_qc_passed',
                'action_name': 'Pass Final QC',
                'action_description': 'Work passes final quality check',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager', 'supervisor'],
                'requires_assignment': False,
                'requires_photos': True,
            },
            {
                'from_status': 'final_qc_pending',
                'to_status': 'final_qc_failed',
                'action_name': 'Fail Final QC',
                'action_description': 'Work fails final quality check',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager', 'supervisor'],
                'requires_assignment': False,
                'requires_notes': True,
            },
            {
                'from_status': 'final_qc_failed',
                'to_status': 'work_in_progress',
                'action_name': 'Redo Work',
                'action_description': 'Send back for rework',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager', 'supervisor'],
            },
            {
                'from_status': 'final_qc_passed',
                'to_status': 'ready_for_billing',
                'action_name': 'Ready for Billing',
                'action_description': 'Mark job as ready for invoice',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager'],
            },
            # Customer revision handling
            {
                'from_status': 'customer_revision_requested',
                'to_status': 'work_in_progress',
                'action_name': 'Start Revision',
                'action_description': 'Start making requested revisions',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager', 'supervisor'],
            },

            # ═══════════════════════════════════════════════════════════════
            # PHASE 5: Billing & Payment
            # ═══════════════════════════════════════════════════════════════
            {
                'from_status': 'ready_for_billing',
                'to_status': 'billed',
                'action_name': 'Generate Invoice',
                'action_description': 'Generate invoice for the completed work',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager'],
            },
            {
                'from_status': 'billed',
                'to_status': 'ready_for_delivery',
                'action_name': 'Payment Received',
                'action_description': 'Record payment received from customer',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager'],
            },

            # ═══════════════════════════════════════════════════════════════
            # PHASE 6: Delivery & Closure
            # ═══════════════════════════════════════════════════════════════
            {
                'from_status': 'ready_for_delivery',
                'to_status': 'delivered',
                'action_name': 'Deliver Vehicle',
                'action_description': 'Hand over vehicle to customer',
                'allowed_roles': ['super_admin', 'branch_admin', 'floor_manager'],
            },
            {
                'from_status': 'delivered',
                'to_status': 'closed',
                'action_name': 'Close Job',
                'action_description': 'Close the job card permanently',
                'allowed_roles': ['super_admin', 'branch_admin'],
            },
        ]

        for order, transition_data in enumerate(transitions, start=1):
            WorkflowTransition.objects.create(template=template, order=order, **transition_data)

        # Role permissions
        permissions = [
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
            },
            {
                'role': 'branch_admin',
                'can_view_all_jobs': False,
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
            },
            {
                'role': 'floor_manager',
                'can_view_all_jobs': False,
                'can_view_branch_jobs': True,
                'can_view_assigned_jobs': True,
                'can_create_jobcard': False,
                'can_assign_staff': True,  # FM assigns supervisor + applicators
                'can_perform_qc': True,    # FM does QC
                'can_approve_qc': True,    # FM approves QC
                'can_execute_work': True,  # FM can manage work if no supervisor
                'can_perform_final_qc': True,
                'can_generate_invoice': True,
                'can_deliver_vehicle': True,
                'can_close_job': False,
            },
            {
                'role': 'supervisor',
                'can_view_all_jobs': False,
                'can_view_branch_jobs': True,
                'can_view_assigned_jobs': True,
                'can_create_jobcard': False,
                'can_assign_staff': False,  # Supervisor doesn't assign (FM does)
                'can_perform_qc': False,    # Supervisor doesn't do QC
                'can_approve_qc': False,    # Supervisor doesn't approve QC
                'can_execute_work': True,   # Supervisor manages work execution
                'can_perform_final_qc': False,
                'can_generate_invoice': False,
                'can_deliver_vehicle': False,
                'can_close_job': False,
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
                'can_execute_work': True,  # Applicator executes work
                'can_perform_final_qc': False,
                'can_generate_invoice': False,
                'can_deliver_vehicle': False,
                'can_close_job': False,
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
            },
        ]

        for perm_data in permissions:
            RolePermission.objects.create(template=template, **perm_data)

        self.stdout.write(self.style.SUCCESS(f'✅ Created "Complete Flow" template'))
        self.stdout.write(self.style.SUCCESS(f'   - {len(statuses)} statuses'))
        self.stdout.write(self.style.SUCCESS(f'   - {len(transitions)} transitions'))
        self.stdout.write(self.style.SUCCESS(f'   - {len(permissions)} role permissions'))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Workflow (Supervisor Optional):'))
        self.stdout.write('  1. Admin creates job → assigns FM')
        self.stdout.write('  2. FM does QC (complete/reject)')
        self.stdout.write('  3. FM assigns Supervisor + Applicators')
        self.stdout.write('  4. Supervisor/FM starts work → Applicators execute')
        self.stdout.write('  5. Work completed → Ready for Billing')
        self.stdout.write('  6. Invoice → Payment → Delivery → Close')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✅ FM handles QC + approval, Supervisor is optional!'))
