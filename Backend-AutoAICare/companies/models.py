from django.db import models
from django.utils.text import slugify


class Company(models.Model):
    """
    Central tenant model representing each company/organization.
    Each company has isolated data.
    """
    
    # Basic Info
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=100, unique=True, help_text="URL-friendly identifier")
    display_name = models.CharField(max_length=255, help_text="Display name for branding")
    
    # Status
    is_active = models.BooleanField(default=True)
    is_trial = models.BooleanField(default=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    
    # Contact Info
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    
    # Address
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default="India")
    pincode = models.CharField(max_length=10)
    
    # Business Details
    business_type = models.CharField(max_length=50, choices=[
        ('car_detailing', 'Car Detailing'),
        ('car_wash', 'Car Wash'),
        ('auto_service', 'Auto Service'),
        ('other', 'Other'),
    ], default='car_detailing')
    
    gst_number = models.CharField(max_length=20, blank=True)
    pan_number = models.CharField(max_length=10, blank=True)
    
    # Branding
    logo = models.ImageField(upload_to='company_logos/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default='#3B82F6', help_text="Hex color code")
    
    # Settings (JSON field for flexibility)
    settings = models.JSONField(default=dict, blank=True, help_text="Company-specific settings")
    
    # Subscription (for future billing)
    subscription_plan = models.CharField(max_length=50, default='free')
    max_users = models.IntegerField(default=10)
    max_branches = models.IntegerField(default=3)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'companies'
        verbose_name = 'Company'
        verbose_name_plural = 'Companies'
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    @property
    def full_address(self):
        parts = [self.address_line1]
        if self.address_line2:
            parts.append(self.address_line2)
        parts.append(f"{self.city}, {self.state} {self.pincode}")
        return ", ".join(parts)


class CompanySettings(models.Model):
    """
    Company-specific settings (replaces the singleton CompanySettings).
    Each company has its own settings.
    """
    
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='company_settings')
    
    # Tax Configuration
    default_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    tax_name = models.CharField(max_length=50, default='GST')
    
    # Invoice Settings
    invoice_prefix = models.CharField(max_length=10, default='INV')
    invoice_footer = models.CharField(max_length=255, default='Thank you for your business!')
    terms_and_conditions = models.TextField(default='')
    
    # Bank Details
    bank_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    ifsc_code = models.CharField(max_length=15, blank=True)
    account_holder_name = models.CharField(max_length=255, blank=True)
    
    # Notifications
    enable_email_notifications = models.BooleanField(default=True)
    enable_sms_notifications = models.BooleanField(default=False)
    enable_whatsapp_notifications = models.BooleanField(default=False)
    
    # WhatsApp Mode
    whatsapp_mode = models.CharField(
        max_length=10,
        choices=[
            ('manual', 'Manual (Click-to-Send)'),
            ('api', 'Automated (Cloud API)'),
        ],
        default='manual',
        help_text='WhatsApp sending mode: manual (wa.me links) or automated (Cloud API)'
    )
    
    # WhatsApp Configuration (company-specific)
    whatsapp_provider = models.CharField(
        max_length=20,
        choices=[
            ('meta', 'Meta Cloud API'),
            ('twilio', 'Twilio'),
            ('messagebird', 'MessageBird'),
        ],
        default='meta',
        blank=True
    )
    whatsapp_credentials = models.JSONField(
        default=dict,
        blank=True,
        help_text="Encrypted WhatsApp API credentials: {provider, access_token, phone_number_id, business_account_id}"
    )
    whatsapp_business_phone = models.CharField(
        max_length=20,
        blank=True,
        help_text="Company's WhatsApp Business phone number"
    )
    
    # Custom WP Gateway Integration
    wp_url = models.URLField(
        blank=True,
        null=True,
        help_text="Base URL of the WP Messaging Gateway (e.g., http://localhost:8001)"
    )
    wp_api_key = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="API Key generated by the WP Messaging Gateway"
    )

    # Booking Settings
    booking_advance_days = models.IntegerField(default=30)
    cancellation_hours = models.IntegerField(default=24)
    slot_duration_minutes = models.IntegerField(default=60)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'companies_settings'  # Different from legacy company_settings
        verbose_name = 'Company Settings'
        verbose_name_plural = 'Company Settings'
    
    def __str__(self):
        return f"{self.company.name} - Settings"


# Import Domain model for subdomain-based tenant identification
from .domain_models import Domain

__all__ = ['Company', 'CompanySettings', 'Domain']
