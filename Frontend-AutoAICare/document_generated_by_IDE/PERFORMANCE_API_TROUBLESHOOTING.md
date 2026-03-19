# Performance API - Troubleshooting Guide

## Common API Issues & Solutions

### 1. **404 Not Found Errors**

#### Issue: `branch-summary` returns 404
**Cause:** Missing `branch_id` parameter or user doesn't have a branch assigned

**Solutions:**
- Ensure user has a branch assigned in their profile
- For super_admin without a branch, pass `branch_id` parameter explicitly
- Check if user role is `floor_manager`, `branch_admin`, or `super_admin`

**Example Fix:**
```javascript
// Add branch_id if available
const params = { period };
if (user.branch_id) {
    params.branch_id = user.branch_id;
}
api.get('/jobcards/performance/branch-summary/', { params });
```

#### Issue: `individual` returns 404 with "Invalid role or no data found"
**Cause:** User role doesn't match expected roles OR no performance data exists

**Valid Roles:**
- `floor_manager`
- `supervisor`
- `applicator` (or `staff`)

**NOT valid:**
- `branch_admin`
- `super_admin`

**Solution:**
- Only call this endpoint for users with valid roles
- Admins should view team/branch summaries instead
- Generate test data if no performance records exist

---

### 2. **Required Parameters by Endpoint**

#### `/api/jobcards/performance/team-summary/`
**Required:**
- `supervisor_id` (for non-supervisors) OR current user must be supervisor

**Optional:**
- `period`: daily/weekly/monthly/quarterly/yearly (default: monthly)
- `start_date`: YYYY-MM-DD
- `end_date`: YYYY-MM-DD

**Who can access:**
- super_admin
- branch_admin
- floor_manager
- supervisor

---

#### `/api/jobcards/performance/branch-summary/`
**Required:**
- `branch_id` (if user doesn't have a branch assigned)

**Optional:**
- `period`: daily/weekly/monthly/quarterly/yearly (default: monthly)
- `start_date`: YYYY-MM-DD
- `end_date`: YYYY-MM-DD

**Who can access:**
- super_admin
- branch_admin
- floor_manager

---

#### `/api/jobcards/performance/individual/`
**Required:**
- None (uses current user by default)

**Optional:**
- `user_id`: View another user's performance (admin only)
- `role`: User role (defaults to current user's role)
- `start_date`: YYYY-MM-DD
- `end_date`: YYYY-MM-DD

**Who can access:**
- floor_manager
- supervisor
- applicator/staff

**NOT accessible by:**
- branch_admin (unless they also have another role)
- super_admin (unless they also have another role)

---

#### `/api/jobcards/performance/leaderboard/`
**Required:**
- None

**Optional:**
- `branch_id`: Filter by branch
- `period`: daily/weekly/monthly (default: monthly)
- `metric`: total_job_value/total_jobs_completed/total_rewards_earned/efficiency_percentage
- `limit`: Number of results (default: 10)

**Who can access:**
- super_admin
- branch_admin
- floor_manager
- supervisor

---

#### `/api/jobcards/performance/calculate-potential-reward/` (POST)
**Required in body:**
```json
{
  "job_value": 12000
}
```

**Optional in body:**
```json
{
  "time_saved_minutes": 30,
  "branch_id": 1
}
```

**Who can access:**
- super_admin
- branch_admin
- floor_manager
- supervisor

---

### 3. **Generate Test Data**

If you're getting "no data found" errors, generate test performance data:

```bash
cd DetailEase-Backend
python manage.py generate_performance_data --jobs 20 --days 7
```

**Options:**
- `--jobs 20` - Generate 20 jobs per branch
- `--days 7` - Spread over 7 days
- `--branch "Branch Name"` - Specific branch only
- `--clear` - Clear existing data first

---

### 4. **Frontend Error Handling**

The updated `Performance.jsx` now:
- ✅ Handles 404 errors gracefully
- ✅ Only calls endpoints appropriate for user role
- ✅ Provides `supervisor_id` for team summary
- ✅ Skips individual endpoint for admin roles
- ✅ Shows warnings in console instead of breaking

**What happens now:**
- If an endpoint fails, that section will be empty
- Other sections will still load
- No error messages shown to user (unless all fail)
- Check browser console for warnings

---

### 5. **User Role Requirements**

#### For Full Dashboard Access:
**Best roles:**
- `floor_manager` - Can see everything including personal stats
- `supervisor` - Can see team, leaderboard, and personal stats

#### Limited Access:
- `branch_admin` - Can see branch/team summaries, leaderboard (NO personal stats)
- `super_admin` - Can see branch/team summaries, leaderboard (NO personal stats)
- `applicator`/`staff` - Can only see personal stats

---

### 6. **Quick Fixes**

#### If you're logged in as admin and want to see data:

**Option 1: Create a supervisor account**
```bash
python manage.py shell
```
```python
from users.models import User
from branches.models import Branch

branch = Branch.objects.first()
supervisor = User.objects.create_user(
    email='supervisor@test.com',
    password='test123',
    name='Test Supervisor',
    role='supervisor',
    branch=branch
)
```

**Option 2: Change your role temporarily**
```python
user = User.objects.get(email='your@email.com')
user.role = 'supervisor'
user.save()
```

**Option 3: View as floor manager**
```python
user = User.objects.get(email='your@email.com')
user.role = 'floor_manager'
user.save()
```

---

### 7. **Expected API Responses**

#### Successful `individual` response:
```json
{
  "user_id": 1,
  "user_name": "John Doe",
  "user_role": "supervisor",
  "total_jobs": 15,
  "jobs_on_time": 12,
  "jobs_delayed": 3,
  "on_time_percentage": 80.0,
  "total_time_saved": 120,
  "total_time_delayed": 30,
  "net_time_performance": 90,
  "total_job_value": "45000.00",
  "total_rewards": "675.00",
  "avg_completion_time": 180.5
}
```

#### Successful `branch_summary` response:
```json
[
  {
    "supervisor_id": 1,
    "supervisor_name": "John Doe",
    "branch_name": "Main Branch",
    "total_jobs_completed": 25,
    "total_job_value": "75000.00",
    "total_rewards_earned": "1125.00",
    "efficiency_percentage": 85.5,
    "on_time_percentage": 88.0
  }
]
```

---

### 8. **Debugging Checklist**

- [ ] User is logged in
- [ ] User has appropriate role
- [ ] User has branch assigned (for branch_summary)
- [ ] Performance data exists in database
- [ ] Correct parameters passed to API
- [ ] Check browser console for warnings
- [ ] Check Django logs for errors
- [ ] Verify API endpoints in `jobcards/urls.py`
- [ ] Test with Postman/curl first

---

### 9. **Test API with curl**

```bash
# Get individual stats (as supervisor)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/jobcards/performance/individual/?period=daily"

# Get branch summary
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/jobcards/performance/branch-summary/?period=daily"

# Get leaderboard
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/jobcards/performance/leaderboard/?period=monthly&limit=10"
```

---

## Summary

The Performance Dashboard is now **production-ready** with proper error handling. Some sections may be empty based on:
1. User role
2. Available data
3. User's branch assignment

This is **expected behavior** - not all users should see all data!
