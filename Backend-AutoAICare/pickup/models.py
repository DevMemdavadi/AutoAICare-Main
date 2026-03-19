from django.db import models
from django.conf import settings
from bookings.models import Booking


class PickupDropRequest(models.Model):
    """Pickup and drop request for vehicles."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('driver_assigned', 'Driver Assigned'),
        ('picked_up', 'Picked Up'),
        ('in_service', 'In Service'),
        ('delivered', 'Delivered'),
    ]
    
    REQUEST_TYPE_CHOICES = [
        ('pickup', 'Pickup'),
        ('drop', 'Drop'),
    ]
    
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='pickup_request')
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pickup_assignments',
        limit_choices_to={'role': 'supervisor'}
    )
    
    request_type = models.CharField(max_length=10, choices=REQUEST_TYPE_CHOICES, default='pickup')
    
    pickup_time = models.DateTimeField(null=True, blank=True)
    drop_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Additional info
    pickup_notes = models.TextField(blank=True, null=True)
    drop_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pickup_drop_requests'
        verbose_name = 'Pickup/Drop Request'
        verbose_name_plural = 'Pickup/Drop Requests'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Pickup Request #{self.id} - Booking #{self.booking.id} - {self.status}"