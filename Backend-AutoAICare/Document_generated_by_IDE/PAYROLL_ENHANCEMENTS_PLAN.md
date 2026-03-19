# Salary & Payroll Enhancements Implementation Plan

## Overview
This document outlines the implementation of comprehensive payroll enhancements including leave management, incentive tracking, and tax compliance features.

## 8.1 Leave Integration

### Models to Create
1. **LeaveType** - Define leave categories (Casual, Sick, Earned, etc.)
2. **LeaveBalance** - Track employee leave balances
3. **LeaveRequest** - Employee leave applications
4. **LeaveEncashment** - Process leave encashment

### Features
- ✅ Leave balance display in payroll
- ✅ Auto-calculate unpaid leave deductions
- ✅ Leave encashment processing
- ✅ Leave approval workflow
- ✅ Leave balance carry-forward rules

## 8.2 Incentive Tracking

### Models to Enhance
1. **Payroll** - Add incentive breakdown fields
2. **PerformanceMetrics** - Track detailed performance data

### Features
- ✅ Performance dashboard showing:
  - Jobs completed per employee
  - QC scores and pass rates
  - Average job completion time
  - Customer satisfaction ratings
- ✅ Incentive calculator with preview
- ✅ Leaderboards for top performers
- ✅ Integration with existing SupervisorReward system

## 8.3 Tax Compliance

### Models to Create
1. **TaxSlab** - Define tax brackets
2. **TaxDeclaration** - Employee tax declarations
3. **Form16** - Annual tax certificates

### Features
- ✅ Auto-calculate TDS based on slabs
- ✅ PF/ESI report generation
- ✅ Form 16 generation
- ✅ Tax projection for employees
- ✅ Investment declaration tracking

## Database Changes

### New Tables
1. `leave_types`
2. `leave_balances`
3. `leave_requests`
4. `leave_encashments`
5. `tax_slabs`
6. `tax_declarations`
7. `form16_records`
8. `performance_metrics`

### Modified Tables
1. `payrolls` - Add leave deduction fields
2. `employee_salary_structures` - Add leave policy fields

## API Endpoints

### Leave Management
- `GET/POST /api/accounting/leave-types/`
- `GET/POST /api/accounting/leave-balances/`
- `GET/POST /api/accounting/leave-requests/`
- `POST /api/accounting/leave-requests/{id}/approve/`
- `POST /api/accounting/leave-requests/{id}/reject/`
- `GET/POST /api/accounting/leave-encashments/`
- `GET /api/accounting/leave-balances/my-balance/`

### Incentive Tracking
- `GET /api/accounting/performance-dashboard/`
- `GET /api/accounting/incentive-preview/{employee_id}/{month}/{year}/`
- `GET /api/accounting/leaderboard/`
- `GET /api/accounting/performance-metrics/{employee_id}/`

### Tax Compliance
- `GET/POST /api/accounting/tax-slabs/`
- `GET/POST /api/accounting/tax-declarations/`
- `GET /api/accounting/calculate-tds/{employee_id}/{month}/{year}/`
- `GET /api/accounting/pf-esi-report/`
- `GET /api/accounting/form16/{employee_id}/{year}/`
- `POST /api/accounting/generate-form16/`

## Frontend Components

### Leave Management
1. `LeaveManagement.jsx` - Main leave management page
2. `LeaveBalanceCard.jsx` - Display leave balances
3. `LeaveRequestForm.jsx` - Apply for leave
4. `LeaveApprovalPanel.jsx` - Approve/reject leaves (for managers)
5. `LeaveCalendar.jsx` - Visual leave calendar

### Incentive Tracking
1. `PerformanceDashboard.jsx` - Performance metrics dashboard
2. `IncentiveCalculator.jsx` - Preview incentives
3. `Leaderboard.jsx` - Top performers
4. `EmployeePerformanceCard.jsx` - Individual performance

### Tax Compliance
1. `TaxDashboard.jsx` - Tax overview
2. `TDSCalculator.jsx` - TDS calculation tool
3. `Form16Generator.jsx` - Generate Form 16
4. `PFESIReports.jsx` - Statutory reports
5. `TaxDeclarationForm.jsx` - Employee tax declarations

## Implementation Phases

### Phase 1: Backend - Leave Management (Day 1)
- Create models for leave system
- Create serializers and views
- Add API endpoints
- Create migrations

### Phase 2: Backend - Incentive Tracking (Day 1-2)
- Enhance payroll models
- Create performance metrics aggregation
- Add leaderboard logic
- Create incentive preview calculator

### Phase 3: Backend - Tax Compliance (Day 2)
- Create tax models
- Implement TDS calculation
- Create report generators
- Add Form 16 generation

### Phase 4: Frontend - Leave Management (Day 3)
- Create leave management UI
- Add leave request forms
- Create approval workflows
- Add leave calendar

### Phase 5: Frontend - Incentive Tracking (Day 3-4)
- Create performance dashboard
- Add incentive calculator
- Create leaderboards
- Add performance cards

### Phase 6: Frontend - Tax Compliance (Day 4)
- Create tax dashboard
- Add TDS calculator
- Create Form 16 generator
- Add statutory reports

### Phase 7: Integration & Testing (Day 5)
- Integrate all components
- End-to-end testing
- Performance optimization
- Documentation

## Key Integration Points

1. **Payroll Generation** - Auto-calculate:
   - Leave deductions based on unpaid leaves
   - Incentives from SupervisorReward + performance
   - TDS based on gross salary and declarations

2. **Leave Balance** - Auto-update:
   - On leave approval
   - On month-end processing
   - On leave encashment

3. **Performance Metrics** - Auto-calculate from:
   - JobCard completion data
   - QC pass/fail rates
   - SupervisorReward records
   - Customer feedback scores

4. **Tax Calculation** - Consider:
   - Gross salary components
   - Deductions (PF, ESI)
   - Tax declarations
   - Previous tax paid (for cumulative)

## Success Metrics

1. Leave balance accuracy: 100%
2. TDS calculation accuracy: 100%
3. Incentive calculation time: < 2 seconds
4. Form 16 generation time: < 5 seconds
5. Dashboard load time: < 3 seconds
