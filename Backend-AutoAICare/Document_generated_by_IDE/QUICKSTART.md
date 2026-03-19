# 🚀 QUICK START GUIDE - Backend MVP

## **Setup & Run**

### 1. **Install Dependencies**
```bash
cd Backend
pip install -r requirements.txt
```

### 2. **Run Migrations**
```bash
python manage.py migrate
```

### 3. **Create Superuser**
```bash
python manage.py createsuperuser
# Email: admin@carservice.com
# Password: admin123
```

### 4. **Load Sample Data (Optional)**
```bash
# General data seeding
python manage.py seed_data

# For detailed seeding options (Leave, Salary, Financials, etc.)
# See SEED_DATA_GUIDE.md
```

### 5. **Start Development Server**
```bash
python manage.py runserver
```

### 6. **Access API Documentation**
```
http://localhost:8000/api/docs/
```

---

## 📌 SEED DATA GUIDES
For detailed information on seeding specific modules, refer to:
- [Seed Data Guide](SEED_DATA_GUIDE.md) - Comprehensive guide for all seed scripts

---

## **📌 QUICK API TEST WORKFLOW**

### **Step 1: Register Customer**
```http
POST /api/auth/register/
Content-Type: application/json

{
  "email": "customer@test.com",
  "name": "John Doe",
  "phone": "1234567890",
  "password": "Test@123",
  "password2": "Test@123",
  "role": "customer"
}
```

### **Step 2: Verify OTP (Skip in dev)**
```http
POST /api/auth/verify-otp/
{
  "email": "customer@test.com",
  "otp": "123456"
}
```

### **Step 3: Login**
```http
POST /api/auth/login/
{
  "email": "customer@test.com",
  "password": "Test@123"
}

Response:
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": { ... }
}
```

### **Step 4: Create Service Package (Admin)**
```http
POST /api/services/packages/
Authorization: Bearer {admin_token}

{
  "name": "Basic Car Wash",
  "description": "Complete exterior wash",
  "price": "50.00",
  "duration": 60,
  "is_active": true
}
```

### **Step 5: Add Vehicle (Customer)**
```http
POST /api/customers/vehicles/
Authorization: Bearer {customer_token}

{
  "registration_number": "ABC123",
  "brand": "Toyota",
  "model": "Camry",
  "color": "Black",
  "year": 2020
}
```

### **Step 6: Create Booking (Customer)**
```http
POST /api/bookings/
Authorization: Bearer {customer_token}

{
  "vehicle": 1,
  "package": 1,
  "booking_datetime": "2025-11-20T10:00:00Z",
  "pickup_required": false,
  "notes": "Please call before service"
}
```

### **Step 7: Initiate Payment**
```http
POST /api/payments/initiate/
Authorization: Bearer {customer_token}

{
  "booking_id": 1,
  "payment_method": "card"
}
```

### **Step 8: Create Job Card (Admin)**
```http
POST /api/jobcards/
Authorization: Bearer {admin_token}

{
  "booking": 1,
  "technician": 3,
  "estimated_delivery_time": "2025-11-20T14:00:00Z"
}
```

### **Step 9: Update Job Status (Technician)**
```http
PUT /api/jobcards/1/update-status/
Authorization: Bearer {technician_token}

{
  "status": "in_progress",
  "technician_notes": "Started work on engine cleaning"
}
```

### **Step 10: Create Invoice (Admin)**
```http
POST /api/billing/
Authorization: Bearer {admin_token}

{
  "customer": 1,
  "booking": 1,
  "jobcard": 1,
  "tax_rate": 10,
  "discount_amount": 0,
  "items": [
    {
      "item_type": "service",
      "description": "Basic Car Wash",
      "quantity": 1,
      "unit_price": 50.00
    }
  ]
}
```

### **Step 11: View Analytics (Admin)**
```http
GET /api/analytics/overview/
Authorization: Bearer {admin_token}
```

---

## **🔑 USER ROLES & PERMISSIONS**

### **Super Admin**
- Full system access
- Can create admin users
- Manage all resources

### **Admin**
- Create/manage staff
- Manage bookings, job cards, invoices
- View analytics
- Cannot create other admins

### **Staff/Technician**
- View assigned job cards
- Update job status
- Add photos/parts to job cards
- Limited read access

### **Customer**
- Register/login
- Manage profile & vehicles
- Create bookings
- View own bookings/invoices
- Make payments

---

## **📊 DATABASE MODELS**

### **Core Models**
- `User` - Authentication with roles & branch
- `Customer` - Customer profile with rewards
- `Vehicle` - Customer vehicles
- `ServicePackage` - Service offerings
- `AddOn` - Additional services
- `Booking` - Service bookings
- `JobCard` - Work orders
- `Payment` - Payment transactions
- `Invoice` - Billing invoices
- `Product` - Store products
- `Order` - Product orders

---

## **🔧 CONFIGURATION**

### **Environment Variables (.env)**
```env
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (Optional - defaults to SQLite)
DB_NAME=car_service_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# JWT
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# SMS (MSG91)
MSG91_AUTH_KEY=your-msg91-key
MSG91_SENDER_ID=your-sender-id

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

---

## **🧪 TESTING ENDPOINTS**

### **Using Swagger UI**
1. Go to `http://localhost:8000/api/docs/`
2. Click "Authorize" button
3. Enter: `Bearer {your_jwt_token}`
4. Test any endpoint interactively

### **Using cURL**
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Get service packages
curl -X GET http://localhost:8000/api/services/packages/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Using Postman**
1. Import OpenAPI schema from `/api/schema/`
2. Set up environment with `base_url` and `token`
3. Test all endpoints

---

## **🎯 COMMON TASKS**

### **Create Staff User**
```http
POST /api/auth/create-staff/
Authorization: Bearer {admin_token}

{
  "email": "tech1@carservice.com",
  "name": "Mike Technician",
  "phone": "9876543210",
  "role": "staff",
  "branch": "Downtown Branch",
  "password": "Tech@123"
}
```

### **List All Bookings (Admin)**
```http
GET /api/bookings/?status=pending&ordering=-booking_datetime
Authorization: Bearer {admin_token}
```

### **Mark Invoice as Paid**
```http
POST /api/billing/1/mark-paid/
Authorization: Bearer {admin_token}
```

### **Get Revenue Analytics**
```http
GET /api/analytics/revenue/?days=30
Authorization: Bearer {admin_token}
```

---

## **⚠️ TROUBLESHOOTING**

### **Migration Issues**
```bash
python manage.py makemigrations
python manage.py migrate --run-syncdb
```

### **Celery Not Running**
```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Celery Worker
celery -A config worker -l info

# Terminal 3: Start Celery Beat
celery -A config beat -l info
```

### **Permission Denied**
- Check if user has correct role
- Verify JWT token is valid and not expired
- Ensure `Authorization: Bearer {token}` header is set

---

## **📈 NEXT STEPS**

1. ✅ Test all API endpoints
2. ✅ Create sample data for demo
3. ⏳ Connect frontend to backend
4. ⏳ Deploy to staging server
5. ⏳ Add remaining notification triggers
6. ⏳ Implement PDF invoice generation
7. ⏳ Add email templates

---

**Happy Coding! 🚀**

For issues or questions, check:
- API Documentation: `/api/docs/`
- Implementation Status: `IMPLEMENTATION_STATUS.md`
- API Endpoints: `API_ENDPOINTS.md`
