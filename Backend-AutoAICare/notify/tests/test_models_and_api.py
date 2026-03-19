"""
Test cases for the notify app.

This file contains comprehensive tests for:
- NotificationTemplate model operations
- NotificationLog model operations
- NotificationTemplate API endpoints
- NotificationLog API endpoints
- Permission checks for notification management
- Notification sending functionality
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from ..models import NotificationTemplate, NotificationLog


class BaseNotificationTestCase(TestCase):
    """Base test case that mocks notification tasks to prevent Celery errors during testing."""
    
    def setUp(self):
        # Start patching the send_notification task in the view module where it's used
        self.mock_send_notification_patcher = patch('notify.views.send_notification')
        self.mock_send_notification = self.mock_send_notification_patcher.start()
        
        # Mock the delay method to return a mock task result
        mock_task_result = self.mock_send_notification.delay.return_value
        mock_task_result.id = 'test-task-id'
        
        super().setUp()
    
    def tearDown(self):
        # Stop the patcher to clean up
        self.mock_send_notification_patcher.stop()
        super().tearDown()

User = get_user_model()


class NotificationTemplateModelTestCase(BaseNotificationTestCase):
    """Test cases for NotificationTemplate model."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.template = NotificationTemplate.objects.create(
            name='Booking Confirmation',
            notification_type='booking_confirmed',
            channel='both',
            email_subject='Your booking is confirmed',
            email_body='Dear {{customer_name}}, your booking #{{booking_id}} is confirmed.',
            sms_body='Dear {{customer_name}}, your booking #{{booking_id}} is confirmed.',
            is_active=True
        )

    def test_notification_template_creation(self):
        """Test notification template creation."""
        self.assertEqual(NotificationTemplate.objects.count(), 1)
        self.assertEqual(self.template.name, 'Booking Confirmation')
        self.assertEqual(self.template.notification_type, 'booking_confirmed')
        self.assertEqual(self.template.channel, 'both')
        self.assertEqual(self.template.email_subject,
                         'Your booking is confirmed')
        self.assertEqual(self.template.email_body,
                         'Dear {{customer_name}}, your booking #{{booking_id}} is confirmed.')
        self.assertEqual(self.template.sms_body,
                         'Dear {{customer_name}}, your booking #{{booking_id}} is confirmed.')
        self.assertTrue(self.template.is_active)
        self.assertEqual(str(self.template),
                         "Booking Confirmation (Booking Confirmed)")

    def test_notification_template_unique_constraints(self):
        """Test notification template unique constraints."""
        # Try to create another template with the same notification type
        with self.assertRaises(Exception):
            NotificationTemplate.objects.create(
                name='Another Booking Confirmation',
                notification_type='booking_confirmed',  # Same as existing
                channel='email'
            )

    def test_notification_template_defaults(self):
        """Test notification template default values."""
        template = NotificationTemplate.objects.create(
            name='Simple Template',
            notification_type='job_started'
        )
        self.assertEqual(template.channel, 'both')
        self.assertTrue(template.is_active)
        self.assertIsNone(template.email_subject)
        self.assertIsNone(template.email_body)
        self.assertIsNone(template.sms_body)


