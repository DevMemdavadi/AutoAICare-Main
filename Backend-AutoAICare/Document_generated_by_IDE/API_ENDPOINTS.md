# API Endpoints Reference

## Base URL
`http://localhost:8000/api`

## Authentication

All endpoints except registration and login require JWT token in header:
```
Authorization: Bearer <access_token>
```

---

## 🔐 Authentication Endpoints (`/auth/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register/` | Register new user | No |
| POST | `/auth/login/` | Login user | No |
| POST | `/auth/refresh/` | Refresh access token | No |
| GET | `/auth/me/` | Get current user profile | Yes |
| PUT | `/auth/me/` | Update user profile | Yes |
| POST | `/auth/send-otp/` | Send OTP for verification | No |
| POST | `/auth/verify-otp/` | Verify OTP | No |
| POST | `/auth/forgot-password/` | Request password reset | No |
| POST | `/auth/reset-password/` | Reset password with OTP | No |
| POST | `/auth/change-password/` | Change password | Yes |

---

## 👤 Customer Endpoints (`/customers/`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/customers/me/` | Get customer profile | Yes | Customer |
| PUT | `/customers/me/` | Update customer profile | Yes | Customer |
| GET | `/customers/vehicles/` | List customer vehicles | Yes | Customer |
| POST | `/customers/vehicles/` | Add new vehicle | Yes | Customer |
| GET | `/customers/vehicles/{id}/` | Get vehicle details | Yes | Customer |
| PUT | `/customers/vehicles/{id}/` | Update vehicle | Yes | Customer |
| DELETE | `/customers/vehicles/{id}/` | Delete vehicle | Yes | Customer |

---

## 🛠️ Service Endpoints (`/services/`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/services/packages/` | List all packages | No | - |
| GET | `/services/packages/{id}/` | Get package details | No | - |
| POST | `/services/packages/` | Create package | Yes | Admin |
| PUT | `/services/packages/{id}/` | Update package | Yes | Admin |
| DELETE | `/services/packages/{id}/` | Delete package | Yes | Admin |
| GET | `/services/addons/` | List add-ons | No | - |
| POST | `/services/addons/` | Create add-on | Yes | Admin |
| PUT | `/services/addons/{id}/` | Update add-on | Yes | Admin |
| DELETE | `/services/addons/{id}/` | Delete add-on | Yes | Admin |

---

## 📅 Booking Endpoints (`/bookings/`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/bookings/` | List bookings | Yes | All |
| POST | `/bookings/` | Create booking | Yes | Customer |
| GET | `/bookings/{id}/` | Get booking details | Yes | All |
| PUT | `/bookings/{id}/` | Update booking | Yes | Admin |
| DELETE | `/bookings/{id}/` | Delete booking | Yes | Admin |
| PUT | `/bookings/{id}/cancel/` | Cancel booking | Yes | Customer/Admin |

---

## 🧰 Job Card Endpoints (`/jobcards/`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/jobcards/` | List job cards | Yes | All |
| POST | `/jobcards/` | Create job card | Yes | Admin |
| GET | `/jobcards/{id}/` | Get job card details | Yes | All |
| PUT | `/jobcards/{id}/` | Update job card | Yes | Staff/Admin |
| PUT | `/jobcards/{id}/start/` | Start job card | Yes | Staff |
| PUT | `/jobcards/{id}/update-status/` | Update status | Yes | Staff/Admin |
| POST | `/jobcards/{id}/add-photo/` | Add before/after photo | Yes | Staff |
| POST | `/jobcards/{id}/add-part/` | Add part used | Yes | Staff |

---

## 🚗 Pickup & Drop Endpoints (`/pickup/`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/pickup/` | List pickup requests | Yes | All |
| POST | `/pickup/` | Create pickup request | Yes | Customer |
| GET | `/pickup/{id}/` | Get pickup details | Yes | All |
| PUT | `/pickup/{id}/assign-driver/` | Assign driver | Yes | Admin |
| PUT | `/pickup/{id}/update-status/` | Update status | Yes | Staff/Admin |

---

## 💳 Payment Endpoints (`/payments/`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/payments/` | List payments | Yes | All |
| GET | `/payments/{id}/` | Get payment details | Yes | All |
| POST | `/payments/initiate/` | Initiate payment | Yes | Customer |
| POST | `/payments/verify/` | Verify payment | Yes | Customer |
| GET | `/payments/history/` | Payment history | Yes | Customer |

---

## 🛒 Store Endpoints (`/store/`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/store/products/` | List products | No | - |
| GET | `/store/products/{id}/` | Get product details | No | - |
| POST | `/store/products/` | Create product | Yes | Admin |
| PUT | `/store/products/{id}/` | Update product | Yes | Admin |
| DELETE | `/store/products/{id}/` | Delete product | Yes | Admin |
| GET | `/store/orders/` | List orders | Yes | All |
| POST | `/store/orders/` | Create order | Yes | Customer |
| GET | `/store/orders/{id}/` | Get order details | Yes | All |

---

## ⭐ Feedback Endpoints (`/feedback/`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/feedback/` | List feedback | Yes | All |
| POST | `/feedback/` | Submit feedback | Yes | Customer |
| GET | `/feedback/{id}/` | Get feedback details | Yes | All |
| GET | `/feedback/summary/` | Feedback statistics | Yes | All |

---

## 📊 Analytics Endpoints (`/analytics/`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/analytics/dashboard/` | Dashboard overview | Yes | Admin |
| GET | `/analytics/revenue/` | Revenue analytics | Yes | Admin |
| GET | `/analytics/top-services/` | Top services | Yes | Admin |
| GET | `/analytics/peak-hours/` | Peak hours analysis | Yes | Admin |

---

## Request Examples

### Register Customer
```json
POST /api/auth/register/
{
    "email": "customer@example.com",
    "name": "John Doe",
    "phone": "1234567890",
    "password": "securepass123",
    "password2": "securepass123",
    "role": "customer"
}
```

### Login
```json
POST /api/auth/login/
{
    "email": "customer@example.com",
    "password": "securepass123"
}
```

### Create Booking
```json
POST /api/bookings/
{
    "vehicle": 1,
    "package": 1,
    "addon_ids": [1, 2],
    "booking_datetime": "2024-12-01T10:00:00Z",
    "pickup_required": true,
    "location": "123 Main St, City",
    "notes": "Need urgent service"
}
```

### Initiate Payment
```json
POST /api/payments/initiate/
{
    "booking_id": 1,
    "payment_method": "stripe"
}
```

### Submit Feedback
```json
POST /api/feedback/
{
    "booking": 1,
    "rating": 5,
    "review": "Excellent service!"
}
```

---

## Response Format

### Success Response
```json
{
    "id": 1,
    "field1": "value1",
    "field2": "value2"
}
```

### Error Response
```json
{
    "error": "Error message",
    "details": {
        "field": ["Error details"]
    }
}
```

### Paginated Response
```json
{
    "count": 100,
    "next": "http://localhost:8000/api/endpoint/?page=2",
    "previous": null,
    "results": [...]
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Roles & Permissions

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Super Admin** | System administrator | Full access to all features |
| **Admin** | Service manager | Manage services, bookings, staff, view analytics |
| **Staff** | Technician/Driver | Handle job cards, update status, upload photos |
| **Customer** | End user | Create bookings, view status, provide feedback |
