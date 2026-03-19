"""
Test cases for the memberships app.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date
from django.utils import timezone
from branches.models import Branch

from .models import (
    MembershipPlan, MembershipBenefit, CustomerMembership, 
    Coupon, CouponUsage, MembershipCouponGeneration
)

User = get_user_model()


class MembershipPlanModelTestCase(TestCase):
    """Test cases for MembershipPlan model."""

    def setUp(self):
        """Set up test data."""
        # Create branch
        self.branch = Branch.objects.create(
            name='Test Branch',
            code='TB001',
            address='123 Test St',
            city='Test City',
            state='Test State',
            pincode='123456',
            phone='1234567890'
        )

        # Create membership plan
        self.membership_plan = MembershipPlan.objects.create(
            name='Gold Plan',
            tier='gold',
            description='Premium membership with great benefits',
            hatchback_price=Decimal('2999.00'),
            sedan_price=Decimal('3999.00'),
            suv_price=Decimal('4999.00'),
            gst_applicable=True,
            gst_rate=Decimal('18.00'),
            duration_value=12,
            duration_unit='months',
            discount_percentage=Decimal('15.00'),
            free_washes_count=12,
            free_interior_cleaning_count=6,
            coupons_per_month=2,
            coupon_discount_percentage=Decimal('20.00'),
            priority_booking=True,
            is_active=True,
            is_popular=True,
            display_order=1,
            is_global=True,
            branch=self.branch
        )

    def test_membership_plan_creation(self):
        """Test membership plan creation."""
        self.assertEqual(MembershipPlan.objects.count(), 1)
        self.assertEqual(self.membership_plan.name, 'Gold Plan')
        self.assertEqual(self.membership_plan.tier, 'gold')
        self.assertTrue(self.membership_plan.is_active)
        self.assertTrue(self.membership_plan.is_popular)
        self.assertEqual(str(self.membership_plan), 'Gold Plan (Gold)')

    def test_membership_plan_price_calculation(self):
        """Test membership plan price calculation methods."""
        # Test get_price_for_vehicle_type
        self.assertEqual(self.membership_plan.get_price_for_vehicle_type('hatchback'), Decimal('2999.00'))
        self.assertEqual(self.membership_plan.get_price_for_vehicle_type('sedan'), Decimal('3999.00'))
        self.assertEqual(self.membership_plan.get_price_for_vehicle_type('suv'), Decimal('4999.00'))
        # Test default case
        self.assertEqual(self.membership_plan.get_price_for_vehicle_type('unknown'), Decimal('3999.00'))

        # Test get_duration_in_days
        self.assertEqual(self.membership_plan.get_duration_in_days(), 360)  # 12 months = 360 days


class MembershipBenefitModelTestCase(TestCase):
    """Test cases for MembershipBenefit model."""

    def setUp(self):
        """Set up test data."""
        # Create branch
        self.branch = Branch.objects.create(
            name='Test Branch',
            code='TB001',
            address='123 Test St',
            city='Test City',
            state='Test State',
            pincode='123456',
            phone='1234567890'
        )

        # Create membership plan
        self.membership_plan = MembershipPlan.objects.create(
            name='Silver Plan',
            tier='silver',
            description='Standard membership',
            hatchback_price=Decimal('1999.00'),
            sedan_price=Decimal('2999.00'),
            suv_price=Decimal('3999.00'),
            is_active=True,
            branch=self.branch
        )

        # Create membership benefit
        self.membership_benefit = MembershipBenefit.objects.create(
            plan=self.membership_plan,
            benefit_type='discount',
            title='10% Service Discount',
            description='Get 10% discount on all services',
            discount_percentage=Decimal('10.00'),
            is_active=True
        )

    def test_membership_benefit_creation(self):
        """Test membership benefit creation."""
        self.assertEqual(MembershipBenefit.objects.count(), 1)
        self.assertEqual(self.membership_benefit.benefit_type, 'discount')
        self.assertEqual(self.membership_benefit.title, '10% Service Discount')
        self.assertEqual(self.membership_benefit.discount_percentage, Decimal('10.00'))
        self.assertTrue(self.membership_benefit.is_active)
        self.assertEqual(str(self.membership_benefit), 'Silver Plan - 10% Service Discount')


class CustomerMembershipModelTestCase(TestCase):
    """Test cases for CustomerMembership model."""

    def setUp(self):
        """Set up test data."""
        # Create branch
        self.branch = Branch.objects.create(
            name='Test Branch',
            code='TB001',
            address='123 Test St',
            city='Test City',
            state='Test State',
            pincode='123456',
            phone='1234567890'
        )

        # Create customer user
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            phone='1234567890',
            role='customer',
            is_verified=True
        )

        # Create customer vehicle
        from customers.models import Customer, Vehicle
        self.customer_profile = Customer.objects.create(user=self.customer_user)
        self.vehicle = Vehicle.objects.create(
            customer=self.customer_profile,
            registration_number='TEST123',
            brand='Toyota',
            model='Corolla',
            year=2020,
            color='White'
        )

        # Create membership plan
        self.membership_plan = MembershipPlan.objects.create(
            name='Gold Plan',
            tier='gold',
            description='Premium membership',
            hatchback_price=Decimal('2999.00'),
            sedan_price=Decimal('3999.00'),
            suv_price=Decimal('4999.00'),
            gst_applicable=True,
            gst_rate=Decimal('18.00'),
            duration_value=12,
            duration_unit='months',
            free_washes_count=12,
            free_interior_cleaning_count=6,
            is_active=True,
            branch=self.branch
        )

        # Create customer membership
        self.customer_membership = CustomerMembership.objects.create(
            customer=self.customer_user,
            vehicle=self.vehicle,
            plan=self.membership_plan,
            vehicle_type='sedan',
            purchase_price=Decimal('3999.00'),
            gst_amount=Decimal('719.82'),  # 18% of 3999
            total_paid=Decimal('4718.82'),
            purchase_date=timezone.now(),
            start_date=date.today(),
            end_date=date.today().replace(year=date.today().year + 1),
            status='active',
            branch=self.branch
        )

    def test_customer_membership_creation(self):
        """Test customer membership creation."""
        self.assertEqual(CustomerMembership.objects.count(), 1)
        self.assertEqual(self.customer_membership.customer, self.customer_user)
        self.assertEqual(self.customer_membership.vehicle, self.vehicle)
        self.assertEqual(self.customer_membership.plan, self.membership_plan)
        self.assertEqual(self.customer_membership.status, 'active')
        self.assertIn('MEM-', self.customer_membership.membership_id)
        self.assertTrue(self.customer_membership.is_active)

    def test_customer_membership_properties(self):
        """Test customer membership properties."""
        # Test days_remaining
        self.assertGreater(self.customer_membership.days_remaining, 360)  # Should be close to 1 year
        
        # Test washes_remaining
        self.assertEqual(self.customer_membership.washes_remaining, 12)
        
        # Test interior_cleanings_remaining
        self.assertEqual(self.customer_membership.interior_cleanings_remaining, 6)

    def test_customer_membership_usage_methods(self):
        """Test customer membership usage methods."""
        # Test use_free_wash
        initial_washes = self.customer_membership.washes_remaining
        result = self.customer_membership.use_free_wash()
        self.assertTrue(result)
        self.customer_membership.refresh_from_db()
        self.assertEqual(self.customer_membership.washes_remaining, initial_washes - 1)
        
        # Test use_free_interior_cleaning
        initial_cleanings = self.customer_membership.interior_cleanings_remaining
        result = self.customer_membership.use_free_interior_cleaning()
        self.assertTrue(result)
        self.customer_membership.refresh_from_db()
        self.assertEqual(self.customer_membership.interior_cleanings_remaining, initial_cleanings - 1)


class CouponModelTestCase(TestCase):
    """Test cases for Coupon model."""

    def setUp(self):
        """Set up test data."""
        # Create branch
        self.branch = Branch.objects.create(
            name='Test Branch',
            code='TB001',
            address='123 Test St',
            city='Test City',
            state='Test State',
            pincode='123456',
            phone='1234567890'
        )

        # Create customer user
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            phone='1234567890',
            role='customer',
            is_verified=True
        )

        # Create coupon
        self.coupon = Coupon.objects.create(
            code='TESTCOUPON123',
            coupon_type='percentage',
            discount_percentage=Decimal('15.00'),
            valid_from=timezone.now(),
            valid_until=timezone.now() + timezone.timedelta(days=30),
            usage_limit=5,
            is_single_user=True,
            customer=self.customer_user,
            is_global=False,
            branch=self.branch,
            description='Test coupon for 15% discount',
            terms_conditions='Valid for 30 days'
        )

    def test_coupon_creation(self):
        """Test coupon creation."""
        self.assertEqual(Coupon.objects.count(), 1)
        self.assertEqual(self.coupon.code, 'TESTCOUPON123')
        self.assertEqual(self.coupon.coupon_type, 'percentage')
        self.assertEqual(self.coupon.discount_percentage, Decimal('15.00'))
        self.assertEqual(self.coupon.usage_limit, 5)
        self.assertTrue(self.coupon.is_single_user)
        self.assertEqual(str(self.coupon), 'TESTCOUPON123 (Percentage Discount)')

    def test_coupon_validation(self):
        """Test coupon validation method."""
        # Test valid coupon
        is_valid, message = self.coupon.is_valid(customer=self.customer_user, order_value=Decimal('1000.00'))
        self.assertTrue(is_valid)
        self.assertEqual(message, 'Valid')

        # Test expired coupon
        expired_coupon = Coupon.objects.create(
            code='EXPIRED123',
            coupon_type='percentage',
            discount_percentage=Decimal('10.00'),
            valid_from=timezone.now() - timezone.timedelta(days=60),
            valid_until=timezone.now() - timezone.timedelta(days=30),  # Expired 30 days ago
            usage_limit=1,
            status='active'
        )
        is_valid, message = expired_coupon.is_valid()
        self.assertFalse(is_valid)
        self.assertEqual(message, 'Coupon has expired')

    def test_coupon_discount_calculation(self):
        """Test coupon discount calculation."""
        # Test percentage coupon
        discount = self.coupon.calculate_discount(Decimal('1000.00'))
        self.assertEqual(discount, Decimal('150.00'))  # 15% of 1000

        # Test fixed amount coupon
        fixed_coupon = Coupon.objects.create(
            code='FIXED123',
            coupon_type='fixed',
            discount_amount=Decimal('200.00'),
            valid_from=timezone.now(),
            valid_until=timezone.now() + timezone.timedelta(days=30),
            usage_limit=1,
            status='active'
        )
        discount = fixed_coupon.calculate_discount(Decimal('1000.00'))
        self.assertEqual(discount, Decimal('200.00'))  # Fixed amount

    def test_coupon_usage(self):
        """Test coupon usage method."""
        # Test using coupon
        initial_times_used = self.coupon.times_used
        self.coupon.use()
        self.coupon.refresh_from_db()
        self.assertEqual(self.coupon.times_used, initial_times_used + 1)
        
        # Test that coupon status changes when usage limit is reached
        # Use coupon 4 more times to reach usage limit of 5
        for _ in range(4):
            self.coupon.use()
        self.coupon.refresh_from_db()
        self.assertEqual(self.coupon.times_used, 5)
        self.assertEqual(self.coupon.status, 'used')


class CouponUsageModelTestCase(TestCase):
    """Test cases for CouponUsage model."""

    def setUp(self):
        """Set up test data."""
        # Create branch
        self.branch = Branch.objects.create(
            name='Test Branch',
            code='TB001',
            address='123 Test St',
            city='Test City',
            state='Test State',
            pincode='123456',
            phone='1234567890'
        )

        # Create customer user
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            phone='1234567890',
            role='customer',
            is_verified=True
        )

        # Create coupon
        self.coupon = Coupon.objects.create(
            code='TESTCOUPON123',
            coupon_type='percentage',
            discount_percentage=Decimal('15.00'),
            valid_from=timezone.now(),
            valid_until=timezone.now() + timezone.timedelta(days=30),
            usage_limit=5,
            status='active'
        )

        # Create coupon usage
        self.coupon_usage = CouponUsage.objects.create(
            coupon=self.coupon,
            customer=self.customer_user,
            discount_applied=Decimal('150.00'),
            order_value=Decimal('1000.00')
        )

    def test_coupon_usage_creation(self):
        """Test coupon usage creation."""
        self.assertEqual(CouponUsage.objects.count(), 1)
        self.assertEqual(self.coupon_usage.coupon, self.coupon)
        self.assertEqual(self.coupon_usage.customer, self.customer_user)
        self.assertEqual(self.coupon_usage.discount_applied, Decimal('150.00'))
        self.assertEqual(self.coupon_usage.order_value, Decimal('1000.00'))
        self.assertEqual(str(self.coupon_usage), f'TESTCOUPON123 used by {self.customer_user.name}')

class CustomerMembershipAPITestCase(TestCase):
    """Test cases for CustomerMembership API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create branch
        self.branch = Branch.objects.create(
            name='Test Branch',
            code='TB001',
            address='123 Test St',
            city='Test City',
            state='Test State',
            pincode='123456',
            phone='1234567890'
        )

        # Create customer user
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            phone='1234567890',
            role='customer',
            is_verified=True
        )

        # Create admin user
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Test Admin',
            role='branch_admin',
            is_verified=True
        )
        self.admin_user.branch = self.branch
        self.admin_user.save()

        # Create customer vehicle
        from customers.models import Customer, Vehicle
        self.customer_profile = Customer.objects.create(user=self.customer_user)
        self.vehicle = Vehicle.objects.create(
            customer=self.customer_profile,
            registration_number='TEST123',
            brand='Toyota',
            model='Corolla',
            year=2020,
            color='White'
        )

        # Create membership plan
        self.membership_plan = MembershipPlan.objects.create(
            name='Gold Plan',
            tier='gold',
            description='Premium membership',
            hatchback_price=Decimal('2999.00'),
            sedan_price=Decimal('3999.00'),
            suv_price=Decimal('4999.00'),
            gst_applicable=True,
            gst_rate=Decimal('18.00'),
            duration_value=12,
            duration_unit='months',
            free_washes_count=12,
            free_interior_cleaning_count=6,
            is_active=True,
            branch=self.branch
        )

        # Create customer membership
        self.customer_membership = CustomerMembership.objects.create(
            customer=self.customer_user,
            vehicle=self.vehicle,
            plan=self.membership_plan,
            vehicle_type='sedan',
            purchase_price=Decimal('3999.00'),
            gst_amount=Decimal('719.82'),  # 18% of 3999
            total_paid=Decimal('4718.82'),
            purchase_date=timezone.now(),
            start_date=date.today(),
            end_date=date.today().replace(year=date.today().year + 1),
            status='active',
            branch=self.branch
        )

    def test_customer_can_list_own_memberships(self):
        """Test that customers can list their own memberships."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.get('/api/memberships/subscriptions/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['membership_id'], self.customer_membership.membership_id)

    def test_admin_can_list_memberships(self):
        """Test that admins can list memberships."""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get('/api/memberships/subscriptions/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['membership_id'], self.customer_membership.membership_id)

    def test_unauthenticated_user_cannot_access_endpoints(self):
        """Test that unauthenticated users cannot access membership endpoints."""
        # Don't authenticate

        # Test membership plans endpoint
        response = self.client.get('/api/memberships/plans/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test customer memberships endpoint
        response = self.client.get('/api/memberships/subscriptions/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test coupons endpoint
        response = self.client.get('/api/memberships/coupons/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class MembershipPlanAPITestCase(TestCase):
    """Test cases for MembershipPlan API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create branch
        self.branch = Branch.objects.create(
            name='Test Branch',
            code='TB001',
            address='123 Test St',
            city='Test City',
            state='Test State',
            pincode='123456',
            phone='1234567890'
        )

        # Create customer user
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            phone='1234567890',
            role='customer',
            is_verified=True
        )

        # Create admin user
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Test Admin',
            role='branch_admin',
            is_verified=True
        )
        self.admin_user.branch = self.branch
        self.admin_user.save()

        # Create membership plan
        self.membership_plan = MembershipPlan.objects.create(
            name='Gold Plan',
            tier='gold',
            description='Premium membership with great benefits',
            hatchback_price=Decimal('2999.00'),
            sedan_price=Decimal('3999.00'),
            suv_price=Decimal('4999.00'),
            gst_applicable=True,
            gst_rate=Decimal('18.00'),
            duration_value=12,
            duration_unit='months',
            discount_percentage=Decimal('15.00'),
            free_washes_count=12,
            free_interior_cleaning_count=6,
            coupons_per_month=2,
            coupon_discount_percentage=Decimal('20.00'),
            priority_booking=True,
            is_active=True,
            is_popular=True,
            display_order=1,
            is_global=True,
            branch=self.branch
        )

    def test_customer_can_list_membership_plans(self):
        """Test that customers can list membership plans."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.get('/api/memberships/plans/public/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Gold Plan')

    def test_admin_can_list_membership_plans(self):
        """Test that admins can list membership plans."""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get('/api/memberships/plans/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Gold Plan')

    def test_unauthenticated_user_cannot_access_membership_plan_endpoints(self):
        """Test that unauthenticated users cannot access membership plan endpoints."""
        # Don't authenticate

        # Test plans endpoint
        response = self.client.get('/api/memberships/plans/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test public plans endpoint (this should be accessible)
        response = self.client.get('/api/memberships/plans/public/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

class CouponAPITestCase(TestCase):
    """Test cases for Coupon API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create branch
        self.branch = Branch.objects.create(
            name='Test Branch',
            code='TB001',
            address='123 Test St',
            city='Test City',
            state='Test State',
            pincode='123456',
            phone='1234567890'
        )

        # Create customer user
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            phone='1234567890',
            role='customer',
            is_verified=True
        )

        # Create admin user
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Test Admin',
            role='branch_admin',
            is_verified=True
        )
        self.admin_user.branch = self.branch
        self.admin_user.save()

        # Create coupon
        self.coupon = Coupon.objects.create(
            code='TESTCOUPON123',
            coupon_type='percentage',
            discount_percentage=Decimal('15.00'),
            valid_from=timezone.now(),
            valid_until=timezone.now() + timezone.timedelta(days=30),
            usage_limit=5,
            is_single_user=True,
            customer=self.customer_user,
            is_global=False,
            branch=self.branch,
            description='Test coupon for 15% discount',
            status='active'
        )

    def test_customer_can_list_own_coupons(self):
        """Test that customers can list their own coupons."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.get('/api/memberships/coupons/my_coupons/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['code'], 'TESTCOUPON123')

    def test_admin_can_list_coupons(self):
        """Test that admins can list coupons."""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get('/api/memberships/coupons/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['code'], 'TESTCOUPON123')

    def test_unauthenticated_user_cannot_access_coupon_endpoints(self):
        """Test that unauthenticated users cannot access coupon endpoints."""
        # Don't authenticate

        # Test coupons endpoint
        response = self.client.get('/api/memberships/coupons/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test my_coupons endpoint
        response = self.client.get('/api/memberships/coupons/my_coupons/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
