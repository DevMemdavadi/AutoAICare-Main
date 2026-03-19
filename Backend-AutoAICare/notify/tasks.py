from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template import Template, Context
import requests
from .models import NotificationTemplate, NotificationLog
from django.utils import timezone


@shared_task
def send_email_notification(user_id, notification_type, context_data=None):
    """Send email notification using template."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
        template = NotificationTemplate.objects.get(
            notification_type=notification_type,
            is_active=True
        )
        
        if template.channel not in ['email', 'both']:
            return {'status': 'skipped', 'message': 'Email not enabled for this template'}
        
        # Render template with context
        context = Context(context_data or {})
        subject = Template(template.email_subject).render(context)
        message = Template(template.email_body).render(context)
        
        # Create log entry
        log = NotificationLog.objects.create(
            template=template,
            recipient=user,
            notification_type=notification_type,
            channel='email',
            recipient_email=user.email,
            subject=subject,
            message=message,
            status='pending'
        )
        
        try:
            # Send email
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            # Update log
            log.status = 'sent'
            log.sent_at = timezone.now()
            log.save()
            
            return {'status': 'success', 'log_id': log.id}
            
        except Exception as e:
            log.status = 'failed'
            log.error_message = str(e)
            log.save()
            return {'status': 'failed', 'error': str(e)}
            
    except NotificationTemplate.DoesNotExist:
        return {'status': 'failed', 'error': 'Template not found'}
    except Exception as e:
        return {'status': 'failed', 'error': str(e)}


@shared_task
def send_sms_notification(user_id, notification_type, context_data=None):
    """Send SMS notification using MSG91."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
        
        if not user.phone:
            return {'status': 'skipped', 'message': 'User has no phone number'}
        
        template = NotificationTemplate.objects.get(
            notification_type=notification_type,
            is_active=True
        )
        
        if template.channel not in ['sms', 'both']:
            return {'status': 'skipped', 'message': 'SMS not enabled for this template'}
        
        # Render template with context
        context = Context(context_data or {})
        message = Template(template.sms_body).render(context)
        
        # Create log entry
        log = NotificationLog.objects.create(
            template=template,
            recipient=user,
            notification_type=notification_type,
            channel='sms',
            recipient_phone=user.phone,
            message=message,
            status='pending'
        )
        
        try:
            # Send SMS via MSG91
            if settings.MSG91_AUTH_KEY:
                url = "https://api.msg91.com/api/v5/flow/"
                
                payload = {
                    "sender": settings.MSG91_SENDER_ID,
                    "mobiles": user.phone,
                    "message": message,
                    "authkey": settings.MSG91_AUTH_KEY,
                }
                
                response = requests.post(url, json=payload)
                
                if response.status_code == 200:
                    log.status = 'sent'
                    log.sent_at = timezone.now()
                    log.save()
                    return {'status': 'success', 'log_id': log.id}
                else:
                    raise Exception(f"MSG91 API error: {response.text}")
            else:
                # Development mode - just log
                log.status = 'sent'
                log.sent_at = timezone.now()
                log.error_message = 'SMS not sent - MSG91 not configured (dev mode)'
                log.save()
                return {'status': 'success', 'log_id': log.id, 'note': 'dev mode'}
                
        except Exception as e:
            log.status = 'failed'
            log.error_message = str(e)
            log.save()
            return {'status': 'failed', 'error': str(e)}
            
    except NotificationTemplate.DoesNotExist:
        return {'status': 'failed', 'error': 'Template not found'}
    except Exception as e:
        return {'status': 'failed', 'error': str(e)}



