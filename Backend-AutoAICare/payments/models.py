from django.db import models
from bookings.models import Booking
from customers.models import Customer
from companies.managers import CompanyManager

# Import wallet models to ensure they're recognized by Django
from .wallet_models import Wallet, WalletTransaction, GiftCard, Coupon, CouponUsage


class Payment(models.Model):
    """Payment model for bookings."""
    
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('upi', 'UPI'),
        ('cheque', 'Cheque'),
        ('bank_transfer', 'Bank Transfer'),
        ('stripe', 'Stripe'),
        ('wallet', 'Wallet'),
        ('gift_card', 'Gift Card'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='payments',
        null=True,
        blank=True
    )
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
    invoice = models.ForeignKey('billing.Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=200, blank=True, null=True, unique=True)
    
    # Additional tracking fields
    reference_number = models.CharField(max_length=100, blank=True, null=True, help_text="Cheque number, UPI ref, etc.")
    notes = models.TextField(blank=True, null=True)
    payment_date = models.DateTimeField(auto_now_add=True, help_text="When payment was recorded")
    recorded_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_payments')
    
    # Stripe specific fields
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'payments'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']
    
    # Coupon and discount tracking
    coupon_code = models.CharField(max_length=50, blank=True, null=True)
    coupon_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gift_card_code = models.CharField(max_length=50, blank=True, null=True)
    gift_card_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    wallet_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    def __str__(self):
        return f"Payment #{self.id} - Booking #{self.booking.id} - {self.payment_status}"
