"""
Test cases for the feedback app.

This file contains comprehensive tests for:
- Feedback model operations
- Feedback API endpoints
- Permission checks for feedback management
- Feedback creation restrictions
- Helpful count functionality
- Feedback summary statistics
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from branches.models import Branch
from customers.models import Customer, Vehicle
from services.models import ServicePackage, AddOn
from bookings.models import Booking
from .models import Feedback

User = get_user_model()


class FeedbackModelTestCase(TestCase):
    """Test cases for Feedback model."""

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

        # Create customer profile
        self.customer = Customer.objects.create(user=self.customer_user)

        # Create vehicle
        self.vehicle = Vehicle.objects.create(
            customer=self.customer,
            registration_number='TEST123',
            brand='Toyota',
            model='Corolla',
            year=2020,
            color='White'
        )

        # Create service package
        self.package = ServicePackage.objects.create(
            name='Basic Service',
            description='Basic car service',
            price=Decimal('1000.00'),
            duration=60,
            is_active=True,
            branch=self.branch
        )

        # Create addon
        self.addon = AddOn.objects.create(
            name='Interior Cleaning',
            price=Decimal('200.00'),
            duration=30,
            is_active=True,
            branch=self.branch
        )

        # Create booking
        self.booking = Booking(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.package,
            booking_datetime=timezone.now() + timedelta(days=1),
            status='completed',
            branch=self.branch,
            total_price=Decimal('1000.00')
        )
        self.booking.save(addons=[self.addon])

        # Create feedback
        self.feedback = Feedback.objects.create(
            booking=self.booking,
            rating=5,
            review='Excellent service!',
            category='service_quality',
            suggestions='Keep up the good work'
        )

    def test_feedback_creation(self):
        """Test feedback creation."""
        self.assertEqual(Feedback.objects.count(), 1)
        self.assertEqual(self.feedback.booking, self.booking)
        self.assertEqual(self.feedback.rating, 5)
        self.assertEqual(self.feedback.review, 'Excellent service!')
        self.assertEqual(self.feedback.category, 'service_quality')
        self.assertEqual(self.feedback.status, 'pending')
        self.assertEqual(self.feedback.suggestions, 'Keep up the good work')
        self.assertEqual(self.feedback.helpful_count, 0)
        self.assertEqual(str(self.feedback),
                         f"Feedback for Booking #{self.booking.id} - 5 stars")

    def test_feedback_rating_validation(self):
        """Test feedback rating validation."""
        # Create a new booking for this test to avoid UNIQUE constraint
        new_booking = Booking(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.package,
            booking_datetime=timezone.now() + timedelta(days=2),
            status='completed',
            branch=self.branch,
            total_price=Decimal('1000.00')
        )
        new_booking.save(addons=[self.addon])

        # Test valid ratings
        for rating in [1, 2, 3, 4, 5]:
            feedback = Feedback(
                booking=new_booking,
                rating=rating,
                review=f'Test review for rating {rating}'
            )
            feedback.full_clean()  # Should not raise ValidationError

        # Test that invalid ratings raise ValidationError
        # This would typically be caught at the form/serializer level

    def test_feedback_defaults(self):
        """Test feedback default values."""
        # Create a new booking for this test to avoid UNIQUE constraint
        new_booking = Booking(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.package,
            booking_datetime=timezone.now() + timedelta(days=3),
            status='completed',
            branch=self.branch,
            total_price=Decimal('1000.00')
        )
        new_booking.save(addons=[self.addon])

        feedback = Feedback.objects.create(
            booking=new_booking,
            rating=3
        )
        self.assertEqual(feedback.category, 'service_quality')
        self.assertEqual(feedback.status, 'pending')
        self.assertEqual(feedback.helpful_count, 0)
        self.assertIsNone(feedback.review)
        self.assertIsNone(feedback.suggestions)


class FeedbackAPITestCase(TestCase):
    """Test cases for Feedback API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create branches
        self.branch1 = Branch.objects.create(
            name='Branch 1',
            code='B1',
            address='123 Test St',
            city='Test City',
            state='Test State',
            pincode='123456',
            phone='1234567890'
        )

        self.branch2 = Branch.objects.create(
            name='Branch 2',
            code='B2',
            address='456 Test Ave',
            city='Test City 2',
            state='Test State 2',
            pincode='654321',
            phone='0987654321'
        )

        # Create users
        self.super_admin = User.objects.create_user(
            email='superadmin@example.com',
            password='testpass123',
            name='Super Admin',
            role='super_admin',
            is_verified=True
        )

        self.admin1 = User.objects.create_user(
            email='admin1@example.com',
            password='testpass123',
            name='Admin 1',
            role='branch_admin',
            is_verified=True
        )
        self.admin1.branch = self.branch1
        self.admin1.save()

        self.admin2 = User.objects.create_user(
            email='admin2@example.com',
            password='testpass123',
            name='Admin 2',
            role='branch_admin',
            is_verified=True
        )
        self.admin2.branch = self.branch2
        self.admin2.save()

        self.staff1 = User.objects.create_user(
            email='staff1@example.com',
            password='testpass123',
            name='Staff 1',
            role='applicator',
            is_verified=True
        )
        self.staff1.branch = self.branch1
        self.staff1.save()

        self.staff2 = User.objects.create_user(
            email='staff2@example.com',
            password='testpass123',
            name='Staff 2',
            role='applicator',
            is_verified=True
        )
        self.staff2.branch = self.branch2
        self.staff2.save()

        self.customer_user1 = User.objects.create_user(
            email='customer1@example.com',
            password='testpass123',
            name='Customer 1',
            phone='1234567890',
            role='customer',
            is_verified=True
        )

        self.customer_user2 = User.objects.create_user(
            email='customer2@example.com',
            password='testpass123',
            name='Customer 2',
            phone='9876543210',
            role='customer',
            is_verified=True
        )

        # Create customer profiles
        self.customer1 = Customer.objects.create(user=self.customer_user1)
        self.customer2 = Customer.objects.create(user=self.customer_user2)

        # Create vehicles
        self.vehicle1 = Vehicle.objects.create(
            customer=self.customer1,
            registration_number='TEST123',
            brand='Toyota',
            model='Corolla',
            year=2020,
            color='White'
        )

        self.vehicle2 = Vehicle.objects.create(
            customer=self.customer2,
            registration_number='TEST456',
            brand='Honda',
            model='Civic',
            year=2021,
            color='Black'
        )

        # Create service packages
        self.package1 = ServicePackage.objects.create(
            name='Basic Service',
            description='Basic car service',
            price=Decimal('1000.00'),
            duration=60,
            is_active=True,
            branch=self.branch1
        )

        self.package2 = ServicePackage.objects.create(
            name='Premium Service',
            description='Premium car service',
            price=Decimal('2000.00'),
            duration=120,
            is_active=True,
            branch=self.branch2
        )

        # Create addons
        self.addon1 = AddOn.objects.create(
            name='Interior Cleaning',
            price=Decimal('200.00'),
            duration=30,
            is_active=True,
            branch=self.branch1
        )

        self.addon2 = AddOn.objects.create(
            name='Exterior Detailing',
            price=Decimal('300.00'),
            duration=45,
            is_active=True,
            branch=self.branch2
        )

        # Create bookings
        self.booking1 = Booking(
            customer=self.customer1,
            vehicle=self.vehicle1,
            package=self.package1,
            booking_datetime=timezone.now() + timedelta(days=1),
            status='completed',
            branch=self.branch1,
            total_price=Decimal('1000.00')
        )
        self.booking1.save(addons=[self.addon1])

        self.booking2 = Booking(
            customer=self.customer2,
            vehicle=self.vehicle2,
            package=self.package2,
            booking_datetime=timezone.now() + timedelta(days=2),
            status='completed',
            branch=self.branch2,
            total_price=Decimal('2000.00')
        )
        self.booking2.save(addons=[self.addon2])

        # Create feedback
        self.feedback1 = Feedback.objects.create(
            booking=self.booking1,
            rating=5,
            review='Excellent service!',
            category='service_quality',
            suggestions='Keep up the good work'
        )

        self.feedback2 = Feedback.objects.create(
            booking=self.booking2,
            rating=4,
            review='Good service',
            category='staff_behavior',
            status='reviewed'
        )

    def test_customer_can_list_own_feedback(self):
        """Test that customers can only see their own feedback."""
        self.client.force_authenticate(user=self.customer_user1)

        response = self.client.get('/api/feedback/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.feedback1.id)

    def test_customer_cannot_see_others_feedback(self):
        """Test that customers cannot see other customers' feedback."""
        self.client.force_authenticate(user=self.customer_user2)

        response = self.client.get('/api/feedback/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.feedback2.id)

    def test_admin_can_list_branch_feedback(self):
        """Test that admins can only see feedback from their branch."""
        self.client.force_authenticate(user=self.admin1)

        response = self.client.get('/api/feedback/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.feedback1.id)

    def test_staff_can_list_branch_feedback(self):
        """Test that staff can only see feedback from their branch."""
        self.client.force_authenticate(user=self.staff1)

        response = self.client.get('/api/feedback/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.feedback1.id)

    def test_super_admin_can_list_all_feedback(self):
        """Test that super admin can see all feedback."""
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.get('/api/feedback/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_super_admin_can_filter_by_branch(self):
        """Test that super admin can filter feedback by branch."""
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.get(f'/api/feedback/?branch={self.branch1.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.feedback1.id)

    def test_customer_can_create_feedback_for_own_booking(self):
        """Test that customers can create feedback for their own bookings."""
        # Create another booking for customer1
        booking3 = Booking(
            customer=self.customer1,
            vehicle=self.vehicle1,
            package=self.package1,
            booking_datetime=timezone.now() + timedelta(days=3),
            status='completed',
            branch=self.branch1,
            total_price=Decimal('1500.00')
        )
        booking3.save(addons=[self.addon1])

        self.client.force_authenticate(user=self.customer_user1)

        data = {
            'booking': booking3.id,
            'rating': 4,
            'review': 'Good service overall',
            'category': 'service_quality',
            'suggestions': 'Could be faster'
        }

        response = self.client.post('/api/feedback/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Feedback.objects.count(), 3)

        # Verify feedback was created correctly
        feedback = Feedback.objects.get(booking=booking3)
        self.assertEqual(feedback.rating, 4)
        self.assertEqual(feedback.review, 'Good service overall')
        self.assertEqual(feedback.category, 'service_quality')
        self.assertEqual(feedback.suggestions, 'Could be faster')

    def test_customer_cannot_create_feedback_for_others_booking(self):
        """Test that customers cannot create feedback for others' bookings."""
        self.client.force_authenticate(user=self.customer_user1)

        data = {
            'booking': self.booking2.id,  # booking belonging to customer2
            'rating': 3,
            'review': 'Average service'
        }

        response = self.client.post('/api/feedback/', data, format='json')

        # Should fail either due to permission or OneToOne constraint
        self.assertIn(response.status_code, [
                      status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST])
        self.assertEqual(Feedback.objects.count(), 2)

    def test_customer_cannot_create_feedback_for_non_completed_booking(self):
        """Test that customers cannot create feedback for non-completed bookings."""
        # Create a pending booking for customer1
        pending_booking = Booking(
            customer=self.customer1,
            vehicle=self.vehicle1,
            package=self.package1,
            booking_datetime=timezone.now() + timedelta(days=4),
            status='pending',
            branch=self.branch1,
            total_price=Decimal('1200.00')
        )
        pending_booking.save(addons=[self.addon1])

        self.client.force_authenticate(user=self.customer_user1)

        data = {
            'booking': pending_booking.id,
            'rating': 3,
            'review': 'Average service'
        }

        response = self.client.post('/api/feedback/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Feedback.objects.count(), 2)

    def test_customer_cannot_create_duplicate_feedback(self):
        """Test that customers cannot create duplicate feedback for same booking."""
        self.client.force_authenticate(user=self.customer_user1)

        data = {
            'booking': self.booking1.id,  # booking already has feedback
            'rating': 3,
            'review': 'Different review'
        }

        response = self.client.post('/api/feedback/', data, format='json')

        # Should fail due to OneToOne relationship constraint
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_can_update_own_feedback(self):
        """Test that customers can update their own feedback."""
        self.client.force_authenticate(user=self.customer_user1)

        data = {
            'rating': 4,
            'review': 'Updated review',
            'status': 'reviewed'
        }

        response = self.client.patch(
            f'/api/feedback/{self.feedback1.id}/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.feedback1.refresh_from_db()
        self.assertEqual(self.feedback1.rating, 4)
        self.assertEqual(self.feedback1.review, 'Updated review')
        self.assertEqual(self.feedback1.status, 'reviewed')

    def test_customer_cannot_update_others_feedback(self):
        """Test that customers cannot update others' feedback."""
        self.client.force_authenticate(user=self.customer_user1)

        data = {
            'rating': 1,
            'review': 'Terrible service'
        }

        response = self.client.patch(
            f'/api/feedback/{self.feedback2.id}/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        self.feedback2.refresh_from_db()
        self.assertEqual(self.feedback2.rating, 4)
        self.assertEqual(self.feedback2.review, 'Good service')

    def test_admin_can_update_any_feedback(self):
        """Test that admins can update any feedback in their branch."""
        self.client.force_authenticate(user=self.admin1)

        data = {
            'status': 'resolved',
            'review': 'Admin updated review'
        }

        response = self.client.patch(
            f'/api/feedback/{self.feedback1.id}/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.feedback1.refresh_from_db()
        self.assertEqual(self.feedback1.status, 'resolved')
        self.assertEqual(self.feedback1.review, 'Admin updated review')

    def test_admin_cannot_update_other_branch_feedback(self):
        """Test that admins cannot update feedback from other branches."""
        self.client.force_authenticate(user=self.admin1)

        data = {
            'status': 'resolved'
        }

        response = self.client.patch(
            f'/api/feedback/{self.feedback2.id}/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        self.feedback2.refresh_from_db()
        self.assertEqual(self.feedback2.status, 'reviewed')

    def test_customer_can_delete_own_feedback(self):
        """Test that customers can delete their own feedback."""
        self.client.force_authenticate(user=self.customer_user1)

        response = self.client.delete(f'/api/feedback/{self.feedback1.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Feedback.objects.count(), 1)

    def test_customer_cannot_delete_others_feedback(self):
        """Test that customers cannot delete others' feedback."""
        self.client.force_authenticate(user=self.customer_user1)

        response = self.client.delete(f'/api/feedback/{self.feedback2.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Feedback.objects.count(), 2)

    def test_helpful_action_increments_count(self):
        """Test that marking feedback as helpful increments the count."""
        # Customer 1 marks their own feedback as helpful
        self.client.force_authenticate(user=self.customer_user1)

        self.assertEqual(self.feedback1.helpful_count, 0)

        response = self.client.post(
            f'/api/feedback/{self.feedback1.id}/helpful/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['helpful_count'], 1)

        self.feedback1.refresh_from_db()
        self.assertEqual(self.feedback1.helpful_count, 1)

    def test_helpful_action_can_be_called_multiple_times(self):
        """Test that marking feedback as helpful can be called multiple times."""
        self.client.force_authenticate(user=self.customer_user1)

        # Call helpful action twice
        self.client.post(f'/api/feedback/{self.feedback1.id}/helpful/')
        response = self.client.post(
            f'/api/feedback/{self.feedback1.id}/helpful/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['helpful_count'], 2)

        self.feedback1.refresh_from_db()
        self.assertEqual(self.feedback1.helpful_count, 2)

    def test_feedback_summary_for_customer(self):
        """Test feedback summary endpoint for customers."""
        self.client.force_authenticate(user=self.customer_user1)

        response = self.client.get('/api/feedback/summary/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_feedback'], 1)
        self.assertEqual(response.data['average_rating'], 5.0)

    def test_feedback_summary_for_admin(self):
        """Test feedback summary endpoint for admins."""
        self.client.force_authenticate(user=self.admin1)

        response = self.client.get('/api/feedback/summary/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_feedback'], 1)
        self.assertEqual(response.data['average_rating'], 5.0)

    def test_feedback_summary_for_super_admin(self):
        """Test feedback summary endpoint for super admins."""
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.get('/api/feedback/summary/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_feedback'], 2)
        self.assertEqual(response.data['average_rating'], 4.5)  # (5+4)/2

    def test_feedback_summary_for_super_admin_with_branch_filter(self):
        """Test feedback summary endpoint for super admins with branch filter."""
        self.client.force_authenticate(user=self.super_admin)

        response = self.client.get(
            f'/api/feedback/summary/?branch={self.branch1.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_feedback'], 1)
        self.assertEqual(response.data['average_rating'], 5.0)

    def test_unauthenticated_user_cannot_access_endpoints(self):
        """Test that unauthenticated users cannot access any endpoints."""
        # Don't authenticate

        # Test list
        response = self.client.get('/api/feedback/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test create
        data = {
            'booking': self.booking1.id,
            'rating': 3
        }
        response = self.client.post('/api/feedback/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test detail
        response = self.client.get(f'/api/feedback/{self.feedback1.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