@shared_task
def send_whatsapp_notification(user_id, notification_type, context_data=None):
    """Send WhatsApp notification using template."""
    from django.contrib.auth import get_user_model
    from .whatsapp_service import WhatsAppService
    from .models import WhatsAppTemplate, WhatsAppMessageLog
    
    User = get_user_model()
    
    try:
        user = User.objects.select_related('company').get(id=user_id)
        
        # Check if user has phone number
        if not user.phone:
            return {'status': 'skipped', 'message': 'User has no phone number'}
        
        # Get company
        company = user.company
        if not company:
            return {'status': 'failed', 'error': 'User has no company'}
        
        # Check if WhatsApp enabled for company
        try:
            company_settings = company.company_settings
            if not company_settings.enable_whatsapp_notifications:
                return {'status': 'skipped', 'message': 'WhatsApp not enabled for company'}
        except Exception:
            return {'status': 'skipped', 'message': 'Company settings not configured'}
        
        # Get WhatsApp template for this notification type
        try:
            template = WhatsAppTemplate.objects.get(
                company=company,
                notification_type=notification_type,
                approval_status='APPROVED',
                is_active=True
            )
        except WhatsAppTemplate.DoesNotExist:
            return {'status': 'failed', 'error': f'No approved WhatsApp template for {notification_type}'}
        
        # Prepare template variables from context_data
        body_params = []
        if template.variable_mapping and context_data:
            # Sort by parameter number (1, 2, 3, ...)
            sorted_vars = sorted(template.variable_mapping.items(), key=lambda x: int(x[0]))
            for param_num, context_key in sorted_vars:
                value = context_data.get(context_key, '')
                body_params.append(str(value))
        
        # Create log entry
        log = WhatsAppMessageLog.objects.create(
            company=company,
            recipient=user,
            recipient_phone=user.phone,
            template=template,
            template_name=template.template_name,
            message_content=template.body_text,  # Will be updated with rendered content
            status='QUEUED'
        )
        
        # Add related IDs if present in context
        if context_data:
            if 'booking_id' in context_data:
                log.related_booking_id = context_data['booking_id']
            if 'jobcard_id' in context_data or 'job_id' in context_data:
                log.related_jobcard_id = context_data.get('jobcard_id') or context_data.get('job_id')
            if 'invoice_id' in context_data:
                log.related_invoice_id = context_data['invoice_id']
            log.save()
        
        try:
            # Send WhatsApp message
            result = WhatsAppService.send_template_message(
                company=company,
                phone=user.phone,
                template_name=template.template_name,
                language_code=template.language,
                body_params=body_params
            )
            
            if result['status'] == 'success':
                log.status = 'SENT'
                log.whatsapp_message_id = result.get('message_id', '')
                log.sent_at = timezone.now()
                log.save()
                return {'status': 'success', 'log_id': log.id, 'message_id': result.get('message_id')}
            else:
                log.status = 'FAILED'
                log.error_message = result.get('error', 'Unknown error')
                log.error_code = result.get('error_code', '')
                log.save()
                return {'status': 'failed', 'error': result.get('error'), 'log_id': log.id}
        
        except Exception as e:
            log.status = 'FAILED'
            log.error_message = str(e)
            log.save()
            return {'status': 'failed', 'error': str(e), 'log_id': log.id}
    
    except User.DoesNotExist:
        return {'status': 'failed', 'error': 'User not found'}
    except Exception as e:
        return {'status': 'failed', 'error': str(e)}


@shared_task
def send_notification(user_id, notification_type, context_data=None):
    """Send notification via both email and SMS based on template settings."""
    
    email_result = send_email_notification.delay(user_id, notification_type, context_data)
    sms_result = send_sms_notification.delay(user_id, notification_type, context_data)
    
    return {
        'email_task_id': email_result.id,
        'sms_task_id': sms_result.id
    }


