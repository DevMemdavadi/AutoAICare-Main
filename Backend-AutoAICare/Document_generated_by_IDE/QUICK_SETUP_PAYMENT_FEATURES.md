# ⚡ QUICK SETUP - Payment Features (Wallet, Gift Card, Coupon)

**Time Required**: 10-15 minutes  
**Difficulty**: Easy

---

## 🎯 **OVERVIEW**

This guide will help you set up the new payment features (Wallet, Gift Cards, Coupons) to complete the customer testing flow.

---

## 📋 **STEP 1: Integrate Wallet Models into Django**

### **Option A: Merge into existing models.py (Recommended)**

Add the classes from `wallet_models.py` to `Backend/payments/models.py`:

```bash
cd d:\Car_Software\Backend\payments
```

**Edit `models.py`** and append these classes after the `Payment` model:

```python
# Add at the end of Backend/payments/models.py

class Wallet(models.Model):
    """Digital wallet for customers."""
    customer = models.OneToOneField('customers.Customer', on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'wallets'
    
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
        ordering = ['-created_at']


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
    purchased_by = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='purchased_gift_cards')
    redeemed_by = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='redeemed_gift_cards')
    redeemed_at = models.DateTimeField(null=True, blank=True)
    expiry_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'gift_cards'


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
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    max_uses = models.IntegerField(null=True, blank=True)
    times_used = models.IntegerField(default=0)
    max_uses_per_customer = models.IntegerField(default=1)
    min_purchase_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    valid_from = models.DateField()
    valid_until = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'coupons'
    
    def is_valid(self):
        """Check if coupon is valid."""
        from django.utils import timezone
        current_date = timezone.now().date()
        
        if self.status != 'active':
            return False, "Coupon is not active"
        if current_date < self.valid_from:
            return False, "Coupon is not yet valid"
        if current_date > self.valid_until:
            return False, "Coupon has expired"
        if self.max_uses and self.times_used >= self.max_uses:
            return False, "Coupon usage limit reached"
        return True, "Coupon is valid"
    
    def calculate_discount(self, total_amount):
        """Calculate discount amount."""
        if self.discount_type == 'percentage':
            discount = (total_amount * self.discount_value) / 100
            if self.max_discount_amount:
                discount = min(discount, self.max_discount_amount)
        else:
            discount = self.discount_value
        return min(discount, total_amount)


class CouponUsage(models.Model):
    """Track coupon usage per customer."""
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, related_name='coupon_usages')
    booking = models.ForeignKey('bookings.Booking', on_delete=models.SET_NULL, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    used_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'coupon_usages'
```

---

## 📋 **STEP 2: Create and Apply Migrations**

```bash
cd d:\Car_Software\Backend

# Create migrations
python manage.py makemigrations payments

# Apply migrations
python manage.py migrate
```

**Expected output:**
```
Migrations for 'payments':
  payments/migrations/0002_wallet_wallettransaction_giftcard_coupon_couponusage.py
    - Create model Wallet
    - Create model WalletTransaction
    - Create model GiftCard
    - Create model Coupon
    - Create model CouponUsage
    - Add field coupon_code to payment
    - Add field coupon_discount to payment
    ...

Running migrations:
  Applying payments.0002_wallet_wallettransaction...OK
```

---

## 📋 **STEP 3: Create Test Data**

```bash
python manage.py shell
```

