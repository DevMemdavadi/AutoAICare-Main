# Subdomain-Based Multi-Tenancy Guide

## 🌐 Overview

DetailEase now supports **subdomain-based tenant identification**, allowing each company to have their own branded subdomain.

### **Architecture:**

```
k3car.autoaicare.com     → K3 Car Care Company
cleancar.autoaicare.com  → Clean Car Company  
premium.autoaicare.com   → Premium Auto Care
```

---

## 🎯 How It Works

### **1. Tenant Identification Priority:**

The system identifies the company in this order:

1. **Subdomain** (Primary method)
   - Extracts company from `k3car.autoaicare.com`
   - Fast, automatic, no authentication needed

2. **User Authentication** (Fallback)
   - Uses `request.user.company`
   - Works for API tokens, admin panel, mobile apps

### **2. Request Flow:**

```
User visits: https://k3car.autoaicare.com/api/customers/
         ↓
CompanyMiddleware extracts subdomain: "k3car"
         ↓
Looks up Domain model: k3car → K3 Car Care Company
         ↓
Sets request.company = K3 Car Care Company
         ↓
CompanyManager filters all queries by company_id
         ↓
Returns only K3 Car Care's customers
```

---

## 📋 Setup Instructions

### **Step 1: Add Domains to Companies**

Use the management command to add domains:

```bash
# Add domain for K3 Car Care
python manage.py add_domain \
  --company k3-car-care \
  --domain k3car.autoaicare.com \
  --primary

# Add domain for Clean Car
python manage.py add_domain \
  --company clean-car \
  --domain cleancar.autoaicare.com \
  --primary

# Add domain for Premium Auto Care
python manage.py add_domain \
  --company premium-auto-care \
  --domain premium.autoaicare.com \
  --primary
```

### **Step 2: Configure DNS**

Add wildcard DNS record for your domain:

```
Type: A or CNAME
Name: *.autoaicare.com
Value: Your server IP or domain
TTL: 3600
```

**Example DNS Records:**

```
*.autoaicare.com  →  CNAME  →  your-server.com
```

This allows all subdomains to point to your server.

### **Step 3: Configure CORS (if using separate frontend)**

Update `settings.py`:

```python
# Allow all subdomains
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://\w+\.autoaicare\.com$",  # Matches any subdomain
]

# Or list specific subdomains
CORS_ALLOWED_ORIGINS = [
    "https://k3car.autoaicare.com",
    "https://cleancar.autoaicare.com",
    "https://premium.autoaicare.com",
]
```

### **Step 4: Configure ALLOWED_HOSTS**

Update `settings.py`:

```python
ALLOWED_HOSTS = [
    '.autoaicare.com',  # Allows all subdomains
    'localhost',
    '127.0.0.1',
]
```

---

## 🔧 Usage Examples

### **Example 1: Customer Visits Subdomain**

```
Customer visits: https://k3car.autoaicare.com/
                ↓
Frontend loads for K3 Car Care
                ↓
All API calls automatically scoped to K3 Car Care
```

### **Example 2: API Request**

```bash
# Request to K3 Car Care subdomain
curl https://k3car.autoaicare.com/api/customers/

# Response: Only K3 Car Care's customers
[
  {"id": 1, "name": "John Doe", "company": "K3 Car Care"},
  {"id": 2, "name": "Jane Smith", "company": "K3 Car Care"}
]
```

```bash
# Request to Clean Car subdomain
curl https://cleancar.autoaicare.com/api/customers/

# Response: Only Clean Car's customers
[
  {"id": 10, "name": "Bob Wilson", "company": "Clean Car"},
  {"id": 11, "name": "Alice Brown", "company": "Clean Car"}
]
```

### **Example 3: Admin Panel (Fallback to User)**

```
Admin visits: https://api.autoaicare.com/admin/
              ↓
No subdomain detected
              ↓
Falls back to user.company
              ↓
Shows data for logged-in user's company
```

---

## 🛠️ Management Commands

### **Add Domain**

```bash
python manage.py add_domain \
  --company <slug-or-id> \
  --domain <full-domain> \
  --primary
```

**Example:**

```bash
python manage.py add_domain \
  --company test-company \
  --domain testco.autoaicare.com \
  --primary
```

### **List All Domains**

```python
python manage.py shell

from companies.models import Domain
for domain in Domain.objects.all():
    print(f"{domain.domain} → {domain.company.name}")
```

---

## 🔍 Testing Locally

### **Option 1: Edit Hosts File**

