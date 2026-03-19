# Performance Optimization Checklist for Other Endpoints

## ✅ Completed
- [x] **Bookings API** (`/api/bookings/`) - Optimized with select_related/prefetch_related

## 🔍 Recommended for Review

### High Priority (Likely N+1 Issues)

#### 1. JobCards API (`/api/jobcards/`)
**File**: `Backend/jobcards/views.py`
**Reason**: JobCards have many relationships similar to Bookings
**Expected relationships to prefetch**:
- `booking` (ForeignKey)
- `booking__customer`, `booking__vehicle`, `booking__package`
- `floor_manager`, `assigned_applicator` (ForeignKey to User)
- `tasks` (reverse ForeignKey)
- `qc_checks` (reverse ForeignKey)

**Estimated Impact**: High - JobCards are central to the workflow

#### 2. Appointments API (`/api/appointments/`)
**File**: `Backend/appointments/views.py`
**Reason**: Appointments likely have customer, vehicle, and service relationships
**Expected relationships to prefetch**:
- `customer`, `customer__user`
- `vehicle`, `vehicle__brand`, `vehicle__model`
- `service_package`
- `branch`

**Estimated Impact**: Medium-High - Used in booking flow

#### 3. Customers API (`/api/customers/`)
**File**: `Backend/customers/views.py`
**Reason**: Customers have vehicles, memberships, and bookings
**Expected relationships to prefetch**:
- `user`
- `vehicles` (reverse ForeignKey)
- `memberships`, `memberships__plan`
- `bookings` (if included in list view)

**Estimated Impact**: Medium - Frequently accessed

### Medium Priority

#### 4. Pickup Requests API (`/api/pickup/`)
**File**: `Backend/pickup/views.py`
**Expected relationships**:
- `booking`, `booking__customer`, `booking__vehicle`
- `assigned_driver`
- `branch`

#### 5. Billing API (`/api/billing/`)
**File**: `Backend/billing/views.py`
**Expected relationships**:
- `booking`, `booking__customer`, `booking__package`
- `jobcard`
- `branch`

#### 6. Feedback API (`/api/feedback/`)
**File**: `Backend/feedback/views.py`
**Expected relationships**:
- `booking`, `booking__customer`
- `jobcard`

### Low Priority (Simple Models)

#### 7. Branches API (`/api/branches/`)
- Likely already optimized (simple model)

#### 8. Services API (`/api/services/`)
- Check if categories are prefetched

#### 9. Users API (`/api/users/`)
- Check if branch is prefetched

## 🛠️ How to Optimize Each Endpoint

### Step 1: Identify Relationships
Look at the model and serializer to find:
- ForeignKey fields → use `select_related()`
- ManyToMany fields → use `prefetch_related()`
- Reverse ForeignKey (related_name) → use `prefetch_related()`

### Step 2: Update get_queryset()
```python
def get_queryset(self):
    queryset = MyModel.objects.select_related(
        'foreign_key_field1',
        'foreign_key_field2__nested_field',
    ).prefetch_related(
        'many_to_many_field',
        'reverse_foreign_key_field',
    )
    # ... rest of filtering logic
    return queryset
```

### Step 3: Test Performance
```python
from django.test.utils import override_settings
from django.db import connection

@override_settings(DEBUG=True)
def test_api():
    response = client.get('/api/endpoint/')
    print(f"Queries: {len(connection.queries)}")
```

### Step 4: Add Database Indexes
For frequently filtered fields:
```python
class MyModel(models.Model):
    status = models.CharField(..., db_index=True)
    created_at = models.DateTimeField(db_index=True)
```

## 📊 Performance Targets

| Endpoint | Target Queries | Target Response Time |
|----------|---------------|---------------------|
| List (10 items) | <10 queries | <200ms |
| List (50 items) | <15 queries | <500ms |
| Detail | <5 queries | <100ms |

## 🧪 Testing Script Template

```python
# test_<app>_performance.py
from django.test.utils import override_settings
from django.db import connection, reset_queries
from rest_framework.test import APIClient

@override_settings(DEBUG=True)
def test_performance():
    client = APIClient()
    # Authenticate...
    
    reset_queries()
    response = client.get('/api/<endpoint>/?page=1&page_size=10')
    
    print(f"Status: {response.status_code}")
    print(f"Queries: {len(connection.queries)}")
    print(f"Items: {len(response.data.get('results', []))}")
    
    for i, q in enumerate(connection.queries, 1):
        print(f"{i}. {q['sql'][:100]}...")
```

## 📝 Common Patterns

### Pattern 1: Booking-Related Endpoints
```python
queryset = Model.objects.select_related(
    'booking',
    'booking__customer',
    'booking__customer__user',
    'booking__vehicle',
    'booking__vehicle__brand',
    'booking__package',
    'booking__branch',
)
```

### Pattern 2: Customer-Related Endpoints
```python
queryset = Model.objects.select_related(
    'customer',
    'customer__user',
).prefetch_related(
    'customer__vehicles',
    'customer__memberships',
)
```

### Pattern 3: User-Related Endpoints
```python
queryset = Model.objects.select_related(
    'user',
    'user__branch',
).prefetch_related(
    'user__permissions',
)
```

## 🎯 Next Actions

1. **Immediate**: Review JobCards and Appointments APIs (highest traffic)
2. **This Week**: Optimize Customers and Pickup APIs
3. **This Month**: Review all remaining endpoints
4. **Ongoing**: Monitor query counts in production

## 📚 Resources

- [Django Query Optimization Guide](https://docs.djangoproject.com/en/stable/topics/db/optimization/)
- [select_related Documentation](https://docs.djangoproject.com/en/stable/ref/models/querysets/#select-related)
- [prefetch_related Documentation](https://docs.djangoproject.com/en/stable/ref/models/querysets/#prefetch-related)
- [Django Debug Toolbar](https://django-debug-toolbar.readthedocs.io/) - Essential for finding N+1 queries

---

**Note**: This checklist is based on the successful optimization of the Bookings API, which reduced response time from 15 seconds to <500ms by eliminating N+1 queries.
