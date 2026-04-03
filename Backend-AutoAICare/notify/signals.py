from django.db.models.signals import post_save
from django.dispatch import receiver
from bookings.models import Booking
from jobcards.models import JobCard
from payments.models import Payment
from billing.models import Invoice
from .tasks import send_notification
from .utils import create_in_app_notification
from .websocket_utils import (
    broadcast_status_change,
    broadcast_dashboard_update,
    broadcast_timer_update,
    broadcast_booking_update,
    broadcast_jobcard_updated,
)


from django.db.models import Q
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(post_save, sender=Booking)
def booking_notification_handler(sender, instance, created, **kwargs):
    """Send notifications when booking is created or status changes."""

    def get_package_name(booking):
        """Return comma-joined service names for this booking (multi-service aware)."""
        try:
            pkgs = list(booking.packages.values_list('name', flat=True))
            if pkgs:
                return ', '.join(pkgs)
        except Exception:
            pass
        # Fallback to primary_package (legacy bookings)
        if booking.primary_package:
            return booking.primary_package.name
        return 'N/A'

    def get_package_category(booking):
        """Return comma-joined categories for this booking."""
        try:
            cats = list(booking.packages.values_list('category', flat=True))
            cats = [str(c).capitalize() for c in set(cats) if c]
            if cats:
                return ', '.join(cats)
        except Exception:
            pass
        if getattr(booking, 'primary_package', None) and getattr(booking.primary_package, 'category', None):
            return str(booking.primary_package.category).capitalize()
        return 'General'

    package_name = get_package_name(instance)
    package_category = get_package_category(instance)

    # Broadcast status via WebSocket
    booking_data = {
        'id': instance.id,
        'customer_name': instance.customer.user.name,
        'status': instance.status,
        'booking_datetime': instance.booking_datetime.isoformat(),
        'package_name': package_name,
        'package_category': package_category,
        'total_price': float(instance.total_price),
        'vehicle_info': f"{instance.vehicle.brand} {instance.vehicle.model}",
    }
    broadcast_booking_update(instance.id, instance.status, booking_data, user_id=instance.customer.user.id)
    
    if created:
        # 1. Customer Notification
        context = {
            'customer_name': instance.customer.user.name,
            'booking_id': instance.id,
            'booking_datetime': instance.booking_datetime.strftime('%Y-%m-%d %H:%M'),
            'package_name': package_name,
            'package_category': package_category,
            'total_price': float(instance.total_price) if instance.total_price else 0.0,
        }
        
        send_notification.delay(
            user_id=instance.customer.user.id,
            notification_type='booking_created',
            context_data=context
        )
        
        
        booking_time = instance.booking_datetime.strftime('%d %b %Y at %I:%M %p')
        create_in_app_notification(
            user_id=instance.customer.user.id,
            notification_type='booking_created',
            title='Booking Created Successfully',
            message=f'Your booking #{instance.id} for {package_name} has been created successfully. Scheduled for {booking_time}. Total amount: â‚¹{instance.total_price}.',
            related_booking_id=instance.id,
            extra_data=context
        )
        
        # Notify Branch Admin and Floor Managers about new booking
        staff_users = User.objects.filter(
            Q(role='super_admin') |
            (Q(role__in=['branch_admin', 'floor_manager']) & Q(branch=instance.branch))
        ).distinct()
        
        for staff in staff_users:
            create_in_app_notification(
                user_id=staff.id,
                notification_type='new_booking_alert',
                title='New Booking Received',
                message=f'New booking #{instance.id} from {instance.customer.user.name} for {package_name}. Scheduled: {booking_time}.',
                related_booking_id=instance.id,
                extra_data=context
            )
    
    elif instance.status == 'confirmed':
        # Booking confirmed notification
        context = {
            'customer_name': instance.customer.user.name,
            'booking_id': instance.id,
            'booking_datetime': instance.booking_datetime.strftime('%Y-%m-%d %H:%M'),
            'package_name': package_name,
            'package_category': package_category,
            'total_price': float(instance.total_price) if instance.total_price else 0.0,
        }
        
        send_notification.delay(
            user_id=instance.customer.user.id,
            notification_type='booking_confirmed',
            context_data=context
        )
        
        # Create in-app notification with detailed message
        booking_time = instance.booking_datetime.strftime('%d %b %Y at %I:%M %p')
        create_in_app_notification(
            user_id=instance.customer.user.id,
            notification_type='booking_confirmed',
            title='Booking Confirmed',
            message=f'Great news! Your booking #{instance.id} has been confirmed. Service scheduled for {booking_time}. We will notify you once our technician starts the work.',
            related_booking_id=instance.id,
            extra_data=context
        )
    
    elif instance.status == 'cancelled':
        # Booking cancelled notification
        context = {
            'customer_name': instance.customer.user.name,
            'booking_id': instance.id,
        }
        
        send_notification.delay(
            user_id=instance.customer.user.id,
            notification_type='booking_cancelled',
            context_data=context
        )
        
        # Create in-app notification
        create_in_app_notification(
            user_id=instance.customer.user.id,
            notification_type='booking_cancelled',
            title='Booking Cancelled',
            message=f'Your booking #{instance.id} has been cancelled.',
            related_booking_id=instance.id,
            extra_data=context
        )

        # Notify Staff about Cancellation
        staff_users = User.objects.filter(
            Q(role='super_admin') |
            (Q(role__in=['branch_admin', 'floor_manager']) & Q(branch=instance.branch))
        ).distinct()

        for staff in staff_users:
            create_in_app_notification(
                user_id=staff.id,
                notification_type='booking_cancelled_alert',
                title='Booking Cancelled',
                message=f'Booking #{instance.id} for {instance.customer.user.name} has been cancelled.',
                related_booking_id=instance.id,
                extra_data=context
            )


