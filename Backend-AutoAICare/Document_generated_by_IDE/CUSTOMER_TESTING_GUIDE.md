# 🧪 CUSTOMER TESTING FLOW - COMPLETE GUIDE

This guide provides step-by-step instructions for testing all customer-facing functionality in the Car Service Management System.

---

## ✅ **PHASE 1 — CUSTOMER ACCOUNT**

### **1️⃣ Customer Registration & OTP Verification**

**Test Steps:**
1. Navigate to `/signup` page
2. Fill in registration form:
   - Full Name: `John Doe`
   - Email: `john.doe@example.com`
   - Phone: `1234567890`
   - Password: `TestPass123!`
   - Confirm Password: `TestPass123!`
3. Click **"Sign Up"** button
4. System should redirect to `/verify-otp` page
5. Check email for 6-digit OTP code
6. Enter OTP digits in the 6-field input
7. Click **"Verify OTP"** button
8. Upon success, user should be logged in and redirected to customer dashboard

**Files Involved:**
- Frontend: [`SignupPage.jsx`](./Frontend/src/pages/auth/SignupPage.jsx)
- Frontend: [`OTPVerificationPage.jsx`](./Frontend/src/pages/auth/OTPVerificationPage.jsx)
- Backend: [`users/views.py`](./Backend/users/views.py) - `UserRegistrationView`, `VerifyOTPView`

**Expected Results:**
- ✅ Registration form validates all fields
- ✅ Password visibility toggle works
- ✅ OTP is sent to email
- ✅ 6-digit OTP entry with auto-focus
- ✅ Invalid OTP shows error message
- ✅ Valid OTP logs user in and generates JWT tokens
- ✅ User role is automatically set to `customer`

---

### **2️⃣ Profile Setup**

**Test Steps:**
1. After login, navigate to `/customer/profile`
2. View three tabs: **Profile**, **My Vehicles**, **Booking History**
3. In **Profile** tab:
   - Update name, email, phone
   - Click **"Save Changes"**
   - Change password in second card
4. View account statistics:
   - Member Since date
   - Total Bookings count
   - Completed Services count
   - Reward Points balance

**Files Involved:**
- Frontend: [`Profile.jsx`](./Frontend/src/pages/customer/Profile.jsx)
- Backend: `users/views.py` - `UserProfileView`, `ChangePasswordView`

**Expected Results:**
- ✅ Profile updates successfully
- ✅ Password change requires current password
- ✅ Reward points display correctly
- ✅ Account stats are accurate

---

### **3️⃣ Vehicle Setup**

**Test Steps:**
1. In Profile page, click **"My Vehicles"** tab
2. Click **"Add Vehicle"** button
3. Fill vehicle form:
   - Registration Number: `KA01AB1234`
   - Make: `Toyota`
   - Model: `Camry`
   - Year: `2022`
   - Color: `Silver`
4. Click **"Add Vehicle"** in modal
5. Vehicle card should appear in grid
6. Test **Edit** and **Delete** buttons on vehicle card

**Files Involved:**
- Frontend: [`Profile.jsx`](./Frontend/src/pages/customer/Profile.jsx) - Vehicle management
- Backend: `customers/views.py` - Vehicle CRUD endpoints

**Expected Results:**
- ✅ Vehicle added successfully
- ✅ Vehicle displays with all details
- ✅ Edit updates vehicle information
- ✅ Delete removes vehicle (with confirmation)
- ✅ Registration number must be unique

---

## ✅ **PHASE 2 — BOOKING FLOW**

### **4️⃣ Create Service Booking**

**Test Steps:**

**Step 1 - Vehicle Selection:**
1. Navigate to `/customer/book`
2. Select existing vehicle from list
3. OR click **"Add New Vehicle"** to create during booking
4. Click **"Next"**

**Step 2 - Service Package:**
1. View available service packages
2. Select one package (e.g., "Basic Service - ₹999")
3. (Optional) Select add-ons (e.g., "AC Service - ₹499")
4. Click **"Next"**

**Step 3 - Schedule:**
1. Select date & time using datetime picker
2. (Optional) Check **"Request Pickup & Drop Service"**
3. If pickup selected, enter pickup address
4. Add additional notes (optional)
5. Click **"Next"**

**Step 4 - Review & Confirm:**
1. Review all booking details:
   - Vehicle information
   - Service package & add-ons
   - Scheduled date/time
   - Pickup address (if applicable)
   - **Total Amount** calculation
