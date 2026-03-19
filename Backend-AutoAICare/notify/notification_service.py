"""
Unified Notification Service

Centralized service for sending notifications through multiple channels:
- Email/SMS (async via Celery)
- In-app notifications (persistent in database)
- Real-time WebSocket broadcasts

Usage:
    from notify.notification_service import NotificationService
    
    NotificationService.send(
        notification_type='job_warning',
        recipients=[user1, user2],
        title='Job Warning',
        message='Job is running late',
        channels=['in_app', 'websocket'],
        related_jobcard_id=123
    )
"""

from typing import List, Optional, Dict, Any
from django.contrib.auth import get_user_model
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class NotificationService:
    """
    Centralized notification service that coordinates all notification channels.
    """
    
    # Default channels for each notification type
    DEFAULT_CHANNELS = {
        # Job-related notifications
        'job_created': ['in_app', 'email'],
        'job_started': ['in_app', 'email', 'websocket', 'whatsapp'],
        'job_in_progress': ['in_app', 'websocket'],
        'job_completed': ['in_app', 'email', 'websocket', 'whatsapp'],
        'job_warning': ['in_app', 'websocket'],
        'job_overdue': ['in_app', 'email', 'websocket'],
        
        # Booking-related notifications
        'booking_created': ['in_app', 'email', 'whatsapp'],
        'booking_confirmed': ['in_app', 'email', 'sms', 'whatsapp'],
        'booking_cancelled': ['in_app', 'email', 'whatsapp'],
        
        # Appointment-related notifications
        'appointment_created': ['in_app', 'email'],
        'appointment_approved': ['in_app', 'email', 'whatsapp'],
        'appointment_rejected': ['in_app', 'email'],
        
        # Status updates
        'job_status_update': ['in_app', 'websocket'],
        
        # Payment notifications
        'payment_success': ['in_app', 'email', 'whatsapp'],
        'payment_failed': ['in_app', 'email'],
        
        # Invoice notifications
        'invoice_created': ['in_app', 'email', 'whatsapp'],
        
        # Rewards
        'reward_earned': ['in_app'],
        'deduction_earned': ['in_app'],
        
        # Reviews
        'feedback_request': ['in_app', 'email', 'whatsapp'],
        'google_review_request': ['in_app', 'email'],
    }
    
    @classmethod
    def send(
        cls,
        notification_type: str,
        recipients: List[User],
        title: str,
        message: str,
        context_data: Optional[Dict[str, Any]] = None,
        channels: Optional[List[str]] = None,
        broadcast_groups: Optional[List[str]] = None,
        related_booking_id: Optional[int] = None,
        related_jobcard_id: Optional[int] = None,
        related_invoice_id: Optional[int] = None,
        related_appointment_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Send notification to multiple recipients via specified channels.
        
        Args:
            notification_type: Type of notification (e.g., 'job_warning', 'job_completed')
            recipients: List of User objects to notify
            title: Notification title
            message: Notification message
            context_data: Optional dict with additional context for templates
            channels: List of channels to use ['in_app', 'email', 'sms', 'websocket']
                     If None, uses default channels for notification_type
            broadcast_groups: Optional list of WebSocket group names for broadcasting
            related_booking_id: Optional booking ID
            related_jobcard_id: Optional job card ID
            related_invoice_id: Optional invoice ID
            related_appointment_id: Optional appointment ID
        
        Returns:
            Dict with results for each channel
        """
        if not recipients:
            # Removed logging statement: logger.warning(f"No recipients specified for notification type: {notification_type}")
            return {'status': 'skipped', 'reason': 'no_recipients'}
        
        # Use default channels if not specified
        if channels is None:
            channels = cls.DEFAULT_CHANNELS.get(notification_type, ['in_app'])
        
        results = {
            'notification_type': notification_type,
            'recipients_count': len(recipients),
            'channels': channels,
            'results': {}
        }
        
        # Send to each recipient via each channel
        for recipient in recipients:
            recipient_results = {}
            
            # 1. In-app notification (persistent)
            if 'in_app' in channels:
                try:
                    # Add appointment_id to context_data if provided
                    notification_context = context_data.copy() if context_data else {}
                    if related_appointment_id:
                        notification_context['appointment_id'] = related_appointment_id
                    
                    in_app_result = cls._create_in_app_notification(
                        user=recipient,
                        notification_type=notification_type,
                        title=title,
                        message=message,
                        related_booking_id=related_booking_id,
                        related_jobcard_id=related_jobcard_id,
                        related_invoice_id=related_invoice_id,
                        extra_data=notification_context
                    )
                    recipient_results['in_app'] = in_app_result
                except Exception as e:
                    # Removed logging statement: logger.error(f"In-app notification failed for user {recipient.id}: {str(e)}")
                    recipient_results['in_app'] = {'status': 'failed', 'error': str(e)}
            
            # 2. Email notification (async)
            if 'email' in channels:
                try:
                    email_result = cls._send_email_notification(
                        user=recipient,
                        notification_type=notification_type,
                        context_data=context_data
                    )
                    recipient_results['email'] = email_result
                except Exception as e:
                    logger.error(f"Email notification failed for user {recipient.id}: {str(e)}")
                    recipient_results['email'] = {'status': 'failed', 'error': str(e)}
            
            # 3. SMS notification (async)
            if 'sms' in channels:
                try:
                    sms_result = cls._send_sms_notification(
                        user=recipient,
                        notification_type=notification_type,
                        context_data=context_data
                    )
                    recipient_results['sms'] = sms_result
                except Exception as e:
                    logger.error(f"SMS notification failed for user {recipient.id}: {str(e)}")
                    recipient_results['sms'] = {'status': 'failed', 'error': str(e)}
            
            # 4. WhatsApp notification (async)
            if 'whatsapp' in channels:
                try:
                    whatsapp_result = cls._send_whatsapp_notification(
                        user=recipient,
                        notification_type=notification_type,
                        context_data=context_data
                    )
                    recipient_results['whatsapp'] = whatsapp_result
                except Exception as e:
                    logger.error(f"WhatsApp notification failed for user {recipient.id}: {str(e)}")
                    recipient_results['whatsapp'] = {'status': 'failed', 'error': str(e)}
            
            results['results'][recipient.id] = recipient_results
        
        # 4. WebSocket broadcast (to groups, not individual users)
        if 'websocket' in channels and broadcast_groups:
            try:
                websocket_result = cls._broadcast_websocket(
                    notification_type=notification_type,
                    broadcast_groups=broadcast_groups,
                    data={
                        'title': title,
                        'message': message,
                        'notification_type': notification_type,
                        'related_booking_id': related_booking_id,
                        'related_jobcard_id': related_jobcard_id,
                        **(context_data or {})
                    }
                )
                results['websocket'] = websocket_result
            except Exception as e:
                logger.error(f"WebSocket broadcast failed: {str(e)}")
                results['websocket'] = {'status': 'failed', 'error': str(e)}
        
        return results
    
    @staticmethod
    def _create_in_app_notification(
        user: User,
        notification_type: str,
        title: str,
        message: str,
        related_booking_id: Optional[int] = None,
        related_jobcard_id: Optional[int] = None,
        related_invoice_id: Optional[int] = None,
        extra_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Create in-app notification (also auto-broadcasts via WebSocket to user's channel).
        """
        from .utils import create_in_app_notification
        
        notification = create_in_app_notification(
            user_id=user.id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_booking_id=related_booking_id,
            related_jobcard_id=related_jobcard_id,
            related_invoice_id=related_invoice_id,
            extra_data=extra_data
        )
        
        if notification:
            return {'status': 'success', 'notification_id': notification.id}
        else:
            return {'status': 'failed', 'error': 'Failed to create notification'}
    
    @staticmethod
    def _send_email_notification(
        user: User,
        notification_type: str,
        context_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send email notification via Celery task.
        """
        from .tasks import send_email_notification
        
        try:
            task = send_email_notification.delay(user.id, notification_type, context_data)
            return {'status': 'queued', 'task_id': task.id}
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}
    
    @staticmethod
    def _send_sms_notification(
        user: User,
        notification_type: str,
        context_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send SMS notification via Celery task.
        """
        from .tasks import send_sms_notification
        
        try:
            task = send_sms_notification.delay(user.id, notification_type, context_data)
            return {'status': 'queued', 'task_id': task.id}
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}
    
    
    @staticmethod
    def _send_whatsapp_notification(
        user: User,
        notification_type: str,
        context_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send WhatsApp notification based on company's mode setting.
        Supports both manual (wa.me links) and automated (Cloud API) modes.
        """
        from .tasks import send_whatsapp_notification
        from .whatsapp_manual_service import WhatsAppManualService
        from .models import WhatsAppTemplate
        
        try:
            # Get company and settings
            company = user.company
            if not company:
                return {'status': 'no_company', 'message': 'User has no company'}
            
            company_settings = company.company_settings
            
            # Check if WhatsApp is enabled
            if not company_settings.enable_whatsapp_notifications:
                return {'status': 'disabled', 'message': 'WhatsApp notifications disabled'}
            
            # Get template and render message
            try:
                template = WhatsAppTemplate.objects.get(
                    company=company,
                    notification_type=notification_type,
                    is_active=True
                )
            except WhatsAppTemplate.DoesNotExist:
                return {'status': 'no_template', 'message': f'No active template for {notification_type}'}
            
            # Render message content
            message_content = template.body_text
            if context_data:
                # Simple variable replacement
                for key, value in context_data.items():
                    message_content = message_content.replace(f'{{{{{key}}}}}', str(value))
            
            # MODE 1: Manual (Click-to-Send)
            if company_settings.whatsapp_mode == 'manual':
                log = WhatsAppManualService.create_pending_message(
                    company=company,
                    recipient=user,
                    template_name=template.template_name,
                    message_content=message_content,
                    context_data=context_data
                )
                
                return {
                    'status': 'pending_manual',
                    'mode': 'manual',
                    'log_id': log.id,
                    'whatsapp_link': log.whatsapp_link,
                    'message': 'Manual send link generated'
                }
            
            # MODE 2: Automated (Cloud API)
            elif company_settings.whatsapp_mode == 'api':
                task = send_whatsapp_notification.delay(user.id, notification_type, context_data)
                return {
                    'status': 'queued',
                    'mode': 'api',
                    'task_id': task.id,
                    'message': 'Automated send queued'
                }
            
            else:
                return {'status': 'invalid_mode', 'message': f'Invalid WhatsApp mode: {company_settings.whatsapp_mode}'}
                
        except Exception as e:
            logger.error(f"WhatsApp notification failed for user {user.id}: {str(e)}")
            return {'status': 'failed', 'error': str(e)}
    
    @staticmethod
    def _broadcast_websocket(
        notification_type: str,
        broadcast_groups: List[str],
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Broadcast to WebSocket groups.
        """
        from .websocket_utils import broadcast_timer_update, broadcast_status_change
        
        try:
            # Determine which broadcast function to use based on notification type
            if 'timer' in notification_type or 'warning' in notification_type or 'overdue' in notification_type:
                # Use timer broadcast
                for group in broadcast_groups:
                    broadcast_timer_update(
                        event_type=notification_type,
                        data=data
                    )
            else:
                # Use status change broadcast for job-related updates
                if 'jobcard_' in str(broadcast_groups):
                    jobcard_id = data.get('related_jobcard_id')
                    if jobcard_id:
                        broadcast_status_change(
                            jobcard_id=jobcard_id,
                            old_status=None,
                            new_status=data.get('status', 'updated'),
                            jobcard_data=data
                        )
            
            return {'status': 'success', 'groups': broadcast_groups}
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}
    
    @classmethod
    def get_recipients_for_job(
        cls,
        job,
        include_customer: bool = True,
        include_supervisor: bool = True,
        include_floor_manager: bool = True,
        include_applicators: bool = False,
        include_admins: bool = False
    ) -> List[User]:
        """
        Helper method to get all relevant recipients for a job card.
        
        Args:
            job: JobCard instance
            include_customer: Include customer user
            include_supervisor: Include supervisor
            include_floor_manager: Include floor manager
            include_applicators: Include applicator team
            include_admins: Include branch/super admins
        
        Returns:
            List of unique User objects
        """
        recipients = []
        
        if include_customer and job.booking and job.booking.customer:
            recipients.append(job.booking.customer.user)
        
        if include_supervisor and job.supervisor:
            recipients.append(job.supervisor)
        
        if include_floor_manager and job.floor_manager:
            recipients.append(job.floor_manager)
        
        if include_applicators:
            recipients.extend(job.applicator_team.all())
        
        if include_admins and job.booking and job.booking.branch:
            admin_users = User.objects.filter(
                Q(role='super_admin') |
                Q(role='company_admin') |
                (Q(role='branch_admin') & Q(branch=job.booking.branch))
            ).distinct()
            recipients.extend(admin_users)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_recipients = []
        for user in recipients:
            if user.id not in seen:
                seen.add(user.id)
                unique_recipients.append(user)
        
        return unique_recipients
    
    @classmethod
    def get_recipients_for_appointment(
        cls,
        appointment,
        include_customer: bool = False,
        include_admins: bool = True
    ) -> List[User]:
        """
        Helper method to get all relevant recipients for an appointment.
        
        Args:
            appointment: Appointment instance
            include_customer: Include customer user
            include_admins: Include branch/super admins
        
        Returns:
            List of unique User objects
        """
        recipients = []
        
        if include_customer and appointment.customer:
            recipients.append(appointment.customer.user)
        
        if include_admins and appointment.branch:
            admin_users = User.objects.filter(
                Q(role='super_admin') |
                (Q(role='branch_admin') & Q(branch=appointment.branch))
            ).distinct()
            recipients.extend(admin_users)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_recipients = []
        for user in recipients:
            if user.id not in seen:
                seen.add(user.id)
                unique_recipients.append(user)
        
        return unique_recipients