@shared_task
def check_job_timers():
    """
    Periodic task to check all active job timers and broadcast real-time warnings.
    Implements multi-stage warnings at: 15, 10, 7, 5, 3, 2, 1 minutes, and overdue.
    Should be run every 30 seconds via Celery Beat.
    
    Refactored to use NotificationService for cleaner, DRY code.
    """
    from jobcards.models import JobCard
    from .notification_service import NotificationService
    from .websocket_utils import broadcast_timer_update
    from django.contrib.auth import get_user_model
    from django.db.models import Q
    import logging
    
    logger = logging.getLogger(__name__)
    User = get_user_model()
    
    # Get all active jobs with timers running - optimized query
    active_jobs = JobCard.objects.select_related(
        'booking__vehicle',
        'booking__customer__user',
        'booking__branch',
        'supervisor',
        'floor_manager'
    ).filter(
        job_started_at__isnull=False,
        status__in=['work_in_progress', 'assigned_to_applicator', 'started']
    ).exclude(
        status__in=['completed', 'delivered', 'closed']
    )
    
    checked_count = 0
    notifications_sent = 0
    
    for job in active_jobs:
        checked_count += 1
        remaining = job.get_remaining_minutes()
        
        if remaining is None:
            continue
        
        # Prepare common timer data
        vehicle_info = f"{job.booking.vehicle.brand} {job.booking.vehicle.model}"
        timer_data = {
            'job_id': job.id,
            'booking_id': job.booking.id,
            'branch_id': job.booking.branch.id if job.booking.branch else None,
            'branch_name': job.booking.branch.name if job.booking.branch else 'Unknown',
            'remaining_minutes': remaining,
            'allowed_duration': job.get_allowed_duration_minutes(),
            'elapsed_minutes': job.get_elapsed_minutes(),
            'status': job.status,
            'vehicle_info': vehicle_info,
            'customer_name': job.booking.customer.user.name,
        }
        
        # Helper to get recipients for warnings (supervisor + floor manager)
        def get_warning_recipients():
            recipients = []
            if job.supervisor:
                recipients.append(job.supervisor)
            if job.floor_manager:
                recipients.append(job.floor_manager)
            return recipients
        
        # Helper to get recipients for overdue (includes admins)
        def get_overdue_recipients():
            recipients = get_warning_recipients()
            # Add admin users for overdue alerts
            admin_users = User.objects.filter(
                Q(role='super_admin') |
                Q(role='company_admin') |
                (Q(role='branch_admin') & Q(branch=job.booking.branch))
            ).distinct()
            recipients.extend(admin_users)
            return recipients
        
        # Unified helper to send warning notification
        def send_warning(threshold_minutes, flag_field, is_critical=False, is_overdue=False):
            nonlocal notifications_sent
            
            # Determine recipients and message
            if is_overdue:
                recipients = get_overdue_recipients()
                overdue_minutes = abs(remaining)
                branch_prefix = f"[{timer_data['branch_name']}] " if timer_data.get('branch_name') else ""
                title = f"{branch_prefix}Job Time OVERDUE - ALERT" if any(u.role in ['super_admin', 'company_admin', 'branch_admin'] for u in recipients) else f"{branch_prefix}Job Time OVERDUE"
                message = f"Branch: {timer_data.get('branch_name', 'Unknown')} - Job #{job.id} ({vehicle_info}) is {overdue_minutes} minutes overdue! Immediate attention required."
                event_type = 'timer_overdue'
                notification_type = 'job_overdue'
                timer_data['overdue_minutes'] = overdue_minutes
                timer_data['message'] = f"OVERDUE: Job #{job.id} is {overdue_minutes} minutes over time!"
                # Removed logging statement: logger.error(f"Timer OVERDUE: Job #{job.id} is {overdue_minutes} minutes overdue")
            elif is_critical:
                recipients = get_warning_recipients()
                branch_prefix = f"[{timer_data['branch_name']}] " if timer_data.get('branch_name') else ""
                title = f"{branch_prefix}CRITICAL: Job Time - 1 Minute"
                message = f"Branch: {timer_data.get('branch_name', 'Unknown')} - URGENT: Job #{job.id} ({vehicle_info}) has less than 1 minute remaining!"
                event_type = 'timer_critical'
                notification_type = 'job_warning'
                timer_data['warning_type'] = '1_minute'
                timer_data['threshold'] = 1
                timer_data['message'] = message
                logger.warning(f"Timer CRITICAL: Job #{job.id} has {remaining} minute remaining")
            else:
                recipients = get_warning_recipients()
                branch_prefix = f"[{timer_data['branch_name']}] " if timer_data.get('branch_name') else ""
                title = f"{branch_prefix}Job Time Warning - {threshold_minutes} Minutes"
                message = f"Branch: {timer_data.get('branch_name', 'Unknown')} - Job #{job.id} ({vehicle_info}) has {remaining} minutes remaining!"
                event_type = f'timer_warning_{threshold_minutes}min'
                notification_type = 'job_warning'
                timer_data['warning_type'] = f'{threshold_minutes}_minutes'
                timer_data['threshold'] = threshold_minutes
                timer_data['message'] = message
                logger.info(f"Timer {threshold_minutes}min: Job #{job.id} has {remaining} minutes remaining")
            
            # Broadcast via WebSocket
            broadcast_timer_update(event_type, timer_data)
            
            # Send notification via NotificationService to all recipients at once
            if recipients:
                result = NotificationService.send(
                    notification_type=notification_type,
                    recipients=recipients,
                    title=title,
                    message=message,
                    channels=['in_app'],  # WebSocket already broadcast above
                    related_jobcard_id=job.id,
                    context_data=timer_data
                )
                notifications_sent += len(recipients)
            
            # Mark warning as sent
            setattr(job, flag_field, True)
            job.save(update_fields=[flag_field])
        
        # Check for warnings at different thresholds
        if 14 <= remaining <= 15 and not job.warning_15min_sent:
            send_warning(15, 'warning_15min_sent')
        
        elif 9 <= remaining <= 10 and not job.warning_10min_sent:
            send_warning(10, 'warning_10min_sent')
        
        elif 6 <= remaining <= 7 and not job.warning_7min_sent:
            send_warning(7, 'warning_7min_sent')
        
        elif 4 <= remaining <= 5 and not job.warning_5min_sent:
            send_warning(5, 'warning_5min_sent')
            # Also set legacy warning_sent flag for backward compatibility
            if not job.warning_sent:
                job.warning_sent = True
                job.save(update_fields=['warning_sent'])
        
        elif 2 <= remaining <= 3 and not job.warning_3min_sent:
            send_warning(3, 'warning_3min_sent')
        
        elif 1 < remaining <= 2 and not job.warning_2min_sent:
            send_warning(2, 'warning_2min_sent')
        
        elif 0 < remaining <= 1 and not job.warning_1min_sent:
            send_warning(1, 'warning_1min_sent', is_critical=True)
        
        elif remaining < 0 and not job.overdue_notification_sent:
            send_warning(0, 'overdue_notification_sent', is_overdue=True)
    
    logger.info(f"Timer check complete: {checked_count} jobs checked, {notifications_sent} notifications sent")
    return {
        'checked_jobs': checked_count,
        'notifications_sent': notifications_sent
    }
