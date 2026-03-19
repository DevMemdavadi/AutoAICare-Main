from django.db import models


class GlobalSettings(models.Model):
    """Global system settings - Singleton model."""
    
    # Tax Configuration
    default_tax_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0, 
        help_text='Default tax percentage for invoices'
    )
    tax_name = models.CharField(max_length=50, default='GST', help_text='Tax name (e.g., GST, VAT)')
    
    # Business Information
    business_name = models.CharField(max_length=255, blank=True, null=True)
    business_email = models.EmailField(blank=True, null=True)
    business_phone = models.CharField(max_length=20, blank=True, null=True)
    business_address = models.TextField(blank=True, null=True)
    
    # Currency Settings
    currency = models.CharField(max_length=10, default='INR', help_text='Currency code (e.g., USD, INR)')
    currency_symbol = models.CharField(max_length=5, default='₹')
    
    # Booking Settings
    booking_advance_days = models.IntegerField(default=30, help_text='Maximum days in advance for booking')
    cancellation_hours = models.IntegerField(default=24, help_text='Minimum hours before cancellation allowed')
    slot_duration_minutes = models.IntegerField(default=60, help_text='Duration of each booking slot in minutes')
    
    # Notification Settings
    enable_email_notifications = models.BooleanField(default=True)
    enable_sms_notifications = models.BooleanField(default=False)
    
    # System Settings
    maintenance_mode = models.BooleanField(default=False, help_text='Put system in maintenance mode')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'global_settings'
        verbose_name = 'Global Settings'
        verbose_name_plural = 'Global Settings'
        app_label = 'config'
    
    def __str__(self):
        return "Global Settings"
    
    def save(self, *args, **kwargs):
        """Ensure only one instance exists (Singleton pattern)."""
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        """Load the singleton instance."""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class CompanySettings(models.Model):
    """Company branding and information for invoices - Singleton model."""
    
    # Company Info
    company_name = models.CharField(max_length=255, default="K3 CAR CARE")
    branch_name = models.CharField(max_length=255, blank=True, help_text="e.g., CHANDPUR")
    
    # Logo
    logo = models.ImageField(upload_to='company/logos/', null=True, blank=True, help_text="Company logo for invoices")
    signature = models.ImageField(upload_to='company/signatures/', null=True, blank=True, help_text="Authorised signatory signature image for invoices")
    
    # Address
    address_line1 = models.CharField(max_length=255, help_text="Street address")
    address_line2 = models.CharField(max_length=255, blank=True, help_text="Additional address info")
    city = models.CharField(max_length=100, default="Varanasi")
    state = models.CharField(max_length=100, default="Uttar Pradesh")
    pincode = models.CharField(max_length=10, default="221103")
    
    # Contact
    phone = models.CharField(max_length=20, help_text="Primary contact number")
    email = models.EmailField(help_text="Company email")
    website = models.URLField(blank=True, help_text="Company website")
    
    # Tax & Banking
    gst_number = models.CharField(max_length=20, help_text="GST registration number")
    pan_number = models.CharField(max_length=10, blank=True, help_text="PAN number")
    
    # Bank Details
    bank_name = models.CharField(max_length=100, help_text="Bank name")
    account_number = models.CharField(max_length=50, help_text="Bank account number")
    ifsc_code = models.CharField(max_length=15, help_text="IFSC code")
    account_holder_name = models.CharField(max_length=255, help_text="Account holder name")
    branch_address = models.CharField(max_length=255, blank=True, help_text="Bank branch address")
    
    # Terms & Conditions
    terms_and_conditions = models.TextField(
        default="1. Goods once sold will not be taken back or exchanged\n"
                "2. All disputes are subject to jurisdiction only",
        help_text="Terms and conditions to display on invoice"
    )
    
    # Footer message
    footer_message = models.CharField(
        max_length=255,
        default="****THANK YOU. PLEASE VISIT AGAIN****",
        help_text="Footer message on invoice"
    )
    
    # Invoice Prefix
    invoice_prefix = models.CharField(
        max_length=10,
        default="B2C",
        help_text="Prefix for invoice numbers (e.g., B2C, B2B)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'company_settings'
        verbose_name = 'Company Settings'
        verbose_name_plural = 'Company Settings'
        app_label = 'config'
    
    def __str__(self):
        return f"{self.company_name} - Company Settings"
    
    def save(self, *args, **kwargs):
        """Ensure only one instance exists (Singleton pattern)."""
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        """Load the singleton instance."""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
    
    def get_full_address(self):
        """Return formatted full address."""
        parts = [self.address_line1]
        if self.address_line2:
            parts.append(self.address_line2)
        parts.append(f"{self.city}, {self.state} {self.pincode}")
        return ", ".join(parts)


class ReferralSettings(models.Model):
    """Referral program configuration - Singleton model."""
    
    REWARD_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]
    
    # Program status
    is_enabled = models.BooleanField(
        default=True,
        help_text='Enable or disable the referral program'
    )
    
    # Referrer rewards (existing customer who refers)
    referrer_reward_type = models.CharField(
        max_length=20,
        choices=REWARD_TYPE_CHOICES,
        default='fixed',
        help_text='Type of reward for the referrer'
    )
    referrer_reward_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=100.00,
        help_text='Reward value (percentage or fixed amount in ₹)'
    )
    
    # Referee rewards (new customer who was referred)
    referee_reward_type = models.CharField(
        max_length=20,
        choices=REWARD_TYPE_CHOICES,
        default='fixed',
        help_text='Type of reward for the referee'
    )
    referee_reward_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=100.00,
        help_text='Reward value (percentage or fixed amount in ₹)'
    )
    
    # Optional: Minimum job amount to qualify (for future use)
    minimum_job_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text='Minimum job amount to qualify for referral rewards (0 = no minimum)'
    )
    
    # Optional: Maximum discount cap for percentage-based rewards
    max_referrer_reward_cap = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Maximum reward cap for percentage-based referrer rewards'
    )
    max_referee_reward_cap = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Maximum reward cap for percentage-based referee rewards'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'referral_settings'
        verbose_name = 'Referral Settings'
        verbose_name_plural = 'Referral Settings'
        app_label = 'config'
    
    def __str__(self):
        return "Referral Program Settings"
    
    def save(self, *args, **kwargs):
        """Ensure only one instance exists (Singleton pattern)."""
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        """Load the singleton instance."""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
    
    def calculate_referrer_reward(self, job_amount=None):
        """Calculate referrer reward amount."""
        from decimal import Decimal
        
        if self.referrer_reward_type == 'percentage' and job_amount:
            reward = (Decimal(str(job_amount)) * self.referrer_reward_value) / Decimal('100')
            if self.max_referrer_reward_cap:
                reward = min(reward, self.max_referrer_reward_cap)
            return reward
        else:
            # Fixed amount
            return self.referrer_reward_value
    
    def calculate_referee_reward(self, job_amount=None):
        """Calculate referee reward amount."""
        from decimal import Decimal
        
        if self.referee_reward_type == 'percentage' and job_amount:
            reward = (Decimal(str(job_amount)) * self.referee_reward_value) / Decimal('100')
            if self.max_referee_reward_cap:
                reward = min(reward, self.max_referee_reward_cap)
            return reward
        else:
            # Fixed amount
            return self.referee_reward_value
    
    @property
    def referrer_reward_text(self):
        """Get human-readable referrer reward text for display."""
        if self.referrer_reward_type == 'percentage':
            return f"{self.referrer_reward_value}% off"
        else:
            return f"₹{self.referrer_reward_value}"
    
    @property
    def referee_reward_text(self):
        """Get human-readable referee reward text for display."""
        if self.referee_reward_type == 'percentage':
            return f"{self.referee_reward_value}% off"
        else:
            return f"₹{self.referee_reward_value}"
    
    def get_referrer_reward_display_text(self):
        """Get human-readable referrer reward text."""
        return self.referrer_reward_text
    
    def get_referee_reward_display_text(self):
        """Get human-readable referee reward text."""
        return self.referee_reward_text

