from django.contrib import admin
from .models import Appointment, AppointmentSlot


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'customer', 'package', 'vehicle', 'status',
        'preferred_datetime', 'branch', 'created_at'
    ]
    list_filter = ['status', 'branch', 'vehicle_type', 'pickup_required']
    search_fields = [
        'customer__user__name', 'customer__user__phone',
        'vehicle__registration_number'
    ]
    readonly_fields = ['created_at', 'updated_at', 'expires_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Customer Info', {
            'fields': ('customer', 'vehicle', 'vehicle_type')
        }),
        ('Service Details', {
            'fields': ('package', 'addons', 'branch')
        }),
        ('Scheduling', {
            'fields': (
                'preferred_datetime', 'alternate_datetime', 
                'confirmed_datetime', 'expires_at'
            )
        }),
        ('Pickup', {
            'fields': ('pickup_required', 'location', 'notes')
        }),
        ('Status', {
            'fields': ('status', 'reviewed_by', 'reviewed_at', 'admin_notes', 'booking')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(AppointmentSlot)
class AppointmentSlotAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'branch', 'date', 'start_time', 'end_time',
        'max_bookings', 'is_available'
    ]
    list_filter = ['branch', 'is_available', 'date']
    date_hierarchy = 'date'
