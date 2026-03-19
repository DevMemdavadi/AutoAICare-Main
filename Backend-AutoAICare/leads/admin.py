from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import (
    LeadSource, Lead, LeadActivity, LeadConversion,
    LeadScore, LeadFollowUp
)


class LeadActivityInline(admin.TabularInline):
    model = LeadActivity
    extra = 0
    fields = ('activity_type', 'description', 'outcome', 'duration_minutes', 'created_by', 'created_at')
    readonly_fields = ('created_at',)


class LeadFollowUpInline(admin.TabularInline):
    model = LeadFollowUp
    extra = 1
    fields = ('due_date', 'task', 'assigned_to', 'priority', 'status')
    readonly_fields = ()


@admin.register(LeadSource)
class LeadSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'source_type', 'is_active', 'cost_per_lead', 'lead_count', 'created_at')
    list_filter = ('source_type', 'is_active')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at',)
    
    def lead_count(self, obj):
        return obj.leads.count()
    lead_count.short_description = 'Total Leads'


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'status_badge', 'priority_badge', 'score_badge', 
                    'source', 'assigned_to', 'last_contacted_at', 'created_at')
    list_filter = ('status', 'priority', 'source', 'assigned_to', 'converted_to_customer', 'created_at')
    search_fields = ('name', 'phone', 'email', 'organization')
    readonly_fields = ('created_at', 'updated_at', 'converted_at', 'score')
    inlines = [LeadActivityInline, LeadFollowUpInline]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'phone', 'email', 'organization')
        }),
        ('Lead Details', {
            'fields': ('source', 'status', 'priority', 'score', 'assigned_to', 'branch')
        }),
        ('Interest & Requirements', {
            'fields': ('interested_services', 'vehicle_info', 'budget_range', 'expected_close_date')
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Conversion', {
            'fields': ('converted_to_customer', 'converted_at', 'conversion_value'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_contacted_at'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['calculate_scores', 'mark_as_contacted', 'mark_as_qualified']
    
    def status_badge(self, obj):
        colors = {
            'new': '#3B82F6',
            'contacted': '#8B5CF6',
            'qualified': '#10B981',
            'proposal_sent': '#F59E0B',
            'negotiation': '#EF4444',
            'won': '#059669',
            'lost': '#6B7280',
            'on_hold': '#F97316',
        }
        color = colors.get(obj.status, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def priority_badge(self, obj):
        colors = {
            'urgent': '#DC2626',
            'high': '#F59E0B',
            'medium': '#3B82F6',
            'low': '#6B7280',
        }
        color = colors.get(obj.priority, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_priority_display()
        )
    priority_badge.short_description = 'Priority'
    
    def score_badge(self, obj):
        if obj.score >= 75:
            color = '#059669'
        elif obj.score >= 50:
            color = '#F59E0B'
        else:
            color = '#EF4444'
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.score
        )
    score_badge.short_description = 'Score'
    
    def calculate_scores(self, request, queryset):
        count = 0
        for lead in queryset:
            lead.calculate_score()
            count += 1
        self.message_user(request, f'Calculated scores for {count} leads.')
    calculate_scores.short_description = 'Calculate lead scores'
    
    def mark_as_contacted(self, request, queryset):
        count = queryset.filter(status='new').update(
            status='contacted',
            last_contacted_at=timezone.now()
        )
        self.message_user(request, f'Marked {count} leads as contacted.')
    mark_as_contacted.short_description = 'Mark as contacted'
    
    def mark_as_qualified(self, request, queryset):
        count = queryset.filter(status__in=['new', 'contacted']).update(status='qualified')
        self.message_user(request, f'Marked {count} leads as qualified.')
    mark_as_qualified.short_description = 'Mark as qualified'


@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    list_display = ('lead', 'activity_type', 'description_short', 'outcome', 'created_by', 'created_at')
    list_filter = ('activity_type', 'created_at')
    search_fields = ('lead__name', 'description', 'outcome')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    
    def description_short(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_short.short_description = 'Description'


@admin.register(LeadConversion)
class LeadConversionAdmin(admin.ModelAdmin):
    list_display = ('lead', 'customer_id', 'conversion_value', 'conversion_days', 'converted_at')
    list_filter = ('converted_at',)
    search_fields = ('lead__name',)
    readonly_fields = ('conversion_days', 'converted_at')
    date_hierarchy = 'converted_at'


@admin.register(LeadScore)
class LeadScoreAdmin(admin.ModelAdmin):
    list_display = ('lead', 'score', 'calculated_at')
    list_filter = ('calculated_at',)
    search_fields = ('lead__name',)
    readonly_fields = ('calculated_at',)
    date_hierarchy = 'calculated_at'


@admin.register(LeadFollowUp)
class LeadFollowUpAdmin(admin.ModelAdmin):
    list_display = ('lead', 'task_short', 'assigned_to', 'due_date', 'status_badge', 'priority_badge')
    list_filter = ('status', 'priority', 'assigned_to', 'due_date')
    search_fields = ('lead__name', 'task')
    readonly_fields = ('created_at', 'completed_at')
    date_hierarchy = 'due_date'
    
    fieldsets = (
        ('Follow-up Details', {
            'fields': ('lead', 'assigned_to', 'due_date', 'task', 'priority', 'status')
        }),
        ('Completion', {
            'fields': ('completed_at', 'completed_by', 'notes'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('created_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_completed', 'check_overdue']
    
    def task_short(self, obj):
        return obj.task[:50] + '...' if len(obj.task) > 50 else obj.task
    task_short.short_description = 'Task'
    
    def status_badge(self, obj):
        colors = {
            'pending': '#3B82F6',
            'completed': '#059669',
            'cancelled': '#6B7280',
            'overdue': '#DC2626',
        }
        color = colors.get(obj.status, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def priority_badge(self, obj):
        colors = {
            'urgent': '#DC2626',
            'high': '#F59E0B',
            'medium': '#3B82F6',
            'low': '#6B7280',
        }
        color = colors.get(obj.priority, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_priority_display()
        )
    priority_badge.short_description = 'Priority'
    
    def mark_as_completed(self, request, queryset):
        count = 0
        for followup in queryset.filter(status='pending'):
            followup.mark_as_completed(request.user)
            count += 1
        self.message_user(request, f'Marked {count} follow-ups as completed.')
    mark_as_completed.short_description = 'Mark as completed'
    
    def check_overdue(self, request, queryset):
        count = 0
        for followup in queryset:
            if followup.check_overdue():
                count += 1
        self.message_user(request, f'Found {count} overdue follow-ups.')
    check_overdue.short_description = 'Check for overdue'
