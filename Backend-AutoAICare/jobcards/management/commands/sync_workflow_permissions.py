"""
Management command for bulk workflow permission updates.

Usage examples:

# Add branch_admin to all billing transitions
python manage.py sync_workflow_permissions --role branch_admin --action add --pattern billing

# Remove floor_manager from close transitions
python manage.py sync_workflow_permissions --role floor_manager --action remove --pattern close

# Add branch_admin to specific transitions
python manage.py sync_workflow_permissions --role branch_admin --action add --ids 1 2 3

# Dry run to see what would be changed
python manage.py sync_workflow_permissions --role branch_admin --action add --pattern billing --dry-run

# Add to all transitions in a specific template
python manage.py sync_workflow_permissions --role branch_admin --action add --template 1

# Sync across all templates
python manage.py sync_workflow_permissions --role branch_admin --action add --pattern delivery --all-templates
"""

from django.core.management.base import BaseCommand
from jobcards.workflow_config import WorkflowEngine, WorkflowTemplate


class Command(BaseCommand):
    help = 'Bulk update workflow transition permissions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--role',
            type=str,
            required=True,
            help='Role to add or remove (e.g., branch_admin, floor_manager)'
        )
        
        parser.add_argument(
            '--action',
            type=str,
            choices=['add', 'remove'],
            default='add',
            help='Action to perform: add or remove the role'
        )
        
        parser.add_argument(
            '--pattern',
            type=str,
            help='Pattern to match in action names (e.g., billing, delivery, qc)'
        )
        
        parser.add_argument(
            '--template',
            type=int,
            help='Template ID to limit updates to'
        )
        
        parser.add_argument(
            '--ids',
            nargs='+',
            type=int,
            help='Specific transition IDs to update'
        )
        
        parser.add_argument(
            '--all-templates',
            action='store_true',
            help='Apply to all templates (use with --pattern)'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without making changes'
        )
        
        parser.add_argument(
            '--company',
            type=int,
            help='Company ID to limit updates to (for multi-tenancy)'
        )

    def handle(self, *args, **options):
        role = options['role']
        action = options['action']
        pattern = options.get('pattern')
        template_id = options.get('template')
        transition_ids = options.get('ids')
        all_templates = options['all_templates']
        dry_run = options['dry_run']
        company_id = options.get('company')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
            self.stdout.write('')
        
        company = None
        if company_id:
            from companies.models import Company
            try:
                company = Company.objects.get(id=company_id)
                self.stdout.write(f'Company filter: {company.name}')
            except Company.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Company with ID {company_id} not found'))
                return
        
        # Get template if specified
        template = None
        if template_id:
            try:
                template = WorkflowTemplate.objects.get(id=template_id)
                self.stdout.write(f'Template: {template.name} (ID: {template.id})')
            except WorkflowTemplate.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Template with ID {template_id} not found'))
                return
        
        # Build filter
        transition_filter = {}
        if pattern:
            transition_filter['action_name__icontains'] = pattern
            self.stdout.write(f'Pattern filter: "{pattern}"')
        
        if transition_ids:
            transition_filter['id__in'] = transition_ids
            self.stdout.write(f'Transition IDs: {transition_ids}')
        
        self.stdout.write('')
        self.stdout.write(f'Role: {role}')
        self.stdout.write(f'Action: {action}')
        self.stdout.write('')
        
        if dry_run:
            # Preview what would be changed
            from jobcards.workflow_config import WorkflowTransition
            
            query = WorkflowTransition.objects.all()
            if template:
                query = query.filter(template=template)
            if company:
                query = query.filter(company=company)
            if transition_filter:
                query = query.filter(**transition_filter)
            
            transitions = list(query)
            
            self.stdout.write(f'Found {len(transitions)} matching transitions:')
            self.stdout.write('')
            
            would_update = 0
            would_skip = 0
            
            for t in transitions:
                roles_list = t.allowed_roles or []
                
                if action == 'add':
                    if role not in roles_list:
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ Would ADD to: {t.action_name} ({t.from_status} → {t.to_status})')
                        )
                        would_update += 1
                    else:
                        self.stdout.write(
                            f'  - Would SKIP (already has): {t.action_name}'
                        )
                        would_skip += 1
                else:
                    if role in roles_list:
                        self.stdout.write(
                            self.style.WARNING(f'  ✓ Would REMOVE from: {t.action_name} ({t.from_status} → {t.to_status})')
                        )
                        would_update += 1
                    else:
                        self.stdout.write(
                            f'  - Would SKIP (doesn\'t have): {t.action_name}'
                        )
                        would_skip += 1
            
            self.stdout.write('')
            self.stdout.write(f'Summary: Would update {would_update}, would skip {would_skip}')
            self.stdout.write('')
            self.stdout.write('Run without --dry-run to apply changes.')
            return
        
        # Perform actual update
        if all_templates:
            # Sync across all templates
            self.stdout.write('Syncing across all templates...')
            result = WorkflowEngine.sync_role_across_workflow_types(
                role=role,
                action=action,
                transition_pattern=pattern,
                company=company
            )
            
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('✓ Sync completed!'))
            self.stdout.write('')
            self.stdout.write(f'Templates processed: {result["templates_processed"]}')
            self.stdout.write(f'Total updated: {result["total_updated"]}')
            self.stdout.write(f'Total skipped: {result["total_skipped"]}')
            self.stdout.write(f'Total errors: {result["total_errors"]}')
            self.stdout.write('')
            
            if result['details_by_template']:
                self.stdout.write('Details by template:')
                for detail in result['details_by_template']:
                    self.stdout.write(
                        f'  - {detail["template_name"]}: '
                        f'Updated {detail["updated"]}, '
                        f'Skipped {detail["skipped"]}, '
                        f'Errors {detail["errors"]}'
                    )
        else:
            # Update specific template or filtered transitions
            result = WorkflowEngine.bulk_update_transition_permissions(
                role=role,
                action=action,
                template=template,
                transition_filter=transition_filter if transition_filter else None,
                company=company
            )
            
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('✓ Bulk update completed!'))
            self.stdout.write('')
            self.stdout.write(f'Total checked: {result["total_checked"]}')
            self.stdout.write(f'Updated: {result["updated"]}')
            self.stdout.write(f'Skipped: {result["skipped"]}')
            self.stdout.write(f'Errors: {result["errors"]}')
        
        if result.get('errors', 0) > 0:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('⚠ Some errors occurred. Check logs for details.'))
