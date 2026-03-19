from django.contrib import admin
from .models import PickupDropRequest


@admin.register(PickupDropRequest)
class PickupDropRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'driver', 'status', 'pickup_time', 'drop_time')
    list_filter = ('status', 'created_at')
    search_fields = ('booking__customer__user__email', 'driver__email')
    readonly_fields = ('created_at', 'updated_at')
