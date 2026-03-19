"""
Management command to create a simplified workflow - Admin & Floor Manager only.
Flow: Admin creates job → FM QC → FM assigns team → Work → Billing → Delivery
Company-specific workflow creation.
"""

from django.core.management.base import BaseCommand
from django.core.exceptions import ObjectDoesNotExist
from jobcards.workflow_config import (
    WorkflowTemplate,
    WorkflowStatus,
    WorkflowTransition,
    RolePermission
)
from companies.models import Company


class Command(BaseCommand):
    help = 'Create a simplified workflow template for a specific company - Admin & Floor Manager focused'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company',
            type=str,
            help='Company ID or slug (if not provided, creates global template)'
        )
        parser.add_argument(
            '--set-default',
            action='store_true',
            help='Set this workflow as the default for the company'
        )

    def handle(self, *args, **options):
        company = None
        company_str = "Global"
        
        # Get company if specified
        if options.get('company'):
            try:
                # Try to get by ID first, then by slug
                try:
                    company = Company.objects.get(id=int(options['company']))
                except (ValueError, ObjectDoesNotExist):
                    company = Company.objects.get(slug=options['company'])
                
                company_str = company.name
                self.stdout.write(self.style.SUCCESS(f'Creating workflow for company: {company_str}'))
            except ObjectDoesNotExist:
                self.stdout.write(self.style.ERROR(f'Company not found: {options["company"]}'))
                return
        else:
            self.stdout.write(self.style.WARNING('No company specified - creating global template'))
        # Check if already exists
        existing_filter = {'name': 'Simplified Flow'}
        if company:
            existing_filter['company'] = company
        
        existing = WorkflowTemplate.objects.filter(**existing_filter).first()
        if existing:
            self.stdout.write(self.style.WARNING(f'Deleting existing Simplified Flow template for {company_str}...'))
            existing.delete()

        # Determine if this should be default
        is_default = options.get('set_default', True)  # Default to True if not specified
        
        # If setting as default, unset other defaults for this company
        if is_default:
            if company:
                WorkflowTemplate.objects.filter(company=company, is_default=True).update(is_default=False)
            else:
                WorkflowTemplate.objects.filter(company__isnull=True, is_default=True).update(is_default=False)

        # Create the simplified template
        template = WorkflowTemplate.objects.create(
            name='Simplified Flow',
            description='Admin creates job → FM does QC (assigns applicators) → Start Work → Billing → Delivery',
            company=company,
            is_default=is_default,
            is_active=True,
            skip_customer_approval=True,
            skip_floor_manager_final_qc=True,
            require_supervisor_review=False,
            auto_assign_applicators=False
        )

        # Create statuses - Core workflow only (no legacy supervisor statuses)
        statuses = [
            {'status_code': 'created', 'display_name': 'Job Created', 'status_type': 'initial', 'order': 1},
            {'status_code': 'qc_pending', 'display_name': 'QC Pending', 'status_type': 'qc', 'order': 2},
            {'status_code': 'qc_completed', 'display_name': 'QC Completed', 'status_type': 'qc', 'order': 3},
            {'status_code': 'qc_rejected', 'display_name': 'QC Rejected', 'status_type': 'qc', 'order': 4},
            {'status_code': 'assigned_to_applicator', 'display_name': 'Team Assigned', 'status_type': 'assignment', 'order': 5},
            {'status_code': 'work_in_progress', 'display_name': 'Work In Progress', 'status_type': 'work', 'order': 6},
            {'status_code': 'work_completed', 'display_name': 'Work Completed', 'status_type': 'work', 'order': 7},
            {'status_code': 'ready_for_billing', 'display_name': 'Ready for Billing', 'status_type': 'billing', 'order': 8},
            {'status_code': 'billed', 'display_name': 'Billed/Paid', 'status_type': 'billing', 'order': 9},
            {'status_code': 'ready_for_delivery', 'display_name': 'Ready for Delivery', 'status_type': 'delivery', 'order': 10},
            {'status_code': 'delivered', 'display_name': 'Delivered', 'status_type': 'delivery', 'order': 11},
            {'status_code': 'closed', 'display_name': 'Closed', 'status_type': 'terminal', 'order': 12, 'is_terminal': True},
        ]

        for status_data in statuses:
            is_terminal = status_data.pop('is_terminal', False)
            WorkflowStatus.objects.create(template=template, company=company, is_terminal=is_terminal, **status_data)

        # Create transitions - Admin & Floor Manager focused
        transitions = [
            # Step 1: Admin creates and assigns to FM for QC
            {
                'from_status': 'created',
                'to_status': 'qc_pending',
                'action_name': 'Assign to Floor Manager',
                'action_description': 'Assign a floor manager to perform QC on this job',
                'allowed_roles': ['super_admin', 'company_admin', 'branch_admin'],
                'endpoint': 'assign_floor_manager',
            },
            
            # Step 2: Floor Manager does QC (pass/reject)
            {
                'from_status': 'qc_pending',
                'to_status': 'qc_completed',
                'action_name': 'Complete QC',
                'action_description': 'Perform QC inspection and document findings',
                'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager'],
                'requires_notes': False,
                'endpoint': 'complete_qc',
            },
            {
                'from_status': 'qc_pending',
                'to_status': 'qc_rejected',
                'action_name': 'Reject QC',
                'action_description': 'Reject the job due to issues',
                'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager'],
                'requires_notes': True,
                'endpoint': 'complete_qc',
            },
            {
                'from_status': 'qc_rejected',
                'to_status': 'qc_pending',
                'action_name': 'Retry QC',
                'action_description': 'Re-attempt the QC inspection',
                'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager'],
                'endpoint': 'complete_qc',
            },
            
            # Step 3: Start Work directly (optionally assign applicators in the same step)
            {
                'from_status': 'qc_completed',
                'to_status': 'work_in_progress',
                'action_name': 'Start Work',
                'action_description': 'Start work and begin timer (optionally assign applicator team)',
                'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager'],
                'endpoint': 'start_work',
            },
            
            # Step 5: Complete work
            {
                'from_status': 'work_in_progress',
                'to_status': 'work_completed',
                'action_name': 'Complete Work',
                'action_description': 'Mark work as completed',
                'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'applicator'],
                'endpoint': 'complete_work',
            },
            
            # Step 6: Ready for billing
            {
                'from_status': 'work_completed',
                'to_status': 'ready_for_billing',
                'action_name': 'Ready for Billing',
                'action_description': 'Mark job as ready for billing',
                'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager'],
                'endpoint': 'mark_ready_for_billing',
            },
            
            # Step 7: Invoice/Payment
            {
                'from_status': 'ready_for_billing',
                'to_status': 'billed',
                'action_name': 'Generate Invoice',
                'action_description': 'Create invoice for this job',
                'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager'],
                'endpoint': 'generate_invoice',
            },
            
            # Step 8: Payment received
            {
                'from_status': 'billed',
                'to_status': 'ready_for_delivery',
                'action_name': 'Mark as Paid',
                'action_description': 'Record payment received',
                'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager'],
                'endpoint': 'record_payment',
            },
            
            # Step 9: Delivery
            {
                'from_status': 'ready_for_delivery',
                'to_status': 'delivered',
                'action_name': 'Deliver Vehicle',
                'action_description': 'Complete vehicle delivery to customer',
                'allowed_roles': ['super_admin', 'company_admin', 'branch_admin', 'floor_manager'],
                'endpoint': 'deliver_vehicle',
            },
            
            # Step 10: Close job
            {
                'from_status': 'delivered',
                'to_status': 'closed',
                'action_name': 'Close Job',
                'action_description': 'Close the job card',
                'allowed_roles': ['super_admin', 'company_admin', 'branch_admin'],
                'endpoint': 'close_job',
            },
        ]

        for transition_data in transitions:
            # Remove endpoint from data as it's not a model field
            endpoint = transition_data.pop('endpoint', None)
            WorkflowTransition.objects.create(template=template, company=company, **transition_data)

        # Create role permissions - Admin, Floor Manager, and Applicator only
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
                'role': 'company_admin',
                'can_view_all_jobs': True,  # Can view all jobs in their company
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
                'can_close_job': True,  # Company admin can close jobs
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
                'can_execute_work': False,
                'can_perform_final_qc': False,
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
                'can_assign_staff': True,
                'can_perform_qc': True,
                'can_approve_qc': True,
                'can_execute_work': True,
                'can_perform_final_qc': False,
                'can_generate_invoice': True,
                'can_deliver_vehicle': True,
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
                'can_execute_work': True,
                'can_perform_final_qc': False,
                'can_generate_invoice': False,
                'can_deliver_vehicle': False,
                'can_close_job': False,
            },
        ]

        for perm_data in permissions:
            RolePermission.objects.create(template=template, company=company, **perm_data)

        self.stdout.write(self.style.SUCCESS(f'✅ Created "Simplified Flow" template for {company_str}'))
        self.stdout.write(self.style.SUCCESS(f'   - Company: {company_str}'))
        self.stdout.write(self.style.SUCCESS(f'   - Default: {is_default}'))
        self.stdout.write(self.style.SUCCESS(f'   - {len(statuses)} statuses'))
        self.stdout.write(self.style.SUCCESS(f'   - {len(transitions)} transitions'))
        self.stdout.write(self.style.SUCCESS(f'   - {len(permissions)} role permissions'))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Flow:'))
        self.stdout.write('  1. Admin/Company Admin creates job → assigns to FM for QC')
        self.stdout.write('  2. FM does QC (complete/reject) — optionally assigns applicator team')
        self.stdout.write('  3. FM clicks Start Work → TIMER STARTS (applicators already assigned)')
        self.stdout.write('  4. Team completes work')
        self.stdout.write('  5. Ready for billing → Invoice → Payment → Delivery → Close')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✅ Simplified: Admin & Floor Manager focused workflow!'))
        self.stdout.write(self.style.SUCCESS('   Roles: super_admin, company_admin, branch_admin, floor_manager, applicator'))

