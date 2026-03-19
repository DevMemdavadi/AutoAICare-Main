# Task: Facebook → WhatsApp number (24h) → CRM send messages

## What the task means (in simple words)

1. **Facebook / Meta side**  
   - Create (or use) a **Facebook Business** account.  
   - Use **Meta’s process** to get a **WhatsApp Business API** phone number.  
   - Often: you get a **temporary/test number** first, then add your **real number** and wait **~24 hours** for Meta to activate it.  
   - After that, the number is “active” and can send/receive messages via API.

2. **CRM side (this project – wp)**  
   - From the **CRM** (admin hub), any user should be able to:  
     - **Insert/add a customer phone number** (as a contact).  
     - **Send messages** to that number.  
   - Messages go through **your** WhatsApp Business number (the one you got from Meta).

So the task has **two parts**:

- **Part A:** Get the WhatsApp number using Facebook/Meta (external setup + 24h).  
- **Part B:** In the CRM, “insert number + send message” (already in wp, may need small tweaks or docs).

---

## Part A: Get WhatsApp number via Facebook / Meta (external, ~24h)

This is **not coded in wp**. It is done in **Meta Business Suite** and **WhatsApp Business Platform**. Your job can be to **document** these steps for the company (and optionally add an API that only *checks* or *displays* status).

### Steps (high level – you can turn this into a company doc)

1. **Facebook Business account**  
   - Go to [business.facebook.com](https://business.facebook.com).  
   - Create or use an existing **Business Account**.

2. **Add WhatsApp product**  
   - In Meta Business Suite: **Business settings** → **Accounts** → **WhatsApp Accounts** → **Add** → create a **WhatsApp Business Account**.

3. **Phone number**  
   - **Option 1 – Use existing number:** Add your business phone number. Meta will send a **verification code** (SMS or voice). After verification, the number often has a **~24 hour** “activation” or “quality” period before full messaging is allowed.  
   - **Option 2 – Request a new number:** In some regions Meta provides a **temporary/test number** first; then you can add or switch to your real number (again, 24h-style activation is common).

4. **Get API credentials**  
   - In **WhatsApp** → **API Setup** (or **Developer** section):  
     - **Phone number ID**  
     - **WhatsApp Business Account ID**  
   - Create a **System User** or **App** and get an **Access token** (permanent or long-lived).

5. **Put them in wp**  
   - In `wp/.env` set:  
     - `WHATSAPP_PHONE_NUMBER_ID=...`  
     - `WHATSAPP_ACCESS_TOKEN=...`  
     - `WHATSAPP_BUSINESS_ACCOUNT_ID=...`  
     - `WHATSAPP_VERIFY_TOKEN=...` (any secret string you choose for webhook verification)

So: **“Facebook account → API gives temp no → another no → wait 24 hours to activate”** = this Meta process. No separate “API in wp” is required for *getting* the number; wp only *uses* the number via these env vars.

---

## Part B: From CRM – “insert number + send message” (already in wp)

Your **wp** backend already supports:

- **Contacts** (customer numbers):  
  - **API:** `POST /api/whatsapp/dashboard/contacts/`  
  - Body example: `{ "name": "Customer Name", "phone_number": "919876543210", "email": "" }`  
  - So “insert number” = **create a contact** with that `phone_number`.

- **Send message** (to a number or to a contact):  
  - **API:** `POST /api/whatsapp/dashboard/messages/send/`  
  - Body:  
    - Either `recipient_phone_number`: any number (e.g. `"919876543210"`),  
    - Or `recipient_contact_id`: id of an existing contact.  
  - Plus `message` (text) and optionally `message_type`.  
  - So “messages will go” = call this endpoint; wp uses `WhatsAppService` and Meta’s API to send.

So **“from this CRM any customer can insert no and messages will be gone”** is already implemented:  
**Insert number** = add contact (or use raw number). **Messages will go** = call send-message API.

What you might add:

- **Docs** for your company: “How to add a contact and send a message from the CRM (or via API).”  
- **UI** in the admin hub (yogi-sarbat-admin-hub): make sure there are clear screens for “Add contact (number)” and “Send message” that call the above APIs. If those screens exist, just link them in the doc.

---

## Summary table

| Part | What | Where | Your action |
|------|------|--------|-------------|
| A | Get WhatsApp number (Facebook, temp/real, 24h) | Meta Business Suite / WhatsApp setup | Write a short **step-by-step doc** (and set `.env` in wp when done). |
| B | Insert customer number in CRM | wp: `POST .../contacts/` | Confirm it works; document for team. |
| B | Send message from CRM | wp: `POST .../messages/send/` | Confirm it works; document for team. |

---

## If company asks for “an API that gets temp number / activates number”

- **Getting** the number and **24h activation** is done on **Meta’s side**, not in wp.  
- You can add an API in wp that **calls Meta’s Graph API** to:  
  - **List** phone numbers for the business account, or  
  - **Register** a new number (if Meta allows it for your account), or  
  - **Get registration/quality status** (if Meta exposes it).  
- That would be a **small Django view** that uses `requests` + `WHATSAPP_ACCESS_TOKEN` and Meta’s docs (e.g. “WhatsApp Business Account Phone Numbers” in Graph API).  
- If they want this, say “I’ll add an endpoint that talks to Meta’s API to list/register phone numbers and show status” and then implement that one view + URL.

---

## Next steps you can do right now

1. **Clarify with company** (optional):  
   - “Part A is Facebook/Meta setup and 24h wait; Part B is CRM insert number + send message, which is already in wp. Do you want a written guide for Part A and testing steps for Part B, or also an API in wp that talks to Meta for number status/registration?”

2. **Document Part A** in a short **FACEBOOK_WHATSAPP_SETUP.md** (or add a section in your existing docs) using the steps above (and Meta’s current UI).

3. **Test Part B in wp:**  
   - Create a contact: `POST /api/whatsapp/dashboard/contacts/` with `name`, `phone_number`.  
   - Send message: `POST /api/whatsapp/dashboard/messages/send/` with `recipient_phone_number` or `recipient_contact_id` and `message`.  
   - Confirm messages are sent (and check Meta’s 24h / quality rules if something is blocked).

4. **In the admin hub (frontend):**  
   - Ensure “Add contact” and “Send message” screens exist and use the above APIs; if not, add minimal UI that does that.

If you tell me whether the company wants **only docs**, or **docs + one Meta “phone number status” API in wp**, I can give you the exact endpoint design and code for wp (step-by-step).
