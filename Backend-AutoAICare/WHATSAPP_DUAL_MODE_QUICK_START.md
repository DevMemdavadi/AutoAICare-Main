# Dual-Mode WhatsApp Quick Start Guide

## 🚀 Quick Setup

### Option 1: Manual Mode (Recommended for Getting Started)

**No setup required!** Just enable it:

1. Go to **Settings** → **WhatsApp Settings**
2. Toggle **Enable WhatsApp Notifications** ON
3. Select **📱 Manual (Click-to-Send)**
4. Click **Save**

✅ **Done!** You're ready to send WhatsApp messages.

### Option 2: Automated Mode (For Scale)

1. Go to **Settings** → **WhatsApp Settings**
2. Toggle **Enable WhatsApp Notifications** ON
3. Select **⚡ Automated (Cloud API)**
4. Enter:
   - WhatsApp Provider: `Meta Cloud API`
   - Business Phone: `+919876543210` (your WhatsApp Business number)
   - API Credentials (JSON):

   ```json
   {
     "provider": "meta",
     "access_token": "YOUR_ACCESS_TOKEN",
     "phone_number_id": "YOUR_PHONE_NUMBER_ID",
     "business_account_id": "YOUR_BUSINESS_ACCOUNT_ID"
   }
   ```

5. Click **Save**

📚 See `WHATSAPP_SETUP_GUIDE.md` for detailed API setup instructions.

---

## 📱 Using Manual Mode

### How Messages Are Sent

1. **System triggers notification** (booking confirmed, job completed, etc.)
2. **Message appears in Pending Messages** page
3. **Staff opens Pending Messages** page
4. **Staff clicks "Send via WhatsApp"** button
5. **WhatsApp opens** with message pre-filled
6. **Staff reviews and sends** in WhatsApp
7. **System marks as sent** automatically

### Accessing Pending Messages

**URL**: `/admin/whatsapp-pending`

**Or add to sidebar navigation:**

```jsx
<NavLink to="/admin/whatsapp-pending">
  <MessageSquare size={20} />
  Pending WhatsApp
</NavLink>
```

### What Staff See

- **Statistics**: Pending count, sent count, total
- **Message Cards**: Each with:
  - Customer name & phone
  - Message preview
  - Template used
  - Related booking/job/invoice
  - "Send via WhatsApp" button

---

## ⚡ Using Automated Mode

### How Messages Are Sent

1. **System triggers notification**
2. **Message queued automatically**
3. **Celery sends via Meta API**
4. **Delivery tracked automatically**
5. **No manual intervention needed**

### Viewing Sent Messages

**URL**: `/admin/whatsapp-logs`

Shows:

- All sent messages
- Delivery status
- Read receipts
- Statistics

---

## 🔄 Switching Modes

### From Manual → Automated

1. Go to Settings → WhatsApp Settings
2. Select **⚡ Automated (Cloud API)**
3. Enter API credentials
4. Save

**What happens:**

- Existing pending messages remain accessible
- New messages send automatically
- Old manual messages can still be sent

### From Automated → Manual

1. Go to Settings → WhatsApp Settings
2. Select **📱 Manual (Click-to-Send)**
3. Save

**What happens:**

- New messages create pending entries
- Staff must send manually
- Automated logs remain viewable

---

## 🎯 Common Use Cases

### Small Business / Getting Started

**Use Manual Mode**

- No API setup needed
- Works with WhatsApp Business App
- Free to use
- Perfect for low volume

### Growing Business

**Start Manual, Upgrade to Automated**

- Begin with manual mode
- Learn the system
- Upgrade when ready for automation
- Seamless transition

### Enterprise / High Volume

**Use Automated Mode**

- Full automation
- Delivery tracking
- Analytics
- Template management

---

## 📊 API Endpoints

### Settings

```
GET  /api/settings/
PUT  /api/settings/
```

**Fields:**

- `enable_whatsapp_notifications`: boolean
- `whatsapp_mode`: "manual" | "api"
- `whatsapp_provider`: "meta" | "twilio" | "messagebird"
- `whatsapp_business_phone`: string
- `whatsapp_credentials`: object

### Pending Messages (Manual Mode)

```
GET  /api/notify/whatsapp/pending/
POST /api/notify/whatsapp/pending/{id}/mark_sent/
GET  /api/notify/whatsapp/pending/stats/
```

### Message Logs

```
GET  /api/notify/whatsapp/logs/
GET  /api/notify/whatsapp/logs/stats/
```

---

## 🐛 Troubleshooting

### Manual Mode Issues

**Problem**: Pending messages not appearing

- Check WhatsApp is enabled in settings
- Verify mode is set to "manual"
- Check notification triggers are working

**Problem**: WhatsApp doesn't open

- Verify wa.me link is correct
- Check phone number format (E.164)
- Try different browser

**Problem**: Message not marked as sent

- Click the "Send via WhatsApp" button (not just copy link)
- Check API endpoint is accessible
- Verify permissions

### Automated Mode Issues

**Problem**: Messages not sending

- Verify API credentials are correct
- Check template is approved
- Verify Celery is running
- Check Meta API status

**Problem**: Delivery status not updating

- Verify webhook is configured
- Check webhook endpoint is accessible
- Review Meta API logs

---

## 💡 Pro Tips

### For Manual Mode

1. **Batch Processing**: Open pending messages page, send multiple at once
2. **Message Preview**: Review message before sending
3. **Custom Edits**: Edit message in WhatsApp before sending
4. **No Limits**: No API rate limits or costs

### For Automated Mode

1. **Template Approval**: Get templates approved before going live
2. **Test First**: Test with your own number first
3. **Monitor Logs**: Check delivery status regularly
4. **Backup Plan**: Keep manual mode as fallback

### For Both Modes

1. **Start Simple**: Begin with booking confirmations only
2. **Add Gradually**: Add more notification types over time
3. **Monitor Stats**: Track pending/sent counts
4. **Get Feedback**: Ask customers if they received messages

---

## 📞 Support

### Documentation

- **Setup Guide**: `WHATSAPP_SETUP_GUIDE.md`
- **Implementation**: `WHATSAPP_DUAL_MODE_SUMMARY.md`
- **Quick Reference**: `WHATSAPP_QUICK_REFERENCE.md`

### Common Questions

**Q: Can I use both modes at the same time?**
A: No, you choose one mode per company. But you can switch anytime.

**Q: Do I need WhatsApp Business API for manual mode?**
A: No! Manual mode works with regular WhatsApp Business App.

**Q: Are there any costs for manual mode?**
A: No, manual mode is completely free.

**Q: Can I customize messages in manual mode?**
A: Yes! Edit the message in WhatsApp before sending.

**Q: What happens to pending messages if I switch to automated?**
A: They remain accessible and can still be sent manually.

---

## ✅ Checklist

### Before Going Live

- [ ] WhatsApp enabled in settings
- [ ] Mode selected (manual or automated)
- [ ] If automated: API credentials configured
- [ ] If automated: Templates created and approved
- [ ] Test notification sent successfully
- [ ] Staff trained on pending messages page (if manual)
- [ ] Sidebar navigation updated (optional)
- [ ] Monitoring/logging set up

### Daily Operations (Manual Mode)

- [ ] Check pending messages page
- [ ] Send pending messages
- [ ] Monitor sent count
- [ ] Review any issues

### Daily Operations (Automated Mode)

- [ ] Check delivery stats
- [ ] Review failed messages
- [ ] Monitor API usage
- [ ] Check template status

---

**Need help?** Check the full documentation or contact support.

**Ready to start?** Go to Settings → WhatsApp Settings and choose your mode! 🚀
