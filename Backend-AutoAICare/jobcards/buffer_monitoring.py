"""
Buffer Time Monitoring Service

Monitors buffer usage, detects abuse, and sends alerts for:
- Buffer exhaustion warnings
- Pause abuse detection
- Extension request notifications
- Buffer usage analytics
"""

from typing import Dict, List, Optional, Any
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
import logging

from jobcards.models import JobCard, JobCardActivity
from notify.notification_service import NotificationService

logger = logging.getLogger(__name__)
User = get_user_model()


class BufferMonitoringService:
    """
    Service for monitoring buffer time usage and detecting anomalies.
    """
    
    # Thresholds for alerts
    BUFFER_WARNING_THRESHOLD = 0.3  # Warn when 70% buffer used
    BUFFER_CRITICAL_THRESHOLD = 0.1  # Critical when 90% buffer used
    MAX_PAUSE_CYCLES_PER_JOB = 10  # Max reasonable pause/resume cycles
    MAX_PAUSE_DURATION_MINUTES = 30  # Max total pause time per job
    
    @classmethod
    def check_buffer_exhaustion(cls, jobcard: JobCard) -> Optional[Dict[str, Any]]:
        """
        Check if buffer is running low and send alerts.
        
        Returns:
            Dict with alert details if alert was sent, None otherwise
        """
        if not jobcard.job_started_at or jobcard.is_timer_paused:
            return None
        
        remaining_buffer = jobcard.get_remaining_buffer()
        total_buffer = jobcard.buffer_minutes_allocated or 0
        
        if total_buffer <= 0:
            return None
        
        buffer_percentage_remaining = remaining_buffer / total_buffer
        
        # Critical alert (90% buffer used)
        if buffer_percentage_remaining <= cls.BUFFER_CRITICAL_THRESHOLD:
            return cls._send_buffer_alert(
                jobcard=jobcard,
                alert_level='critical',
                remaining_buffer=remaining_buffer,
                total_buffer=total_buffer
            )
        
        # Warning alert (70% buffer used)
        elif buffer_percentage_remaining <= cls.BUFFER_WARNING_THRESHOLD:
            return cls._send_buffer_alert(
                jobcard=jobcard,
                alert_level='warning',
                remaining_buffer=remaining_buffer,
                total_buffer=total_buffer
            )
        
        return None
    
    @classmethod
    def _send_buffer_alert(
        cls,
        jobcard: JobCard,
        alert_level: str,
        remaining_buffer: int,
        total_buffer: int
    ) -> Dict[str, Any]:
        """
        Send buffer exhaustion alert to relevant users.
        """
        # Get recipients
        recipients = NotificationService.get_recipients_for_job(
            job=jobcard,
            include_customer=False,
            include_supervisor=True,
            include_floor_manager=True,
            include_applicators=True,
            include_admins=True
        )
        
        # Prepare message
        if alert_level == 'critical':
            title = f"🚨 Buffer Almost Exhausted - Job #{jobcard.id}"
            message = (
                f"CRITICAL: Only {remaining_buffer} of {total_buffer} minutes buffer remaining! "
                f"Consider requesting a buffer extension or completing the job soon."
            )
            notification_type = 'buffer_critical'
        else:
            title = f"⚠️ Buffer Running Low - Job #{jobcard.id}"
            message = (
                f"WARNING: {remaining_buffer} of {total_buffer} minutes buffer remaining. "
                f"Monitor progress closely."
            )
            notification_type = 'buffer_warning'
        
        # Send notification
        result = NotificationService.send(
            notification_type=notification_type,
            recipients=recipients,
            title=title,
            message=message,
            context_data={
                'jobcard_id': jobcard.id,
                'remaining_buffer': remaining_buffer,
                'total_buffer': total_buffer,
                'buffer_percentage_used': round((1 - remaining_buffer / total_buffer) * 100, 1)
            },
            channels=['in_app', 'websocket'],
            broadcast_groups=[f'jobcard_{jobcard.id}'],
            related_jobcard_id=jobcard.id
        )
        
        logger.info(f"Buffer {alert_level} alert sent for JobCard #{jobcard.id}")
        
        return {
            'alert_level': alert_level,
            'jobcard_id': jobcard.id,
            'remaining_buffer': remaining_buffer,
            'notification_result': result
        }
    
    @classmethod
    def detect_pause_abuse(cls, jobcard: JobCard) -> Optional[Dict[str, Any]]:
        """
        Detect potential pause abuse patterns.
        
        Checks for:
        - Too many pause/resume cycles
        - Excessive total pause duration
        - Suspicious pause patterns
        
        Returns:
            Dict with abuse details if detected, None otherwise
        """
        # Count pause/resume cycles
        pause_activities = JobCardActivity.objects.filter(
            jobcard=jobcard,
            description__icontains='Timer paused'
        ).count()
        
        resume_activities = JobCardActivity.objects.filter(
            jobcard=jobcard,
            description__icontains='Timer resumed'
        ).count()
        
        pause_cycles = min(pause_activities, resume_activities)
        
        # Check total pause duration
        total_pause_minutes = jobcard.total_pause_duration_seconds / 60
        
        abuse_detected = False
        abuse_reasons = []
        
        # Too many pause cycles
        if pause_cycles > cls.MAX_PAUSE_CYCLES_PER_JOB:
            abuse_detected = True
            abuse_reasons.append(
                f"Excessive pause cycles: {pause_cycles} (max: {cls.MAX_PAUSE_CYCLES_PER_JOB})"
            )
        
        # Excessive pause duration
        if total_pause_minutes > cls.MAX_PAUSE_DURATION_MINUTES:
            abuse_detected = True
            abuse_reasons.append(
                f"Excessive pause duration: {int(total_pause_minutes)} min (max: {cls.MAX_PAUSE_DURATION_MINUTES})"
            )
        
        if abuse_detected:
            return cls._send_abuse_alert(
                jobcard=jobcard,
                pause_cycles=pause_cycles,
                total_pause_minutes=int(total_pause_minutes),
                abuse_reasons=abuse_reasons
            )
        
        return None
    
    @classmethod
    def _send_abuse_alert(
        cls,
        jobcard: JobCard,
        pause_cycles: int,
        total_pause_minutes: int,
        abuse_reasons: List[str]
    ) -> Dict[str, Any]:
        """
        Send pause abuse alert to admins.
        """
        # Get admin recipients only
        recipients = NotificationService.get_recipients_for_job(
            job=jobcard,
            include_customer=False,
            include_supervisor=False,
            include_floor_manager=False,
            include_applicators=False,
            include_admins=True
        )
        
        title = f"⚠️ Potential Pause Abuse Detected - Job #{jobcard.id}"
        message = (
            f"Unusual pause patterns detected:\n" +
            "\n".join(f"• {reason}" for reason in abuse_reasons)
        )
        
        result = NotificationService.send(
            notification_type='pause_abuse_detected',
            recipients=recipients,
            title=title,
            message=message,
            context_data={
                'jobcard_id': jobcard.id,
                'pause_cycles': pause_cycles,
                'total_pause_minutes': total_pause_minutes,
                'abuse_reasons': abuse_reasons
            },
            channels=['in_app', 'email'],
            related_jobcard_id=jobcard.id
        )
        
        logger.warning(f"Pause abuse detected for JobCard #{jobcard.id}: {abuse_reasons}")
        
        return {
            'jobcard_id': jobcard.id,
            'pause_cycles': pause_cycles,
            'total_pause_minutes': total_pause_minutes,
            'abuse_reasons': abuse_reasons,
            'notification_result': result
        }
    
    @classmethod
    def notify_buffer_extension_request(
        cls,
        jobcard: JobCard,
        requested_by: User,
        additional_minutes: int,
        reason: str,
        note_id: int
    ) -> Dict[str, Any]:
        """
        Notify admins about buffer extension request.
        """
        # Get admin recipients
        recipients = NotificationService.get_recipients_for_job(
            job=jobcard,
            include_customer=False,
            include_supervisor=False,
            include_floor_manager=False,
            include_applicators=False,
            include_admins=True
        )
        
        title = f"📋 Buffer Extension Request - Job #{jobcard.id}"
        message = (
            f"{requested_by.name} ({requested_by.role}) requests {additional_minutes} minutes "
            f"additional buffer.\n\nReason: {reason}"
        )
        
        result = NotificationService.send(
            notification_type='buffer_extension_requested',
            recipients=recipients,
            title=title,
            message=message,
            context_data={
                'jobcard_id': jobcard.id,
                'requested_by_id': requested_by.id,
                'requested_by_name': requested_by.name,
                'additional_minutes': additional_minutes,
                'reason': reason,
                'note_id': note_id,
                'current_buffer': jobcard.buffer_minutes_allocated,
                'remaining_buffer': jobcard.get_remaining_buffer()
            },
            channels=['in_app', 'email'],
            related_jobcard_id=jobcard.id
        )
        
        logger.info(
            f"Buffer extension request notification sent for JobCard #{jobcard.id} "
            f"(requested by {requested_by.name})"
        )
        
        return {
            'jobcard_id': jobcard.id,
            'notification_result': result
        }
    
    @classmethod
    def get_buffer_analytics(
        cls,
        branch_id: Optional[int] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get buffer usage analytics for the specified period.
        
        Args:
            branch_id: Optional branch ID to filter by
            days: Number of days to analyze (default: 30)
        
        Returns:
            Dict with analytics data
        """
        from django.db import models as django_models
        
        since_date = timezone.now() - timedelta(days=days)
        
        # Base queryset
        queryset = JobCard.objects.filter(
            job_started_at__gte=since_date,
            job_started_at__isnull=False
        )
        
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Calculate statistics
        total_jobs = queryset.count()
        
        if total_jobs == 0:
            return {
                'period_days': days,
                'total_jobs': 0,
                'message': 'No jobs found in the specified period'
            }
        
        # Buffer usage statistics
        jobs_with_pauses = queryset.filter(total_pause_duration_seconds__gt=0).count()
        avg_pause_duration = queryset.aggregate(
            avg=Avg('total_pause_duration_seconds')
        )['avg'] or 0
        
        # Buffer exhaustion
        jobs_buffer_exhausted = queryset.filter(
            total_pause_duration_seconds__gte=django_models.F('buffer_minutes_allocated') * 60
        ).count()
        
        # Pause patterns
        avg_buffer_percentage = queryset.aggregate(
            avg=Avg('buffer_percentage')
        )['avg'] or 20
        
        # Top pause reasons
        pause_reasons = JobCardActivity.objects.filter(
            jobcard__in=queryset,
            description__icontains='Timer paused'
        ).values('metadata__reason').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        return {
            'period_days': days,
            'total_jobs': total_jobs,
            'jobs_with_pauses': jobs_with_pauses,
            'pause_usage_percentage': round((jobs_with_pauses / total_jobs) * 100, 1),
            'avg_pause_duration_minutes': round(avg_pause_duration / 60, 1),
            'jobs_buffer_exhausted': jobs_buffer_exhausted,
            'buffer_exhaustion_rate': round((jobs_buffer_exhausted / total_jobs) * 100, 1),
            'avg_buffer_percentage': round(avg_buffer_percentage, 1),
            'top_pause_reasons': list(pause_reasons),
            'recommendations': cls._generate_recommendations(
                total_jobs=total_jobs,
                jobs_with_pauses=jobs_with_pauses,
                jobs_buffer_exhausted=jobs_buffer_exhausted,
                avg_pause_duration=avg_pause_duration
            )
        }
    
    @classmethod
    def _generate_recommendations(
        cls,
        total_jobs: int,
        jobs_with_pauses: int,
        jobs_buffer_exhausted: int,
        avg_pause_duration: float
    ) -> List[str]:
        """
        Generate recommendations based on analytics.
        """
        recommendations = []
        
        pause_rate = (jobs_with_pauses / total_jobs) * 100 if total_jobs > 0 else 0
        exhaustion_rate = (jobs_buffer_exhausted / total_jobs) * 100 if total_jobs > 0 else 0
        avg_pause_minutes = avg_pause_duration / 60
        
        if exhaustion_rate > 20:
            recommendations.append(
                f"⚠️ High buffer exhaustion rate ({exhaustion_rate:.1f}%). "
                "Consider increasing default buffer percentage."
            )
        
        if pause_rate > 80:
            recommendations.append(
                f"📊 Very high pause usage ({pause_rate:.1f}%). "
                "This is normal if auto-pause is working correctly."
            )
        
        if avg_pause_minutes > 15:
            recommendations.append(
                f"⏱️ Average pause duration is {avg_pause_minutes:.1f} minutes. "
                "Monitor for potential abuse or process inefficiencies."
            )
        
        if exhaustion_rate < 5 and pause_rate < 30:
            recommendations.append(
                "✅ Buffer usage is healthy. Current settings appear optimal."
            )
        
        return recommendations


# Add new notification types to NotificationService
def register_buffer_notification_types():
    """
    Register buffer-related notification types with default channels.
    """
    from notify.notification_service import NotificationService
    
    NotificationService.DEFAULT_CHANNELS.update({
        'buffer_warning': ['in_app', 'websocket'],
        'buffer_critical': ['in_app', 'websocket', 'email'],
        'buffer_extension_requested': ['in_app', 'email'],
        'buffer_extension_approved': ['in_app'],
        'buffer_extension_rejected': ['in_app'],
        'pause_abuse_detected': ['in_app', 'email'],
    })


# Auto-register on module import
register_buffer_notification_types()
