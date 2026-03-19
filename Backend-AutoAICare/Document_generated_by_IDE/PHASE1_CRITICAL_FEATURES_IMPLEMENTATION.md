# Phase 1: Critical Must-Have Features Implementation

> Implementation guide for Enquiry Management, Enhanced Appointments, Daily Follow-up Dashboard, and Automated Service Reminders

**Status:** 🚀 In Progress  
**Timeline:** 2-4 weeks  
**Priority:** 🔴 Critical

---

## 📊 Current State Analysis

### ✅ Already Implemented
- **Leads App** - Complete lead management system with scoring, activities, and follow-ups
- **Appointments App** - Basic appointment system with slots and approval workflow
- **Automation App** - Workflow engine for automated actions
- **Customers App** - Customer database with vehicle information

### ⚠️ Needs Enhancement
1. **Enquiry Management** - Leads exist but need UI integration and workflow
2. **Appointment Scheduling** - Needs calendar view, reminders, and better UX
3. **Daily Follow-up Dashboard** - Backend exists, needs centralized dashboard
4. **Service Reminders** - Automation exists, needs service interval tracking

---

## 🎯 Implementation Plan

### **Feature 1: Enquiry Management System** ✅ Backend Ready

#### Backend Status: ✅ Complete
- ✅ Lead model with source tracking
- ✅ Lead activities and follow-ups
- ✅ Lead scoring system
- ✅ Conversion tracking
- ✅ API endpoints

#### Frontend Tasks:
1. **Enquiry List Page** (`/admin/enquiries`)
   - Table view with filters (status, source, date range)
   - Quick actions (call, email, convert)
   - Bulk actions
   
2. **Enquiry Detail Page** (`/admin/enquiries/:id`)
   - Customer information
   - Activity timeline
   - Follow-up scheduler
   - Conversion to booking
   - Notes and attachments

3. **Quick Enquiry Form** (Modal)
   - Fast lead capture
   - Minimal required fields
   - Auto-assignment to sales team

4. **Enquiry Dashboard Widget**
   - New enquiries count
   - Follow-up due today
   - Conversion rate
   - Source breakdown

---

### **Feature 2: Enhanced Appointment Scheduling** ⚠️ Needs Enhancement

#### Backend Enhancements Needed:
1. ✅ Appointment model exists
2. ✅ Slot management exists
3. ❌ **Add:** Calendar view API endpoint
4. ❌ **Add:** Appointment reminder automation
5. ❌ **Add:** Bay/workspace allocation
6. ❌ **Add:** Technician assignment

#### Frontend Tasks:
1. **Calendar View** (`/admin/appointments/calendar`)
   - Day/Week/Month views
   - Drag-and-drop rescheduling
   - Color-coded by status
   - Bay/workspace visualization

2. **Appointment Form Enhancement**
   - Visual time slot picker
   - Bay selection
   - Technician assignment
   - Service duration estimation
   - Conflict detection

3. **Appointment Reminders**
   - SMS/Email/WhatsApp reminders
   - Configurable timing (24h, 2h before)
   - Confirmation links

4. **Waitlist Management**
   - Auto-fill from waitlist
   - Priority ranking
   - Notification when slot available

---

### **Feature 3: Daily Follow-up Dashboard** ⚠️ Needs Centralization

#### Backend Tasks:
1. **Create Follow-up API** (`/api/follow-ups/daily/`)
   - Birthday & Anniversary
   - Enquiry follow-ups
   - Pending payments
   - Low stock alerts
   - Irregular clients
   - Scheduled follow-ups

2. **Add Filters & Actions**
   - Mark as completed
   - Snooze/reschedule
   - Bulk actions
   - Export to CSV

#### Frontend Tasks:
1. **Daily Dashboard Page** (`/admin/follow-ups`)
   - Tabbed interface for each category
   - Action buttons (call, email, WhatsApp)
   - Quick notes
   - Completion tracking

2. **Dashboard Widget**
   - Total tasks for today
   - High priority items
   - Overdue count
   - Quick access link

---

### **Feature 4: Automated Service Reminders** ❌ New Feature

#### Backend Tasks:
1. **Service History Tracking**
   - Add `last_service_date` to Vehicle model
   - Track service intervals per service type
   - Calculate next service due date

2. **Reminder Configuration**
   - Service interval settings (e.g., every 3 months)
   - Reminder timing (7 days before, on due date)
   - Message templates

