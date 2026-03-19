"""
Lead Management Models
Tracks potential customers from inquiry to conversion
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from branches.models import Branch
from companies.managers import CompanyManager

User = get_user_model()


class LeadSource(models.Model):
    """Sources from which leads are generated"""
    
    SOURCE_TYPES = [
        ('website', 'Website'),
        ('walk_in', 'Walk-in'),
        ('phone', 'Phone Call'),
        ('referral', 'Referral'),
        ('social_media', 'Social Media'),
        ('google_ads', 'Google Ads'),
        ('facebook_ads', 'Facebook Ads'),
        ('email_campaign', 'Email Campaign'),
        ('event', 'Event/Exhibition'),
        ('other', 'Other'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='lead_sources',
        null=True,
        blank=True
    )
    
    name = models.CharField(max_length=100)  # Removed unique=True
    source_type = models.CharField(max_length=30, choices=SOURCE_TYPES)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    cost_per_lead = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Average cost per lead from this source')
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'lead_sources'
        verbose_name = 'Lead Source'
        verbose_name_plural = 'Lead Sources'
        ordering = ['name']
        # Make name unique per company instead of globally unique
        unique_together = [['company', 'name']]
    
    def __str__(self):
        return f"{self.name} ({self.get_source_type_display()})"


class Lead(models.Model):
    """Lead/Prospect tracking"""
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('qualified', 'Qualified'),
        ('proposal_sent', 'Proposal Sent'),
        ('negotiation', 'Negotiation'),
        ('won', 'Won (Converted)'),
        ('lost', 'Lost'),
        ('on_hold', 'On Hold'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='leads',
        null=True,
        blank=True
    )
    
    # Basic Information
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    organization = models.CharField(max_length=200, blank=True, help_text='For corporate leads')
    
    # Lead Details
    source = models.ForeignKey(LeadSource, on_delete=models.SET_NULL, null=True, related_name='leads')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    
    # Assignment
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_leads')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='leads')
    
    # Lead Scoring
    score = models.IntegerField(default=0, help_text='Lead quality score (0-100)')
    
    # Interest Details
    interested_services = models.TextField(blank=True, help_text='Services the lead is interested in')
    vehicle_info = models.TextField(blank=True, help_text='Vehicle details if provided')
    budget_range = models.CharField(max_length=100, blank=True)
    expected_close_date = models.DateField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    
    # Conversion
    converted_to_customer = models.BooleanField(default=False)
    converted_at = models.DateTimeField(null=True, blank=True)
    conversion_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text='First booking value')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_contacted_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True, help_text='Additional lead information')
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'leads'
        verbose_name = 'Lead'
        verbose_name_plural = 'Leads'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['source', '-created_at']),
            models.Index(fields=['-score']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.get_status_display()}"
    
    def calculate_score(self):
        """Calculate lead quality score based on various factors"""
        score = 0
        
        # Source quality (0-20 points)
        if self.source:
            if self.source.source_type in ['referral', 'website']:
                score += 20
            elif self.source.source_type in ['walk_in', 'phone']:
                score += 15
            else:
                score += 10
        
        # Contact information completeness (0-20 points)
        if self.phone:
            score += 10
        if self.email:
            score += 10
        
        # Interest level (0-20 points)
        if self.interested_services:
            score += 10
        if self.vehicle_info:
            score += 10
        
        # Budget indication (0-15 points)
        if self.budget_range:
            score += 15
        
        # Response time (0-15 points)
        if self.last_contacted_at:
            days_since_contact = (timezone.now() - self.last_contacted_at).days
            if days_since_contact <= 1:
                score += 15
            elif days_since_contact <= 3:
                score += 10
            elif days_since_contact <= 7:
                score += 5
        
        # Priority (0-10 points)
        priority_scores = {'urgent': 10, 'high': 7, 'medium': 5, 'low': 2}
        score += priority_scores.get(self.priority, 0)
        
        self.score = min(score, 100)
        self.save(update_fields=['score'])
        return self.score
    
    def mark_as_converted(self, customer, booking_value=None):
        """Mark lead as converted to customer"""
        self.status = 'won'
        self.converted_to_customer = True
        self.converted_at = timezone.now()
        if booking_value:
            self.conversion_value = booking_value
        self.save()
        
        # Create conversion record
        LeadConversion.objects.create(
            lead=self,
            customer_id=customer.id,
            converted_at=timezone.now(),
            conversion_value=booking_value or 0
        )


class LeadActivity(models.Model):
    """Activities and interactions with leads"""
    
    ACTIVITY_TYPES = [
        ('call_outbound', 'Outbound Call'),
        ('call_inbound', 'Inbound Call'),
        ('email_sent', 'Email Sent'),
        ('email_received', 'Email Received'),
        ('sms_sent', 'SMS Sent'),
        ('whatsapp_sent', 'WhatsApp Sent'),
        ('meeting', 'Meeting'),
        ('site_visit', 'Site Visit'),
        ('proposal_sent', 'Proposal Sent'),
        ('follow_up', 'Follow-up'),
        ('note_added', 'Note Added'),
        ('status_changed', 'Status Changed'),
    ]
    
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES)
    description = models.TextField()
    outcome = models.CharField(max_length=200, blank=True, help_text='Result of the activity')
    
    # Call/Meeting details
    duration_minutes = models.IntegerField(null=True, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='lead_activities_created')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'lead_activities'
        verbose_name = 'Lead Activity'
        verbose_name_plural = 'Lead Activities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['lead', '-created_at']),
            models.Index(fields=['activity_type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.lead.name} - {self.get_activity_type_display()} ({self.created_at.strftime('%Y-%m-%d')})"


class LeadConversion(models.Model):
    """Track lead to customer conversions"""
    
    lead = models.OneToOneField(Lead, on_delete=models.CASCADE, related_name='conversion')
    customer_id = models.IntegerField(help_text='ID of the customer created from this lead')
    booking_id = models.IntegerField(null=True, blank=True, help_text='ID of the first booking')
    converted_at = models.DateTimeField()
    conversion_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    conversion_days = models.IntegerField(help_text='Days from lead creation to conversion')
    
    class Meta:
        db_table = 'lead_conversions'
        verbose_name = 'Lead Conversion'
        verbose_name_plural = 'Lead Conversions'
        ordering = ['-converted_at']
    
    def __str__(self):
        return f"{self.lead.name} - Converted on {self.converted_at.strftime('%Y-%m-%d')}"
    
    def save(self, *args, **kwargs):
        # Calculate conversion days
        if not self.conversion_days and self.lead:
            delta = self.converted_at - self.lead.created_at
            self.conversion_days = delta.days
        super().save(*args, **kwargs)


class LeadScore(models.Model):
    """Historical lead scoring data"""
    
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='score_history')
    score = models.IntegerField()
    factors = models.JSONField(default=dict, help_text='Factors contributing to the score')
    calculated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'lead_scores'
        verbose_name = 'Lead Score'
        verbose_name_plural = 'Lead Scores'
        ordering = ['-calculated_at']
    
    def __str__(self):
        return f"{self.lead.name} - Score: {self.score} ({self.calculated_at.strftime('%Y-%m-%d')})"


class LeadFollowUp(models.Model):
    """Scheduled follow-ups for leads"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('overdue', 'Overdue'),
    ]
    
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='follow_ups')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='lead_followups')
    due_date = models.DateTimeField()
    task = models.TextField(help_text='What needs to be done')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=Lead.PRIORITY_CHOICES, default='medium')
    
    # Completion
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_followups')
    notes = models.TextField(blank=True)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_followups')
    
    class Meta:
        db_table = 'lead_follow_ups'
        verbose_name = 'Lead Follow-up'
        verbose_name_plural = 'Lead Follow-ups'
        ordering = ['due_date']
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['assigned_to', 'status']),
        ]
    
    def __str__(self):
        return f"{self.lead.name} - Follow-up on {self.due_date.strftime('%Y-%m-%d')}"
    
    def mark_as_completed(self, user, notes=''):
        """Mark follow-up as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.completed_by = user
        self.notes = notes
        self.save()
    
    def check_overdue(self):
        """Check if follow-up is overdue"""
        if self.status == 'pending' and self.due_date < timezone.now():
            self.status = 'overdue'
            self.save()
            return True
        return False
