"""
Test cases for the pickup app.

This file contains comprehensive tests for:
- PickupDropRequest model operations
- PickupDropRequest API endpoints
- Permission checks for pickup/drop management
- Driver assignment functionality
- Status update functionality
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch
from .models import PickupDropRequest
from bookings.models import Booking
from customers.models import Customer, Vehicle
from services.models import ServicePackage
from branches.models import Branch

User = get_user_model()


class PickupDropRequestModelTestCase(TestCase):
    """Test cases for PickupDropRequest model."""

    def setUp(self):
        """Set up test data."""
        # Create branch
        self.branch = Branch.objects.create(
            name='Test Branch',
            code='TB001',
            address='123 Test Street',
            phone='+1234567890',
            email='branch@test.com',
            is_active=True
        )

        # Create users
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            role='customer',
            is_verified=True,
            phone='+1234567890'
        )

        self.staff_user = User.objects.create_user(
            email='staff@example.com',
            password='testpass123',
            name='Test Staff',
            role='applicator',
            is_verified=True,
            branch=self.branch
        )

        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Test Admin',
            role='branch_admin',
            is_verified=True,
            branch=self.branch
        )

        self.super_admin_user = User.objects.create_user(
            email='superadmin@example.com',
            password='testpass123',
            name='Test Super Admin',
            role='super_admin',
            is_verified=True
        )

        # Create customer
        self.customer = Customer.objects.create(
            user=self.customer_user
        )

        # Create vehicle
        self.vehicle = Vehicle.objects.create(
            customer=self.customer,
            registration_number='TEST123',
            brand='TestBrand',
            model='TestModel',
            color='Red'
        )

        # Create service package
        self.service_package = ServicePackage.objects.create(
            name='Test Service',
            description='Test service description',
            price=Decimal('100.00'),
            duration=60
        )

        # Create booking
        self.booking = Booking(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.service_package,
            booking_datetime=timezone.now() + timedelta(days=1),
            total_price=Decimal('100.00'),
            status='pending',
            branch=self.branch
        )
        self.booking.save(addons=[])

        # Create pickup request
        self.pickup_request = PickupDropRequest.objects.create(
            booking=self.booking,
            request_type='pickup',
            status='pending'
        )

    def test_pickup_request_creation(self):
        """Test pickup request creation."""
        self.assertEqual(PickupDropRequest.objects.count(), 1)
        self.assertEqual(self.pickup_request.booking, self.booking)
        self.assertEqual(self.pickup_request.request_type, 'pickup')
        self.assertEqual(self.pickup_request.status, 'pending')
        self.assertIsNone(self.pickup_request.driver)
        self.assertIsNone(self.pickup_request.pickup_time)
        self.assertIsNone(self.pickup_request.drop_time)
        self.assertEqual(str(self.pickup_request),
                         f"Pickup Request #{self.pickup_request.id} - Booking #{self.booking.id} - pending")

    def test_pickup_request_with_driver(self):
        """Test pickup request with driver assignment."""
        self.pickup_request.driver = self.staff_user
        self.pickup_request.status = 'driver_assigned'
        self.pickup_request.save()

        self.assertEqual(self.pickup_request.driver, self.staff_user)
        self.assertEqual(self.pickup_request.status, 'driver_assigned')

    def test_pickup_request_with_times(self):
        """Test pickup request with pickup and drop times."""
        pickup_time = timezone.now()
        drop_time = pickup_time + timedelta(hours=2)

        self.pickup_request.pickup_time = pickup_time
        self.pickup_request.drop_time = drop_time
        self.pickup_request.status = 'delivered'
        self.pickup_request.save()

        self.assertEqual(self.pickup_request.pickup_time, pickup_time)
        self.assertEqual(self.pickup_request.drop_time, drop_time)
        self.assertEqual(self.pickup_request.status, 'delivered')

    def test_pickup_request_default_values(self):
        """Test pickup request default values."""
        # Create another booking for this test
        booking2 = Booking(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.service_package,
            booking_datetime=timezone.now() + timedelta(days=2),
            total_price=Decimal('150.00'),
            status='pending',
            branch=self.branch
        )
        booking2.save(addons=[])

        pickup_request = PickupDropRequest.objects.create(
            booking=booking2,
            request_type='drop'
        )
        self.assertEqual(pickup_request.request_type, 'drop')
        self.assertEqual(pickup_request.status, 'pending')
        self.assertIsNone(pickup_request.driver)
        self.assertIsNone(pickup_request.pickup_time)
        self.assertIsNone(pickup_request.drop_time)
        self.assertIsNone(pickup_request.pickup_notes)
        self.assertIsNone(pickup_request.drop_notes)


# Mock the Redis-dependent functions to prevent connection errors during testing
@patch('notify.websocket_utils.broadcast_dashboard_update')
@patch('notify.websocket_utils.broadcast_booking_update')
class PickupDropRequestAPITestCase(TestCase):
    """Test cases for PickupDropRequest API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create branches
        self.branch1 = Branch.objects.create(
            name='Branch 1',
            code='BR001',
            address='123 Test Street',
            phone='+1234567890',
            email='branch1@test.com',
            is_active=True
        )

        self.branch2 = Branch.objects.create(
            name='Branch 2',
            code='BR002',
            address='456 Test Avenue',
            phone='+1987654321',
            email='branch2@test.com',
            is_active=True
        )

        # Create users
        self.customer_user1 = User.objects.create_user(
            email='customer1@example.com',
            password='testpass123',
            name='Customer 1',
            role='customer',
            is_verified=True,
            phone='+1234567890'
        )

        self.customer_user2 = User.objects.create_user(
            email='customer2@example.com',
            password='testpass123',
            name='Customer 2',
            role='customer',
            is_verified=True,
            phone='+1987654321'
        )

        self.staff_user1 = User.objects.create_user(
            email='staff1@example.com',
            password='testpass123',
            name='Staff 1',
            role='supervisor',
            is_verified=True,
            branch=self.branch1
        )

        self.staff_user2 = User.objects.create_user(
            email='staff2@example.com',
            password='testpass123',
            name='Staff 2',
            role='supervisor',
            is_verified=True,
            branch=self.branch2
        )

        self.admin_user1 = User.objects.create_user(
            email='admin1@example.com',
            password='testpass123',
            name='Admin 1',
            role='branch_admin',
            is_verified=True,
            branch=self.branch1
        )

        self.admin_user2 = User.objects.create_user(
            email='admin2@example.com',
            password='testpass123',
            name='Admin 2',
            role='branch_admin',
            is_verified=True,
            branch=self.branch2
        )

        self.super_admin_user = User.objects.create_user(
            email='superadmin@example.com',
            password='testpass123',
            name='Super Admin',
            role='super_admin',
            is_verified=True
        )

        # Create customers
        self.customer1 = Customer.objects.create(
            user=self.customer_user1
        )

        self.customer2 = Customer.objects.create(
            user=self.customer_user2
        )

        # Create vehicles
        self.vehicle1 = Vehicle.objects.create(
            customer=self.customer1,
            registration_number='TEST123',
            brand='TestBrand',
            model='TestModel',
            color='Red'
        )

        self.vehicle2 = Vehicle.objects.create(
            customer=self.customer2,
            registration_number='TEST456',
            brand='TestBrand',
            model='TestModel',
            color='Blue'
        )

        # Create service packages
        self.service_package1 = ServicePackage.objects.create(
            name='Service 1',
            description='Service 1 description',
            price=Decimal('100.00'),
            duration=60
        )

        self.service_package2 = ServicePackage.objects.create(
            name='Service 2',
            description='Service 2 description',
            price=Decimal('150.00'),
            duration=90
        )

        # Create bookings
        self.booking1 = Booking(
            customer=self.customer1,
            vehicle=self.vehicle1,
            package=self.service_package1,
            booking_datetime=timezone.now() + timedelta(days=1),
            total_price=Decimal('100.00'),
            status='pending',
            branch=self.branch1
        )
        self.booking1.save(addons=[])

        self.booking2 = Booking(
            customer=self.customer2,
            vehicle=self.vehicle2,
            package=self.service_package2,
            booking_datetime=timezone.now() + timedelta(days=2),
            total_price=Decimal('150.00'),
            status='pending',
            branch=self.branch2
        )
        self.booking2.save(addons=[])

        # Create pickup requests
        self.pickup_request1 = PickupDropRequest.objects.create(
            booking=self.booking1,
            request_type='pickup',
            status='pending'
        )

        self.pickup_request2 = PickupDropRequest.objects.create(
            booking=self.booking2,
            request_type='drop',
            status='driver_assigned',
            driver=self.staff_user2
        )

    def test_customer_can_list_own_pickup_requests(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test that customers can list their own pickup requests."""
        self.client.force_authenticate(user=self.customer_user1)

        response = self.client.get('/api/pickup/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results']
                         [0]['id'], self.pickup_request1.id)

    def test_customer_cannot_see_other_pickup_requests(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test that customers cannot see other customers' pickup requests."""
        self.client.force_authenticate(user=self.customer_user1)

        # Try to access pickup_request2 which belongs to customer2
        response = self.client.get(f'/api/pickup/{self.pickup_request2.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_can_list_branch_pickup_requests(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test that staff can list pickup requests from their branch."""
        self.client.force_authenticate(user=self.staff_user1)

        response = self.client.get('/api/pickup/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results']
                         [0]['id'], self.pickup_request1.id)

    def test_staff_cannot_see_other_branch_pickup_requests(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test that staff cannot see pickup requests from other branches."""
        self.client.force_authenticate(user=self.staff_user1)

        # Try to access pickup_request2 which belongs to branch2
        response = self.client.get(f'/api/pickup/{self.pickup_request2.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_list_branch_pickup_requests(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test that admins can list pickup requests from their branch."""
        self.client.force_authenticate(user=self.admin_user1)

        response = self.client.get('/api/pickup/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results']
                         [0]['id'], self.pickup_request1.id)

    def test_admin_cannot_see_other_branch_pickup_requests(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test that admins cannot see pickup requests from other branches."""
        self.client.force_authenticate(user=self.admin_user1)

        # Try to access pickup_request2 which belongs to branch2
        response = self.client.get(f'/api/pickup/{self.pickup_request2.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_super_admin_can_list_all_pickup_requests(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test that super admins can list all pickup requests."""
        self.client.force_authenticate(user=self.super_admin_user)

        response = self.client.get('/api/pickup/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_super_admin_can_access_any_pickup_request(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test that super admins can access any pickup request."""
        self.client.force_authenticate(user=self.super_admin_user)

        response = self.client.get(f'/api/pickup/{self.pickup_request1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.pickup_request1.id)

    def test_create_pickup_request_valid(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test creating pickup request with valid data."""
        self.client.force_authenticate(user=self.customer_user1)

        # Create another booking for customer1
        booking3 = Booking(
            customer=self.customer1,
            vehicle=self.vehicle1,
            package=self.service_package1,
            booking_datetime=timezone.now() + timedelta(days=3),
            total_price=Decimal('200.00'),
            status='pending',
            branch=self.branch1
        )
        booking3.save(addons=[])

        data = {
            'booking': booking3.id,
            'request_type': 'pickup'
        }

        response = self.client.post('/api/pickup/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PickupDropRequest.objects.count(), 3)
        self.assertEqual(response.data['request_type'], 'pickup')
        self.assertEqual(response.data['status'], 'pending')

    def test_create_pickup_request_invalid_booking(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test creating pickup request with invalid booking."""
        self.client.force_authenticate(user=self.customer_user1)

        data = {
            'booking': 99999,  # Non-existent booking
            'request_type': 'pickup'
        }

        response = self.client.post('/api/pickup/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assign_driver_same_branch(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test assigning driver from same branch."""
        self.client.force_authenticate(user=self.admin_user1)

        data = {
            'driver_id': self.staff_user1.id
        }

        response = self.client.put(
            f'/api/pickup/{self.pickup_request1.id}/assign_driver/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['driver'], self.staff_user1.id)
        self.assertEqual(response.data['status'], 'driver_assigned')

        # Verify the pickup request was updated
        self.pickup_request1.refresh_from_db()
        self.assertEqual(self.pickup_request1.driver, self.staff_user1)
        self.assertEqual(self.pickup_request1.status, 'driver_assigned')

    def test_assign_driver_different_branch(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test assigning driver from different branch (should fail)."""
        self.client.force_authenticate(user=self.admin_user1)

        data = {
            'driver_id': self.staff_user2.id  # Staff from different branch
        }

        response = self.client.put(
            f'/api/pickup/{self.pickup_request1.id}/assign_driver/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_assign_driver_invalid_driver(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test assigning invalid driver."""
        self.client.force_authenticate(user=self.admin_user1)

        data = {
            'driver_id': 99999  # Non-existent driver
        }

        response = self.client.put(
            f'/api/pickup/{self.pickup_request1.id}/assign_driver/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_update_status_valid(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test updating pickup request status with valid status."""
        self.client.force_authenticate(user=self.admin_user1)

        data = {
            'status': 'picked_up'
        }

        response = self.client.put(
            f'/api/pickup/{self.pickup_request1.id}/update_status/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'picked_up')

        # Verify the pickup request was updated
        self.pickup_request1.refresh_from_db()
        self.assertEqual(self.pickup_request1.status, 'picked_up')

    def test_update_status_invalid(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test updating pickup request status with invalid status."""
        self.client.force_authenticate(user=self.admin_user1)

        data = {
            'status': 'invalid_status'
        }

        response = self.client.put(
            f'/api/pickup/{self.pickup_request1.id}/update_status/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_unauthenticated_user_cannot_access_pickup_endpoints(self, mock_broadcast_booking, mock_broadcast_dashboard):
        """Test that unauthenticated users cannot access pickup endpoints."""
        # Don't authenticate

        # Test list
        response = self.client.get('/api/pickup/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test detail
        response = self.client.get(f'/api/pickup/{self.pickup_request1.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test create
        data = {
            'booking': self.booking1.id,
            'request_type': 'pickup'
        }
        response = self.client.post('/api/pickup/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test assign driver
        data = {
            'driver_id': self.staff_user1.id
        }
        response = self.client.put(
            f'/api/pickup/{self.pickup_request1.id}/assign_driver/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test update status
        data = {
            'status': 'picked_up'
        }
        response = self.client.put(
            f'/api/pickup/{self.pickup_request1.id}/update_status/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
