"""
Admin configuration for memberships app.
"""

from django.contrib import admin
from .models import (
    MembershipPlan,
    MembershipBenefit,
    CustomerMembership,
    MembershipBenefitUsage,
    Coupon,
    CouponUsage,
    MembershipCouponGeneration
)


class MembershipBenefitInline(admin.TabularInline):
    model = MembershipBenefit
    extra = 1


@admin.register(MembershipPlan)
class MembershipPlanAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'tier', 'sedan_price', 'duration_value', 'duration_unit',
        'discount_percentage', 'free_washes_count', 'is_active', 'is_popular'
    ]
    list_filter = ['tier', 'is_active', 'is_popular', 'is_global']
    search_fields = ['name', 'description']
    ordering = ['display_order', 'tier']
    inlines = [MembershipBenefitInline]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'tier', 'description', 'is_active', 'is_popular', 'display_order')
        }),
        ('Pricing', {
            'fields': ('hatchback_price', 'sedan_price', 'suv_price', 'gst_applicable', 'gst_rate')
        }),
        ('Duration', {
            'fields': ('duration_value', 'duration_unit')
        }),
        ('Benefits', {
            'fields': (
                'discount_percentage', 'free_washes_count', 'free_interior_cleaning_count',
                'coupons_per_month', 'coupon_discount_percentage', 'priority_booking'
            )
        }),
        ('Branch', {
            'fields': ('is_global', 'branch')
        }),
    )


@admin.register(MembershipBenefit)
class MembershipBenefitAdmin(admin.ModelAdmin):
    list_display = ['plan', 'benefit_type', 'title', 'is_active']
    list_filter = ['benefit_type', 'is_active', 'plan']
    search_fields = ['title', 'description']


@admin.register(MembershipBenefitUsage)
class MembershipBenefitUsageAdmin(admin.ModelAdmin):
    list_display = [
        'customer_membership', 'benefit', 'total_coupons_allocated',
        'coupons_used', 'coupons_remaining', 'is_one_time', 'has_been_used'
    ]
    list_filter = ['is_one_time', 'has_been_used', 'benefit__benefit_type']
    search_fields = ['customer_membership__membership_id', 'benefit__title']
    readonly_fields = ['coupons_remaining', 'is_available', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Benefit Info', {
            'fields': ('customer_membership', 'benefit')
        }),
        ('Usage Tracking', {
            'fields': ('total_coupons_allocated', 'coupons_used', 'coupons_remaining')
        }),
        ('One-Time Benefit', {
            'fields': ('is_one_time', 'has_been_used')
        }),
        ('Timestamps', {
            'fields': ('first_used_at', 'last_used_at', 'created_at', 'updated_at')
        }),
    )


@admin.register(CustomerMembership)
class CustomerMembershipAdmin(admin.ModelAdmin):
    list_display = [
        'membership_id', 'customer', 'plan', 'vehicle', 'status',
        'start_date', 'end_date', 'total_paid'
    ]
    list_filter = ['status', 'plan', 'branch', 'purchase_date']
    search_fields = ['membership_id', 'customer__name', 'customer__phone', 'vehicle__registration_number']
    readonly_fields = ['membership_id', 'created_at', 'updated_at']
    date_hierarchy = 'purchase_date'
    
    fieldsets = (
        ('Membership Info', {
            'fields': ('membership_id', 'customer', 'vehicle', 'plan', 'vehicle_type', 'status')
        }),
        ('Pricing', {
            'fields': ('purchase_price', 'gst_amount', 'total_paid')
        }),
        ('Dates', {
            'fields': ('purchase_date', 'start_date', 'end_date')
        }),
        ('Usage', {
            'fields': ('washes_used', 'interior_cleanings_used')
        }),
        ('Payment', {
            'fields': ('payment_method', 'payment_reference')
        }),
        ('Other', {
            'fields': ('branch', 'created_by', 'notes', 'created_at', 'updated_at')
        }),
    )


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'coupon_type', 'discount_percentage', 'discount_amount',
        'valid_from', 'valid_until', 'status', 'times_used', 'usage_limit'
    ]
    list_filter = ['coupon_type', 'status', 'is_membership_coupon', 'is_global']
    search_fields = ['code', 'description', 'customer__name']
    readonly_fields = ['code', 'times_used', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Coupon Info', {
            'fields': ('code', 'coupon_type', 'status', 'description', 'terms_conditions')
        }),
        ('Discount', {
            'fields': ('discount_percentage', 'discount_amount', 'max_discount', 'min_order_value')
        }),
        ('Free Service', {
            'fields': ('free_service',),
            'classes': ('collapse',)
        }),
        ('Validity', {
            'fields': ('valid_from', 'valid_until', 'usage_limit', 'times_used')
        }),
        ('User Restrictions', {
            'fields': ('is_single_user', 'customer')
        }),
        ('Membership', {
            'fields': ('source_membership', 'source_benefit', 'benefit_usage', 'is_membership_coupon'),
            'classes': ('collapse',)
        }),
        ('Branch', {
            'fields': ('is_global', 'branch')
        }),
        ('Meta', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = ['coupon', 'customer', 'booking', 'discount_applied', 'order_value', 'used_at']
    list_filter = ['used_at']
    search_fields = ['coupon__code', 'customer__name']
    readonly_fields = ['used_at']
    date_hierarchy = 'used_at'


@admin.register(MembershipCouponGeneration)
class MembershipCouponGenerationAdmin(admin.ModelAdmin):
    list_display = ['membership', 'month', 'year', 'coupons_generated', 'generated_at']
    list_filter = ['year', 'month']
    readonly_fields = ['generated_at']
