# WhatsApp Integration Setup Guide

## Overview

This guide will help you set up WhatsApp messaging for your AutoAICare companies using Meta Cloud API.

## Prerequisites

- Meta Business Account
- WhatsApp Business Account
- Phone number for WhatsApp Business (one per company)
- Access to Meta Business Manager

---

## Step 1: Set Up Meta WhatsApp Business Account

### 1.1 Create Meta Business Account

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Click "Create Account"
3. Follow the setup wizard

### 1.2 Set Up WhatsApp Business Account

1. In Meta Business Manager, go to **Business Settings**
2. Click **Accounts** → **WhatsApp Accounts**
3. Click **Add** → **Create a WhatsApp Business Account**
4. Follow the setup process:
   - Add your business phone number
   - Verify the phone number (via SMS or call)
   - Complete business verification

### 1.3 Get API Credentials

1. In Meta Business Manager, go to your WhatsApp Business Account
2. Click **API Setup**
3. Note down:
   - **Phone Number ID** (found under "Phone Number")
   - **WhatsApp Business Account ID**
   - **Access Token** (temporary or permanent)

#### Creating a Permanent Access Token

1. Go to **System Users** in Business Settings
2. Create a new system user or use existing
3. Assign the system user to your WhatsApp Business Account
4. Generate a token with these permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. **Save this token securely** - you won't see it again!

---

## Step 2: Configure Company Settings in Django

### 2.1 Access Django Admin

1. Navigate to: `http://localhost:8000/admin/` (or your production URL)
2. Login with superuser credentials

### 2.2 Configure Company WhatsApp Settings

1. Go to **Companies** → **Company Settings**
2. Select the company you want to configure
3. Enable WhatsApp:
   - Check ✅ **Enable whatsapp notifications**
   - Select **whatsapp_provider**: `Meta Cloud API`
   - Set **whatsapp_business_phone**: Your WhatsApp number (e.g., `+919876543210`)

4. Add **whatsapp_credentials** (JSON format):

   ```json
   {
     "provider": "meta",
     "access_token": "YOUR_PERMANENT_ACCESS_TOKEN",
     "phone_number_id": "YOUR_PHONE_NUMBER_ID",
     "business_account_id": "YOUR_BUSINESS_ACCOUNT_ID"
   }
   ```

5. Click **Save**

---

## Step 3: Create WhatsApp Message Templates

### 3.1 Using Management Command (Recommended)

Run this command to create sample templates:

```bash
cd d:\Product\AutoAICare\Backend-AutoAICare
python manage.py create_whatsapp_templates --company YOUR_COMPANY_SLUG
```

This creates templates for:

- Booking confirmed
- Job started
- Job completed
- Invoice created
- Payment success
- Appointment approved
- Feedback request

### 3.2 Manual Template Creation

1. Go to Django Admin → **Notify** → **WhatsApp Templates**
2. Click **Add WhatsApp Template**
3. Fill in:
   - **Company**: Select your company
   - **Template name**: Lowercase with underscores (e.g., `booking_confirmed`)
   - **Notification type**: Must match notification types in system
   - **Category**: Usually `TRANSACTIONAL`
   - **Language**: `en` for English
   - **Body text**: Use `{{1}}`, `{{2}}` for variables
   - **Variable mapping**: Map numbers to context variables

     ```json
     {
       "1": "customer_name",
       "2": "booking_id",
       "3": "service_date"
     }
     ```

4. Click **Save**

---

## Step 4: Submit Templates to WhatsApp for Approval

### 4.1 Via Meta Business Manager

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to **WhatsApp Manager** → **Message Templates**
3. Click **Create Template**
4. For each template created in Django:
   - **Name**: Use exact same name as in Django (e.g., `booking_confirmed`)
   - **Category**: Select `TRANSACTIONAL` (or as configured)
   - **Language**: Select `English`
   - **Header** (optional): Copy from Django template
   - **Body**: Copy from Django template (use `{{1}}`, `{{2}}` for variables)
   - **Footer** (optional): Copy from Django template
   - **Buttons** (optional): Configure if needed
5. Click **Submit**

### 4.2 Wait for Approval

