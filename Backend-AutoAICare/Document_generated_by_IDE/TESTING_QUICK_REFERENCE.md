# Testing Quick Reference

This is a quick reference guide for running tests on each app in the Car Service Management System backend.

## Quick Commands

### Run All Tests
```bash
python manage.py test
```

### Run Tests for Specific App
```bash
# Users app
python manage.py test users

# Customers app
python manage.py test customers

# Services app
python manage.py test services

# Bookings app
python manage.py test bookings

# Jobcards app
python manage.py test jobcards

# Pickup app
python manage.py test pickup

# Payments app
python manage.py test payments

# Store app
python manage.py test store

# Feedback app
python manage.py test feedback

# Billing app
python manage.py test billing

# Analytics app
python manage.py test analytics

# Branches app
python manage.py test branches

# Notify app
python manage.py test notify
```

### Run Specific Test Class
```bash
python manage.py test users.tests.UserRegistrationTestCase
```

### Run Specific Test Method
```bash
python manage.py test users.tests.UserRegistrationTestCase.test_user_registration_success
```

### Run with Verbose Output
```bash
python manage.py test users --verbosity=2
```

## Testing Order (Recommended)

Test apps in this order due to dependencies:

1. ✅ **branches** - No dependencies
2. ✅ **users** - Depends on branches
3. ✅ **customers** - Depends on users
4. ✅ **services** - Depends on branches
5. ⏳ **bookings** - Depends on customers, services, branches
6. ⏳ **jobcards** - Depends on bookings
7. ⏳ **pickup** - Depends on bookings
8. ⏳ **payments** - Depends on bookings
9. ⏳ **store** - Standalone
10. ⏳ **feedback** - Depends on bookings
11. ⏳ **billing** - Depends on bookings
12. ⏳ **analytics** - Depends on multiple apps
13. ⏳ **notify** - Depends on multiple apps

## Test File Locations

All test files are located in each app's directory:
- `users/tests.py`
- `customers/tests.py`
- `services/tests.py`
- `bookings/tests.py`
- `jobcards/tests.py`
- `pickup/tests.py`
- `payments/tests.py`
- `store/tests.py`
- `feedback/tests.py`
- `billing/tests.py`
- `analytics/tests.py`
- `branches/tests.py`
- `notify/tests.py`

## What Each App Tests

### ✅ users
- User registration
- User authentication (JWT)
- User profile management
- Password management
- OTP verification
- User listing (staff only)
- Staff creation

### ✅ customers
- Customer profile management
- Vehicle CRUD operations
- Reward points system
- Membership tiers

### ✅ services
- Service package creation/listing
- Add-on creation/listing
- Branch-specific vs global services
- Service activation/deactivation

### ✅ branches
- Branch creation (super admin)
- Branch listing
- Branch update
- Branch filtering

### ⏳ bookings
- Booking creation (customer & admin)
- Booking listing
- Booking cancellation
- Price calculation

### ⏳ jobcards
- Job card creation
- Status updates
- Technician assignment
- Photo upload
- Parts tracking

### ⏳ pickup
- Pickup request creation
- Driver assignment
- Status updates

### ⏳ payments
- Payment initiation
- Payment verification
- Payment history
- Stripe integration (mocked)

### ⏳ store
- Product listing/creation
- Order creation
- Order management

### ⏳ feedback
- Feedback submission
- Feedback listing
- Rating validation

### ⏳ billing
- Invoice generation
- Invoice listing

### ⏳ analytics
- Dashboard data (admin)
- Revenue analytics
- Top services

### ⏳ notify
- Notification creation
- Notification listing
- Mark as read

## Common Test Patterns

### Pattern 1: Test Authentication Required
```python
def test_endpoint_requires_authentication(self):
    response = self.client.get('/api/endpoint/')
    self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

### Pattern 2: Test Permission Required
```python
def test_endpoint_requires_permission(self):
    self.client.force_authenticate(user=self.customer)
    response = self.client.post('/api/admin/endpoint/', data)
    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

### Pattern 3: Test Successful Creation
```python
def test_create_success(self):
    self.client.force_authenticate(user=self.user)
    data = {'field': 'value'}
    response = self.client.post('/api/resource/', data, format='json')
    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertEqual(Model.objects.count(), 1)
```

### Pattern 4: Test Validation Error
```python
def test_create_validation_error(self):
    self.client.force_authenticate(user=self.user)
    data = {'field': ''}  # Invalid
    response = self.client.post('/api/resource/', data, format='json')
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

## Troubleshooting

### Issue: Database locked
**Solution:** Stop all Django processes
```bash
python stop_django_processes.py
```

### Issue: Import errors
**Solution:** Check that all apps are in `INSTALLED_APPS` in `settings.py`

### Issue: Authentication errors
**Solution:** Ensure `AUTH_USER_MODEL = 'users.User'` in settings

### Issue: Permission errors
**Solution:** Check user roles and permission classes in views

## Next Steps

1. Review example test files in `users/tests.py`, `customers/tests.py`, etc.
2. Run tests for each app one by one
3. Add more test cases as needed
4. Aim for 80%+ test coverage

## Additional Resources

- Full testing guide: `TESTING_GUIDE.md`
- Django testing docs: https://docs.djangoproject.com/en/stable/topics/testing/
- DRF testing docs: https://www.django-rest-framework.org/api-guide/testing/

