# Referral Code Integration - Admin Booking Flow

## ✅ Implementation Complete

### **Changes Made**

#### 1. **CreateWalkInBooking.jsx** (`src/pages/admin/CreateWalkInBooking.jsx`)
- ✅ Added `referral_code` field to `customerData` state
- ✅ Included `referral_code` in booking submission data (only for new customers)

#### 2. **CustomerSelection.jsx** (`src/pages/admin/components/walkin/CustomerSelection.jsx`)
- ✅ Added "Referral Code (Optional)" input field
- ✅ Field only shows for NEW customers (when `customerData.id` is null)
- ✅ Auto-converts input to uppercase
- ✅ Includes helper text: "If referred by another customer"

---

## 📋 **How It Works**

### **For Admin Creating Walk-In Booking:**

1. **Search for Existing Customer**
   - Admin searches by phone or vehicle number
   - If customer exists, select them (no referral code needed)

2. **Create New Customer**
   - If customer doesn't exist, admin fills in:
     - Full Name (required)
     - Phone Number (required)
     - Email (optional)
     - **Referral Code (optional)** ← NEW FIELD

3. **Referral Code Field**
   - Only visible when creating a NEW customer
   - Optional field
   - Automatically converts to uppercase
   - Sent to backend with customer data

4. **Backend Processing**
   - Backend validates the referral code
   - Creates referral relationship if code is valid
   - Rewards will be processed when the new customer completes their first job

---

## 🎯 **User Flow**

```
Admin creates booking for new customer
    ↓
Enters customer details (name, phone, email)
    ↓
Optionally enters referral code (e.g., "K3JOH1234")
    ↓
Completes booking creation
    ↓
Backend validates code and creates referral link
    ↓
When new customer completes first job:
    ↓
Both referrer and referee get rewards automatically!
```

---

## 📱 **UI Location**

**Path:** `/admin/bookings/create-walk-in`

**Section:** Customer Information Card
- After "Email (Optional)" field
- Only visible for new customers
- Grid layout (2 columns on desktop)

---

## 🔧 **Technical Details**

### **State Management**
```javascript
const [customerData, setCustomerData] = useState({
  id: null,
  name: '',
  phone: '',
  email: '',
  referral_code: ''  // NEW
});
```

### **Data Submission**
```javascript
customer: {
  ...(customerData.id ? { id: customerData.id } : {
    name: customerData.name,
    phone: customerData.phone,
    email: customerEmail,
    ...(customerData.referral_code && { referral_code: customerData.referral_code })
  })
}
```

### **Conditional Rendering**
```javascript
{!customerData.id && (
  <Input
    label="Referral Code (Optional)"
    placeholder="Enter referral code"
    value={customerData.referral_code}
    onChange={(e) =>
      setCustomerData({
        ...customerData,
        referral_code: e.target.value.toUpperCase(),
      })
    }
    helperText="If referred by another customer"
  />
)}
```

---

## ✨ **Features**

1. **Smart Visibility**
   - Only shows for new customers
   - Hidden for existing customers (they already have/don't have a referral)

2. **Auto-Uppercase**
   - Converts input to uppercase automatically
   - Matches backend format (e.g., K3JOH1234)

3. **Optional Field**
   - Not required - admin can skip if customer wasn't referred
   - No validation errors if left empty

4. **Helper Text**
   - Clear guidance: "If referred by another customer"
   - Helps admin understand when to use this field

---

## 🔗 **Integration Points**

### **Frontend → Backend**
- Field sent in `customer` object during booking creation
- Only included if value is provided (conditional spread)

### **Backend Processing**
- Validates referral code exists and is active
- Creates `Referral` record linking referrer and referee
- Sets status to 'pending'
- Rewards processed automatically when referee completes first job

---

## 📊 **Complete Referral System Flow**

### **1. Customer Gets Referral Code**
- Completes first job → Auto-generates code (e.g., K3JOH1234)
- Or creates custom code via customer dashboard

### **2. Customer Shares Code**
- Via WhatsApp, SMS, or word-of-mouth
- Friend comes to shop for service

### **3. Admin Creates Booking**
- Searches for customer (not found - new customer)
- Fills in customer details
- **Enters referral code provided by friend**
- Creates booking

### **4. Backend Validates**
- Checks if code exists
- Checks if code is active
- Creates referral link
- Status: 'pending'

### **5. Service Completion**
- New customer's job is completed
- Backend signal triggers
- Referral status → 'completed'
- Rewards processed automatically
- Both customers get wallet credits!

---

## 🎉 **Benefits**

1. **Seamless Integration**
   - Works with existing booking flow
   - No disruption to admin workflow

2. **User-Friendly**
   - Simple optional field
   - Clear labeling and helper text

3. **Automatic Processing**
   - No manual intervention needed
   - Rewards credited automatically

4. **Flexible**
   - Works for walk-in customers
   - Works for phone bookings
   - Works for online bookings (via signup form)

---

## 📝 **Testing Checklist**

### **Admin Side**
- [ ] Create booking for new customer without referral code
- [ ] Create booking for new customer with valid referral code
- [ ] Create booking for new customer with invalid referral code
- [ ] Create booking for existing customer (field should not show)
- [ ] Verify uppercase conversion works
- [ ] Verify field is optional (can be left empty)

### **Backend Validation**
- [ ] Valid code creates referral link
- [ ] Invalid code shows error message
- [ ] Empty code is ignored (no error)
- [ ] Referral status is 'pending' initially

### **Reward Processing**
- [ ] New customer completes first job
- [ ] Referral status changes to 'completed' then 'rewarded'
- [ ] Both customers receive wallet credits
- [ ] Amounts match configured settings

---

## 🚀 **Ready to Use!**

The referral system is now fully integrated into the admin booking flow. Admins can easily add referral codes when creating bookings for new customers, and the system will automatically handle all the reward processing.

**Next Steps:**
1. Test the booking flow with referral codes
2. Train staff on how to ask for and enter referral codes
3. Monitor referral statistics in admin dashboard
4. Adjust reward amounts as needed in `/admin/referrals`