@receiver(post_save, sender=JobCard)
def jobcard_notification_handler(sender, instance, created, **kwargs):
    """
    Send notifications when job card status changes.
    Refactored to use NotificationService for cleaner, DRY code.
    """
    from .notification_service import NotificationService
    from django.utils import timezone
    
    # Handle photo transfer on creation
    if created:
        instance.transfer_initial_photos()
    
    if not instance.status or not instance.booking or not instance.booking.customer:
        return
    
    customer = instance.booking.customer
    vehicle_info = f"{instance.booking.vehicle.brand} {instance.booking.vehicle.model}"
    
    # Common context
    context = {
        'customer_name': customer.user.name,
        'job_id': instance.id,
        'booking_id': instance.booking.id,
        'vehicle': vehicle_info,
        'technician_name': instance.technician.name if instance.technician else 'N/A',
    }
    
    # Prepare jobcard data for WebSocket
    jobcard_data = {
        'id': instance.id,
        'status': instance.status,
        'booking_id': instance.booking.id,
        'vehicle_info': vehicle_info,
        'customer_name': customer.user.name,
    }
    
    # Get old status for comparison
    old_status = None
    if instance.pk:
        try:
            old_instance = JobCard.objects.get(pk=instance.pk)
            old_status = old_instance.status
        except JobCard.DoesNotExist:
            pass
    
    # Broadcast status change via WebSocket
    broadcast_status_change(
        jobcard_id=instance.id,
        old_status=old_status,
        new_status=instance.status,
        jobcard_data=jobcard_data,
        changed_by=instance.technician.name if instance.technician else None
    )
    
    # Also send a generic refresh signal so frontend always picks up changes
    broadcast_jobcard_updated(instance.id, reason=f'status_changed:{instance.status}')
    
    # Reset timer warning flags when status changes
    if old_status != instance.status:
        instance.warning_sent = False
        instance.warning_15min_sent = False
        instance.warning_10min_sent = False
        instance.warning_7min_sent = False
        instance.warning_5min_sent = False
        instance.warning_3min_sent = False
        instance.warning_2min_sent = False
        instance.warning_1min_sent = False
        instance.overdue_notification_sent = False
        instance.save(update_fields=[
            'warning_sent', 'warning_15min_sent', 'warning_10min_sent', 'warning_7min_sent',
            'warning_5min_sent', 'warning_3min_sent', 'warning_2min_sent', 'warning_1min_sent',
            'overdue_notification_sent'
        ])
    
    # Status-specific notifications using NotificationService
    
    if instance.status == 'started':
        start_time = timezone.now()
        start_time_str = start_time.strftime('%d %b %Y at %I:%M %p')
        technician_name = instance.technician.name if instance.technician else 'Assigned Technician'
        
        NotificationService.send(
            notification_type='job_started',
            recipients=[customer.user],
            title='Service Started',
            message=f'Service work on your {vehicle_info} (Booking #{instance.booking.id}) has started at {start_time_str}. Technician: {technician_name}.',
            channels=['in_app', 'email'],
            related_booking_id=instance.booking.id,
            related_jobcard_id=instance.id,
            context_data={
                **context,
                'start_time': start_time.isoformat(),
                'start_time_display': start_time_str
            }
        )
    
    elif instance.status == 'in_progress':
        technician_name = instance.technician.name if instance.technician else 'Technician'
        update_time = timezone.now().strftime('%I:%M %p')
        
        NotificationService.send(
            notification_type='job_in_progress',
            recipients=[customer.user],
            title='Work In Progress',
            message=f'Your vehicle {vehicle_info} is being serviced by {technician_name}. Last updated at {update_time}.',
            channels=['in_app', 'email'],
            related_booking_id=instance.booking.id,
            related_jobcard_id=instance.id,
            context_data={**context, 'update_time': update_time}
        )
    
    elif instance.status == 'work_completed':
        # Calculate and create reward/deduction records
        from jobcards.reward_service import RewardCalculationService
        
        if not instance.rewards.exists():
            try:
                rewards = RewardCalculationService.create_reward_records(instance)
                
                # Notify recipients about rewards/deductions
                for reward in rewards:
                    reward_type = 'reward' if reward.transaction_type == 'reward' else 'deduction'
                    
                    NotificationService.send(
                        notification_type=f'{reward_type}_earned',
                        recipients=[reward.recipient],
                        title=f'{reward_type.capitalize()} Earned' if reward_type == 'reward' else 'Deduction Applied',
                        message=f'You earned a {reward_type} of â‚¹{reward.amount} for job #{instance.id}. Status: Pending approval.',
                        channels=['in_app'],
                        related_jobcard_id=instance.id,
                        context_data={
                            'reward_id': reward.id,
                            'amount': str(reward.amount),
                            'transaction_type': reward.transaction_type,
                            'tier': reward.tier,
                            'time_difference_minutes': reward.time_difference_minutes
                        }
                    )
            except Exception as e:
                # Log but don't fail the job update
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error creating reward records for job #{instance.id}: {str(e)}")
        
        # Notify customer about work completion
        NotificationService.send(
            notification_type='job_work_completed',
            recipients=[customer.user],
            title='Work Completed',
            message=f'Work on your {vehicle_info} has been completed. Pending QC approval.',
            channels=['in_app', 'email'],
            related_booking_id=instance.booking.id,
            related_jobcard_id=instance.id,
            context_data=context
        )
    
    elif instance.status == 'completed':
        completion_time = timezone.now().strftime('%d %b %Y at %I:%M %p')
        technician_name = instance.technician.name if instance.technician else 'Technician'
        
        NotificationService.send(
            notification_type='job_completed',
            recipients=[customer.user],
            title='Job Completed',
            message=f'Your vehicle {vehicle_info} service has been completed at {completion_time} by {technician_name}. Ready for pickup!',
            channels=['in_app', 'email', 'sms'],
            related_booking_id=instance.booking.id,
            related_jobcard_id=instance.id,
            context_data={
                **context,
                'completion_time': completion_time
            }
        )
    
    elif instance.status == 'delivered':
        delivery_time = timezone.now().strftime('%d %b %Y at %I:%M %p')
        
        NotificationService.send(
            notification_type='job_delivered',
            recipients=[customer.user],
            title='Vehicle Delivered',
            message=f'Your {vehicle_info} has been delivered at {delivery_time}. Thank you for choosing our service!',
            channels=['in_app', 'email'],
            related_booking_id=instance.booking.id,
            related_jobcard_id=instance.id,
            context_data={
                **context,
                'delivery_time': delivery_time
            }
        )
        
        # Request feedback
        try:
            NotificationService.send(
                notification_type='feedback_request',
                recipients=[customer.user],
                title='Share Your Feedback',
                message=f'Hope you loved our service! Please share your experience for booking #{instance.booking.id}.',
                channels=['in_app'],
                related_booking_id=instance.booking.id,
                related_jobcard_id=instance.id,
                context_data=context
            )
        except Exception:
            pass  # Don't fail delivery if feedback request fails
    
    # Notify staff (technician, supervisor, floor manager) for relevant status changes
    staff_notification_statuses = [
        'assigned_to_applicator', 'work_in_progress', 'work_completed',
        'qc_pending', 'qc_completed', 'final_qc_pending', 'completed'
    ]
    
    if instance.status in staff_notification_statuses:
        staff_recipients = []
        
        if instance.technician:
            staff_recipients.append(instance.technician)
        if instance.supervisor:
            staff_recipients.append(instance.supervisor)
        if instance.floor_manager:
            staff_recipients.append(instance.floor_manager)
        
        if staff_recipients:
            NotificationService.send(
                notification_type='job_status_update',
                recipients=staff_recipients,
                title=f'Job #{instance.id} Status Updated',
                message=f'Job #{instance.id} ({vehicle_info}) status: {instance.get_status_display()}',
                channels=['in_app'],
                related_booking_id=instance.booking.id,
                related_jobcard_id=instance.id,
                context_data=context
            )

