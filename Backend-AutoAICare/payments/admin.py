from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'amount', 'payment_method', 'payment_status', 'created_at')
    list_filter = ('payment_method', 'payment_status', 'created_at')
    search_fields = ('booking__customer__user__email', 'transaction_id')
    readonly_fields = ('created_at', 'updated_at')
