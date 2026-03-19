"""
WebSocket broadcasting utilities for real-time updates.
"""

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def broadcast_to_jobcard(jobcard_id, event_type, data):
    """
    Broadcast an event to all users viewing a specific job card.
    
    Args:
        jobcard_id: ID of the job card
        event_type: Type of event (e.g., 'note_added', 'status_changed')
        data: Event data dictionary
    """
    try:
        channel_layer = get_channel_layer()
        group_name = f'jobcard_{jobcard_id}'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': event_type,
                'data': data,
            }
        )
    except Exception as e:
        print(f"Error broadcasting to job card: {str(e)}")


def broadcast_timer_update(event_type, data, job_id=None, user_id=None, role=None):
    """
    Broadcast timer updates to relevant users with branch filtering.
    
    Args:
        event_type: Type of timer event (e.g., 'timer_warning', 'timer_overdue')
        data: Event data dictionary (should include branch_id if available)
        job_id: Optional job ID for specific job timer
        user_id: Optional user ID for user-specific timer
        role: Optional role for role-specific broadcast
    """
    try:
        channel_layer = get_channel_layer()
        
        # Start with empty groups - branch filtering is enforced
        groups = []
        
        # Branch-specific broadcast for floor managers and branch admins
        branch_id = data.get('branch_id')
        if branch_id:
            groups.append(f'timer_updates_branch_{branch_id}')
        
        # Global broadcast for company and super admins (see all branches)
        groups.append('timer_updates_all')
        
        if user_id:
            groups.append(f'timers_user_{user_id}')
        
        if role:
            groups.append(f'timers_role_{role}')
        
        for group_name in groups:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': event_type,
                    'data': data,
                }
            )
    except Exception as e:
        print(f"Error broadcasting timer update: {str(e)}")


def broadcast_dashboard_update(event_type, data, role=None, branch_id=None):
    """
    Broadcast dashboard updates to relevant users.
    
    Args:
        event_type: Type of dashboard event (e.g., 'metrics_updated', 'job_list_updated')
        data: Event data dictionary
        role: Optional role for role-specific broadcast
        branch_id: Optional branch ID for branch-specific broadcast
    """
    try:
        channel_layer = get_channel_layer()
        groups = ['dashboard_all']
        
        if role:
            groups.append(f'dashboard_{role}')
        
        if branch_id:
            groups.append(f'dashboard_branch_{branch_id}')
        
        for group_name in groups:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': event_type,
                    'data': data,
                }
            )
    except Exception as e:
        print(f"Error broadcasting dashboard update: {str(e)}")


def broadcast_status_change(jobcard_id, old_status, new_status, jobcard_data, changed_by=None):
    """
    Broadcast job card status change to all relevant channels.
    
    Args:
        jobcard_id: ID of the job card
        old_status: Previous status
        new_status: New status
        jobcard_data: Serialized job card data
        changed_by: User who made the change
    """
    try:
        channel_layer = get_channel_layer()
        
        data = {
            'jobcard_id': jobcard_id,
            'old_status': old_status,
            'new_status': new_status,
            'jobcard': jobcard_data,
            'changed_by': changed_by,
        }
        
        # Broadcast to job card viewers
        broadcast_to_jobcard(jobcard_id, 'status_changed', data)
        
        # Broadcast to all dashboards
        broadcast_dashboard_update('job_list_updated', {
            'action': 'status_changed',
            'jobcard_id': jobcard_id,
            'old_status': old_status,
            'new_status': new_status,
        })

        # Broadcast update to customer
        broadcast_progress_update(jobcard_id, {
            'status': new_status,
            'jobcard_id': jobcard_id,
            'vehicle_info': jobcard_data.get('vehicle_info', ''),
            'updated_at': jobcard_data.get('updated_at', ''),
        })
        
    except Exception as e:
        print(f"Error broadcasting status change: {str(e)}")