def payment_notification_handler(sender, instance, created, **kwargs):
    """Send notifications when payment status changes."""
    
    if not created and instance.payment_status:
        customer = instance.booking.customer
        
        context = {
            'customer_name': customer.user.name,
            'payment_id': instance.id,
            'booking_id': instance.booking.id,
            'amount': instance.amount,
            'payment_method': instance.get_payment_method_display(),
        }
        
        if instance.payment_status == 'completed':
            send_notification.delay(
                user_id=customer.user.id,
                notification_type='payment_success',
                context_data=context
            )
            
            # Create in-app notification
            create_in_app_notification(
                user_id=customer.user.id,
                notification_type='payment_success',
                title='Payment Successful',
                message=f'Payment of â‚¹{instance.amount} for booking #{instance.booking.id} has been processed successfully.',
                related_booking_id=instance.booking.id,
                extra_data=context
            )
        
        elif instance.payment_status == 'failed':
            send_notification.delay(
                user_id=customer.user.id,
                notification_type='payment_failed',
                context_data=context
            )
            
            # Create in-app notification
            create_in_app_notification(
                user_id=customer.user.id,
                notification_type='payment_failed',
                title='Payment Failed',
                message=f'Payment of â‚¹{instance.amount} for booking #{instance.booking.id} failed. Please try again.',
                related_booking_id=instance.booking.id,
                extra_data=context
            )


