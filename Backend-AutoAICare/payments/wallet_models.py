from django.db import models
from django.conf import settings
from customers.models import Customer
from bookings.models import Booking


class Wallet(models.Model):
    """Digital wallet for customers."""
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'wallets'
        verbose_name = 'Wallet'
        verbose_name_plural = 'Wallets'
    
    def __str__(self):
        return f"Wallet - {self.customer.user.name} - Balance: ₹{self.balance}"
    
    def add_funds(self, amount, description=''):
        """Add funds to wallet."""
        self.balance += amount
        self.save()
        WalletTransaction.objects.create(
            wallet=self,
            transaction_type='credit',
            amount=amount,
            description=description,
            balance_after=self.balance
        )
        return True
    
    def deduct_funds(self, amount, description=''):
        """Deduct funds from wallet."""
        if self.balance >= amount:
            self.balance -= amount
            self.save()
            WalletTransaction.objects.create(
                wallet=self,
                transaction_type='debit',
                amount=amount,
                description=description,
                balance_after=self.balance
            )
            return True
        return False


class WalletTransaction(models.Model):
    """Transaction history for wallet."""
    
    TRANSACTION_TYPE_CHOICES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
    ]
    
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'wallet_transactions'
        verbose_name = 'Wallet Transaction'
        verbose_name_plural = 'Wallet Transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.transaction_type.upper()} - ₹{self.amount} - {self.wallet.customer.user.name}"


class GiftCard(models.Model):
    """Gift card model."""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('redeemed', 'Redeemed'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]
    
    code = models.CharField(max_length=50, unique=True)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    remaining_value = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Optional: purchased by a customer
    purchased_by = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchased_gift_cards')
    
    # Redemption tracking
    redeemed_by = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='redeemed_gift_cards')
    redeemed_at = models.DateTimeField(null=True, blank=True)
    
    expiry_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'gift_cards'
        verbose_name = 'Gift Card'
        verbose_name_plural = 'Gift Cards'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Gift Card {self.code} - ₹{self.remaining_value}/₹{self.value}"
    
    def redeem(self, amount, customer):
        """Partially or fully redeem gift card."""
        from django.utils import timezone
        
        if self.status != 'active':
            return False, "Gift card is not active"
        
        if self.expiry_date < timezone.now().date():
            self.status = 'expired'
            self.save()
            return False, "Gift card has expired"
        
        if amount > self.remaining_value:
            return False, f"Insufficient balance. Remaining: ₹{self.remaining_value}"
        
        self.remaining_value -= amount
        
        if self.remaining_value == 0:
            self.status = 'redeemed'
            self.redeemed_by = customer
            self.redeemed_at = timezone.now()
        
        self.save()
        return True, f"₹{amount} redeemed successfully"


class Coupon(models.Model):
    """Discount coupon model."""
    
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('expired', 'Expired'),
    ]
    
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, help_text='Percentage or fixed amount')
    
    # Usage limits
    max_uses = models.IntegerField(null=True, blank=True, help_text='Leave empty for unlimited')
    times_used = models.IntegerField(default=0)
    max_uses_per_customer = models.IntegerField(default=1)
    
    # Minimum purchase requirements
    min_purchase_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text='Maximum discount for percentage coupons')
    
    # Validity
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    valid_from = models.DateField()
    valid_until = models.DateField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment_coupons'  # Changed from 'coupons' to avoid conflict
        verbose_name = 'Coupon'
        verbose_name_plural = 'Coupons'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.code} - {self.discount_value}{'%' if self.discount_type == 'percentage' else '₹'}"
    
    def is_valid(self):
        """Check if coupon is valid."""
        from django.utils import timezone
        current_date = timezone.now().date()
        
        if self.status != 'active':
            return False, "Coupon is not active"
        
        if current_date < self.valid_from:
            return False, "Coupon is not yet valid"
        
        if current_date > self.valid_until:
            self.status = 'expired'
            self.save()
            return False, "Coupon has expired"
        
        if self.max_uses and self.times_used >= self.max_uses:
            return False, "Coupon usage limit reached"
        
        return True, "Coupon is valid"
    
    def calculate_discount(self, total_amount):
        """Calculate discount amount for given total."""
        if self.discount_type == 'percentage':
            discount = (total_amount * self.discount_value) / 100
            if self.max_discount_amount:
                discount = min(discount, self.max_discount_amount)
        else:
            discount = self.discount_value
        
        return min(discount, total_amount)
    
    def apply_coupon(self, total_amount, customer):
        """Apply coupon and return discount amount."""
        is_valid, message = self.is_valid()
        if not is_valid:
            return 0, message
        
        if total_amount < self.min_purchase_amount:
            return 0, f"Minimum purchase amount is ₹{self.min_purchase_amount}"
        
        # Check customer usage
        customer_usage = CouponUsage.objects.filter(coupon=self, customer=customer).count()
        if customer_usage >= self.max_uses_per_customer:
            return 0, "You have already used this coupon maximum times"
        
        discount = self.calculate_discount(total_amount)
        return discount, "Coupon applied successfully"


class CouponUsage(models.Model):
    """Track coupon usage per customer."""
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='coupon_usages')
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    used_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payment_coupon_usages'  # Changed from 'coupon_usages' to avoid conflict
        verbose_name = 'Coupon Usage'
        verbose_name_plural = 'Coupon Usages'
        ordering = ['-used_at']
    
    def __str__(self):
        return f"{self.customer.user.name} used {self.coupon.code} - ₹{self.discount_amount}"
