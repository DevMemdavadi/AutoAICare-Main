from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from bookings.models import Booking
from companies.managers import CompanyManager


class Feedback(models.Model):
    """Feedback model for service ratings and reviews."""
    
    CATEGORY_CHOICES = [
        ('service_quality', 'Service Quality'),
        ('staff_behavior', 'Staff Behavior'),
        ('pricing', 'Pricing'),
        ('timeliness', 'Timeliness'),
        ('facility', 'Facility'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewed', 'Reviewed'),
        ('resolved', 'Resolved'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='feedback',
        null=True,
        blank=True
    )
    
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='feedback')
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    review = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='service_quality')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    suggestions = models.TextField(blank=True, null=True, help_text='Customer suggestions for improvement')
    helpful_count = models.IntegerField(default=0, help_text='Number of people who found this helpful')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'feedback'
        verbose_name = 'Feedback'
        verbose_name_plural = 'Feedback'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Feedback for Booking #{self.booking.id} - {self.rating} stars"
