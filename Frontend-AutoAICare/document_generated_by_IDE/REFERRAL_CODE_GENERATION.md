# Referral Code Generation - Walk-In Booking Flow

## 🔄 **How Referral Codes Are Generated**

### **Automatic Generation Timeline**

```
New Customer Created (Walk-in Booking)
    ↓
❌ NO referral code yet
    ↓
Customer completes FIRST service
    ↓
Job Card status → "delivered"
    ↓
✅ Backend signal triggers
    ↓
✅ Referral code AUTO-GENERATED
    ↓
Customer can now share code!
```

---

## 📋 **Step-by-Step Process**

### **1. Customer Account Creation**
**When:** Admin creates walk-in booking for new customer

**What Happens:**
- ✅ Customer account created
- ✅ Password generated and shown to admin
- ❌ **NO referral code yet**

**Why?**
- Referral codes are only for customers who have actually used the service
- Prevents spam/fake accounts from getting referral codes
- Ensures only real, paying customers can refer others

---

### **2. First Service Completion**
**When:** Customer's first job is marked as "delivered"

**What Happens:**
- ✅ Backend signal detects first job completion
- ✅ Auto-generates unique referral code (e.g., `K3NEW7744`)
- ✅ Code format: First letter of name + random digits + last 4 of phone
- ✅ Code saved to database
- ✅ Customer can now access it via their dashboard

**Backend Signal:**
```python
@receiver(post_save, sender=JobCard)
def create_referral_code_on_first_job(sender, instance, **kwargs):
    if instance.status == 'delivered':
        customer = instance.booking.customer
        
        # Check if customer already has a code
        if not ReferralCode.objects.filter(customer=customer).exists():
            # Check if this is their first completed job
            completed_jobs = JobCard.objects.filter(
                booking__customer=customer,
                status='delivered'
            ).count()
            
            if completed_jobs == 1:  # First job!
                # Generate code
                code = generate_referral_code(customer)
                ReferralCode.objects.create(
                    customer=customer,
                    code=code,
                    is_active=True
                )
```

---

### **3. Customer Accesses Code**
**When:** Customer logs into their account

**Where:** `/customer/referrals`

**What They See:**
- ✅ Their unique referral code (e.g., `K3NEW7744`)
- ✅ Copy button
- ✅ WhatsApp share button
- ✅ Referral statistics
- ✅ Reward information

---

## 🎯 **Complete Walk-In Flow Example**

### **Scenario: New Customer "New" with phone 7744112255**

#### **Day 1: Booking Creation**
```
Admin creates walk-in booking
    ↓
Customer Details:
  - Name: New
  - Phone: 7744112255
  - Email: -
  - Referral Code: (empty - they weren't referred)
    ↓
Account created ✅
Password: New2255 ✅
Referral Code: ❌ NOT YET
```

**Password Modal Shows:**
```
✅ Name: New
✅ Phone: 7744112255
✅ Password: New2255
🎁 Referral Code: Will be generated after first service completion
```

#### **Day 2: Service Completion**
```
Service completed
    ↓
Job Card status → "delivered"
    ↓
Backend signal triggers
    ↓
Referral code generated: K3NEW7744 ✅
```

#### **Day 3: Customer Shares Code**
```
Customer logs in
    ↓
Goes to /customer/referrals
    ↓
Sees code: K3NEW7744
    ↓
Shares with friend
    ↓
Friend uses code during signup/booking
    ↓
Both get rewards when friend completes first job! 🎉
```

---

## 💡 **Why This Design?**

### **Prevents Abuse**
- ❌ Can't create fake accounts just to get referral codes
- ✅ Only real customers who paid for service get codes
- ✅ Ensures quality referrals

### **Encourages Loyalty**
- Customer must complete first service
- Creates positive first experience before they can refer
- They'll only refer if they're satisfied

### **Automatic & Seamless**
- No manual admin intervention needed
- Code appears automatically in customer dashboard
- Customer gets notification (if notifications enabled)

---

## 📱 **Where Customers See Their Code**

### **Customer Dashboard** (`/customer/referrals`)

**Before First Job:**
```
┌─────────────────────────────────────┐
│  Complete Your First Job to Get     │
│  Started!                            │
│                                      │
│  Once you complete your first        │
│  service, you'll receive a unique    │
│  referral code to share with friends.│
│                                      │
│  [Create Custom Code] (optional)     │
└─────────────────────────────────────┘
```

