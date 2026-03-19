# Complete Operational Workflow Implementation

This document describes the complete 12-phase operational workflow implemented for the car detailing center system.

## Workflow Overview

The system now supports a complete industry-standard workflow from booking creation to vehicle delivery:

1. **Booking / Customer Entry** - Customer creates booking via app or walk-in
2. **Vehicle Check-In** - Reception checks in vehicle arrival
3. **Job Card Creation** - Convert booking to job card and assign Floor Manager
4. **Floor Manager QC Check** - Deep inspection and QC report
5. **Supervisor Review** - Supervisor approves/rejects QC
6. **Floor Manager Approval** - Floor Manager approves/rejects supervisor's decision
7. **Applicator Team Work** - Technicians execute the work
8. **Supervisor Final QC** - Final quality check after work completion
9. **Floor Manager Final QC Approval** - Floor Manager approves/rejects final QC
10. **Customer Approval** - Customer reviews and approves (optional)
11. **Invoice Generation** - Create invoice for billing
12. **Payment Collection** - Customer pays invoice
13. **Vehicle Delivery** - Handover vehicle to customer
14. **Feedback & Automation** - Automated follow-ups and feedback collection

## API Endpoints

### Booking Endpoints

#### Check-In Vehicle
```
PUT /api/bookings/{id}/check_in/
```
**Phase 2**: Check in vehicle arrival
- **Permissions**: Reception, Floor Manager, Admin
- **Body**:
  ```json
  {
    "initial_photos": ["url1", "url2"],
    "initial_damages": "Minor scratch on front bumper",
    "check_in_notes": "Customer requested extra attention to interior"
  }
  ```

### Job Card Endpoints

#### Assign Floor Manager
```
POST /api/jobcards/{id}/assign_floor_manager/
```
**Phase 3**: Assign Floor Manager to job card
- **Permissions**: Branch Admin, Super Admin
- **Body**:
  ```json
  {
    "floor_manager_id": 5
  }
  ```

#### Complete QC
```
POST /api/jobcards/{id}/complete_qc/
```
**Phase 4**: Floor Manager completes QC check
- **Permissions**: Assigned Floor Manager
- **Body**:
  ```json
  {
    "scratches": "Minor scratches on driver side door",
    "dents": "Small dent on rear bumper",
    "before_photos": ["url1", "url2"],
    "checklist_points": ["Wash exterior", "Clean interior", "Polish"],
    "required_parts": ["Wax", "Polish compound"],
    "additional_tasks": "Paint correction recommended",
    "additional_tasks_price": 500.00,
    "notes": "Vehicle in good condition overall"
  }
  ```

#### Supervisor Review
```
POST /api/jobcards/{id}/supervisor_review/
```
**Phase 5**: Supervisor reviews and approves/rejects QC
- **Permissions**: Supervisor
- **Body (Approve)**:
  ```json
  {
    "action": "approve",
    "review_notes": "QC looks good, proceed with work",
    "stock_availability_checked": true,
    "pricing_confirmed": true
  }
  ```
- **Body (Reject)**:
  ```json
  {
    "action": "reject",
    "rejection_reason": "Missing required parts in stock",
    "review_notes": "Please verify stock before proceeding"
  }
  ```

#### Assign Applicator Team
```
POST /api/jobcards/{id}/assign_applicator_team/
```
**Phase 5**: Assign applicator team after supervisor approval
- **Permissions**: Supervisor, Admin
- **Body**:
  ```json
  {
    "applicator_ids": [10, 11, 12]
  }
  ```

#### Floor Manager Approval
```
POST /api/jobcards/{id}/floor_manager_approval/
```
**Phase 5**: Floor Manager approves or rejects job after supervisor approval
- **Permissions**: Assigned Floor Manager
- **Body (Approve)**:
  ```json
  {
    "action": "approve"
  }
  ```
- **Body (Reject)**:
  ```json
  {
    "action": "reject",
    "rejection_reason": "Issue with the supervisor's approval"
  }
  ```

#### Start Work
```
POST /api/jobcards/{id}/start_work/
```
**Phase 6**: Applicator team starts work
- **Permissions**: Assigned Applicator Team Members

#### Complete Work
```
POST /api/jobcards/{id}/complete_work/
```
**Phase 6**: Applicator team completes work
- **Permissions**: Assigned Applicator Team Members
- **Body**:
  ```json
  {
    "notes": "All tasks completed successfully"
  }
  ```

#### Final QC
```
POST /api/jobcards/{id}/final_qc/
```
**Phase 7**: Supervisor performs final QC
- **Permissions**: Supervisor
- **Body (Pass)**:
  ```json
  {
    "action": "pass",
    "after_photos": ["url1", "url2"],
    "checklist_verified": true,
    "parts_verified": true,
    "quality_notes": "Excellent work quality"
  }
  ```
