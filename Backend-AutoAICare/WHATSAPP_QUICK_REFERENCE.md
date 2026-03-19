# WhatsApp Integration - Quick Reference

## 🚀 Quick Start Commands

### 1. Create Templates for a Company

```bash
python manage.py create_whatsapp_templates --company YOUR_COMPANY_SLUG
```

### 2. Create Templates with Auto-Approval (Testing Only)

```bash
python manage.py create_whatsapp_templates --company YOUR_COMPANY_SLUG --approve
```

### 3. Test WhatsApp Integration

```bash
python test_whatsapp.py --company YOUR_COMPANY_SLUG --phone +919876543210
```

---

## 📝 Company Configuration (Django Admin)

### Enable WhatsApp for a Company

1. Go to: **Companies → Company Settings**
2. Select your company
3. Set:
   - ✅ `enable_whatsapp_notifications` = True
   - `whatsapp_provider` = "Meta Cloud API"
   - `whatsapp_business_phone` = "+919876543210"
   - `whatsapp_credentials` =

     ```json
     {
       "provider": "meta",
       "access_token": "YOUR_ACCESS_TOKEN",
       "phone_number_id": "YOUR_PHONE_NUMBER_ID",
       "business_account_id": "YOUR_BUSINESS_ACCOUNT_ID"
     }
     ```

---

## 💬 Send WhatsApp Message (Code)

### Using NotificationService (Recommended)

```python
from notify.notification_service import NotificationService
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(id=USER_ID)

NotificationService.send(
    notification_type='booking_confirmed',
    recipients=[user],
    title='Booking Confirmed',
    message='Your booking has been confirmed',
    channels=['whatsapp'],  # or ['in_app', 'email', 'sms', 'whatsapp']
    context_data={
        'customer_name': user.name,
        'booking_id': '123',
        'service_date': '2026-02-15'
    }
)
```

### Using WhatsApp Service Directly

```python
from notify.whatsapp_service import WhatsAppService
from companies.models import Company

company = Company.objects.get(slug='your-company')

result = WhatsAppService.send_template_message(
    company=company,
    phone='+919876543210',
    template_name='booking_confirmed',
    language_code='en',
    body_params=['John Doe', '123', '2026-02-15']
)

print(result)  # {'status': 'success', 'message_id': '...'}
```

---

## 📊 Check Message Status

### Django Admin

1. Go to: **Notify → WhatsApp Message Logs**
2. Filter by company, status, date
3. View delivery status and errors

### Python/Shell

```python
from notify.models import WhatsAppMessageLog

# Recent messages
logs = WhatsAppMessageLog.objects.filter(
    company__slug='your-company'
).order_by('-created_at')[:10]

for log in logs:
    print(f"{log.template_name} → {log.recipient_phone}: {log.status}")

# Failed messages
failed = WhatsAppMessageLog.objects.filter(
    status='FAILED',
    company__slug='your-company'
)
```

---

## 🔧 Template Management

### View Templates

```python
from notify.models import WhatsAppTemplate

templates = WhatsAppTemplate.objects.filter(
    company__slug='your-company',
    is_active=True
)

for t in templates:
    print(f"{t.template_name}: {t.approval_status}")
```

### Approve Template (After WhatsApp Approval)

```python
from django.utils import timezone
from notify.models import WhatsAppTemplate

template = WhatsAppTemplate.objects.get(
    company__slug='your-company',
    template_name='booking_confirmed'
)

template.approval_status = 'APPROVED'
template.approved_at = timezone.now()
template.save()
```

---

## 🎯 Available Notification Types (with WhatsApp)

| Notification Type | When Triggered | Template Variables |
|-------------------|----------------|-------------------|
| `booking_confirmed` | Booking confirmed | customer_name, booking_id, service_date |
| `booking_created` | New booking | customer_name, booking_id, service_date |
| `job_started` | Job work started | customer_name, vehicle_info, job_id, expected_completion |
| `job_completed` | Job finished | customer_name, vehicle_info, job_id |
| `invoice_created` | Invoice generated | customer_name, invoice_number, total_amount |
| `payment_success` | Payment received | customer_name, amount, invoice_number, receipt_number |
| `appointment_approved` | Appointment OK'd | customer_name, service_name, appointment_date |
| `feedback_request` | Request feedback | customer_name, job_id |

---

## 🔍 Troubleshooting Quick Checks

### Check if WhatsApp is Enabled

```python
from companies.models import Company

company = Company.objects.get(slug='your-company')
settings = company.company_settings

print(f"WhatsApp Enabled: {settings.enable_whatsapp_notifications}")
print(f"Provider: {settings.whatsapp_provider}")
print(f"Phone: {settings.whatsapp_business_phone}")
print(f"Has Credentials: {bool(settings.whatsapp_credentials)}")
```

### Test Credentials

```python
from notify.whatsapp_service import WhatsAppService
from companies.models import Company

company = Company.objects.get(slug='your-company')
credentials = WhatsAppService.get_company_credentials(company)

if credentials:
    print("✓ Credentials OK")
    print(f"  Phone Number ID: {credentials['phone_number_id']}")
else:
    print("✗ Credentials missing or invalid")
```

### Validate Phone Number

```python
from notify.whatsapp_service import WhatsAppService

phone = '+919876543210'
formatted = WhatsAppService.validate_phone_number(phone)

if formatted:
    print(f"✓ Valid: {formatted}")
else:
    print("✗ Invalid phone number")
```

---

## 📱 Meta Business Manager Links

- **Business Manager**: <https://business.facebook.com/>
- **WhatsApp Manager**: <https://business.facebook.com/wa/manage/>
- **Message Templates**: <https://business.facebook.com/wa/manage/message-templates/>
- **API Setup**: <https://business.facebook.com/wa/manage/phone-numbers/>

---

## 🆘 Common Error Solutions

| Error | Solution |
|-------|----------|
| "WhatsApp not configured" | Enable in Company Settings |
| "No approved template" | Create & approve template |
| "Invalid phone number" | Use E.164 format: +919876543210 |
| "Template not found" | Template name must match exactly |
| Message stuck "QUEUED" | Check Celery is running |
| "Invalid access token" | Regenerate token in Meta Business Manager |

---

## 📞 Get Help

1. **Setup Guide**: `WHATSAPP_SETUP_GUIDE.md`
2. **Implementation Details**: `WHATSAPP_IMPLEMENTATION_SUMMARY.md`
3. **Meta Docs**: <https://developers.facebook.com/docs/whatsapp/cloud-api>
4. **Test Script**: `python test_whatsapp.py --help`