def broadcast_booking_update(booking_id, status, booking_data, user_id=None):
    """
    Broadcast booking status update to relevant channels.
    
    Args:
        booking_id: ID of the booking
        status: New status of the booking
        booking_data: Serialized booking data
        user_id: ID of the user (customer) to notify
    """
    try:
        channel_layer = get_channel_layer()
        
        # Broadcast to dashboard
        broadcast_dashboard_update('booking_update', {
            'action': 'status_changed',
            'booking_id': booking_id,
            'status': status,
            'booking': booking_data
        })
        
        # Broadcast to customer if user_id is provided
        if user_id:
            group_name = f'notifications_user_{user_id}'
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'booking_updated_message',  # Handler in NotificationConsumer
                    'data': {
                        'booking_id': booking_id,
                        'status': status,
                        'booking': booking_data
                    }
                }
            )
        
    except Exception as e:
        print(f"Error broadcasting booking update: {str(e)}")


def broadcast_team_assignment(jobcard_id, assignment_type, user_ids, jobcard_data):
    """
    Broadcast team assignment changes.
    
    Args:
        jobcard_id: ID of the job card
        assignment_type: Type of assignment (e.g., 'floor_manager', 'supervisor', 'applicator')
        user_ids: List of assigned user IDs
        jobcard_data: Serialized job card data
    """
    try:
        channel_layer = get_channel_layer()
        
        data = {
            'jobcard_id': jobcard_id,
            'assignment_type': assignment_type,
            'assigned_users': user_ids,
            'jobcard': jobcard_data,
        }
        
        # Broadcast to job card viewers
        broadcast_to_jobcard(jobcard_id, 'assignment_changed', data)
        
        # Broadcast to assigned users' notification channels
        from .utils import broadcast_notification_to_user
        from .models import InAppNotification
        
        for user_id in user_ids:
            async_to_sync(channel_layer.group_send)(
                f'notifications_user_{user_id}',
                {
                    'type': 'notification_message',
                    'data': {
                        'notification_type': 'assignment',
                        'title': 'New Job Assignment',
                        'message': f'You have been assigned to Job Card #{jobcard_id}',
                        'related_jobcard_id': jobcard_id,
                    }
                }
            )
        
        # Broadcast to dashboards
        broadcast_dashboard_update('assignment_update', data)
        
    except Exception as e:
        print(f"Error broadcasting team assignment: {str(e)}")


def broadcast_note_added(jobcard_id, note_data):
    """
    Broadcast new note to all job card viewers.
    
    Args:
        jobcard_id: ID of the job card
        note_data: Serialized note data
    """
    broadcast_to_jobcard(jobcard_id, 'note_added', note_data)


def broadcast_task_update(jobcard_id, task_data, action='created'):
    """
    Broadcast dynamic task update to all job card viewers.
    
    Args:
        jobcard_id: ID of the job card
        task_data: Serialized task data
        action: 'created', 'updated', or 'deleted'
    """
    event_type = 'task_created' if action == 'created' else 'task_updated'
    data = {
        'action': action,
        'task': task_data,
    }
    broadcast_to_jobcard(jobcard_id, event_type, data)


def broadcast_progress_update(jobcard_id, progress_data):
    """
    Broadcast job progress update to customer and staff.
    
    Args:
        jobcard_id: ID of the job card
        progress_data: Progress information (percentage, status, etc.)
    """
    try:
        channel_layer = get_channel_layer()
        
        # Broadcast to customer tracking
        customer_group = f'customer_job_{jobcard_id}'
        async_to_sync(channel_layer.group_send)(
            customer_group,
            {
                'type': 'progress_updated',
                'data': progress_data,
            }
        )
        
        # Also broadcast to job card viewers (staff)
        broadcast_to_jobcard(jobcard_id, 'status_changed', progress_data)
        
    except Exception as e:
        print(f"Error broadcasting progress update: {str(e)}")


def broadcast_jobcard_updated(jobcard_id, reason='data_changed'):
    """
    Lightweight catch-all broadcast — tells all viewers of a job card to refresh.
    
    Args:
        jobcard_id: ID of the job card
        reason: Short description of what changed (for logging/debugging)
    """
    broadcast_to_jobcard(jobcard_id, 'jobcard_updated', {
        'jobcard_id': jobcard_id,
        'reason': reason,
    })


def broadcast_timer_event(jobcard_id, event_type, timer_data):
    """
    Broadcast timer pause/resume events to job card viewers.
    
    Args:
        jobcard_id: ID of the job card
        event_type: 'timer_paused' or 'timer_resumed'
        timer_data: Timer state data (pause reason, durations, etc.)
    """
    broadcast_to_jobcard(jobcard_id, event_type, timer_data)

