# Testing Dual-Mode WhatsApp System

## 🧪 Test Plan

### Test 1: Enable Manual Mode

**Steps:**

1. Login as Super Admin or Company Admin
2. Go to **Settings** → **WhatsApp Settings** tab
3. Toggle **Enable WhatsApp Notifications** to ON
4. Verify **Manual (Click-to-Send)** is selected by default
5. Click **Save WhatsApp Settings**

**Expected Result:**
✅ Settings saved successfully
✅ WhatsApp mode is set to "manual"

---

### Test 2: Trigger a Notification (Manual Mode)

**Option A: Create a Booking**

1. Go to **Bookings** → **Create New Booking**
2. Fill in customer details and select a service
3. Set status to "Confirmed"
4. Save the booking

**Option B: Complete a Job Card**

1. Go to **Job Cards**
2. Select an existing job card
3. Change status to "Completed"
4. Save

**Expected Result:**
✅ Notification triggered
✅ Pending WhatsApp message created
✅ No automatic send (manual mode)

---

### Test 3: View Pending Messages

**Steps:**

1. Click **Pending WhatsApp** in the sidebar (System section)
   - Or navigate to `/admin/whatsapp-pending`
2. View the pending messages list

**Expected Result:**
✅ See statistics (Pending count, Sent Manual count, Total)
✅ See message cards with:

- Customer name & phone
- Message preview
- Template name
- "Send via WhatsApp" button

---

### Test 4: Send Manual WhatsApp Message

**Steps:**

1. On the Pending WhatsApp Messages page
2. Click **"Send via WhatsApp"** button on any message
3. WhatsApp Web/App should open in a new tab
4. Review the pre-filled message
5. Click Send in WhatsApp
6. Return to the Pending Messages page

**Expected Result:**
✅ WhatsApp opens with pre-filled message
✅ Message is sent successfully
✅ Alert shows "Message marked as sent!"
✅ Message removed from pending list
✅ Statistics updated (Pending -1, Sent Manual +1)

---

### Test 5: View WhatsApp Logs

**Steps:**

1. Click **WhatsApp Logs** in the sidebar
   - Or navigate to `/admin/whatsapp-logs`
2. View the message logs

**Expected Result:**
✅ See all WhatsApp messages (manual and automated)
✅ Manual messages show status "SENT_MANUAL"
✅ Statistics dashboard shows correct counts
✅ Can filter by status

---

### Test 6: Switch to Automated Mode

**Steps:**

1. Go to **Settings** → **WhatsApp Settings**
2. Select **⚡ Automated (Cloud API)**
3. Enter API credentials:

   ```json
   {
     "provider": "meta",
     "access_token": "YOUR_TOKEN",
     "phone_number_id": "YOUR_PHONE_ID",
     "business_account_id": "YOUR_BUSINESS_ID"
   }
   ```

4. Enter WhatsApp Business Phone: `+919876543210`
5. Save settings

**Expected Result:**
✅ Settings saved
✅ Mode changed to "api"
✅ API fields visible
✅ Manual mode fields hidden

---

### Test 7: Trigger Notification (Automated Mode)

**Steps:**

1. Create another booking or complete a job
2. Check WhatsApp Logs

**Expected Result:**
✅ Message sent automatically via API
✅ No pending message created
✅ Status shows "SENT" or "DELIVERED"
✅ No manual intervention needed

---

### Test 8: Switch Back to Manual Mode

**Steps:**

1. Go to Settings → WhatsApp Settings
2. Select **📱 Manual (Click-to-Send)**
3. Save

**Expected Result:**
✅ Mode changed back to "manual"
✅ New notifications create pending messages
✅ Old manual messages still visible in logs

---

## 🐛 Troubleshooting

### Issue: Pending messages not appearing

**Check:**

- [ ] WhatsApp notifications enabled in settings
- [ ] Mode is set to "manual"
- [ ] Notification was triggered (booking confirmed, job completed, etc.)
- [ ] Check browser console for errors