```python
from payments.models import Coupon, GiftCard, Wallet
from customers.models import Customer
from datetime import datetime, timedelta

# Create sample coupons
Coupon.objects.create(
    code='SAVE20',
    description='20% off on all services',
    discount_type='percentage',
    discount_value=20,
    valid_from=datetime.now().date(),
    valid_until=datetime.now().date() + timedelta(days=365),
    min_purchase_amount=500,
    max_discount_amount=1000,
    status='active'
)

Coupon.objects.create(
    code='FLAT500',
    description='Flat ₹500 off',
    discount_type='fixed',
    discount_value=500,
    valid_from=datetime.now().date(),
    valid_until=datetime.now().date() + timedelta(days=90),
    min_purchase_amount=2000,
    status='active'
)

# Create sample gift cards
GiftCard.objects.create(
    code='GIFT500',
    value=500,
    remaining_value=500,
    expiry_date=datetime.now().date() + timedelta(days=365),
    status='active'
)

GiftCard.objects.create(
    code='GIFT1000',
    value=1000,
    remaining_value=1000,
    expiry_date=datetime.now().date() + timedelta(days=365),
    status='active'
)

# Add wallet balance to test customer (replace with actual customer)
customer = Customer.objects.first()
if customer:
    wallet, created = Wallet.objects.get_or_create(customer=customer)
    wallet.add_funds(1500, 'Initial balance')
    print(f"Wallet created with balance: ₹{wallet.balance}")

print("Test data created successfully!")
```

---

## 📋 **STEP 4: Add Backend API Views**

**Edit `Backend/payments/views.py`** and add these actions to `PaymentViewSet`:

```python
from rest_framework.decorators import action
from .models import Wallet, GiftCard, Coupon, CouponUsage
from decimal import Decimal

@action(detail=False, methods=['get'])
def wallet(self, request):
    """Get customer wallet balance."""
    try:
        customer = request.user.customer_profile
        wallet, created = Wallet.objects.get_or_create(customer=customer)
        return Response({
            'balance': wallet.balance,
            'currency': 'INR'
        })
    except AttributeError:
        return Response({'error': 'Customer profile not found'}, status=404)

@action(detail=False, methods=['post'])
def validate_coupon(self, request):
    """Validate and calculate coupon discount."""
    code = request.data.get('code', '').upper()
    total_amount = Decimal(request.data.get('total_amount', 0))
    
    try:
        coupon = Coupon.objects.get(code=code)
        is_valid, message = coupon.is_valid()
        
        if not is_valid:
            return Response({'error': message}, status=400)
        
        if total_amount < coupon.min_purchase_amount:
            return Response({
                'error': f'Minimum purchase amount is ₹{coupon.min_purchase_amount}'
            }, status=400)
        
        # Check customer usage
        customer = request.user.customer_profile
        usage_count = CouponUsage.objects.filter(
            coupon=coupon, 
            customer=customer
        ).count()
        
        if usage_count >= coupon.max_uses_per_customer:
            return Response({
                'error': 'You have already used this coupon'
            }, status=400)
        
        discount = coupon.calculate_discount(total_amount)
        
        return Response({
            'code': coupon.code,
            'discount': discount,
            'description': coupon.description
        })
    except Coupon.DoesNotExist:
        return Response({'error': 'Invalid coupon code'}, status=404)

@action(detail=False, methods=['post'])
def validate_gift_card(self, request):
    """Validate gift card."""
    code = request.data.get('code', '').upper()
    
    try:
        gift_card = GiftCard.objects.get(code=code)
        
        if gift_card.status != 'active':
            return Response({'error': 'Gift card is not active'}, status=400)
        
        from django.utils import timezone
        if gift_card.expiry_date < timezone.now().date():
            gift_card.status = 'expired'
            gift_card.save()
            return Response({'error': 'Gift card has expired'}, status=400)
        
        return Response({
            'code': gift_card.code,
            'remaining_value': gift_card.remaining_value,
            'expiry_date': gift_card.expiry_date
        })
    except GiftCard.DoesNotExist:
        return Response({'error': 'Invalid gift card code'}, status=404)

@action(detail=False, methods=['post'])
def process(self, request):
    """Process payment with multiple sources."""
    invoice_id = request.data.get('invoice_id')
    payment_method = request.data.get('payment_method')
    coupon_code = request.data.get('coupon_code')
    gift_card_code = request.data.get('gift_card_code')
    use_wallet = request.data.get('use_wallet', False)
    
    try:
        from billing.models import Invoice
        invoice = Invoice.objects.get(id=invoice_id)
        customer = request.user.customer_profile
        
        # Create payment record
        payment = Payment.objects.create(
            booking=invoice.booking,
            amount=request.data.get('amount', invoice.total_amount),
            payment_method=payment_method,
            payment_status='pending'
        )
        
        # Apply coupon
        if coupon_code:
            coupon = Coupon.objects.get(code=coupon_code)
            payment.coupon_code = coupon_code
            payment.coupon_discount = request.data.get('coupon_discount', 0)
            
            # Record usage
            CouponUsage.objects.create(
                coupon=coupon,
                customer=customer,
                booking=invoice.booking,
                discount_amount=payment.coupon_discount
            )
            coupon.times_used += 1
            coupon.save()
        
        # Apply gift card
        if gift_card_code:
            gift_card = GiftCard.objects.get(code=gift_card_code)
            gift_card_amount = request.data.get('gift_card_amount', 0)
            gift_card.redeem(Decimal(gift_card_amount), customer)
            payment.gift_card_code = gift_card_code
            payment.gift_card_amount = gift_card_amount
        
        # Apply wallet
        if use_wallet:
            wallet = Wallet.objects.get(customer=customer)
            wallet_amount = request.data.get('wallet_amount', 0)
            wallet.deduct_funds(Decimal(wallet_amount), f'Payment for Invoice #{invoice.invoice_number}')
            payment.wallet_amount = wallet_amount
        
        # Mark as completed
        payment.payment_status = 'completed'
        payment.save()
        
        # Update invoice
        invoice.status = 'paid'
        invoice.mark_as_paid()
        
        return Response({
            'message': 'Payment successful',
            'payment_id': payment.id
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=400)
```

