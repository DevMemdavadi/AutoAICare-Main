from django.db import models
from decimal import Decimal
from companies.managers import CompanyManager


class ServicePackage(models.Model):
    """Service package model with vehicle-type based pricing.
    
    All services ALWAYS have vehicle-type specific pricing (Hatchback, Sedan, SUV).
    """
    
    # Service Category Choices
    CATEGORY_CHOICES = [
        ('wash', 'Car Wash'),
        ('interior', 'Interior Cleaning'),
        ('exterior', 'Exterior Beautification'),
        ('coating', 'Ceramic Coating'),
        ('makeover', 'Car Makeover'),
        ('mechanical', 'Mechanical Services'),
        ('ac_service', 'AC Service'),
        ('polish', 'Body Polish'),
        ('bike_services', 'Bike Services'),
        ('other', 'Other Services'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='service_packages',
        null=True,  # Temporary for migration
        blank=True
    )
    
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(
        max_length=50, 
        choices=CATEGORY_CHOICES, 
        default='other',
        help_text='Service category for grouping'
    )
    
    # Legacy base price field (kept for backward compatibility)
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        help_text='Legacy base price - use vehicle-type prices instead'
    )
    
    # Vehicle-type based pricing (ALWAYS used - primary prices)
    hatchback_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        help_text='Price for Hatchback vehicles'
    )
    sedan_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        help_text='Price for Sedan vehicles'
    )
    suv_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        help_text='Price for SUV vehicles'
    )
    bike_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        help_text='Price for Bike vehicles'
    )
    
    # GST Configuration
    gst_applicable = models.BooleanField(
        default=True,
        help_text='Whether GST is applicable on this service'
    )
    gst_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('18.00'),
        help_text='GST percentage (e.g., 18.00 for 18%)'
    )
    
    duration = models.IntegerField(help_text='Duration in minutes')
    duration_max = models.IntegerField(
        null=True, 
        blank=True,
        help_text='Maximum duration in minutes (for range like 40-50 mins)'
    )
    is_active = models.BooleanField(default=True)
    image = models.ImageField(upload_to='services/', null=True, blank=True)
    
    # Vehicle type compatibility
    VEHICLE_TYPE_CHOICES = [
        ('bike', 'Bike'),
        ('hatchback', 'Hatchback'),
        ('sedan', 'Sedan'),
        ('suv', 'SUV'),
    ]
    compatible_vehicle_types = models.JSONField(
        default=list,
        help_text='List of vehicle types this service is compatible with'
    )
    
    # Branch-specific fields
    is_global = models.BooleanField(default=True, help_text='If True, available to all branches')
    branch = models.ForeignKey(
        'branches.Branch', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='service_packages',
        help_text='Specific branch (only if is_global=False)'
    )
    
    # Service-specific reward configuration
    has_custom_rewards = models.BooleanField(
        default=False,
        help_text='Enable custom reward settings for this service (overrides global settings)'
    )
    
    # Reward tiers (nullable - uses global settings if not set)
    tier_1_minutes = models.IntegerField(
        null=True,
        blank=True,
        help_text='Minutes early for tier 1 reward (service-specific)'
    )
    tier_1_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Reward amount for tier 1 (service-specific)'
    )
    
    tier_2_minutes = models.IntegerField(
        null=True,
        blank=True,
        help_text='Minutes early for tier 2 reward (service-specific)'
    )
    tier_2_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Reward amount for tier 2 (service-specific)'
    )
    
    tier_3_minutes = models.IntegerField(
        null=True,
        blank=True,
        help_text='Minutes early for tier 3 reward (service-specific)'
    )
    tier_3_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Reward amount for tier 3 (service-specific)'
    )
    
    # Deduction rules (nullable - uses global settings if not set)
    deduction_enabled = models.BooleanField(
        null=True,
        blank=True,
        help_text='Enable deductions for late completion (service-specific)'
    )
    deduction_threshold_minutes = models.IntegerField(
        null=True,
        blank=True,
        help_text='Minutes late before deduction applies (service-specific)'
    )
    deduction_per_minute = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Deduction amount per minute late (service-specific)'
    )
    max_deduction_per_job = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Maximum deduction per job (service-specific)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'service_packages'
        verbose_name = 'Service Package'
        verbose_name_plural = 'Service Packages'
        ordering = ['category', 'name']
        # Service name unique within company
        unique_together = [['company', 'name']]
    
    def __str__(self):
        return f"{self.name} - ₹{self.sedan_price} (Bike: ₹{self.bike_price})"
    
    def save(self, *args, **kwargs):
        # Automatically set compatible vehicle types based on category
        if not self.compatible_vehicle_types:
            if self.category == 'bike_services':
                self.compatible_vehicle_types = ['bike']
            else:
                # For car services, compatible with all car types
                self.compatible_vehicle_types = ['hatchback', 'sedan', 'suv']
        super().save(*args, **kwargs)
    
    def get_price_for_vehicle_type(self, vehicle_type):
        """Get the price based on vehicle type. Always returns vehicle-specific price."""
        price_map = {
            'hatchback': self.hatchback_price,
            'sedan': self.sedan_price,
            'suv': self.suv_price,
            'bike': self.bike_price,
        }
        # Default to sedan if invalid vehicle type, fallback to 0 if all are None
        price = price_map.get(vehicle_type, self.sedan_price) or self.sedan_price or self.price or Decimal('0')
        return price
    
    def is_compatible_with_vehicle_type(self, vehicle_type):
        """Check if this service is compatible with the given vehicle type."""
        return vehicle_type in self.compatible_vehicle_types
    
    def calculate_gst(self, base_price):
        """Calculate GST amount for given price."""
        if not self.gst_applicable or not base_price:
            return Decimal('0.00')
        # Ensure base_price is a Decimal before calculation
        if isinstance(base_price, float):
            base_price = Decimal(str(base_price))
        elif not isinstance(base_price, Decimal):
            base_price = Decimal(str(base_price))
        return (base_price * self.gst_rate) / Decimal('100')
    
    def get_price_with_gst(self, vehicle_type='sedan'):
        """Get total price including GST for a vehicle type."""
        base_price = self.get_price_for_vehicle_type(vehicle_type)
        gst_amount = self.calculate_gst(base_price)
        return base_price + gst_amount
    
    def get_duration_display(self):
        """Get duration as display string."""
        if self.duration_max:
            return f"{self.duration}-{self.duration_max} mins"
        return f"{self.duration} mins"


