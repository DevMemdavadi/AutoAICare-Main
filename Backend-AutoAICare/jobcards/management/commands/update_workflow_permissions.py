"""
Management command to update existing workflow templates with correct permissions.
"""

from django.core.management.base import BaseCommand
from jobcards.workflow_config import WorkflowTemplate, WorkflowTransition, RolePermission
from jobcards.workflow_serializers import get_default_role_permissions


class Command(BaseCommand):
    help = 'Update existing workflow templates with company_admin and floor_manager permissions'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting workflow permission updates...'))
        
        # Update all workflow transitions to include company_admin
        transitions_updated = 0
        for transition in WorkflowTransition.objects.all():
            if transition.allowed_roles and 'company_admin' not in transition.allowed_roles:
                # Add company_admin to allowed roles
                transition.allowed_roles.append('company_admin')
                
                # Also add branch_admin if it's a QC or assignment action
                if 'qc' in transition.action_name.lower() or 'assign' in transition.action_name.lower():
                    if 'branch_admin' not in transition.allowed_roles:
                        transition.allowed_roles.append('branch_admin')
                
                # Add floor_manager to "Assign Applicators" if not present
                if 'assign applicators' in transition.action_name.lower():
                    if 'floor_manager' not in transition.allowed_roles:
                        transition.allowed_roles.append('floor_manager')
                
                transition.save()
                transitions_updated += 1
                self.stdout.write(f'  Updated transition: {transition.action_name}')
        
        self.stdout.write(self.style.SUCCESS(f'Updated {transitions_updated} transitions'))
        
        # Update or create role permissions for company_admin
        templates_updated = 0
        for template in WorkflowTemplate.objects.all():
            # Check if company_admin permission exists
            company_admin_perm, created = RolePermission.objects.get_or_create(
                template=template,
                role='company_admin',
                defaults={
                    'company': template.company,
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
                }
            )
            
            if created:
                self.stdout.write(f'  Created company_admin permissions for template: {template.name}')
                templates_updated += 1
            
            # Update floor_manager to have can_assign_staff
            try:
                fm_perm = RolePermission.objects.get(template=template, role='floor_manager')
                if not fm_perm.can_assign_staff:
                    fm_perm.can_assign_staff = True
                    fm_perm.save()
                    self.stdout.write(f'  Updated floor_manager permissions for template: {template.name}')
                    templates_updated += 1
            except RolePermission.DoesNotExist:
                # Create floor_manager permission if it doesn't exist
                RolePermission.objects.create(
                    template=template,
                    role='floor_manager',
                    company=template.company,
                    can_view_all_jobs=False,
                    can_view_branch_jobs=True,
                    can_view_assigned_jobs=True,
                    can_create_jobcard=False,
                    can_assign_staff=True,
                    can_perform_qc=True,
                    can_approve_qc=True,
                    can_execute_work=False,
                    can_perform_final_qc=False,
                    can_generate_invoice=True,
                    can_deliver_vehicle=True,
                    can_close_job=False,
                    can_add_parts=True,
                    can_manage_parts_inventory=False,
                )
                self.stdout.write(f'  Created floor_manager permissions for template: {template.name}')
                templates_updated += 1
        
        self.stdout.write(self.style.SUCCESS(f'Updated {templates_updated} template permissions'))
        self.stdout.write(self.style.SUCCESS('Workflow permission update complete!'))
