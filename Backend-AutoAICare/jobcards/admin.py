from django.contrib import admin
from django.utils.html import format_html
from .models import (
    JobCard, JobCardPhoto, PartUsed,
    JobCardNote, DynamicTask, JobCardActivity,
    RewardSettings, SupervisorReward
)
from .performance_models import PerformanceMetrics, TeamPerformance
from .parts_catalog import Part, BranchStock, StockTransfer
from .workflow_config import (
    WorkflowTemplate, WorkflowStatus, WorkflowTransition, RolePermission
)

class JobCardPhotoInline(admin.TabularInline):
    model = JobCardPhoto
    extra = 1


class PartUsedInline(admin.TabularInline):
    model = PartUsed
    extra = 1


@admin.register(JobCard)
class JobCardAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'technician', 'status', 'company', 'branch', 'created_at')
    list_filter = ('company', 'branch', 'status', 'created_at')
    search_fields = ('booking__customer__user__email', 'technician__email')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [JobCardPhotoInline, PartUsedInline]


@admin.register(JobCardPhoto)
class JobCardPhotoAdmin(admin.ModelAdmin):
    list_display = ('id', 'jobcard', 'photo_type', 'company', 'created_at')
    list_filter = ('company', 'photo_type', 'created_at')
    readonly_fields = ('created_at',)
    
    def save_model(self, request, obj, form, change):
        # Handle database transactions more carefully to avoid locks
        try:
            super().save_model(request, obj, form, change)
        except Exception as e:
            # Log the error and re-raise
            import logging
            logger = logging.getLogger('django')
            logger.error(f"Error saving JobCardPhoto: {e}")
            raise



@admin.register(PartUsed)
class PartUsedAdmin(admin.ModelAdmin):
    list_display = ('id', 'jobcard', 'part_name', 'quantity', 'price', 'company', 'total_price')
    list_filter = ('company',)
    search_fields = ('part_name', 'company__name')


