from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, Avg, Count
from django.utils import timezone
from datetime import datetime, timedelta, date
from decimal import Decimal

from .performance_models import PerformanceMetrics, TeamPerformance
from .performance_serializers import (
    PerformanceMetricsSerializer,
    TeamPerformanceSerializer,
    FloorManagerPerformanceSerializer,
    PerformanceSummarySerializer,
    LeaderboardSerializer,
    PotentialRewardCalculationSerializer,
    PotentialRewardResponseSerializer,
    JobPerformanceDetailSerializer
)
from .performance_service import PerformanceTrackingService
from .reward_service import RewardCalculationService
from .models import RewardSettings


class PerformanceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for performance analytics and tracking
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Base queryset - filtered by role and branch/company"""
        user = self.request.user
        if not user.is_authenticated:
            return PerformanceMetrics.objects.none()
            
        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return PerformanceMetrics.objects.none()

        # 1. Company Isolation — use direct company FK for fast lookup
        if user.is_superuser or user.role == 'super_admin':
            queryset = PerformanceMetrics.objects.all()
        else:
            queryset = PerformanceMetrics.objects.filter(
                company=company
            )

        # 2. Role-based filtering
        if user.role == 'company_admin':
            # company_admin sees all branches in their company (already filtered)
            pass
        elif user.role in ['branch_admin', 'floor_manager']:
            if user.branch:
                queryset = queryset.filter(branch=user.branch)
            else:
                return PerformanceMetrics.objects.none()
        elif user.role == 'supervisor':
            queryset = queryset.filter(supervisor=user)
        elif user.role == 'applicator':
            queryset = queryset.filter(applicators=user)
        elif not user.is_superuser:
            # Fallback for other roles: restrict to branch if available
            if getattr(user, 'branch', None):
                queryset = queryset.filter(branch=user.branch)
            else:
                return PerformanceMetrics.objects.none()
            
        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'team_summary':
            return TeamPerformanceSerializer
        elif self.action == 'individual':
            return PerformanceSummarySerializer
        elif self.action == 'leaderboard':
            return LeaderboardSerializer
        elif self.action == 'calculate_potential_reward':
            return PotentialRewardResponseSerializer
        elif self.action == 'job_details_list':
            return JobPerformanceDetailSerializer
        elif self.action in ['floor_manager_summary', 'floor_manager_leaderboard']:
            return FloorManagerPerformanceSerializer
        return PerformanceMetricsSerializer
    
    @action(detail=False, methods=['get'], url_path='team-summary')
    def team_summary(self, request):
        """Get team performance summary."""
        user = request.user
        
        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return Response({'error': 'Unauthorized context'}, status=status.HTTP_403_FORBIDDEN)

        # Get supervisor ID
        supervisor_id = request.query_params.get('supervisor_id')
        if not supervisor_id:
            if user.role == 'supervisor':
                supervisor_id = user.id
            else:
                return Response({'error': 'supervisor_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Permission check
        if user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Role-based validation
        from users.models import User
        try:
            # Explicitly scope supervisor by company for security
            if user.is_superuser:
                supervisor = User.objects.get(id=supervisor_id)
            else:
                # Find supervisor within the company context
                supervisor = User.objects.filter(
                    Q(id=supervisor_id) & (Q(company=company) | Q(branch__company=company))
                ).first()
                if not supervisor:
                    return Response({'error': 'Supervisor not found or unauthorized'}, status=status.HTTP_404_NOT_FOUND)
        except User.DoesNotExist:
            return Response({'error': 'Supervisor not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Role-based permission check
        if user.role == 'branch_admin' and user.branch:
            if supervisor.branch != user.branch:
                return Response({'error': 'Cannot access other branch data'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters
        period_type = request.query_params.get('period', 'monthly')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Parse dates
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Get team performance
        team_performance = PerformanceTrackingService.get_team_performance(
            supervisor=supervisor,
            period_type=period_type,
            start_date=start_date,
            end_date=end_date
        )
        
        serializer = TeamPerformanceSerializer(team_performance, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='branch-summary')
    def branch_summary(self, request):
        """Get branch-wide performance summary."""
        user = request.user
        
        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return Response({'error': 'Unauthorized context'}, status=status.HTTP_403_FORBIDDEN)

        # Permission check
        if user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get branch ID
        branch_id = request.query_params.get('branch_id')
        from branches.models import Branch

        branches = []
        if branch_id and branch_id != 'null':
            try:
                # Explicitly scope branch by company for security
                if user.is_superuser:
                    branches = [Branch.objects.get(id=branch_id)]
                else:
                    branch = Branch.objects.filter(id=branch_id, company=company).first()
                    if not branch:
                        return Response({'error': 'Branch not found or unauthorized'}, status=status.HTTP_404_NOT_FOUND)
                    branches = [branch]
            except Branch.DoesNotExist:
                return Response({'error': 'Branch not found'}, status=status.HTTP_404_NOT_FOUND)
        elif user.role in ['branch_admin', 'floor_manager'] and user.branch:
            branches = [user.branch]
        elif not user.is_superuser:
            # company_admin sees all branches for their company
            branches = Branch.objects.filter(company=company)
        else:
            # super_admin sees all
            branches = Branch.objects.all()

        if not branches and not user.is_superuser:
            return Response({'error': 'No authorized branches found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get query parameters
        period_type = request.query_params.get('period', 'monthly')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Parse dates
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Fetch performance data (mix of ORM TeamPerformance + synthetic FM-direct dicts)
        branch_performance_mixed = []
        for branch in branches:
            perf = PerformanceTrackingService.get_branch_performance(
                branch=branch,
                period_type=period_type,
                start_date=start_date,
                end_date=end_date
            )
            branch_performance_mixed.extend(perf)

        # Separate ORM objects from synthetic FM-direct dicts
        orm_objects = [p for p in branch_performance_mixed if not isinstance(p, dict)]
        synthetic_dicts = [p for p in branch_performance_mixed if isinstance(p, dict)]

        serialized = TeamPerformanceSerializer(orm_objects, many=True).data
        # Append synthetic FM-direct entries (already dict-shaped for JSON)
        all_results = list(serialized) + synthetic_dicts

        return Response(all_results)

    
    @action(detail=False, methods=['get'], url_path='branch-comparison')
    def branch_comparison(self, request):
        """
        Get branch performance comparison with previous period
        Returns both current and previous period data in one call for efficiency
        
        Query params:
        - period: daily/weekly/monthly/quarterly/yearly (default: monthly)
        - branch_id: Branch ID (optional for company_admin)
        """
        user = request.user
        
        # Permission check
        if user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get parameters
        period_type = request.query_params.get('period', 'monthly')
        branch_id = request.query_params.get('branch_id')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        # Calculate date ranges for current and previous periods
        today = timezone.now().date()
        
        if period_type == 'custom' and start_date_str and end_date_str:
            try:
                current_start = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                current_end = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                # Previous period of same duration
                duration = (current_end - current_start).days + 1
                previous_end = current_start - timedelta(days=1)
                previous_start = previous_end - timedelta(days=duration - 1)
            except (ValueError, TypeError):
                # Fallback to monthly if dates are invalid
                period_type = 'monthly'
                current_start = today.replace(day=1)
                if today.month == 12:
                    current_end = today.replace(day=31)
                else:
                    current_end = (today.replace(month=today.month + 1, day=1) - timedelta(days=1))
                previous_start = (current_start - timedelta(days=1)).replace(day=1)
                previous_end = current_start - timedelta(days=1)
        elif period_type == 'daily':
            current_start = today
            current_end = today
            previous_start = today - timedelta(days=1)
            previous_end = today - timedelta(days=1)
        elif period_type == 'weekly':
            # Current week (Monday to Sunday)
            current_start = today - timedelta(days=today.weekday())
            current_end = current_start + timedelta(days=6)
            # Previous week
            previous_start = current_start - timedelta(days=7)
            previous_end = previous_start + timedelta(days=6)
        elif period_type == 'monthly':
            # Current month
            current_start = today.replace(day=1)
            if today.month == 12:
                current_end = today.replace(day=31)
            else:
                current_end = (today.replace(month=today.month + 1, day=1) - timedelta(days=1))
            # Previous month
            if current_start.month == 1:
                previous_start = current_start.replace(year=current_start.year - 1, month=12, day=1)
            else:
                previous_start = current_start.replace(month=current_start.month - 1, day=1)
            previous_end = current_start - timedelta(days=1)
        elif period_type == 'quarterly':
            # Current quarter
            quarter = (today.month - 1) // 3
            current_start = today.replace(month=quarter * 3 + 1, day=1)
            if quarter == 3:
                current_end = today.replace(month=12, day=31)
            else:
                current_end = today.replace(month=(quarter + 1) * 3 + 1, day=1) - timedelta(days=1)
            # Previous quarter
            if quarter == 0:
                previous_start = current_start.replace(year=current_start.year - 1, month=10, day=1)
                previous_end = current_start.replace(year=current_start.year - 1, month=12, day=31)
            else:
                previous_start = current_start.replace(month=(quarter - 1) * 3 + 1, day=1)
                previous_end = current_start - timedelta(days=1)
        else:  # yearly
            current_start = today.replace(month=1, day=1)
            current_end = today.replace(month=12, day=31)
            previous_start = current_start.replace(year=current_start.year - 1)
            previous_end = current_end.replace(year=current_end.year - 1)
        
        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return Response({'error': 'Unauthorized context'}, status=status.HTTP_403_FORBIDDEN)

        # Get branches to query
        from branches.models import Branch
        
        if branch_id and branch_id != 'null':
            try:
                # Explicitly scope branch by company for security
                if user.is_superuser:
                    branches = [Branch.objects.get(id=branch_id)]
                else:
                    branch = Branch.objects.filter(id=branch_id, company=company).first()
                    if not branch:
                        return Response({'error': 'Branch not found or unauthorized'}, status=status.HTTP_404_NOT_FOUND)
                    branches = [branch]
            except Branch.DoesNotExist:
                return Response({'error': 'Branch not found'}, status=status.HTTP_404_NOT_FOUND)
        elif user.role in ['branch_admin', 'floor_manager'] and user.branch:
            branches = [user.branch]
        elif not user.is_superuser:
            # company_admin sees all branches for their company
            branches = Branch.objects.filter(company=company)
        else:
            # super_admin sees all
            branches = Branch.objects.all()
        
        # Fetch current period data
        current_mixed = []
        for branch in branches:
            perf = PerformanceTrackingService.get_branch_performance(
                branch=branch,
                period_type=period_type,
                start_date=current_start,
                end_date=current_end
            )
            current_mixed.extend(perf)

        # Fetch previous period data
        previous_mixed = []
        for branch in branches:
            perf = PerformanceTrackingService.get_branch_performance(
                branch=branch,
                period_type=period_type,
                start_date=previous_start,
                end_date=previous_end
            )
            previous_mixed.extend(perf)

        # Separate ORM objects from synthetic FM-direct dicts and serialize
        def _serialize_mixed(mixed_list):
            orm_objs = [p for p in mixed_list if not isinstance(p, dict)]
            synthetic = [p for p in mixed_list if isinstance(p, dict)]
            return list(TeamPerformanceSerializer(orm_objs, many=True).data) + synthetic

        return Response({
            'current': _serialize_mixed(current_mixed),
            'previous': _serialize_mixed(previous_mixed),
            'current_period': {
                'start_date': current_start.isoformat(),
                'end_date': current_end.isoformat(),
                'period_type': period_type
            },
            'previous_period': {
                'start_date': previous_start.isoformat(),
                'end_date': previous_end.isoformat(),
                'period_type': period_type
            }
        })

    
    @action(detail=False, methods=['get'])
    @action(detail=False, methods=['get'])
    def individual(self, request):
        """Get individual performance metrics."""
        user = request.user
        user_id = request.query_params.get('user_id', user.id)
        role = request.query_params.get('role', user.role)
        
        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return Response({'error': 'Unauthorized context'}, status=status.HTTP_403_FORBIDDEN)

        # Permission check
        if str(user_id) != str(user.id):
            if user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
            from users.models import User as UserModel
            try:
                if user.is_superuser:
                    target_user = UserModel.objects.get(id=user_id)
                else:
                    # Explicitly scope target user by company
                    target_user = UserModel.objects.filter(
                        Q(id=user_id) & (Q(company=company) | Q(branch__company=company))
                    ).first()
                    if not target_user:
                        return Response({'error': 'User not found or unauthorized'}, status=status.HTTP_404_NOT_FOUND)
                
                # Branch filtering for branch admins
                if user.role == 'branch_admin' and user.branch and target_user.branch != user.branch:
                    return Response({'error': 'Cannot access other branch data'}, status=status.HTTP_403_FORBIDDEN)
            except UserModel.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            target_user = user
        
        # Get query parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Parse dates
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Get individual performance
        performance_stats = PerformanceTrackingService.get_individual_performance(
            user=target_user,
            role=role,
            start_date=start_date,
            end_date=end_date
        )
        
        if not performance_stats:
            return Response({'error': 'Invalid role or no data found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Add user info
        performance_stats['user_id'] = target_user.id
        performance_stats['user_name'] = target_user.name
        performance_stats['user_role'] = role
        
        serializer = PerformanceSummarySerializer(performance_stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """Get leaderboard rankings."""
        user = request.user
        
        # Determine company context (Mandatory for non-superusers)
        company_obj = None
        if not user.is_superuser:
            company_obj = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company_obj:
                return Response({'error': 'Unauthorized context'}, status=status.HTTP_403_FORBIDDEN)

        # Permission check
        if user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters
        branch_id = request.query_params.get('branch_id')
        period_type = request.query_params.get('period', 'monthly')
        metric = request.query_params.get('metric', 'total_job_value')
        limit = int(request.query_params.get('limit', 10))
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Parse dates
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid start_date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid end_date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Resolve branch/company for filtering
        branch = None
        
        if branch_id and branch_id != 'null':
            from branches.models import Branch
            try:
                # Explicitly scope branch by company
                if user.is_superuser:
                    branch = Branch.objects.get(id=branch_id)
                else:
                    branch = Branch.objects.filter(id=branch_id, company=company_obj).first()
                    if not branch:
                        return Response({'error': 'Branch not found or unauthorized'}, status=status.HTTP_404_NOT_FOUND)
                
                # Branch filtering for branch admins
                if user.role == 'branch_admin' and user.branch and branch != user.branch:
                    return Response({'error': 'Cannot access other branch data'}, status=status.HTTP_403_FORBIDDEN)
            except Branch.DoesNotExist:
                return Response({'error': 'Branch not found'}, status=status.HTTP_404_NOT_FOUND)
        elif user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            branch = user.branch

        leaderboard = PerformanceTrackingService.get_leaderboard(
            branch=branch,
            company=company_obj if not branch else None, # Use company if no specific branch requested
            period_type=period_type,
            metric=metric,
            limit=limit,
            start_date=start_date,
            end_date=end_date
        )
        
        # Add rank
        leaderboard_data = []
        for rank, team_perf in enumerate(leaderboard, start=1):
            data = TeamPerformanceSerializer(team_perf).data
            data['rank'] = rank
            leaderboard_data.append(data)
        
        return Response(leaderboard_data)
    
    @action(detail=True, methods=['get'], url_path='job-details')
    def job_details(self, request, pk=None):
        """
        Get detailed performance breakdown for a specific job
        
        URL: /api/jobcards/performance/{jobcard_id}/job_details/
        """
        user = request.user
        
        try:
            performance = PerformanceMetrics.objects.get(jobcard_id=pk)
        except PerformanceMetrics.DoesNotExist:
            return Response(
                {'error': 'Performance metrics not found for this job'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Permission check
        if user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']:
            # Supervisors and applicators can only see their own jobs
            if user.role == 'supervisor' and performance.supervisor != user:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
            elif user.role == 'applicator' and user not in performance.applicators.all():
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # If company_admin or branch_admin, verify context
        if user.role == 'company_admin' and performance.branch.company != user.company:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'branch_admin' and user.branch and performance.branch != user.branch:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = PerformanceMetricsSerializer(performance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='calculate-potential-reward')
    def calculate_potential_reward(self, request):
        """
        Calculate potential reward for given parameters
        
        Body:
        {
            "job_value": 12000,
            "time_saved_minutes": 30,
            "branch_id": 1  // optional
        }
        """
        user = request.user
        
        # Permission check
        if user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor']:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate input
        input_serializer = PotentialRewardCalculationSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        job_value = input_serializer.validated_data['job_value']
        time_saved_minutes = input_serializer.validated_data.get('time_saved_minutes', 0)
        branch_id = input_serializer.validated_data.get('branch_id')
        
        # Get reward settings
        branch = None
        if branch_id:
            from branches.models import Branch
            branch = Branch.objects.get(id=branch_id)
        elif user.branch:
            branch = user.branch
        
        settings = RewardCalculationService.get_active_settings(branch=branch)
        if not settings:
            return Response(
                {'error': 'No active reward settings found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if percentage-based rewards are enabled
        if not hasattr(settings, 'use_percentage_based_rewards') or not settings.use_percentage_based_rewards:
            return Response(
                {'error': 'Percentage-based rewards are not enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine tier
        tier = None
        base_percentage = Decimal('0')
        
        if job_value >= settings.tier_4_job_value_min:
            tier = 'tier_4'
            base_percentage = settings.tier_4_reward_percentage
        elif job_value >= settings.tier_3_job_value_min:
            tier = 'tier_3'
            base_percentage = settings.tier_3_reward_percentage
        elif job_value >= settings.tier_2_job_value_min:
            tier = 'tier_2'
            base_percentage = settings.tier_2_reward_percentage
        elif job_value >= settings.tier_1_job_value_min:
            tier = 'tier_1'
            base_percentage = settings.tier_1_reward_percentage
        else:
            return Response({
                'job_value': float(job_value),
                'tier': None,
                'base_percentage': None,
                'base_reward': 0,
                'time_saved_minutes': time_saved_minutes,
                'time_bonus_percentage': 0,
                'time_bonus_amount': 0,
                'total_reward': 0,
                'supervisor_share': 0,
                'applicator_pool': 0,
                'calculation_notes': f'Job value ₹{job_value} is below minimum tier (₹{settings.tier_1_job_value_min})'
            })
        
        # Calculate base reward
        base_reward = (job_value * base_percentage) / Decimal('100')
        
        # Calculate time bonus
        time_bonus_percentage = Decimal('0')
        time_bonus_amount = Decimal('0')
        
        if settings.apply_time_bonus and time_saved_minutes > 0:
            bonus_intervals = time_saved_minutes // settings.time_bonus_interval_minutes
            if bonus_intervals > 0:
                time_bonus_percentage = settings.time_bonus_percentage * Decimal(bonus_intervals)
                time_bonus_amount = (job_value * time_bonus_percentage) / Decimal('100')
        
        total_reward = base_reward + time_bonus_amount
        
        # Calculate distribution
        applicator_share_pct = settings.applicator_share_percentage / Decimal('100')
        supervisor_share = total_reward * (Decimal('1') - applicator_share_pct)
        applicator_pool = total_reward * applicator_share_pct
        
        # Build calculation notes
        notes = f"{tier.upper()}: ₹{job_value} × {base_percentage}% = ₹{base_reward}"
        if time_bonus_amount > 0:
            notes += f" + Time Bonus ({time_saved_minutes}min): ₹{time_bonus_amount}"
        notes += f" = Total: ₹{total_reward}"
        
        response_data = {
            'job_value': float(job_value),
            'tier': tier,
            'base_percentage': float(base_percentage),
            'base_reward': float(base_reward),
            'time_saved_minutes': time_saved_minutes,
            'time_bonus_percentage': float(time_bonus_percentage),
            'time_bonus_amount': float(time_bonus_amount),
            'total_reward': float(total_reward),
            'supervisor_share': float(supervisor_share),
            'applicator_pool': float(applicator_pool),
            'calculation_notes': notes
        }
        
        serializer = PotentialRewardResponseSerializer(response_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='job-details-list')
    def job_details_list(self, request):
        """Get detailed job-level performance records with filtering and pagination.

        Query params:
        - branch_id, supervisor_id, floor_manager_id, applicator_id  (FK filters)
        - start_date, end_date  (YYYY-MM-DD — filters on job_completed_at)
        - status         : all | on_time | delayed
        - payment_status : all | paid | unpaid
        - ordering       : see ALLOWED_ORDERINGS below
        - page, page_size
        """
        user = request.user

        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return Response({'error': 'Unauthorized context'}, status=status.HTTP_403_FORBIDDEN)

        # Permission check
        if user.role not in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        # Base queryset — use direct company FK for fast lookup
        if user.is_superuser:
            queryset = PerformanceMetrics.objects.all()
        else:
            queryset = PerformanceMetrics.objects.filter(company=company)

        queryset = queryset.select_related(
            'branch', 'floor_manager', 'supervisor', 'jobcard'
        ).prefetch_related('applicators')

        # Role-based additional filtering
        if user.role in ['branch_admin', 'floor_manager'] and user.branch:
            queryset = queryset.filter(branch=user.branch)
        elif user.role == 'supervisor':
            queryset = queryset.filter(supervisor=user)

        # ── FK filters ────────────────────────────────────────────────
        branch_id = request.query_params.get('branch_id')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        supervisor_id = request.query_params.get('supervisor_id')
        if supervisor_id:
            queryset = queryset.filter(supervisor_id=supervisor_id)

        floor_manager_id = request.query_params.get('floor_manager_id')
        if floor_manager_id:
            queryset = queryset.filter(floor_manager_id=floor_manager_id)

        applicator_id = request.query_params.get('applicator_id')
        if applicator_id:
            queryset = queryset.filter(applicators__id=applicator_id)

        # ── Date range filter ─────────────────────────────────────────
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(job_completed_at__date__gte=start_date_obj)
            except ValueError:
                return Response(
                    {'error': 'Invalid start_date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(job_completed_at__date__lte=end_date_obj)
            except ValueError:
                return Response(
                    {'error': 'Invalid end_date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # ── Completion status filter ───────────────────────────────────
        status_filter = request.query_params.get('status', 'all')
        if status_filter == 'on_time':
            queryset = queryset.filter(completed_on_time=True)
        elif status_filter == 'delayed':
            queryset = queryset.filter(completed_on_time=False)

        # ── Payment status filter ──────────────────────────────────────
        payment_status_filter = request.query_params.get('payment_status', 'all')
        if payment_status_filter == 'paid':
            queryset = queryset.filter(is_paid=True)
        elif payment_status_filter == 'unpaid':
            queryset = queryset.filter(is_paid=False)

        # ── Summary aggregates (calculated BEFORE pagination) ─────────
        agg = queryset.aggregate(
            total_jobs=Count('id'),
            paid_jobs=Count('id', filter=Q(is_paid=True)),
            total_revenue=Sum('total_with_gst'),
            paid_revenue=Sum('total_with_gst', filter=Q(is_paid=True)),
            unpaid_revenue=Sum('total_with_gst', filter=Q(is_paid=False)),
            total_rewards=Sum('reward_amount'),
        )

        summary = {
            'total_jobs':      agg['total_jobs'] or 0,
            'paid_jobs':       agg['paid_jobs'] or 0,
            'unpaid_jobs':     (agg['total_jobs'] or 0) - (agg['paid_jobs'] or 0),
            'total_revenue':   float(agg['total_revenue'] or 0),
            'paid_revenue':    float(agg['paid_revenue'] or 0),
            'unpaid_revenue':  float(agg['unpaid_revenue'] or 0),
            'total_rewards':   float(agg['total_rewards'] or 0),
        }

        # ── Ordering ─────────────────────────────────────────────────
        ordering = request.query_params.get('ordering', '-job_completed_at')
        ALLOWED_ORDERINGS = [
            'job_completed_at', '-job_completed_at',
            'time_difference_minutes', '-time_difference_minutes',
            'reward_amount', '-reward_amount',
            'job_value', '-job_value',
            'total_with_gst', '-total_with_gst',
            'paid_at', '-paid_at',
        ]
        if ordering in ALLOWED_ORDERINGS:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-job_completed_at')

        # ── Pagination ───────────────────────────────────────────────
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 20)), 100)

        total_count = queryset.count()
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        results = queryset[start_index:end_index]

        # Serialize
        serializer = JobPerformanceDetailSerializer(results, many=True)

        return Response({
            'count':       total_count,
            'page':        page,
            'page_size':   page_size,
            'total_pages': (total_count + page_size - 1) // page_size if page_size else 1,
            'next':        page < ((total_count + page_size - 1) // page_size),
            'previous':    page > 1,
            'summary':     summary,
            'results':     serializer.data,
        })

    # ------------------------------------------------------------------
    # Floor Manager tracking endpoints
    # ------------------------------------------------------------------

    @action(detail=False, methods=['get'], url_path='floor-manager-summary')
    def floor_manager_summary(self, request):
        """
        Get performance summary for a specific floor manager.

        Query params:
        - floor_manager_id : int (required unless the caller IS a floor_manager)
        - period           : daily | weekly | monthly | quarterly | yearly (default: monthly)
        - start_date       : YYYY-MM-DD (optional)
        - end_date         : YYYY-MM-DD (optional)
        """
        user = request.user

        # Determine company context
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return Response({'error': 'Unauthorized context'}, status=status.HTTP_403_FORBIDDEN)

        # Permission check — same set that can view team-summary
        allowed_roles = ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']
        if user.role not in allowed_roles and not user.is_superuser:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        # Resolve the floor_manager_id
        fm_id = request.query_params.get('floor_manager_id')
        if not fm_id:
            if user.role == 'floor_manager':
                fm_id = user.id
            else:
                return Response(
                    {'error': 'floor_manager_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        from users.models import User as UserModel
        try:
            if user.is_superuser:
                floor_manager = UserModel.objects.get(id=fm_id)
            else:
                floor_manager = UserModel.objects.filter(
                    Q(id=fm_id) & (Q(company=company) | Q(branch__company=company))
                ).first()
                if not floor_manager:
                    return Response(
                        {'error': 'Floor manager not found or unauthorized'},
                        status=status.HTTP_404_NOT_FOUND
                    )
        except UserModel.DoesNotExist:
            return Response({'error': 'Floor manager not found'}, status=status.HTTP_404_NOT_FOUND)

        # branch_admin can only see their own branch
        if user.role == 'branch_admin' and user.branch:
            if floor_manager.branch != user.branch:
                return Response({'error': 'Cannot access other branch data'}, status=status.HTTP_403_FORBIDDEN)

        # Parse query params
        period_type = request.query_params.get('period', 'monthly')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid start_date'}, status=status.HTTP_400_BAD_REQUEST)
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid end_date'}, status=status.HTTP_400_BAD_REQUEST)

        fm_performance = PerformanceTrackingService.get_floor_manager_performance(
            floor_manager=floor_manager,
            period_type=period_type,
            start_date=start_date,
            end_date=end_date
        )

        serializer = FloorManagerPerformanceSerializer(fm_performance, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='floor-manager-leaderboard')
    def floor_manager_leaderboard(self, request):
        """
        Get leaderboard rankings for floor managers.

        Query params:
        - branch_id : int (optional)
        - period    : daily | weekly | monthly | quarterly | yearly (default: monthly)
        - metric    : total_job_value | paid_job_value | total_jobs_completed |
                      total_rewards_earned | efficiency_percentage  (default: total_job_value)
        - limit     : int (default: 10)
        """
        user = request.user

        # Determine company context
        company_obj = None
        if not user.is_superuser:
            company_obj = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company_obj:
                return Response({'error': 'Unauthorized context'}, status=status.HTTP_403_FORBIDDEN)

        # Permission check
        allowed_roles = ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor']
        if user.role not in allowed_roles and not user.is_superuser:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        # Parse params
        branch_id = request.query_params.get('branch_id')
        period_type = request.query_params.get('period', 'monthly')
        metric = request.query_params.get('metric', 'total_job_value')
        limit = int(request.query_params.get('limit', 10))
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Parse dates
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid start_date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid end_date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        branch = None
        if branch_id and branch_id != 'null':
            from branches.models import Branch
            try:
                if user.is_superuser:
                    branch = Branch.objects.get(id=branch_id)
                else:
                    branch = Branch.objects.filter(id=branch_id, company=company_obj).first()
                    if not branch:
                        return Response(
                            {'error': 'Branch not found or unauthorized'},
                            status=status.HTTP_404_NOT_FOUND
                        )
                if user.role == 'branch_admin' and user.branch and branch != user.branch:
                    return Response(
                        {'error': 'Cannot access other branch data'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Exception:
                return Response({'error': 'Branch not found'}, status=status.HTTP_404_NOT_FOUND)
        elif user.role in ['branch_admin', 'floor_manager', 'supervisor'] and user.branch:
            branch = user.branch

        leaderboard = PerformanceTrackingService.get_floor_manager_leaderboard(
            branch=branch,
            company=company_obj if not branch else None,
            period_type=period_type,
            metric=metric,
            limit=limit,
            start_date=start_date,
            end_date=end_date
        )

        leaderboard_data = []
        for rank, fm_perf in enumerate(leaderboard, start=1):
            data = FloorManagerPerformanceSerializer(fm_perf).data
            data['rank'] = rank
            leaderboard_data.append(data)

        return Response(leaderboard_data)
