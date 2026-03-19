"""
Management command to activate workflow transitions for billing and delivery stages.
"""

from django.core.management.base import BaseCommand
from jobcards.workflow_config import WorkflowTemplate, WorkflowTransition


class Command(BaseCommand):
    help = 'Activate workflow transitions for billed, ready_for_delivery, and delivered statuses'

    def handle(self, *args, **options):
        self.stdout.write('Activating workflow transitions...')
        
        # Get the Complete Flow template
        template = WorkflowTemplate.objects.filter(name='Complete Flow').first()
        
        if not template:
            self.stdout.write(self.style.ERROR('Complete Flow template not found!'))
            return
        
        # Statuses to activate transitions for
        statuses_to_activate = ['billed', 'ready_for_delivery', 'delivered']
        
        total_activated = 0
        
        for status in statuses_to_activate:
            transitions = WorkflowTransition.objects.filter(
                template=template,
                from_status=status
            )
            
            for transition in transitions:
                if not transition.is_active:
                    transition.is_active = True
                    transition.save()
                    total_activated += 1
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Activated: {transition.from_status} → {transition.to_status} '
                            f'({transition.action_name})'
                        )
                    )
                else:
                    self.stdout.write(
                        f'  Already active: {transition.from_status} → {transition.to_status} '
                        f'({transition.action_name})'
                    )
        
        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Activated {total_activated} workflow transition(s)'
            )
        )
