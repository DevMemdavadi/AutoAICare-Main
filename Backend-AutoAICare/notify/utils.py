"""Utility functions for creating in-app notifications."""

from .models import InAppNotification
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from decimal import Decimal
import json

User = get_user_model()


def convert_decimal_to_float(obj):
    """
    Recursively convert Decimal values to float for JSON serialization.
    """
    if isinstance(obj, dict):
        return {key: convert_decimal_to_float(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimal_to_float(item) for item in obj]
    elif isinstance(obj, Decimal):
        return float(obj)
    else:
        return obj


def create_in_app_notification(
    user_id,
    notification_type,
    title,
    message,
    related_booking_id=None,
    related_jobcard_id=None,
    related_invoice_id=None,
    extra_data=None
):
    """
    Create an in-app notification for a user and broadcast via WebSocket.
    
    Args:
        user_id: ID of the user to notify
        notification_type: Type of notification (from InAppNotification.TYPE_CHOICES)
        title: Notification title
        message: Notification message
        related_booking_id: Optional booking ID
        related_jobcard_id: Optional job card ID
        related_invoice_id: Optional invoice ID
        extra_data: Optional dict with additional data
    
    Returns:
        InAppNotification instance
    """
    try:
        user = User.objects.get(id=user_id)
        
        # Convert any Decimal values in extra_data to float for JSON serialization
        safe_extra_data = convert_decimal_to_float(extra_data) if extra_data else {}
        
        notification = InAppNotification.objects.create(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message,
            related_booking_id=related_booking_id,
            related_jobcard_id=related_jobcard_id,
            related_invoice_id=related_invoice_id,
            extra_data=safe_extra_data
        )
        
        # Broadcast notification via WebSocket
        broadcast_notification_to_user(user_id, notification)
        
        return notification
    except User.DoesNotExist:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"User {user_id} not found when creating in-app notification")
        return None
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error creating in-app notification: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None


def broadcast_notification_to_user(user_id, notification):
    """
    Broadcast a notification to a user's WebSocket connection.
    
    Args:
        user_id: ID of the user to send notification to
        notification: InAppNotification instance
    """
    try:
        channel_layer = get_channel_layer()
        
        # Prepare notification data and ensure Decimal values are converted
        notification_data = {
            'id': notification.id,
            'notification_type': notification.notification_type,
            'title': notification.title,
            'message': notification.message,
            'is_read': notification.is_read,
            'related_booking_id': notification.related_booking_id,
            'related_jobcard_id': notification.related_jobcard_id,
            'related_invoice_id': notification.related_invoice_id,
            'extra_data': convert_decimal_to_float(notification.extra_data),
            'created_at': notification.created_at.isoformat(),
        }
        
        # Send to user's group
        group_name = f'notifications_user_{user_id}'
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'notification_message',
                'data': notification_data,
            }
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error broadcasting notification: {str(e)}")
