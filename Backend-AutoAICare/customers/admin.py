from django.contrib import admin
from .models import Customer, Vehicle, VehicleBrand, VehicleModel, VehicleColor
from .crm_models import (
    CustomerTag, CustomerSegment, CustomerNote, CustomerPreference,
    CustomerActivity, CustomerLifecycle, ServiceReminder, ReminderHistory
)


class CustomerNoteInline(admin.TabularInline):
    model = CustomerNote
    extra = 0
    fields = ('category', 'note', 'is_important', 'created_by', 'created_at')
    readonly_fields = ('created_at',)


class CustomerSegmentInline(admin.TabularInline):
    model = CustomerSegment
    extra = 0
    fields = ('segment_type', 'assigned_by', 'assigned_at', 'notes')
    readonly_fields = ('assigned_at',)


class CustomerLifecycleInline(admin.StackedInline):
    model = CustomerLifecycle
    extra = 0
    can_delete = False
    fields = ('current_stage', 'previous_stage', 'acquisition_source', 'acquisition_date', 
              'last_interaction_date', 'total_lifetime_value', 'customer_score')


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('user', 'membership_type', 'reward_points', 'get_lifecycle_stage', 'created_at')
    list_filter = ('membership_type', 'created_at')
    search_fields = ('user__email', 'user__name', 'user__phone')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [CustomerLifecycleInline, CustomerSegmentInline, CustomerNoteInline]
    
    def get_lifecycle_stage(self, obj):
        if hasattr(obj, 'lifecycle'):
            return obj.lifecycle.get_current_stage_display()
        return '-'
    get_lifecycle_stage.short_description = 'Lifecycle Stage'


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('registration_number', 'brand', 'model', 'customer', 'last_service_date', 'next_service_due')
    list_filter = ('brand', 'created_at')
    search_fields = ('registration_number', 'brand', 'model', 'customer__user__email')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Vehicle Information', {
            'fields': ('customer', 'registration_number', 'brand', 'model', 'color', 'year', 'vehicle_type')
        }),
        ('Service Tracking', {
            'fields': ('last_service_date', 'next_service_due', 'service_interval_days', 
                      'odometer_reading', 'service_interval_km')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(VehicleBrand)
class VehicleBrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'vehicle_type', 'is_active', 'created_at')
    list_filter = ('vehicle_type', 'is_active')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(VehicleModel)
class VehicleModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'brand', 'is_active', 'created_at')
    list_filter = ('brand', 'is_active')
    search_fields = ('name', 'brand__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(VehicleColor)
class VehicleColorAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')


# CRM Model Admins

@admin.register(CustomerTag)
class CustomerTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('created_at',)


@admin.register(CustomerSegment)
class CustomerSegmentAdmin(admin.ModelAdmin):
    list_display = ('customer', 'segment_type', 'assigned_by', 'assigned_at')
    list_filter = ('segment_type', 'assigned_at')
    search_fields = ('customer__user__name', 'customer__user__email')
    readonly_fields = ('assigned_at',)


@admin.register(CustomerNote)
class CustomerNoteAdmin(admin.ModelAdmin):
    list_display = ('customer', 'category', 'is_important', 'created_by', 'created_at')
    list_filter = ('category', 'is_important', 'created_at')
    search_fields = ('customer__user__name', 'note')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CustomerPreference)
class CustomerPreferenceAdmin(admin.ModelAdmin):
    list_display = ('customer', 'key', 'value', 'updated_at')
    search_fields = ('customer__user__name', 'key')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CustomerActivity)
class CustomerActivityAdmin(admin.ModelAdmin):
    list_display = ('customer', 'activity_type', 'description', 'created_by', 'timestamp')
    list_filter = ('activity_type', 'timestamp')
    search_fields = ('customer__user__name', 'description')
    readonly_fields = ('timestamp',)
    date_hierarchy = 'timestamp'


@admin.register(CustomerLifecycle)
class CustomerLifecycleAdmin(admin.ModelAdmin):
    list_display = ('customer', 'current_stage', 'acquisition_source', 'total_lifetime_value', 'customer_score')
    list_filter = ('current_stage', 'acquisition_source')
    search_fields = ('customer__user__name',)
    readonly_fields = ('stage_changed_at',)


@admin.register(ServiceReminder)
class ServiceReminderAdmin(admin.ModelAdmin):
    list_display = ('customer', 'vehicle', 'due_date', 'reminder_type', 'status', 'sent_at')
    list_filter = ('status', 'reminder_type', 'due_date')
    search_fields = ('customer__user__name', 'vehicle__registration_number')
    readonly_fields = ('created_at', 'sent_at')
    date_hierarchy = 'due_date'


@admin.register(ReminderHistory)
class ReminderHistoryAdmin(admin.ModelAdmin):
    list_display = ('customer', 'reminder_type', 'sent_via', 'sent_at', 'opened', 'clicked')
    list_filter = ('reminder_type', 'sent_via', 'opened', 'clicked', 'sent_at')
    search_fields = ('customer__user__name',)
    readonly_fields = ('sent_at', 'opened_at', 'clicked_at')
    date_hierarchy = 'sent_at'
