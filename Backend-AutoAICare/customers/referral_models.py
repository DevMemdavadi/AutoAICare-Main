from django.db import models
from django.utils import timezone
from .models import Customer
import random
import string


class Referral(models.Model):
    """Track customer referrals."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),  # Referee registered but hasn't completed first job
        ('completed', 'Completed'),  # Referee completed first job
        ('rewarded', 'Rewarded'),  # Both parties have been rewarded
    ]
    
    referrer = models.ForeignKey(
        Customer, 
        on_delete=models.CASCADE, 
        related_name='referrals_made',
        help_text='Customer who made the referral'
    )
    referee = models.ForeignKey(
        Customer, 
        on_delete=models.CASCADE, 
        related_name='referrals_received',
        help_text='Customer who was referred'
    )
    referral_code = models.CharField(
        max_length=50, 
        help_text='The referral code used'
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending'
    )
    
    # Reward tracking
    referrer_points_awarded = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text='Points/amount credited to referrer'
    )
    referee_points_awarded = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text='Points/amount credited to referee'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text='When referee completed their first job'
    )
    rewarded_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text='When rewards were credited'
    )
    
    class Meta:
        db_table = 'referrals'
        verbose_name = 'Referral'
        verbose_name_plural = 'Referrals'
        ordering = ['-created_at']
        unique_together = ['referrer', 'referee']  # Prevent duplicate referrals
    
    
    def __str__(self):
        return f"{self.referrer.user.name} → {self.referee.user.name} ({self.status})"
    
    def clean(self):
        """Validate referral data."""
        from django.core.exceptions import ValidationError
        
        # Prevent self-referral
        if self.referrer == self.referee:
            raise ValidationError("A customer cannot refer themselves.")
        
        # Check if referee already has a referral
        if self.pk is None:  # Only check on creation
            existing = Referral.objects.filter(referee=self.referee).exists()
            if existing:
                raise ValidationError("This customer has already been referred by someone.")
    
    def save(self, *args, **kwargs):
        """Override save to call clean."""
        self.clean()
        super().save(*args, **kwargs)
    
    def mark_completed(self):
        """Mark referral as completed when referee completes first job."""
        if self.status == 'pending':
            self.status = 'completed'
            self.completed_at = timezone.now()
            self.save()
            return True
        return False
    
    def process_rewards(self):
        """Process and credit rewards to both referrer and referee."""
        from config.models import ReferralSettings
        from payments.wallet_models import Wallet
        
        if self.status != 'completed':
            return False, "Referral must be completed before processing rewards"
        
        settings = ReferralSettings.load()
        if not settings.is_enabled:
            return False, "Referral program is currently disabled"
        
        # Calculate rewards
        referrer_amount = settings.calculate_referrer_reward()
        referee_amount = settings.calculate_referee_reward()
        
        # Get or create wallets
        referrer_wallet, _ = Wallet.objects.get_or_create(customer=self.referrer)
        referee_wallet, _ = Wallet.objects.get_or_create(customer=self.referee)
        
        # Credit rewards
        referrer_wallet.add_funds(
            referrer_amount, 
            f"Referral reward for referring {self.referee.user.name}"
        )
        referee_wallet.add_funds(
            referee_amount, 
            f"Referral reward from {self.referrer.user.name}"
        )
        
        # Update referral record
        self.referrer_points_awarded = referrer_amount
        self.referee_points_awarded = referee_amount
        self.status = 'rewarded'
        self.rewarded_at = timezone.now()
        self.save()
        
        return True, f"Rewards credited: Referrer ₹{referrer_amount}, Referee ₹{referee_amount}"


class ReferralCode(models.Model):
    """Store unique referral codes for customers."""
    
    customer = models.OneToOneField(
        Customer, 
        on_delete=models.CASCADE, 
        related_name='referral_code_obj'
    )
    code = models.CharField(
        max_length=50, 
        unique=True,
        help_text='Unique referral code'
    )
    is_active = models.BooleanField(default=True)
    times_used = models.IntegerField(
        default=0,
        help_text='Number of times this code has been used'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'referral_codes'
        verbose_name = 'Referral Code'
        verbose_name_plural = 'Referral Codes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code'], name='idx_referral_code'),
            models.Index(fields=['is_active'], name='idx_referral_active'),
        ]
    
    def __str__(self):
        return f"{self.customer.user.name} - {self.code}"
    
    @staticmethod
    def generate_code(customer_name):
        """Generate a unique referral code based on customer name."""
        import random
        import string
        
        # Take first 4 letters of name (uppercase), remove spaces
        name_clean = ''.join(filter(str.isalpha, customer_name))
        name_part = name_clean[:4].upper()
        
        # Pad with random letters if name is too short
        if len(name_part) < 4:
            name_part = name_part.ljust(4, random.choice(string.ascii_uppercase))
        
        # Generate unique code with retries
        max_attempts = 100
        for attempt in range(max_attempts):
            # Add random letter + 3 digits for uniqueness
            random_letter = random.choice(string.ascii_uppercase)
            random_digits = ''.join(random.choices(string.digits, k=3))
            code = f"{name_part}{random_letter}{random_digits}"
            
            # Check if code already exists
            if not ReferralCode.objects.filter(code=code).exists():
                return code
        
        # Fallback: use timestamp if all attempts fail
        import time
        timestamp = str(int(time.time()))[-6:]
        return f"{name_part}{timestamp}"
    
    @staticmethod
    def create_for_customer(customer, custom_code=None):
        """Create a referral code for a customer."""
        # Check if customer already has a code
        if hasattr(customer, 'referral_code_obj'):
            return customer.referral_code_obj, False
        
        # Use custom code if provided and available
        if custom_code:
            custom_code = custom_code.upper().strip()
            if ReferralCode.objects.filter(code=custom_code).exists():
                return None, False  # Code already taken
            code = custom_code
        else:
            # Auto-generate code
            code = ReferralCode.generate_code(customer.user.name)
        
        # Create referral code
        referral_code = ReferralCode.objects.create(
            customer=customer,
            code=code
        )
        return referral_code, True
    
    def increment_usage(self):
        """Increment the usage counter."""
        self.times_used += 1
        self.save()