**After First Job:**
```
┌─────────────────────────────────────┐
│  Your Referral Code                  │
│                                      │
│       K3NEW7744                      │
│                                      │
│  [Copy Code]  [Share on WhatsApp]    │
│                                      │
│  Used 0 times                        │
└─────────────────────────────────────┘
```

---

## 🔧 **Admin View**

### **During Booking Creation**
Admin sees referral code field for NEW customers:
```
┌─────────────────────────────────────┐
│ Customer Details                     │
│                                      │
│ Name: New                            │
│ Phone: 7744112255                    │
│ Email: (optional)                    │
│ Referral Code: [        ] (optional) │
│   ↑ If THIS customer was referred    │
└─────────────────────────────────────┘
```

### **After Account Creation**
Password modal shows:
```
┌─────────────────────────────────────┐
│ Customer Account Created             │
│                                      │
│ Name: New                            │
│ Phone: 7744112255                    │
│ Password: New2255 [Copy]             │
│                                      │
│ 🎁 Referral Code: Will be generated  │
│    after first service completion    │
└─────────────────────────────────────┘
```

---

## 📊 **Tracking Referral Code Status**

### **Check if Customer Has Code**

**API Endpoint:** `GET /api/customers/referral-codes/my_code/`

**Response (No Code Yet):**
```json
{
  "status": 404,
  "message": "No referral code found. Complete your first job to get one!"
}
```

**Response (Code Generated):**
```json
{
  "id": 1,
  "customer": 123,
  "code": "K3NEW7744",
  "times_used": 0,
  "is_active": true,
  "created_at": "2026-02-03T21:40:00Z"
}
```

---

## 🎁 **Custom Code Option**

Customers CAN create a custom code even before first job:

**In Customer Dashboard:**
```
┌─────────────────────────────────────┐
│  Complete Your First Job to Get     │
│  Started!                            │
│                                      │
│  [Create Custom Referral Code]       │
│                                      │
│  ↓ (if clicked)                      │
│                                      │
│  Enter custom code: [NEWCAR2026]     │
│  [Create Code]  [Cancel]             │
└─────────────────────────────────────┘
```

**This allows:**
- Customers to reserve their preferred code
- Easier to remember codes (e.g., "NEWCAR2026" vs "K3NEW7744")
- Still requires first job completion to use it

---

## ✅ **Summary**

### **For New Customer "New" (7744112255)**

| Event | Referral Code Status |
|-------|---------------------|
| Account created | ❌ No code |
| Password modal shown | 🎁 Info: "Will be generated after first service" |
| First job completed | ✅ Code auto-generated: K3NEW7744 |
| Customer logs in | ✅ Can see and share code |
| Friend uses code | ✅ Both get rewards when friend completes job |

---

## 🚀 **Next Steps for Admin**

### **When Creating Walk-In Booking:**

1. **If customer mentions they were referred:**
   - Ask for the referral code
   - Enter it in the "Referral Code" field
   - This links them to the referrer

2. **After creating account:**
   - Share password with customer
   - Inform them: "You'll get your own referral code after completing this service"
   - Encourage them to log in and check their dashboard

3. **After first service:**
   - Customer automatically gets code
   - No admin action needed!
   - Customer can start referring friends

---

## 📝 **FAQ**

**Q: Can I manually create a referral code for a customer?**
A: No, codes are auto-generated by the system to ensure uniqueness and prevent conflicts.

**Q: What if customer wants a specific code?**
A: They can create a custom code via their dashboard (if available).

**Q: Can I see a customer's referral code in admin?**
A: Yes, in the customer details or referral management section.

**Q: What if the signal doesn't trigger?**
A: Check that the job card status is exactly "delivered" and that it's their first completed job.

**Q: Can a customer have multiple referral codes?**
A: No, one customer = one referral code (but they can customize it).

---

## 🎉 **Benefits of This Approach**

1. **Automatic** - No manual work needed
2. **Fair** - Only real customers get codes
3. **Scalable** - Works for thousands of customers
4. **Trackable** - Full audit trail in database
5. **Flexible** - Customers can customize if desired

The system is designed to reward genuine customers who complete services, ensuring high-quality referrals and preventing abuse! 🚀
