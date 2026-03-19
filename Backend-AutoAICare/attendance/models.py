from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal
from companies.managers import CompanyManager


class AttendanceRecord(models.Model):
    """Daily attendance records for employees"""
    
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('half_day', 'Half Day'),
        ('on_leave', 'On Leave'),
        ('holiday', 'Holiday'),
        ('week_off', 'Week Off'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='attendance_records',
        null=True,
        blank=True
    )
    
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='attendance_records'
    )
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    
    # Time tracking
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    total_hours = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0,
        help_text="Total working hours"
    )
    
    # Overtime
    overtime_hours = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0,
        help_text="Overtime hours worked"
    )
    
    # Branch tracking
    branch = models.ForeignKey(
        'branches.Branch', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='attendance_records'
    )
    
    # Leave reference (if on leave)
    leave_request = models.ForeignKey(
        'accounting.LeaveRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_records'
    )
    
    # Notes
    notes = models.TextField(blank=True, null=True, help_text="Reason for absence, late arrival, etc.")
    
    # Tracking
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='marked_attendance'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'attendance_records'
        unique_together = ['employee', 'date']
        ordering = ['-date', 'employee']
        indexes = [
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['branch', 'date']),
            models.Index(fields=['status', 'date']),
        ]
    
    def __str__(self):
        return f"{self.employee.name} - {self.date} - {self.status}"
    
    def clean(self):
        """Validate attendance record"""
        # If status is on_leave, leave_request should be provided
        if self.status == 'on_leave' and not self.leave_request:
            raise ValidationError("Leave request is required when status is 'On Leave'")
        
        # If check_in and check_out are provided, calculate total hours
        if self.check_in_time and self.check_out_time:
            from datetime import datetime, timedelta
            check_in = datetime.combine(self.date, self.check_in_time)
            check_out = datetime.combine(self.date, self.check_out_time)
            
            # Handle overnight shifts
            if check_out < check_in:
                check_out += timedelta(days=1)
            
            duration = check_out - check_in
            self.total_hours = Decimal(str(duration.total_seconds() / 3600))
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class AttendancePolicy(models.Model):
    """Attendance policies for different roles/branches"""
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='attendance_policies',
        null=True,
        blank=True
    )
    
    name = models.CharField(max_length=200, help_text="Policy name")
    
    # Working hours
    standard_working_hours = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=8,
        help_text="Standard working hours per day"
    )
    
    # Grace period for late arrival (in minutes)
    late_arrival_grace_minutes = models.IntegerField(
        default=15,
        help_text="Grace period for late arrival in minutes"
    )
    
    # Half day rules
    half_day_hours = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=4,
        help_text="Minimum hours for half day"
    )
    
    # Overtime rules
    overtime_threshold_hours = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=8,
        help_text="Hours after which overtime starts"
    )
    
    # Weekly off
    weekly_off_days = models.JSONField(
        default=list,
        help_text="List of weekly off days (0=Monday, 6=Sunday)"
    )
    
    # Applicability
    applies_to_roles = models.JSONField(
        default=list,
        blank=True,
        help_text="List of roles this policy applies to (empty = all)"
    )
    
    applies_to_branches = models.ManyToManyField(
        'branches.Branch',
        blank=True,
        related_name='attendance_policies'
    )
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'attendance_policies'
        verbose_name_plural = 'Attendance Policies'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class MonthlyAttendanceSummary(models.Model):
    """Monthly attendance summary for quick payroll calculation"""
    
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_summaries'
    )
    
    month = models.IntegerField(help_text="Month (1-12)")
    year = models.IntegerField(help_text="Year")
    
    # Attendance counts
    total_working_days = models.IntegerField(default=0)
    days_present = models.IntegerField(default=0)
    days_absent = models.IntegerField(default=0)
    days_half_day = models.IntegerField(default=0)
    days_on_leave = models.IntegerField(default=0)
    days_holiday = models.IntegerField(default=0)
    days_week_off = models.IntegerField(default=0)
    
    # Hours tracking
    total_hours_worked = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    total_overtime_hours = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    
    # Late arrivals
    late_arrivals_count = models.IntegerField(default=0)
    
    # Calculated for payroll
    effective_working_days = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Present + (Half Day * 0.5) + Leave"
    )
    
    # Auto-generated flag
    is_auto_generated = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'monthly_attendance_summaries'
        unique_together = ['employee', 'month', 'year']
        ordering = ['-year', '-month', 'employee']
        indexes = [
            models.Index(fields=['month', 'year']),
            models.Index(fields=['employee', 'month', 'year']),
        ]
    
    def __str__(self):
        return f"{self.employee.name} - {self.month}/{self.year}"
    
    def calculate_effective_days(self):
        """Calculate effective working days for payroll"""
        self.effective_working_days = Decimal(
            self.days_present + 
            (self.days_half_day * 0.5) + 
            self.days_on_leave
        )
        return self.effective_working_days