@admin.register(Part)
class PartAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name', 'category', 'selling_price', 'cost_price', 'stock', 'stock_status_display', 'unit', 'is_active', 'branch_display')
    list_filter = ('category', 'is_active', 'is_global', 'branch', 'company')
    search_fields = ('name', 'sku', 'description', 'company__name', 'branch__name')
    readonly_fields = ('created_at', 'updated_at', 'stock_status')
    autocomplete_fields = []  # Enable autocomplete for this model
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'sku', 'category', 'description')
        }),
        ('Pricing', {
            'fields': ('cost_price', 'selling_price', 'gst_applicable', 'gst_rate', 'hsn_code')
        }),
        ('Stock Management', {
            'fields': ('stock', 'min_stock_level', 'unit', 'stock_status', 'stock_tracking_mode')
        }),
        ('Branch Settings', {
            'fields': ('company', 'branch', 'is_global', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def stock_status_display(self, obj):
        """Display stock status with color coding."""
        status = obj.stock_status
        colors = {
            'out_of_stock': 'red',
            'low_stock': 'orange',
            'in_stock': 'green'
        }
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(status, 'black'),
            status.replace('_', ' ').title()
        )
    stock_status_display.short_description = 'Stock Status'
    
    def branch_display(self, obj):
        """Display branch name or 'Global'."""
        return obj.branch.name if obj.branch else 'Global'
    branch_display.short_description = 'Branch'


@admin.register(BranchStock)
class BranchStockAdmin(admin.ModelAdmin):
    list_display = ('part_name', 'branch_name', 'quantity', 'min_stock_level', 'stock_status_display', 'location', 'updated_at')
    list_filter = ('branch', 'part__category', 'updated_at')
    search_fields = ('part__name', 'part__sku', 'branch__name', 'location')
    readonly_fields = ('created_at', 'updated_at', 'stock_status')
    autocomplete_fields = ['part', 'branch']
    
    fieldsets = (
        ('Stock Information', {
            'fields': ('company', 'branch', 'part', 'quantity', 'min_stock_level')
        }),
        ('Location', {
            'fields': ('location',)
        }),
        ('Status', {
            'fields': ('stock_status',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def part_name(self, obj):
        return f"{obj.part.name} ({obj.part.sku})"
    part_name.short_description = 'Part'
    part_name.admin_order_field = 'part__name'
    
    def branch_name(self, obj):
        return obj.branch.name
    branch_name.short_description = 'Branch'
    branch_name.admin_order_field = 'branch__name'
    
    def stock_status_display(self, obj):
        """Display stock status with color coding."""
        status = obj.stock_status
        colors = {
            'out_of_stock': 'red',
            'low_stock': 'orange',
            'in_stock': 'green'
        }
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(status, 'black'),
            status.replace('_', ' ').title()
        )
    stock_status_display.short_description = 'Stock Status'


@admin.register(StockTransfer)
class StockTransferAdmin(admin.ModelAdmin):
    list_display = ('transfer_number', 'part_name', 'quantity', 'from_branch_name', 'to_branch_name', 'status_display', 'requested_by', 'requested_at')
    list_filter = ('status', 'from_branch', 'to_branch', 'requested_at')
    search_fields = ('transfer_number', 'part__name', 'part__sku', 'from_branch__name', 'to_branch__name')
    readonly_fields = ('transfer_number', 'requested_at', 'approved_at', 'shipped_at', 'received_at', 'created_at', 'updated_at')
    autocomplete_fields = ['part', 'from_branch', 'to_branch', 'requested_by', 'approved_by', 'received_by']
    
    fieldsets = (
        ('Transfer Information', {
            'fields': ('company', 'transfer_number', 'part', 'quantity', 'status')
        }),
        ('Branch Details', {
            'fields': ('from_branch', 'to_branch')
        }),
        ('Request Details', {
            'fields': ('reason', 'notes', 'requested_by', 'requested_at')
        }),
        ('Approval', {
            'fields': ('approved_by', 'approved_at')
        }),
        ('Receipt', {
            'fields': ('received_by', 'received_at', 'shipped_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def part_name(self, obj):
        return f"{obj.part.name} ({obj.part.sku})"
    part_name.short_description = 'Part'
    part_name.admin_order_field = 'part__name'
    
    def from_branch_name(self, obj):
        return obj.from_branch.name
    from_branch_name.short_description = 'From'
    from_branch_name.admin_order_field = 'from_branch__name'
    
    def to_branch_name(self, obj):
        return obj.to_branch.name
    to_branch_name.short_description = 'To'
    to_branch_name.admin_order_field = 'to_branch__name'
    
    def status_display(self, obj):
        """Display status with color coding."""
        colors = {
            'pending': 'orange',
            'approved': 'blue',
            'in_transit': 'purple',
            'received': 'green',
            'rejected': 'red',
            'cancelled': 'gray'
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, 'black'),
            obj.get_status_display()
        )
    status_display.short_description = 'Status'


@admin.register(JobCardNote)
class JobCardNoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'jobcard', 'note_type', 'created_by', 'is_pinned', 'visible_to_customer', 'created_at']
    list_filter = ['note_type', 'is_pinned', 'visible_to_customer', 'created_at']
    search_fields = ['jobcard__id', 'content', 'created_by__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DynamicTask)
class DynamicTaskAdmin(admin.ModelAdmin):
    list_display = ['id', 'jobcard', 'title', 'status', 'estimated_price', 'requires_approval', 'approved_by_customer', 'created_at']
    list_filter = ['status', 'requires_approval', 'approved_by_customer', 'created_at']
    search_fields = ['jobcard__id', 'title', 'description']
    readonly_fields = ['created_at', 'approval_date', 'completed_at']


@admin.register(JobCardActivity)
class JobCardActivityAdmin(admin.ModelAdmin):
    list_display = ['id', 'jobcard', 'activity_type', 'performed_by', 'created_at']
    list_filter = ['activity_type', 'created_at']
    search_fields = ['jobcard__id', 'description', 'performed_by__name']
    readonly_fields = ['created_at']


@admin.register(RewardSettings)
class RewardSettingsAdmin(admin.ModelAdmin):
    list_display = ['id', 'company', 'branch', 'use_percentage_based_rewards', 'is_active', 'created_at']
    list_filter = ['company', 'branch', 'is_active', 'use_percentage_based_rewards', 'created_at']
    search_fields = ['company__name', 'branch__name']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'branch', 'is_active')
        }),
        ('Reward Tiers', {
            'fields': (
                ('tier_1_minutes', 'tier_1_amount'),
                ('tier_2_minutes', 'tier_2_amount'),
                ('tier_3_minutes', 'tier_3_amount'),
            )
        }),
        ('Deduction Rules', {
            'fields': (
                'deduction_enabled',
                'deduction_threshold_minutes',
                'deduction_per_minute',
                'max_deduction_per_job',
            )
        }),
        ('Distribution Settings', {
            'fields': (
                'applicator_share_percentage',
                'apply_deduction_to_applicators',
            )
        }),
        ('Percentage-Based Rewards', {
            'fields': (
                'use_percentage_based_rewards',
                ('tier_1_job_value_min', 'tier_1_reward_percentage'),
                ('tier_2_job_value_min', 'tier_2_reward_percentage'),
                ('tier_3_job_value_min', 'tier_3_reward_percentage'),
                ('tier_4_job_value_min', 'tier_4_reward_percentage'),
            ),
            'description': 'Configure percentage-based rewards based on job value'
        }),
        ('Time Bonus Settings', {
            'fields': (
                'apply_time_bonus',
                'time_bonus_percentage',
                'time_bonus_interval_minutes',
            ),
            'description': 'Additional bonus for time saved (only applies to percentage-based rewards)'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(SupervisorReward)
class SupervisorRewardAdmin(admin.ModelAdmin):
    list_display = ['id', 'jobcard', 'recipient', 'transaction_type', 'amount', 'status', 'company_display', 'is_applicator_share', 'created_at']
    list_filter = ['jobcard__company', 'transaction_type', 'status', 'is_applicator_share', 'tier', 'created_at']
    search_fields = ['jobcard__id', 'recipient__name', 'recipient__email', 'jobcard__company__name']
    readonly_fields = ['created_at', 'updated_at', 'approved_at', 'company_display']
    
    def company_display(self, obj):
        return obj.jobcard.company.name if obj.jobcard.company else "-"
    company_display.short_description = 'Company'
    fieldsets = (
        ('Basic Information', {
            'fields': ('jobcard', 'recipient', 'transaction_type', 'amount', 'status')
        }),
        ('Calculation Details', {
            'fields': (
                'allowed_duration_minutes',
                'actual_duration_minutes',
                'time_difference_minutes',
                'tier',
                'calculation_notes',
            )
        }),
        ('Distribution', {
            'fields': (
                'is_applicator_share',
                'supervisor_reward',
                'split_percentage',
            )
        }),
        ('Approval', {
            'fields': (
                'approved_by',
                'approved_at',
            )
        }),
        ('Payroll', {
            'fields': ('payroll',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


# ==================== Workflow Configuration Admin ====================

class WorkflowStatusInline(admin.TabularInline):
    model = WorkflowStatus
    extra = 0
    fields = ['status_code', 'display_name', 'status_type', 'order', 'is_active_status', 'is_terminal']
    ordering = ['order']


class WorkflowTransitionInline(admin.TabularInline):
    model = WorkflowTransition
    extra = 0
    fields = ['from_status', 'to_status', 'action_name', 'allowed_roles', 'is_active']


class RolePermissionInline(admin.TabularInline):
    model = RolePermission
    extra = 0
    fields = ['role', 'can_create_jobcard', 'can_assign_staff', 'can_perform_qc', 'can_execute_work', 'can_generate_invoice']


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'company', 'branch', 'service_category', 'is_default', 'is_active', 'created_at']
    list_filter = ['company', 'branch', 'service_category', 'is_default', 'is_active']
    search_fields = ['name', 'description', 'company__name', 'branch__name']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [WorkflowStatusInline, WorkflowTransitionInline, RolePermissionInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'company', 'branch', 'service_category')
        }),
        ('Settings', {
            'fields': ('is_default', 'is_active')
        }),
        ('Workflow Options', {
            'fields': (
                'skip_customer_approval',
                'skip_floor_manager_final_qc',
                'require_supervisor_review',
                'auto_assign_applicators',
            )
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )


@admin.register(WorkflowStatus)
class WorkflowStatusAdmin(admin.ModelAdmin):
    list_display = ['id', 'template', 'display_name', 'status_type', 'company_display', 'order', 'is_terminal']
    list_filter = ['template__company', 'status_type', 'is_active_status', 'is_terminal']
    search_fields = ['status_code', 'display_name', 'template__name', 'template__company__name']
    ordering = ['template', 'order']
    readonly_fields = ['company_display']

    def company_display(self, obj):
        return obj.template.company.name if obj.template and obj.template.company else "-"
    company_display.short_description = 'Company'


@admin.register(WorkflowTransition)
class WorkflowTransitionAdmin(admin.ModelAdmin):
    list_display = ['id', 'template', 'from_status', 'to_status', 'action_name', 'get_allowed_roles', 'is_active']
    list_filter = ['template', 'is_active', 'requires_assignment', 'requires_notes', 'requires_photos']
    search_fields = ['action_name', 'from_status', 'to_status', 'template__name']
    
    def get_allowed_roles(self, obj):
        return ', '.join(obj.allowed_roles) if obj.allowed_roles else '-'
    get_allowed_roles.short_description = 'Allowed Roles'


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ['id', 'template', 'role', 'can_create_jobcard', 'can_assign_staff', 'can_perform_qc', 'can_execute_work', 'can_generate_invoice']
    list_filter = ['template', 'role']
    search_fields = ['role', 'template__name']


# ==================== Performance Tracking Admin ====================

@admin.register(PerformanceMetrics)
class PerformanceMetricsAdmin(admin.ModelAdmin):
    list_display = ['id', 'jobcard', 'company', 'branch', 'supervisor', 'time_difference_minutes', 'job_value', 'reward_amount', 'completed_on_time', 'job_completed_at']
    list_filter = ['jobcard__company', 'completed_on_time', 'branch', 'job_completed_at']
    search_fields = ['jobcard__id', 'supervisor__name', 'floor_manager__name', 'jobcard__company__name']
    readonly_fields = ['created_at', 'updated_at', 'time_saved_display', 'efficiency_percentage']
    
    def company(self, obj):
        return obj.jobcard.company if obj.jobcard else None
    
    fieldsets = (
        ('Job Information', {
            'fields': ('jobcard', 'branch')
        }),
        ('Team Members', {
            'fields': ('floor_manager', 'supervisor', 'applicators')
        }),
        ('Time Tracking', {
            'fields': (
                'scheduled_duration_minutes',
                'actual_duration_minutes',
                'time_difference_minutes',
                'time_saved_display',
                'efficiency_percentage',
                'completed_on_time',
            )
        }),
        ('Financial Metrics', {
            'fields': (
                'job_value',
                'package_value',
                'addons_value',
                'parts_value',
                'reward_amount',
                'reward_percentage',
            )
        }),
        ('Performance Indicators', {
            'fields': ('quality_score', 'customer_satisfaction')
        }),
        ('Timestamps', {
            'fields': ('job_started_at', 'job_completed_at', 'created_at', 'updated_at')
        }),
    )


@admin.register(TeamPerformance)
class TeamPerformanceAdmin(admin.ModelAdmin):
    list_display = ['id', 'supervisor', 'branch', 'period_type', 'period_start', 'total_jobs_completed', 'total_job_value', 'total_rewards_earned', 'efficiency_percentage']
    list_filter = ['period_type', 'branch', 'period_start']
    search_fields = ['supervisor__name', 'branch__name']
    readonly_fields = ['created_at', 'updated_at', 'working_per_day', 'on_time_percentage', 'net_time_performance']
    
    fieldsets = (
        ('Team Information', {
            'fields': ('branch', 'supervisor', 'floor_manager', 'period_type', 'period_start', 'period_end')
        }),
        ('Job Statistics', {
            'fields': (
                'total_jobs_completed',
                'jobs_on_time',
                'jobs_delayed',
                'on_time_percentage',
            )
        }),
        ('Time Statistics', {
            'fields': (
                'total_time_saved',
                'total_time_delayed',
                'net_time_performance',
                'average_completion_time',
            )
        }),
        ('Financial Statistics', {
            'fields': (
                'total_job_value',
                'total_rewards_earned',
                'average_reward_per_job',
                'working_per_day',
            )
        }),
        ('Team Composition', {
            'fields': ('team_members', 'team_size', 'efficiency_percentage')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
