from django.db import models
from companies.managers import CompanyManager


class Branch(models.Model):
    """Branch/Location model for multi-branch management."""
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='branches',
        null=True,  # Temporary for migration
        blank=True
    )
    
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, help_text='Unique branch code (e.g., DT001)')
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    
    phone = models.CharField(max_length=20)
    email = models.EmailField(null=True, blank=True)
    google_review_url = models.URLField(max_length=500, null=True, blank=True, help_text='Google Business Review URL for this branch')
    
    is_active = models.BooleanField(default=True)
    timezone = models.CharField(max_length=50, default='Asia/Kolkata')
    
    # Business hours
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    
    # Manager/Contact
    manager_name = models.CharField(max_length=255, null=True, blank=True)
    manager_phone = models.CharField(max_length=20, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'branches'
        verbose_name = 'Branch'
        verbose_name_plural = 'Branches'
        ordering = ['name']
        # Branch name and code unique within company
        unique_together = [['company', 'name'], ['company', 'code']]
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class ServiceBay(models.Model):
    """Physical service/detailing bays in a branch."""
    BAY_TYPES = [
        ('washing', 'Washing Bay'),
        ('detailing', 'Detailing Bay'),
        ('drying', 'Drying Area'),
        ('inspection', 'Inspection Bay'),
        ('other', 'Other'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='service_bays',
        null=True,  # Temporary for migration
        blank=True
    )
    
    name = models.CharField(max_length=100)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='bays')
    bay_type = models.CharField(max_length=30, choices=BAY_TYPES, default='detailing')
    is_active = models.BooleanField(default=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'service_bays'
        verbose_name = 'Service Bay'
        verbose_name_plural = 'Service Bays'
        ordering = ['branch', 'name']
        unique_together = [['company', 'branch', 'name']]

    def __str__(self):
        return f"{self.name} - {self.branch.name} ({self.get_bay_type_display()})"