@receiver(post_save, sender=Invoice)
def invoice_notification_handler(sender, instance, created, **kwargs):
    """Send notification when invoice is created."""
    
    if created:
        context = {
            'customer_name': instance.customer.user.name,
            'invoice_number': instance.invoice_number,
            'total_amount': instance.total_amount,
            'due_date': instance.due_date.strftime('%Y-%m-%d') if instance.due_date else 'N/A',
        }
        
        send_notification.delay(
            user_id=instance.customer.user.id,
            notification_type='invoice_created',
            context_data=context
        )
        
        # Create in-app notification
        due_date_msg = f" Due date: {instance.due_date.strftime('%Y-%m-%d')}." if instance.due_date else ""
        amount_msg = f" for â‚¹{instance.total_amount}" if instance.total_amount > 0 else ""
        
        create_in_app_notification(
            user_id=instance.customer.user.id,
            notification_type='invoice_created',
            title='New Invoice Generated',
            message=f'Invoice #{instance.invoice_number}{amount_msg} has been generated.{due_date_msg}',
            related_invoice_id=instance.id,
            extra_data=context
        )


# ============================================================================
# REAL-TIME WEBSOCKET SIGNAL HANDLERS
# ============================================================================

from jobcards.models import JobCardNote, DynamicTask, JobCardActivity
from .websocket_utils import broadcast_note_added, broadcast_task_update, broadcast_to_jobcard