2. Click **"Confirm Booking"**
3. Booking should be created with `pending` status

**Files Involved:**
- Frontend: [`BookingFlow.jsx`](./Frontend/src/pages/customer/BookingFlow.jsx)
- Backend: `bookings/views.py` - `BookingViewSet`

**Expected Results:**
- ✅ 4-step wizard navigation works smoothly
- ✅ Validation prevents moving forward without required fields
- ✅ Branch is automatically assigned based on availability
- ✅ Total price = Package Price + Sum(Add-on Prices)
- ✅ Booking created successfully
- ✅ Redirect to Job Tracking with success message
- ✅ Job card will be created later by Admin (not immediately)

**Verification:**
- Admin should see new booking in pending state
- Admin creates job card and assigns technician
- E-Jobcard link becomes visible to customer

---

## ✅ **PHASE 3 — JOB TRACKING**

### **5️⃣ Track Service Job**

**Test Steps:**
1. Navigate to `/customer/track`
2. View all bookings with status badges
3. Use filters:
   - Search by ID, service, or vehicle
   - Filter by status: Pending, Confirmed, In Progress, Completed
4. Click **"Details"** button on any booking
5. View detailed modal with:
   - **Left Column:**
     - Service package details
     - Vehicle information
     - Scheduled datetime
     - Add-ons list
     - Pickup address (if applicable)
     - Total amount
   - **Right Column:**
     - **Timeline visualization** with 5 stages:
       1. Booking Pending (with booking creation time)
       2. Booking Confirmed (when admin confirms)
       3. Technician Assigned (when job card created)
       4. Work In Progress (when technician starts)
       5. Service Completed (when technician completes)
     - **Technician notes** (blue box)
     - Current stage highlighted

6. Test progress bar on booking cards (25%, 50%, 75%, 100%)

**Files Involved:**
- Frontend: [`JobTracking.jsx`](./Frontend/src/pages/customer/JobTracking.jsx)
- Backend: `bookings/views.py`, `jobcards/views.py`

**Expected Results:**
- ✅ Timeline shows accurate progression
- ✅ Status badges display correct color (Yellow=Pending, Blue=Confirmed, Purple=In Progress, Green=Completed)
- ✅ Technician name displays when assigned
- ✅ Photos visible (before/after) once uploaded by technician
- ✅ Technician notes display in blue info box
- ✅ Progress bar updates based on status
- ✅ Cancel button only shown for pending bookings
- ✅ Stats cards show correct counts (Total, In Progress, Completed, Pending)

**What Customer Can See:**
- ✅ Timeline of job progress
- ✅ Before and after photos (uploaded by technician)
- ✅ Technician updates and notes
- ✅ Current status at each stage
- ✅ Estimated completion time

**What Customer CANNOT See:**
- ❌ Parts used details (internal)
- ❌ Invoice details (until payment phase)
- ❌ Branch stock information
- ❌ Technician performance metrics

---

## ✅ **PHASE 4 — PAYMENT**

### **6️⃣ Pay Invoice**

**Test Flow:**

#### **A. View Payment History**
1. Navigate to `/customer/payments`
2. View stats cards:
   - Total Paid amount
   - Pending amount
   - Total Payments count
   - Invoices count
3. Switch between **"Payment History"** and **"Invoices"** tabs
4. Use filters:
   - Search by payment ID, booking ID, or payment method
   - Filter by status: Completed, Pending, Failed, Refunded

#### **B. Payment Process - Multiple Methods**

**Navigate to invoice payment page (when invoice is ready):**

**Method 1: UPI Payment**
1. Select payment method: **UPI**
2. Enter UPI ID: `yourname@paytm`
3. Click **"Pay Now"**
4. System processes UPI payment
5. Status updates to `completed`

**Method 2: Card Payment**
1. Select payment method: **Card**
2. Enter card details:
   - Card Number: `4111111111111111`
   - Cardholder Name: `JOHN DOE`
   - Expiry: `12/25`
   - CVV: `123`
3. Click **"Pay Now"**
4. Payment processed via Stripe

**Method 3: Wallet Payment**
1. Ensure wallet has sufficient balance
2. Check **"Use Wallet Balance"** checkbox
3. System shows wallet deduction amount
4. If wallet covers full amount, no other payment needed
5. If partial, select additional payment method for remaining amount
6. Click **"Pay Now"**