class AddOn(models.Model):
    """Add-on services for packages."""
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='service_addons',
        null=True,  # Temporary for migration
        blank=True
    )
    
    package = models.ForeignKey(ServicePackage, on_delete=models.CASCADE, related_name='addons', null=True, blank=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration = models.IntegerField(help_text='Additional duration in minutes')
    is_active = models.BooleanField(default=True)
    
    # GST Configuration
    gst_applicable = models.BooleanField(
        default=True,
        help_text='Whether GST is applicable on this add-on'
    )
    gst_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('18.00'),
        help_text='GST percentage (e.g., 18.00 for 18%)'
    )
    
    # Branch-specific fields
    is_global = models.BooleanField(default=True, help_text='If True, available to all branches')
    branch = models.ForeignKey(
        'branches.Branch', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='addons',
        help_text='Specific branch (only if is_global=False)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'service_addons'
        verbose_name = 'Add-On'
        verbose_name_plural = 'Add-Ons'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} - ₹{self.price}"
    
    def calculate_gst(self):
        """Calculate GST amount for this add-on."""
        if not self.gst_applicable or not self.price:
            return Decimal('0.00')
        return (self.price * self.gst_rate) / Decimal('100')
    
    def get_price_with_gst(self):
        """Get total price including GST."""
        return self.price + self.calculate_gst()