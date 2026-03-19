from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal



class PerformanceMetrics(models.Model):
    """Detailed performance tracking for job cards"""
    
    jobcard = models.OneToOneField(
        'JobCard',
        on_delete=models.CASCADE,
        related_name='performance',
        null=True,  # Allow null for testing/mock data
        blank=True
    )
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='job_performances',
        null=True,
        blank=True
    )
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        related_name='job_performances'
    )
    
    # Team members involved
    floor_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fm_performance',
        limit_choices_to={'role': 'floor_manager'}
    )
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervisor_performance',
        limit_choices_to={'role': 'supervisor'}
    )
    applicators = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='applicator_performance',
        limit_choices_to={'role': 'applicator'}
    )
    
    # Time tracking
    scheduled_duration_minutes = models.IntegerField(
        help_text='Scheduled/allowed duration for the job'
    )
    actual_duration_minutes = models.IntegerField(
        help_text='Actual time taken to complete the job'
    )
    time_difference_minutes = models.IntegerField(
        help_text='Positive = saved time, Negative = delayed'
    )
    
    # Financial metrics
    job_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Total job value (package + add-ons + parts)'
    )
    package_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Base package value'
    )
    addons_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Total add-ons value'
    )
    parts_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Total parts value'
    )
    gst_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='GST amount charged to customer'
    )
    total_with_gst = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Total amount customer paid (including GST)'
    )
    
    # Performance indicators
    completed_on_time = models.BooleanField(
        default=True,
        help_text='Whether job was completed within scheduled time'
    )
    quality_score = models.IntegerField(
        null=True,
        blank=True,
        help_text='Quality score from QC (1-10 scale)'
    )
    customer_satisfaction = models.IntegerField(
        null=True,
        blank=True,
        help_text='Customer satisfaction rating (1-10 scale)'
    )
    
    # Reward tracking
    reward_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Total reward amount for this job'
    )
    reward_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Reward percentage applied (if percentage-based)'
    )

    # Payment tracking — updated when invoice is fully paid
    is_paid = models.BooleanField(
        default=False,
        help_text='True once the linked invoice has been fully paid'
    )
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when the invoice was marked as fully paid'
    )

    # Timestamps
    job_started_at = models.DateTimeField()
    job_completed_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'jobcard_performance_metrics'  # Renamed to avoid conflict with accounting.PerformanceMetrics
        verbose_name = 'Job Card Performance Metric'
        verbose_name_plural = 'Job Card Performance Metrics'
        ordering = ['-job_completed_at']
        indexes = [
            models.Index(fields=['company', 'job_completed_at']),
            models.Index(fields=['branch', 'job_completed_at']),
            models.Index(fields=['supervisor', 'job_completed_at']),
            models.Index(fields=['floor_manager', 'job_completed_at']),
            models.Index(fields=['completed_on_time']),
        ]
    
    def __str__(self):
        return f"Performance - JobCard #{self.jobcard} - {self.time_difference_minutes}min"
    
    @property
    def time_saved_display(self):
        """Human-readable time saved/delayed"""
        if self.time_difference_minutes > 0:
            return f"{self.time_difference_minutes} minutes saved"
        elif self.time_difference_minutes < 0:
            return f"{abs(self.time_difference_minutes)} minutes delayed"
        else:
            return "On time"
    
    @property
    def efficiency_percentage(self):
        """Calculate efficiency as percentage"""
        if self.scheduled_duration_minutes == 0:
            return 0
        return (self.scheduled_duration_minutes / self.actual_duration_minutes) * 100


