from django.db import models
from django.conf import settings
from companies.managers import CompanyManager


# Import vehicle data models
from .vehicle_data_models import VehicleBrand, VehicleModel, VehicleColor


class Customer(models.Model):
    """Customer profile extending the User model."""
    
    MEMBERSHIP_CHOICES = [
        ('basic', 'Basic'),
        ('silver', 'Silver'),
        ('gold', 'Gold'),
        ('platinum', 'Platinum'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='customers',
        null=True,  # Temporary for migration
        blank=True
    )
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='customer_profile')
    reward_points = models.IntegerField(default=0)
    membership_type = models.CharField(max_length=20, choices=MEMBERSHIP_CHOICES, default='basic')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'customers'
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.name} - {self.membership_type}"
    
    def add_reward_points(self, points):
        """Add reward points to customer."""
        self.reward_points += points
        self.save()
    
    def redeem_reward_points(self, points):
        """Redeem reward points."""
        if self.reward_points >= points:
            self.reward_points -= points
            self.save()
            return True
        return False


class Vehicle(models.Model):
    """Vehicle model associated with customers."""
    
    VEHICLE_TYPE_CHOICES = [
        ('hatchback', 'Hatchback'),
        ('sedan', 'Sedan'),
        ('suv', 'SUV'),
        ('bike', 'Bike'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='vehicles',
        null=True,  # Temporary for migration
        blank=True
    )
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='vehicles')
    registration_number = models.CharField(max_length=20)
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    color = models.CharField(max_length=50)
    year = models.IntegerField(null=True, blank=True)
    
    # Vehicle type for pricing (auto-detected or manually set)
    vehicle_type = models.CharField(
        max_length=20,
        choices=VEHICLE_TYPE_CHOICES,
        default='sedan',
        help_text='Vehicle type for determining service pricing'
    )
    
    # Service history tracking
    last_service_date = models.DateField(null=True, blank=True)
    next_service_due = models.DateField(null=True, blank=True)
    service_interval_days = models.IntegerField(default=90, help_text='Service interval in days')
    odometer_reading = models.IntegerField(null=True, blank=True, help_text='Current odometer reading in KM')
    service_interval_km = models.IntegerField(default=5000, help_text='Service interval in kilometers')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'vehicles'
        verbose_name = 'Vehicle'
        verbose_name_plural = 'Vehicles'
        ordering = ['-created_at']
        # Registration number unique within company
        unique_together = [['company', 'registration_number']]
    
    def __str__(self):
        return f"{self.brand} {self.model} - {self.registration_number}"
    
    def auto_detect_vehicle_type(self):
        """
        Attempt to auto-detect vehicle type by matching brand and model
        to VehicleModel records in the database.
        Returns the detected vehicle_type or None if no match found.
        """
        try:
            # Try to find a matching VehicleModel
            vehicle_model = VehicleModel.objects.filter(
                brand__name__iexact=self.brand,
                name__iexact=self.model,
                is_active=True
            ).first()
            
            if vehicle_model:
                return vehicle_model.vehicle_type
        except Exception as e:
            # If VehicleModel doesn't exist or any error occurs, return None
            pass
        
        return None
    
    def save(self, *args, **kwargs):
        """Override save to auto-detect vehicle type if not set."""
        # Only auto-detect if vehicle_type is the default 'sedan' and we have brand/model
        if self.vehicle_type == 'sedan' and self.brand and self.model:
            detected_type = self.auto_detect_vehicle_type()
            if detected_type:
                self.vehicle_type = detected_type
        
        super().save(*args, **kwargs)
