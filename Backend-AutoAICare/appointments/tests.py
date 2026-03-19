from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from branches.models import Branch
from customers.models import Customer, Vehicle
from services.models import ServicePackage, AddOn
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from .models import Appointment, AppointmentSlot

User = get_user_model()

class AppointmentModelTestCase(TestCase):
    """Test cases for Appointment model."""
    
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
        
        # Create users
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            phone='9876543210',
            role='customer',
            is_verified=True
        )
        # Assign branch to customer user to ensure proper branch assignment
        self.customer_user.branch = self.branch
        self.customer_user.save()
        
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Test Admin',
            role='branch_admin',
            is_verified=True
        )
        self.admin_user.branch = self.branch
        self.admin_user.save()
        
        # Create customer profile
        self.customer = Customer.objects.create(user=self.customer_user)
        
        # Create vehicle
        self.vehicle = Vehicle.objects.create(
            customer=self.customer,
            brand='Test Make',  # Changed from 'make' to 'brand'
            model='Test Model',
            year=2020,
            registration_number='TEST1234',
            color='Blue'
            # Removed 'vin' field as it doesn't exist in the model
        )
        
        # Create service package
        self.package = ServicePackage.objects.create(
            name='Basic Service',
            description='Basic car service',
            price=Decimal('1000.00'),  # Changed from 'base_price' to 'price'
            duration=60,  # Changed from 'duration_minutes' to 'duration'
            is_active=True,
            hatchback_price=Decimal('800.00'),
            sedan_price=Decimal('1000.00'),
            suv_price=Decimal('1200.00'),
            bike_price=Decimal('600.00')
        )
        
        # Create addon
        self.addon = AddOn.objects.create(
            name='Interior Cleaning',
            price=Decimal('200.00'),
            duration=30,  # Added required duration field
            is_active=True
        )
        
        # Create appointment with timezone-aware datetimes
        self.appointment = Appointment.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.package,
            vehicle_type='sedan',
            preferred_datetime=timezone.now() + timedelta(days=1),
            alternate_datetime=timezone.now() + timedelta(days=2),
            branch=self.branch,
            notes='Test appointment'
        )
    
    def test_appointment_creation(self):
        """Test appointment creation."""
        self.assertEqual(Appointment.objects.count(), 1)
        self.assertEqual(self.appointment.customer, self.customer)
        self.assertEqual(self.appointment.vehicle, self.vehicle)
        self.assertEqual(self.appointment.package, self.package)
        self.assertEqual(self.appointment.vehicle_type, 'sedan')
        self.assertEqual(self.appointment.status, 'pending')
        self.assertEqual(str(self.appointment), f"Appointment #{self.appointment.id} - Test Customer - pending")
    
    def test_appointment_expires_at_set(self):
        """Test that expires_at is set automatically."""
        self.assertIsNotNone(self.appointment.expires_at)
        
    def test_is_expired_property(self):
        """Test is_expired property."""
        # Pending appointment that hasn't expired
        self.assertFalse(self.appointment.is_expired)
        
        # Expired appointment
        self.appointment.expires_at = timezone.now() - timedelta(days=1)
        self.appointment.save()
        self.assertTrue(self.appointment.is_expired)
        
        # Approved appointment (should not be expired even if past expiry date)
        self.appointment.status = 'approved'
        self.appointment.save()
        self.assertFalse(self.appointment.is_expired)
    
    def test_can_reschedule_property(self):
        """Test can_reschedule property."""
        # Pending appointment can be rescheduled
        self.appointment.status = 'pending'
        self.appointment.save()
        self.assertTrue(self.appointment.can_reschedule)
        
        # Approved appointment cannot be rescheduled
        self.appointment.status = 'approved'
        self.appointment.save()
        self.assertFalse(self.appointment.can_reschedule)
    
    def test_estimated_price(self):
        """Test estimated price calculation."""
        price = self.appointment.estimated_price
        expected_price = self.package.get_price_for_vehicle_type(self.appointment.vehicle_type)
        self.assertEqual(price, expected_price)
        
        # Add addon and test price
        self.appointment.addons.add(self.addon)
        updated_price = self.appointment.estimated_price
        expected_price_with_addon = expected_price + self.addon.price
        self.assertEqual(updated_price, expected_price_with_addon)
    
    def test_approve_method(self):
        """Test approve method."""
        self.appointment.approve(self.admin_user)
        self.appointment.refresh_from_db()
        
        self.assertEqual(self.appointment.status, 'approved')
        self.assertEqual(self.appointment.reviewed_by, self.admin_user)
        self.assertIsNotNone(self.appointment.reviewed_at)
        
    def test_reject_method(self):
        """Test reject method."""
        self.appointment.reject(self.admin_user, 'Not available')
        self.appointment.refresh_from_db()
        
        self.assertEqual(self.appointment.status, 'rejected')
        self.assertEqual(self.appointment.reviewed_by, self.admin_user)
        self.assertIsNotNone(self.appointment.reviewed_at)
        self.assertEqual(self.appointment.admin_notes, 'Not available')
    
    def test_cancel_method(self):
        """Test cancel method."""
        result = self.appointment.cancel()
        self.appointment.refresh_from_db()
        
        self.assertTrue(result)
        self.assertEqual(self.appointment.status, 'cancelled')
        
        # Cannot cancel non-pending appointment
        self.appointment.status = 'approved'
        self.appointment.save()
        result = self.appointment.cancel()
        self.assertFalse(result)
    
    def test_reschedule_method(self):
        """Test reschedule method."""
        new_datetime = timezone.now() + timedelta(days=3)
        result = self.appointment.reschedule(new_datetime)
        self.appointment.refresh_from_db()
        
        self.assertTrue(result)
        self.assertEqual(self.appointment.preferred_datetime.date(), new_datetime.date())
        
        # Cannot reschedule non-pending appointment
        self.appointment.status = 'approved'
        self.appointment.save()
        result = self.appointment.reschedule(new_datetime)
        self.assertFalse(result)


