"""
Performance metrics service - Business logic for performance tracking
"""
from decimal import Decimal
from django.db.models import Count, Avg, Sum, Q, F
from django.utils import timezone
from ..models import PerformanceMetrics
from jobcards.models import JobCard, SupervisorReward, FinalQCReport
from feedback.models import Feedback


class PerformanceService:
    """Service class for performance metrics operations"""
    
    @staticmethod
    def calculate_monthly_metrics(employee, month, year):
        """Calculate and save performance metrics for an employee for a month"""
        from datetime import datetime
        from calendar import monthrange
        from django.utils import timezone
        
        # Date range for the month (timezone-aware)
        start_date = timezone.make_aware(datetime(year, month, 1))
        end_date = timezone.make_aware(datetime(year, month, monthrange(year, month)[1], 23, 59, 59))
        
        # Get job cards assigned to this employee
        if employee.role == 'supervisor':
            job_cards = JobCard.objects.filter(
                supervisor=employee,
                created_at__gte=start_date,
                created_at__lte=end_date
            )
        elif employee.role == 'applicator':
            job_cards = JobCard.objects.filter(
                applicator_team=employee,
                created_at__gte=start_date,
                created_at__lte=end_date
            )
        elif employee.role == 'floor_manager':
            job_cards = JobCard.objects.filter(
                floor_manager=employee,
                created_at__gte=start_date,
                created_at__lte=end_date
            )
        else:
            job_cards = JobCard.objects.none()
        
        # Job completion metrics
        jobs_assigned = job_cards.count()
        jobs_completed = job_cards.filter(status='delivered').count()
        jobs_in_progress = job_cards.filter(
            status__in=['work_in_progress', 'assigned_to_applicator']
        ).count()
        
        # QC metrics
        qc_reports = FinalQCReport.objects.filter(
            jobcard__in=job_cards
        )
        qc_passed = qc_reports.filter(status='passed').count()
        qc_failed = qc_reports.filter(status='failed').count()
        qc_total = qc_passed + qc_failed
        qc_pass_rate = (qc_passed / qc_total * 100) if qc_total > 0 else 0
        
        # Time metrics
        completed_jobs = job_cards.filter(
            status='delivered',
            job_started_at__isnull=False
        )
        
        total_time_minutes = 0
        total_time_saved = 0
        total_time_overrun = 0
        
        for job in completed_jobs:
            if job.job_started_at:
                actual_time = job.get_elapsed_minutes()
                allowed_time = job.get_allowed_duration_minutes()
                total_time_minutes += actual_time
                
                time_diff = allowed_time - actual_time
                if time_diff > 0:
                    total_time_saved += time_diff
                else:
                    total_time_overrun += abs(time_diff)
        
        avg_completion_time = (total_time_minutes // jobs_completed) if jobs_completed > 0 else 0
        
        # Reward metrics
        rewards = SupervisorReward.objects.filter(
            recipient=employee,
            jobcard__created_at__gte=start_date,
            jobcard__created_at__lte=end_date
        )
        
        total_rewards = rewards.filter(
            transaction_type='reward'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        total_deductions = rewards.filter(
            transaction_type='deduction'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        net_incentive = total_rewards - total_deductions
        
        # Customer satisfaction
        feedbacks = Feedback.objects.filter(
            booking__jobcard__in=job_cards,
            rating__isnull=False
        )
        
        avg_rating = feedbacks.aggregate(avg=Avg('rating'))['avg'] or 0
        feedback_count = feedbacks.count()
        
        # Create or update performance metrics
        metrics, created = PerformanceMetrics.objects.update_or_create(
            employee=employee,
            month=month,
            year=year,
            defaults={
                'jobs_assigned': jobs_assigned,
                'jobs_completed': jobs_completed,
                'jobs_in_progress': jobs_in_progress,
                'qc_passed': qc_passed,
                'qc_failed': qc_failed,
                'qc_pass_rate': Decimal(str(round(qc_pass_rate, 2))),
                'avg_completion_time_minutes': avg_completion_time,
                'total_time_saved_minutes': total_time_saved,
                'total_time_overrun_minutes': total_time_overrun,
                'total_rewards': total_rewards,
                'total_deductions': total_deductions,
                'net_incentive': net_incentive,
                'avg_customer_rating': Decimal(str(round(avg_rating, 2))),
                'total_feedback_count': feedback_count
            }
        )
        
        return metrics
    
    @staticmethod
    def calculate_rankings(month, year, branch=None):
        """Calculate and update rankings for all employees"""
        # Get all metrics for the month
        metrics_qs = PerformanceMetrics.objects.filter(
            month=month,
            year=year
        )
        
        if branch:
            metrics_qs = metrics_qs.filter(employee__branch=branch)
        
        # Overall ranking by net incentive
        all_metrics = list(metrics_qs.order_by('-net_incentive'))
        for rank, metric in enumerate(all_metrics, 1):
            metric.overall_rank = rank
            # Top 10% are top performers
            metric.is_top_performer = rank <= max(1, len(all_metrics) // 10)
        
        # Branch-wise ranking
        if not branch:
            from branches.models import Branch
            branches = Branch.objects.all()
            
            for branch_obj in branches:
                branch_metrics = [m for m in all_metrics if m.employee.branch == branch_obj]
                for rank, metric in enumerate(sorted(branch_metrics, key=lambda x: x.net_incentive, reverse=True), 1):
                    metric.branch_rank = rank
        else:
            for rank, metric in enumerate(all_metrics, 1):
                metric.branch_rank = rank
        
        # Bulk update
        PerformanceMetrics.objects.bulk_update(
            all_metrics,
            ['overall_rank', 'branch_rank', 'is_top_performer']
        )
        
        return all_metrics
    
    @staticmethod
    def get_leaderboard(month, year, branch=None, limit=10):
        """Get top performers leaderboard"""
        metrics_qs = PerformanceMetrics.objects.filter(
            month=month,
            year=year
        ).select_related('employee')
        
        if branch:
            metrics_qs = metrics_qs.filter(employee__branch=branch)
        
        leaderboard = metrics_qs.order_by('-net_incentive')[:limit]
        
        result = []
        for rank, metric in enumerate(leaderboard, 1):
            result.append({
                'rank': rank,
                'employee_id': metric.employee.id,
                'employee_name': metric.employee.name,
                'supervisor_name': metric.employee.name, # Alias for Leaderboard.jsx
                'employee_role': metric.employee.role,
                'branch_name': metric.employee.branch.name if metric.employee.branch else 'N/A',
                'total_incentives': float(metric.net_incentive),
                'jobs_completed': metric.jobs_completed,
                'total_jobs_completed': metric.jobs_completed, # Alias for Leaderboard.jsx
                'total_rewards_earned': float(metric.total_rewards), # Alias for Leaderboard.jsx
                'qc_pass_rate': float(metric.qc_pass_rate),
                'efficiency_score': float(metric.efficiency_score),
                'avg_customer_rating': float(metric.avg_customer_rating)
            })
        
        return result
    
    @staticmethod
    def get_performance_dashboard(employee, month, year):
        """Get comprehensive performance dashboard for an employee"""
        # Get or calculate metrics
        try:
            metrics = PerformanceMetrics.objects.get(
                employee=employee,
                month=month,
                year=year
            )
        except PerformanceMetrics.DoesNotExist:
            # Calculate if not exists
            metrics = PerformanceService.calculate_monthly_metrics(employee, month, year)
        
        # Get trend data (last 6 months)
        from datetime import datetime
        from dateutil.relativedelta import relativedelta
        from django.utils import timezone
        
        current_date = timezone.make_aware(datetime(year, month, 1))
        trend_data = []
        
        for i in range(6):
            date = current_date - relativedelta(months=i)
            try:
                m = PerformanceMetrics.objects.get(
                    employee=employee,
                    month=date.month,
                    year=date.year
                )
                trend_data.append({
                    'month': date.month,
                    'year': date.year,
                    'month_name': date.strftime('%b %Y'),
                    'jobs_completed': m.jobs_completed,
                    'qc_pass_rate': float(m.qc_pass_rate),
                    'net_incentive': float(m.net_incentive)
                })
            except PerformanceMetrics.DoesNotExist:
                pass
        
        trend_data.reverse()
        
        return {
            'current_month': {
                'month': month,
                'year': year,
                'jobs_assigned': metrics.jobs_assigned,
                'jobs_completed': metrics.jobs_completed,
                'jobs_in_progress': metrics.jobs_in_progress,
                'completion_rate': float(metrics.completion_rate),
                'qc_passed': metrics.qc_passed,
                'qc_failed': metrics.qc_failed,
                'qc_pass_rate': float(metrics.qc_pass_rate),
                'avg_completion_time': metrics.avg_completion_time_minutes,
                'time_saved': metrics.total_time_saved_minutes,
                'time_overrun': metrics.total_time_overrun_minutes,
                'efficiency_score': float(metrics.efficiency_score),
                'total_rewards': float(metrics.total_rewards),
                'total_deductions': float(metrics.total_deductions),
                'net_incentive': float(metrics.net_incentive),
                'avg_customer_rating': float(metrics.avg_customer_rating),
                'feedback_count': metrics.total_feedback_count,
                'branch_rank': metrics.branch_rank,
                'overall_rank': metrics.overall_rank,
                'is_top_performer': metrics.is_top_performer
            },
            'trend': trend_data
        }
    
    @staticmethod
    def preview_incentive(employee, month, year):
        """Preview incentive calculation before payroll generation"""
        # Calculate metrics if not exists
        try:
            metrics = PerformanceMetrics.objects.get(
                employee=employee,
                month=month,
                year=year
            )
        except PerformanceMetrics.DoesNotExist:
            metrics = PerformanceService.calculate_monthly_metrics(employee, month, year)
        
        # Get detailed reward breakdown
        from datetime import datetime
        from calendar import monthrange
        from django.utils import timezone
        
        start_date = timezone.make_aware(datetime(year, month, 1))
        end_date = timezone.make_aware(datetime(year, month, monthrange(year, month)[1], 23, 59, 59))
        
        rewards = SupervisorReward.objects.filter(
            recipient=employee,
            jobcard__created_at__gte=start_date,
            jobcard__created_at__lte=end_date
        ).select_related('jobcard')
        
        reward_details = []
        for reward in rewards:
            reward_details.append({
                'job_card_id': reward.jobcard.id,
                'type': reward.transaction_type,
                'amount': float(reward.amount),
                'tier': reward.tier,
                'time_difference': reward.time_difference_minutes,
                'notes': reward.calculation_notes
            })
        
        return {
            'employee': {
                'id': employee.id,
                'name': employee.name,
                'role': employee.role
            },
            'period': {
                'month': month,
                'year': year
            },
            'summary': {
                'total_rewards': float(metrics.total_rewards),
                'total_deductions': float(metrics.total_deductions),
                'net_incentive': float(metrics.net_incentive),
                'jobs_completed': metrics.jobs_completed
            },
            'breakdown': reward_details,
            'performance': {
                'qc_pass_rate': float(metrics.qc_pass_rate),
                'avg_completion_time': metrics.avg_completion_time_minutes,
                'efficiency_score': float(metrics.efficiency_score)
            }
        }
