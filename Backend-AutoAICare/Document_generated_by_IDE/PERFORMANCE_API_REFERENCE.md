# Performance Tracking API - Quick Reference

## Base URL
```
http://your-domain/api/jobcards/performance/
```

---

## 📊 Endpoints

### 1. Team Performance Summary

**GET** `/team-summary/`

Get aggregated performance metrics for a supervisor's team.

**Query Parameters:**
- `supervisor_id` (required for non-supervisors) - Supervisor user ID
- `period` (optional) - Period type: `daily`, `weekly`, `monthly`, `quarterly`, `yearly` (default: `monthly`)
- `start_date` (optional) - Start date in YYYY-MM-DD format
- `end_date` (optional) - End date in YYYY-MM-DD format

**Example Request:**
```bash
GET /api/jobcards/performance/team-summary/?supervisor_id=5&period=monthly&start_date=2026-01-01&end_date=2026-01-31
```

**Example Response:**
```json
[
  {
    "id": 1,
    "branch": 1,
    "branch_name": "Main Branch",
    "supervisor": 5,
    "supervisor_name": "Deepak Kumar",
    "floor_manager": 3,
    "floor_manager_name": "Rajesh Singh",
    "period_type": "monthly",
    "period_start": "2026-01-01",
    "period_end": "2026-01-31",
    "total_jobs_completed": 45,
    "jobs_on_time": 38,
    "jobs_delayed": 7,
    "total_time_saved": 450,
    "total_time_delayed": 120,
    "average_completion_time": 58.5,
    "net_time_performance": 330,
    "total_job_value": "540000.00",
    "total_rewards_earned": "8100.00",
    "average_reward_per_job": "180.00",
    "team_members": [10, 11, 12],
    "team_size": 3,
    "efficiency_percentage": "84.44",
    "on_time_percentage": 84.44,
    "working_per_day": 17419.35
  }
]
```

---

### 2. Branch Performance Summary

**GET** `/branch-summary/`

Get branch-wide performance comparison across all teams.

**Query Parameters:**
- `branch_id` (required for non-branch users) - Branch ID
- `period` (optional) - Period type (default: `monthly`)
- `start_date` (optional) - Start date in YYYY-MM-DD format
- `end_date` (optional) - End date in YYYY-MM-DD format

**Example Request:**
```bash
GET /api/jobcards/performance/branch-summary/?branch_id=1&period=monthly
```

**Example Response:**
```json
[
  {
    "id": 1,
    "supervisor_name": "Deepak Kumar",
    "total_jobs_completed": 45,
    "total_job_value": "540000.00",
    "total_rewards_earned": "8100.00",
    "efficiency_percentage": "84.44"
  },
  {
    "id": 2,
    "supervisor_name": "Amit Sharma",
    "total_jobs_completed": 38,
    "total_job_value": "420000.00",
    "total_rewards_earned": "6300.00",
    "efficiency_percentage": "79.12"
  }
]
```

---

### 3. Individual Performance

**GET** `/individual/`

Get individual performance metrics for a specific user.

