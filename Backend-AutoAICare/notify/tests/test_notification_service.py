"""
Unit tests for NotificationService
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock, call
from notify.notification_service import NotificationService
from jobcards.models import JobCard
from bookings.models import Booking, Customer
from branches.models import Branch

User = get_user_model()


class NotificationServiceTestCase(TestCase):
    """Test cases for the unified NotificationService."""
    
    def setUp(self):
        """Set up test data."""
        # Create test users
        self.customer_user = User.objects.create_user(
            email='customer@test.com',
            phone='1234567890',
            name='Test Customer',
            role='customer'
        )
        
        self.supervisor = User.objects.create_user(
            email='supervisor@test.com',
            phone='0987654321',
            name='Test Supervisor',
            role='supervisor'
        )
        
        self.floor_manager = User.objects.create_user(
            email='fm@test.com',
            phone='1112223333',
            name='Test Floor Manager',
            role='floor_manager'
        )
        
        self.admin = User.objects.create_user(
            email='admin@test.com',
            phone='4445556666',
            name='Test Admin',
            role='super_admin'
        )
    
    @patch('notify.utils.create_in_app_notification')
    def test_send_single_recipient_in_app_only(self, mock_create_in_app):
        """Test sending in-app notification to a single recipient."""
        # Mock the in-app notification creation
        mock_notification = MagicMock()
        mock_notification.id = 123
        mock_create_in_app.return_value = mock_notification
        
        # Send notification
        result = NotificationService.send(
            notification_type='job_warning',
            recipients=[self.supervisor],
            title='Test Warning',
            message='This is a test warning',
            channels=['in_app'],
            related_jobcard_id=1
        )
        
        # Verify notification was created
        self.assertEqual(result['recipients_count'], 1)
        self.assertIn('in_app', result['channels'])
        self.assertIn(self.supervisor.id, result['results'])
        self.assertEqual(result['results'][self.supervisor.id]['in_app']['status'], 'success')
        
        # Verify create_in_app_notification was called correctly
        # Note: The actual implementation converts None to {} for extra_data
        mock_create_in_app.assert_called_once_with(
            user_id=self.supervisor.id,
            notification_type='job_warning',
            title='Test Warning',
            message='This is a test warning',
            related_booking_id=None,
            related_jobcard_id=1,
            related_invoice_id=None,
            extra_data={}  # Changed from None to {} to match actual implementation
        )
    
    @patch('notify.utils.create_in_app_notification')
    def test_send_multiple_recipients(self, mock_create_in_app):
        """Test sending notifications to multiple recipients."""
        mock_notification = MagicMock()
        mock_notification.id = 123
        mock_create_in_app.return_value = mock_notification
        
        recipients = [self.supervisor, self.floor_manager, self.admin]
        
        result = NotificationService.send(
            notification_type='job_overdue',
            recipients=recipients,
            title='Job Overdue',
            message='Job is overdue',
            channels=['in_app']
        )
        
        # Verify all recipients received notifications
        self.assertEqual(result['recipients_count'], 3)
        self.assertEqual(len(result['results']), 3)
        
        # Verify create_in_app_notification was called 3 times
        self.assertEqual(mock_create_in_app.call_count, 3)
        
        # Verify each recipient got a notification
        for user in recipients:
            self.assertIn(user.id, result['results'])
            self.assertEqual(result['results'][user.id]['in_app']['status'], 'success')
    
    @patch('notify.tasks.send_email_notification')
    @patch('notify.utils.create_in_app_notification')
    def test_send_multi_channel(self, mock_create_in_app, mock_send_email):
        """Test sending notifications via multiple channels."""
        # Mock in-app notification
        mock_notification = MagicMock()
        mock_notification.id = 123
        mock_create_in_app.return_value = mock_notification
        
        # Mock email task
        mock_task = MagicMock()
        mock_task.id = 'email-task-123'
        mock_send_email.delay.return_value = mock_task
        
        result = NotificationService.send(
            notification_type='job_completed',
            recipients=[self.customer_user],
            title='Job Completed',
            message='Your job is completed',
            channels=['in_app', 'email'],
            related_jobcard_id=1,
            context_data={'vehicle': 'BMW X5'}
        )
        
        # Verify both channels were used
        self.assertIn('in_app', result['channels'])
        self.assertIn('email', result['channels'])
        
        # Verify both notifications were sent
        recipient_result = result['results'][self.customer_user.id]
        self.assertEqual(recipient_result['in_app']['status'], 'success')
        self.assertEqual(recipient_result['email']['status'], 'queued')
        
        # Verify email task was queued
        mock_send_email.delay.assert_called_once()
    
    @patch('notify.websocket_utils.broadcast_timer_update')
    @patch('notify.utils.create_in_app_notification')
    def test_send_with_websocket_broadcast(self, mock_create_in_app, mock_broadcast):
        """Test sending notifications with WebSocket broadcast."""
        mock_notification = MagicMock()
        mock_notification.id = 123
        mock_create_in_app.return_value = mock_notification
        
        result = NotificationService.send(
            notification_type='job_warning',
            recipients=[self.supervisor],
            title='Timer Warning',
            message='5 minutes remaining',
            channels=['in_app', 'websocket'],
            broadcast_groups=['jobcard_1', 'dashboard_timers'],
            related_jobcard_id=1
        )
        
        # Verify WebSocket broadcast was called
        self.assertEqual(mock_broadcast.call_count, 2)  # Once per group
        
        # Verify result includes websocket status
        self.assertIn('websocket', result)
        self.assertEqual(result['websocket']['status'], 'success')
    
    def test_send_no_recipients(self):
        """Test handling of empty recipients list."""
        result = NotificationService.send(
            notification_type='job_warning',
            recipients=[],
            title='Test',
            message='Test message',
            channels=['in_app']
        )
        
        self.assertEqual(result['status'], 'skipped')
        self.assertEqual(result['reason'], 'no_recipients')
    
    def test_default_channels_for_notification_types(self):
        """Test that default channels are correctly assigned."""
        # Job warning should use in_app + websocket by default
        self.assertIn('in_app', NotificationService.DEFAULT_CHANNELS['job_warning'])
        self.assertIn('websocket', NotificationService.DEFAULT_CHANNELS['job_warning'])
        
        # Job completed should use in_app + email + websocket
        self.assertIn('in_app', NotificationService.DEFAULT_CHANNELS['job_completed'])
        self.assertIn('email', NotificationService.DEFAULT_CHANNELS['job_completed'])
        
        # Booking confirmed should include SMS
        self.assertIn('sms', NotificationService.DEFAULT_CHANNELS['booking_confirmed'])
    
    @patch('notify.utils.create_in_app_notification')
    def test_default_channels_used_when_not_specified(self, mock_create_in_app):
        """Test that default channels are used when channels param is None."""
        mock_notification = MagicMock()
        mock_notification.id = 123
        mock_create_in_app.return_value = mock_notification
        
        # Don't specify channels - should use defaults for 'job_warning'
        result = NotificationService.send(
            notification_type='job_warning',
            recipients=[self.supervisor],
            title='Warning',
            message='Test',
            channels=None  # Use defaults
        )
        
        # Default for job_warning is ['in_app', 'websocket']
        self.assertIn('in_app', result['channels'])
        self.assertIn('websocket', result['channels'])
    
    @patch('notify.utils.create_in_app_notification')
    def test_error_handling_in_app_notification_fails(self, mock_create_in_app):
        """Test error handling when in-app notification fails."""
        # Mock failure
        mock_create_in_app.side_effect = Exception('Database error')
        
        result = NotificationService.send(
            notification_type='job_warning',
            recipients=[self.supervisor],
            title='Test',
            message='Test',
            channels=['in_app']
        )
        
        # Verify error was caught and logged
        recipient_result = result['results'][self.supervisor.id]
        self.assertEqual(recipient_result['in_app']['status'], 'failed')
        self.assertIn('error', recipient_result['in_app'])
    
    def test_get_recipients_for_job_all_types(self):
        """Test get_recipients_for_job helper with all recipient types."""
        # Create test branch
        branch = Branch.objects.create(
            name='Test Branch',
            address='123 Test St',
            phone='1234567890'
        )
        
        # Assign branch to users
        self.supervisor.branch = branch
        self.supervisor.save()
        
        self.floor_manager.branch = branch
        self.floor_manager.save()
        
        self.admin.branch = branch
        self.admin.save()
        
        # Create customer
        customer = Customer.objects.create(user=self.customer_user)
        
        # Create booking with minimal required fields
        from services.models import ServicePackage
        from customers.models import Vehicle
        
        vehicle = Vehicle.objects.create(
            customer=customer,
            registration_number='TEST123',
            brand='BMW',
            model='X5',
            color='Black'
        )
        
        package = ServicePackage.objects.create(
            name='Test Package',
            sedan_price=1000,
            duration=60
        )
        
        import datetime
        from django.utils import timezone
        booking_time = timezone.make_aware(datetime.datetime(2024, 1, 1, 10, 0, 0))
        
        booking = Booking.objects.create(
            customer=customer,
            vehicle=vehicle,
            package=package,
            branch=branch,
            booking_datetime=booking_time,
            status='confirmed'
        )
        
        # Create job card
        job = JobCard.objects.create(
            booking=booking,
            branch=branch,
            supervisor=self.supervisor,
            floor_manager=self.floor_manager,
            status='work_in_progress'
        )
        
        # Test getting all recipients
        recipients = NotificationService.get_recipients_for_job(
            job,
            include_customer=True,
            include_supervisor=True,
            include_floor_manager=True,
            include_applicators=False,
            include_admins=True
        )
        
        # Verify all expected recipients are included
        recipient_ids = [r.id for r in recipients]
        self.assertIn(self.customer_user.id, recipient_ids)
        self.assertIn(self.supervisor.id, recipient_ids)
        self.assertIn(self.floor_manager.id, recipient_ids)
        self.assertIn(self.admin.id, recipient_ids)
        
        # Verify no duplicates
        self.assertEqual(len(recipients), len(set(recipient_ids)))
    
    def test_get_recipients_for_job_selective(self):
        """Test get_recipients_for_job with selective inclusion."""
        # Create minimal job setup
        branch = Branch.objects.create(
            name='Test Branch',
            address='123 Test St',
            phone='1234567890'
        )
        
        customer = Customer.objects.create(user=self.customer_user)
        
        from services.models import ServicePackage
        from customers.models import Vehicle
        
        vehicle = Vehicle.objects.create(
            customer=customer,
            registration_number='TEST123',
            brand='BMW',
            model='X5',
            color='Black'
        )
        
        package = ServicePackage.objects.create(
            name='Test Package',
            sedan_price=1000,
            duration=60
        )
        
        import datetime
        from django.utils import timezone
        booking_time = timezone.make_aware(datetime.datetime(2024, 1, 1, 10, 0, 0))
        
        booking = Booking.objects.create(
            customer=customer,
            vehicle=vehicle,
            package=package,
            branch=branch,
            booking_datetime=booking_time,
            status='confirmed'
        )
        
        job = JobCard.objects.create(
            booking=booking,
            branch=branch,
            supervisor=self.supervisor,
            floor_manager=self.floor_manager,
            status='work_in_progress'
        )
        
        # Get only supervisor and floor manager
        recipients = NotificationService.get_recipients_for_job(
            job,
            include_customer=False,
            include_supervisor=True,
            include_floor_manager=True,
            include_applicators=False,
            include_admins=False
        )
        
        recipient_ids = [r.id for r in recipients]
        
        # Should include only supervisor and floor manager
        self.assertEqual(len(recipients), 2)
        self.assertIn(self.supervisor.id, recipient_ids)
        self.assertIn(self.floor_manager.id, recipient_ids)
        self.assertNotIn(self.customer_user.id, recipient_ids)