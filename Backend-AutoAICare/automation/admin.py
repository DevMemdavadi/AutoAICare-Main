from django.contrib import admin
from .models import (
    WorkflowTemplate, WorkflowTrigger, WorkflowAction,
    WorkflowExecution, WorkflowLog, WorkflowAnalytics
)


class WorkflowTriggerInline(admin.StackedInline):
    model = WorkflowTrigger
    extra = 0
    can_delete = False


class WorkflowActionInline(admin.TabularInline):
    model = WorkflowAction
    extra = 1
    fields = ('order', 'action_type', 'channel', 'template_content', 'delay_minutes')
    ordering = ['order']


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'trigger_type', 'is_active', 'action_count', 'execution_count', 'created_at')
    list_filter = ('is_active', 'trigger_type', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at', 'created_by')
    inlines = [WorkflowTriggerInline, WorkflowActionInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'trigger_type', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def action_count(self, obj):
        return obj.actions.count()
    action_count.short_description = 'Actions'
    
    def execution_count(self, obj):
        return obj.executions.count()
    execution_count.short_description = 'Executions'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(WorkflowAction)
class WorkflowActionAdmin(admin.ModelAdmin):
    list_display = ('workflow', 'action_type', 'channel', 'order', 'delay_minutes')
    list_filter = ('action_type', 'channel')
    search_fields = ('workflow__name', 'template_content')
    ordering = ['workflow', 'order']


@admin.register(WorkflowExecution)
class WorkflowExecutionAdmin(admin.ModelAdmin):
    list_display = ('workflow', 'customer', 'status', 'triggered_at', 'completed_at', 'duration')
    list_filter = ('status', 'workflow', 'triggered_at')
    search_fields = ('workflow__name', 'customer__name', 'customer__phone')
    readonly_fields = ('triggered_at', 'started_at', 'completed_at', 'error_message', 'context_data')
    date_hierarchy = 'triggered_at'
    
    fieldsets = (
        ('Workflow Information', {
            'fields': ('workflow', 'customer', 'reference_type', 'reference_id')
        }),
        ('Execution Status', {
            'fields': ('status', 'triggered_at', 'started_at', 'completed_at', 'error_message')
        }),
        ('Context Data', {
            'fields': ('context_data',),
            'classes': ('collapse',)
        }),
    )
    
    def duration(self, obj):
        if obj.started_at and obj.completed_at:
            delta = obj.completed_at - obj.started_at
            return f"{delta.total_seconds():.2f}s"
        return "-"
    duration.short_description = 'Duration'


@admin.register(WorkflowLog)
class WorkflowLogAdmin(admin.ModelAdmin):
    list_display = ('execution', 'action', 'status', 'timestamp', 'execution_time_ms')
    list_filter = ('status', 'timestamp')
    search_fields = ('execution__workflow__name', 'message')
    readonly_fields = ('timestamp', 'execution_time_ms')
    date_hierarchy = 'timestamp'


@admin.register(WorkflowAnalytics)
class WorkflowAnalyticsAdmin(admin.ModelAdmin):
    list_display = ('workflow', 'date', 'total_executions', 'successful_executions', 'failed_executions', 'success_rate')
    list_filter = ('workflow', 'date')
    date_hierarchy = 'date'
    readonly_fields = ('date',)
    
    def success_rate(self, obj):
        if obj.total_executions > 0:
            rate = (obj.successful_executions / obj.total_executions) * 100
            return f"{rate:.1f}%"
        return "0%"
    success_rate.short_description = 'Success Rate'
