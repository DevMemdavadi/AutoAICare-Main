"""
Extended CRM models for advanced customer management
"""
from django.db import models
from django.contrib.auth import get_user_model
from .models import Customer

User = get_user_model()


class CustomerTag(models.Model):
    """Tags for customer categorization"""
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default='#3B82F6', help_text='Hex color code')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'customer_tags'
        verbose_name = 'Customer Tag'
        verbose_name_plural = 'Customer Tags'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class CustomerSegment(models.Model):
    """Customer segmentation for targeted marketing"""
    
    SEGMENT_TYPES = [
        ('vip', 'VIP'),
        ('regular', 'Regular'),
        ('inactive', 'Inactive'),
        ('new', 'New'),
        ('at_risk', 'At Risk'),
        ('corporate', 'Corporate'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='segments')
    segment_type = models.CharField(max_length=20, choices=SEGMENT_TYPES)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='customer_segments_assigned')
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'customer_segments'
        verbose_name = 'Customer Segment'
        verbose_name_plural = 'Customer Segments'
        unique_together = ['customer', 'segment_type']
    
    def __str__(self):
        return f"{self.customer.user.name} - {self.get_segment_type_display()}"


class CustomerNote(models.Model):
    """Notes and comments about customers"""
    
    CATEGORY_CHOICES = [
        ('general', 'General'),
        ('preference', 'Preference'),
        ('complaint', 'Complaint'),
        ('feedback', 'Feedback'),
        ('follow_up', 'Follow Up'),
        ('special_request', 'Special Request'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='notes')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    note = models.TextField()
    is_important = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='customer_notes_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer_notes'
        verbose_name = 'Customer Note'
        verbose_name_plural = 'Customer Notes'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.customer.user.name} - {self.get_category_display()} ({self.created_at.strftime('%Y-%m-%d')})"


class CustomerPreference(models.Model):
    """Customer preferences and settings"""
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='preferences')
    key = models.CharField(max_length=100)
    value = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer_preferences'
        verbose_name = 'Customer Preference'
        verbose_name_plural = 'Customer Preferences'
        unique_together = ['customer', 'key']
    
    def __str__(self):
        return f"{self.customer.user.name} - {self.key}"


class CustomerActivity(models.Model):
    """Activity log for customer interactions"""
    
    ACTIVITY_TYPES = [
        ('booking_created', 'Booking Created'),
        ('booking_completed', 'Booking Completed'),
        ('payment_made', 'Payment Made'),
        ('call_made', 'Call Made'),
        ('call_received', 'Call Received'),
        ('email_sent', 'Email Sent'),
        ('sms_sent', 'SMS Sent'),
        ('whatsapp_sent', 'WhatsApp Sent'),
        ('note_added', 'Note Added'),
        ('complaint_logged', 'Complaint Logged'),
        ('feedback_given', 'Feedback Given'),
        ('membership_purchased', 'Membership Purchased'),
        ('referral_made', 'Referral Made'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES)
    description = models.TextField()
    reference_type = models.CharField(max_length=50, blank=True, help_text='Type of related object')
    reference_id = models.IntegerField(null=True, blank=True, help_text='ID of related object')
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='customer_activities_created')
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'customer_activities'
        verbose_name = 'Customer Activity'
        verbose_name_plural = 'Customer Activities'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['customer', '-timestamp']),
            models.Index(fields=['activity_type', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.customer.user.name} - {self.get_activity_type_display()} ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"


class CustomerLifecycle(models.Model):
    """Track customer lifecycle stages"""
    
    LIFECYCLE_STAGES = [
        ('lead', 'Lead'),
        ('prospect', 'Prospect'),
        ('active', 'Active'),
        ('at_risk', 'At Risk'),
        ('churned', 'Churned'),
        ('won_back', 'Won Back'),
    ]
    
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name='lifecycle')
    current_stage = models.CharField(max_length=20, choices=LIFECYCLE_STAGES, default='active')
    previous_stage = models.CharField(max_length=20, choices=LIFECYCLE_STAGES, blank=True)
    stage_changed_at = models.DateTimeField(auto_now=True)
    acquisition_source = models.CharField(max_length=50, blank=True, help_text='Walk-in, Referral, Online, Marketing')
    acquisition_date = models.DateField(null=True, blank=True)
    last_interaction_date = models.DateField(null=True, blank=True)
    total_lifetime_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    customer_score = models.IntegerField(default=0, help_text='Calculated customer score based on activity')
    
    class Meta:
        db_table = 'customer_lifecycle'
        verbose_name = 'Customer Lifecycle'
        verbose_name_plural = 'Customer Lifecycles'
    
    def __str__(self):
        return f"{self.customer.user.name} - {self.get_current_stage_display()}"
    
    def update_stage(self, new_stage):
        """Update lifecycle stage"""
        self.previous_stage = self.current_stage
        self.current_stage = new_stage
        self.save()


class ServiceReminder(models.Model):
    """Service reminders for customers"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='service_reminders')
    vehicle = models.ForeignKey('Vehicle', on_delete=models.CASCADE, related_name='service_reminders', null=True, blank=True)
    due_date = models.DateField()
    reminder_type = models.CharField(max_length=50, default='regular_service')
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_at = models.DateTimeField(null=True, blank=True)
    sent_via = models.CharField(max_length=20, blank=True, help_text='email, sms, whatsapp')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'service_reminders'
        verbose_name = 'Service Reminder'
        verbose_name_plural = 'Service Reminders'
        ordering = ['due_date']
        indexes = [
            models.Index(fields=['customer', 'due_date']),
            models.Index(fields=['status', 'due_date']),
        ]
    
    def __str__(self):
        return f"{self.customer.user.name} - {self.reminder_type} - {self.due_date}"


class ReminderHistory(models.Model):
    """History of all reminders sent to customers"""
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='reminder_history')
    reminder_type = models.CharField(max_length=50)
    sent_via = models.CharField(max_length=20, help_text='email, sms, whatsapp')
    sent_at = models.DateTimeField(auto_now_add=True)
    opened = models.BooleanField(default=False)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked = models.BooleanField(default=False)
    clicked_at = models.DateTimeField(null=True, blank=True)
    content = models.TextField(blank=True)
    
    class Meta:
        db_table = 'reminder_history'
        verbose_name = 'Reminder History'
        verbose_name_plural = 'Reminder Histories'
        ordering = ['-sent_at']
    
    def __str__(self):
        return f"{self.customer.user.name} - {self.reminder_type} - {self.sent_at.strftime('%Y-%m-%d')}"