class NotificationLogModelTestCase(BaseNotificationTestCase):
    """Test cases for NotificationLog model."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        # Create user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            name='Test User',
            role='customer',
            is_verified=True
        )

        # Create template
        self.template = NotificationTemplate.objects.create(
            name='Booking Confirmation',
            notification_type='booking_confirmed',
            channel='both',
            email_subject='Your booking is confirmed',
            email_body='Dear {{customer_name}}, your booking #{{booking_id}} is confirmed.',
            sms_body='Dear {{customer_name}}, your booking #{{booking_id}} is confirmed.',
            is_active=True
        )

        # Create log entry
        self.log = NotificationLog.objects.create(
            template=self.template,
            recipient=self.user,
            notification_type='booking_confirmed',
            channel='email',
            recipient_email='test@example.com',
            subject='Your booking is confirmed',
            message='Dear Test User, your booking #123 is confirmed.',
            status='sent'
        )

    def test_notification_log_creation(self):
        """Test notification log creation."""
        self.assertEqual(NotificationLog.objects.count(), 1)
        self.assertEqual(self.log.template, self.template)
        self.assertEqual(self.log.recipient, self.user)
        self.assertEqual(self.log.notification_type, 'booking_confirmed')
        self.assertEqual(self.log.channel, 'email')
        self.assertEqual(self.log.recipient_email, 'test@example.com')
        self.assertEqual(self.log.subject, 'Your booking is confirmed')
        self.assertEqual(self.log.message,
                         'Dear Test User, your booking #123 is confirmed.')
        self.assertEqual(self.log.status, 'sent')
        self.assertIsNone(self.log.error_message)
        self.assertEqual(
            str(self.log), f"booking_confirmed to {self.user.email} - sent")

    def test_notification_log_defaults(self):
        """Test notification log default values."""
        log = NotificationLog.objects.create(
            recipient=self.user,
            notification_type='job_started',
            channel='sms',
            message='Job started notification',
            status='pending'
        )
        self.assertIsNone(log.template)
        self.assertIsNone(log.recipient_email)
        self.assertIsNone(log.recipient_phone)
        self.assertIsNone(log.subject)
        self.assertIsNone(log.error_message)
        self.assertIsNone(log.sent_at)


class NotificationTemplateAPITestCase(BaseNotificationTestCase):
    """Test cases for NotificationTemplate API endpoints."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.client = APIClient()

        # Create users
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

        # Create template
        self.template = NotificationTemplate.objects.create(
            name='Booking Confirmation',
            notification_type='booking_confirmed',
            channel='both',
            email_subject='Your booking is confirmed',
            email_body='Dear {{customer_name}}, your booking #{{booking_id}} is confirmed.',
            sms_body='Dear {{customer_name}}, your booking #{{booking_id}} is confirmed.',
            is_active=True
        )

    def test_staff_can_list_templates(self):
        """Test that staff can list notification templates."""
        self.client.force_authenticate(user=self.staff)

        response = self.client.get('/api/notify/templates/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results']
                         [0]['name'], 'Booking Confirmation')

    def test_customer_cannot_list_templates(self):
        """Test that customers cannot list notification templates."""
        self.client.force_authenticate(user=self.customer)

        response = self.client.get('/api/notify/templates/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_create_template(self):
        """Test that staff can create notification templates."""
        self.client.force_authenticate(user=self.staff)

        data = {
            'name': 'Payment Success',
            'notification_type': 'payment_success',
            'channel': 'email',
            'email_subject': 'Payment Successful',
            'email_body': 'Your payment of {{amount}} was successful.',
            'is_active': True
        }

        response = self.client.post(
            '/api/notify/templates/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(NotificationTemplate.objects.count(), 2)

        # Verify template was created correctly
        template = NotificationTemplate.objects.get(
            notification_type='payment_success')
        self.assertEqual(template.name, 'Payment Success')
        self.assertEqual(template.channel, 'email')
        self.assertTrue(template.is_active)

    def test_customer_cannot_create_template(self):
        """Test that customers cannot create notification templates."""
        self.client.force_authenticate(user=self.customer)

        data = {
            'name': 'Customer Template',
            'notification_type': 'feedback_request',
            'channel': 'email'
        }

        response = self.client.post(
            '/api/notify/templates/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(NotificationTemplate.objects.count(), 1)

    def test_staff_can_update_template(self):
        """Test that staff can update notification templates."""
        self.client.force_authenticate(user=self.staff)

        data = {
            'email_subject': 'Updated Subject',
            'is_active': False
        }

        response = self.client.patch(
            f'/api/notify/templates/{self.template.id}/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.template.refresh_from_db()
        self.assertEqual(self.template.email_subject, 'Updated Subject')
        self.assertFalse(self.template.is_active)

    def test_customer_cannot_update_template(self):
        """Test that customers cannot update notification templates."""
        self.client.force_authenticate(user=self.customer)

        data = {
            'email_subject': 'Customer Subject'
        }

        response = self.client.patch(
            f'/api/notify/templates/{self.template.id}/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.template.refresh_from_db()
        self.assertEqual(self.template.email_subject,
                         'Your booking is confirmed')

    def test_staff_can_delete_template(self):
        """Test that staff can delete notification templates."""
        self.client.force_authenticate(user=self.staff)

        response = self.client.delete(
            f'/api/notify/templates/{self.template.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(NotificationTemplate.objects.count(), 0)

    def test_customer_cannot_delete_template(self):
        """Test that customers cannot delete notification templates."""
        self.client.force_authenticate(user=self.customer)

        response = self.client.delete(
            f'/api/notify/templates/{self.template.id}/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(NotificationTemplate.objects.count(), 1)

    def test_unauthenticated_user_cannot_access_template_endpoints(self):
        """Test that unauthenticated users cannot access template endpoints."""
        # Don't authenticate

        # Test list
        response = self.client.get('/api/notify/templates/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test create
        data = {
            'name': 'Unauthorized Template',
            'notification_type': 'job_completed',
            'channel': 'email'
        }
        response = self.client.post(
            '/api/notify/templates/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test detail
        response = self.client.get(
            f'/api/notify/templates/{self.template.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class NotificationLogAPITestCase(BaseNotificationTestCase):
    """Test cases for NotificationLog API endpoints."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.client = APIClient()

        # Create users
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

        self.customer1 = User.objects.create_user(
            email='customer1@example.com',
            password='testpass123',
            name='Customer 1',
            role='customer',
            is_verified=True
        )

        self.customer2 = User.objects.create_user(
            email='customer2@example.com',
            password='testpass123',
            name='Customer 2',
            role='customer',
            is_verified=True
        )

        # Create template
        self.template = NotificationTemplate.objects.create(
            name='Booking Confirmation',
            notification_type='booking_confirmed',
            channel='both',
            email_subject='Your booking is confirmed',
            email_body='Dear {{customer_name}}, your booking #{{booking_id}} is confirmed.',
            sms_body='Dear {{customer_name}}, your booking #{{booking_id}} is confirmed.',
            is_active=True
        )

        # Create log entries
        self.log1 = NotificationLog.objects.create(
            template=self.template,
            recipient=self.customer1,
            notification_type='booking_confirmed',
            channel='email',
            recipient_email='customer1@example.com',
            subject='Your booking is confirmed',
            message='Dear Customer 1, your booking #123 is confirmed.',
            status='sent'
        )

        self.log2 = NotificationLog.objects.create(
            template=self.template,
            recipient=self.customer2,
            notification_type='booking_confirmed',
            channel='email',
            recipient_email='customer2@example.com',
            subject='Your booking is confirmed',
            message='Dear Customer 2, your booking #456 is confirmed.',
            status='sent'
        )

    def test_staff_can_list_all_logs(self):
        """Test that staff can list all notification logs."""
        self.client.force_authenticate(user=self.staff)

        response = self.client.get('/api/notify/logs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_customer_can_list_own_logs_only(self):
        """Test that customers can only see their own notification logs."""
        self.client.force_authenticate(user=self.customer1)

        response = self.client.get('/api/notify/logs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.log1.id)

    def test_customer_cannot_see_others_logs(self):
        """Test that customers cannot see other customers' notification logs."""
        self.client.force_authenticate(user=self.customer1)

        # Try to access log2 which belongs to customer2
        response = self.client.get(f'/api/notify/logs/{self.log2.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_can_access_any_log(self):
        """Test that staff can access any notification log."""
        self.client.force_authenticate(user=self.staff)

        response = self.client.get(f'/api/notify/logs/{self.log1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.log1.id)

    def test_authenticated_users_can_access_logs(self):
        """Test that authenticated users can access notification log endpoints."""
        self.client.force_authenticate(user=self.customer1)

        response = self.client.get(f'/api/notify/logs/{self.log1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_user_cannot_access_log_endpoints(self):
        """Test that unauthenticated users cannot access log endpoints."""
        # Don't authenticate

        # Test list
        response = self.client.get('/api/notify/logs/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test detail
        response = self.client.get(f'/api/notify/logs/{self.log1.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_staff_can_send_test_notification(self):
        """Test that staff can send test notifications."""
        # Reset the mock to clear any calls made during setUp
        self.mock_send_notification.delay.reset_mock()
        
        self.client.force_authenticate(user=self.staff)

        data = {
            'user_id': self.customer1.id,
            'notification_type': 'booking_confirmed',
            'context_data': {
                'customer_name': 'Test Customer',
                'booking_id': 'TEST123'
            }
        }

        response = self.client.post(
            '/api/notify/logs/send_test/', data, format='json')

        # Should return success response (actual sending is async)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        self.assertIn('task_id', response.data)
        
        # Verify that the task was called with correct parameters
        self.mock_send_notification.delay.assert_called_once_with(
            self.customer1.id, 'booking_confirmed', {'customer_name': 'Test Customer', 'booking_id': 'TEST123'}
        )

    def test_customer_cannot_send_test_notification(self):
        """Test that customers cannot send test notifications."""
        self.client.force_authenticate(user=self.customer1)

        data = {
            'user_id': self.customer1.id,
            'notification_type': 'booking_confirmed'
        }

        response = self.client.post(
            '/api/notify/logs/send_test/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
