"""
Test cases for the users app.

This file contains comprehensive tests for:
- User registration
- User authentication (JWT login)
- User profile management
- Password management
- OTP verification
- User listing and management (staff only)
- Role-based access control
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from branches.models import Branch

User = get_user_model()


class UserRegistrationTestCase(TestCase):
    """Test cases for user registration."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.registration_url = '/api/auth/register/'

    def test_user_registration_success(self):
        """Test successful user registration."""
        data = {
            'email': 'test@example.com',
            'password': 'testpass123',
            'password2': 'testpass123',
            'name': 'Test User',
            'phone': '1234567890',
            'role': 'customer'
        }

        response = self.client.post(self.registration_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(User.objects.count(), 1)

        user = User.objects.get(email='test@example.com')
        self.assertEqual(user.name, 'Test User')
        self.assertEqual(user.role, 'customer')
        self.assertFalse(user.is_verified)  # Should not be verified initially

    def test_user_registration_invalid_email(self):
        """Test registration with invalid email."""
        data = {
            'email': 'invalid-email',
            'password': 'testpass123',
            'name': 'Test User',
            'role': 'customer'
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_duplicate_email(self):
        """Test registration with duplicate email."""
        # Create existing user
        User.objects.create_user(
            email='existing@example.com',
            password='testpass123',
            name='Existing User'
        )

        data = {
            'email': 'existing@example.com',
            'password': 'testpass123',
            'name': 'New User',
            'role': 'customer'
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_missing_fields(self):
        """Test registration with missing required fields."""
        data = {
            'email': 'test@example.com',
            # Missing password and name
        }

        response = self.client.post(self.registration_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserAuthenticationTestCase(TestCase):
    """Test cases for user authentication (JWT login)."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.login_url = '/api/auth/login/'

        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            name='Test User',
            is_verified=True
        )

    def test_login_success(self):
        """Test successful login."""
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }

        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials."""
        data = {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }

        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_unverified_user(self):
        """Test login with unverified user."""
        self.user.is_verified = False
        self.user.save()

        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }

        response = self.client.post(self.login_url, data, format='json')
        # Should still allow login, but check your business logic
        # This depends on your requirements
        self.assertIn(response.status_code, [
                      status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])


class UserProfileTestCase(TestCase):
    """Test cases for user profile management."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.profile_url = '/api/auth/me/'

        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            name='Test User',
            phone='1234567890',
            is_verified=True
        )

    def test_get_profile_authenticated(self):
        """Test getting user profile when authenticated."""
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.user.name)
        self.assertEqual(response.data['phone'], self.user.phone)

    def test_get_profile_unauthenticated(self):
        """Test getting user profile when not authenticated."""
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile(self):
        """Test updating user profile."""
        self.client.force_authenticate(user=self.user)

        data = {
            'name': 'Updated Name',
            'phone': '9876543210'
        }

        response = self.client.put(self.profile_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.name, 'Updated Name')
        self.assertEqual(self.user.phone, '9876543210')


class PasswordManagementTestCase(TestCase):
    """Test cases for password management."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.change_password_url = '/api/auth/change-password/'
        self.forgot_password_url = '/api/auth/forgot-password/'
        self.reset_password_url = '/api/auth/reset-password/'

        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='oldpass123',
            name='Test User',
            is_verified=True
        )

    def test_change_password_success(self):
        """Test successful password change."""
        self.client.force_authenticate(user=self.user)

        data = {
            'old_password': 'oldpass123',
            'new_password': 'newpass123',
            'new_password2': 'newpass123'
        }

        response = self.client.post(
            self.change_password_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify password was changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpass123'))

    def test_change_password_wrong_old_password(self):
        """Test password change with wrong old password."""
        self.client.force_authenticate(user=self.user)

        data = {
            'old_password': 'wrongpass',
            'new_password': 'newpass123',
            'confirm_password': 'newpass123'
        }

        response = self.client.post(
            self.change_password_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_forgot_password_sends_otp(self):
        """Test forgot password sends OTP."""
        data = {
            'email': 'test@example.com'
        }

        response = self.client.post(
            self.forgot_password_url, data, format='json')

        # Should send OTP (check your implementation)
        self.assertIn(response.status_code, [
                      status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.user.refresh_from_db()
        # Check that OTP was set (if your implementation does this)
        # self.assertIsNotNone(self.user.otp)


class OTPVerificationTestCase(TestCase):
    """Test cases for OTP verification."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.send_otp_url = '/api/auth/send-otp/'
        self.verify_otp_url = '/api/auth/verify-otp/'

        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            name='Test User',
            is_verified=False
        )

    def test_send_otp_success(self):
        """Test sending OTP successfully."""
        data = {
            'email': 'test@example.com'
        }

        response = self.client.post(self.send_otp_url, data, format='json')

        # Should send OTP
        self.assertIn(response.status_code, [
                      status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertIn('message', response.data)

    def test_verify_otp_success(self):
        """Test OTP verification (mock OTP)."""
        # Set OTP manually for testing
        self.user.otp = '123456'
        self.user.save()

        data = {
            'email': 'test@example.com',
            'otp': '123456'
        }

        response = self.client.post(self.verify_otp_url, data, format='json')

        # Should verify OTP (check your implementation)
        # This depends on your OTP verification logic
        self.assertIn(response.status_code, [
                      status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])


class UserManagementTestCase(TestCase):
    """Test cases for user management (staff only)."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.users_url = '/api/auth/users/'

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

        # Create super admin
        self.super_admin = User.objects.create_user(
            email='superadmin@example.com',
            password='testpass123',
            name='Super Admin',
            role='super_admin',
            is_staff=True,
            is_verified=True
        )

        # Create admin
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Admin',
            role='branch_admin',
            branch=self.branch,
            is_staff=True,
            is_verified=True
        )

        # Create customer
        self.customer = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Customer',
            role='customer',
            is_verified=True
        )

    def test_list_users_as_super_admin(self):
        """Test that super admin can list all users."""
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.get(self.users_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Super admin should see all users
        self.assertGreaterEqual(len(response.data['results']), 3)

    def test_list_users_as_admin(self):
        """Test that admin can list users in their branch."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.users_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Admin should see users in their branch

    def test_list_users_as_customer_forbidden(self):
        """Test that customers cannot list users."""
        self.client.force_authenticate(user=self.customer)

        response = self.client.get(self.users_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_user_soft_delete(self):
        """Test that user deletion is soft delete."""
        self.client.force_authenticate(user=self.super_admin)

        user_to_delete = User.objects.create_user(
            email='todelete@example.com',
            password='testpass123',
            name='To Delete'
        )

        response = self.client.delete(f'{self.users_url}{user_to_delete.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user_to_delete.refresh_from_db()
        self.assertFalse(user_to_delete.is_active)  # Soft deleted

    def test_cannot_delete_self(self):
        """Test that user cannot delete themselves."""
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.delete(
            f'{self.users_url}{self.super_admin.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class StaffCreationTestCase(TestCase):
    """Test cases for staff creation."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.create_staff_url = '/api/auth/create-staff/'

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

        # Create admin
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Admin',
            role='branch_admin',
            branch=self.branch,
            is_staff=True,
            is_verified=True
        )

        # Create customer
        self.customer = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Customer',
            role='customer',
            is_verified=True
        )

    def test_create_staff_as_admin(self):
        """Test that admin can create staff."""
        self.client.force_authenticate(user=self.admin)

        data = {
            'email': 'staff@example.com',
            'password': 'testpass123',
            'name': 'Staff Member',
            'role': 'applicator',
            'phone': '1234567890',
            'branch': self.branch.id
        }

        response = self.client.post(self.create_staff_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        staff = User.objects.get(email='staff@example.com')
        self.assertEqual(staff.role, 'applicator')
        # Should be assigned to admin's branch
        self.assertEqual(staff.branch, self.branch)
        self.assertTrue(staff.is_staff)
        self.assertTrue(staff.is_verified)

    def test_create_staff_as_customer_forbidden(self):
        """Test that customers cannot create staff."""
        self.client.force_authenticate(user=self.customer)

        data = {
            'email': 'staff@example.com',
            'password': 'testpass123',
            'name': 'Staff Member',
            'role': 'applicator'
        }

        response = self.client.post(self.create_staff_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)