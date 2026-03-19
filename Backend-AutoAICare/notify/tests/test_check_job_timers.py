"""
Test for refactored check_job_timers function
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock
from bookings.models import Booking, Customer
from jobcards.models import JobCard
from branches.models import Branch
from services.models import ServicePackage
from customers.models import Vehicle
from notify.tasks import check_job_timers

User = get_user_model()


class CheckJobTimersTestCase(TestCase):
    """Test the refactored check_job_timers function."""
    
    def setUp(self):
        """Set up test data."""
        # Create branch
        self.branch = Branch.objects.create(
            name='Test Branch',
            address='123 Test St',
            phone='1234567890'
        )
        
        # Create users
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
            role='supervisor',
            branch=self.branch
        )
        
        self.floor_manager = User.objects.create_user(
            email='fm@test.com',
            phone='1112223333',
            name='Test Floor Manager',
            role='floor_manager',
            branch=self.branch
        )
        
        # Create customer
        self.customer = Customer.objects.create(user=self.customer_user)
        
        # Create vehicle
        self.vehicle = Vehicle.objects.create(
            customer=self.customer,
            registration_number='TEST123',
            brand='BMW',
            model='X5',
            color='Black'
        )
        
        # Create service package
        self.package = ServicePackage.objects.create(
            name='Test Package',
            sedan_price=1000,
            duration=60  # 60 minutes
        )
        
        # Create booking
        booking_time = timezone.now() + timedelta(hours=1)
        self.booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.package,
            branch=self.branch,
            booking_datetime=booking_time,
            status='confirmed'
        )
    
    @patch('notify.notification_service.NotificationService.send')
    @patch('notify.websocket_utils.broadcast_timer_update')
    def test_check_job_timers_5min_warning(self, mock_broadcast, mock_notify_send):
        """Test 5-minute warning is sent correctly."""
        # Create job card with timer started 55 minutes ago (5 min remaining)
        # Reset all notification flags to ensure clean test state
        job = JobCard.objects.create(
            booking=self.booking,
            branch=self.branch,
            supervisor=self.supervisor,
            floor_manager=self.floor_manager,
            status='work_in_progress',
            job_started_at=timezone.now() - timedelta(minutes=55),
            allowed_duration_minutes=60,
            buffer_percentage=0,  # No buffer for predictable timing
            warning_15min_sent=False,
            warning_10min_sent=False,
            warning_7min_sent=False,
            warning_5min_sent=False,
            warning_3min_sent=False,
            warning_2min_sent=False,
            warning_1min_sent=False,
            overdue_notification_sent=False
        )
        
        # Mock the send function to return a success result
        mock_notify_send.return_value = {
            'status': 'success',
            'recipients_count': 2,
            'channels': ['in_app'],
            'results': {
                self.supervisor.id: {'in_app': {'status': 'success'}},
                self.floor_manager.id: {'in_app': {'status': 'success'}}
            }
        }
        
        # Run the check
        result = check_job_timers()
        
        # Verify job was checked
        self.assertEqual(result['checked_jobs'], 1)
        
        # Verify NotificationService.send was called
        self.assertTrue(mock_notify_send.called)
        
        # Find the timer warning notification call
        timer_call = None
        for call in mock_notify_send.call_args_list:
            if call[1].get('notification_type') == 'job_warning':
                timer_call = call
                break
        
        # Verify timer notification was sent
        self.assertIsNotNone(timer_call, "Timer warning notification should be sent")
        self.assertIn(self.supervisor, timer_call[1]['recipients'])
        self.assertIn(self.floor_manager, timer_call[1]['recipients'])
        self.assertIn('5 Minutes', timer_call[1]['title'])
        
        # Verify WebSocket broadcast was called
        self.assertTrue(mock_broadcast.called)
    
    @patch('notify.notification_service.NotificationService.send')
    @patch('notify.websocket_utils.broadcast_timer_update')
    def test_check_job_timers_overdue(self, mock_broadcast, mock_notify_send):
        """Test overdue alert includes admins."""
        # Create admin user
        admin = User.objects.create_user(
            email='admin@test.com',
            phone='4445556666',
            name='Test Admin',
            role='super_admin',
            branch=self.branch
        )
        
        # Create job card that's significantly overdue (no buffer)
        # Make it 20 minutes overdue to ensure it's past the effective duration
        job = JobCard.objects.create(
            booking=self.booking,
            branch=self.branch,
            supervisor=self.supervisor,
            floor_manager=self.floor_manager,
            status='work_in_progress',
            job_started_at=timezone.now() - timedelta(minutes=80),  # 20 min overdue
            allowed_duration_minutes=60,
            buffer_percentage=0,  # No buffer for predictable timing
            warning_15min_sent=False,
            warning_10min_sent=False,
            warning_7min_sent=False,
            warning_5min_sent=False,
            warning_3min_sent=False,
            warning_2min_sent=False,
            warning_1min_sent=False,
            overdue_notification_sent=False  # Ensure overdue notification not sent yet
        )
        
        # Mock the send function to return a success result
        mock_notify_send.return_value = {
            'status': 'success',
            'recipients_count': 3,
            'channels': ['in_app'],
            'results': {
                self.supervisor.id: {'in_app': {'status': 'success'}},
                self.floor_manager.id: {'in_app': {'status': 'success'}},
                admin.id: {'in_app': {'status': 'success'}}
            }
        }
        
        # Run the check
        result = check_job_timers()
        
        # Verify job was checked
        self.assertEqual(result['checked_jobs'], 1)
        
        # Verify NotificationService.send was called
        self.assertTrue(mock_notify_send.called)
        
        # Find the overdue notification call
        overdue_call = None
        for call in mock_notify_send.call_args_list:
            if call[1].get('notification_type') == 'job_overdue':
                overdue_call = call
                break
        
        # Verify overdue notification was sent
        self.assertIsNotNone(overdue_call, "Overdue notification should be sent")
        
        # Verify admins are included in recipients
        recipients = overdue_call[1]['recipients']
        recipient_ids = [r.id for r in recipients]
        self.assertIn(self.supervisor.id, recipient_ids)
        self.assertIn(self.floor_manager.id, recipient_ids)
        self.assertIn(admin.id, recipient_ids)
        
        # Verify title indicates overdue
        self.assertIn('OVERDUE', overdue_call[1]['title'])
    
    @patch('notify.notification_service.NotificationService.send')
    def test_check_job_timers_no_active_jobs(self, mock_notify_send):
        """Test function handles no active jobs gracefully."""
        # Don't create any job cards
        
        # Run the check
        result = check_job_timers()
        
        # Verify no jobs were checked
        self.assertEqual(result['checked_jobs'], 0)
        self.assertEqual(result['notifications_sent'], 0)
        
        # Verify NotificationService.send was not called
        self.assertFalse(mock_notify_send.called)