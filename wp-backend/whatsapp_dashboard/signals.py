from django.db.models.signals import post_save
from django.dispatch import receiver
from whatsapp.models import WhatsAppMessage
from .models import ChatAssignment, ChatQueue
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@receiver(post_save, sender=WhatsAppMessage)
def create_chat_assignment_on_new_message(sender, instance, created, **kwargs):
    """
    Automatically create a chat assignment when a new WhatsApp message is received.
    """
    print('##################created##################', created, instance.status)
    if created and instance.status == 'received':
        # Check if there's already an active assignment for this phone number
        existing_assignment = ChatAssignment.objects.filter(
            phone_number=instance.phone_number,
            status='active'
        ).first()
        
        if not existing_assignment:
            # Create new chat assignment
            assignment = ChatAssignment.objects.create(
                phone_number=instance.phone_number,
                status='active',
                priority='medium'  # Default priority
            )
            
            # Also add to queue for manual assignment
            ChatQueue.objects.get_or_create(
                phone_number=instance.phone_number,
                status='waiting',
                defaults={
                    'priority': 'medium',
                    'source': 'whatsapp'
                }
            )
            
            # Broadcast to team inbox WebSocket
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    "team_inbox",
                    {
                        "type": "new_chat_assignment",
                        "assignment": {
                            'id': assignment.id,
                            'phone_number': assignment.phone_number,
                            'status': assignment.status,
                            'priority': assignment.priority,
                            'assigned_at': assignment.assigned_at.isoformat(),
                            'unread_count': assignment.unread_count
                        }
                    }
                )
            except Exception as e:
                # Log error but don't fail the signal
                print(f"Error broadcasting chat assignment: {e}")

@receiver(post_save, sender=WhatsAppMessage)
def update_chat_activity_on_message(sender, instance, **kwargs):
    """
    Update the last activity timestamp of the chat assignment when a new message is received.
    """
    print('##################instance##################', instance)

    if instance.status == 'received':
        # Update the last activity of the chat assignment
        assignment = ChatAssignment.objects.filter(
            phone_number=instance.phone_number,
            status='active'
        ).first()
        
        if assignment:
            assignment.save()  # This will update last_activity_at due to auto_now=True

@receiver(post_save, sender=ChatAssignment)
def broadcast_chat_assignment_update(sender, instance, **kwargs):
    """
    Broadcast chat assignment updates to the team inbox WebSocket.
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "team_inbox",
            {
                "type": "chat_assignment_update",
                "assignment": {
                    'id': instance.id,
                    'phone_number': instance.phone_number,
                    'assigned_agent': instance.assigned_agent.username if instance.assigned_agent else None,
                    'status': instance.status,
                    'priority': instance.priority,
                    'last_activity_at': instance.last_activity_at.isoformat(),
                    'unread_count': instance.unread_count
                }
            }
        )
    except Exception as e:
        # Log error but don't fail the signal
        print(f"Error broadcasting chat assignment update: {e}")

@receiver(post_save, sender=ChatQueue)
def broadcast_queue_update(sender, instance, **kwargs):
    """
    Broadcast queue updates to the team inbox WebSocket.
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "team_inbox",
            {
                "type": "queue_update",
                "queue_data": {
                    'id': instance.id,
                    'phone_number': instance.phone_number,
                    'priority': instance.priority,
                    'status': instance.status,
                    'queued_at': instance.queued_at.isoformat(),
                    'wait_time_minutes': instance.wait_time_minutes
                }
            }
        )
    except Exception as e:
        # Log error but don't fail the signal
        print(f"Error broadcasting queue update: {e}") 