"""
Test cases for the payments app.

This file contains comprehensive tests for:
- Payment model operations
- Wallet model operations
- GiftCard model operations
- Coupon model operations
- Payment API endpoints
- Wallet API endpoints
- Permission checks for payment management
- Payment initiation and verification
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch
from .models import Payment
from .wallet_models import Wallet, WalletTransaction, GiftCard, Coupon, CouponUsage
from bookings.models import Booking
from services.models import ServicePackage
from customers.models import Customer, Vehicle

User = get_user_model()


class PaymentModelTestCase(TestCase):
    """Test cases for Payment model."""

    def setUp(self):
        """Set up test data."""
        # Create users
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            role='customer',
            is_verified=True
        )

        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Test Admin',
            role='branch_admin',
            is_verified=True
        )

        # Create customer
        self.customer_user.phone = '+1234567890'
        self.customer_user.save()

        self.customer = Customer.objects.create(
            user=self.customer_user
        )

        # Create service package
        self.service_package = ServicePackage.objects.create(
            name='Test Service',
            description='Test service description',
            price=Decimal('100.00'),
            duration=60
        )

        # Create vehicle
        self.vehicle = Vehicle.objects.create(
            customer=self.customer,
            registration_number='TEST123',
            brand='TestBrand',
            model='TestModel',
            color='Red'
        )

        # Create booking
        self.booking = Booking(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.service_package,
            booking_datetime=timezone.now() + timedelta(days=1),
            total_price=Decimal('100.00'),
            status='pending'
        )
        self.booking.save(addons=[])

        # Create payment
        self.payment = Payment.objects.create(
            booking=self.booking,
            amount=Decimal('100.00'),
            payment_method='card',
            payment_status='completed',
            transaction_id='txn_123456'
        )

    def test_payment_creation(self):
        """Test payment creation."""
        self.assertEqual(Payment.objects.count(), 1)
        self.assertEqual(self.payment.booking, self.booking)
        self.assertEqual(self.payment.amount, Decimal('100.00'))
        self.assertEqual(self.payment.payment_method, 'card')
        self.assertEqual(self.payment.payment_status, 'completed')
        self.assertEqual(self.payment.transaction_id, 'txn_123456')
        self.assertEqual(str(
            self.payment), f"Payment #{self.payment.id} - Booking #{self.booking.id} - completed")

    def test_payment_default_values(self):
        """Test payment default values."""
        payment = Payment.objects.create(
            booking=self.booking,
            amount=Decimal('50.00'),
            payment_method='cash'
        )
        self.assertEqual(payment.payment_status, 'pending')
        self.assertIsNone(payment.transaction_id)
        self.assertIsNone(payment.stripe_payment_intent_id)

    def test_payment_with_coupons_and_wallet(self):
        """Test payment with coupon and wallet amounts."""
        payment = Payment.objects.create(
            booking=self.booking,
            amount=Decimal('100.00'),
            payment_method='card',
            coupon_code='SAVE10',
            coupon_discount=Decimal('10.00'),
            wallet_amount=Decimal('20.00'),
            gift_card_code='GIFT50',
            gift_card_amount=Decimal('50.00')
        )
        self.assertEqual(payment.coupon_code, 'SAVE10')
        self.assertEqual(payment.coupon_discount, Decimal('10.00'))
        self.assertEqual(payment.wallet_amount, Decimal('20.00'))
        self.assertEqual(payment.gift_card_code, 'GIFT50')
        self.assertEqual(payment.gift_card_amount, Decimal('50.00'))


class WalletModelTestCase(TestCase):
    """Test cases for Wallet model."""

    def setUp(self):
        """Set up test data."""
        # Create user and customer
        self.user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            role='customer',
            is_verified=True,
            phone='+1234567890'
        )

        self.customer = Customer.objects.create(
            user=self.user
        )

        # Create wallet
        self.wallet = Wallet.objects.create(
            customer=self.customer,
            balance=Decimal('100.00')
        )

    def test_wallet_creation(self):
        """Test wallet creation."""
        self.assertEqual(Wallet.objects.count(), 1)
        self.assertEqual(self.wallet.customer, self.customer)
        self.assertEqual(self.wallet.balance, Decimal('100.00'))
        self.assertEqual(str(self.wallet),
                         f"Wallet - {self.user.name} - Balance: ₹100.00")

    def test_wallet_add_funds(self):
        """Test adding funds to wallet."""
        initial_balance = self.wallet.balance
        self.wallet.add_funds(Decimal('50.00'), 'Test deposit')

        self.assertEqual(self.wallet.balance,
                         initial_balance + Decimal('50.00'))
        self.assertEqual(WalletTransaction.objects.count(), 1)

        transaction = WalletTransaction.objects.first()
        self.assertEqual(transaction.wallet, self.wallet)
        self.assertEqual(transaction.transaction_type, 'credit')
        self.assertEqual(transaction.amount, Decimal('50.00'))
        self.assertEqual(transaction.description, 'Test deposit')
        self.assertEqual(transaction.balance_after, self.wallet.balance)

    def test_wallet_deduct_funds(self):
        """Test deducting funds from wallet."""
        initial_balance = self.wallet.balance
        result = self.wallet.deduct_funds(Decimal('30.00'), 'Test withdrawal')

        self.assertTrue(result)
        self.assertEqual(self.wallet.balance,
                         initial_balance - Decimal('30.00'))
        self.assertEqual(WalletTransaction.objects.count(), 1)

        transaction = WalletTransaction.objects.first()
        self.assertEqual(transaction.wallet, self.wallet)
        self.assertEqual(transaction.transaction_type, 'debit')
        self.assertEqual(transaction.amount, Decimal('30.00'))
        self.assertEqual(transaction.description, 'Test withdrawal')
        self.assertEqual(transaction.balance_after, self.wallet.balance)

    def test_wallet_insufficient_funds(self):
        """Test deduction when insufficient funds."""
        result = self.wallet.deduct_funds(Decimal('200.00'), 'Test withdrawal')

        self.assertFalse(result)
        self.assertEqual(self.wallet.balance, Decimal(
            '100.00'))  # Balance unchanged
        self.assertEqual(WalletTransaction.objects.count(),
                         0)  # No transaction created


class GiftCardModelTestCase(TestCase):
    """Test cases for GiftCard model."""

    def setUp(self):
        """Set up test data."""
        # Create users and customers
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            role='customer',
            is_verified=True,
            phone='+1234567890'
        )

        self.customer = Customer.objects.create(
            user=self.customer_user
        )

        # Create gift card
        self.gift_card = GiftCard.objects.create(
            code='GC123456',
            value=Decimal('100.00'),
            remaining_value=Decimal('100.00'),
            status='active',
            expiry_date=date.today() + timedelta(days=30)
        )

    def test_gift_card_creation(self):
        """Test gift card creation."""
        self.assertEqual(GiftCard.objects.count(), 1)
        self.assertEqual(self.gift_card.code, 'GC123456')
        self.assertEqual(self.gift_card.value, Decimal('100.00'))
        self.assertEqual(self.gift_card.remaining_value, Decimal('100.00'))
        self.assertEqual(self.gift_card.status, 'active')
        self.assertEqual(str(self.gift_card),
                         "Gift Card GC123456 - ₹100.00/₹100.00")

    def test_gift_card_redeem_partial(self):
        """Test partial redemption of gift card."""
        result, message = self.gift_card.redeem(
            Decimal('30.00'), self.customer)

        self.assertTrue(result)
        self.assertEqual(self.gift_card.remaining_value, Decimal('70.00'))
        self.assertEqual(self.gift_card.status, 'active')
        self.assertIn('redeemed successfully', message)

    def test_gift_card_redeem_full(self):
        """Test full redemption of gift card."""
        result, message = self.gift_card.redeem(
            Decimal('100.00'), self.customer)

        self.assertTrue(result)
        self.assertEqual(self.gift_card.remaining_value, Decimal('0.00'))
        self.assertEqual(self.gift_card.status, 'redeemed')
        self.assertEqual(self.gift_card.redeemed_by, self.customer)
        self.assertIsNotNone(self.gift_card.redeemed_at)
        self.assertIn('redeemed successfully', message)

    def test_gift_card_expired(self):
        """Test redemption of expired gift card."""
        self.gift_card.expiry_date = date.today() - timedelta(days=1)
        self.gift_card.save()

        result, message = self.gift_card.redeem(
            Decimal('30.00'), self.customer)

        self.assertFalse(result)
        self.assertEqual(self.gift_card.status, 'expired')
        self.assertIn('expired', message)


class CouponModelTestCase(TestCase):
    """Test cases for Coupon model."""

    def setUp(self):
        """Set up test data."""
        # Create users and customers
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            role='customer',
            is_verified=True,
            phone='+1234567890'
        )

        self.customer = Customer.objects.create(
            user=self.customer_user
        )

        # Create coupon
        self.coupon = Coupon.objects.create(
            code='SAVE20',
            description='Save 20%',
            discount_type='percentage',
            discount_value=Decimal('20.00'),
            max_uses=10,
            times_used=0,
            max_uses_per_customer=2,
            min_purchase_amount=Decimal('50.00'),
            valid_from=date.today() - timedelta(days=1),
            valid_until=date.today() + timedelta(days=30),
            status='active'
        )

    def test_coupon_creation(self):
        """Test coupon creation."""
        self.assertEqual(Coupon.objects.count(), 1)
        self.assertEqual(self.coupon.code, 'SAVE20')
        self.assertEqual(self.coupon.discount_type, 'percentage')
        self.assertEqual(self.coupon.discount_value, Decimal('20.00'))
        self.assertEqual(str(self.coupon), "SAVE20 - 20.00%")

    def test_coupon_is_valid(self):
        """Test coupon validity check."""
        is_valid, message = self.coupon.is_valid()

        self.assertTrue(is_valid)
        self.assertEqual(message, "Coupon is valid")

    def test_coupon_calculate_percentage_discount(self):
        """Test percentage discount calculation."""
        discount = self.coupon.calculate_discount(Decimal('100.00'))
        self.assertEqual(discount, Decimal('20.00'))

    def test_coupon_calculate_fixed_discount(self):
        """Test fixed amount discount calculation."""
        self.coupon.discount_type = 'fixed'
        self.coupon.discount_value = Decimal('15.00')
        self.coupon.save()

        discount = self.coupon.calculate_discount(Decimal('100.00'))
        self.assertEqual(discount, Decimal('15.00'))

    def test_coupon_apply_valid(self):
        """Test applying valid coupon."""
        discount, message = self.coupon.apply_coupon(
            Decimal('100.00'), self.customer)

        self.assertEqual(discount, Decimal('20.00'))
        self.assertIn('applied successfully', message)

    def test_coupon_apply_below_minimum(self):
        """Test applying coupon below minimum purchase amount."""
        discount, message = self.coupon.apply_coupon(
            Decimal('30.00'), self.customer)

        self.assertEqual(discount, 0)
        self.assertIn('Minimum purchase amount', message)

    def test_coupon_apply_expired(self):
        """Test applying expired coupon."""
        self.coupon.valid_until = date.today() - timedelta(days=1)
        self.coupon.save()

        discount, message = self.coupon.apply_coupon(
            Decimal('100.00'), self.customer)

        self.assertEqual(discount, 0)
        self.assertIn('expired', message)


# Mock the Redis-dependent functions to prevent connection errors during testing
@patch('notify.websocket_utils.broadcast_dashboard_update')
@patch('notify.websocket_utils.broadcast_booking_update')
@patch('payments.signals.create_transaction_and_update_invoice')
@patch('accounting.signals.create_transaction_from_payment')
class PaymentAPITestCase(TestCase):
    """Test cases for Payment API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create users
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            role='customer',
            is_verified=True
        )

        self.other_customer_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            name='Other Customer',
            role='customer',
            is_verified=True
        )

        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Test Admin',
            role='branch_admin',
            is_verified=True
        )

        # Create customers
        self.customer_user.phone = '+1234567890'
        self.customer_user.save()

        self.customer = Customer.objects.create(
            user=self.customer_user
        )

        self.other_customer_user.phone = '+1987654321'
        self.other_customer_user.save()

        self.other_customer = Customer.objects.create(
            user=self.other_customer_user
        )

        # Create service package
        self.service_package = ServicePackage.objects.create(
            name='Test Service',
            description='Test service description',
            price=Decimal('100.00'),
            duration=60
        )

        # Create vehicles
        self.vehicle1 = Vehicle.objects.create(
            customer=self.customer,
            registration_number='TEST123',
            brand='TestBrand',
            model='TestModel',
            color='Red'
        )

        self.vehicle2 = Vehicle.objects.create(
            customer=self.other_customer,
            registration_number='TEST456',
            brand='TestBrand',
            model='TestModel',
            color='Blue'
        )

        # Create bookings
        self.booking1 = Booking(
            customer=self.customer,
            vehicle=self.vehicle1,
            package=self.service_package,
            booking_datetime=timezone.now() + timedelta(days=1),
            total_price=Decimal('100.00'),
            status='pending'
        )
        self.booking1.save(addons=[])

        self.booking2 = Booking(
            customer=self.other_customer,
            vehicle=self.vehicle2,
            package=self.service_package,
            booking_datetime=timezone.now() + timedelta(days=2),
            total_price=Decimal('150.00'),
            status='pending'
        )
        self.booking2.save(addons=[])

        # Create payments
        self.payment1 = Payment.objects.create(
            booking=self.booking1,
            amount=Decimal('100.00'),
            payment_method='card',
            payment_status='completed',
            transaction_id='txn_123456'
        )

        self.payment2 = Payment.objects.create(
            booking=self.booking2,
            amount=Decimal('150.00'),
            payment_method='cash',
            payment_status='pending',
            transaction_id='txn_789012'
        )

    def test_customer_can_list_own_payments(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test that customers can list their own payments."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.get('/api/payments/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.payment1.id)

    def test_customer_cannot_see_other_payments(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test that customers cannot see other customers' payments."""
        self.client.force_authenticate(user=self.customer_user)

        # Try to access payment2 which belongs to other customer
        response = self.client.get(f'/api/payments/{self.payment2.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_list_all_payments(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test that admins can list all payments."""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get('/api/payments/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_admin_can_access_any_payment(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test that admins can access any payment."""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(f'/api/payments/{self.payment1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.payment1.id)

    def test_customer_payment_history(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test customer payment history endpoint."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.get('/api/payments/history/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.payment1.id)

    def test_initiate_payment_valid_booking(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test initiating payment for valid booking."""
        self.client.force_authenticate(user=self.customer_user)

        data = {
            'booking_id': self.booking1.id,
            'payment_method': 'card'
        }

        response = self.client.post(
            '/api/payments/initiate/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('payment_id', response.data)
        self.assertIn('transaction_id', response.data)

        # Verify payment was created
        self.assertEqual(Payment.objects.count(), 3)

    def test_initiate_payment_invalid_booking(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test initiating payment for invalid booking."""
        self.client.force_authenticate(user=self.customer_user)

        data = {
            'booking_id': 99999,  # Non-existent booking
            'payment_method': 'card'
        }

        response = self.client.post(
            '/api/payments/initiate/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_initiate_payment_other_customer_booking(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test initiating payment for another customer's booking."""
        self.client.force_authenticate(user=self.customer_user)

        data = {
            'booking_id': self.booking2.id,  # Other customer's booking
            'payment_method': 'card'
        }

        response = self.client.post(
            '/api/payments/initiate/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_verify_payment_success(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test verifying payment successfully."""
        self.client.force_authenticate(user=self.customer_user)
        
        # Create a pending payment for verification
        payment = Payment.objects.create(
            booking=self.booking1,
            amount=Decimal('100.00'),
            payment_method='cash',
            payment_status='pending'
        )

        data = {
            'payment_id': payment.id
        }

        response = self.client.post(
            '/api/payments/verify/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)

        # Verify payment status was updated
        payment.refresh_from_db()
        self.assertEqual(payment.payment_status, 'completed')

    def test_verify_payment_not_found(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test verifying non-existent payment."""
        self.client.force_authenticate(user=self.customer_user)

        data = {
            'payment_id': 99999  # Non-existent payment
        }

        response = self.client.post(
            '/api/payments/verify/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_verify_payment_other_customer(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test verifying another customer's payment."""
        self.client.force_authenticate(user=self.customer_user)

        # Try to verify other customer's payment
        data = {
            'payment_id': self.payment2.id
        }

        response = self.client.post(
            '/api/payments/verify/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_user_cannot_access_payment_endpoints(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test that unauthenticated users cannot access payment endpoints."""
        # Don't authenticate

        # Test list
        response = self.client.get('/api/payments/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test detail
        response = self.client.get(f'/api/payments/{self.payment1.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test history
        response = self.client.get('/api/payments/history/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test initiate
        data = {
            'booking_id': self.booking1.id,
            'payment_method': 'card'
        }
        response = self.client.post(
            '/api/payments/initiate/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test verify
        data = {
            'payment_id': self.payment1.id
        }
        response = self.client.post(
            '/api/payments/verify/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_stripe_webhook_endpoint_exists(self, mock_broadcast_booking, mock_broadcast_dashboard, mock_payment_signal, mock_accounting_signal):
        """Test that stripe webhook endpoint exists and accepts POST requests."""
        # This is a public endpoint that doesn't require authentication
        response = self.client.post(
            '/api/payments/webhook/', {}, format='json')

        # Stripe webhook might return 400 for invalid payload, but shouldn't return 404
        # We're just testing that the endpoint exists
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND)