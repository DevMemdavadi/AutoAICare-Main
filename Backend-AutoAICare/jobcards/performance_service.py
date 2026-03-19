from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Avg, Count, Q, Case, When, Value, DecimalField
import logging
from datetime import datetime, timedelta, date
from .performance_models import PerformanceMetrics, TeamPerformance, FloorManagerPerformance
from .models import JobCard


class PerformanceTrackingService:
    """Service for tracking and calculating performance metrics"""
    
    @staticmethod
    @transaction.atomic
    def record_job_completion(jobcard):
        """
        Record performance metrics when a job is completed
        
        Args:
            jobcard: JobCard instance that has been completed
        
        Returns:
            PerformanceMetrics instance or None
        """
        completion_statuses = [
            'work_completed', 'final_qc_passed', 'ready_for_billing', 
            'billed', 'ready_for_delivery', 'delivered', 'closed'
        ]
        if not jobcard.job_started_at or jobcard.status not in completion_statuses:
            return None
        
        # Check if performance metrics already exist
        if hasattr(jobcard, 'performance') and jobcard.performance:
            return jobcard.performance
        
        # Calculate time metrics
        scheduled_duration = jobcard.get_allowed_duration_minutes()
        actual_duration = jobcard.get_elapsed_minutes()
        time_difference = scheduled_duration - actual_duration  # Positive = saved, Negative = delayed
        
        # Calculate job value
        package_value = Decimal('0')
        addons_value = Decimal('0')
        parts_value = Decimal('0')
        
        if jobcard.booking:
            if jobcard.booking.package:
                # Get vehicle-specific price instead of generic price
                vehicle_type = jobcard.booking.vehicle_type or 'sedan'
                package_value = jobcard.booking.package.get_price_for_vehicle_type(vehicle_type)
            
            # Calculate add-ons value
            for addon in jobcard.booking.addons.all():
                addons_value += addon.price
        
        # Calculate parts value
        for part_used in jobcard.parts_used.all():
            parts_value += part_used.total_price
        
        job_value = package_value + addons_value + parts_value
        
        # Calculate GST (what customer actually paid)
        # Priority: invoice.total_amount > booking.total_price > calculated job_value
        gst_amount = Decimal('0')
        total_with_gst = job_value
        
        # Try to get the authoritative billed amount from the linked invoice
        invoice = getattr(jobcard, 'invoices', None)
        if invoice is not None:
            invoice = invoice.filter(status__in=['paid', 'pending', 'overdue']).first()
        
        if invoice and invoice.total_amount:
            total_with_gst = invoice.total_amount
            gst_amount = invoice.tax_amount or Decimal('0')
        elif jobcard.booking:
            gst_amount = jobcard.booking.gst_amount or Decimal('0')
            total_with_gst = jobcard.booking.total_price or job_value
        
        # Get team members
        floor_manager = jobcard.floor_manager
        supervisor = jobcard.supervisor
        applicators = list(jobcard.applicator_team.all())
        
        # Create performance metrics
        performance = PerformanceMetrics.objects.create(
            jobcard=jobcard,
            company=jobcard.branch.company if jobcard.branch else None,
            branch=jobcard.branch,
            floor_manager=floor_manager,
            supervisor=supervisor,
            scheduled_duration_minutes=scheduled_duration,
            actual_duration_minutes=actual_duration,
            time_difference_minutes=time_difference,
            job_value=job_value,
            package_value=package_value,
            addons_value=addons_value,
            parts_value=parts_value,
            gst_amount=gst_amount,
            total_with_gst=total_with_gst,
            completed_on_time=(time_difference >= 0),
            job_started_at=jobcard.job_started_at,
            job_completed_at=timezone.now()
        )
        
        # Add applicators
        if applicators:
            performance.applicators.set(applicators)
        
        # Update team aggregates if supervisor exists
        if supervisor:
            PerformanceTrackingService.update_team_aggregates(
                supervisor=supervisor,
                date=performance.job_completed_at.date()
            )

        # Also update floor-manager aggregates
        floor_manager = performance.floor_manager
        if floor_manager:
            PerformanceTrackingService.update_floor_manager_aggregates(
                floor_manager=floor_manager,
                date=performance.job_completed_at.date()
            )
        
        # Create reward/deduction records automatically
        try:
            from .reward_service import RewardCalculationService
            RewardCalculationService.create_reward_records(jobcard)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating reward records for JobCard #{jobcard.id}: {str(e)}")
        
        return performance
    
    @staticmethod
    def calculate_time_performance(jobcard):
        """
        Calculate time saved/delayed for a job
        
        Returns:
            dict with time performance metrics
        """
        if not jobcard.job_started_at:
            return None
        
        scheduled = jobcard.get_allowed_duration_minutes()
        actual = jobcard.get_elapsed_minutes()
        difference = scheduled - actual
        
        return {
            'scheduled_minutes': scheduled,
            'actual_minutes': actual,
            'time_difference_minutes': difference,
            'time_saved': max(0, difference),
            'time_delayed': max(0, -difference),
            'on_time': difference >= 0,
            'efficiency_percentage': (scheduled / actual * 100) if actual > 0 else 0
        }
    
    @staticmethod
    def get_team_performance(supervisor, period_type='daily', start_date=None, end_date=None):
        """
        Get aggregated team performance for a supervisor
        
        Args:
            supervisor: User instance (supervisor)
            period_type: 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
            start_date: Start date for filtering (optional)
            end_date: End date for filtering (optional)
        
        Returns:
            QuerySet of TeamPerformance instances
        """
        queryset = TeamPerformance.objects.filter(
            supervisor=supervisor,
            period_type=period_type
        )
        
        if start_date:
            queryset = queryset.filter(period_start__gte=start_date)
        if end_date:
            queryset = queryset.filter(period_end__lte=end_date)
        
        return queryset.order_by('-period_start')
    
    @staticmethod
    def get_branch_performance(branch, period_type='daily', start_date=None, end_date=None):
        """
        Get branch-level performance across all teams.

        Returns supervisor-based TeamPerformance records OR synthetic
        entries aggregated on the fly for custom periods.
        """
        if period_type == 'custom':
            # Aggregate from PerformanceMetrics for ALL jobs in branch
            metrics_qs = PerformanceMetrics.objects.filter(branch=branch)
            if start_date:
                metrics_qs = metrics_qs.filter(job_completed_at__date__gte=start_date)
            if end_date:
                metrics_qs = metrics_qs.filter(job_completed_at__date__lte=end_date)
            
            # Group by supervisor
            # Note: We group by supervisor ID. supervisor=None covers FM-direct jobs.
            stats = metrics_qs.values(
                'supervisor', 'supervisor__name',
                'floor_manager', 'floor_manager__name'
            ).annotate(
                total_jobs=Count('id'),
                jobs_on_time=Count('id', filter=Q(completed_on_time=True)),
                total_time_saved=Sum('time_difference_minutes', filter=Q(time_difference_minutes__gt=0)),
                total_time_delayed=Sum('time_difference_minutes', filter=Q(time_difference_minutes__lt=0)),
                total_job_value=Sum('total_with_gst'),
                paid_job_value=Sum('total_with_gst', filter=Q(is_paid=True)),
                total_rewards=Sum('reward_amount'),
                avg_completion_time=Avg('actual_duration_minutes'),
            )
            
            result = []
            for s in stats:
                total_jobs = s['total_jobs'] or 0
                jobs_on_time = s['jobs_on_time'] or 0
                efficiency = (jobs_on_time / total_jobs * 100) if total_jobs > 0 else 0
                total_rewards = Decimal(str(s['total_rewards'] or 0))
                avg_reward = (total_rewards / total_jobs) if total_jobs > 0 else Decimal('0')
                
                result.append({
                    'id': None,
                    'branch': branch.id,
                    'branch_name': branch.name,
                    'floor_manager': s['floor_manager'],
                    'floor_manager_name': s['floor_manager__name'] or 'Floor Manager',
                    'supervisor': s['supervisor'],
                    'supervisor_name': s['supervisor__name'] or 'Floor Manager (Direct)',
                    'period_type': 'custom',
                    'period_start': str(start_date) if start_date else None,
                    'period_end': str(end_date) if end_date else None,
                    'total_jobs_completed': total_jobs,
                    'jobs_on_time': jobs_on_time,
                    'jobs_delayed': total_jobs - jobs_on_time,
                    'total_time_saved': s['total_time_saved'] or 0,
                    'total_time_delayed': abs(s['total_time_delayed'] or 0),
                    'average_completion_time': float(s['avg_completion_time'] or 0),
                    'total_job_value': float(s['total_job_value'] or 0),
                    'paid_job_value': float(s['paid_job_value'] or 0),
                    'total_rewards_earned': float(total_rewards),
                    'average_reward_per_job': float(avg_reward),
                    'efficiency_percentage': efficiency,
                    'on_time_percentage': efficiency, # For serializer parity
                    'net_time_performance': (s['total_time_saved'] or 0) - abs(s['total_time_delayed'] or 0),
                    'team_members': [],
                    'team_size': 0,
                    '_is_fm_direct': s['supervisor'] is None,
                })
            return sorted(result, key=lambda x: x['total_job_value'], reverse=True)

        # Standard period logic using TeamPerformance table
        queryset = TeamPerformance.objects.filter(
            branch=branch,
            period_type=period_type
        )

        if start_date:
            queryset = queryset.filter(period_start__gte=start_date)
        if end_date:
            queryset = queryset.filter(period_end__lte=end_date)

        result = list(queryset.order_by('-total_job_value'))

        # ── Include FM-direct jobs (no supervisor assigned) ──────────────
        fm_metrics_qs = PerformanceMetrics.objects.filter(
            branch=branch,
            supervisor__isnull=True,
        )
        if start_date:
            fm_metrics_qs = fm_metrics_qs.filter(job_completed_at__date__gte=start_date)
        if end_date:
            fm_metrics_qs = fm_metrics_qs.filter(job_completed_at__date__lte=end_date)

        if fm_metrics_qs.exists():
            agg = fm_metrics_qs.aggregate(
                total_jobs=Count('id'),
                jobs_on_time=Count('id', filter=Q(completed_on_time=True)),
                total_time_saved=Sum('time_difference_minutes', filter=Q(time_difference_minutes__gt=0)),
                total_job_value=Sum('total_with_gst'),
                paid_job_value=Sum('total_with_gst', filter=Q(is_paid=True)),
                total_rewards=Sum('reward_amount'),
                avg_completion_time=Avg('actual_duration_minutes'),
            )

            total_jobs = agg['total_jobs'] or 0
            jobs_on_time = agg['jobs_on_time'] or 0
            efficiency = (jobs_on_time / total_jobs * 100) if total_jobs > 0 else 0
            total_rewards = Decimal(str(agg['total_rewards'] or 0))
            avg_reward = (total_rewards / total_jobs) if total_jobs > 0 else Decimal('0')

            first_fm = fm_metrics_qs.filter(
                floor_manager__isnull=False
            ).values_list('floor_manager_id', 'floor_manager__name').first()

            synthetic = {
                'id': None,
                'branch': branch.id,
                'branch_name': branch.name,
                'floor_manager': first_fm[0] if first_fm else None,
                'floor_manager_name': first_fm[1] if first_fm else 'Floor Manager',
                'supervisor': None,
                'supervisor_name': 'Floor Manager (Direct)',
                'period_type': period_type,
                'period_start': str(start_date) if start_date else None,
                'period_end': str(end_date) if end_date else None,
                'total_jobs_completed': total_jobs,
                'jobs_on_time': jobs_on_time,
                'jobs_delayed': total_jobs - jobs_on_time,
                'total_time_saved': agg['total_time_saved'] or 0,
                'total_time_delayed': 0,
                'average_completion_time': float(agg['avg_completion_time'] or 0),
                'total_job_value': float(agg['total_job_value'] or 0),
                'paid_job_value': float(agg['paid_job_value'] or 0),
                'total_rewards_earned': float(total_rewards),
                'average_reward_per_job': float(avg_reward),
                'efficiency_percentage': efficiency,
                'on_time_percentage': efficiency,
                'net_time_performance': agg['total_time_saved'] or 0,
                'team_members': [],
                'team_size': 0,
                '_is_fm_direct': True,
            }
            result.append(synthetic)

        return result
    
    @staticmethod
    def get_individual_performance(user, role, start_date=None, end_date=None):
        """
        Get individual performance metrics for a user
        
        Args:
            user: User instance
            role: User role ('floor_manager', 'supervisor', 'applicator')
            start_date: Start date for filtering (optional)
            end_date: End date for filtering (optional)
        
        Returns:
            dict with performance metrics
        """
        # Build query based on role
        if role == 'floor_manager':
            queryset = PerformanceMetrics.objects.filter(floor_manager=user)
        elif role == 'supervisor':
            queryset = PerformanceMetrics.objects.filter(supervisor=user)
        elif role == 'applicator':
            queryset = PerformanceMetrics.objects.filter(applicators=user)
        else:
            return None
        
        # Apply date filters
        if start_date:
            queryset = queryset.filter(job_completed_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(job_completed_at__date__lte=end_date)
        
        # Calculate aggregates using GST-inclusive totals for consistency with TeamPerformance
        stats = queryset.aggregate(
            total_jobs=Count('id'),
            jobs_on_time=Count('id', filter=Q(completed_on_time=True)),
            total_time_saved=Sum('time_difference_minutes', filter=Q(time_difference_minutes__gt=0)),
            total_time_delayed=Sum('time_difference_minutes', filter=Q(time_difference_minutes__lt=0)),
            total_job_value=Sum('total_with_gst'),
            total_rewards=Sum('reward_amount'),
            avg_completion_time=Avg('actual_duration_minutes')
        )
        
        # Clean up None values
        stats['total_time_saved'] = stats['total_time_saved'] or 0
        stats['total_time_delayed'] = abs(stats['total_time_delayed'] or 0)
        stats['total_job_value'] = stats['total_job_value'] or Decimal('0')
        stats['total_rewards'] = stats['total_rewards'] or Decimal('0')
        stats['avg_completion_time'] = stats['avg_completion_time'] or 0
        
        # Calculate additional metrics
        stats['jobs_delayed'] = stats['total_jobs'] - stats['jobs_on_time']
        stats['on_time_percentage'] = (stats['jobs_on_time'] / stats['total_jobs'] * 100) if stats['total_jobs'] > 0 else 0
        stats['net_time_performance'] = stats['total_time_saved'] - stats['total_time_delayed']
        
        return stats
    
    @staticmethod
    @transaction.atomic
    def update_team_aggregates(supervisor, date):
        """
        Update team performance aggregates for all period types for a specific date
        
        Args:
            supervisor: User instance (supervisor)
            date: Date to update aggregates for
        
        Returns:
            TeamPerformance instance (Daily)
        """
        # Daily
        daily_perf = PerformanceTrackingService._update_single_period_aggregate(
            supervisor, 'daily', date, date
        )
        
        # Weekly
        week_start = date - timedelta(days=date.weekday())
        week_end = week_start + timedelta(days=6)
        PerformanceTrackingService._update_single_period_aggregate(
            supervisor, 'weekly', week_start, week_end
        )
        
        # Monthly
        month_start = date.replace(day=1)
        if date.month == 12:
            month_end = date.replace(day=31)
        else:
            next_month = date.replace(month=date.month + 1, day=1)
            month_end = next_month - timedelta(days=1)
        PerformanceTrackingService._update_single_period_aggregate(
            supervisor, 'monthly', month_start, month_end
        )
        
        # Quarterly
        quarter = (date.month - 1) // 3 + 1
        q_start = date.replace(month=(quarter - 1) * 3 + 1, day=1)
        if quarter == 4:
            q_end = date.replace(month=12, day=31)
        else:
            q_end = (date.replace(month=quarter * 3 + 1, day=1) - timedelta(days=1))
        PerformanceTrackingService._update_single_period_aggregate(
            supervisor, 'quarterly', q_start, q_end
        )
        
        # Yearly
        year_start = date.replace(month=1, day=1)
        year_end = date.replace(month=12, day=31)
        PerformanceTrackingService._update_single_period_aggregate(
            supervisor, 'yearly', year_start, year_end
        )
        
        return daily_perf

    @staticmethod
    def _update_single_period_aggregate(supervisor, period_type, start_date, end_date):
        """Helper to update a single TeamPerformance record for any period range"""
        # Get or create team performance record
        team_perf, created = TeamPerformance.objects.get_or_create(
            supervisor=supervisor,
            period_type=period_type,
            period_start=start_date,
            period_end=end_date,
            defaults={
                'branch': supervisor.branch,
                'company': supervisor.branch.company if supervisor.branch else None,
                'floor_manager': None
            }
        )
        
        # Get all performance metrics for this supervisor in this period
        metrics = PerformanceMetrics.objects.filter(
            supervisor=supervisor,
            job_completed_at__date__gte=start_date,
            job_completed_at__date__lte=end_date
        )
        
        if not metrics.exists():
            # If no metrics, reset to zeros (in case jobs were deleted/changed)
            team_perf.total_jobs_completed = 0
            team_perf.jobs_on_time = 0
            team_perf.jobs_delayed = 0
            team_perf.total_time_saved = 0
            team_perf.total_time_delayed = 0
            team_perf.average_completion_time = Decimal('0')
            team_perf.total_job_value = Decimal('0')
            team_perf.paid_job_value = Decimal('0')
            team_perf.total_rewards_earned = Decimal('0')
            team_perf.team_members = []
            team_perf.team_size = 0
            team_perf.efficiency_percentage = 0
            team_perf.average_reward_per_job = 0
            team_perf.save()
            return team_perf
        
        # Aggregate statistics
        # Use total_with_gst (customer-facing amount) so TeamPerformance matches the transaction ledger
        stats = metrics.aggregate(
            total_jobs=Count('id'),
            jobs_on_time=Count('id', filter=Q(completed_on_time=True)),
            total_time_saved=Sum('time_difference_minutes', filter=Q(time_difference_minutes__gt=0)),
            total_time_delayed=Sum('time_difference_minutes', filter=Q(time_difference_minutes__lt=0)),
            total_job_value=Sum('total_with_gst'),          # all jobs (estimated for unpaid)
            paid_job_value=Sum('total_with_gst', filter=Q(is_paid=True)),  # confirmed paid revenue only
            total_rewards=Sum('reward_amount'),
            avg_completion_time=Avg('actual_duration_minutes')
        )
        
        # Get unique team members
        team_member_ids = set()
        for metric in metrics:
            team_member_ids.update(metric.applicators.values_list('id', flat=True))
        
        # Update team performance record
        team_perf.total_jobs_completed = stats['total_jobs']
        team_perf.jobs_on_time = stats['jobs_on_time']
        team_perf.jobs_delayed = stats['total_jobs'] - stats['jobs_on_time']
        team_perf.total_time_saved = stats['total_time_saved'] or 0
        team_perf.total_time_delayed = abs(stats['total_time_delayed'] or 0)
        team_perf.average_completion_time = stats['avg_completion_time'] or Decimal('0')
        # Use GST-inclusive total; fall back to net job_value if metrics pre-date the gst fields
        agg_value = stats['total_job_value'] or Decimal('0')
        if agg_value == Decimal('0'):
            fallback = metrics.aggregate(fb=Sum('job_value'))['fb']
            agg_value = fallback or Decimal('0')
        team_perf.total_job_value = agg_value
        team_perf.paid_job_value = stats['paid_job_value'] or Decimal('0')
        team_perf.total_rewards_earned = stats['total_rewards'] or Decimal('0')
        team_perf.team_members = list(team_member_ids)
        team_perf.team_size = len(team_member_ids)
        
        # Calculate efficiency
        if team_perf.total_jobs_completed > 0:
            team_perf.efficiency_percentage = (team_perf.jobs_on_time / team_perf.total_jobs_completed) * 100
        
        # Calculate average reward per job
        if team_perf.total_jobs_completed > 0:
            team_perf.average_reward_per_job = team_perf.total_rewards_earned / team_perf.total_jobs_completed
        
        # Set floor manager from first metric
        if not team_perf.floor_manager:
            first_metric = metrics.first()
            if first_metric and first_metric.floor_manager:
                team_perf.floor_manager = first_metric.floor_manager
        
        team_perf.save()
        
        return team_perf
    
    @staticmethod
    def get_team_performance(supervisor, period_type='daily', start_date=None, end_date=None):
        """
        Get aggregated team performance for a supervisor
        """
        if period_type == 'custom':
            # Aggregate from PerformanceMetrics for this supervisor
            metrics_qs = PerformanceMetrics.objects.filter(supervisor=supervisor)
            if start_date:
                metrics_qs = metrics_qs.filter(job_completed_at__date__gte=start_date)
            if end_date:
                metrics_qs = metrics_qs.filter(job_completed_at__date__lte=end_date)
            
            agg = metrics_qs.aggregate(
                total_jobs=Count('id'),
                jobs_on_time=Count('id', filter=Q(completed_on_time=True)),
                total_time_saved=Sum('time_difference_minutes', filter=Q(time_difference_minutes__gt=0)),
                total_time_delayed=Sum('time_difference_minutes', filter=Q(time_difference_minutes__lt=0)),
                total_job_value=Sum('total_with_gst'),
                paid_job_value=Sum('total_with_gst', filter=Q(is_paid=True)),
                total_rewards=Sum('reward_amount'),
                avg_completion_time=Avg('actual_duration_minutes'),
            )
            
            total_jobs = agg['total_jobs'] or 0
            jobs_on_time = agg['jobs_on_time'] or 0
            efficiency = (jobs_on_time / total_jobs * 100) if total_jobs > 0 else 0
            total_rewards = Decimal(str(agg['total_rewards'] or 0))
            avg_reward = (total_rewards / total_jobs) if total_jobs > 0 else Decimal('0')
            
            return [{
                'id': None,
                'branch': supervisor.branch.id if supervisor.branch else None,
                'supervisor': supervisor.id,
                'supervisor_name': supervisor.name,
                'period_type': 'custom',
                'period_start': start_date,
                'period_end': end_date,
                'total_jobs_completed': total_jobs,
                'jobs_on_time': jobs_on_time,
                'jobs_delayed': total_jobs - jobs_on_time,
                'total_time_saved': agg['total_time_saved'] or 0,
                'total_time_delayed': abs(agg['total_time_delayed'] or 0),
                'average_completion_time': float(agg['avg_completion_time'] or 0),
                'total_job_value': float(agg['total_job_value'] or 0),
                'paid_job_value': float(agg['paid_job_value'] or 0),
                'total_rewards_earned': float(total_rewards),
                'average_reward_per_job': float(avg_reward),
                'efficiency_percentage': efficiency,
                'team_members': [],
                'team_size': 0
            }]

        queryset = TeamPerformance.objects.filter(
            supervisor=supervisor,
            period_type=period_type
        )
        
        if start_date:
            queryset = queryset.filter(period_start__gte=start_date)
        if end_date:
            queryset = queryset.filter(period_end__lte=end_date)
        
        return queryset.order_by('-period_start')

    @staticmethod
    def get_leaderboard(branch=None, company=None, period_type='monthly', metric='total_job_value', limit=10, start_date=None, end_date=None):
        """
        Get leaderboard rankings for teams
        """
        if period_type == 'custom' and start_date and end_date:
            # Aggregate from PerformanceMetrics for ALL supervisors
            metrics_qs = PerformanceMetrics.objects.all()
            if branch:
                metrics_qs = metrics_qs.filter(branch=branch)
            elif company:
                metrics_qs = metrics_qs.filter(company=company)
                
            metrics_qs = metrics_qs.filter(
                job_completed_at__date__gte=start_date,
                job_completed_at__date__lte=end_date
            )
            
            # Group by supervisor
            stats = metrics_qs.values(
                'supervisor', 'supervisor__name', 'branch__name'
            ).annotate(
                total_jobs_completed=Count('id'),
                total_job_value=Sum('total_with_gst'),
                paid_job_value=Sum('total_with_gst', filter=Q(is_paid=True)),
                total_rewards_earned=Sum('reward_amount'),
                efficiency_percentage=Avg(
                    Case(
                        When(completed_on_time=True, then=Value(100)),
                        default=Value(0),
                        output_field=DecimalField()
                    )
                ),
                jobs_on_time=Count('id', filter=Q(completed_on_time=True)),
            ).order_by(f'-{metric}')[:limit]
            
            # Convert to synthetic format for LeaderboardSerializer
            result = []
            for i, s in enumerate(stats, 1):
                if s['supervisor'] is None: continue # Skip FM-direct in main supervisor leaderboard
                result.append({
                    'rank': i,
                    'supervisor': {'id': s['supervisor'], 'name': s['supervisor__name']},
                    'branch': {'name': s['branch__name']},
                    'total_jobs_completed': s['total_jobs_completed'],
                    'total_job_value': float(s['total_job_value'] or 0),
                    'paid_job_value': float(s['paid_job_value'] or 0),
                    'total_rewards_earned': float(s['total_rewards_earned'] or 0),
                    'efficiency_percentage': float(s['efficiency_percentage'] or 0),
                    'jobs_on_time': s['jobs_on_time'],
                    'team_size': 0,
                    'period_type': 'custom',
                    'period_start': start_date,
                    'period_end': end_date
                })
            return result

        # Standard period logic
        if not (start_date and end_date):
            today = date.today()
            if period_type == 'daily':
                start_date = today
                end_date = today
            elif period_type == 'weekly':
                start_date = today - timedelta(days=today.weekday())
                end_date = start_date + timedelta(days=6)
            elif period_type == 'monthly':
                start_date = today.replace(day=1)
                if today.month == 12:
                    end_date = today.replace(day=31)
                else:
                    end_date = (today.replace(month=today.month + 1, day=1) - timedelta(days=1))
            else:
                start_date = today - timedelta(days=30)
                end_date = today
        
        queryset = TeamPerformance.objects.filter(
            period_type=period_type,
            period_start__gte=start_date,
            period_end__lte=end_date
        )
        
        if branch:
            queryset = queryset.filter(branch=branch)
        elif company:
            queryset = queryset.filter(company=company)
        
        # Order by metric (descending)
        
        # Order by metric (descending)
        queryset = queryset.order_by(f'-{metric}')[:limit]
        
        return queryset

    # ------------------------------------------------------------------
    # Payment-triggered update
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def update_on_payment(jobcard, invoice):
        """
        Called when an invoice linked to *jobcard* is fully paid.

        Updates the existing PerformanceMetrics record with the authoritative
        financial data from the paid invoice, then marks it as paid and
        recalculates team aggregates so leaderboards reflect real revenue.

        Args:
            jobcard: JobCard instance whose invoice was just paid
            invoice:  The fully-paid Invoice instance

        Returns:
            PerformanceMetrics instance (updated) or None if not found
        """
        logger = logging.getLogger(__name__)

        # 1. Ensure a PerformanceMetrics record exists (create if missing)
        try:
            performance = jobcard.performance  # OneToOne reverse accessor
        except Exception:
            performance = None

        if performance is None:
            # Job may have been paid without going through a tracked completion
            # status — create the record now.
            logger.info(
                f"PerformanceMetrics missing for JobCard #{jobcard.id}; "
                f"creating on payment."
            )
            performance = PerformanceTrackingService.record_job_completion(jobcard)
            if performance is None:
                logger.warning(
                    f"Could not create PerformanceMetrics for JobCard #{jobcard.id} "
                    f"(missing required data). Skipping payment update."
                )
                return None

        # 2. Pull authoritative financial values from the paid invoice
        paid_total = invoice.total_amount or Decimal('0')
        paid_gst = invoice.tax_amount or Decimal('0')
        paid_at = timezone.now()

        # 3. Update the record
        performance.total_with_gst = paid_total
        performance.gst_amount = paid_gst
        performance.is_paid = True
        performance.paid_at = paid_at
        performance.save(
            update_fields=['total_with_gst', 'gst_amount', 'is_paid', 'paid_at', 'updated_at']
        )

        logger.info(
            f"✓ PerformanceMetrics updated on payment for JobCard #{jobcard.id}: "
            f"total_with_gst=₹{paid_total}, gst=₹{paid_gst}"
        )

        # 4. Recalculate team aggregates so leaderboards use the real amount
        supervisor = performance.supervisor
        if supervisor:
            try:
                PerformanceTrackingService.update_team_aggregates(
                    supervisor=supervisor,
                    date=paid_at.date()
                )
            except Exception as e:
                logger.error(
                    f"Error recalculating team aggregates for supervisor "
                    f"#{supervisor.id} after payment: {e}"
                )

        # Also recalculate floor-manager aggregates
        floor_manager = performance.floor_manager
        if floor_manager:
            try:
                PerformanceTrackingService.update_floor_manager_aggregates(
                    floor_manager=floor_manager,
                    date=paid_at.date()
                )
            except Exception as e:
                logger.error(
                    f"Error recalculating FM aggregates for floor_manager "
                    f"#{floor_manager.id} after payment: {e}"
                )

        return performance

    # ------------------------------------------------------------------
    # Floor Manager Aggregate Methods
    # ------------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def update_floor_manager_aggregates(floor_manager, date):
        """
        Update FloorManagerPerformance for all period types for a given date.

        Args:
            floor_manager: User instance (floor_manager)
            date: Date to update aggregates for

        Returns:
            FloorManagerPerformance instance (Daily)
        """
        # Daily
        daily_perf = PerformanceTrackingService._update_single_fm_period_aggregate(
            floor_manager, 'daily', date, date
        )
        # Weekly
        week_start = date - timedelta(days=date.weekday())
        week_end = week_start + timedelta(days=6)
        PerformanceTrackingService._update_single_fm_period_aggregate(
            floor_manager, 'weekly', week_start, week_end
        )
        # Monthly
        month_start = date.replace(day=1)
        if date.month == 12:
            month_end = date.replace(day=31)
        else:
            next_month = date.replace(month=date.month + 1, day=1)
            month_end = next_month - timedelta(days=1)
        PerformanceTrackingService._update_single_fm_period_aggregate(
            floor_manager, 'monthly', month_start, month_end
        )
        # Quarterly
        quarter = (date.month - 1) // 3 + 1
        q_start = date.replace(month=(quarter - 1) * 3 + 1, day=1)
        if quarter == 4:
            q_end = date.replace(month=12, day=31)
        else:
            q_end = (date.replace(month=quarter * 3 + 1, day=1) - timedelta(days=1))
        PerformanceTrackingService._update_single_fm_period_aggregate(
            floor_manager, 'quarterly', q_start, q_end
        )
        # Yearly
        year_start = date.replace(month=1, day=1)
        year_end = date.replace(month=12, day=31)
        PerformanceTrackingService._update_single_fm_period_aggregate(
            floor_manager, 'yearly', year_start, year_end
        )
        return daily_perf

    @staticmethod
    def _update_single_fm_period_aggregate(floor_manager, period_type, start_date, end_date):
        """Helper to update/create a single FloorManagerPerformance record for any period range."""
        fm_perf, created = FloorManagerPerformance.objects.get_or_create(
            floor_manager=floor_manager,
            period_type=period_type,
            period_start=start_date,
            period_end=end_date,
            defaults={
                'branch': floor_manager.branch,
                'company': floor_manager.branch.company if floor_manager.branch else None,
            }
        )

        metrics = PerformanceMetrics.objects.filter(
            floor_manager=floor_manager,
            job_completed_at__date__gte=start_date,
            job_completed_at__date__lte=end_date
        )

        if not metrics.exists():
            fm_perf.total_jobs_completed = 0
            fm_perf.jobs_on_time = 0
            fm_perf.jobs_delayed = 0
            fm_perf.total_time_saved = 0
            fm_perf.total_time_delayed = 0
            fm_perf.average_completion_time = Decimal('0')
            fm_perf.total_job_value = Decimal('0')
            fm_perf.paid_job_value = Decimal('0')
            fm_perf.total_rewards_earned = Decimal('0')
            fm_perf.average_reward_per_job = Decimal('0')
            fm_perf.supervised_team_ids = []
            fm_perf.supervised_teams_count = 0
            fm_perf.efficiency_percentage = Decimal('0')
            fm_perf.save()
            return fm_perf

        stats = metrics.aggregate(
            total_jobs=Count('id'),
            jobs_on_time=Count('id', filter=Q(completed_on_time=True)),
            total_time_saved=Sum('time_difference_minutes', filter=Q(time_difference_minutes__gt=0)),
            total_time_delayed=Sum('time_difference_minutes', filter=Q(time_difference_minutes__lt=0)),
            total_job_value=Sum('total_with_gst'),
            paid_job_value=Sum('total_with_gst', filter=Q(is_paid=True)),
            total_rewards=Sum('reward_amount'),
            avg_completion_time=Avg('actual_duration_minutes')
        )

        # Collect unique supervisor IDs under this FM
        supervisor_ids = list(
            metrics.exclude(supervisor=None)
                   .values_list('supervisor_id', flat=True)
                   .distinct()
        )

        fm_perf.total_jobs_completed = stats['total_jobs']
        fm_perf.jobs_on_time = stats['jobs_on_time']
        fm_perf.jobs_delayed = stats['total_jobs'] - stats['jobs_on_time']
        fm_perf.total_time_saved = stats['total_time_saved'] or 0
        fm_perf.total_time_delayed = abs(stats['total_time_delayed'] or 0)
        fm_perf.average_completion_time = stats['avg_completion_time'] or Decimal('0')

        agg_value = stats['total_job_value'] or Decimal('0')
        if agg_value == Decimal('0'):
            fallback = metrics.aggregate(fb=Sum('job_value'))['fb']
            agg_value = fallback or Decimal('0')
        fm_perf.total_job_value = agg_value
        fm_perf.paid_job_value = stats['paid_job_value'] or Decimal('0')
        fm_perf.total_rewards_earned = stats['total_rewards'] or Decimal('0')

        if fm_perf.total_jobs_completed > 0:
            fm_perf.efficiency_percentage = (
                Decimal(fm_perf.jobs_on_time) / Decimal(fm_perf.total_jobs_completed)
            ) * 100
            fm_perf.average_reward_per_job = (
                fm_perf.total_rewards_earned / fm_perf.total_jobs_completed
            )

        fm_perf.supervised_team_ids = supervisor_ids
        fm_perf.supervised_teams_count = len(supervisor_ids)
        fm_perf.save()
        return fm_perf

    @staticmethod
    def get_floor_manager_performance(floor_manager, period_type='monthly', start_date=None, end_date=None):
        """
        Retrieve FloorManagerPerformance records for a given floor manager.
        """
        if period_type == 'custom':
            # Aggregate from PerformanceMetrics for THIS floor manager
            metrics_qs = PerformanceMetrics.objects.filter(floor_manager=floor_manager)
            if start_date:
                metrics_qs = metrics_qs.filter(job_completed_at__date__gte=start_date)
            if end_date:
                metrics_qs = metrics_qs.filter(job_completed_at__date__lte=end_date)
                
            agg = metrics_qs.aggregate(
                total_jobs_completed=Count('id'),
                jobs_on_time=Count('id', filter=Q(completed_on_time=True)),
                total_time_saved=Sum('time_difference_minutes', filter=Q(time_difference_minutes__gt=0)),
                total_time_delayed=Sum('time_difference_minutes', filter=Q(time_difference_minutes__lt=0)),
                total_job_value=Sum('total_with_gst'),
                paid_job_value=Sum('total_with_gst', filter=Q(is_paid=True)),
                total_rewards_earned=Sum('reward_amount'),
                avg_completion_time=Avg('actual_duration_minutes'),
            )
            
            total_jobs = agg['total_jobs_completed'] or 0
            on_time = agg['jobs_on_time'] or 0
            
            return [{
                'id': None,
                'branch': floor_manager.branch.id if floor_manager.branch else None,
                'floor_manager': {
                    'id': floor_manager.id, 
                    'name': floor_manager.name, 
                    'email': floor_manager.email
                },
                'period_type': 'custom',
                'period_start': start_date,
                'period_end': end_date,
                'total_jobs_completed': total_jobs,
                'jobs_on_time': on_time,
                'jobs_delayed': total_jobs - on_time,
                'total_time_saved': agg['total_time_saved'] or 0,
                'total_time_delayed': abs(agg['total_time_delayed'] or 0),
                'total_job_value': float(agg['total_job_value'] or 0),
                'paid_job_value': float(agg['paid_job_value'] or 0),
                'total_rewards_earned': float(agg['total_rewards_earned'] or 0),
                'average_reward_per_job': float(agg['total_rewards_earned'] or 0) / total_jobs if total_jobs > 0 else 0,
                'efficiency_percentage': (on_time / total_jobs * 100) if total_jobs > 0 else 0,
                'on_time_percentage': (on_time / total_jobs * 100) if total_jobs > 0 else 0,
                'net_time_performance': (agg['total_time_saved'] or 0) - abs(agg['total_time_delayed'] or 0),
                'supervised_teams_count': 0
            }]

        qs = FloorManagerPerformance.objects.filter(
            floor_manager=floor_manager,
            period_type=period_type
        )
        if start_date:
            qs = qs.filter(period_start__gte=start_date)
        if end_date:
            qs = qs.filter(period_end__lte=end_date)
        return qs.order_by('-period_start')

    @staticmethod
    def get_floor_manager_leaderboard(
        branch=None, company=None, period_type='monthly',
        metric='total_job_value', limit=10, start_date=None, end_date=None
    ):
        """
        Get leaderboard rankings for floor managers.
        """
        if period_type == 'custom' and start_date and end_date:
            # Aggregate from PerformanceMetrics for ALL floor managers
            metrics_qs = PerformanceMetrics.objects.all()
            if branch:
                metrics_qs = metrics_qs.filter(branch=branch)
            elif company:
                metrics_qs = metrics_qs.filter(company=company)
                
            metrics_qs = metrics_qs.filter(
                job_completed_at__date__gte=start_date,
                job_completed_at__date__lte=end_date
            )
            
            # Group by floor_manager
            stats = metrics_qs.values(
                'floor_manager', 'floor_manager__name', 'floor_manager__email', 'branch__name'
            ).annotate(
                total_jobs_completed=Count('id'),
                total_job_value=Sum('total_with_gst'),
                paid_job_value=Sum('total_with_gst', filter=Q(is_paid=True)),
                total_rewards_earned=Sum('reward_amount'),
                efficiency_percentage=Avg(
                    Case(
                        When(completed_on_time=True, then=Value(100)),
                        default=Value(0),
                        output_field=DecimalField()
                    )
                ),
                jobs_on_time=Count('id', filter=Q(completed_on_time=True)),
                total_time_saved=Sum('time_difference_minutes', filter=Q(time_difference_minutes__gt=0)),
                total_time_delayed=Sum('time_difference_minutes', filter=Q(time_difference_minutes__lt=0)),
            ).order_by(f'-{metric}')[:limit]
            
            result = []
            for s in stats:
                if s['floor_manager'] is None: continue
                total_jobs = s['total_jobs_completed']
                on_time = s['jobs_on_time']
                
                result.append({
                    'id': None,
                    'floor_manager': {
                        'id': s['floor_manager'], 
                        'name': s['floor_manager__name'], 
                        'email': s['floor_manager__email']
                    },
                    'branch': {'name': s['branch__name']},
                    'period_type': 'custom',
                    'period_start': start_date,
                    'period_end': end_date,
                    'total_jobs_completed': total_jobs,
                    'jobs_on_time': on_time,
                    'jobs_delayed': total_jobs - on_time,
                    'total_time_saved': s['total_time_saved'] or 0,
                    'total_time_delayed': abs(s['total_time_delayed'] or 0),
                    'total_job_value': float(s['total_job_value'] or 0),
                    'paid_job_value': float(s['paid_job_value'] or 0),
                    'total_rewards_earned': float(s['total_rewards_earned'] or 0),
                    'average_reward_per_job': float(s['total_rewards_earned'] or 0) / total_jobs if total_jobs > 0 else 0,
                    'efficiency_percentage': float(s['efficiency_percentage'] or 0),
                    'on_time_percentage': (on_time / total_jobs * 100) if total_jobs > 0 else 0,
                    'net_time_performance': (s['total_time_saved'] or 0) - abs(s['total_time_delayed'] or 0),
                    'supervised_teams_count': 0 # Optional
                })
            return result

        # If dates are provided, use them; otherwise calculate based on period_type
        if not (start_date and end_date):
            today = date.today()
            if period_type == 'daily':
                start_date = today
                end_date = today
            elif period_type == 'weekly':
                start_date = today - timedelta(days=today.weekday())
                end_date = start_date + timedelta(days=6)
            elif period_type == 'monthly':
                start_date = today.replace(day=1)
                if today.month == 12:
                    end_date = today.replace(day=31)
                else:
                    end_date = (today.replace(month=today.month + 1, day=1) - timedelta(days=1))
            else:
                start_date = today - timedelta(days=30)
                end_date = today

        VALID_METRICS = [
            'total_job_value', 'paid_job_value', 'total_jobs_completed',
            'total_rewards_earned', 'efficiency_percentage'
        ]
        if metric not in VALID_METRICS:
            metric = 'total_job_value'

        qs = FloorManagerPerformance.objects.filter(
            period_type=period_type,
            period_start__gte=start_date,
            period_end__lte=end_date
        )
        if branch:
            qs = qs.filter(branch=branch)
        elif company:
            qs = qs.filter(company=company)

        return qs.order_by(f'-{metric}').select_related('floor_manager', 'branch')[:limit]