**Query Parameters:**
- `user_id` (optional) - User ID (defaults to current user)
- `role` (optional) - User role: `floor_manager`, `supervisor`, `applicator` (defaults to current user's role)
- `start_date` (optional) - Start date in YYYY-MM-DD format
- `end_date` (optional) - End date in YYYY-MM-DD format

**Example Request:**
```bash
GET /api/jobcards/performance/individual/?user_id=5&role=supervisor&start_date=2026-01-01
```

**Example Response:**
```json
{
  "user_id": 5,
  "user_name": "Deepak Kumar",
  "user_role": "supervisor",
  "total_jobs": 45,
  "jobs_on_time": 38,
  "jobs_delayed": 7,
  "on_time_percentage": 84.44,
  "total_time_saved": 450,
  "total_time_delayed": 120,
  "net_time_performance": 330,
  "total_job_value": "540000.00",
  "total_rewards": "8100.00",
  "avg_completion_time": 58.5
}
```

---

### 4. Leaderboard

**GET** `/leaderboard/`

Get ranked list of top-performing teams.

**Query Parameters:**
- `branch_id` (optional) - Branch ID (defaults to current user's branch)
- `period` (optional) - Period type (default: `monthly`)
- `metric` (optional) - Ranking metric: `total_job_value`, `total_jobs_completed`, `total_rewards_earned`, `efficiency_percentage` (default: `total_job_value`)
- `limit` (optional) - Number of top teams to return (default: 10)

**Example Request:**
```bash
GET /api/jobcards/performance/leaderboard/?period=monthly&metric=total_job_value&limit=5
```

**Example Response:**
```json
[
  {
    "rank": 1,
    "supervisor_id": 5,
    "supervisor_name": "Deepak Kumar",
    "branch_name": "Main Branch",
    "total_jobs_completed": 45,
    "total_job_value": "540000.00",
    "total_rewards_earned": "8100.00",
    "efficiency_percentage": "84.44",
    "on_time_percentage": 84.44,
    "team_size": 3,
    "period_type": "monthly",
    "period_start": "2026-01-01",
    "period_end": "2026-01-31"
  },
  {
    "rank": 2,
    "supervisor_id": 8,
    "supervisor_name": "Amit Sharma",
    "branch_name": "Main Branch",
    "total_jobs_completed": 38,
    "total_job_value": "420000.00",
    "total_rewards_earned": "6300.00",
    "efficiency_percentage": "79.12",
    "on_time_percentage": 76.32,
    "team_size": 2,
    "period_type": "monthly",
    "period_start": "2026-01-01",
    "period_end": "2026-01-31"
  }
]
```

---

### 5. Job Details

**GET** `/{jobcard_id}/job_details/`

Get detailed performance breakdown for a specific job.

**Example Request:**
```bash
GET /api/jobcards/performance/123/job_details/
```

**Example Response:**
```json
{
  "id": 1,
  "jobcard": 123,
  "branch": 1,
  "branch_name": "Main Branch",
  "floor_manager": 3,
  "floor_manager_name": "Rajesh Singh",
  "supervisor": 5,
  "supervisor_name": "Deepak Kumar",
  "applicator_names": ["Ravi Kumar", "Suresh Patel"],
  "scheduled_duration_minutes": 90,
  "actual_duration_minutes": 75,
  "time_difference_minutes": 15,
  "time_saved_display": "15 minutes saved",
  "job_value": "12000.00",
  "package_value": "10000.00",
  "addons_value": "1500.00",
  "parts_value": "500.00",
  "completed_on_time": true,
  "quality_score": 9,
  "customer_satisfaction": 10,
  "reward_amount": "216.00",
  "reward_percentage": "1.80",
  "efficiency_percentage": 120.0,
  "job_started_at": "2026-01-15T10:00:00Z",
  "job_completed_at": "2026-01-15T11:15:00Z",
  "created_at": "2026-01-15T11:15:30Z"
}
```

---

### 6. Calculate Potential Reward

**POST** `/calculate-potential-reward/`

Calculate estimated reward for given parameters (simulation).

**Request Body:**
```json
{
  "job_value": 12000,
  "time_saved_minutes": 30,
  "branch_id": 1
}
```

**Example Request:**
```bash
POST /api/jobcards/performance/calculate-potential-reward/
Content-Type: application/json

{
  "job_value": 12000,
  "time_saved_minutes": 30,
  "branch_id": 1
}
```

**Example Response:**
```json
{
  "job_value": 12000.0,
  "tier": "tier_3",
  "base_percentage": 1.8,
  "base_reward": 216.0,
  "time_saved_minutes": 30,
  "time_bonus_percentage": 1.0,
  "time_bonus_amount": 120.0,
  "total_reward": 336.0,
  "supervisor_share": 168.0,
  "applicator_pool": 168.0,
  "calculation_notes": "TIER_3: ₹12000 × 1.8% = ₹216.0 + Time Bonus (30min): ₹120.0 = Total: ₹336.0"
}
```

---

## 🔐 Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

---

## 🎯 Permission Levels

| Endpoint | Super Admin | Branch Admin | Floor Manager | Supervisor | Applicator |
|----------|-------------|--------------|---------------|------------|------------|
| Team Summary | ✅ All | ✅ Own Branch | ✅ Own Branch | ✅ Own Team | ❌ |
| Branch Summary | ✅ All | ✅ Own Branch | ✅ Own Branch | ❌ | ❌ |
| Individual | ✅ All | ✅ Own Branch | ✅ Own Branch | ✅ Self | ✅ Self |
| Leaderboard | ✅ All | ✅ Own Branch | ✅ Own Branch | ✅ Own Branch | ❌ |
| Job Details | ✅ All | ✅ Own Branch | ✅ Own Branch | ✅ Own Jobs | ✅ Own Jobs |
| Calculate Reward | ✅ All | ✅ Own Branch | ✅ Own Branch | ✅ Own Branch | ❌ |

---

## 📝 Common Use Cases

### 1. View My Team's Performance (Supervisor)
```bash
GET /api/jobcards/performance/team-summary/?period=monthly
```
(supervisor_id is automatically set to current user)

### 2. Compare All Teams in Branch (Floor Manager)
```bash
GET /api/jobcards/performance/branch-summary/?period=weekly
```

### 3. Check My Individual Stats (Any User)
```bash
GET /api/jobcards/performance/individual/
```

### 4. View Top 10 Teams This Month
```bash
GET /api/jobcards/performance/leaderboard/?period=monthly&limit=10
```

### 5. Estimate Reward for Upcoming Job
```bash
POST /api/jobcards/performance/calculate-potential-reward/
{
  "job_value": 15000,
  "time_saved_minutes": 20
}
```

### 6. Get Performance for Specific Date Range
```bash
GET /api/jobcards/performance/team-summary/?start_date=2026-01-01&end_date=2026-01-15
```

---

## 🐛 Error Responses

### 400 Bad Request
```json
{
  "error": "supervisor_id is required"
}
```

### 403 Forbidden
```json
{
  "error": "Permission denied"
}
```

### 404 Not Found
```json
{
  "error": "Performance metrics not found for this job"
}
```

---

## 💡 Tips

1. **Date Formats**: Always use YYYY-MM-DD format for dates
2. **Period Types**: Use lowercase: `daily`, `weekly`, `monthly`
3. **Pagination**: Results are not paginated by default, use date ranges to limit data
4. **Caching**: Consider caching leaderboard and summary data on the frontend
5. **Real-time Updates**: Performance metrics are updated automatically when jobs complete

---

**Last Updated**: January 31, 2026
