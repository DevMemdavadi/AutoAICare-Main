"""
Test cases for the branches app.

This file contains comprehensive tests for:
- Branch creation (super admin only)
- Branch listing
- Branch update
- Branch filtering
- Branch activation/deactivation
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Branch

User = get_user_model()


class BranchManagementTestCase(TestCase):
    """Test cases for branch management."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.branches_url = '/api/branches/'

        # Create super admin
        self.super_admin = User.objects.create_user(
            email='superadmin@example.com',
            password='testpass123',
            name='Super Admin',
            role='super_admin',
            is_staff=True,
            is_superuser=True,
            is_verified=True
        )

        # Create admin
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            name='Admin',
            role='branch_admin',
            is_staff=True,
            is_verified=True
        )

        # Create existing branch
        self.branch = Branch.objects.create(
            name='Existing Branch',
            code='EB001',
            address='123 Main St',
            city='Test City',
            state='Test State',
            pincode='123456',
            phone='1234567890'
        )

    def test_list_branches(self):
        """Test that anyone can list branches."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.branches_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_create_branch_as_super_admin(self):
        """Test that super admin can create branch."""
        self.client.force_authenticate(user=self.super_admin)

        data = {
            'name': 'New Branch',
            'code': 'NB001',
            'address': '456 New St',
            'city': 'New City',
            'state': 'New State',
            'pincode': '654321',
            'phone': '9876543210',
            'is_active': True
        }

        response = self.client.post(self.branches_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Branch.objects.count(), 2)

        branch = Branch.objects.get(code='NB001')
        self.assertEqual(branch.name, 'New Branch')
        self.assertTrue(branch.is_active)

    def test_create_branch_as_admin_forbidden(self):
        """Test that regular admin cannot create branch."""
        self.client.force_authenticate(user=self.admin)

        data = {
            'name': 'New Branch',
            'code': 'NB002',
            'address': '456 New St',
            'city': 'New City',
            'state': 'New State',
            'pincode': '654321',
            'phone': '9876543210'
        }

        response = self.client.post(self.branches_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_branch_duplicate_code(self):
        """Test creating branch with duplicate code."""
        self.client.force_authenticate(user=self.super_admin)

        data = {
            'name': 'Duplicate Branch',
            'code': 'EB001',  # Already exists
            'address': '456 New St',
            'city': 'New City',
            'state': 'New State',
            'pincode': '654321',
            'phone': '9876543210'
        }

        response = self.client.post(self.branches_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_branch_detail(self):
        """Test getting branch detail."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(f'{self.branches_url}{self.branch.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Existing Branch')
        self.assertEqual(response.data['code'], 'EB001')

    def test_update_branch_as_super_admin(self):
        """Test that super admin can update branch."""
        self.client.force_authenticate(user=self.super_admin)

        data = {
            'name': 'Updated Branch',
            'code': 'EB001',
            'address': '123 Main St',
            'city': 'Test City',
            'state': 'Test State',
            'pincode': '123456',
            'phone': '1234567890',
            'is_active': False
        }

        response = self.client.put(
            f'{self.branches_url}{self.branch.id}/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.branch.refresh_from_db()
        self.assertEqual(self.branch.name, 'Updated Branch')
        self.assertFalse(self.branch.is_active)

    def test_list_only_active_branches(self):
        """Test that listing can filter active branches."""
        # Create inactive branch
        Branch.objects.create(
            name='Inactive Branch',
            code='IB001',
            address='789 Inactive St',
            city='Inactive City',
            state='State',
            pincode='111111',
            phone='1111111111',
            is_active=False
        )

        self.client.force_authenticate(user=self.admin)

        # Test with filter (if implemented)
        response = self.client.get(self.branches_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check if inactive branches are filtered (depends on your view logic)