**Method 4: Gift Card Payment**
1. Enter gift card code in **"Use Gift Card"** section
2. Click **"Apply"**
3. System validates code and shows remaining value
4. Gift card amount deducted from total
5. Pay remaining amount (if any) using another method

**Method 5: Apply Coupon**
1. Enter coupon code in **"Apply Coupon Code"** section
2. Click **"Apply"**
3. System validates:
   - Coupon is active
   - Not expired
   - Minimum purchase amount met
   - Usage limits not exceeded
4. Discount applied to total
5. Green success message shows discount amount

**Combined Payment Example:**
```
Invoice Amount:        ₹5,000
Coupon (SAVE20):       -₹1,000 (20% off)
Gift Card:             -₹500
Wallet Balance:        -₹1,500
----------------------------------
Remaining to Pay (UPI): ₹2,000
```

#### **C. Download Invoice**
1. In **"Invoices"** tab, click **"Download PDF"** button
2. PDF invoice downloads with:
   - Invoice number
   - Customer details
   - Vehicle details
   - Service breakdown
   - Parts used (if any)
   - Tax calculations
   - Total amount
   - Payment method
   - Timestamp

**Files Involved:**
- Frontend: [`Payments.jsx`](./Frontend/src/pages/customer/Payments.jsx)
- Frontend: **NEW** [`PayInvoice.jsx`](./Frontend/src/pages/customer/PayInvoice.jsx)
- Backend: [`payments/views.py`](./Backend/payments/views.py)
- Backend: **NEW** [`payments/wallet_models.py`](./Backend/payments/wallet_models.py)
- Backend: [`billing/models.py`](./Backend/billing/models.py)

**Expected Results:**
- ✅ Multiple payment methods work correctly
- ✅ UPI payment integration functional
- ✅ Card payment via Stripe successful
- ✅ Wallet balance deducts correctly
- ✅ Gift card validates and applies value
- ✅ Coupon codes validate and apply discounts
- ✅ Combined payments calculate correctly
- ✅ Payment history displays all transactions
- ✅ Invoice PDF downloads successfully
- ✅ Transaction IDs are unique and trackable
- ✅ Status updates to `completed` on successful payment
- ✅ Booking status updates to `confirmed` after payment

**Payment Models:**
- `Payment` - Main payment records
- `Wallet` - Customer digital wallet
- `WalletTransaction` - Wallet transaction history
- `GiftCard` - Gift card system
- `Coupon` - Discount coupon system
- `CouponUsage` - Track coupon redemptions

---

## ✅ **PHASE 5 — FEEDBACK**

### **7️⃣ Submit Feedback & Rating**

**Test Steps:**
1. Navigate to `/customer/feedback`
2. View stats:
   - Total Reviews submitted
   - Average Rating across all feedback
   - Pending Feedback count (completed bookings without feedback)

3. **Submit New Feedback:**
   - Select completed service from dropdown
   - Click stars to rate (1-5 stars):
     - 1 star = Poor
     - 2 stars = Fair
     - 3 stars = Good
     - 4 stars = Very Good
     - 5 stars = Excellent
   - Select category:
     - Service Quality
     - Staff Behavior
     - Pricing
     - Timeliness
     - Facility
     - Other
   - Write comment (required): Describe experience
   - Add suggestions (optional): How to improve
   - Click **"Submit Feedback"**

4. **View Feedback History:**
   - Each feedback card shows:
     - Booking number and vehicle
     - Service name and date
     - Star rating (visual)
     - Category badge
     - Your comment
     - Suggestions (if provided)
     - Status badge (Pending Review, Reviewed, Resolved)
     - Admin response (if replied)
     - Helpful count

5. **Test Validations:**
   - Cannot submit feedback for same booking twice
   - Only completed bookings appear in dropdown
   - Comment is required (minimum length)
   - Rating must be selected

**Files Involved:**
- Frontend: [`Feedback.jsx`](./Frontend/src/pages/customer/Feedback.jsx)
- Backend: `feedback/views.py` - Feedback CRUD operations

**Expected Results:**
- ✅ Only completed bookings without existing feedback appear
- ✅ Star rating interactive and visual
- ✅ Category selection works
- ✅ Comment validation enforces required field
- ✅ Feedback submission successful
- ✅ Feedback appears in history immediately
- ✅ Average rating calculates correctly
- ✅ Admin responses display when available
- ✅ Helpful tips section provides guidance
- ✅ Cannot submit duplicate feedback for same booking

