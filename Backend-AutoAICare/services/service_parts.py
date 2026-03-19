"""
Service-Parts relationship model for automatic inventory deduction.
Links service packages to required parts.
"""
from django.db import models
from decimal import Decimal
from companies.managers import CompanyManager


class ServicePackagePart(models.Model):
    """
    Links service packages to required parts for automatic inventory deduction.
    When a service is performed, the system automatically deducts the required parts.
    """
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='service_package_parts',
        null=True,
        blank=True
    )
    
    package = models.ForeignKey(
        'services.ServicePackage',
        on_delete=models.CASCADE,
        related_name='required_parts',
        help_text='Service package that requires this part'
    )
    
    part = models.ForeignKey(
        'jobcards.Part',
        on_delete=models.CASCADE,
        related_name='used_in_services',
        help_text='Part required for this service'
    )
    
    # Quantity configuration
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Quantity of this part used per service (e.g., 0.05 for 50ml of 1L bottle)'
    )
    
    # Vehicle type specific quantities (optional - if different vehicles need different amounts)
    hatchback_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Override quantity for hatchback (if different from default)'
    )
    sedan_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Override quantity for sedan (if different from default)'
    )
    suv_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Override quantity for SUV (if different from default)'
    )
    bike_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Override quantity for bike (if different from default)'
    )
    
    is_optional = models.BooleanField(
        default=False,
        help_text='If True, this part is optional and won\'t block service if out of stock'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='If False, this part won\'t be auto-deducted'
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Additional notes about this part usage'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'service_package_parts'
        verbose_name = 'Service Package Part'
        verbose_name_plural = 'Service Package Parts'
        ordering = ['package', 'part']
        unique_together = [['package', 'part', 'company']]
        indexes = [
            models.Index(fields=['package']),
            models.Index(fields=['part']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.package.name} → {self.part.name} ({self.quantity} {self.part.unit})"
    
    def get_quantity_for_vehicle_type(self, vehicle_type):
        """
        Get the quantity needed for a specific vehicle type.
        Returns vehicle-specific quantity if set, otherwise returns default quantity.
        """
        quantity_map = {
            'hatchback': self.hatchback_quantity,
            'sedan': self.sedan_quantity,
            'suv': self.suv_quantity,
            'bike': self.bike_quantity,
        }
        
        # Return vehicle-specific quantity if set, otherwise default
        vehicle_quantity = quantity_map.get(vehicle_type)
        return vehicle_quantity if vehicle_quantity is not None else self.quantity
    
    def check_stock_availability(self, vehicle_type='sedan', multiplier=1):
        """
        Check if there's enough stock for this part.
        
        Args:
            vehicle_type: Type of vehicle for quantity calculation
            multiplier: Multiply quantity (e.g., for multiple services)
        
        Returns:
            tuple: (is_available, required_quantity, current_stock)
        """
        required_quantity = self.get_quantity_for_vehicle_type(vehicle_type) * multiplier
        current_stock = self.part.stock
        
        is_available = current_stock >= required_quantity
        
        return is_available, required_quantity, current_stock
    
    def deduct_stock(self, vehicle_type='sedan', multiplier=1, jobcard=None, service_package=None):
        """
        Deduct stock for this part and create PartUsed record.
        
        Args:
            vehicle_type: Type of vehicle for quantity calculation
            multiplier: Multiply quantity (e.g., for multiple services)
            jobcard: JobCard instance to link the part usage
            service_package: ServicePackage instance this part belongs to (for grouping)
        
        Returns:
            PartUsed instance if successful, None if insufficient stock
        
        Raises:
            ValueError: If insufficient stock and part is not optional
        """
        import math
        from jobcards.models import PartUsed
        
        required_quantity = self.get_quantity_for_vehicle_type(vehicle_type) * multiplier
        
        # Convert to integer units that Part.stock (IntegerField) expects.
        # Always ceil so fractional configs (e.g. 0.05 litres → 1 bottle deducted) work.
        stock_to_deduct = max(1, math.ceil(float(required_quantity)))
        
        # Check stock availability using the integer amount we'll actually deduct
        if self.part.stock < stock_to_deduct:
            if self.is_optional:
                # Optional part - skip if out of stock
                return None
            else:
                raise ValueError(
                    f"Insufficient stock for {self.part.name}. "
                    f"Required: {stock_to_deduct} {self.part.unit}, "
                    f"Available: {self.part.stock} {self.part.unit}"
                )
        
        # Deduct stock (Part.deduct_stock expects a positive integer)
        self.part.deduct_stock(stock_to_deduct)
        
        # Create PartUsed record if jobcard is provided
        if jobcard:
            part_used = PartUsed.objects.create(
                company=self.company,
                jobcard=jobcard,
                part=self.part,
                part_name=self.part.name,
                quantity=stock_to_deduct,
                price=self.part.selling_price,
                cost_price=self.part.cost_price,
                is_service_default=True,
                service_package=service_package or self.package,
            )
            return part_used
        
        return None

