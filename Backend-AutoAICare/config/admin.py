from django.contrib import admin
from .models import GlobalSettings, CompanySettings


@admin.register(GlobalSettings)
class GlobalSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Tax Configuration', {
            'fields': ('default_tax_rate', 'tax_name')
        }),
        ('Business Information', {
            'fields': ('business_name', 'business_email', 'business_phone', 'business_address')
        }),
        ('Currency Settings', {
            'fields': ('currency', 'currency_symbol')
        }),
        ('Booking Settings', {
            'fields': ('booking_advance_days', 'cancellation_hours', 'slot_duration_minutes')
        }),
        ('Notification Settings', {
            'fields': ('enable_email_notifications', 'enable_sms_notifications')
        }),
        ('System Settings', {
            'fields': ('maintenance_mode',)
        }),
    )
    
    def has_add_permission(self, request):
        # Singleton - only one instance allowed
        return not GlobalSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of singleton
        return False


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Company Information', {
            'fields': ('company_name', 'branch_name', 'logo', 'signature')
        }),
        ('Address', {
            'fields': ('address_line1', 'address_line2', 'city', 'state', 'pincode')
        }),
        ('Contact Details', {
            'fields': ('phone', 'email', 'website')
        }),
        ('Tax Information', {
            'fields': ('gst_number', 'pan_number')
        }),
        ('Bank Details', {
            'fields': ('bank_name', 'account_number', 'ifsc_code', 'account_holder_name', 'branch_address')
        }),
        ('Invoice Settings', {
            'fields': ('invoice_prefix', 'terms_and_conditions', 'footer_message')
        }),
    )
    
    list_display = ('company_name', 'branch_name', 'city', 'phone', 'email')
    
    def has_add_permission(self, request):
        # Singleton - only one instance allowed
        return not CompanySettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of singleton
        return False
