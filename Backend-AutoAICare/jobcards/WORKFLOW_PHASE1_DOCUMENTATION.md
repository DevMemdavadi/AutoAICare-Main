# Workflow System - Phase 1 Implementation

## Summary of Changes

We've successfully implemented Phase 1: Diagnosis & Quick Fixes for the workflow system. The workflow system now has **extensive logging**, **diagnostic endpoints**, and **bulk permission management utilities** to help debug and fix permission issues.

## Multi-Tenancy Support

✅ **The workflow system already supports multi-tenancy** via `CompanyManager`. All workflow templates, transitions, and permissions are scoped to companies automatically.

- `WorkflowTemplate`, `WorkflowStatus`, `WorkflowTransition`, and `RolePermission` all have `company` foreign keys
- They all use `CompanyManager()` which filters by the current company context
- When creating workflows, the company is automatically set from the user's company

## New Features Implemented

### 1. Enhanced Logging in `get_allowed_transitions()` ✅

**Location**: `jobcards/workflow_config.py` - `WorkflowEngine.get_allowed_transitions()`

**What it does**:

- Tracks every step of the transition resolution process
- Logs when template is not found
- Logs when no transitions exist for current status
- Logs when transitions exist but user doesn't have permission
- Logs detailed rejection reasons for each transition

**Debug Mode**:

```python
# Normal usage
transitions = WorkflowEngine.get_allowed_transitions(jobcard, user)

# Debug mode - returns detailed diagnostic dict instead of transitions
diagnostic_info = WorkflowEngine.get_allowed_transitions(jobcard, user, debug=True)
```

### 2. Workflow Diagnostic Endpoint ✅

**Endpoint**: `GET /api/jobcards/{id}/workflow/diagnostic/`

**Access**: Admin users only (super_admin, company_admin, branch_admin)

**Response Structure**:

```json
{
  "jobcard_id": 123,
  "jobcard_status": "billed",
  "user_id": 45,
  "user_role": "branch_admin",
  "user_branch_id": 2,
  "user_company_id": 1,
  "template_found": true,
  "template_id": 1,
  "template_name": "Simplified Flow",
  "transitions_from_status": 3,
  "active_transitions": 3,
  "allowed_transitions": 2,
  "rejected_transitions": [
    {
      "id": 234,
      "action_name": "Close Job",
      "to_status": "closed",
      "allowed_roles": ["super_admin", "company_admin"],
      "requires_assignment": false,
      "rejection_reason": "Role 'branch_admin' is not allowed for this action"
    }
  ],
  "allowed_transition_details": [
    {
      "id": 232,
      "action_name": "Payment Received",
      "to_status": "ready_for_delivery",
      "allowed_roles": ["super_admin", "company_admin", "branch_admin", "floor_manager"],
      "requires_assignment": false
    },
    {
      "id": 233,
      "action_name": "Deliver Vehicle",
      "to_status": "delivered",
      "allowed_roles": ["super_admin", "company_admin", "branch_admin", "floor_manager"],
      "requires_assignment": false
    }
  ]
}
```

**Use Cases**:

- Debug why a specific user doesn't see expected workflow actions
- Understand which transitions are available vs rejected
- Identify permission configuration issues
- Verify workflow template is being applied correctly

### 3. Bulk Permission Update Utilities ✅

**New Methods in `WorkflowEngine` class**:

#### a) `bulk_update_transition_permissions()`

Bulk add/remove a role from transitions matching specific criteria.

```python
from jobcards.workflow_config import WorkflowEngine

# Add branch_admin to all billing-related transitions
result = WorkflowEngine.bulk_update_transition_permissions(
    role='branch_admin',
    action='add',
    transition_filter={'action_name__icontains': 'billing'},
    company=user.company
)
```

#### b) `sync_role_across_workflow_types()`

Sync a role across ALL workflow templates for specific transition types.

```python
# Add branch_admin to all delivery transitions across all templates
result = WorkflowEngine.sync_role_across_workflow_types(
    role='branch_admin',
    action='add',
    transition_pattern='deliver',
    company=user.company
)
```

### 4. Bulk Permission API Endpoints ✅

#### a) Bulk Update Permissions

**Endpoint**: `POST /api/workflow/transitions/bulk-update-permissions/`

**Access**: Admin users only

**Request Body**:

```json
{
  "role": "branch_admin",
  "action": "add",
  "template_id": 1,
  "transition_pattern": "billing",
  "transition_ids": [1, 2, 3]
}
```

**Response**:

```json
{
  "message": "Bulk permission update completed",
  "result": {
    "total_checked": 10,
    "updated": 7,
    "skipped": 3,
    "errors": 0,
    "action": "add",
    "role": "branch_admin"
  }
}
```

**Parameters**:

- `role` (required): Role to add/remove (e.g., 'branch_admin', 'floor_manager')
- `action` (required): 'add' or 'remove'
- `template_id` (optional): Limit to specific template
- `transition_pattern` (optional): Keywords to match in action names
- `transition_ids` (optional): Specific transition IDs to update

