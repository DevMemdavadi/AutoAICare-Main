# Local Testing Credentials

## 🧪 Test Environment Setup

### Local Domains Created

- `newco.localhost:8000` → New Company
- `testco.localhost:8000` → Test Company  
- `companya.localhost:8000` → Test Company A
- `companyb.localhost:8000` → Test Company B

---

## 🔑 Test Credentials

### NEW COMPANY

**URL:** <http://newco.localhost:8000>

#### Company Admin (Super Admin)

- **Email:** `admin@newco.com`
- **Password:** `SecurePass@123`
- **Role:** super_admin

#### Floor Manager

- **Email:** `floor_manager1_new-company@test.com`
- **Password:** `Test@123`
- **Role:** floor_manager
- **Branch:** Main Branch

#### Supervisors

- **Email:** `supervisor2_new-company@test.com`
- **Password:** `Test@123`
- **Branch:** Main Branch

- **Email:** `supervisor3_new-company@test.com`
- **Password:** `Test@123`
- **Branch:** Andheri Branch

#### Applicators

- **Email:** `applicator4_new-company@test.com`
- **Password:** `Test@123`

- **Email:** `applicator5_new-company@test.com`
- **Password:** `Test@123`

---

### TEST COMPANY

**URL:** <http://testco.localhost:8000>

#### Company Admin (Super Admin)

- **Email:** `admin@testcompany.com`
- **Password:** (created during setup)
- **Role:** super_admin

#### Floor Manager

- **Email:** `floor_manager1_test-company@test.com`
- **Password:** `Test@123`
- **Role:** floor_manager
- **Branch:** Main Branch

- **Email:** `floor_manager1@test-company.com`
- **Password:** `Test@123`
- **Branch:** Main Branch

#### Supervisors

- **Email:** `supervisor2_test-company@test.com`
- **Password:** `Test@123`

- **Email:** `supervisor3_test-company@test.com`
- **Password:** `Test@123`

- **Email:** `supervisor2@test-company.com`
- **Password:** `Test@123`

- **Email:** `supervisor3@test-company.com`
- **Password:** `Test@123`

---

### TEST COMPANY A

**URL:** <http://companya.localhost:8000>

#### Company Admin (Super Admin)

- **Email:** `admin@companya.com`
- **Password:** (created during setup)
- **Role:** super_admin

---

### TEST COMPANY B

**URL:** <http://companyb.localhost:8000>

#### Company Admin (Super Admin)

- **Email:** `admin@companyb.com`
- **Password:** (created during setup)
- **Role:** super_admin

---

## 🚀 How to Test

### 1. Start the Server

```bash
python manage.py runserver
```

### 2. Access Company-Specific URLs

Open your browser and visit:

- **New Company:** <http://newco.localhost:8000/>
- **Test Company:** <http://testco.localhost:8000/>
- **Test Company A:** <http://companya.localhost:8000/>
- **Test Company B:** <http://companyb.localhost:8000/>

### 3. Login

Use the credentials above to login. Each subdomain will automatically:

- Detect the company from the URL
- Show only that company's data
- Filter all API calls to that company

### 4. Test Data Isolation

#### Test API Endpoints

```bash
# New Company's customers
curl http://newco.localhost:8000/api/customers/

# Test Company's customers
curl http://testco.localhost:8000/api/customers/

# Should return different data!
```

#### Test in Browser

1. Login to <http://newco.localhost:8000/> with `floor_manager1_new-company@test.com`
2. View customers - should see New Company's customers only
3. Logout
4. Login to <http://testco.localhost:8000/> with `floor_manager1_test-company@test.com`
5. View customers - should see Test Company's customers only

### 5. Verify Middleware

Check the request object has company set:

- Open Django Debug Toolbar (if installed)
- Check `request.company` - should match the subdomain
- Check `request.tenant_source` - should be 'subdomain'

---

## 🔍 What to Test

### ✅ Data Isolation

- [ ] Customers are different per subdomain
- [ ] Bookings are different per subdomain
- [ ] Services are different per subdomain
- [ ] Branches are different per subdomain

### ✅ User Access

- [ ] Company admin can access their company's data
- [ ] Floor manager can access their company's data
- [ ] Supervisor can access their company's data
- [ ] Users cannot see other companies' data

### ✅ API Endpoints

- [ ] `/api/customers/` returns company-specific data
- [ ] `/api/bookings/` returns company-specific data
- [ ] `/api/branches/` returns company-specific data
- [ ] `/api/services/` returns company-specific data

### ✅ Subdomain Detection

- [ ] Middleware detects company from subdomain
- [ ] `request.company` is set correctly
- [ ] `request.tenant_source` = 'subdomain'
- [ ] Fallback to user auth works if no subdomain

---

## 📝 Notes

### Browser Support

Modern browsers (Chrome, Firefox, Edge, Safari) support `.localhost` domains automatically. No hosts file changes needed!

### Hosts File (Optional)

If you want to use custom local domains, add to hosts file:

**Windows:** `C:\Windows\System32\drivers\etc\hosts`
**Mac/Linux:** `/etc/hosts`

```
127.0.0.1  newco.localhost
127.0.0.1  testco.localhost
127.0.0.1  companya.localhost
127.0.0.1  companyb.localhost
```

### Password Reset

If you forgot a password, reset it:

```bash
python manage.py shell

from users.models import User
user = User.objects.get(email='admin@newco.com')
user.set_password('NewPassword@123')
user.save()
```

---

## 🎯 Expected Behavior

### When visiting `http://newco.localhost:8000/`

1. Middleware extracts subdomain: `newco`
2. Looks up Domain: `newco.localhost` → New Company
3. Sets `request.company` = New Company
4. All queries filtered: `WHERE company_id = New Company.id`
5. User sees only New Company's data

### When visiting `http://testco.localhost:8000/`

1. Middleware extracts subdomain: `testco`
2. Looks up Domain: `testco.localhost` → Test Company
3. Sets `request.company` = Test Company
4. All queries filtered: `WHERE company_id = Test Company.id`
5. User sees only Test Company's data

---

## 🐛 Troubleshooting

### Issue: "Domain not found"

**Solution:** Run `python manage.py show_test_credentials` to create domains

### Issue: "No company detected"

**Solution:** Check that domain exists in database:

```python
from companies.models import Domain
Domain.objects.filter(domain='newco.localhost')
```

### Issue: "Seeing wrong company's data"

**Solution:** Check middleware is installed in `settings.py`:

```python
MIDDLEWARE = [
    ...
    'companies.middleware.CompanyMiddleware',
    ...
]
```

---

## ✅ Quick Test Checklist

1. [ ] Server running on port 8000
2. [ ] Can access <http://newco.localhost:8000/>
3. [ ] Can login with test credentials
4. [ ] See New Company's data only
5. [ ] Switch to <http://testco.localhost:8000/>
6. [ ] See Test Company's data only
7. [ ] API endpoints return filtered data
8. [ ] No cross-company data leakage

---

**Ready to test! Start the server and visit the URLs above.** 🚀
