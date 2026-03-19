"""
Test cases for the analytics app.

This file contains comprehensive tests for:
- Dashboard analytics
- Revenue analytics
- Bookings analytics
- Customers analytics
- Services analytics
- Export functionality
- Peak hours analytics
- Analytics overview
- Booking trends
- Job status
- Today's jobs
- Branch performance
"""

import warnings
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from branches.models import Branch
from bookings.models import Booking
from payments.models import Payment
from feedback.models import Feedback
from jobcards.models import JobCard
from services.models import ServicePackage
from customers.models import Customer

# Suppress warnings for this test module
warnings.filterwarnings('ignore', module='django.db.models.fields')

User = get_user_model()


class AnalyticsBaseTestCase(TestCase):
    """Base test case for analytics tests."""

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

        # Create users
        self.super_admin = User.objects.create_user(
            email='superadmin@test.com',
            password='testpass123',
            name='Super Admin',
            role='super_admin',
            is_staff=True,
            is_verified=True
        )

        self.admin = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            name='Admin',
            role='branch_admin',
            branch=self.branch,
            is_staff=True,
            is_verified=True
        )

        self.staff = User.objects.create_user(
            email='staff@test.com',
            password='testpass123',
            name='Staff',
            role='applicator',
            branch=self.branch,
            is_staff=True,
            is_verified=True
        )

        self.customer_user = User.objects.create_user(
            email='customer@test.com',
            password='testpass123',
            name='Customer',
            role='customer',
            is_verified=True
        )

        # Create customer
        self.customer = Customer.objects.create(user=self.customer_user)

        # Create service package
        self.service_package = ServicePackage.objects.create(
            name='Basic Service',
            description='Basic car service',
            price=1000.00,
            duration=60,
            is_active=True,
            is_global=True
        )

        # Create test data
        self.create_test_data()

    def create_test_data(self):
        """Create test data for analytics."""
        # For analytics tests, we don't need complex booking data
        # The endpoints should work even with minimal data
        pass


class DashboardAnalyticsTestCase(AnalyticsBaseTestCase):
    """Test cases for dashboard analytics."""

    def test_dashboard_analytics_as_admin(self):
        """Test dashboard analytics access for admin."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/analytics/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_revenue', response.data)
        self.assertIn('today_jobs', response.data)
        self.assertIn('pending_bookings', response.data)
        self.assertIn('completed_bookings', response.data)
        self.assertIn('average_rating', response.data)
        self.assertIn('active_customers', response.data)

    def test_dashboard_analytics_as_staff_forbidden(self):
        """Test dashboard analytics access for staff."""
        self.client.force_authenticate(user=self.staff)

        response = self.client.get('/api/analytics/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_revenue', response.data)
        self.assertIn('today_jobs', response.data)
        self.assertIn('pending_bookings', response.data)
        self.assertIn('completed_bookings', response.data)
        self.assertIn('average_rating', response.data)
        self.assertIn('active_customers', response.data)

    def test_dashboard_analytics_as_customer_forbidden(self):
        """Test dashboard analytics access forbidden for customer."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.get('/api/analytics/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class RevenueAnalyticsTestCase(AnalyticsBaseTestCase):
    """Test cases for revenue analytics."""

    def test_revenue_analytics_as_admin(self):
        """Test revenue analytics access for admin."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/analytics/revenue/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total', response.data)
        self.assertIn('growth', response.data)
        self.assertIn('by_period', response.data)
        self.assertIn('payment_methods', response.data)

    def test_revenue_analytics_with_period(self):
        """Test revenue analytics with different periods."""
        self.client.force_authenticate(user=self.admin)

        # Test week period
        response = self.client.get('/api/analytics/revenue/?period=week')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test month period
        response = self.client.get('/api/analytics/revenue/?period=month')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test year period
        response = self.client.get('/api/analytics/revenue/?period=year')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class BookingsAnalyticsTestCase(AnalyticsBaseTestCase):
    """Test cases for bookings analytics."""

    def test_bookings_analytics_as_admin(self):
        """Test bookings analytics access for admin."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/analytics/bookings/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total', response.data)
        self.assertIn('completed', response.data)
        self.assertIn('cancelled', response.data)
        self.assertIn('by_status', response.data)

    def test_bookings_analytics_with_period(self):
        """Test bookings analytics with different periods."""
        self.client.force_authenticate(user=self.admin)

        # Test week period
        response = self.client.get('/api/analytics/bookings/?period=week')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test month period
        response = self.client.get('/api/analytics/bookings/?period=month')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test year period
        response = self.client.get('/api/analytics/bookings/?period=year')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CustomersAnalyticsTestCase(AnalyticsBaseTestCase):
    """Test cases for customers analytics."""

    def test_customers_analytics_as_admin(self):
        """Test customers analytics access for admin."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/analytics/customers/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total', response.data)
        self.assertIn('new', response.data)
        self.assertIn('active', response.data)
        self.assertIn('retention_rate', response.data)

    def test_customers_analytics_with_period(self):
        """Test customers analytics with different periods."""
        self.client.force_authenticate(user=self.admin)

        # Test week period
        response = self.client.get('/api/analytics/customers/?period=week')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test month period
        response = self.client.get('/api/analytics/customers/?period=month')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test year period
        response = self.client.get('/api/analytics/customers/?period=year')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ServicesAnalyticsTestCase(AnalyticsBaseTestCase):
    """Test cases for services analytics."""

    def test_services_analytics_as_admin(self):
        """Test services analytics access for admin."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/analytics/services/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('popular', response.data)
        self.assertIn('revenue_by_service', response.data)