class AppointmentSlotModelTestCase(TestCase):
    """Test cases for AppointmentSlot model."""
    
    def setUp(self):
        """Set up test data."""
        self.branch = Branch.objects.create(
            name='Test Branch',
            code='TB001',
            address='123 Test St',
            city='Test City',
            state='Test State',
            pincode='123456',
            phone='1234567890'
        )
        
        self.slot = AppointmentSlot.objects.create(
            branch=self.branch,
            date=timezone.now().date(),
            start_time=timezone.now().time(),
            end_time=(timezone.now() + timedelta(hours=1)).time(),
            max_bookings=5,
            is_available=True
        )
    
    def test_slot_creation(self):
        """Test appointment slot creation."""
        self.assertEqual(AppointmentSlot.objects.count(), 1)
        self.assertEqual(self.slot.branch, self.branch)
        self.assertTrue(self.slot.is_available)
        self.assertEqual(self.slot.max_bookings, 5)
        
    def test_current_bookings_count(self):
        """Test current bookings count property."""
        count = self.slot.current_bookings_count
        self.assertEqual(count, 0)
    
    def test_available_slots(self):
        """Test available slots property."""
        available = self.slot.available_slots
        self.assertEqual(available, 5)
    
    def test_is_slot_available(self):
        """Test is_slot_available property."""
        is_available = self.slot.is_slot_available
        self.assertTrue(is_available)
        
        # Make slot unavailable
        self.slot.is_available = False
        self.slot.save()
        is_available = self.slot.is_slot_available
        self.assertFalse(is_available)


