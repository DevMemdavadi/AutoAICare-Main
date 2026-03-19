"""
Test role-based, branch-wise notification filtering.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from notify.notification_service import NotificationService
from jobcards.models import JobCard
from bookings.models import Booking, Customer
from branches.models import Branch
from companies.models import Company

User = get_user_model()


class BranchBasedNotificationTestCase(TestCase):
    """Test cases for branch-based notification filtering."""
    
    def setUp(self):
        """Set up test data."""
        # Create company
        self.company = Company.objects.create(
            name='Test Company',
            slug='test-company'
        )
        
        # Create branches
        self.branch_a = Branch.objects.create(
            company=self.company,
            name='Branch A',
            phone='1234567890',
            address='Address A'
        )
        
        self.branch_b = Branch.objects.create(
            company=self.company,
            name='Branch B',
            phone='0987654321',
            address='Address B'
        )
        
        # Create users with different roles and branches
        self.floor_manager_a = User.objects.create_user(
            email='fm_a@test.com',
            password='Test@123',
            name='Floor Manager A',
            company=self.company,
            role='floor_manager',
            branch=self.branch_a
        )
        
        self.floor_manager_b = User.objects.create_user(
            email='fm_b@test.com',
            password='Test@123',
            name='Floor Manager B',
            company=self.company,
            role='floor_manager',
            branch=self.branch_b
        )
        
        self.branch_admin_a = User.objects.create_user(
            email='ba_a@test.com',
            password='Test@123',
            name='Branch Admin A',
            company=self.company,
            role='branch_admin',
            branch=self.branch_a
        )
        
        self.branch_admin_b = User.objects.create_user(
            email='ba_b@test.com',
            password='Test@123',
            name='Branch Admin B',
            company=self.company,
            role='branch_admin',
            branch=self.branch_b
        )
        
        self.company_admin = User.objects.create_user(
            email='ca@test.com',
            password='Test@123',
            name='Company Admin',
            company=self.company,
            role='company_admin'
        )
        
        self.super_admin = User.objects.create_user(
            email='sa@test.com',
            password='Test@123',
            name='Super Admin',
            company=self.company,
            role='super_admin'
        )
    
    def test_floor_manager_receives_only_own_branch_notifications(self):
        """Test floor managers only receive notifications from their assigned branch."""
        # Create mock job for branch A
        from unittest.mock import Mock
        job_a = Mock()
        job_a.booking = Mock()
        job_a.booking.branch = self.branch_a
        job_a.booking.customer = None
        job_a.supervisor = None
        job_a.floor_manager = self.floor_manager_a
        
        # Get recipients (include admins to test filtering)
        recipients = NotificationService.get_recipients_for_job(
            job_a,
            include_customer=False,
            include_supervisor=False,
            include_floor_manager=True,
            include_applicators=False,
            include_admins=True
        )
        
        recipient_ids = [r.id for r in recipients]
        
        # Floor Manager A should be included (assigned to job)
        self.assertIn(self.floor_manager_a.id, recipient_ids)
        
        # Floor Manager B should NOT be included (different branch)
        self.assertNotIn(self.floor_manager_b.id, recipient_ids)
        
        # Branch Admin A should be included (same branch)
        self.assertIn(self.branch_admin_a.id, recipient_ids)
        
        # Branch Admin B should NOT be included (different branch)
        self.assertNotIn(self.branch_admin_b.id, recipient_ids)
        
        # Company Admin should be included (sees all branches)
        self.assertIn(self.company_admin.id, recipient_ids)
        
        # Super Admin should be included (sees all branches)
        self.assertIn(self.super_admin.id, recipient_ids)
    
    def test_branch_admin_receives_only_own_branch_notifications(self):
        """Test branch admins only receive notifications from their assigned branch."""
        from unittest.mock import Mock
        job_b = Mock()
        job_b.booking = Mock()
        job_b.booking.branch = self.branch_b
        job_b.booking.customer = None
        job_b.supervisor = None
        job_b.floor_manager = None
        
        recipients = NotificationService.get_recipients_for_job(
            job_b,
            include_customer=False,
            include_supervisor=False,
            include_floor_manager=False,
            include_applicators=False,
            include_admins=True
        )
        
        recipient_ids = [r.id for r in recipients]
        
        # Branch Admin B should be included (same branch)
        self.assertIn(self.branch_admin_b.id, recipient_ids)
        
        # Branch Admin A should NOT be included (different branch)
        self.assertNotIn(self.branch_admin_a.id, recipient_ids)
        
        # Company Admin should be included (sees all branches)
        self.assertIn(self.company_admin.id, recipient_ids)
        
        # Super Admin should be included (sees all branches)
        self.assertIn(self.super_admin.id, recipient_ids)
    
    def test_company_admin_receives_all_branch_notifications(self):
        """Test company admin receives notifications from all branches."""
        from unittest.mock import Mock
        
        # Test with Branch A job
        job_a = Mock()
        job_a.booking = Mock()
        job_a.booking.branch = self.branch_a
        job_a.booking.customer = None
        job_a.supervisor = None
        job_a.floor_manager = None
        
        recipients_a = NotificationService.get_recipients_for_job(
            job_a,
            include_customer=False,
            include_supervisor=False,
            include_floor_manager=False,
            include_applicators=False,
            include_admins=True
        )
        
        recipient_ids_a = [r.id for r in recipients_a]
        self.assertIn(self.company_admin.id, recipient_ids_a)
        
        # Test with Branch B job
        job_b = Mock()
        job_b.booking = Mock()
        job_b.booking.branch = self.branch_b
        job_b.booking.customer = None
        job_b.supervisor = None
        job_b.floor_manager = None
        
        recipients_b = NotificationService.get_recipients_for_job(
            job_b,
            include_customer=False,
            include_supervisor=False,
            include_floor_manager=False,
            include_applicators=False,
            include_admins=True
        )
        
        recipient_ids_b = [r.id for r in recipients_b]
        self.assertIn(self.company_admin.id, recipient_ids_b)
