from django.contrib import admin
from .models import Company, CompanySettings, Domain


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'business_type', 'created_at']
    list_filter = ['is_active', 'is_trial', 'business_type']
    search_fields = ['name', 'email', 'phone', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'display_name', 'business_type')
        }),
        ('Status', {
            'fields': ('is_active', 'is_trial', 'trial_ends_at')
        }),
        ('Contact Information', {
            'fields': ('email', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'country', 'pincode')
        }),
        ('Business Details', {
            'fields': ('gst_number', 'pan_number')
        }),
        ('Branding', {
            'fields': ('logo', 'primary_color')
        }),
        ('Subscription', {
            'fields': ('subscription_plan', 'max_users', 'max_branches')
        }),
        ('Advanced', {
            'fields': ('settings', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    list_display = ['company', 'tax_name', 'default_tax_rate', 'invoice_prefix']
    list_filter = ['tax_name', 'enable_email_notifications', 'enable_sms_notifications']
    search_fields = ['company__name']
    
    fieldsets = (
        ('Company', {
            'fields': ('company',)
        }),
        ('Tax Configuration', {
            'fields': ('tax_name', 'default_tax_rate')
        }),
        ('Invoice Settings', {
            'fields': ('invoice_prefix', 'invoice_footer', 'terms_and_conditions')
        }),
        ('Bank Details', {
            'fields': ('bank_name', 'account_number', 'ifsc_code', 'account_holder_name')
        }),
        ('Notifications', {
            'fields': ('enable_email_notifications', 'enable_sms_notifications')
        }),
        ('Booking Settings', {
            'fields': ('booking_advance_days', 'cancellation_hours', 'slot_duration_minutes')
        }),
    )


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ['domain', 'subdomain', 'company', 'is_primary', 'is_active', 'created_at']
    list_filter = ['is_primary', 'is_active', 'created_at']
    search_fields = ['domain', 'subdomain', 'company__name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Domain Information', {
            'fields': ('company', 'domain', 'subdomain')
        }),
        ('Settings', {
            'fields': ('is_primary', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        # Make subdomain readonly after creation (auto-extracted from domain)
        if obj:
            return self.readonly_fields + ['subdomain']
        return self.readonly_fields
