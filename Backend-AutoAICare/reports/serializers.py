"""
Reports Serializers
"""
from rest_framework import serializers
from .models import ScheduledReport, ReportTemplate


class ScheduledReportSerializer(serializers.ModelSerializer):
    """Serializer for scheduled reports"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    format_display = serializers.CharField(source='get_format_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    
    class Meta:
        model = ScheduledReport
        fields = [
            'id', 'name', 'description', 'report_type', 'report_type_display',
            'format', 'format_display', 'frequency', 'frequency_display',
            'email_recipients', 'is_active', 'next_run', 'last_run',
            'parameters', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'next_run', 'last_run', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Create scheduled report and calculate first run"""
        scheduled_report = super().create(validated_data)
        scheduled_report.calculate_next_run()
        return scheduled_report


class ReportTemplateSerializer(serializers.ModelSerializer):
    """Serializer for report templates"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = ReportTemplate
        fields = [
            'id', 'name', 'description', 'report_type',
            'columns', 'filters', 'grouping', 'sorting',
            'header_color', 'show_summary', 'show_charts',
            'is_public', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
