# Backend Testing Guide

This guide explains how to test the Car Service Management System backend using Django's testing framework.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Testing Flow](#testing-flow)
3. [Running Tests](#running-tests)
4. [Test Structure](#test-structure)
5. [Testing Each App](#testing-each-app)
6. [Best Practices](#best-practices)

---

## Testing Overview

### What We Test

- **Models**: Data validation, relationships, custom methods
- **Views/API Endpoints**: Request/response handling, authentication, permissions
- **Serializers**: Data validation, transformation
- **Business Logic**: Custom methods, calculations, workflows

### Testing Tools

- **Django TestCase**: Base test class for database-backed tests
- **APIClient**: For testing REST API endpoints
- **Factory Pattern**: Creating test data (optional, can use direct model creation)

---

## Testing Flow

### 1. **Test Planning Phase**
   - Identify what to test in each app
   - List all endpoints, models, and business logic
   - Determine test scenarios (happy path, edge cases, error cases)

### 2. **Test Setup Phase**
   - Create test database (Django handles this automatically)
   - Set up test fixtures (users, branches, etc.)
   - Configure test settings if needed

### 3. **Test Execution Phase**
   - Run tests for one app at a time
   - Verify test results
   - Fix any failures

### 4. **Test Maintenance Phase**
   - Update tests when code changes
   - Add tests for new features
   - Refactor tests for better coverage

---

## Running Tests

### Run All Tests
```bash
python manage.py test
```

### Run Tests for a Specific App
```bash
# Test users app
python manage.py test users

# Test bookings app
python manage.py test bookings

# Test customers app
python manage.py test customers
```

### Run a Specific Test Class
```bash
# Test specific test case
python manage.py test users.tests.UserRegistrationTestCase

# Test specific test method
python manage.py test users.tests.UserRegistrationTestCase.test_user_registration_success
```

### Run Tests with Verbose Output
```bash
python manage.py test --verbosity=2
```

### Run Tests and Show Coverage (if using coverage.py)
```bash
# Install coverage first: pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html  # Generates HTML report
```

---

## Test Structure

### Basic Test File Structure

Each `tests.py` file should follow this structure:

```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import YourModel

User = get_user_model()

class YourModelTestCase(TestCase):
    """Test cases for YourModel."""
    
    def setUp(self):
        """Set up test data before each test."""
        self.client = APIClient()
        # Create test users, branches, etc.
    
    def test_model_creation(self):
        """Test model creation."""
        # Your test code
    
    def test_model_method(self):
        """Test custom model method."""
        # Your test code


class YourAPIViewTestCase(TestCase):
    """Test cases for API views."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        # Create test data
    
    def test_api_endpoint_success(self):
        """Test successful API call."""
        # Your test code
    
    def test_api_endpoint_authentication(self):
        """Test API requires authentication."""
        # Your test code
```

---

## Testing Each App

### Testing Order (Recommended)

Test apps in this order due to dependencies:

1. **branches** - No dependencies
2. **users** - Depends on branches
3. **customers** - Depends on users
4. **services** - Depends on branches
5. **bookings** - Depends on customers, services, branches
6. **jobcards** - Depends on bookings
7. **pickup** - Depends on bookings
8. **payments** - Depends on bookings
9. **store** - Standalone
10. **feedback** - Depends on bookings
11. **billing** - Depends on bookings
12. **analytics** - Depends on multiple apps
13. **notify** - Depends on multiple apps

### 1. Testing `users` App

**What to Test:**
- User registration
- User login (JWT tokens)
- User profile retrieval/update
- Password change
- OTP sending/verification
- User list (with permissions)
- User deletion (soft delete)
- Role-based access

**Key Endpoints:**
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `GET /api/auth/me/`
- `POST /api/auth/send-otp/`
- `POST /api/auth/verify-otp/`
- `GET /api/users/` (staff only)
- `PUT /api/users/{id}/` (staff only)

### 2. Testing `customers` App

**What to Test:**
- Customer profile creation
- Customer profile retrieval/update
- Vehicle creation
- Vehicle listing
- Reward points addition/redeeming
- Membership tier updates

**Key Endpoints:**
- `GET /api/customers/me/`
- `PUT /api/customers/me/`
- `GET /api/customers/vehicles/`
- `POST /api/customers/vehicles/`

### 3. Testing `services` App

**What to Test:**
- Service package creation (admin)
- Service package listing
- Add-on creation
- Branch-specific vs global services
- Service activation/deactivation

**Key Endpoints:**
- `GET /api/services/packages/`
- `POST /api/services/packages/` (admin)
- `GET /api/services/addons/`
- `POST /api/services/addons/` (admin)

### 4. Testing `bookings` App

**What to Test:**
- Booking creation (customer)
- Admin walk-in booking creation
- Booking listing (filtered by user)
- Booking cancellation
- Booking status updates
- Price calculation (package + addons)

**Key Endpoints:**
- `POST /api/bookings/`
- `POST /api/bookings/admin_create/` (admin)
- `GET /api/bookings/`
- `GET /api/bookings/{id}/`
- `PUT /api/bookings/{id}/cancel/`

### 5. Testing `jobcards` App

**What to Test:**
- Job card creation from booking
- Job card status updates
- Technician assignment
- Photo upload
- Parts tracking
- Job completion

**Key Endpoints:**
- `GET /api/jobcards/`
- `POST /api/jobcards/` (admin)
- `PUT /api/jobcards/{id}/start/`
- `PUT /api/jobcards/{id}/update-status/`
- `POST /api/jobcards/{id}/add-photo/`

### 6. Testing `pickup` App

**What to Test:**
- Pickup request creation
- Driver assignment
- Status updates
- Location tracking

**Key Endpoints:**
- `POST /api/pickup/`
- `GET /api/pickup/`
- `PUT /api/pickup/{id}/assign-driver/`
- `PUT /api/pickup/{id}/update-status/`

### 7. Testing `payments` App

**What to Test:**
- Payment initiation
- Payment verification
- Payment history
- Stripe integration (mocked)
- Coupon code application

**Key Endpoints:**
- `POST /api/payments/initiate/`
- `POST /api/payments/verify/`
- `GET /api/payments/history/`

### 8. Testing `store` App

**What to Test:**
- Product listing
- Product creation (admin)
- Order creation
- Order listing
- Order status updates

**Key Endpoints:**
- `GET /api/store/products/`
- `POST /api/store/products/` (admin)
- `POST /api/store/orders/`
- `GET /api/store/orders/`

### 9. Testing `feedback` App

**What to Test:**
- Feedback submission
- Feedback listing
- Rating validation
- Feedback summary

**Key Endpoints:**
- `POST /api/feedback/`
- `GET /api/feedback/`
- `GET /api/feedback/summary/`

### 10. Testing `billing` App

**What to Test:**
- Invoice generation
- Invoice listing
- Payment status tracking

**Key Endpoints:**
- `GET /api/billing/invoices/`
- `GET /api/billing/invoices/{id}/`

### 11. Testing `analytics` App

**What to Test:**
- Dashboard data (admin only)
- Revenue analytics
- Top services
- Peak hours

**Key Endpoints:**
- `GET /api/analytics/dashboard/` (admin)
- `GET /api/analytics/revenue/` (admin)
- `GET /api/analytics/top-services/` (admin)

### 12. Testing `branches` App

**What to Test:**
- Branch creation (super admin)
- Branch listing
- Branch update
- Branch filtering

**Key Endpoints:**
- `GET /api/branches/`
- `POST /api/branches/` (super admin)
- `PUT /api/branches/{id}/` (super admin)

### 13. Testing `notify` App

**What to Test:**
- Notification creation
- Notification listing
- Notification marking as read

**Key Endpoints:**
- `GET /api/notify/`
- `PUT /api/notify/{id}/mark-read/`

---

## Best Practices

### 1. **Use setUp() for Common Test Data**
```python
def setUp(self):
    """Create test data used by multiple tests."""
    self.client = APIClient()
    self.branch = Branch.objects.create(...)
    self.user = User.objects.create_user(...)
```

### 2. **Test One Thing Per Test Method**
```python
# Good
def test_user_registration_success(self):
    """Test successful user registration."""
    # Test only registration success

def test_user_registration_invalid_email(self):
    """Test registration with invalid email."""
    # Test only email validation
```

### 3. **Use Descriptive Test Names**
```python
# Good
def test_admin_can_create_booking_for_walk_in_customer(self):
    pass

# Bad
def test_booking(self):
    pass
```

### 4. **Test Both Success and Failure Cases**
```python
def test_api_success(self):
    """Test successful API call."""
    # Test 200/201 response

def test_api_authentication_required(self):
    """Test API requires authentication."""
    # Test 401 response

def test_api_permission_denied(self):
    """Test API requires proper permissions."""
    # Test 403 response
```

### 5. **Use Assertions Properly**
```python
# Check status code
self.assertEqual(response.status_code, status.HTTP_201_CREATED)

# Check response data
self.assertIn('id', response.data)
self.assertEqual(response.data['name'], 'Test Name')

# Check database state
self.assertEqual(Model.objects.count(), 1)
```

### 6. **Mock External Services**
```python
from unittest.mock import patch, MagicMock

@patch('payments.views.stripe.PaymentIntent.create')
def test_payment_initiation(self, mock_stripe):
    """Test payment initiation with mocked Stripe."""
    mock_stripe.return_value = MagicMock(id='pi_test')
    # Your test code
```

### 7. **Clean Up After Tests**
Django's TestCase automatically:
- Creates a test database
- Rolls back transactions after each test
- Cleans up test data

### 8. **Test Authentication and Permissions**
```python
def test_unauthenticated_access_denied(self):
    """Test that unauthenticated users cannot access."""
    response = self.client.get('/api/bookings/')
    self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

def test_customer_cannot_access_admin_endpoint(self):
    """Test that customers cannot access admin endpoints."""
    self.client.force_authenticate(user=self.customer_user)
    response = self.client.post('/api/bookings/admin_create/', data)
    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

### 9. **Test Branch Filtering**
```python
def test_admin_sees_only_their_branch_data(self):
    """Test that admin users only see their branch data."""
    # Create data for different branches
    # Verify admin only sees their branch data
```

### 10. **Use Test Fixtures for Complex Data**
For complex test data, consider using Django fixtures or factories:
```python
# In setUp()
self.branch = Branch.objects.create(
    name="Test Branch",
    code="TB001",
    # ... other fields
)
```

---

## Common Test Patterns

### Pattern 1: Model Testing
```python
def test_model_creation(self):
    """Test that model can be created."""
    obj = Model.objects.create(field1='value1', field2='value2')
    self.assertIsNotNone(obj.id)
    self.assertEqual(obj.field1, 'value1')

def test_model_method(self):
    """Test custom model method."""
    obj = Model.objects.create(...)
    result = obj.custom_method()
    self.assertEqual(result, expected_value)
```

### Pattern 2: API GET Testing
```python
def test_list_endpoint(self):
    """Test list endpoint."""
    self.client.force_authenticate(user=self.user)
    response = self.client.get('/api/resource/')
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertIsInstance(response.data, list)

def test_detail_endpoint(self):
    """Test detail endpoint."""
    self.client.force_authenticate(user=self.user)
    response = self.client.get(f'/api/resource/{self.obj.id}/')
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(response.data['id'], self.obj.id)
```

### Pattern 3: API POST Testing
```python
def test_create_endpoint_success(self):
    """Test successful creation."""
    self.client.force_authenticate(user=self.user)
    data = {'field1': 'value1', 'field2': 'value2'}
    response = self.client.post('/api/resource/', data, format='json')
    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertEqual(Model.objects.count(), 1)

def test_create_endpoint_validation_error(self):
    """Test creation with invalid data."""
    self.client.force_authenticate(user=self.user)
    data = {'field1': ''}  # Invalid data
    response = self.client.post('/api/resource/', data, format='json')
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

### Pattern 4: API PUT/PATCH Testing
```python
def test_update_endpoint(self):
    """Test update endpoint."""
    self.client.force_authenticate(user=self.user)
    data = {'field1': 'updated_value'}
    response = self.client.put(f'/api/resource/{self.obj.id}/', data, format='json')
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.obj.refresh_from_db()
    self.assertEqual(self.obj.field1, 'updated_value')
```

### Pattern 5: Authentication Testing
```python
def test_authentication_required(self):
    """Test that endpoint requires authentication."""
    response = self.client.get('/api/resource/')
    self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

def test_permission_required(self):
    """Test that endpoint requires specific permissions."""
    self.client.force_authenticate(user=self.customer_user)
    response = self.client.post('/api/admin/resource/', data)
    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

---

## Test Execution Workflow

### Step-by-Step Testing Process

1. **Start with One App**
   ```bash
   python manage.py test users --verbosity=2
   ```

2. **Review Test Results**
   - Check for failures
   - Review error messages
   - Fix any issues

3. **Move to Next App**
   ```bash
   python manage.py test customers --verbosity=2
   ```

4. **Run All Tests Periodically**
   ```bash
   python manage.py test
   ```

5. **Fix Any Failures**
   - Update test code if business logic changed
   - Update application code if tests reveal bugs

---

## Troubleshooting

### Common Issues

1. **Database Lock Errors**
   - Ensure no other Django processes are running
   - Use `python stop_django_processes.py` if needed

2. **Import Errors**
   - Check that all apps are in `INSTALLED_APPS`
   - Verify imports in test files

3. **Authentication Errors**
   - Ensure `AUTH_USER_MODEL` is set correctly
   - Check that test users are created properly

4. **Permission Errors**
   - Verify user roles are set correctly
   - Check permission classes in views

---

## Next Steps

1. Review the example test files in each app
2. Start testing apps one by one in the recommended order
3. Add more test cases as you discover edge cases
4. Aim for high test coverage (80%+ is good)

---

## Additional Resources

- [Django Testing Documentation](https://docs.djangoproject.com/en/stable/topics/testing/)
- [DRF Testing Documentation](https://www.django-rest-framework.org/api-guide/testing/)
- [Python unittest Documentation](https://docs.python.org/3/library/unittest.html)

