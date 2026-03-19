# Multi-Tenancy Company Filtering Pattern

## Overview

This document outlines the **standard pattern** for implementing company-level filtering in Django REST Framework ViewSets to ensure proper multi-tenancy support.

## The Problem

In a multi-tenant system with the following hierarchy:

- **Superuser** → Can see all data
- **Company Admin** → Should see data from ALL branches in their company
- **Branch Admin / Staff** → Should see data only from their branch

Without proper filtering, `company_admin` users might only see data from a single branch instead of all branches in their company.

## The Standard Pattern

### For ViewSet.get_queryset()

```python
def get_queryset(self):
    queryset = super().get_queryset()
    user = self.request.user
    
    # Branch/Company filtering - consistent with multi-branch system
    if not user.is_superuser:
        if user.role == 'company_admin' and user.company:
            # Company admin sees ALL branches in their company
            queryset = queryset.filter(branch__company=user.company)
        elif user.role == 'branch_admin' and user.branch:
            # Branch admin sees their branch + null branches
            queryset = queryset.filter(Q(branch=user.branch) | Q(branch__isnull=True))
        elif hasattr(user, 'branch') and user.branch:
            # Regular staff sees only their branch
            queryset = queryset.filter(branch=user.branch)
    
    # Additional filters...
    return queryset
```

### For Direct Model Queries in Action Methods

When querying models directly (not using `self.get_queryset()`), apply the same pattern:

```python
@action(detail=False, methods=['get'])
def some_report(self, request):
    # Build filter
    data_filter = Q(status='active')
    
    # Apply branch/company filter
    if request.user.is_superuser:
        branch_id = request.query_params.get('branch')
        if branch_id:
            if ',' in str(branch_id):
                data_filter &= Q(branch_id__in=branch_id.split(','))
            else:
                data_filter &= Q(branch_id=branch_id)
    else:
        # Company admin sees all branches in their company
        if request.user.role == 'company_admin' and request.user.company:
            data_filter &= Q(branch__company=request.user.company)
        # Other users see only their branch
        elif hasattr(request.user, 'branch') and request.user.branch:
            data_filter &= (Q(branch=request.user.branch) | Q(branch__isnull=True))
    
    queryset = SomeModel.objects.filter(data_filter)
    # ... rest of logic
```

### For Models with Company Field (No Branch)

Some models like `Vendor` are directly linked to `company`, not `branch`:

```python
def get_queryset(self):
    queryset = super().get_queryset()
    user = self.request.user
    
    # Company filtering - vendors are company-specific
    if not user.is_superuser:
        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(company=user.company)
        elif hasattr(user, 'branch') and user.branch and user.branch.company:
            queryset = queryset.filter(company=user.branch.company)
    
    return queryset
```

### For Related Models (e.g., Employee via Branch)

When filtering through relationships:

```python
# For Payroll (employee__branch)
if request.user.role == 'company_admin' and request.user.company:
    salaries_filter &= Q(employee__branch__company=request.user.company)
elif request.user.branch_id:
    salaries_filter &= Q(employee__branch_id=request.user.branch_id)
```

## Fixed Locations in accounting/views.py

### ✅ Fixed ViewSets

1. **VendorViewSet.get_queryset()** (lines 40-56)
   - Added company filtering for vendors

2. **ExpenseViewSet.get_queryset()** (lines 80-126)
   - Already had proper company filtering ✓

3. **TransactionViewSet.get_queryset()** (lines 180-221)
   - Already had proper company filtering ✓

### ✅ Fixed Action Methods

1. **TransactionViewSet.summary()** - Fixed 3 locations:
   - Receivables filter (lines 254-267)
   - Payables filter (lines 289-302)
   - Pending salaries filter (lines 321-334)

2. **TransactionViewSet.profit_loss_statement()** - Fixed 2 locations:
   - Current period expenses (lines 451-467)
   - Previous period expenses (lines 545-552)

3. **TransactionViewSet.cash_flow_report()** - Fixed 2 locations:
   - Investing expenses (lines 614-621)
   - Opening balance data (lines 637-644)

4. **TransactionViewSet.tax_summary()** - Fixed 2 locations:
   - Invoices (lines 697-708)
   - Expenses (lines 718-725)

## Checklist for New ViewSets/Actions

When creating new ViewSets or action methods, ensure:

- [ ] `get_queryset()` has company filtering
- [ ] Direct model queries in `@action` methods have company filtering
- [ ] Aggregations and reports respect company boundaries
- [ ] Superuser can optionally filter by branch via query params
- [ ] Company admin sees ALL branches in their company
- [ ] Branch admin/staff see only their branch

## Common Mistakes to Avoid

❌ **Wrong**: Only checking for branch

```python
if hasattr(request.user, 'branch') and request.user.branch:
    queryset = queryset.filter(branch=request.user.branch)
```

✅ **Correct**: Check for company_admin first

```python
if request.user.role == 'company_admin' and request.user.company:
    queryset = queryset.filter(branch__company=request.user.company)
elif hasattr(request.user, 'branch') and request.user.branch:
    queryset = queryset.filter(branch=request.user.branch)
```

## Testing

To verify company filtering works:

1. Login as `company_admin`
2. Create data in multiple branches of the same company
3. Verify all data from all branches is visible
4. Verify data from other companies is NOT visible

## Related Files

- `accounting/views.py` - All ViewSets and action methods
- `companies/managers.py` - CompanyManager for automatic filtering
- `users/models.py` - User model with role and company fields
