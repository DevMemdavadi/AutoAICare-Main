from django.contrib import admin
from .models import AttendanceRecord, AttendancePolicy, MonthlyAttendanceSummary


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'status', 'check_in_time', 'check_out_time', 'total_hours', 'overtime_hours', 'branch']
    list_filter = ['status', 'date', 'branch']
    search_fields = ['employee__name', 'employee__email']
    date_hierarchy = 'date'
    readonly_fields = ['total_hours', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('employee', 'date', 'status', 'branch')
        }),
        ('Time Tracking', {
            'fields': ('check_in_time', 'check_out_time', 'total_hours', 'overtime_hours')
        }),
        ('Additional Info', {
            'fields': ('leave_request', 'notes', 'marked_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(AttendancePolicy)
class AttendancePolicyAdmin(admin.ModelAdmin):
    list_display = ['name', 'standard_working_hours', 'overtime_threshold_hours', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
    filter_horizontal = ['applies_to_branches']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'is_active')
        }),
        ('Working Hours', {
            'fields': ('standard_working_hours', 'half_day_hours', 'overtime_threshold_hours')
        }),
        ('Policies', {
            'fields': ('late_arrival_grace_minutes', 'weekly_off_days')
        }),
        ('Applicability', {
            'fields': ('applies_to_roles', 'applies_to_branches')
        }),
    )


@admin.register(MonthlyAttendanceSummary)
class MonthlyAttendanceSummaryAdmin(admin.ModelAdmin):
    list_display = ['employee', 'month', 'year', 'days_present', 'days_absent', 'effective_working_days', 'total_overtime_hours']
    list_filter = ['month', 'year', 'is_auto_generated']
    search_fields = ['employee__name', 'employee__email']
    readonly_fields = ['effective_working_days', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Period', {
            'fields': ('employee', 'month', 'year')
        }),
        ('Attendance Days', {
            'fields': ('total_working_days', 'days_present', 'days_absent', 'days_half_day', 
                      'days_on_leave', 'days_holiday', 'days_week_off')
        }),
        ('Hours', {
            'fields': ('total_hours_worked', 'total_overtime_hours')
        }),
        ('Summary', {
            'fields': ('late_arrivals_count', 'effective_working_days', 'is_auto_generated')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
