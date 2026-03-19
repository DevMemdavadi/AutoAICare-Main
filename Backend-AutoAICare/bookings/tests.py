"""
Test cases for the bookings app.

This file contains comprehensive tests for:
- Admin walk-in booking creation
- Booking management
- Booking status transitions
- Integration with job cards
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from branches.models import Branch
from customers.models import Customer, Vehicle
from services.models import ServicePackage, AddOn
from .models import Booking
from jobcards.models import JobCard

User = get_user_model()


class AdminWalkInBookingTestCase(TestCase):
    """Test cases for admin walk-in booking creation."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create branch
        self.branch = Branch.objects.create(
            name="Test Branch",
            code="TB001",
            address="123 Test Street",
            city="Test City",
            state="Test State",
            pincode="123456",
            phone="1234567890"
        )

        # Create admin user (using 'branch_admin' role as expected by the view)
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            password="testpass123",
            name="Test Admin",
            role="branch_admin"
        )
        self.admin_user.branch = self.branch
        self.admin_user.save()

        # Create customer
        self.customer_user = User.objects.create_user(
            email="customer@test.com",
            password="testpass123",
            name="Test Customer",
            role="customer",
            phone="9876543210"
        )
        self.customer = Customer.objects.create(user=self.customer_user)

        # Create service package
        self.package = ServicePackage.objects.create(
            name="Basic Service",
            description="Basic car service",
            price=Decimal('1000.00'),
            hatchback_price=Decimal('900.00'),
            sedan_price=Decimal('1000.00'),
            suv_price=Decimal('1200.00'),
            duration=60,
            is_active=True,
            is_global=False,
            branch=self.branch
        )

        # Create addon
        self.addon = AddOn.objects.create(
            package=self.package,
            name="Interior Cleaning",
            price=Decimal('200.00'),
            duration=30,
            is_active=True,
            is_global=False,
            branch=self.branch
        )

    def test_admin_create_walk_in_booking_success(self):
        """Test successful creation of walk-in booking by admin."""
        self.client.force_authenticate(user=self.admin_user)

        data = {
            "customer": {
                "name": "Walk In Customer",
                "phone": "1112223333",
                "email": "walkin@test.com"
            },
            "vehicle": {
                "registration_number": "TEST123",
                "brand": "Toyota",
                "model": "Corolla",
                "year": 2020,
                "color": "White"
            },
            "package": self.package.id,
            "addon_ids": [],
            "vehicle_type": "sedan",
            "booking_datetime": "2023-12-01T10:00",
            "pickup_required": False,
            "location": "",
            "notes": "Walk-in customer booking"
        }

        response = self.client.post(
            '/api/bookings/admin_create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that booking was created
        self.assertEqual(Booking.objects.count(), 1)
        booking = Booking.objects.first()
        self.assertEqual(booking.status, 'pending')
        self.assertEqual(booking.branch, self.branch)
        # Calculate expected total with GST (18%)
        package_price = self.package.sedan_price  # Using sedan price as we specified 'sedan' as vehicle_type
        gst_amount = (package_price * Decimal('18')) / Decimal('100')
        expected_total = package_price + gst_amount
        self.assertEqual(booking.total_price, expected_total)
        self.assertEqual(booking.notes, "Walk-in customer booking")

        # Check response data
        self.assertIn('id', response.data)

    def test_admin_create_walk_in_booking_with_addons(self):
        """Test successful creation of walk-in booking with addons by admin."""
        self.client.force_authenticate(user=self.admin_user)

        data = {
            "customer": {
                "name": "Walk In Customer",
                "phone": "1112223334",
                "email": "walkin2@test.com"
            },
            "vehicle": {
                "registration_number": "TEST124",
                "brand": "Toyota",
                "model": "Corolla",
                "year": 2020,
                "color": "White"
            },
            "package": self.package.id,
            "addon_ids": [self.addon.id],
            "vehicle_type": "sedan",
            "booking_datetime": "2023-12-01T10:00",
            "pickup_required": False,
            "location": "",
            "notes": "Walk-in customer booking with addons"
        }

        response = self.client.post(
            '/api/bookings/admin_create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that booking was created with correct total price
        self.assertEqual(Booking.objects.count(), 1)
        booking = Booking.objects.first()
        # Calculate expected total with GST (18%)
        package_price = self.package.sedan_price  # Using sedan price as we specified 'sedan' as vehicle_type
        addon_price = self.addon.price
        subtotal = package_price + addon_price
        gst_amount = (subtotal * Decimal('18')) / Decimal('100')
        expected_total = subtotal + gst_amount
        self.assertEqual(booking.total_price, expected_total)
        self.assertEqual(booking.addons.count(), 1)
        self.assertEqual(booking.addons.first(), self.addon)

    def test_admin_create_walk_in_booking_with_existing_customer(self):
        """Test creation of walk-in booking with existing customer."""
        self.client.force_authenticate(user=self.admin_user)

        data = {
            "customer": {
                "id": self.customer.id
            },
            "vehicle": {
                "registration_number": "TEST456",
                "brand": "Honda",
                "model": "Civic",
                "year": 2019,
                "color": "Black"
            },
            "package": self.package.id,
            "addon_ids": [],
            "vehicle_type": "sedan",
            "booking_datetime": "2023-12-01T11:00",
            "pickup_required": False,
            "location": "",
            "notes": "Walk-in existing customer booking"
        }

        response = self.client.post(
            '/api/bookings/admin_create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that booking was created
        self.assertEqual(Booking.objects.count(), 1)
        booking = Booking.objects.first()
        self.assertEqual(booking.customer, self.customer)

    def test_admin_create_walk_in_booking_with_existing_customer_and_vehicle(self):
        """Test creation of walk-in booking with existing customer and existing vehicle."""
        self.client.force_authenticate(user=self.admin_user)
        
        # Create a vehicle for the existing customer
        vehicle = Vehicle.objects.create(
            customer=self.customer,
            registration_number="EXIST123",
            brand="Ford",
            model="Focus",
            year=2018,
            color="Blue"
        )

        data = {
            "customer": {
                "id": self.customer.id
            },
            "vehicle": {
                "id": vehicle.id
            },
            "package": self.package.id,
            "addon_ids": [],
            "vehicle_type": "sedan",
            "booking_datetime": "2023-12-01T12:00",
            "pickup_required": False,
            "location": "",
            "notes": "Walk-in existing customer with existing vehicle"
        }

        response = self.client.post(
            '/api/bookings/admin_create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that booking was created
        self.assertEqual(Booking.objects.count(), 1)
        booking = Booking.objects.first()
        self.assertEqual(booking.customer, self.customer)
        self.assertEqual(booking.vehicle, vehicle)

    def test_non_admin_cannot_create_walk_in_booking(self):
        """Test that non-admin users cannot create walk-in bookings."""
        self.client.force_authenticate(user=self.customer_user)

        data = {
            "customer": {
                "name": "Walk In Customer",
                "phone": "1112223335",
                "email": "walkin3@test.com"
            },
            "vehicle": {
                "registration_number": "TEST125",
                "brand": "Toyota",
                "model": "Corolla",
                "year": 2020,
                "color": "White"
            },
            "package": self.package.id,
            "addon_ids": [],
            "vehicle_type": "sedan",
            "booking_datetime": "2023-12-01T10:00",
            "pickup_required": False,
            "location": "",
            "notes": "Walk-in customer booking"
        }

        response = self.client.post(
            '/api/bookings/admin_create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_create_booking_with_invalid_package(self):
        """Test that admin gets validation error when creating booking with invalid package."""
        self.client.force_authenticate(user=self.admin_user)

        data = {
            "customer": {
                "name": "Walk In Customer",
                "phone": "1112223336",
                "email": "walkin4@test.com"
            },
            "vehicle": {
                "registration_number": "TEST126",
                "brand": "Toyota",
                "model": "Corolla",
                "year": 2020,
                "color": "White"
            },
            "package": 99999,  # Invalid package ID
            "addon_ids": [],
            "vehicle_type": "sedan",
            "booking_datetime": "2023-12-01T10:00",
            "pickup_required": False,
            "location": "",
            "notes": "Walk-in customer booking"
        }

        response = self.client.post(
            '/api/bookings/admin_create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_create_booking_with_invalid_addon(self):
        """Test that admin cannot create booking with invalid addon."""
        self.client.force_authenticate(user=self.admin_user)

        data = {
            "customer": {
                "name": "Walk In Customer",
                "phone": "1112223337",
                "email": "walkin5@test.com"
            },
            "vehicle": {
                "registration_number": "TEST127",
                "brand": "Toyota",
                "model": "Corolla",
                "year": 2020,
                "color": "White"
            },
            "package": self.package.id,
            "addon_ids": [99999],  # Invalid addon ID
            "vehicle_type": "sedan",
            "booking_datetime": "2023-12-01T10:00",
            "pickup_required": False,
            "location": "",
            "notes": "Walk-in customer booking"
        }

        response = self.client.post(
            '/api/bookings/admin_create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_create_booking_with_pickup_required(self):
        """Test successful creation of booking with pickup required."""
        self.client.force_authenticate(user=self.admin_user)

        data = {
            "customer": {
                "name": "Walk In Customer",
                "phone": "1112223338",
                "email": "walkin6@test.com"
            },
            "vehicle": {
                "registration_number": "TEST128",
                "brand": "Toyota",
                "model": "Corolla",
                "year": 2020,
                "color": "White"
            },
            "package": self.package.id,
            "addon_ids": [],
            "vehicle_type": "sedan",
            "booking_datetime": "2023-12-01T10:00",
            "pickup_required": True,
            "location": "Home Address, 123 Main St",
            "notes": "Pickup required for this booking"
        }

        response = self.client.post(
            '/api/bookings/admin_create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that booking was created with pickup details
        self.assertEqual(Booking.objects.count(), 1)
        booking = Booking.objects.first()
        self.assertTrue(booking.pickup_required)
        self.assertEqual(booking.location, "Home Address, 123 Main St")

    def test_super_admin_create_booking_with_branch(self):
        """Test that super admin can create booking for specific branch."""
        # Create super admin
        super_admin = User.objects.create_user(
            email="superadmin@test.com",
            password="testpass123",
            name="Super Admin",
            role="super_admin"
        )
        self.client.force_authenticate(user=super_admin)

        data = {
            "customer": {
                "name": "Walk In Customer",
                "phone": "1112223339",
                "email": "walkin7@test.com"
            },
            "vehicle": {
                "registration_number": "TEST129",
                "brand": "Toyota",
                "model": "Corolla",
                "year": 2020,
                "color": "White"
            },
            "package": self.package.id,
            "addon_ids": [],
            "vehicle_type": "sedan",
            "booking_datetime": "2023-12-01T10:00",
            "pickup_required": False,
            "location": "",
            "notes": "Super admin booking",
            "branch": self.branch.id
        }

        response = self.client.post(
            '/api/bookings/admin_create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check that booking was created
        self.assertEqual(Booking.objects.count(), 1)
        booking = Booking.objects.first()
        self.assertEqual(booking.branch, self.branch)

    def test_admin_cannot_create_booking_without_branch(self):
        """Test that admin cannot create booking without assigned branch."""
        # Remove branch from admin
        self.admin_user.branch = None
        self.admin_user.save()

        self.client.force_authenticate(user=self.admin_user)

        data = {
            "customer": {
                "name": "Walk In Customer",
                "phone": "1112223340",
                "email": "walkin8@test.com"
            },
            "vehicle": {
                "registration_number": "TEST130",
                "brand": "Toyota",
                "model": "Corolla",
                "year": 2020,
                "color": "White"
            },
            "package": self.package.id,
            "addon_ids": [],
            "booking_datetime": "2023-12-01T10:00",
            "pickup_required": False,
            "location": "",
            "notes": "Walk-in customer booking"
        }

        response = self.client.post(
            '/api/bookings/admin_create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_booking_has_jobcard_property(self):
        """Test that booking has_jobcard property works correctly."""
        self.client.force_authenticate(user=self.admin_user)

        # Create booking first
        data = {
            "customer": {
                "name": "Walk In Customer",
                "phone": "1112223341",
                "email": "walkin9@test.com"
            },
            "vehicle": {
                "registration_number": "TEST131",
                "brand": "Toyota",
                "model": "Corolla",
                "year": 2020,
                "color": "White"
            },
            "package": self.package.id,
            "addon_ids": [],
            "vehicle_type": "sedan",
            "booking_datetime": "2023-12-01T10:00",
            "pickup_required": False,
            "location": "",
            "notes": "Walk-in customer booking"
        }

        response = self.client.post(
            '/api/bookings/admin_create/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Get booking details
        booking_id = response.data['id']
        detail_response = self.client.get(f'/api/bookings/{booking_id}/')
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertFalse(detail_response.data['has_jobcard'])

        # Create job card for this booking
        booking = Booking.objects.get(id=booking_id)
        JobCard.objects.create(
            booking=booking,
            branch=self.branch,
            status='created'
        )

        # Check that has_jobcard is now True
        detail_response = self.client.get(f'/api/bookings/{booking_id}/')
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertTrue(detail_response.data['has_jobcard'])


class BookingModelTestCase(TestCase):
    """Test cases for Booking model."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create branch
        self.branch = Branch.objects.create(
            name="Test Branch",
            code="TB001",
            address="123 Test Street",
            city="Test City",
            state="Test State",
            pincode="123456",
            phone="1234567890"
        )

        # Create customer
        customer_user = User.objects.create_user(
            email="customer2@test.com",
            password="testpass123",
            name="Test Customer 2",
            role="customer"
        )
        self.customer = Customer.objects.create(user=customer_user)

        # Create vehicle
        self.vehicle = self.customer.vehicles.create(
            registration_number="MODEL123",
            brand="Honda",
            model="Civic",
            year=2021,
            color="Red"
        )

        # Create service package
        self.package = ServicePackage.objects.create(
            name="Premium Service",
            description="Premium car service",
            price=Decimal('2000.00'),
            hatchback_price=Decimal('1800.00'),
            sedan_price=Decimal('2000.00'),
            suv_price=Decimal('2400.00'),
            duration=120,
            is_active=True,
            is_global=False,
            branch=self.branch
        )

        # Create addon
        self.addon = AddOn.objects.create(
            package=self.package,
            name="Exterior Wash",
            price=Decimal('100.00'),
            duration=15,
            is_active=True,
            is_global=False,
            branch=self.branch
        )

    def test_booking_creation(self):
        """Test booking creation with proper calculation."""
        from django.utils import timezone
        from datetime import datetime

        # Create booking
        booking = Booking(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.package,
            booking_datetime=timezone.make_aware(
                datetime(2023, 12, 1, 10, 0, 0)),
            status='pending',
            pickup_required=False,
            total_price=Decimal('0'),  # Will be calculated
            branch=self.branch
        )
        # Save booking with addons to trigger price calculation
        booking.save(addons=[self.addon])

        # Check total price calculation
        # Calculate expected total with GST (18%)
        package_price = self.package.sedan_price  # Using sedan price as default
        addon_price = self.addon.price
        subtotal = package_price + addon_price
        gst_amount = (subtotal * Decimal('18')) / Decimal('100')
        expected_total = subtotal + gst_amount
        self.assertEqual(booking.total_price, expected_total)

    def test_booking_has_jobcard_property(self):
        """Test the has_jobcard property."""
        from django.utils import timezone
        from datetime import datetime

        # Calculate expected total with GST (18%)
        package_price = self.package.sedan_price  # Using sedan price as default
        gst_amount = (package_price * Decimal('18')) / Decimal('100')
        expected_total_price = package_price + gst_amount
        
        # Create booking
        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.package,
            booking_datetime=timezone.make_aware(
                datetime(2023, 12, 1, 10, 0, 0)),
            status='pending',
            pickup_required=False,
            total_price=expected_total_price,
            branch=self.branch
        )

        # Initially should not have jobcard
        self.assertFalse(booking.has_jobcard)

        # Create job card
        JobCard.objects.create(
            booking=booking,
            branch=self.branch,
            status='created'
        )

        # Should now have jobcard
        self.assertTrue(booking.has_jobcard)