3. **Automation Workflow**
   - Daily cron job to check due services
   - Trigger reminder workflow
   - Send via SMS/Email/WhatsApp

4. **API Endpoints**
   - `/api/service-reminders/` - List upcoming reminders
   - `/api/service-reminders/configure/` - Settings
   - `/api/service-reminders/send/` - Manual send

#### Frontend Tasks:
1. **Service Reminder Settings** (`/admin/settings/reminders`)
   - Configure intervals per service
   - Message templates
   - Channel preferences (SMS/Email/WhatsApp)

2. **Upcoming Reminders View**
   - List of customers due for service
   - Send reminder button
   - Mark as contacted
   - Convert to appointment

---

## 📋 Detailed Implementation Steps

### Step 1: Backend Enhancements (Week 1)

#### 1.1 Service Reminder System
```python
# customers/models.py - Add to Vehicle model
class Vehicle:
    last_service_date = models.DateField(null=True, blank=True)
    service_interval_days = models.IntegerField(default=90)  # 3 months
    next_service_due = models.DateField(null=True, blank=True)
    
    def calculate_next_service_due(self):
        if self.last_service_date:
            return self.last_service_date + timedelta(days=self.service_interval_days)
        return None

# Create ServiceReminder model
class ServiceReminder:
    vehicle = ForeignKey(Vehicle)
    service_type = ForeignKey(ServicePackage)
    due_date = DateField()
    reminder_sent = BooleanField(default=False)
    reminder_sent_at = DateTimeField(null=True)
    status = CharField(choices=['pending', 'sent', 'completed', 'cancelled'])
```

#### 1.2 Daily Follow-up API
```python
# Create new view in analytics or create follow_ups app
class DailyFollowUpView(APIView):
    def get(self, request):
        return {
            'birthdays': get_todays_birthdays(),
            'anniversaries': get_todays_anniversaries(),
            'enquiry_followups': get_pending_enquiry_followups(),
            'pending_payments': get_pending_payments(),
            'low_stock': get_low_stock_items(),
            'irregular_clients': get_irregular_clients(),
            'scheduled_followups': get_scheduled_followups()
        }
```

#### 1.3 Appointment Calendar API
```python
# appointments/views.py
class AppointmentCalendarView(APIView):
    def get(self, request):
        # Return appointments grouped by date/time
        # Include bay/workspace allocation
        # Include technician assignments
```

---

### Step 2: Frontend Implementation (Week 2-3)

#### 2.1 Enquiry Management UI
- Create `src/pages/admin/EnquiryList.jsx`
- Create `src/pages/admin/EnquiryDetail.jsx`
- Create `src/components/admin/EnquiryForm.jsx`
- Create `src/components/admin/EnquiryTimeline.jsx`

#### 2.2 Enhanced Appointments UI
- Create `src/pages/admin/AppointmentCalendar.jsx`
- Create `src/components/admin/CalendarView.jsx`
- Create `src/components/admin/AppointmentForm.jsx` (enhanced)
- Create `src/components/admin/BayAllocation.jsx`

#### 2.3 Daily Follow-up Dashboard
- Create `src/pages/admin/DailyFollowUp.jsx`
- Create `src/components/admin/FollowUpCard.jsx`
- Create `src/components/admin/FollowUpActions.jsx`

#### 2.4 Service Reminders UI
- Create `src/pages/admin/ServiceReminders.jsx`
- Create `src/components/admin/ReminderSettings.jsx`
- Create `src/components/admin/UpcomingReminders.jsx`

---

### Step 3: Integration & Testing (Week 4)

#### 3.1 Integration
- Connect frontend to backend APIs
- Implement real-time updates (WebSocket if needed)
- Add navigation menu items
- Update admin layout

#### 3.2 Testing
- Unit tests for new models and views
- Integration tests for workflows
- UI/UX testing
- Performance testing

---

## 🔧 Technical Details

### API Endpoints to Create