class AppointmentAPITestCase(TestCase):
    """Test cases for Appointment API endpoints."""
    
    def setUp(self):
        """Set up test data and API client."""
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
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='testpass123',
            name='Test Customer',
            phone='9876543210',
            role='customer',
            is_verified=True
        )
        # Assign branch to customer user to ensure proper branch assignment
        self.customer_user.branch = self.branch
        self.customer_user.save()
        
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Test Admin',
            role='branch_admin',
            is_verified=True
        )
        self.admin_user.branch = self.branch
        self.admin_user.save()
        
        # Create customer profile
        self.customer = Customer.objects.create(user=self.customer_user)
        
        # Create vehicle
        self.vehicle = Vehicle.objects.create(
            customer=self.customer,
            brand='Test Make',  # Changed from 'make' to 'brand'
            model='Test Model',
            year=2020,
            registration_number='TEST1234',
            color='Blue'
            # Removed 'vin' field as it doesn't exist in the model
        )
        
        # Create service package
        self.package = ServicePackage.objects.create(
            name='Basic Service',
            description='Basic car service',
            price=Decimal('1000.00'),  # Changed from 'base_price' to 'price'
            duration=60,  # Changed from 'duration_minutes' to 'duration'
            is_active=True,
            hatchback_price=Decimal('800.00'),
            sedan_price=Decimal('1000.00'),
            suv_price=Decimal('1200.00'),
            bike_price=Decimal('600.00')
        )
        
        # Create appointment
        self.appointment = Appointment.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.package,
            vehicle_type='sedan',
            preferred_datetime=timezone.now() + timedelta(days=1),
            alternate_datetime=timezone.now() + timedelta(days=2),
            branch=self.branch,
            notes='Test appointment'
        )
    
    def test_customer_can_create_appointment(self):
        """Test that customers can create appointments."""
        self.client.force_authenticate(user=self.customer_user)
        
        # Create a new vehicle for this test to avoid conflicts
        new_vehicle = Vehicle.objects.create(
            customer=self.customer,
            brand='New Test Make',
            model='New Test Model',
            year=2021,
            registration_number='NEWTEST1',
            color='Red'
        )
        
        data = {
            'vehicle': new_vehicle.id,
            'package': self.package.id,
            'vehicle_type': 'sedan',
            'preferred_datetime': (timezone.now() + timedelta(days=1)).isoformat(),
            'notes': 'New appointment',
            'pickup_required': False
        }

        response = self.client.post('/api/appointments/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # The count should be 2 (original + new)
        self.assertEqual(Appointment.objects.count(), 2)
        
    def test_customer_can_view_their_appointments(self):
        """Test that customers can view their appointments."""
        self.client.force_authenticate(user=self.customer_user)
        
        response = self.client.get('/api/appointments/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.appointment.id)
    
    def test_admin_can_view_all_appointments(self):
        """Test that admins can view all appointments in their branch."""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/appointments/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_customer_can_reschedule_appointment(self):
        """Test that customers can reschedule their appointments."""
        self.client.force_authenticate(user=self.customer_user)
        
        new_datetime = timezone.now() + timedelta(days=3)
        data = {
            'preferred_datetime': new_datetime.isoformat()
        }
        
        response = self.client.post(f'/api/appointments/{self.appointment.id}/reschedule/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.preferred_datetime.date(), new_datetime.date())
    
    def test_customer_can_cancel_appointment(self):
        """Test that customers can cancel their appointments."""
        self.client.force_authenticate(user=self.customer_user)
        
        response = self.client.post(f'/api/appointments/{self.appointment.id}/cancel/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, 'cancelled')
    
    def test_admin_can_approve_appointment(self):
        """Test that admins can approve appointments."""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'confirmed_datetime': (timezone.now() + timedelta(days=1)).isoformat()
        }
        
        response = self.client.post(f'/api/appointments/{self.appointment.id}/approve/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, 'approved')
    
    def test_admin_can_reject_appointment(self):
        """Test that admins can reject appointments."""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'reason': 'Not available'
        }
        
        response = self.client.post(f'/api/appointments/{self.appointment.id}/reject/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, 'rejected')
    
    def test_admin_can_convert_appointment_to_booking(self):
        """Test that admins can convert appointments to bookings."""
        self.client.force_authenticate(user=self.admin_user)
        
        # First approve the appointment
        self.appointment.approve(self.admin_user)
        
        response = self.client.post(f'/api/appointments/{self.appointment.id}/convert_to_booking/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, 'converted')
    
    def test_unauthenticated_user_cannot_access_appointments(self):
        """Test that unauthenticated users cannot access appointments."""
        response = self.client.get('/api/appointments/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AppointmentSlotAPITestCase(TestCase):
    """Test cases for AppointmentSlot API endpoints."""
    
    def setUp(self):
        """Set up test data and API client."""
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
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Test Admin',
            role='branch_admin',
            is_verified=True
        )
        self.admin_user.branch = self.branch
        self.admin_user.save()
        
        # Create appointment slot
        self.slot = AppointmentSlot.objects.create(
            branch=self.branch,
            date=timezone.now().date(),
            start_time=timezone.now().time(),
            end_time=(timezone.now() + timedelta(hours=1)).time(),
            max_bookings=5,
            is_available=True
        )
    
    def test_admin_can_list_appointment_slots(self):
        """Test that admins can list appointment slots."""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/appointments/slots/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_get_available_slots(self):
        """Test getting available slots for a branch and date."""
        self.client.force_authenticate(user=self.admin_user)
        
        date_str = timezone.now().date().isoformat()
        response = self.client.get(f'/api/appointments/slots/available/?branch_id={self.branch.id}&date={date_str}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_generate_slots(self):
        """Test generating appointment slots for a date range."""
        self.client.force_authenticate(user=self.admin_user)
        
        start_date = (timezone.now() + timedelta(days=1)).date().isoformat()
        end_date = (timezone.now() + timedelta(days=3)).date().isoformat()
        
        data = {
            'branch_id': self.branch.id,
            'start_date': start_date,
            'end_date': end_date,
            'start_time': '09:00',
            'end_time': '18:00',
            'slot_duration': 60,
            'max_bookings': 3
        }
        
        response = self.client.post('/api/appointments/slots/generate_slots/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_unauthenticated_user_cannot_access_slots(self):
        """Test that unauthenticated users cannot access appointment slots."""
        response = self.client.get('/api/appointments/slots/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)