class TeamPerformance(models.Model):
    """Aggregated performance metrics for teams"""
    
    PERIOD_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]
    
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        related_name='team_performances'
    )
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='team_performances',
        null=True,
        blank=True
    )
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='team_stats',
        limit_choices_to={'role': 'supervisor'}
    )
    floor_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_team_stats',
        limit_choices_to={'role': 'floor_manager'}
    )
    
    period_type = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Job statistics
    total_jobs_completed = models.IntegerField(
        default=0,
        help_text='Total number of jobs completed in this period'
    )
    jobs_on_time = models.IntegerField(
        default=0,
        help_text='Jobs completed on or before scheduled time'
    )
    jobs_delayed = models.IntegerField(
        default=0,
        help_text='Jobs completed after scheduled time'
    )
    
    # Time statistics (in minutes)
    total_time_saved = models.IntegerField(
        default=0,
        help_text='Total minutes saved across all jobs'
    )
    total_time_delayed = models.IntegerField(
        default=0,
        help_text='Total minutes delayed across all jobs'
    )
    average_completion_time = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Average job completion time in minutes'
    )
    
    # Financial statistics
    total_job_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Total value of all jobs completed (estimated, includes unpaid)'
    )
    paid_job_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Total value of fully-paid jobs only (confirmed revenue)'
    )
    total_rewards_earned = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Total rewards earned by the team'
    )
    average_reward_per_job = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Average reward per job'
    )
    
    # Team composition
    team_members = models.JSONField(
        default=list,
        help_text='List of applicator user IDs in the team'
    )
    team_size = models.IntegerField(
        default=0,
        help_text='Number of team members'
    )
    
    # Performance metrics
    efficiency_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Overall team efficiency percentage'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'jobcard_team_performance'  # Renamed for clarity and consistency
        verbose_name = 'Team Performance'
        verbose_name_plural = 'Team Performances'
        ordering = ['-period_start', '-total_job_value']
        unique_together = [['supervisor', 'period_type', 'period_start', 'period_end']]
        indexes = [
            models.Index(fields=['company', 'period_type', 'period_start']),
            models.Index(fields=['branch', 'period_type', 'period_start']),
            models.Index(fields=['supervisor', 'period_start']),
            models.Index(fields=['period_type', 'period_start']),
        ]
    
    def __str__(self):
        return f"{self.supervisor.name} Team - {self.period_type} ({self.period_start})"
    
    @property
    def working_per_day(self):
        """Calculate average job value per day"""
        if self.period_type == 'daily':
            return float(self.total_job_value)
        
        days = (self.period_end - self.period_start).days + 1
        if days == 0:
            return 0
        return float(self.total_job_value) / days
    
    @property
    def on_time_percentage(self):
        """Percentage of jobs completed on time"""
        if self.total_jobs_completed == 0:
            return 0
        return (self.jobs_on_time / self.total_jobs_completed) * 100
    
    @property
    def net_time_performance(self):
        """Net time saved (positive) or delayed (negative)"""
        return self.total_time_saved - self.total_time_delayed


class FloorManagerPerformance(models.Model):
    """Aggregated performance metrics at the floor-manager level"""

    PERIOD_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        related_name='fm_performances'
    )
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='fm_performances',
        null=True,
        blank=True
    )
    floor_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='fm_perf_stats',
        limit_choices_to={'role': 'floor_manager'}
    )

    period_type = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    period_start = models.DateField()
    period_end = models.DateField()

    # Job statistics
    total_jobs_completed = models.IntegerField(
        default=0,
        help_text='Total jobs completed under this floor manager'
    )
    jobs_on_time = models.IntegerField(
        default=0,
        help_text='Jobs completed on or before scheduled time'
    )
    jobs_delayed = models.IntegerField(
        default=0,
        help_text='Jobs completed after scheduled time'
    )

    # Time statistics (in minutes)
    total_time_saved = models.IntegerField(default=0)
    total_time_delayed = models.IntegerField(default=0)
    average_completion_time = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )

    # Financial statistics
    total_job_value = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text='Total value of all jobs (estimated, includes unpaid)'
    )
    paid_job_value = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text='Total value of fully-paid jobs (confirmed revenue)'
    )
    total_rewards_earned = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    average_reward_per_job = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )

    # Team composition under this FM
    supervised_team_ids = models.JSONField(
        default=list,
        help_text='List of supervisor user IDs managed by this floor manager'
    )
    supervised_teams_count = models.IntegerField(
        default=0,
        help_text='Number of supervisor teams under this FM'
    )

    # Performance metrics
    efficiency_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text='Overall floor-manager efficiency percentage'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'jobcard_floor_manager_performance'
        verbose_name = 'Floor Manager Performance'
        verbose_name_plural = 'Floor Manager Performances'
        ordering = ['-period_start', '-total_job_value']
        unique_together = [['floor_manager', 'period_type', 'period_start', 'period_end']]
        indexes = [
            models.Index(fields=['company', 'period_type', 'period_start']),
            models.Index(fields=['branch', 'period_type', 'period_start']),
            models.Index(fields=['floor_manager', 'period_start']),
            models.Index(fields=['period_type', 'period_start']),
        ]

    def __str__(self):
        return f"{self.floor_manager.name} (FM) — {self.period_type} ({self.period_start})"

    @property
    def on_time_percentage(self):
        if self.total_jobs_completed == 0:
            return 0
        return (self.jobs_on_time / self.total_jobs_completed) * 100

    @property
    def net_time_performance(self):
        return self.total_time_saved - self.total_time_delayed
