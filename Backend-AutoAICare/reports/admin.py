"""
Reports Admin Configuration
"""
from django.contrib import admin
from .models import ScheduledReport, ReportTemplate


@admin.register(ScheduledReport)
class ScheduledReportAdmin(admin.ModelAdmin):
    list_display = ['name', 'report_type', 'format', 'frequency', 'is_active', 'next_run', 'last_run']
    list_filter = ['report_type', 'format', 'frequency', 'is_active']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'last_run']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'report_type', 'format')
        }),
        ('Schedule', {
            'fields': ('frequency', 'is_active', 'next_run', 'last_run')
        }),
        ('Recipients', {
            'fields': ('email_recipients',)
        }),
        ('Parameters', {
            'fields': ('parameters',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        if not obj.next_run:
            obj.calculate_next_run()


@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'report_type', 'is_public', 'created_by', 'created_at']
    list_filter = ['report_type', 'is_public']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'report_type', 'is_public')
        }),
        ('Configuration', {
            'fields': ('columns', 'filters', 'grouping', 'sorting')
        }),
        ('Styling', {
            'fields': ('header_color', 'show_summary', 'show_charts')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
