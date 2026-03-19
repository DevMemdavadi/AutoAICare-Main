"""
Test cases for the config app.

This file contains comprehensive tests for:
- GlobalSettings model operations
- GlobalSettings API endpoints
- Permission checks for settings management
- Singleton pattern implementation
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import GlobalSettings

User = get_user_model()


class GlobalSettingsModelTestCase(TestCase):
    """Test cases for GlobalSettings model."""

    def setUp(self):
        """Set up test data."""
        self.settings = GlobalSettings.load()
        # Initialize with some data to ensure it works properly
        self.settings.business_name = "Test Business"
        self.settings.save()

    def test_singleton_pattern(self):
        """Test that only one instance of GlobalSettings exists."""
        # Load settings again
        settings2 = GlobalSettings.load()

        # Both should be the same instance
        self.assertEqual(self.settings.pk, settings2.pk)
        self.assertEqual(self.settings.id, 1)

    def test_default_values(self):
        """Test that default values are set correctly."""
        self.assertEqual(self.settings.default_tax_rate, 0)
        self.assertEqual(self.settings.tax_name, 'GST')
        self.assertEqual(self.settings.currency, 'INR')
        self.assertEqual(self.settings.currency_symbol, '₹')
        self.assertEqual(self.settings.booking_advance_days, 30)
        self.assertEqual(self.settings.cancellation_hours, 24)
        self.assertEqual(self.settings.slot_duration_minutes, 60)
        self.assertTrue(self.settings.enable_email_notifications)
        self.assertFalse(self.settings.enable_sms_notifications)
        self.assertFalse(self.settings.maintenance_mode)

    def test_str_representation(self):
        """Test string representation of GlobalSettings."""
        self.assertEqual(str(self.settings), "Global Settings")

    def test_save_method_enforces_singleton(self):
        """Test that save method enforces singleton pattern."""
        # Get the existing instance
        existing_settings = GlobalSettings.load()
        existing_settings.business_name = "Test Business"
        existing_settings.save()

        # Should still be the same instance
        self.assertEqual(existing_settings.pk, 1)
        self.assertEqual(GlobalSettings.objects.count(), 1)


class GlobalSettingsAPITestCase(TestCase):
    """Test cases for GlobalSettings API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.settings = GlobalSettings.load()

        # Create users with different roles
        self.super_admin = User.objects.create_user(
            email='superadmin@example.com',
            password='testpass123',
            name='Super Admin',
            role='super_admin',
            is_verified=True
        )

        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Admin',
            role='branch_admin',
            is_verified=True
        )

        self.staff = User.objects.create_user(
            email='staff@example.com',
            password='testpass123',
            name='Staff',
            role='applicator',
            is_verified=True
        )

        self.customer = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Customer',
            role='customer',
            is_verified=True
        )

    def test_get_settings_authenticated(self):
        """Test that authenticated users can get settings."""
        self.client.force_authenticate(user=self.staff)

        response = self.client.get('/api/settings/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['tax_name'], 'GST')
        self.assertEqual(response.data['currency'], 'INR')

    def test_get_settings_unauthenticated(self):
        """Test that unauthenticated users cannot get settings."""
        response = self.client.get('/api/settings/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_settings_as_super_admin(self):
        """Test that super admin can update settings."""
        self.client.force_authenticate(user=self.super_admin)

        data = {
            'default_tax_rate': '18.00',
            'tax_name': 'VAT',
            'business_name': 'Test Business',
            'currency': 'USD',
            'currency_symbol': '$'
        }

        response = self.client.put('/api/settings/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check database since serializer might return None for these if no company is attached
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.default_tax_rate, 18.00)
        self.assertEqual(self.settings.tax_name, 'VAT')
        self.assertEqual(self.settings.business_name, 'Test Business')
        self.assertEqual(self.settings.currency, 'USD')
        self.assertEqual(self.settings.currency_symbol, '$')

        # Verify changes were saved
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.default_tax_rate, 18)
        self.assertEqual(self.settings.tax_name, 'VAT')

    def test_update_settings_as_admin(self):
        """Test that admin cannot update settings."""
        self.client.force_authenticate(user=self.admin)

        data = {
            'default_tax_rate': '15.00',
            'tax_name': 'VAT'
        }

        response = self.client.put('/api/settings/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_settings_as_staff(self):
        """Test that staff cannot update settings."""
        self.client.force_authenticate(user=self.staff)

        data = {
            'default_tax_rate': '15.00',
            'tax_name': 'VAT'
        }

        response = self.client.put('/api/settings/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_settings_as_customer(self):
        """Test that customers cannot update settings."""
        self.client.force_authenticate(user=self.customer)

        data = {
            'default_tax_rate': '15.00',
            'tax_name': 'VAT'
        }

        response = self.client.put('/api/settings/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_partial_update_settings_as_super_admin(self):
        """Test that super admin can partially update settings."""
        self.client.force_authenticate(user=self.super_admin)

        data = {
            'business_name': 'Updated Business Name'
        }

        response = self.client.patch('/api/settings/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.business_name, 'Updated Business Name')

        # Verify changes were saved
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.business_name, 'Updated Business Name')

    def test_update_settings_with_invalid_data(self):
        """Test updating settings with invalid data."""
        self.client.force_authenticate(user=self.super_admin)

        data = {
            'default_tax_rate': 'invalid_rate'  # Invalid decimal
        }

        response = self.client.put('/api/settings/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_read_only_fields_not_updated(self):
        """Test that read-only fields cannot be updated."""
        self.client.force_authenticate(user=self.super_admin)

        original_created_at = self.settings.created_at

        data = {
            'id': 999,  # Should not be updated
            'created_at': '2020-01-01T00:00:00Z'  # Should not be updated
        }

        response = self.client.put('/api/settings/', data, format='json')

        # Should succeed but ignore read-only fields
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify read-only fields were not changed
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.id, 1)  # Should still be 1
        self.assertEqual(self.settings.created_at,
                         original_created_at)  # Should not change