---

## 📋 **STEP 5: Add Frontend Route**

**Edit `Frontend/src/App.jsx`** (or your routing file):

```javascript
import PayInvoice from './pages/customer/PayInvoice';

// Add inside customer routes:
<Route path="/customer/pay/:invoiceId" element={<PayInvoice />} />
```

---

## 📋 **STEP 6: Update Payments Page**

**Edit `Frontend/src/pages/customer/Payments.jsx`** to add "Pay Now" button in invoices section:

```javascript
// Inside invoice card mapping (around line 305):
<Button
  onClick={() => navigate(`/customer/pay/${invoice.id}`)}
  variant="primary"
  className="w-full mt-2"
>
  Pay Now
</Button>
```

---

## ✅ **STEP 7: Test Everything**

1. **Start Backend:**
   ```bash
   cd Backend
   python manage.py runserver
   ```

2. **Start Frontend:**
   ```bash
   cd Frontend
   npm run dev
   ```

3. **Test Payment Flow:**
   - Login as customer
   - Navigate to Payments page
   - Click "Pay Now" on an invoice
   - Test:
     - Apply coupon `SAVE20`
     - Apply gift card `GIFT500`
     - Enable wallet checkbox
     - Select UPI/Card
     - Click "Pay Now"

---

## 🎉 **YOU'RE DONE!**

All payment features are now active:
- ✅ Wallet payments
- ✅ Gift card redemption
- ✅ Coupon discounts
- ✅ Combined multi-source payments
- ✅ Real-time total calculation

Refer to [`CUSTOMER_TESTING_GUIDE.md`](./CUSTOMER_TESTING_GUIDE.md) for comprehensive testing instructions.

---

## 🐛 **Troubleshooting**

**Migration Error:**
```bash
# If you see foreign key errors, ensure customers app is migrated first:
python manage.py migrate customers
python manage.py migrate payments
```

**Import Error:**
```python
# If models don't import, check:
# - Models are in payments/models.py
# - No circular imports
# - Customer model path is correct: 'customers.Customer'
```

**API 404 Error:**
```bash
# Check URLs are registered in Backend/payments/urls.py:
from .views import PaymentViewSet

router.register(r'', PaymentViewSet, basename='payment')
```

---

**Need help?** Check the full implementation in:
- `IMPLEMENTATION_SUMMARY.md` - Overall status
- `CUSTOMER_TESTING_GUIDE.md` - Testing instructions
