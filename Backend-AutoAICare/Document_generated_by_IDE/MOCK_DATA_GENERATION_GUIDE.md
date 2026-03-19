# Mock Data Generation Guide

## Overview

The `generate_performance_data` management command creates realistic mock performance data for testing the performance tracking and reward system.

## Usage

### Basic Usage
```bash
python manage.py generate_performance_data
```

This will create 30 job performance records spread across 30 days for all branches.

### Custom Options

#### Specify Number of Jobs
```bash
python manage.py generate_performance_data --jobs 50
```

#### Specify Time Period
```bash
python manage.py generate_performance_data --days 60
```

#### Specific Branch
```bash
python manage.py generate_performance_data --branch 1
```

#### Clear Existing Data First
```bash
python manage.py generate_performance_data --clear
```

#### Combined Options
```bash
python manage.py generate_performance_data --jobs 100 --days 30 --branch 1 --clear
```

## What Gets Created

For each job performance record, the command generates:

### Performance Metrics
- **Team Assignment**: Random supervisor, floor manager, and 1-3 applicators
- **Time Tracking**: 
  - 70% chance of early completion (5-45 minutes saved)
  - 30% chance of late completion (5-30 minutes delayed)
- **Job Value**: 
  - Base package price (sedan price)
  - 30% chance of add-ons (₹500-₹2000)
  - 20% chance of parts (₹500-₹2000)
- **Quality Metrics**:
  - Quality score: 7-10 for on-time jobs, 5-9 for delayed
  - Customer satisfaction: 7-10 for high quality, 5-8 for lower
- **Rewards**:
  - Calculated based on job value tiers (1%, 1.5%, 1.8%, 2.0%)
  - Time bonus applied for early completion (0.5% per 15 min)

### Team Aggregates
- Daily performance summaries for each supervisor
- Includes:
  - Total jobs completed
  - Jobs on time vs delayed
  - Total time saved/delayed
  - Total job value and rewards
  - Team efficiency percentage

## Prerequisites

Before running this command, ensure you have:

1. **Branches** - At least one branch created
2. **Staff Members**:
   - Supervisors (role='supervisor')
   - Applicators (role='applicator')
   - Floor Managers (role='floor_manager') - optional
3. **Service Packages** - At least one active service package
4. **Reward Settings** - Will be auto-created if not exists

## Example Scenarios

### Quick Test (Small Dataset)
```bash
python manage.py generate_performance_data --jobs 10 --days 7
```

### Monthly Report Testing
```bash
python manage.py generate_performance_data --jobs 100 --days 30
```

### Fresh Start
```bash
python manage.py generate_performance_data --clear --jobs 50 --days 30
```

### Branch-Specific Testing
```bash
# Get branch ID from admin or API
python manage.py generate_performance_data --branch 1 --jobs 30
```

## Data Distribution

The generated data follows realistic patterns:

- **70% on-time completion** - Reflects good team performance
- **30% delayed** - Represents realistic challenges
- **Time saved**: 5-45 minutes (when early)
- **Time delayed**: 5-30 minutes (when late)
- **Job values**: Varies based on package + add-ons + parts
- **Quality scores**: Higher for on-time jobs

## Viewing Generated Data

### Django Admin
1. Go to **Job Card Performance Metrics**
2. Filter by branch, supervisor, or date
3. View individual job performance details

### API Endpoints
```bash
# Team summary
GET /api/jobcards/performance/team-summary/?period=daily

# Branch summary
GET /api/jobcards/performance/branch-summary/?period=weekly

# Individual performance
GET /api/jobcards/performance/individual/

# Leaderboard
GET /api/jobcards/performance/leaderboard/?period=monthly
```

## Troubleshooting

### No Data Generated
**Issue**: Command runs but creates 0 records

**Solutions**:
- Check if supervisors exist: `User.objects.filter(role='supervisor')`
- Check if applicators exist: `User.objects.filter(role='applicator')`
- Check if service packages exist: `ServicePackage.objects.filter(is_active=True)`

### Foreign Key Errors
**Issue**: `IntegrityError: FOREIGN KEY constraint failed`

**Solutions**:
- Ensure all required models exist (Branch, User, ServicePackage)
- Check that users have correct roles assigned
- Verify branch assignments for users

### Duplicate Data
**Issue**: Running command multiple times creates duplicate data

**Solution**:
```bash
# Use --clear flag to remove old data first
python manage.py generate_performance_data --clear --jobs 30
```

## Notes

- Generated performance metrics are **not linked to actual job cards** (jobcard field is null)
- This is intentional for testing purposes
- In production, performance metrics are automatically created when real jobs complete
- Team aggregates are calculated and stored for each day with activity

## Next Steps

After generating mock data:

1. **Test API Endpoints** - Verify all endpoints return correct data
2. **Check Admin Panel** - Review performance metrics and team aggregates
3. **Test Frontend** - Integrate with frontend dashboards
4. **Verify Calculations** - Ensure reward calculations are correct
5. **Test Leaderboards** - Check team rankings and comparisons

---

**Created**: January 31, 2026  
**Command**: `jobcards/management/commands/generate_performance_data.py`
