"""
Membership Models for K3 Car Care System

This module contains all models related to:
- Membership Plans (tiers like Silver, Gold, Platinum)
- Customer Memberships (customer subscriptions)
- Membership Benefits (services/discounts included)
- Coupons (generated from memberships)
- Coupon Usage (tracking)
"""

from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid
import random
import string
from companies.managers import CompanyManager


class MembershipPlan(models.Model):
    """
    Membership Plan/Tier Model.
    Defines different membership levels (e.g., Silver, Gold, Platinum).
    """
    
    TIER_CHOICES = [
        ('bronze', 'Bronze'),
        ('silver', 'Silver'),
        ('gold', 'Gold'),
        ('platinum', 'Platinum'),
        ('diamond', 'Diamond'),
    ]
    
    DURATION_UNIT_CHOICES = [
        ('days', 'Days'),
        ('months', 'Months'),
        ('years', 'Years'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='membership_plans',
        null=True,
        blank=True
    )
    
    name = models.CharField(max_length=100)
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='silver')
    description = models.TextField(blank=True)
    
    # Pricing - vehicle type based (like services)
    hatchback_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Membership price for Hatchback owners'
    )
    sedan_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Membership price for Sedan owners'
    )
    suv_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Membership price for SUV owners'
    )
    
    # GST
    gst_applicable = models.BooleanField(default=True)
    gst_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=18.00,
        help_text='GST percentage'
    )
    
    # Duration
    duration_value = models.PositiveIntegerField(
        default=12,
        help_text='Duration value (e.g., 12 for 12 months)'
    )
    duration_unit = models.CharField(
        max_length=10,
        choices=DURATION_UNIT_CHOICES,
        default='months'
    )
    
    # Benefits
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Default discount percentage on services'
    )
    
    # Free services/washes included
    free_washes_count = models.PositiveIntegerField(
        default=0,
        help_text='Number of free washes included'
    )
    free_interior_cleaning_count = models.PositiveIntegerField(
        default=0,
        help_text='Number of free interior cleaning included'
    )
    
    # Coupons
    coupons_per_month = models.PositiveIntegerField(
        default=0,
        help_text='Number of coupons generated per month'
    )
    coupon_discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=10,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Discount percentage for generated coupons'
    )
    
    # Priority
    priority_booking = models.BooleanField(
        default=False,
        help_text='Priority booking for members'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_popular = models.BooleanField(
        default=False,
        help_text='Mark as popular/recommended plan'
    )
    
    # Display order
    display_order = models.PositiveIntegerField(default=0)
    
    # Branch specific
    is_global = models.BooleanField(default=True)
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='membership_plans'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'membership_plans'
        ordering = ['display_order', 'tier']
        verbose_name = 'Membership Plan'
        verbose_name_plural = 'Membership Plans'
        # Plan names unique per company
        unique_together = [['company', 'name']]
    
    def __str__(self):
        return f"{self.name} ({self.get_tier_display()})"
    
    def get_price_for_vehicle_type(self, vehicle_type):
        """Get price based on vehicle type."""
        price_map = {
            'hatchback': self.hatchback_price,
            'sedan': self.sedan_price,
            'suv': self.suv_price,
        }
        price = price_map.get(vehicle_type)
        # Return sedan price as default if vehicle type is unknown, else return 0
        if price is not None:
            return price
        else:
            return self.sedan_price if self.sedan_price is not None else Decimal('0')
    
    def get_duration_in_days(self):
        """Convert duration to days."""
        if self.duration_unit == 'days':
            return self.duration_value
        elif self.duration_unit == 'months':
            return self.duration_value * 30
        elif self.duration_unit == 'years':
            return self.duration_value * 365
        return self.duration_value


class MembershipBenefit(models.Model):
    """
    Individual benefits included in a membership plan.
    Allows for flexible benefit configuration.
    """
    
    BENEFIT_TYPE_CHOICES = [
        ('free_service', 'Free Service'),
        ('discount', 'Discount'),
        ('priority', 'Priority Access'),
        ('addon', 'Free Add-on'),
        ('other', 'Other Benefit'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='membership_benefits',
        null=True,
        blank=True
    )
    
    plan = models.ForeignKey(
        MembershipPlan,
        on_delete=models.CASCADE,
        related_name='benefits'
    )
    
    benefit_type = models.CharField(max_length=20, choices=BENEFIT_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # For free services
    service_package = models.ForeignKey(
        'services.ServicePackage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='membership_benefits'
    )
    service_count = models.PositiveIntegerField(
        default=0,
        help_text='Number of times this service is free'
    )
    
    # For discounts
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # NEW: Fixed amount discount (e.g., ₹100 OFF)
    discount_fixed_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Fixed discount amount (e.g., ₹100 OFF)'
    )
    
    # NEW: Coupon count for this benefit
    coupon_count = models.PositiveIntegerField(
        default=0,
        help_text='Number of coupons to generate for this benefit (0 = no coupons, use direct counter)'
    )
    
    # NEW: One-time benefit flag
    is_one_time = models.BooleanField(
        default=False,
        help_text='Can only be used once (e.g., First wash 50% OFF)'
    )
    
    # NEW: Applicable service categories (hybrid approach)
    applicable_categories = models.JSONField(
        default=list,
        blank=True,
        help_text='Service categories this benefit applies to (e.g., ["wash", "polish"]). Leave empty for universal benefits.'
    )
    
    is_active = models.BooleanField(default=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'membership_benefits'
        ordering = ['benefit_type', 'title']
    
    def __str__(self):
        return f"{self.plan.name} - {self.title}"


class CustomerMembership(models.Model):
    """
    Customer's active/past membership subscriptions.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending Payment'),
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('suspended', 'Suspended'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='customer_memberships',
        null=True,
        blank=True
    )
    
    # Unique membership ID
    membership_id = models.CharField(
        max_length=20,
        unique=True,
        editable=False
    )
    
    customer = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    vehicle = models.ForeignKey(
        'customers.Vehicle',
        on_delete=models.CASCADE,
        related_name='memberships',
        help_text='Vehicle this membership is for'
    )
    plan = models.ForeignKey(
        MembershipPlan,
        on_delete=models.PROTECT,
        related_name='customer_memberships'
    )
    
    # Vehicle type at purchase (for pricing reference)
    vehicle_type = models.CharField(
        max_length=20,
        choices=[
            ('hatchback', 'Hatchback'),
            ('sedan', 'Sedan'),
            ('suv', 'SUV'),
        ],
        default='sedan'
    )
    
    # Pricing at purchase time
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_paid = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Dates
    purchase_date = models.DateTimeField(default=timezone.now)
    start_date = models.DateField()
    end_date = models.DateField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Usage tracking
    washes_used = models.PositiveIntegerField(default=0)
    interior_cleanings_used = models.PositiveIntegerField(default=0)
    
    # Payment info
    payment_method = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    
    # Who created this (for admin-created memberships)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_memberships'
    )
    
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        related_name='customer_memberships'
    )
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'customer_memberships'
        ordering = ['-purchase_date']
        verbose_name = 'Customer Membership'
        verbose_name_plural = 'Customer Memberships'
    
    def save(self, *args, **kwargs):
        if not self.membership_id:
            self.membership_id = self._generate_membership_id()
        super().save(*args, **kwargs)
    
    def _generate_membership_id(self):
        """Generate unique membership ID like MEM-2024-XXXXX."""
        year = timezone.now().year
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        return f"MEM-{year}-{random_part}"
    
    def __str__(self):
        return f"{self.membership_id} - {self.customer.name}"
    
    @property
    def is_active(self):
        """Check if membership is currently active."""
        today = timezone.now().date()
        return self.status == 'active' and self.start_date <= today <= self.end_date
    
    @property
    def days_remaining(self):
        """Days remaining in membership."""
        if not self.is_active:
            return 0
        today = timezone.now().date()
        return max(0, (self.end_date - today).days)
    
    @property
    def washes_remaining(self):
        """Remaining free washes."""
        return max(0, self.plan.free_washes_count - self.washes_used)
    
    @property
    def interior_cleanings_remaining(self):
        """Remaining free interior cleanings."""
        return max(0, self.plan.free_interior_cleaning_count - self.interior_cleanings_used)
    
    def use_free_wash(self):
        """Use one free wash."""
        if self.washes_remaining > 0:
            self.washes_used += 1
            self.save(update_fields=['washes_used'])
            return True
        return False
    
    def use_free_interior_cleaning(self):
        """Use one free interior cleaning."""
        if self.interior_cleanings_remaining > 0:
            self.interior_cleanings_used += 1
            self.save(update_fields=['interior_cleanings_used'])
            return True
        return False


class MembershipBenefitUsage(models.Model):
    """
    Track usage of individual membership benefits.
    Links benefits to generated coupons and tracks redemption.
    """
    
    customer_membership = models.ForeignKey(
        CustomerMembership,
        on_delete=models.CASCADE,
        related_name='benefit_usages'
    )
    benefit = models.ForeignKey(
        MembershipBenefit,
        on_delete=models.CASCADE,
        related_name='usages'
    )
    
    # Coupon tracking
    total_coupons_allocated = models.PositiveIntegerField(
        default=0,
        help_text='Total number of coupons allocated for this benefit'
    )
    coupons_used = models.PositiveIntegerField(
        default=0,
        help_text='Number of coupons already used'
    )
    
    # One-time benefit tracking
    is_one_time = models.BooleanField(
        default=False,
        help_text='This benefit can only be used once'
    )
    has_been_used = models.BooleanField(
        default=False,
        help_text='Whether this one-time benefit has been used'
    )
    
    # Usage timestamps
    first_used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When this benefit was first used'
    )
    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When this benefit was last used'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'membership_benefit_usages'
        unique_together = ['customer_membership', 'benefit']
        ordering = ['-created_at']
        verbose_name = 'Membership Benefit Usage'
        verbose_name_plural = 'Membership Benefit Usages'
        indexes = [
            models.Index(fields=['customer_membership', 'benefit']),
            models.Index(fields=['customer_membership', 'has_been_used']),
        ]
    
    def __str__(self):
        return f"{self.customer_membership.membership_id} - {self.benefit.title}"
    
    @property
    def coupons_remaining(self):
        """Calculate remaining coupons."""
        if self.is_one_time and self.has_been_used:
            return 0
        return max(0, self.total_coupons_allocated - self.coupons_used)
    
    @property
    def is_available(self):
        """Check if this benefit is still available for use."""
        if self.is_one_time and self.has_been_used:
            return False
        if self.total_coupons_allocated > 0 and self.coupons_remaining <= 0:
            return False
        return True
    
    def use_coupon(self):
        """Mark one coupon as used."""
        if not self.is_available:
            return False
        
        if self.is_one_time:
            self.has_been_used = True
            self.first_used_at = self.first_used_at or timezone.now()
            self.last_used_at = timezone.now()
        else:
            if self.coupons_remaining > 0:
                self.coupons_used += 1
                self.first_used_at = self.first_used_at or timezone.now()
                self.last_used_at = timezone.now()
            else:
                return False
        
        self.save()
        return True


class Coupon(models.Model):
    """
    Discount coupons - can be generated from memberships or created manually.
    """
    
    COUPON_TYPE_CHOICES = [
        ('percentage', 'Percentage Discount'),
        ('fixed', 'Fixed Amount Discount'),
        ('free_service', 'Free Service'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('used', 'Used'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='coupons',
        null=True,
        blank=True
    )
    
    # Unique coupon code
    code = models.CharField(max_length=20, unique=True, db_index=True)
    
    coupon_type = models.CharField(max_length=20, choices=COUPON_TYPE_CHOICES, default='percentage')
    
    # Discount value
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Fixed discount amount'
    )
    
    # Maximum discount cap
    max_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Maximum discount amount (for percentage coupons)'
    )
    
    # Minimum order requirement
    min_order_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Minimum order value to use this coupon'
    )
    
    # Free service (if coupon_type is free_service)
    free_service = models.ForeignKey(
        'services.ServicePackage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coupons'
    )
    
    # Validity
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField()
    
    # Usage limits
    usage_limit = models.PositiveIntegerField(
        default=1,
        help_text='How many times this coupon can be used (0 = unlimited)'
    )
    times_used = models.PositiveIntegerField(default=0)
    
    # User restrictions
    is_single_user = models.BooleanField(
        default=False,
        help_text='Can only be used by the assigned customer'
    )
    customer = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='coupons',
        help_text='Customer this coupon belongs to (for membership coupons)'
    )
    
    # Source - membership or manual
    source_membership = models.ForeignKey(
        CustomerMembership,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='generated_coupons'
    )
    is_membership_coupon = models.BooleanField(default=False)
    
    # NEW: Link to specific benefit
    source_benefit = models.ForeignKey(
        MembershipBenefit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_coupons',
        help_text='The membership benefit this coupon was generated from'
    )
    benefit_usage = models.ForeignKey(
        MembershipBenefitUsage,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='generated_coupons',
        help_text='The benefit usage record this coupon belongs to'
    )
    
    # Applicable services (blank = all services)
    applicable_services = models.ManyToManyField(
        'services.ServicePackage',
        blank=True,
        related_name='applicable_coupons'
    )
    
    # NEW: Applicable service categories (hybrid approach)
    applicable_categories = models.JSONField(
        default=list,
        blank=True,
        help_text='Service categories this coupon applies to (e.g., ["wash", "polish"]). Leave empty for universal coupons.'
    )
    
    # Branch restrictions
    is_global = models.BooleanField(default=True)
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='coupons'
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    description = models.TextField(blank=True)
    terms_conditions = models.TextField(blank=True)
    
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_coupons'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'coupons'
        ordering = ['-created_at']
        verbose_name = 'Coupon'
        verbose_name_plural = 'Coupons'
    
    def __str__(self):
        return f"{self.code} ({self.get_coupon_type_display()})"
    
    @classmethod
    def generate_code(cls, prefix='K3', length=8):
        """Generate a unique coupon code."""
        while True:
            random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
            code = f"{prefix}{random_part}"
            if not cls.objects.filter(code=code).exists():
                return code
    
    def is_valid(self, customer=None, order_value=None):
        """Check if coupon is valid for use."""
        now = timezone.now()
        
        # Check status
        if self.status != 'active':
            return False, f"Coupon is {self.get_status_display()}"
        
        # Check validity dates
        if now < self.valid_from:
            return False, "Coupon is not yet valid"
        if now > self.valid_until:
            return False, "Coupon has expired"
        
        # Check usage limit
        if self.usage_limit > 0 and self.times_used >= self.usage_limit:
            return False, "Coupon usage limit reached"
        
        # Check customer restriction
        if self.is_single_user and self.customer:
            if not customer or customer.id != self.customer.id:
                return False, "This coupon is not valid for your account"
        
        # Check minimum order value
        if order_value and order_value < self.min_order_value:
            return False, f"Minimum order value of ₹{self.min_order_value} required"
        
        return True, "Valid"
    
    def calculate_discount(self, order_value):
        """Calculate discount amount for given order value."""
        if self.coupon_type == 'free_service':
            # Free service = full order value discount
            return order_value
        elif self.coupon_type == 'percentage':
            discount = (order_value * self.discount_percentage) / Decimal('100')
            if self.max_discount and discount > self.max_discount:
                discount = self.max_discount
            return discount
        elif self.coupon_type == 'fixed':
            return min(self.discount_amount, order_value)
        return Decimal('0')
    
    def use(self):
        """Mark coupon as used (increment usage count)."""
        self.times_used += 1
        if self.usage_limit > 0 and self.times_used >= self.usage_limit:
            self.status = 'used'
        self.save(update_fields=['times_used', 'status'])


class CouponUsage(models.Model):
    """
    Track each usage of a coupon.
    """
    
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.CASCADE,
        related_name='usages'
    )
    customer = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='coupon_usages'
    )
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='coupon_usages'
    )
    
    discount_applied = models.DecimalField(max_digits=10, decimal_places=2)
    order_value = models.DecimalField(max_digits=10, decimal_places=2)
    
    used_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'coupon_usages'
        ordering = ['-used_at']
        verbose_name = 'Coupon Usage'
        verbose_name_plural = 'Coupon Usages'
    
    def __str__(self):
        return f"{self.coupon.code} used by {self.customer.name}"


class MembershipCouponGeneration(models.Model):
    """
    Track monthly coupon generation for memberships.
    """
    
    membership = models.ForeignKey(
        CustomerMembership,
        on_delete=models.CASCADE,
        related_name='coupon_generations'
    )
    
    month = models.PositiveIntegerField()
    year = models.PositiveIntegerField()
    
    coupons_generated = models.PositiveIntegerField(default=0)
    generated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'membership_coupon_generations'
        unique_together = ['membership', 'month', 'year']
        ordering = ['-year', '-month']
    
    def __str__(self):
        return f"{self.membership.membership_id} - {self.month}/{self.year}"