```
# Enquiry Management (Already exists in /api/leads/)
GET    /api/leads/                    # List all leads
POST   /api/leads/                    # Create lead
GET    /api/leads/:id/                # Get lead details
PUT    /api/leads/:id/                # Update lead
DELETE /api/leads/:id/                # Delete lead
POST   /api/leads/:id/convert/        # Convert to customer
GET    /api/leads/:id/activities/     # Get activities
POST   /api/leads/:id/activities/     # Add activity
GET    /api/leads/:id/follow-ups/     # Get follow-ups
POST   /api/leads/:id/follow-ups/     # Schedule follow-up

# Appointments (Enhance existing /api/appointments/)
GET    /api/appointments/calendar/    # Calendar view data
POST   /api/appointments/:id/remind/  # Send reminder
PUT    /api/appointments/:id/assign/  # Assign technician/bay

# Daily Follow-ups (New)
GET    /api/follow-ups/daily/         # Get all daily tasks
GET    /api/follow-ups/birthdays/     # Today's birthdays
GET    /api/follow-ups/anniversaries/ # Today's anniversaries
GET    /api/follow-ups/enquiries/     # Pending enquiry follow-ups
GET    /api/follow-ups/payments/      # Pending payments
GET    /api/follow-ups/irregular/     # Irregular clients
POST   /api/follow-ups/:id/complete/  # Mark as completed

# Service Reminders (New)
GET    /api/service-reminders/        # List upcoming reminders
POST   /api/service-reminders/        # Create reminder
GET    /api/service-reminders/due/    # Due this week
POST   /api/service-reminders/:id/send/ # Send reminder
GET    /api/service-reminders/settings/ # Get settings
PUT    /api/service-reminders/settings/ # Update settings
```

---

## 📱 UI/UX Design Guidelines

### Enquiry Management
- **List View:** Table with sortable columns, filters, search
- **Detail View:** Split layout - info on left, timeline on right
- **Quick Actions:** Call, Email, WhatsApp buttons
- **Status Colors:** New (blue), Contacted (yellow), Qualified (green), Lost (red)

### Appointment Calendar
- **Views:** Day (hourly slots), Week (7 days), Month (overview)
- **Color Coding:** Pending (yellow), Confirmed (green), Completed (blue), Cancelled (red)
- **Drag & Drop:** Reschedule by dragging
- **Tooltips:** Hover to see details

### Daily Follow-up Dashboard
- **Tabs:** One tab per category
- **Cards:** Each task as a card with action buttons
- **Badges:** Count badges on tabs
- **Quick Actions:** One-click call/email/WhatsApp

### Service Reminders
- **Timeline View:** Upcoming reminders in chronological order
- **Filters:** By service type, date range, status
- **Bulk Actions:** Send multiple reminders at once
- **Templates:** Pre-defined message templates

---

## 🎯 Success Metrics

### Enquiry Management
- ✅ Capture 100% of enquiries
- ✅ Track conversion rate
- ✅ Reduce response time to < 1 hour
- ✅ Increase conversion rate by 20%

### Appointments
- ✅ Reduce no-shows by 50%
- ✅ Optimize bay utilization to 80%+
- ✅ Reduce scheduling conflicts to 0
- ✅ Improve customer satisfaction

### Daily Follow-ups
- ✅ Complete 90%+ of daily tasks
- ✅ Reduce overdue follow-ups to < 5%
- ✅ Improve customer engagement
- ✅ Increase repeat business

### Service Reminders
- ✅ Send reminders to 100% of due customers
- ✅ Increase repeat service bookings by 30%
- ✅ Reduce customer churn by 25%
- ✅ Improve customer lifetime value

---

## 🚀 Deployment Plan

### Week 1: Backend Development
- Day 1-2: Service reminder models and logic
- Day 3-4: Daily follow-up API
- Day 5-7: Appointment enhancements, testing

### Week 2: Frontend Development (Part 1)
- Day 1-3: Enquiry management UI
- Day 4-7: Appointment calendar UI

### Week 3: Frontend Development (Part 2)
- Day 1-3: Daily follow-up dashboard
- Day 4-7: Service reminders UI

### Week 4: Integration & Testing
- Day 1-2: Integration testing
- Day 3-4: Bug fixes
- Day 5-6: User acceptance testing
- Day 7: Deployment to production

---

## 📝 Notes

- All features will respect branch-based data isolation
- Role-based permissions will be enforced
- Mobile-responsive design is mandatory
- All actions will be logged for audit trail
- Real-time notifications where applicable

---

**Status:** 📋 Plan Complete - Ready for Implementation  
**Next Step:** Start with Backend Enhancements  
**Created:** February 3, 2026
