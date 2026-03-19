from django.db import models
from django.utils import timezone
from datetime import timedelta
from customers.models import Customer, Vehicle
from services.models import ServicePackage, AddOn


class Appointment(models.Model):
    """
    Customer appointment requests that require admin approval before becoming bookings.
    Designed for fast customer flow with essential fields only.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('converted', 'Converted to Booking'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled by Customer'),
    ]
    
    VEHICLE_TYPE_CHOICES = [
        ('hatchback', 'Hatchback'),
        ('sedan', 'Sedan'),
        ('suv', 'SUV'),
        ('bike', 'Bike'),
    ]
    
    # Customer Information
    customer = models.ForeignKey(
        Customer, 
        on_delete=models.CASCADE, 
        related_name='appointments'
    )
    vehicle = models.ForeignKey(
        Vehicle, 
        on_delete=models.CASCADE, 
        related_name='appointments',
        null=True, 
        blank=True
    )
    
    # Service Details
    package = models.ForeignKey(
        ServicePackage, 
        on_delete=models.PROTECT, 
        related_name='appointments',
        null=True, 
        blank=True
    )
    addons = models.ManyToManyField(
        AddOn, 
        blank=True, 
        related_name='appointments'
    )
    vehicle_type = models.CharField(
        max_length=20, 
        choices=VEHICLE_TYPE_CHOICES,
        default='sedan'
    )
    
    # Scheduling - Customer provides preferred + alternate time
    preferred_datetime = models.DateTimeField(
        help_text='Customer preferred date/time'
    )
    alternate_datetime = models.DateTimeField(
        null=True, 
        blank=True, 
        help_text='Customer alternate date/time (optional)'
    )
    
    # Confirmed datetime (set by admin during approval)
    confirmed_datetime = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Final confirmed datetime (set by admin)'
    )
    
    # Additional Details
    pickup_required = models.BooleanField(default=False)
    location = models.TextField(
        blank=True, 
        null=True,
        help_text='Pickup/Service location'
    )
    notes = models.TextField(
        blank=True, 
        null=True,
        help_text='Customer notes'
    )
    
    # Branch
    branch = models.ForeignKey(
        'branches.Branch', 
        on_delete=models.CASCADE, 
        related_name='appointments'
    )
    
    # Status & Workflow
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending'
    )
    
    # Admin Actions
    reviewed_by = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='reviewed_appointments'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(
        blank=True, 
        null=True, 
        help_text='Admin notes/rejection reason'
    )
    
    # Conversion to Booking
    booking = models.OneToOneField(
        'bookings.Booking', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='source_appointment'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Appointment expires after this datetime'
    )
    
    class Meta:
        db_table = 'appointments'
        verbose_name = 'Appointment'
        verbose_name_plural = 'Appointments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Appointment #{self.id} - {self.customer.user.name} - {self.status}"
    
    def save(self, *args, **kwargs):
        # Set expiry date (7 days from creation) if not set
        if not self.expires_at and not self.pk:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        """Check if appointment has expired."""
        if self.status in ['approved', 'converted', 'rejected', 'cancelled']:
            return False
        return self.expires_at and timezone.now() > self.expires_at
    
    @property
    def can_reschedule(self):
        """Customer can reschedule only if not yet approved."""
        return self.status == 'pending'
    
    @property
    def estimated_price(self):
        """Calculate estimated price based on package and vehicle type."""
        if not self.package:
            return 0
        
        price = self.package.get_price_for_vehicle_type(self.vehicle_type)
        
        # Add addons if any
        if self.pk:
            for addon in self.addons.all():
                price += addon.price
        
        return price
    
    def approve(self, user, confirmed_datetime=None):
        """Approve the appointment."""
        self.status = 'approved'
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.confirmed_datetime = confirmed_datetime or self.preferred_datetime
        self.save()
    
    def reject(self, user, reason=''):
        """Reject the appointment with a reason."""
        self.status = 'rejected'
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.admin_notes = reason
        self.save()
    
    def cancel(self):
        """Customer cancels the appointment."""
        if self.status == 'pending':
            self.status = 'cancelled'
            self.save()
            return True
        return False
    
    def reschedule(self, preferred_datetime, alternate_datetime=None):
        """Reschedule the appointment (only if pending)."""
        if not self.can_reschedule:
            return False
        
        self.preferred_datetime = preferred_datetime
        self.alternate_datetime = alternate_datetime
        self.save()
        return True


class AppointmentSlot(models.Model):
    """
    Pre-defined appointment slots for capacity management.
    Admin can set available slots per branch per day.
    """
    
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        related_name='appointment_slots'
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    max_bookings = models.PositiveIntegerField(
        default=5,
        help_text='Maximum appointments for this slot'
    )
    is_available = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'appointment_slots'
        unique_together = ['branch', 'date', 'start_time']
        ordering = ['date', 'start_time']
    
    def __str__(self):
        return f"{self.branch.name} - {self.date} {self.start_time}"
    
    @property
    def current_bookings_count(self):
        """Count of appointments for this slot."""
        from datetime import datetime
        from django.utils import timezone
        
        # Create timezone-aware datetime objects
        slot_start = timezone.make_aware(datetime.combine(self.date, self.start_time))
        slot_end = timezone.make_aware(datetime.combine(self.date, self.end_time))
        
        return Appointment.objects.filter(
            branch=self.branch,
            status__in=['pending', 'approved'],
            preferred_datetime__gte=slot_start,
            preferred_datetime__lt=slot_end
        ).count()
    
    @property
    def available_slots(self):
        """Number of available slots."""
        return max(0, self.max_bookings - self.current_bookings_count)
    
    @property
    def is_slot_available(self):
        """Check if slot has availability."""
        return self.is_available and self.available_slots > 0
