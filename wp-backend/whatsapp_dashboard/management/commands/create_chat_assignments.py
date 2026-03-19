from django.core.management.base import BaseCommand
from django.utils import timezone
from whatsapp.models import WhatsAppMessage
from whatsapp_dashboard.models import ChatAssignment, ChatQueue
from datetime import timedelta

class Command(BaseCommand):
    help = 'Create chat assignments for unassigned WhatsApp conversations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Look back this many hours for new messages (default: 24)'
        )
        parser.add_argument(
            '--auto-assign',
            action='store_true',
            help='Automatically assign chats to available agents'
        )

    def handle(self, *args, **options):
        hours = options['hours']
        auto_assign = options['auto_assign']
        
        # Look back specified hours
        cutoff_time = timezone.now() - timedelta(hours=hours)
        
        # Find phone numbers with recent messages that don't have active assignments
        recent_messages = WhatsAppMessage.objects.filter(
            timestamp__gte=cutoff_time
        ).values_list('phone_number', flat=True).distinct()
        
        created_count = 0
        assigned_count = 0
        
        for phone_number in recent_messages:
            # Check if there's already an active assignment for this phone number
            existing_assignment = ChatAssignment.objects.filter(
                phone_number=phone_number,
                status='active'
            ).first()
            
            if not existing_assignment:
                # Create new chat assignment
                assignment = ChatAssignment.objects.create(
                    phone_number=phone_number,
                    status='active',
                    priority='medium'  # Default priority
                )
                created_count += 1
                
                # Also add to queue for manual assignment
                ChatQueue.objects.get_or_create(
                    phone_number=phone_number,
                    status='waiting',
                    defaults={
                        'priority': 'medium',
                        'source': 'whatsapp'
                    }
                )
                
                self.stdout.write(
                    self.style.SUCCESS(f'Created assignment for {phone_number}')
                )
        
        if auto_assign:
            # Auto-assign unassigned chats
            from whatsapp_dashboard.models import AgentAvailability
            
            unassigned_chats = ChatAssignment.objects.filter(
                assigned_agent__isnull=True,
                status='active'
            )
            
            available_agents = AgentAvailability.objects.filter(
                is_available=True
            ).order_by('current_chat_count')
            
            for chat in unassigned_chats:
                if available_agents.exists():
                    # Find agent with least chats
                    best_agent = min(available_agents, key=lambda a: a.current_chat_count)
                    
                    if best_agent.capacity_remaining > 0:
                        chat.assigned_agent = best_agent.agent
                        chat.save()
                        
                        # Update agent's chat count
                        best_agent.update_chat_count()
                        assigned_count += 1
                        
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Assigned {chat.phone_number} to {best_agent.agent.username}'
                            )
                        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} chat assignments'
            )
        )
        
        if auto_assign:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully auto-assigned {assigned_count} chats'
                )
            ) 