- Approval typically takes **24-48 hours**
- You'll receive email notification when approved
- Check status in Meta Business Manager

### 4.3 Update Django After Approval

Once approved:

1. Go to Django Admin → **WhatsApp Templates**
2. For each approved template:
   - Set **Approval status**: `APPROVED`
   - Set **Approved at**: Current date/time
   - Optionally add **Whatsapp template id** from Meta
3. Click **Save**

---

## Step 5: Test WhatsApp Integration

### 5.1 Test Sending (Manual)

You can test by creating a booking or triggering any notification:

```python
from notify.notification_service import NotificationService
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(phone='+919876543210')  # Your test number

NotificationService.send(
    notification_type='booking_confirmed',
    recipients=[user],
    title='Booking Confirmed',
    message='Your booking has been confirmed',
    channels=['whatsapp'],
    context_data={
        'customer_name': user.name,
        'booking_id': '123',
        'service_date': '2026-02-15'
    }
)
```

### 5.2 Check Logs

1. Go to Django Admin → **Notify** → **WhatsApp Message Logs**
2. Check the latest entry:
   - **Status**: Should be `SENT` if successful
   - **Error message**: Check if status is `FAILED`
3. Verify message received on WhatsApp

---

## Step 6: Production Deployment

### 6.1 Environment Variables (Optional)

For default/shared credentials, you can add to `.env`:

```env
# WhatsApp Configuration (Default)
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
```

### 6.2 Security Considerations

- **Never commit credentials to git**
- Use environment variables or encrypted storage
- Rotate access tokens periodically
- Use system users with minimal permissions

### 6.3 Monitoring

- Monitor **WhatsApp Message Logs** for failures
- Set up alerts for high failure rates
- Check Meta Business Manager for API usage limits

---

## Troubleshooting

### Issue: "WhatsApp not configured for this company"

**Solution**:

- Check `enable_whatsapp_notifications` is enabled in Company Settings
- Verify `whatsapp_credentials` JSON is properly formatted

### Issue: "No approved WhatsApp template for [notification_type]"

**Solution**:

- Create template in Django for that notification type
- Submit to WhatsApp for approval
- Mark as APPROVED in Django after approval

### Issue: "Invalid phone number"

**Solution**:

- Ensure phone number is in E.164 format (e.g., `+919876543210`)
- Check user has phone number in their profile
- Verify phone number is WhatsApp-enabled

### Issue: Message status stuck at "QUEUED"

**Solution**:

- Check Celery is running: `celery -A config worker -l info`
- Check Celery logs for errors
- Verify Meta API credentials are correct

### Issue: "Template not found" error from WhatsApp API

**Solution**:

- Template name in Django must exactly match name in Meta
- Template must be approved in Meta Business Manager
- Wait a few minutes after approval for propagation

---

## Webhook Setup (Optional - For Delivery Status)

To track delivery and read status:

1. In Meta Business Manager, go to **WhatsApp** → **Configuration**
2. Add webhook URL: `https://yourdomain.com/api/notify/whatsapp/webhook/`
3. Subscribe to events:
   - `messages` (for delivery status)
   - `message_status` (for read receipts)
4. Implement webhook handler in Django (future enhancement)

---

## Next Steps

1. ✅ Set up Meta WhatsApp Business Account
2. ✅ Configure company settings in Django
3. ✅ Create and submit templates
4. ✅ Wait for approval
5. ✅ Test integration
6. ✅ Monitor logs
7. 🔄 Expand to more notification types as needed

---

## Support Resources

- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)

---

## Quick Reference: Template Variable Mapping

Common context variables available in notifications:

| Variable | Description | Example |
|----------|-------------|---------|
| `customer_name` | Customer's name | "John Doe" |
| `booking_id` | Booking ID | "123" |
| `job_id` | Job card ID | "456" |
| `invoice_number` | Invoice number | "INV-001" |
| `service_date` | Service date | "2026-02-15" |
| `vehicle_info` | Vehicle details | "Honda City" |
| `total_amount` | Invoice total | "5000" |
| `service_name` | Service name | "Full Detailing" |

Check `notify/signals.py` for complete context data for each notification type.