Add to `/etc/hosts` (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1  k3car.localhost
127.0.0.1  cleancar.localhost
127.0.0.1  premium.localhost
```

Then access:

- `http://k3car.localhost:8000/`
- `http://cleancar.localhost:8000/`

### **Option 2: Use .localhost Domains**

Modern browsers support `.localhost` automatically:

```bash
python manage.py add_domain \
  --company test-company \
  --domain testco.localhost \
  --primary
```

Access: `http://testco.localhost:8000/`

---

## 🔐 Security Considerations

### **✅ What's Protected:**

1. **Automatic Filtering**: All queries filtered by company
2. **No Cross-Tenant Access**: Users can't access other companies' data
3. **Subdomain Validation**: Only registered domains work
4. **Fallback Security**: Falls back to user.company if no subdomain

### **⚠️ Important Notes:**

1. **Always use HTTPS in production**
2. **Validate subdomain exists** before processing
3. **Log suspicious access attempts**
4. **Monitor for subdomain enumeration**

---

## 📊 Database Schema

### **Domain Model:**

```sql
CREATE TABLE company_domains (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(63),
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_subdomain ON company_domains(subdomain, is_active);
CREATE INDEX idx_domain ON company_domains(domain, is_active);
```

---

## 🚀 Production Deployment

### **1. SSL Certificates**

Use wildcard SSL certificate:

```
*.autoaicare.com
```

**Options:**

- Let's Encrypt (free wildcard certs)
- Cloudflare (automatic SSL)
- Commercial wildcard cert

### **2. Load Balancer Configuration**

Configure your load balancer to route all subdomains to your app:

```nginx
# Nginx example
server {
    listen 443 ssl;
    server_name *.autoaicare.com;
    
    ssl_certificate /path/to/wildcard.crt;
    ssl_certificate_key /path/to/wildcard.key;
    
    location / {
        proxy_pass http://django_app;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### **3. CDN Configuration**

If using CDN (Cloudflare, CloudFront):

- Enable wildcard subdomain support
- Configure SSL
- Set up caching rules

---

## 🎨 Frontend Integration

### **React/Vue/Angular:**

```javascript
// Automatically detect subdomain
const subdomain = window.location.hostname.split('.')[0];

// Set API base URL
const API_BASE = `https://${window.location.hostname}/api`;

// All requests automatically scoped to current subdomain
fetch(`${API_BASE}/customers/`)
  .then(res => res.json())
  .then(data => console.log(data));
```

### **Environment Variables:**

```bash
# .env.production
VITE_API_URL=https://${SUBDOMAIN}.autoaicare.com/api
```

---

## 📈 Monitoring & Analytics

### **Track Tenant Usage:**

```python
# Add to middleware or analytics
def log_tenant_access(request):
    if request.company:
        logger.info(f"Tenant: {request.company.slug}, "
                   f"Source: {request.tenant_source}, "
                   f"Path: {request.path}")
```

### **Metrics to Monitor:**

- Requests per tenant
- Response times per subdomain
- Failed subdomain lookups
- Cross-tenant access attempts

---

## ❓ FAQ

### **Q: Can a company have multiple domains?**

Yes! Add multiple domains for the same company:

```bash
python manage.py add_domain --company k3-car --domain k3car.com
python manage.py add_domain --company k3-car --domain k3.autoaicare.com
python manage.py add_domain --company k3-car --domain k3carcare.com --primary
```

### **Q: What if subdomain doesn't exist?**

The system falls back to user authentication. If no user is logged in, `request.company` will be `None`.

### **Q: Can I use custom domains (not subdomains)?**

Yes! Add full custom domains:

```bash
python manage.py add_domain --company k3-car --domain k3carcare.com --primary
```

### **Q: How do I disable a domain?**

Via admin panel or shell:

```python
from companies.models import Domain
domain = Domain.objects.get(domain='old.autoaicare.com')
domain.is_active = False
domain.save()
```

---

## 🎯 Best Practices

1. ✅ **Always set one primary domain** per company
2. ✅ **Use HTTPS in production**
3. ✅ **Monitor subdomain access logs**
4. ✅ **Validate domains before adding**
5. ✅ **Use wildcard SSL certificates**
6. ✅ **Test subdomain routing thoroughly**
7. ✅ **Document all active subdomains**

---

## 🔄 Migration from Token-Based to Subdomain

If you're currently using token-based authentication:

1. **Add domains** to existing companies
2. **Update frontend** to use subdomain URLs
3. **Keep token auth** as fallback for mobile apps
4. **Test both methods** work correctly
5. **Gradually migrate** users to subdomains

**Both methods work simultaneously!**

---

## 📞 Support

For issues or questions:

1. Check middleware logs for tenant detection
2. Verify domain exists in database
3. Confirm DNS is configured correctly
4. Test with `.localhost` domains first

---

*Last Updated: February 6, 2026*  
*Multi-Tenancy Version: 2.0 (Subdomain Support)*
