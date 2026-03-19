from rest_framework import serializers
from .models import AttendanceRecord, AttendancePolicy, MonthlyAttendanceSummary
from users.serializers import UserListSerializer


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_details = UserListSerializer(source='employee', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'employee', 'employee_details', 'date', 'status', 'status_display',
            'check_in_time', 'check_out_time', 'total_hours', 'overtime_hours',
            'branch', 'branch_name', 'leave_request', 'notes',
            'marked_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['total_hours', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate attendance record"""
        # Check for duplicate attendance
        employee = data.get('employee')
        date = data.get('date')
        
        if self.instance is None:  # Creating new record
            if AttendanceRecord.objects.filter(employee=employee, date=date).exists():
                raise serializers.ValidationError(
                    f"Attendance record already exists for {employee.name} on {date}"
                )
        
        return data


class AttendancePolicySerializer(serializers.ModelSerializer):
    applies_to_branches_details = serializers.SerializerMethodField()
    
    class Meta:
        model = AttendancePolicy
        fields = [
            'id', 'name', 'standard_working_hours', 'late_arrival_grace_minutes',
            'half_day_hours', 'overtime_threshold_hours', 'weekly_off_days',
            'applies_to_roles', 'applies_to_branches', 'applies_to_branches_details',
            'is_active', 'created_at', 'updated_at'
        ]
    
    def get_applies_to_branches_details(self, obj):
        return [{'id': b.id, 'name': b.name} for b in obj.applies_to_branches.all()]


class MonthlyAttendanceSummarySerializer(serializers.ModelSerializer):
    employee_details = UserListSerializer(source='employee', read_only=True)
    attendance_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = MonthlyAttendanceSummary
        fields = [
            'id', 'employee', 'employee_details', 'month', 'year',
            'total_working_days', 'days_present', 'days_absent', 'days_half_day',
            'days_on_leave', 'days_holiday', 'days_week_off',
            'total_hours_worked', 'total_overtime_hours', 'late_arrivals_count',
            'effective_working_days', 'attendance_percentage',
            'is_auto_generated', 'created_at', 'updated_at'
        ]
        read_only_fields = ['effective_working_days', 'created_at', 'updated_at']
    
    def get_attendance_percentage(self, obj):
        """Calculate attendance percentage"""
        if obj.total_working_days > 0:
            return round((obj.days_present / obj.total_working_days) * 100, 2)
        return 0


class BulkAttendanceSerializer(serializers.Serializer):
    """Serializer for bulk attendance marking"""
    date = serializers.DateField()
    branch = serializers.IntegerField(required=False, allow_null=True)
    attendance_data = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of {employee_id, status, check_in_time, check_out_time, notes}"
    )
    
    def validate_attendance_data(self, value):
        """Validate attendance data structure"""
        for record in value:
            if 'employee_id' not in record or 'status' not in record:
                raise serializers.ValidationError(
                    "Each attendance record must have 'employee_id' and 'status'"
                )
        return value