**Feedback Flow:**
1. Customer submits feedback → Status: **Pending Review**
2. Admin reviews feedback → Status: **Reviewed**
3. Admin responds to feedback → Status: **Resolved**
4. Customer sees admin response in green box

---

## 🔧 **ADDITIONAL FEATURES**

### **Reward Points System**
- Customers earn points on completed bookings
- Points can be redeemed for discounts
- Displayed on profile page
- Tracked in `Customer` model

### **Membership Levels**
- Basic (default)
- Silver (10+ bookings)
- Gold (25+ bookings)
- Platinum (50+ bookings)
- Different discount rates per level

### **Notifications**
- Email notifications on:
  - Booking confirmation
  - Technician assignment
  - Job status updates
  - Job completion
  - Payment received
  - Admin feedback response

---

## 📊 **TESTING CHECKLIST**

### **Phase 1 - Account**
- [ ] Registration form validation
- [ ] OTP sent to email
- [ ] OTP verification success
- [ ] OTP verification failure (wrong code)
- [ ] Profile update
- [ ] Password change
- [ ] Vehicle CRUD operations
- [ ] Account statistics accuracy

### **Phase 2 - Booking**
- [ ] 4-step wizard navigation
- [ ] Vehicle selection (existing)
- [ ] Vehicle creation (new during booking)
- [ ] Package selection
- [ ] Add-ons selection (optional)
- [ ] Date/time picker
- [ ] Pickup service checkbox
- [ ] Total price calculation
- [ ] Booking creation
- [ ] Success redirect

### **Phase 3 - Tracking**
- [ ] Job list display
- [ ] Search functionality
- [ ] Status filter
- [ ] Progress bar accuracy
- [ ] Timeline visualization
- [ ] Technician info display
- [ ] Photos display (before/after)
- [ ] Technician notes display
- [ ] Cancel booking (pending only)
- [ ] Stats cards accuracy

### **Phase 4 - Payment**
- [ ] Payment history display
- [ ] Invoice list display
- [ ] Search and filter
- [ ] UPI payment
- [ ] Card payment
- [ ] Wallet payment
- [ ] Gift card application
- [ ] Coupon application
- [ ] Combined payments
- [ ] Invoice PDF download
- [ ] Payment status updates
- [ ] Transaction ID generation

### **Phase 5 - Feedback**
- [ ] Completed bookings filter
- [ ] Star rating (1-5)
- [ ] Category selection
- [ ] Comment submission
- [ ] Suggestions (optional)
- [ ] Feedback history display
- [ ] Admin response display
- [ ] Average rating calculation
- [ ] Duplicate prevention
- [ ] Stats accuracy

---

## 🐛 **KNOWN LIMITATIONS**

1. **Branch Selection**: Currently automatic, not manual selection by customer
2. **Real Payment Gateways**: Stripe integration requires API keys configuration
3. **SMS OTP**: Email OTP works, SMS requires Twilio configuration
4. **Photo Upload**: Technicians upload photos, customers view only
5. **Job Card Creation**: Done by Admin, not automatic on booking

---

## 🚀 **SUCCESS CRITERIA**

✅ **All 5 phases complete end-to-end**
✅ **No breaking errors in console**
✅ **Data persists correctly in database**
✅ **User roles enforced (customer cannot access admin/technician features)**
✅ **Payment calculations accurate**
✅ **Email notifications sent**
✅ **Timeline tracking accurate**
✅ **Feedback system functional**

---

## 📝 **TEST DATA**

### **Sample Customer**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "password": "TestPass123!",
  "role": "customer"
}
```

### **Sample Vehicle**
```json
{
  "registration_number": "KA01AB1234",
  "make": "Toyota",
  "model": "Camry",
  "year": 2022,
  "color": "Silver"
}
```

### **Sample Coupon**
```json
{
  "code": "SAVE20",
  "discount_type": "percentage",
  "discount_value": 20,
  "valid_from": "2024-01-01",
  "valid_until": "2024-12-31",
  "min_purchase_amount": 500
}
```

### **Sample Gift Card**
```json
{
  "code": "GIFT500",
  "value": 500,
  "remaining_value": 500,
  "expiry_date": "2024-12-31"
}
```

---

## 🎯 **CONCLUSION**

This comprehensive testing guide covers all customer-facing functionality. Follow each phase sequentially for best results. Report any issues with:
- Phase number
- Step number
- Expected vs Actual behavior
- Screenshots/console errors

**Happy Testing! 🚀**
