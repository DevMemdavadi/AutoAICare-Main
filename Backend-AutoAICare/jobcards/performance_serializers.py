from rest_framework import serializers
from .performance_models import PerformanceMetrics, TeamPerformance, FloorManagerPerformance
from users.serializers import UserSerializer
from decimal import Decimal


class UserBasicSerializer(serializers.Serializer):
    """Basic user information serializer"""
    id = serializers.IntegerField()
    name = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()


class PerformanceMetricsSerializer(serializers.ModelSerializer):
    """Serializer for individual job performance metrics"""
    
    company_name = serializers.CharField(source='company.name', read_only=True, allow_null=True)
    floor_manager_name = serializers.CharField(source='floor_manager.name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.name', read_only=True)
    applicator_names = serializers.SerializerMethodField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    time_saved_display = serializers.ReadOnlyField()
    efficiency_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = PerformanceMetrics
        fields = [
            'id', 'jobcard',
            'company', 'company_name',
            'branch', 'branch_name',
            'floor_manager', 'floor_manager_name',
            'supervisor', 'supervisor_name',
            'applicator_names',
            'scheduled_duration_minutes', 'actual_duration_minutes',
            'time_difference_minutes', 'time_saved_display',
            'job_value', 'package_value', 'addons_value', 'parts_value',
            'gst_amount', 'total_with_gst',
            'completed_on_time', 'quality_score', 'customer_satisfaction',
            'reward_amount', 'reward_percentage',
            'efficiency_percentage',
            'is_paid', 'paid_at',
            'job_started_at', 'job_completed_at', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_applicator_names(self, obj):
        """Get list of applicator names"""
        return [applicator.name for applicator in obj.applicators.all()]


class TeamPerformanceSerializer(serializers.ModelSerializer):
    """Serializer for team performance aggregates"""
    
    company_name = serializers.CharField(source='company.name', read_only=True, allow_null=True)
    supervisor_name = serializers.CharField(source='supervisor.name', read_only=True)
    floor_manager_name = serializers.CharField(source='floor_manager.name', read_only=True, allow_null=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    working_per_day = serializers.ReadOnlyField()
    on_time_percentage = serializers.ReadOnlyField()
    net_time_performance = serializers.ReadOnlyField()
    
    team_members = serializers.SerializerMethodField()
    
    class Meta:
        model = TeamPerformance
        fields = [
            'id',
            'company', 'company_name',
            'branch', 'branch_name',
            'supervisor', 'supervisor_name',
            'floor_manager', 'floor_manager_name',
            'period_type', 'period_start', 'period_end',
            'total_jobs_completed', 'jobs_on_time', 'jobs_delayed',
            'total_time_saved', 'total_time_delayed',
            'average_completion_time', 'net_time_performance',
            'total_job_value', 'paid_job_value', 'total_rewards_earned', 'average_reward_per_job',
            'team_members', 'team_size',
            'efficiency_percentage', 'on_time_percentage', 'working_per_day',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_team_members(self, obj):
        """Get detailed team member information instead of just IDs"""
        if not obj.team_members:
            return []
        
        from users.models import User
        # Fetch users for the IDs stored in the team_members list
        users = User.objects.filter(id__in=obj.team_members)
        return UserBasicSerializer(users, many=True).data


class FloorManagerPerformanceSerializer(serializers.ModelSerializer):
    """Serializer for floor-manager-level performance aggregates"""

    company_name = serializers.CharField(source='company.name', read_only=True, allow_null=True)
    floor_manager_name = serializers.CharField(source='floor_manager.name', read_only=True)
    floor_manager_email = serializers.CharField(source='floor_manager.email', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    on_time_percentage = serializers.ReadOnlyField()
    net_time_performance = serializers.ReadOnlyField()

    supervised_teams = serializers.SerializerMethodField()

    class Meta:
        model = FloorManagerPerformance
        fields = [
            'id',
            'company', 'company_name',
            'branch', 'branch_name',
            'floor_manager', 'floor_manager_name', 'floor_manager_email',
            'period_type', 'period_start', 'period_end',
            'total_jobs_completed', 'jobs_on_time', 'jobs_delayed',
            'total_time_saved', 'total_time_delayed',
            'average_completion_time', 'net_time_performance',
            'total_job_value', 'paid_job_value',
            'total_rewards_earned', 'average_reward_per_job',
            'supervised_teams', 'supervised_teams_count',
            'efficiency_percentage', 'on_time_percentage',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_supervised_teams(self, obj):
        """Get basic info for supervisors under this floor manager."""
        if not obj.supervised_team_ids:
            return []
        from users.models import User
        users = User.objects.filter(id__in=obj.supervised_team_ids)
        return UserBasicSerializer(users, many=True).data



class PerformanceSummarySerializer(serializers.Serializer):
    """Serializer for performance summary with calculated fields"""
    
    total_jobs = serializers.IntegerField()
    jobs_on_time = serializers.IntegerField()
    jobs_delayed = serializers.IntegerField()
    on_time_percentage = serializers.FloatField()
    
    total_time_saved = serializers.IntegerField()
    total_time_delayed = serializers.IntegerField()
    net_time_performance = serializers.IntegerField()
    
    total_job_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_rewards = serializers.DecimalField(max_digits=10, decimal_places=2)
    avg_completion_time = serializers.FloatField()
    
    # Optional user info
    user_id = serializers.IntegerField(required=False)
    user_name = serializers.CharField(required=False)
    user_role = serializers.CharField(required=False)


class LeaderboardSerializer(serializers.Serializer):
    """Serializer for leaderboard rankings"""
    
    rank = serializers.IntegerField()
    supervisor_id = serializers.IntegerField(source='supervisor.id')
    supervisor_name = serializers.CharField(source='supervisor.name')
    branch_name = serializers.CharField(source='branch.name')
    
    total_jobs_completed = serializers.IntegerField()
    total_job_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_job_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_rewards_earned = serializers.DecimalField(max_digits=10, decimal_places=2)
    efficiency_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    on_time_percentage = serializers.SerializerMethodField()
    
    team_size = serializers.IntegerField()
    period_type = serializers.CharField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    
    def get_on_time_percentage(self, obj):
        """Calculate on-time percentage"""
        if obj.total_jobs_completed == 0:
            return 0
        return (obj.jobs_on_time / obj.total_jobs_completed) * 100


class PotentialRewardCalculationSerializer(serializers.Serializer):
    """Serializer for potential reward calculation request"""
    
    job_value = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    time_saved_minutes = serializers.IntegerField(required=False, default=0)
    branch_id = serializers.IntegerField(required=False, allow_null=True)
    
    
class PotentialRewardResponseSerializer(serializers.Serializer):
    """Serializer for potential reward calculation response"""
    
    job_value = serializers.DecimalField(max_digits=10, decimal_places=2)
    tier = serializers.CharField(allow_null=True)
    base_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    base_reward = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    time_saved_minutes = serializers.IntegerField()
    time_bonus_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    time_bonus_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    total_reward = serializers.DecimalField(max_digits=10, decimal_places=2)
    supervisor_share = serializers.DecimalField(max_digits=10, decimal_places=2)
    applicator_pool = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    calculation_notes = serializers.CharField()


class JobPerformanceDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for individual job performance with team breakdown"""
    
    floor_manager = serializers.SerializerMethodField()
    supervisor = serializers.SerializerMethodField()
    applicators = serializers.SerializerMethodField()
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    jobcard_id = serializers.IntegerField(source='jobcard.id', read_only=True, allow_null=True)
    
    # Calculated fields
    supervisor_share = serializers.SerializerMethodField()
    applicator_pool = serializers.SerializerMethodField()
    time_status = serializers.SerializerMethodField()
    reward_tier = serializers.SerializerMethodField()
    
    class Meta:
        model = PerformanceMetrics
        fields = [
            'id', 'jobcard_id', 'branch_name',
            'floor_manager', 'supervisor', 'applicators',
            'job_started_at', 'job_completed_at',
            'scheduled_duration_minutes', 'actual_duration_minutes',
            'time_difference_minutes', 'completed_on_time', 'time_status',
            'job_value', 'package_value', 'addons_value', 'parts_value',
            'gst_amount', 'total_with_gst',
            'reward_amount', 'reward_percentage', 'reward_tier',
            'supervisor_share', 'applicator_pool',
            'quality_score', 'customer_satisfaction',
            'is_paid', 'paid_at',
        ]
    
    def get_floor_manager(self, obj):
        """Get floor manager basic info"""
        if obj.floor_manager:
            return {
                'id': obj.floor_manager.id,
                'name': obj.floor_manager.name,
                'email': obj.floor_manager.email,
                'role': obj.floor_manager.role
            }
        return None
    
    def get_supervisor(self, obj):
        """Get supervisor basic info"""
        if obj.supervisor:
            return {
                'id': obj.supervisor.id,
                'name': obj.supervisor.name,
                'email': obj.supervisor.email,
                'role': obj.supervisor.role
            }
        return None
    
    def get_applicators(self, obj):
        """Get list of applicators with basic info"""
        return [
            {
                'id': applicator.id,
                'name': applicator.name,
                'email': applicator.email,
                'role': applicator.role
            }
            for applicator in obj.applicators.all()
        ]
    
    def get_supervisor_share(self, obj):
        """Calculate supervisor's share of reward (50%)"""
        if obj.reward_amount:
            return float(obj.reward_amount * Decimal('0.5'))
        return 0.0
    
    def get_applicator_pool(self, obj):
        """Calculate applicator pool (50%)"""
        if obj.reward_amount:
            return float(obj.reward_amount * Decimal('0.5'))
        return 0.0
    
    def get_time_status(self, obj):
        """Get human-readable time status"""
        if obj.time_difference_minutes > 0:
            return 'early'
        elif obj.time_difference_minutes < 0:
            return 'delayed'
        return 'on_time'
    
    def get_reward_tier(self, obj):
        """Get reward tier based on job value"""
        if not obj.reward_percentage:
            return None
        
        # Determine tier based on reward percentage
        # This is a simplified version - actual tier should come from reward settings
        percentage = float(obj.reward_percentage)
        if percentage >= 2.0:
            return 'tier_4'
        elif percentage >= 1.8:
            return 'tier_3'
        elif percentage >= 1.5:
            return 'tier_2'
        elif percentage >= 1.0:
            return 'tier_1'
        return None