**Fix:**

```bash
# Check backend logs
python manage.py runserver

# Check if notification service is working
# Look for logs when triggering notifications
```

---

### Issue: WhatsApp doesn't open

**Check:**

- [ ] Phone number is in E.164 format (+919876543210)
- [ ] Browser allows popups
- [ ] WhatsApp Web is accessible

**Fix:**

- Copy the wa.me link manually
- Open in incognito/private window
- Try different browser

---

### Issue: Message not marked as sent

**Check:**

- [ ] Clicked "Send via WhatsApp" button (not just opened link)
- [ ] API endpoint `/api/notify/whatsapp/pending/{id}/mark_sent/` is accessible
- [ ] User has permission

**Fix:**

```bash
# Check API endpoint
curl -X POST http://localhost:8000/api/notify/whatsapp/pending/1/mark_sent/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Issue: Settings not saving

**Check:**

- [ ] User is Super Admin or Company Admin
- [ ] All required fields filled
- [ ] No validation errors

**Fix:**

- Check browser console for errors
- Check backend logs for validation errors
- Verify company settings exist

---

## 📋 Quick Test Checklist

### Manual Mode

- [ ] Enable WhatsApp in settings
- [ ] Mode defaults to "manual"
- [ ] Trigger notification (booking/job)
- [ ] Pending message appears
- [ ] Click "Send via WhatsApp"
- [ ] WhatsApp opens with message
- [ ] Send in WhatsApp
- [ ] Message marked as sent
- [ ] Statistics updated
- [ ] Message appears in logs

### Automated Mode

- [ ] Switch to API mode
- [ ] Enter API credentials
- [ ] Save settings
- [ ] Trigger notification
- [ ] Message sends automatically
- [ ] No pending message created
- [ ] Delivery status tracked
- [ ] Message appears in logs

### UI/UX

- [ ] Sidebar links work
- [ ] Mode selector looks good
- [ ] Pending messages page loads
- [ ] WhatsApp logs page loads
- [ ] Statistics display correctly
- [ ] Mobile responsive

---

## 🎯 Sample Test Data

### Test Customer

```
Name: Test Customer
Phone: +919876543210
Email: test@example.com
```

### Test Booking

```
Service: Oil Change
Date: Today
Time: 10:00 AM
Status: Confirmed
```

### Test Message Template

```
Template: booking_confirmation
Message: "Hi {{customer_name}}, your booking for {{service_name}} on {{date}} is confirmed!"
```

---

## 📊 Expected Behavior Summary

| Action | Manual Mode | Automated Mode |
|--------|-------------|----------------|
| Trigger notification | Creates pending message | Sends immediately |
| Staff action | Must click to send | None required |
| WhatsApp opens | Yes, via wa.me link | No |
| Delivery tracking | Manual confirmation | Automatic |
| Status | PENDING_MANUAL → SENT_MANUAL | QUEUED → SENT → DELIVERED |
| Cost | Free | API costs |

---

## ✅ Success Criteria

**Manual Mode Working:**

- ✅ Pending messages appear
- ✅ WhatsApp opens with pre-filled message
- ✅ Messages marked as sent
- ✅ Statistics accurate

**Automated Mode Working:**

- ✅ Messages send automatically
- ✅ Delivery tracked
- ✅ No pending messages
- ✅ API integration working

**UI/UX:**

- ✅ Sidebar navigation works
- ✅ Mode selector intuitive
- ✅ Pages load correctly
- ✅ Responsive design

---

## 🚀 Ready to Test

Start with **Test 1** and work through each test sequentially. The system should work perfectly in both modes!

**Need help?** Check the troubleshooting section or review the documentation:

- `WHATSAPP_DUAL_MODE_SUMMARY.md`
- `WHATSAPP_DUAL_MODE_QUICK_START.md`
