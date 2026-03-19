# Workflow System - Quick Reference Guide

## 🚀 Quick Start

### Problem: User can't see expected workflow actions

**Solution:**

```bash
# 1. Diagnostic: Find out why
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/jobcards/{job_id}/workflow/diagnostic/

# 2. Fix: Add missing role
python manage.py sync_workflow_permissions \
  --role branch_admin \
  --action add \
  --pattern "payment"
```

---

## 🔧 Common Management Commands

### Add branch_admin to all billing transitions

```bash
python manage.py sync_workflow_permissions \
  --role branch_admin \
  --action add \
  --pattern billing
```

### Preview changes before applying (dry run)

```bash
python manage.py sync_workflow_permissions \
  --role branch_admin \
  --action add \
  --pattern delivery \
  --dry-run
```

### Apply to all templates

```bash
python manage.py sync_workflow_permissions \
  --role branch_admin \
  --action add \
  --pattern billing \
  --all-templates
```

### Remove role from specific transitions

```bash
python manage.py sync_workflow_permissions \
  --role floor_manager \
  --action remove \
  --pattern close
```

### Update specific template only

```bash
python manage.py sync_workflow_permissions \
  --role branch_admin \
  --action add \
  --template 1 \
  --pattern qc
```

---

## 🔍 Diagnostic Endpoints

### Get workflow diagnostic info

```bash
GET /api/jobcards/{id}/workflow/diagnostic/
```

**Returns:**

- Template information
- All transitions from current status
- Which transitions are allowed/rejected
- Detailed rejection reasons

### Get normal workflow info

```bash
GET /api/jobcards/{id}/workflow/
```

**Returns:**

- Current status
- Allowed transitions
- User permissions
- Workflow settings

---

## 🔄 Bulk Update API Endpoints

### Bulk update specific transitions

```bash
POST /api/workflow/transitions/bulk-update-permissions/
```

**Request:**

```json
{
  "role": "branch_admin",
  "action": "add",
  "template_id": 1,
  "transition_pattern": "billing"
}
```

### Sync role across all templates

```bash
POST /api/workflow/transitions/sync-role/
```

**Request:**

```json
{
  "role": "branch_admin",
  "action": "add",
  "transition_pattern": "deliver"
}
```

---

## 📋 Common Scenarios

### Scenario 1: Branch Admin Can't See "Payment Received" Button

**Steps:**

1. Check diagnostic endpoint for the job card
2. Look at `rejected_transitions` array
3. If "Payment Received" is rejected with "Role not allowed":

```bash
python manage.py sync_workflow_permissions \
  --role branch_admin \
  --action add \
  --pattern payment \
  --dry-run  # Preview first

# If looks good, run without --dry-run
python manage.py sync_workflow_permissions \
  --role branch_admin \
  --action add \
  --pattern payment
```

### Scenario 2: New Role Needs All Delivery Permissions

**Steps:**

```bash
python manage.py sync_workflow_permissions \
  --role new_role \
  --action add \
  --pattern deliver \
  --all-templates
```

### Scenario 3: Restrict Floor Manager from Closing Jobs

**Steps:**

```bash
python manage.py sync_workflow_permissions \
  --role floor_manager \
  --action remove \
  --pattern close \
  --all-templates
```

---

## 🛠 Python Usage (In Code)

### Bulk update permissions

```python
from jobcards.workflow_config import WorkflowEngine

result = WorkflowEngine.bulk_update_transition_permissions(
    role='branch_admin',
    action='add',
    transition_filter={'action_name__icontains': 'billing'},
    company=user.company
)

print(f"Updated: {result['updated']}")
print(f"Skipped: {result['skipped']}")
```

### Sync across all templates

```python
result = WorkflowEngine.sync_role_across_workflow_types(
    role='branch_admin',
    action='add',
    transition_pattern='delivery',
    company=user.company
)

print(f"Templates processed: {result['templates_processed']}")
print(f"Total updated: {result['total_updated']}")
```

### Get diagnostic info

```python
diagnostic = WorkflowEngine.get_workflow_diagnostic(jobcard, user)

if diagnostic.get('error'):
    print(f"Error: {diagnostic['error']}")

for rejection in diagnostic['rejected_transitions']:
    print(f"Rejected: {rejection['action_name']}")
    print(f"Reason: {rejection['rejection_reason']}")
```

---

## 📊 Understanding Diagnostic Output

### Key Fields to Check

1. **`template_found`**: Should be `true`
   - If `false`, check `jobcard_branch_id` and `jobcard_service_category`

2. **`transitions_from_status`**: Total transitions defined
   - If `0`, no transitions exist for this status

3. **`active_transitions`**: Active transitions
   - If less than total, some are disabled

4. **`allowed_transitions`**: Transitions user can perform
   - If `0`, check `rejected_transitions`

5. **`rejected_transitions`**: Array of rejected transitions with reasons
   - Common reasons:
     - "Role 'X' is not allowed for this action"
     - "User is not assigned to this job card"
     - "Custom condition not met"

---

## ⚡ Tips

1. **Always use --dry-run first** to preview changes
2. **Use pattern matching** for related actions (e.g., 'billing', 'qc', 'deliver')
3. **Check diagnostic endpoint** before making bulk changes
4. **Multi-tenancy is automatic** - permissions are scoped to company
5. **Changes are instant** - no restart needed

---

## 🚨 Troubleshooting

### Problem: "No allowed transitions" but transitions exist

**Check:**

1. Template is active: `WorkflowTemplate.objects.filter(is_active=True)`
2. Transitions are active: Look at `active_transitions` in diagnostic
3. User role has permission: Check `rejected_transitions[].rejection_reason`

### Problem: Changes not reflecting in UI

**Check:**

1. Frontend is calling `/workflow/` endpoint
2. Caching is not interfering
3. User role matches what you added

### Problem: Bulk update reports 0 updated

**Check:**

1. Pattern matches action names (use --dry-run to verify)
2. Template ID is correct
3. Role doesn't already exist in transitions

---

## 📚 Further Reading

See `WORKFLOW_PHASE1_DOCUMENTATION.md` for:

- Complete API reference
- Detailed feature description
- Architecture overview
- Testing guidelines