- **Body (Fail)**:
  ```json
  {
    "action": "fail",
    "failure_reason": "Interior cleaning incomplete",
    "issues_found": "Seats not properly vacuumed"
  }
  ```

#### Floor Manager Final QC Approval
```
POST /api/jobcards/{id}/floor_manager_final_qc_approval/
```
**Phase 9**: Floor Manager approves or rejects job after final QC passed
- **Permissions**: Assigned Floor Manager
- **Body (Approve)**:
  ```json
  {
    "action": "approve"
  }
  ```
- **Body (Reject)**:
  ```json
  {
    "action": "reject",
    "rejection_reason": "Issue with the final QC"
  }
  ```

#### Customer Approval
```
POST /api/jobcards/{id}/customer_approval/
```
**Phase 10**: Customer approves or requests revision
- **Permissions**: Customer
- **Body (Approve)**:
  ```json
  {
    "action": "approve",
    "approval_notes": "Work looks great!",
    "photos_viewed": true,
    "tasks_reviewed": true,
    "qc_report_viewed": true
  }
  ```
- **Body (Request Revision)**:
  ```json
  {
    "action": "request_revision",
    "revision_notes": "Please fix the scratch on the door"
  }
  ```

#### Mark Ready for Billing
```
POST /api/jobcards/{id}/mark_ready_for_billing/
```
**Phase 11**: Mark job card ready for billing
- **Permissions**: Admin, Floor Manager
- **Body**: None required

#### Deliver Vehicle
```
POST /api/jobcards/{id}/deliver_vehicle/
```
**Phase 13**: Deliver vehicle to customer
- **Permissions**: Admin, Floor Manager
- **Body**:
  ```json
  {
    "delivery_notes": "Customer picked up vehicle at 3 PM",
    "customer_satisfaction_confirmed": true,
    "keys_delivered": true,
    "final_walkthrough_completed": true
  }
  ```

#### Close Job
```
POST /api/jobcards/{id}/close_job/
```
**Phase 14**: Close job permanently
- **Permissions**: Admin
- **Body**: None required

### Job Card Statuses
- `created` - Job card created
- `qc_pending` - Waiting for Floor Manager QC
- `qc_completed` - QC completed, waiting for supervisor review
- `qc_rejected` - QC rejected, back to Floor Manager
- `supervisor_approved` - Supervisor approved QC, waiting for floor manager confirmation
- `supervisor_rejected` - Supervisor rejected QC, back to Floor Manager
- `floor_manager_confirmed` - Floor Manager confirmed supervisor approval
- `assigned_to_applicator` - Assigned to applicator team
- `work_in_progress` - Work in progress
- `work_completed` - Work completed, waiting for final QC
- `final_qc_pending` - Waiting for final QC
- `final_qc_passed` - Final QC passed
- `final_qc_failed` - Final QC failed, back to applicators
- `floor_manager_final_qc_confirmed` - Floor Manager confirmed final QC
- `customer_approval_pending` - Waiting for customer approval
- `customer_approved` - Customer approved
- `customer_revision_requested` - Customer requested revision
- `ready_for_billing` - Ready for billing
- `billed` - Invoice generated
- `delivered` - Vehicle delivered
- `closed` - Job closed

## Models

### New Models Added

1. **QCReport** - Floor Manager QC inspection report
2. **SupervisorReview** - Supervisor review and approval/rejection
3. **FinalQCReport** - Final QC after work completion
4. **CustomerApproval** - Customer approval record
5. **VehicleDelivery** - Vehicle delivery/handover tracking

### Updated Models

1. **Booking** - Added check-in fields:
   - `vehicle_arrived_at`
   - `checked_in_by`
   - `initial_photos`
   - `initial_damages`
   - `check_in_notes`

2. **JobCard** - Enhanced with workflow fields:
   - `floor_manager` - Assigned Floor Manager
   - `supervisor` - Assigned Supervisor
   - `applicator_team` - Assigned applicator team (ManyToMany)
   - Extended status choices for complete workflow

3. **JobCardPhoto** - Added new photo types:
   - `initial` - Initial check-in photos
   - `in_progress` - Work in progress photos

## Integration Points

### Billing Integration
- When invoice is created from job card, job card status automatically updates to `billed`
- Invoice creation endpoint: `POST /api/invoices/from_jobcard/`

### Payment Integration
- After payment, invoice status updates to `paid`
- Job card remains in `billed` status until delivery

## Frontend Implementation Notes

The frontend should implement UI for each phase:

1. **Reception Dashboard** - Check-in interface with photo upload
2. **Floor Manager Dashboard** - QC inspection form with checklist
3. **Supervisor Dashboard** - Review interface with approve/reject actions
4. **Applicator Dashboard** - Work tracking with progress updates
5. **Customer App** - Approval interface with before/after photos
6. **Billing Interface** - Invoice generation and payment tracking
7. **Delivery Interface** - Handover checklist and customer satisfaction

## Testing