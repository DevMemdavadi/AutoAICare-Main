from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'vehicle', 'booking_datetime', 'status', 'total_price')
    list_filter = ('status', 'pickup_required', 'booking_datetime', 'created_at')
    search_fields = ('customer__user__email', 'customer__user__name', 'vehicle__registration_number')
    readonly_fields = ('total_price', 'created_at', 'updated_at')
    filter_horizontal = ('addons', 'packages')

    fieldsets = (
        ('Booking Details', {
            'fields': ('customer', 'vehicle', 'packages', 'primary_package', 'addons', 'branch', 'booking_datetime', 'status')
        }),
        ('Pickup & Location', {
            'fields': ('pickup_required', 'location')
        }),
        ('Pricing', {
            'fields': ('total_price', 'discount_amount')
        }),
        ('Additional Info', {
            'fields': ('notes', 'created_at', 'updated_at')
        }),
    )