#### b) Sync Role Across Templates

**Endpoint**: `POST /api/workflow/transitions/sync-role/`

**Access**: Admin users only

**Request Body**:

```json
{
  "role": "branch_admin",
  "action": "add",
  "transition_pattern": "billing"
}
```

**Response**:

```json
{
  "message": "Role sync completed across 3 templates",
  "result": {
    "templates_processed": 3,
    "total_updated": 21,
    "total_skipped": 9,
    "total_errors": 0,
    "details_by_template": [
      {
        "template_id": 1,
        "template_name": "Simplified Flow",
        "total_checked": 10,
        "updated": 7,
        "skipped": 3,
        "errors": 0,
        "action": "add",
        "role": "branch_admin"
      }
    ]
  }
}
```

## Common Use Cases

### Use Case 1: Debug Why User Can't See Workflow Actions

**Problem**: A branch_admin reports they can't see the "Payment Received" button.

**Solution**:

```bash
# Call diagnostic endpoint
GET /api/jobcards/123/workflow/diagnostic/

# Check the response:
# - Is template_found = true?
# - Are there transitions in "rejected_transitions"?
# - What's the rejection_reason?
```

### Use Case 2: Add Branch Admin to All Billing Transitions

**Problem**: Branch admins need permission to handle all billing-related actions.

**Solution**:

```bash
POST /api/workflow/transitions/bulk-update-permissions/
{
  "role": "branch_admin",
  "action": "add",
  "transition_pattern": "billing"
}
```

### Use Case 3: Add Branch Admin to Delivery Actions Across All Templates

**Problem**: Multiple workflow templates exist, and branch_admin needs delivery permissions in all of them.

**Solution**:

```bash
POST /api/workflow/transitions/sync-role/
{
  "role": "branch_admin",
  "action": "add",
  "transition_pattern": "deliver"
}
```

### Use Case 4: Remove Floor Manager from Specific Transitions

**Problem**: Floor managers shouldn't be able to close jobs.

**Solution**:

```bash
POST /api/workflow/transitions/bulk-update-permissions/
{
  "role": "floor_manager",
  "action": "remove",
  "transition_pattern": "close"
}
```

## Testing Your Changes

### Test 1: Verify Diagnostic Endpoint Works

```bash
# Get a job card ID
job_card_id=123

# Call diagnostic endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/jobcards/$job_card_id/workflow/diagnostic/
```

### Test 2: Add Branch Admin to All Transitions

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "branch_admin",
    "action": "add"
  }' \
  http://localhost:8000/api/workflow/transitions/sync-role/
```

### Test 3: Check Workflow Info Shows More Transitions

```bash
# Before and after the bulk update, check:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/jobcards/$job_card_id/workflow/
```

## Logging

All workflow operations now log to the Django logger. Check your logs for:

```text
[WORKFLOW] No template found for JobCard 123
[WORKFLOW] User 45 (branch_admin) has NO allowed transitions for JobCard 123 (status: billed). Found 3 active transitions but all were rejected.
Added branch_admin to transition: Payment Received
Template 'Simplified Flow': Updated 7, Skipped 3, Errors 0
```

## What's Next (Phase 2)

1. **Admin UI for Workflow Management** - Visual workflow editor in the frontend
2. **Real-time Validation** - UI feedback when making workflow changes
3. **Workflow Templates Management** - Create/edit templates from UI
4. **Permission Matrix View** - See all roles × transitions at a glance

## API Endpoints Summary

| Endpoint | Method | Purpose | Access |
| :--- | :--- | :--- | :--- |
| `/api/jobcards/{id}/workflow/` | GET | Get workflow info | Authenticated |
| `/api/jobcards/{id}/workflow/diagnostic/` | GET | Get diagnostic info | Admin only |
| `/api/workflow/transitions/bulk-update-permissions/` | POST | Bulk update permissions | Admin only |
| `/api/workflow/transitions/sync-role/` | POST | Sync role across templates | Admin only |

## Files Modified

1. `Backend-AutoAICare/jobcards/workflow_config.py`
   - Enhanced `get_allowed_transitions()` with debug mode
   - Added `get_workflow_diagnostic()` method
   - Added `bulk_update_transition_permissions()` method
   - Added `sync_role_across_workflow_types()` method

2. `Backend-AutoAICare/jobcards/views.py`
   - Added `/workflow/diagnostic/` endpoint

3. `Backend-AutoAICare/jobcards/workflow_views.py`
   - Added `/bulk-update-permissions/` endpoint
   - Added `/sync-role/` endpoint

## Notes

- All operations respect multi-tenancy (company scoping)
- Bulk operations log each change for audit trail
- Diagnostic endpoint is admin-only to prevent information disclosure
- All changes are backward compatible with existing code
