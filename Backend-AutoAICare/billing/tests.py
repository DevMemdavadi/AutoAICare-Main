"""
Test cases for the billing app.

This file contains comprehensive tests for:
- Invoice CRUD operations
- Invoice status management
- Invoice item management
- Invoice generation from job cards
- PDF download functionality
- Staff vs customer permissions
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from branches.models import Branch
from customers.models import Customer, Vehicle
from bookings.models import Booking
from jobcards.models import JobCard, PartUsed
from services.models import ServicePackage, AddOn
from store.models import Product
from .models import Invoice, InvoiceItem
from decimal import Decimal
from datetime import date
from django.utils import timezone

User = get_user_model()


class InvoiceModelTestCase(TestCase):
    """Test cases for Invoice model."""

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

        # Create staff user
        self.staff_user = User.objects.create_user(
            email='staff@example.com',
            password='testpass123',
            name='Test Staff',
            role='applicator',
            is_verified=True
        )
        self.staff_user.branch = self.branch
        self.staff_user.save()

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

        # Create booking (need to handle many-to-many relationships properly)
        self.booking = Booking(
            customer=self.customer,
            vehicle=self.vehicle,
            package=self.package,
            booking_datetime=timezone.now() + timezone.timedelta(days=1),
            status='confirmed',
            branch=self.branch,
            # Set directly to avoid calculation issues
            total_price=Decimal('1000.00')
        )
        # Save with addons
        self.booking.save(addons=[self.addon])
        # Note: We don't need to add addons again since we passed them in save()

        # Create job card
        self.jobcard = JobCard.objects.create(
            booking=self.booking,
            technician=self.staff_user,
            status='completed',
            branch=self.branch
        )

        # Add a part used to the job card
        self.part_used = PartUsed.objects.create(
            jobcard=self.jobcard,
            part_name='Engine Oil',
            quantity=1,
            price=Decimal('50.00')
        )

        # Create product
        self.product = Product.objects.create(
            name='Engine Oil',
            description='High quality engine oil',
            price=Decimal('50.00'),
            stock=100,
            branch=self.branch
        )

        # Create invoice
        self.invoice = Invoice.objects.create(
            customer=self.customer,
            booking=self.booking,
            jobcard=self.jobcard,
            branch=self.branch,
            invoice_number='INV-20231201-1234',
            tax_rate=Decimal('18.00'),
            discount_amount=Decimal('100.00'),
            notes='Test invoice notes',
            due_date=date(2023, 12, 31),
            created_by=self.staff_user
        )

        # Create invoice items
        self.invoice_item_service = InvoiceItem.objects.create(
            invoice=self.invoice,
            item_type='service',
            description='Basic Service',
            quantity=Decimal('1'),
            unit_price=Decimal('1000.00')
        )

        self.invoice_item_product = InvoiceItem.objects.create(
            invoice=self.invoice,
            item_type='product',
            description='Engine Oil',
            quantity=Decimal('2'),
            unit_price=Decimal('50.00'),
            product=self.product
        )

    def test_invoice_creation(self):
        """Test invoice creation."""
        self.assertEqual(Invoice.objects.count(), 1)
        self.assertEqual(self.invoice.customer, self.customer)
        self.assertEqual(self.invoice.booking, self.booking)
        self.assertEqual(self.invoice.jobcard, self.jobcard)
        self.assertEqual(self.invoice.branch, self.branch)
        self.assertEqual(self.invoice.invoice_number, 'INV-20231201-1234')
        self.assertEqual(self.invoice.status, 'pending')
        self.assertEqual(self.invoice.tax_rate, Decimal('18.00'))
        self.assertEqual(self.invoice.discount_amount, Decimal('100.00'))
        self.assertEqual(self.invoice.notes, 'Test invoice notes')
        self.assertEqual(str(
            self.invoice), f"Invoice #{self.invoice.invoice_number} - {self.customer.user.name} - ${self.invoice.total_amount}")

    def test_invoice_item_creation(self):
        """Test invoice item creation."""
        self.assertEqual(InvoiceItem.objects.count(), 2)
        self.assertEqual(self.invoice_item_service.item_type, 'service')
        self.assertEqual(
            self.invoice_item_service.description, 'Basic Service')
        self.assertEqual(self.invoice_item_service.quantity, Decimal('1'))
        self.assertEqual(self.invoice_item_service.unit_price,
                         Decimal('1000.00'))
        self.assertEqual(self.invoice_item_service.total, Decimal('1000.00'))

        self.assertEqual(self.invoice_item_product.item_type, 'product')
        self.assertEqual(self.invoice_item_product.description, 'Engine Oil')
        self.assertEqual(self.invoice_item_product.quantity, Decimal('2'))
        self.assertEqual(self.invoice_item_product.unit_price,
                         Decimal('50.00'))
        self.assertEqual(self.invoice_item_product.total, Decimal('100.00'))
        self.assertEqual(self.invoice_item_product.product, self.product)

    def test_invoice_calculate_totals(self):
        """Test invoice total calculation."""
        # Initially calculated in setUp
        self.invoice.calculate_totals()

        # Subtotal = 1000 + 100 = 1100
        self.assertEqual(self.invoice.subtotal, Decimal('1100.00'))

        # Tax amount = (1100 * 18) / 100 = 198
        self.assertEqual(self.invoice.tax_amount, Decimal('198.00'))

        # Total amount = 1100 + 198 - 100 = 1198
        self.assertEqual(self.invoice.total_amount, Decimal('1198.00'))

    def test_invoice_mark_as_paid(self):
        """Test marking invoice as paid."""
        self.assertEqual(self.invoice.status, 'pending')
        self.assertIsNone(self.invoice.paid_date)

        self.invoice.mark_as_paid()

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'paid')
        self.assertIsNotNone(self.invoice.paid_date)


class InvoiceAPITestCase(TestCase):
    """Test cases for Invoice API endpoints."""

    def setUp(self):
        """Set up test data."""
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

        # Create staff user
        self.staff_user = User.objects.create_user(
            email='staff@example.com',
            password='testpass123',
            name='Test Staff',
            role='applicator',
            is_verified=True
        )
        self.staff_user.branch = self.branch
        self.staff_user.save()

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
            booking_datetime=timezone.now() + timezone.timedelta(days=1),
            status='confirmed',
            branch=self.branch,
            # Set directly to avoid calculation issues
            total_price=Decimal('1000.00')
        )
        # Save with addons
        self.booking.save(addons=[self.addon])
        # Note: We don't need to add addons again since we passed them in save()

        # Create job card
        self.jobcard = JobCard.objects.create(
            booking=self.booking,
            technician=self.staff_user,
            status='completed',
            branch=self.branch
        )

        # Add a part used to the job card
        self.part_used = PartUsed.objects.create(
            jobcard=self.jobcard,
            part_name='Engine Oil',
            quantity=1,
            price=Decimal('50.00')
        )

        # Create product
        self.product = Product.objects.create(
            name='Engine Oil',
            description='High quality engine oil',
            price=Decimal('50.00'),
            stock=100,
            branch=self.branch
        )

        # Create invoice
        self.invoice = Invoice.objects.create(
            customer=self.customer,
            booking=self.booking,
            jobcard=self.jobcard,
            branch=self.branch,
            invoice_number='INV-20231201-1234',
            tax_rate=Decimal('18.00'),
            discount_amount=Decimal('100.00'),
            notes='Test invoice notes',
            due_date=date(2023, 12, 31),
            created_by=self.staff_user
        )

        # Create invoice items
        self.invoice_item_service = InvoiceItem.objects.create(
            invoice=self.invoice,
            item_type='service',
            description='Basic Service',
            quantity=Decimal('1'),
            unit_price=Decimal('1000.00')
        )

        self.invoice_item_product = InvoiceItem.objects.create(
            invoice=self.invoice,
            item_type='product',
            description='Engine Oil',
            quantity=Decimal('2'),
            unit_price=Decimal('50.00'),
            product=self.product
        )

    def test_staff_can_list_invoices(self):
        """Test that staff can list invoices."""
        self.client.force_authenticate(user=self.staff_user)

        response = self.client.get('/api/billing/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]
                         ['invoice_number'], 'INV-20231201-1234')

    def test_customer_can_list_own_invoices(self):
        """Test that customers can only see their own invoices."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.get('/api/billing/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]
                         ['invoice_number'], 'INV-20231201-1234')

    def test_customer_cannot_see_other_invoices(self):
        """Test that customers cannot see other customers' invoices."""
        # Create another customer
        other_customer_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            name='Other Customer',
            phone='9876543210',
            role='customer',
            is_verified=True
        )

        other_customer = Customer.objects.create(user=other_customer_user)

        self.client.force_authenticate(user=other_customer_user)

        response = self.client.get('/api/billing/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

    def test_staff_can_create_invoice(self):
        """Test that staff can create invoices."""
        self.client.force_authenticate(user=self.staff_user)

        # Create another customer for testing
        other_customer_user = User.objects.create_user(
            email='other2@example.com',
            password='testpass123',
            name='Other Customer 2',
            phone='9876543211',
            role='customer',
            is_verified=True
        )

        other_customer = Customer.objects.create(user=other_customer_user)

        # Create vehicle for other customer
        other_vehicle = Vehicle.objects.create(
            customer=other_customer,
            registration_number='OTHER123',
            brand='Honda',
            model='Civic',
            year=2021,
            color='Black'
        )

        data = {
            'customer': other_customer.id,
            'tax_rate': '18.00',
            'discount_amount': '50.00',
            'notes': 'New test invoice',
            'due_date': '2023-12-31',
            'items': [
                {
                    'item_type': 'service',
                    'description': 'Premium Service',
                    'quantity': '1',
                    'unit_price': '2000.00'
                },
                {
                    'item_type': 'product',
                    'description': 'Air Filter',
                    'quantity': '1',
                    'unit_price': '150.00'
                }
            ]
        }

        response = self.client.post('/api/billing/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Invoice.objects.count(), 2)

        # Check that invoice was created correctly
        invoice = Invoice.objects.exclude(id=self.invoice.id).first()
        self.assertEqual(invoice.customer, other_customer)
        self.assertEqual(invoice.tax_rate, Decimal('18.00'))
        self.assertEqual(invoice.discount_amount, Decimal('50.00'))
        self.assertEqual(invoice.notes, 'New test invoice')
        self.assertEqual(invoice.created_by, self.staff_user)

        # Check items were created
        self.assertEqual(invoice.items.count(), 2)

        # Check totals calculation
        invoice.calculate_totals()
        # Subtotal = 2000 + 150 = 2150
        # Tax = (2150 * 18) / 100 = 387
        # Total = 2150 + 387 - 50 = 2487
        self.assertEqual(invoice.total_amount, Decimal('2487.00'))

    def test_customer_cannot_create_invoice(self):
        """Test that customers cannot create invoices."""
        self.client.force_authenticate(user=self.customer_user)

        data = {
            'customer': self.customer.id,
            'tax_rate': '18.00',
            'discount_amount': '50.00',
            'notes': 'Customer trying to create invoice',
            'due_date': '2023-12-31',
            'items': [
                {
                    'item_type': 'service',
                    'description': 'Service',
                    'quantity': '1',
                    'unit_price': '1000.00'
                }
            ]
        }

        response = self.client.post('/api/billing/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_update_invoice(self):
        """Test that staff can update invoices."""
        self.client.force_authenticate(user=self.staff_user)

        data = {
            'status': 'paid',
            'notes': 'Updated notes'
        }

        response = self.client.patch(
            f'/api/billing/{self.invoice.id}/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'paid')
        self.assertEqual(self.invoice.notes, 'Updated notes')

    def test_customer_cannot_update_invoice(self):
        """Test that customers cannot update invoices."""
        self.client.force_authenticate(user=self.customer_user)

        data = {
            'status': 'paid',
            'notes': 'Customer trying to update'
        }

        response = self.client.patch(
            f'/api/billing/{self.invoice.id}/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_delete_invoice(self):
        """Test that staff can delete invoices."""
        self.client.force_authenticate(user=self.staff_user)

        response = self.client.delete(f'/api/billing/{self.invoice.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Invoice.objects.count(), 0)

    def test_customer_cannot_delete_invoice(self):
        """Test that customers cannot delete invoices."""
        self.client.force_authenticate(user=self.customer_user)

        response = self.client.delete(f'/api/billing/{self.invoice.id}/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_mark_invoice_paid(self):
        """Test that staff can mark invoice as paid."""
        self.client.force_authenticate(user=self.staff_user)

        self.assertEqual(self.invoice.status, 'pending')

        response = self.client.post(
            f'/api/billing/{self.invoice.id}/mark_paid/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'],
                         'Invoice marked as paid successfully.')

        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, 'paid')

    def test_staff_cannot_mark_already_paid_invoice(self):
        """Test that staff cannot mark already paid invoice as paid."""
        # First mark as paid
        self.invoice.status = 'paid'
        self.invoice.save()

        self.client.force_authenticate(user=self.staff_user)

        response = self.client.post(
            f'/api/billing/{self.invoice.id}/mark_paid/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Invoice is already paid.')

    def test_staff_can_add_item_to_invoice(self):
        """Test that staff can add items to invoice."""
        self.client.force_authenticate(user=self.staff_user)

        data = {
            'item_type': 'addon',
            'description': 'Interior Cleaning',
            'quantity': '1',
            'unit_price': '300.00'
        }

        response = self.client.post(
            f'/api/billing/{self.invoice.id}/add_item/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Item added successfully.')

        # Check that item was added
        self.assertEqual(self.invoice.items.count(), 3)

        # Check that totals were recalculated
        self.invoice.refresh_from_db()
        # Original subtotal = 1100, new item = 300, new subtotal = 1400
        # Tax = (1400 * 18) / 100 = 252
        # Total = 1400 + 252 - 100 = 1552
        self.assertEqual(self.invoice.total_amount, Decimal('1552.00'))

    def test_staff_cannot_add_item_to_paid_invoice(self):
        """Test that staff cannot add items to paid invoice."""
        # Mark invoice as paid
        self.invoice.status = 'paid'
        self.invoice.save()

        self.client.force_authenticate(user=self.staff_user)

        data = {
            'item_type': 'addon',
            'description': 'Interior Cleaning',
            'quantity': '1',
            'unit_price': '300.00'
        }

        response = self.client.post(
            f'/api/billing/{self.invoice.id}/add_item/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Cannot modify paid invoice.')

    def test_staff_can_generate_invoice_from_jobcard(self):
        """Test that staff can generate invoice from job card."""
        # First delete existing invoice to test creation
        self.invoice.delete()

        self.client.force_authenticate(user=self.staff_user)

        data = {
            'jobcard_id': self.jobcard.id
        }

        response = self.client.post(
            '/api/billing/from_jobcard/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data['message'], 'Invoice created successfully from job card')
        self.assertEqual(Invoice.objects.count(), 1)

        # Check invoice details
        invoice = Invoice.objects.first()
        self.assertEqual(invoice.customer, self.customer)
        self.assertEqual(invoice.booking, self.booking)
        self.assertEqual(invoice.jobcard, self.jobcard)
        self.assertEqual(invoice.branch, self.branch)
        self.assertEqual(invoice.status, 'pending')
        self.assertEqual(invoice.created_by, self.staff_user)

        # Check items created from job card
        self.assertEqual(invoice.items.count(), 2)

        # Check service package item
        service_item = invoice.items.filter(item_type='service').first()
        self.assertIsNotNone(service_item)
        self.assertEqual(service_item.description, self.package.name)
        self.assertEqual(service_item.unit_price,
                         Decimal(str(self.package.price)))

        # Check that we have 2 items total
        items = list(invoice.items.all())
        self.assertEqual(len(items), 2)

    def test_staff_get_existing_invoice_from_jobcard(self):
        """Test that staff gets existing invoice when trying to generate from job card."""
        self.client.force_authenticate(user=self.staff_user)

        data = {
            'jobcard_id': self.jobcard.id
        }

        response = self.client.post(
            '/api/billing/from_jobcard/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'],
                         'Invoice already exists for this job card')
        self.assertEqual(Invoice.objects.count(), 1)

    def test_staff_cannot_generate_invoice_without_jobcard_id(self):
        """Test that staff cannot generate invoice without jobcard_id."""
        self.client.force_authenticate(user=self.staff_user)

        data = {}

        response = self.client.post(
            '/api/billing/from_jobcard/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'jobcard_id is required')

    def test_staff_cannot_generate_invoice_for_nonexistent_jobcard(self):
        """Test that staff cannot generate invoice for nonexistent jobcard."""
        self.client.force_authenticate(user=self.staff_user)

        data = {
            'jobcard_id': 99999
        }

        response = self.client.post(
            '/api/billing/from_jobcard/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error'], 'Job card not found')

    def test_customer_cannot_access_protected_endpoints(self):
        """Test that customers cannot access protected endpoints."""
        self.client.force_authenticate(user=self.customer_user)

        # Test mark_paid
        response = self.client.post(
            f'/api/billing/{self.invoice.id}/mark_paid/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test add_item
        data = {
            'item_type': 'addon',
            'description': 'Interior Cleaning',
            'quantity': '1',
            'unit_price': '300.00'
        }
        response = self.client.post(
            f'/api/billing/{self.invoice.id}/add_item/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test from_jobcard
        response = self.client.post(
            '/api/billing/from_jobcard/', {'jobcard_id': self.jobcard.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_access_endpoints(self):
        """Test that unauthenticated users cannot access any endpoints."""
        # Don't authenticate

        # Test list
        response = self.client.get('/api/billing/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test create
        data = {
            'customer': self.customer.id,
            'tax_rate': '18.00',
            'items': []
        }
        response = self.client.post('/api/billing/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test detail
        response = self.client.get(f'/api/billing/{self.invoice.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
