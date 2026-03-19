from django.db import models


class VehicleBrand(models.Model):
    """Vehicle brand model to store car and bike brands."""
    
    VEHICLE_TYPE_CHOICES = [
        ('car', 'Car'),
        ('bike', 'Bike'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    vehicle_type = models.CharField(max_length=10, choices=VEHICLE_TYPE_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vehicle_brands'
        verbose_name = 'Vehicle Brand'
        verbose_name_plural = 'Vehicle Brands'
        ordering = ['name']
        indexes = [
            models.Index(fields=['vehicle_type']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_vehicle_type_display()})"


class VehicleModel(models.Model):
    """Vehicle model to store specific models for each brand."""
    
    VEHICLE_TYPE_CHOICES = [
        ('hatchback', 'Hatchback'),
        ('sedan', 'Sedan'),
        ('suv', 'SUV'),
        ('bike', 'Bike'),
    ]
    
    brand = models.ForeignKey(VehicleBrand, on_delete=models.CASCADE, related_name='models')
    name = models.CharField(max_length=100)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPE_CHOICES, default='sedan')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vehicle_models'
        verbose_name = 'Vehicle Model'
        verbose_name_plural = 'Vehicle Models'
        ordering = ['name']
        unique_together = [['brand', 'name']]
        indexes = [
            models.Index(fields=['brand', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.brand.name} - {self.name}"


class VehicleColor(models.Model):
    """Common vehicle colors."""
    
    name = models.CharField(max_length=50, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vehicle_colors'
        verbose_name = 'Vehicle Color'
        verbose_name_plural = 'Vehicle Colors'
        ordering = ['name']
    
    def __str__(self):
        return self.name