@receiver(post_save, sender=JobCardNote)
def note_realtime_handler(sender, instance, created, **kwargs):
    """Broadcast new notes via WebSocket for real-time collaboration."""
    if created:
        note_data = {
            'id': instance.id,
            'jobcard_id': instance.jobcard.id,
            'note_type': instance.note_type,
            'content': instance.content,
            'is_pinned': instance.is_pinned,
            'visible_to_customer': instance.visible_to_customer,
            'created_at': instance.created_at.isoformat(),
            'created_by_details': {
                'id': instance.created_by.id,
                'name': instance.created_by.name,
                'role': instance.created_by.role,
            } if instance.created_by else None,
        }
        broadcast_note_added(instance.jobcard.id, note_data)
        broadcast_jobcard_updated(instance.jobcard.id, reason='note_added')


@receiver(post_save, sender=DynamicTask)
def task_realtime_handler(sender, instance, created, **kwargs):
    """Broadcast dynamic task updates via WebSocket."""
    task_data = {
        'id': instance.id,
        'jobcard_id': instance.jobcard.id,
        'title': instance.title,
        'description': instance.description,
        'status': instance.status,
        'estimated_price': str(instance.estimated_price),
        'requires_approval': instance.requires_approval,
        'approved_by_customer': instance.approved_by_customer,
        'created_at': instance.created_at.isoformat(),
        'created_by_details': {
            'id': instance.created_by.id,
            'name': instance.created_by.name,
            'role': instance.created_by.role,
        } if instance.created_by else None,
        'assigned_to_details': {
            'id': instance.assigned_to.id,
            'name': instance.assigned_to.name,
        } if instance.assigned_to else None,
    }
    
    action = 'created' if created else 'updated'
    broadcast_task_update(instance.jobcard.id, task_data, action)
    broadcast_jobcard_updated(instance.jobcard.id, reason=f'task_{action}')
    
    # If task requires customer approval, also broadcast to customer
    if created and instance.requires_approval:
        customer = instance.jobcard.booking.customer
        create_in_app_notification(
            user_id=customer.user.id,
            notification_type='job_status_update',
            title='Additional Task Requires Approval',
            message=f'A new task "{instance.title}" (â‚¹{instance.estimated_price}) has been identified for your vehicle. Please approve to proceed.',
            related_jobcard_id=instance.jobcard.id,
            extra_data=task_data
        )


@receiver(post_save, sender=JobCardActivity)
def activity_realtime_handler(sender, instance, created, **kwargs):
    """Broadcast activity log updates via WebSocket."""
    if created:
        activity_data = {
            'id': instance.id,
            'jobcard_id': instance.jobcard.id,
            'activity_type': instance.activity_type,
            'description': instance.description,
            'metadata': instance.metadata,
            'created_at': instance.created_at.isoformat(),
            'performed_by_details': {
                'id': instance.performed_by.id,
                'name': instance.performed_by.name,
                'role': instance.performed_by.role,
            } if instance.performed_by else None,
        }
        broadcast_to_jobcard(instance.jobcard.id, 'activity_logged', activity_data)
        broadcast_jobcard_updated(instance.jobcard.id, reason='activity_logged')

