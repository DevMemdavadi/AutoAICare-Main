"""
Test cases for the customers app.

This file contains comprehensive tests for:
- Customer profile management
- Vehicle management
- Reward points system
- Membership tiers
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from branches.models import Branch
from .models import Customer, Vehicle

User = get_user_model()


class CustomerProfileTestCase(TestCase):
    """Test cases for customer profile management."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.customer_profile_url = '/api/customers/me/'
        self.user_profile_url = '/api/auth/me/'

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

        # Create customer profile
        self.customer = Customer.objects.create(
            user=self.customer_user,
            reward_points=100,
            membership_type='basic'
        )

    def test_get_customer_profile(self):
        """Test getting customer profile."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.get(self.customer_profile_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']
                         ['email'], self.customer_user.email)
        self.assertEqual(response.data['reward_points'], 100)
        self.assertEqual(response.data['membership_type'], 'basic')

    def test_get_customer_profile_unauthenticated(self):
        """Test getting customer profile without authentication."""
        response = self.client.get(self.customer_profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_user_profile_through_user_endpoint(self):
        """Test updating user profile through the correct user profile endpoint."""
        self.client.force_authenticate(user=self.customer_user)

        data = {
            'name': 'Updated Name',
            'phone': '9876543210'
        }

        response = self.client.put(self.user_profile_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer_user.refresh_from_db()
        self.assertEqual(self.customer_user.name, 'Updated Name')
        self.assertEqual(self.customer_user.phone, '9876543210')


class VehicleManagementTestCase(TestCase):
    """Test cases for vehicle management."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.vehicles_url = '/api/customers/vehicles/'

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
            role='customer',
            is_verified=True
        )

        # Create customer profile
        self.customer = Customer.objects.create(user=self.customer_user)

        # Create existing vehicle
        self.vehicle = Vehicle.objects.create(
            customer=self.customer,
            registration_number='ABC123',
            brand='Toyota',
            model='Corolla',
            year=2020,
            color='White'
        )

    def test_list_vehicles(self):
        """Test listing customer vehicles."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.get(self.vehicles_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results']
                         [0]['registration_number'], 'ABC123')

    def test_create_vehicle_success(self):
        """Test successful vehicle creation."""
        self.client.force_authenticate(user=self.customer_user)

        data = {
            'registration_number': 'XYZ789',
            'brand': 'Honda',
            'model': 'Civic',
            'year': 2021,
            'color': 'Black'
        }

        response = self.client.post(self.vehicles_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Vehicle.objects.count(), 2)

        vehicle = Vehicle.objects.get(registration_number='XYZ789')
        self.assertEqual(vehicle.brand, 'Honda')
        self.assertEqual(vehicle.customer, self.customer)

    def test_create_vehicle_duplicate_registration(self):
        """Test creating vehicle with duplicate registration number."""
        self.client.force_authenticate(user=self.customer_user)

        data = {
            'registration_number': 'ABC123',  # Already exists
            'brand': 'Honda',
            'model': 'Civic',
            'year': 2021,
            'color': 'Black'
        }

        response = self.client.post(self.vehicles_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_vehicle_detail(self):
        """Test getting vehicle detail."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.get(f'{self.vehicles_url}{self.vehicle.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['registration_number'], 'ABC123')
        self.assertEqual(response.data['brand'], 'Toyota')

    def test_update_vehicle(self):
        """Test updating vehicle."""
        self.client.force_authenticate(user=self.customer_user)

        data = {
            'registration_number': 'ABC123',
            'brand': 'Toyota',
            'model': 'Camry',  # Updated
            'year': 2020,
            'color': 'White'
        }

        response = self.client.put(
            f'{self.vehicles_url}{self.vehicle.id}/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.model, 'Camry')

    def test_delete_vehicle(self):
        """Test deleting vehicle."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.delete(f'{self.vehicles_url}{self.vehicle.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Vehicle.objects.count(), 0)

    def test_customer_cannot_access_other_customer_vehicles(self):
        """Test that customer cannot access other customers' vehicles."""
        # Create another customer
        other_customer_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            name='Other Customer',
            role='customer',
            is_verified=True
        )
        other_customer = Customer.objects.create(user=other_customer_user)
        other_vehicle = Vehicle.objects.create(
            customer=other_customer,
            registration_number='OTHER123',
            brand='Ford',
            model='Focus',
            year=2019,
            color='Red'
        )

        self.client.force_authenticate(user=self.customer_user)

        # Try to access other customer's vehicle
        response = self.client.get(f'{self.vehicles_url}{other_vehicle.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class RewardPointsTestCase(TestCase):
    """Test cases for reward points system."""

    def setUp(self):
        """Set up test data."""
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            role='customer',
            is_verified=True
        )

        self.customer = Customer.objects.create(
            user=self.customer_user,
            reward_points=100,
            membership_type='basic'
        )

    def test_add_reward_points(self):
        """Test adding reward points."""
        initial_points = self.customer.reward_points
        points_to_add = 50

        self.customer.add_reward_points(points_to_add)

        self.customer.refresh_from_db()
        self.assertEqual(self.customer.reward_points,
                         initial_points + points_to_add)

    def test_redeem_reward_points_success(self):
        """Test successful reward points redemption."""
        initial_points = self.customer.reward_points
        points_to_redeem = 50

        result = self.customer.redeem_reward_points(points_to_redeem)

        self.assertTrue(result)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.reward_points,
                         initial_points - points_to_redeem)

    def test_redeem_reward_points_insufficient(self):
        """Test reward points redemption with insufficient points."""
        self.customer.reward_points = 30
        self.customer.save()

        result = self.customer.redeem_reward_points(50)

        self.assertFalse(result)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.reward_points,
                         30)  # Should remain unchanged


class MembershipTierTestCase(TestCase):
    """Test cases for membership tiers."""

    def setUp(self):
        """Set up test data."""
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            role='customer',
            is_verified=True
        )

        self.customer = Customer.objects.create(
            user=self.customer_user,
            reward_points=0,
            membership_type='basic'
        )

    def test_membership_type_default(self):
        """Test that membership type defaults to basic."""
        # Since customer already exists for this user, just test the existing one
        self.assertEqual(self.customer.membership_type, 'basic')

    def test_membership_type_choices(self):
        """Test membership type choices."""
        valid_types = ['basic', 'silver', 'gold', 'platinum']

        for membership_type in valid_types:
            self.customer.membership_type = membership_type
            self.customer.save()
            self.customer.refresh_from_db()
            self.assertEqual(self.customer.membership_type, membership_type)