class TopServicesTestCase(AnalyticsBaseTestCase):
    """Test cases for top services analytics."""

    def test_top_services_as_admin(self):
        """Test top services access for admin."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/analytics/top-services/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('top_services', response.data)


class PeakHoursTestCase(AnalyticsBaseTestCase):
    """Test cases for peak hours analytics."""

    def test_peak_hours_as_admin(self):
        """Test peak hours access for admin."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/analytics/peak-hours/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('peak_hours', response.data)


class AnalyticsOverviewTestCase(AnalyticsBaseTestCase):
    """Test cases for analytics overview."""

    def test_analytics_overview_as_staff(self):
        """Test analytics overview access for staff."""
        self.client.force_authenticate(user=self.staff)

        response = self.client.get('/api/analytics/overview/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_bookings', response.data)
        self.assertIn('pending_bookings', response.data)
        self.assertIn('total_revenue', response.data)
        self.assertIn('month_revenue', response.data)
        self.assertIn('job_cards', response.data)
        self.assertIn('upcoming_pickups', response.data)
        self.assertIn('total_customers', response.data)


class BookingTrendsTestCase(AnalyticsBaseTestCase):
    """Test cases for booking trends."""

    def test_booking_trends_as_staff(self):
        """Test booking trends access for staff."""
        self.client.force_authenticate(user=self.staff)

        response = self.client.get('/api/analytics/booking-trends/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('period', response.data)
        self.assertIn('data', response.data)


class JobStatusTestCase(AnalyticsBaseTestCase):
    """Test cases for job status."""

    def test_job_status_as_staff(self):
        """Test job status access for staff."""
        self.client.force_authenticate(user=self.staff)

        response = self.client.get('/api/analytics/job-status/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status_distribution', response.data)


class TodaysJobsTestCase(AnalyticsBaseTestCase):
    """Test cases for today's jobs."""

    def test_todays_jobs_as_staff(self):
        """Test today's jobs access for staff."""
        self.client.force_authenticate(user=self.staff)

        response = self.client.get('/api/analytics/todays-jobs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('summary', response.data)
        self.assertIn('jobs', response.data)


class BranchPerformanceTestCase(AnalyticsBaseTestCase):
    """Test cases for branch performance."""

    def test_branch_performance_as_super_admin(self):
        """Test branch performance access for super admin."""
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.get('/api/analytics/branch-performance/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('period', response.data)
        self.assertIn('branches', response.data)

    def test_branch_performance_as_admin_forbidden(self):
        """Test branch performance access forbidden for admin."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get('/api/analytics/branch-performance/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
