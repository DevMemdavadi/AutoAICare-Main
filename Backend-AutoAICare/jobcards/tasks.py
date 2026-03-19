"""
Background tasks for job card monitoring, notifications, and image processing.
"""
import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import JobCard
from notify.utils import create_in_app_notification

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def process_jobcard_photo(self, photo_id: int) -> dict:
    """
    Compress and resize a JobCardPhoto image in the background.

    Called immediately after `add_photo` saves a new photo so the upload
    API returns instantly and the heavy Pillow work happens in a worker.

    Strategy:
      - Max width/height: 1920 px  (keeps full-HD resolution)
      - Output format:    JPEG at quality=85
      - Orientation:     EXIF-aware (auto-rotates mobile photos)
      - Skips images that are already small enough (< 100 KB)

    Args:
        photo_id: PK of the JobCardPhoto to process.

    Returns:
        dict with original_size, new_size, and savings_percent.
    """
    from PIL import Image, ExifTags
    from io import BytesIO
    import os
    from django.core.files.base import ContentFile

    try:
        from .models import JobCardPhoto
        photo = JobCardPhoto.objects.select_related('jobcard').get(pk=photo_id)
    except JobCardPhoto.DoesNotExist:
        logger.warning(f"process_jobcard_photo: photo {photo_id} not found — skipping.")
        return {'skipped': True, 'reason': 'not_found'}

    if not photo.image or not photo.image.name:
        return {'skipped': True, 'reason': 'no_image_field'}

    try:
        photo.image.open('rb')
        original_bytes = photo.image.read()
        original_size = len(original_bytes)
        photo.image.close()
    except Exception as exc:
        logger.error(f"process_jobcard_photo: cannot read photo {photo_id}: {exc}")
        raise self.retry(exc=exc)

    # Skip tiny images that don't need processing (< 100 KB)
    if original_size < 100 * 1024:
        logger.info(f"process_jobcard_photo: photo {photo_id} already small ({original_size} bytes) — skipping.")
        return {'skipped': True, 'reason': 'already_small', 'original_size': original_size}

    try:
        img = Image.open(BytesIO(original_bytes))

        # --- Auto-rotate based on EXIF orientation (fixes upside-down mobile shots) ---
        try:
            exif = img._getexif()
            if exif:
                orientation_key = next(
                    (k for k, v in ExifTags.TAGS.items() if v == 'Orientation'), None
                )
                if orientation_key and orientation_key in exif:
                    orientation = exif[orientation_key]
                    rotations = {3: 180, 6: 270, 8: 90}
                    if orientation in rotations:
                        img = img.rotate(rotations[orientation], expand=True)
        except Exception:
            pass  # EXIF read failure is non-fatal

        # --- Resize: cap at 1920px on the longest side ---
        MAX_DIMENSION = 1920
        if img.width > MAX_DIMENSION or img.height > MAX_DIMENSION:
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

        # --- Convert to RGB (PNG/RGBA -> JPEG) ---
        if img.mode in ('RGBA', 'P', 'LA'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # --- Save as JPEG at quality=85 ---
        output = BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        compressed_bytes = output.getvalue()
        new_size = len(compressed_bytes)

        # Only replace if we actually saved space (>5% smaller)
        if new_size >= original_size * 0.95:
            logger.info(
                f"process_jobcard_photo: photo {photo_id} — compression didn't help "
                f"({original_size} → {new_size} bytes), keeping original."
            )
            return {'skipped': True, 'reason': 'no_benefit', 'original_size': original_size, 'new_size': new_size}

        # Build new filename with .jpg extension
        base_name = os.path.splitext(os.path.basename(photo.image.name))[0]
        new_filename = f"{base_name}.jpg"

        # Save the compressed image back to the model field
        photo.image.save(new_filename, ContentFile(compressed_bytes), save=True)

        savings_pct = round((1 - new_size / original_size) * 100, 1)
        logger.info(
            f"✅ process_jobcard_photo: photo {photo_id} compressed "
            f"{original_size} → {new_size} bytes ({savings_pct}% saved)."
        )
        return {
            'photo_id': photo_id,
            'original_size': original_size,
            'new_size': new_size,
            'savings_percent': savings_pct,
        }

    except Exception as exc:
        logger.error(f"process_jobcard_photo: processing failed for photo {photo_id}: {exc}")
        raise self.retry(exc=exc)




@shared_task
def check_job_timers():
    """
    Check all active jobs for time warnings and overdue status.
    Sends notifications to technicians and admins.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Get all jobs that are actively being worked on
    active_jobs = JobCard.objects.filter(
        status__in=[    
            'assigned_to_applicator',  # Work assigned to team
            'work_in_progress',         # Work actively happening
        ],
        job_started_at__isnull=False  # Must have a start time
    )
    
    logger.info(f"⏰ Timer check running - Found {active_jobs.count()} active jobs")
    
    for job in active_jobs:
        remaining = job.get_remaining_minutes()
        
        if remaining is None:
            continue
        
        logger.info(f"Job #{job.id}: {remaining} minutes remaining, status: {job.status}")
        
        # Check if job is overdue first (negative remaining time)
        if remaining < 0:
            logger.warning(f"Job #{job.id} is OVERDUE by {abs(remaining)} minutes")
            # Send overdue notification
            send_job_overdue_notification(job, abs(remaining))
        
        # Multi-stage warnings - check from most urgent to least urgent
        elif remaining <= 1 and not job.warning_1min_sent:
            logger.warning(f"🚨 Job #{job.id}: 1 MINUTE WARNING")
            send_timer_warning(job, 1, 'critical')
            job.warning_1min_sent = True
            job.save(update_fields=['warning_1min_sent'])
        elif remaining <= 3 and not job.warning_3min_sent:
            logger.warning(f"🚨 Job #{job.id}: 3 MINUTE WARNING")
            send_timer_warning(job, 3, 'critical')
            job.warning_3min_sent = True
            job.save(update_fields=['warning_3min_sent'])
        elif remaining <= 5 and not job.warning_5min_sent:
            logger.warning(f"⚠️ Job #{job.id}: 5 MINUTE WARNING")
            send_timer_warning(job, 5, 'high')
            job.warning_5min_sent = True
            job.save(update_fields=['warning_5min_sent'])
        elif remaining <= 7 and not job.warning_7min_sent:
            logger.warning(f"⚠️ Job #{job.id}: 7 MINUTE WARNING")
            send_timer_warning(job, 7, 'high')
            job.warning_7min_sent = True
            job.save(update_fields=['warning_7min_sent'])
        elif remaining <= 10 and not job.warning_10min_sent:
            logger.info(f"⏰ Job #{job.id}: 10 MINUTE WARNING")
            send_timer_warning(job, 10, 'medium')
            job.warning_10min_sent = True
            job.save(update_fields=['warning_10min_sent'])
        elif remaining <= 15 and not job.warning_15min_sent:
            logger.info(f"⏰ Job #{job.id}: 15 MINUTE WARNING")
            send_timer_warning(job, 15, 'low')
            job.warning_15min_sent = True
            job.save(update_fields=['warning_15min_sent'])



def send_timer_warning(jobcard, remaining_minutes, urgency_level):
    """
    Send timer warning notification with escalating urgency.
    
    Args:
        jobcard: JobCard instance
        remaining_minutes: Minutes remaining (1, 3, 5, 7, 10, 15)
        urgency_level: 'low', 'medium', 'high', 'critical'
    """
    import logging
    logger = logging.getLogger(__name__)
    
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    logger.info(f"📢 Sending {remaining_minutes}min timer warning for Job #{jobcard.id} (urgency: {urgency_level})")
    
    vehicle_info = f"{jobcard.booking.vehicle.brand} {jobcard.booking.vehicle.model}" if jobcard.booking.vehicle else "vehicle"
    
    # Determine notification type based on urgency
    if urgency_level in ['high', 'critical']:
        notif_type = 'job_warning'  # Uses alertBurst or errorTone sound
        emoji = '🚨' if urgency_level == 'critical' else '⚠️'
    else:
        notif_type = 'job_status_update'  # Uses softDing or doubleBeep sound
        emoji = '⏰'
    
    # Build recipient list based on remaining time
    recipients = []
    
    # Always notify supervisor and floor manager
    if jobcard.supervisor:
        recipients.append(jobcard.supervisor.id)
    if jobcard.floor_manager:
        recipients.append(jobcard.floor_manager.id)
    
    # Add applicator team for 10min and below
    if remaining_minutes <= 10:
        for applicator in jobcard.applicator_team.all():
            recipients.append(applicator.id)
    
    # Add admin for critical warnings (5min and below)
    if remaining_minutes <= 5 and jobcard.branch:
        admins = User.objects.filter(
            role__in=['branch_admin', 'company_admin', 'super_admin'],
            branch=jobcard.branch
        )
        for admin in admins:
            recipients.append(admin.id)
    
    # Send notifications
    logger.info(f"Found {len(recipients)} recipients for {remaining_minutes}min warning")
    
    for user_id in recipients:
        context = {
            'job_id': jobcard.id,
            'booking_id': jobcard.booking.id,
            'vehicle': vehicle_info,
            'remaining_minutes': remaining_minutes,
            'allowed_duration': jobcard.get_allowed_duration_minutes(),
            'urgency_level': urgency_level,
        }
        
        create_in_app_notification(
            user_id=user_id,
            notification_type=notif_type,
            title=f'{emoji} {remaining_minutes} Minute{"s" if remaining_minutes != 1 else ""} Remaining',
            message=f'Job #{jobcard.id} ({vehicle_info}) - Only {remaining_minutes} minute{"s" if remaining_minutes != 1 else ""} left! Please wrap up.',
            related_booking_id=jobcard.booking.id,
            related_jobcard_id=jobcard.id,
            extra_data=context
        )
        logger.info(f"✅ Sent {remaining_minutes}min warning to user {user_id}")



def send_job_warning_notification(jobcard, remaining_minutes):
    """
    Send warning notification when job has 10 minutes or less remaining.
    Notifies technician, supervisor, floor manager, and branch admins.
    Only sends once unless job status changes.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Only send if not already sent
    if jobcard.warning_sent:
        return
    
    vehicle_info = f"{jobcard.booking.vehicle.brand} {jobcard.booking.vehicle.model}" if jobcard.booking.vehicle else "vehicle"
    
    # Notify technician
    if jobcard.technician:
        context = {
            'job_id': jobcard.id,
            'booking_id': jobcard.booking.id,
            'vehicle': vehicle_info,
            'remaining_minutes': remaining_minutes,
            'allowed_duration': jobcard.get_allowed_duration_minutes(),
            'technician_name': jobcard.technician.name,
        }
        
        create_in_app_notification(
            user_id=jobcard.technician.id,
            notification_type='job_warning',
            title='⏰ Time Warning',
            message=f'Job #{jobcard.id} (Booking #{jobcard.booking.id}) - {remaining_minutes} minute{"s" if remaining_minutes != 1 else ""} remaining! Please wrap up soon.',
            related_booking_id=jobcard.booking.id,
            related_jobcard_id=jobcard.id,
            extra_data=context
        )
    
    # Notify supervisor
    if jobcard.supervisor:
        context = {
            'job_id': jobcard.id,
            'booking_id': jobcard.booking.id,
            'vehicle': vehicle_info,
            'remaining_minutes': remaining_minutes,
            'allowed_duration': jobcard.get_allowed_duration_minutes(),
        }
        
        create_in_app_notification(
            user_id=jobcard.supervisor.id,
            notification_type='job_warning',
            title='⏰ Time Warning',
            message=f'Job #{jobcard.id} (Booking #{jobcard.booking.id}) - {remaining_minutes} minute{"s" if remaining_minutes != 1 else ""} remaining!',
            related_booking_id=jobcard.booking.id,
            related_jobcard_id=jobcard.id,
            extra_data=context
        )
    
    # Notify floor manager
    if jobcard.floor_manager:
        context = {
            'job_id': jobcard.id,
            'booking_id': jobcard.booking.id,
            'vehicle': vehicle_info,
            'remaining_minutes': remaining_minutes,
            'allowed_duration': jobcard.get_allowed_duration_minutes(),
        }
        
        create_in_app_notification(
            user_id=jobcard.floor_manager.id,
            notification_type='job_warning',
            title='⏰ Time Warning',
            message=f'Job #{jobcard.id} (Booking #{jobcard.booking.id}) - {remaining_minutes} minute{"s" if remaining_minutes != 1 else ""} remaining!',
            related_booking_id=jobcard.booking.id,
            related_jobcard_id=jobcard.id,
            extra_data=context
        )
    
    # Notify branch admins
    if jobcard.branch:
        admins = User.objects.filter(
            role__in=['branch_admin', 'company_admin', 'super_admin'],
            branch=jobcard.branch
        )
        
        for admin in admins:
            context = {
                'job_id': jobcard.id,
                'booking_id': jobcard.booking.id,
                'vehicle': vehicle_info,
                'technician_name': jobcard.technician.name if jobcard.technician else 'N/A',
                'remaining_minutes': remaining_minutes,
                'allowed_duration': jobcard.get_allowed_duration_minutes(),
            }
            
            create_in_app_notification(
                user_id=admin.id,
                notification_type='job_warning',
                title='⏰ Job Time Warning',
                message=f'Job #{jobcard.id} (Booking #{jobcard.booking.id}) - {remaining_minutes} minute{"s" if remaining_minutes != 1 else ""} remaining for technician {jobcard.technician.name if jobcard.technician else "N/A"}.',
                related_booking_id=jobcard.booking.id,
                related_jobcard_id=jobcard.id,
                extra_data=context
            )
    
    # Mark warning as sent
    jobcard.warning_sent = True
    jobcard.save(update_fields=['warning_sent'])


def send_job_overdue_notification(jobcard, overdue_minutes):
    """
    Send overdue notification when job has exceeded allowed duration.
    Notifies both technician and branch admins.
    Only sends once unless job status changes.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Only send if not already sent (we'll send it once, then continue checking)
    if jobcard.overdue_notification_sent:
        logger.info(f"Job #{jobcard.id}: Overdue notification already sent, skipping")
        return
    
    logger.warning(f"📢 Sending overdue notifications for Job #{jobcard.id}")
    
    vehicle_info = f"{jobcard.booking.vehicle.brand} {jobcard.booking.vehicle.model}" if jobcard.booking.vehicle else "vehicle"
    
    # Notify technician
    if jobcard.technician:
        context = {
            'job_id': jobcard.id,
            'booking_id': jobcard.booking.id,
            'vehicle': vehicle_info,
            'overdue_minutes': overdue_minutes,
            'allowed_duration': jobcard.get_allowed_duration_minutes(),
            'technician_name': jobcard.technician.name,
        }
        
        create_in_app_notification(
            user_id=jobcard.technician.id,
            notification_type='job_overdue',
            title='⚠️ Job Overdue',
            message=f'Job #{jobcard.id} (Booking #{jobcard.booking.id}) is {overdue_minutes} minute{"s" if overdue_minutes != 1 else ""} overdue. Please complete or update status.',
            related_booking_id=jobcard.booking.id,
            related_jobcard_id=jobcard.id,
            extra_data=context
        )
    
    # Notify Applicator Team
    for applicator in jobcard.applicator_team.all():
        context = {
            'job_id': jobcard.id,
            'booking_id': jobcard.booking.id,
            'vehicle': vehicle_info,
            'overdue_minutes': overdue_minutes,
            'allowed_duration': jobcard.get_allowed_duration_minutes(),
        }
        
        create_in_app_notification(
            user_id=applicator.id,
            notification_type='job_overdue',
            title='⚠️ Job Overdue',
            message=f'Job #{jobcard.id} ({vehicle_info}) is {overdue_minutes} minute{"s" if overdue_minutes != 1 else ""} overdue!',
            related_booking_id=jobcard.booking.id,
            related_jobcard_id=jobcard.id,
            extra_data=context
        )
    
    # Notify branch admins
    if jobcard.branch:
        admins = User.objects.filter(
            role__in=['branch_admin', 'company_admin', 'super_admin'],
            branch=jobcard.branch
        )
        
        for admin in admins:
            context = {
                'job_id': jobcard.id,
                'booking_id': jobcard.booking.id,
                'vehicle': vehicle_info,
                'technician_name': jobcard.technician.name if jobcard.technician else 'N/A',
                'overdue_minutes': overdue_minutes,
                'allowed_duration': jobcard.get_allowed_duration_minutes(),
            }
            
            create_in_app_notification(
                user_id=admin.id,
                notification_type='job_overdue',
                title='⚠️ Job Overdue Alert',
                message=f'Job #{jobcard.id} (Booking #{jobcard.booking.id}) is {overdue_minutes} minute{"s" if overdue_minutes != 1 else ""} overdue. Technician: {jobcard.technician.name if jobcard.technician else "N/A"}.',
                related_booking_id=jobcard.booking.id,
                related_jobcard_id=jobcard.id,
                extra_data=context
            )
    
    # Mark overdue notification as sent
    jobcard.overdue_notification_sent = True
    jobcard.save(update_fields=['overdue_notification_sent'])


@shared_task
def check_buffer_exhaustion():
    """
    Periodic task to check all active jobs for buffer exhaustion.
    Sends alerts when buffer is running low.
    Runs every 5 minutes.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    from .buffer_monitoring import BufferMonitoringService
    
    # Get all active jobs with timers
    active_jobs = JobCard.objects.filter(
        status__in=['assigned_to_applicator', 'work_in_progress'],
        job_started_at__isnull=False,
        is_timer_paused=False  # Only check running timers
    )
    
    logger.info(f"🔍 Buffer exhaustion check running - Found {active_jobs.count()} active jobs")
    
    alerts_sent = 0
    for job in active_jobs:
        try:
            result = BufferMonitoringService.check_buffer_exhaustion(job)
            if result:
                alerts_sent += 1
                logger.info(f"Buffer alert sent for Job #{job.id}: {result['alert_level']}")
        except Exception as e:
            logger.error(f"Error checking buffer for Job #{job.id}: {str(e)}")
    
    logger.info(f"✅ Buffer exhaustion check complete - {alerts_sent} alerts sent")
    return {'checked': active_jobs.count(), 'alerts_sent': alerts_sent}


@shared_task
def detect_pause_abuse_patterns():
    """
    Periodic task to detect pause abuse patterns.
    Runs every hour.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    from .buffer_monitoring import BufferMonitoringService
    
    # Get jobs that have been paused in the last 24 hours
    recent_paused_jobs = JobCard.objects.filter(
        status__in=['assigned_to_applicator', 'work_in_progress', 'work_completed'],
        total_pause_duration_seconds__gt=0,
        job_started_at__gte=timezone.now() - timedelta(hours=24)
    )
    
    logger.info(f"🔍 Pause abuse detection running - Checking {recent_paused_jobs.count()} jobs")
    
    abuse_detected = 0
    for job in recent_paused_jobs:
        try:
            result = BufferMonitoringService.detect_pause_abuse(job)
            if result:
                abuse_detected += 1
                logger.warning(f"Pause abuse detected for Job #{job.id}")
        except Exception as e:
            logger.error(f"Error detecting abuse for Job #{job.id}: {str(e)}")
    
    logger.info(f"✅ Pause abuse detection complete - {abuse_detected} cases detected")
    return {'checked': recent_paused_jobs.count(), 'abuse_detected': abuse_detected}


@shared_task
def generate_buffer_analytics_report(branch_id=None, days=7):
    """
    Generate buffer usage analytics report.
    Can be triggered manually or scheduled weekly.
    
    Args:
        branch_id: Optional branch ID to filter by
        days: Number of days to analyze (default: 7)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    from .buffer_monitoring import BufferMonitoringService
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    logger.info(f"📊 Generating buffer analytics report (branch: {branch_id}, days: {days})")
    
    try:
        analytics = BufferMonitoringService.get_buffer_analytics(
            branch_id=branch_id,
            days=days
        )
        
        # Send report to admins
        if branch_id:
            admins = User.objects.filter(
                role__in=['branch_admin', 'company_admin', 'super_admin'],
                branch_id=branch_id
            )
        else:
            admins = User.objects.filter(role='super_admin')
        
        # Format report message
        message = f"""
Buffer Usage Analytics Report ({days} days)

📊 Summary:
• Total Jobs: {analytics['total_jobs']}
• Jobs with Pauses: {analytics['jobs_with_pauses']} ({analytics['pause_usage_percentage']}%)
• Avg Pause Duration: {analytics['avg_pause_duration_minutes']} min
• Buffer Exhausted: {analytics['jobs_buffer_exhausted']} ({analytics['buffer_exhaustion_rate']}%)

💡 Recommendations:
""" + "\n".join(analytics['recommendations'])
        
        from notify.notification_service import NotificationService
        
        NotificationService.send(
            notification_type='buffer_analytics_report',
            recipients=list(admins),
            title=f"📊 Buffer Analytics Report ({days} days)",
            message=message,
            context_data=analytics,
            channels=['in_app', 'email']
        )
        
        logger.info("✅ Buffer analytics report generated and sent")
        return analytics
        
    except Exception as e:
        logger.error(f"Error generating buffer analytics: {str(e)}")
        return {'error': str(e)}


