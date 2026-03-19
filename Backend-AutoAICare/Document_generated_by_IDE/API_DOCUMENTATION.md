# DetailEase API Documentation

**Base URL:** `http://localhost:8000/api` (Development)  
**Production URL:** `https://api.yourdomain.com/api`  
**Version:** 1.0.0  
**Authentication:** JWT Token

---

## 🔐 Authentication

### Login
```http
POST /auth/login/
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "branch": 1
  }
}
```

### Refresh Token
```http
POST /auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Using Token
```http
GET /api/endpoint/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

---

## 👥 User Management

### Get Current User
```http
GET /auth/me/
Authorization: Bearer <token>
```

### List Users
```http
GET /auth/users/
Authorization: Bearer <token>

Query Parameters:
- role: staff|manager|admin
- branch: <branch_id>
- is_active: true|false
```

---

## 📅 Attendance Module

### Get Attendance Records
```http
GET /attendance/records/
Authorization: Bearer <token>

Query Parameters:
- date: YYYY-MM-DD
- employee: <user_id>
- status: present|absent|half_day|on_leave
- branch: <branch_id>
```

**Response:**
```json
{
  "count": 10,
  "results": [
    {
      "id": 1,
      "employee": 5,
      "employee_name": "John Doe",
      "date": "2026-01-31",
      "status": "present",
      "check_in_time": "09:00:00",
      "check_out_time": "18:00:00",
      "total_hours": 9.0,
      "overtime_hours": 1.0,
      "notes": ""
    }
  ]
}
```

### Create Attendance Record
```http
POST /attendance/records/
Authorization: Bearer <token>
Content-Type: application/json

{
  "employee": 5,
  "date": "2026-01-31",
  "status": "present",
  "check_in_time": "09:00:00",
  "check_out_time": "18:00:00"
}
```

### Bulk Mark Attendance
```http
POST /attendance/records/bulk_mark/
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2026-01-31",
  "records": [
    {
      "employee": 5,
      "status": "present",
      "check_in_time": "09:00:00",
      "check_out_time": "18:00:00"
    },
    {
      "employee": 6,
      "status": "absent"
    }
  ]
}
```

### Get Daily Summary
```http
GET /attendance/records/daily_summary/
Authorization: Bearer <token>

Query Parameters:
- date: YYYY-MM-DD (required)
- branch: <branch_id>
```

**Response:**
```json
{
  "date": "2026-01-31",
  "total_employees": 10,
  "present": 8,
  "absent": 1,
  "half_day": 1,
  "on_leave": 0,
  "total_hours_worked": 72.0,
  "total_overtime_hours": 8.0
}
```

### Get Monthly Summaries
```http
GET /attendance/monthly-summaries/
Authorization: Bearer <token>

Query Parameters:
- month: 1-12
- year: YYYY
- employee: <user_id>
```

### Generate Monthly Summary
```http
POST /attendance/monthly-summaries/generate_monthly/
Authorization: Bearer <token>
Content-Type: application/json

{
  "month": 1,
  "year": 2026,
  "employee": 5  // Optional, generates for all if omitted
}
```

---

## 💰 Payroll Module

### List Payroll Records
```http
GET /accounting/payroll/
Authorization: Bearer <token>

Query Parameters:
- month: 1-12
- year: YYYY
- employee: <user_id>
- status: pending|approved|paid|cancelled
- branch: <branch_id>
```

**Response:**
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "employee": 5,
      "employee_name": "John Doe",
      "employee_role": "Detailer",
      "month": 1,
      "year": 2026,
      "month_name": "January",
      "base_salary": "25000.00",
      "hra": "5000.00",
      "transport_allowance": "2000.00",
      "other_allowances": "0.00",
      "total_incentives": "1500.00",
      "overtime_pay": "2000.00",
      "gross_salary": "35500.00",
      "pf_deduction": "1800.00",
      "esi_deduction": "500.00",
      "tds_deduction": "0.00",
      "absence_deduction": "0.00",
      "other_deductions": "0.00",
      "deductions": "2300.00",
      "net_salary": "33200.00",
      "status": "paid",
      "status_display": "Paid",
      "attendance_data": {
        "days_present": 26,
        "days_absent": 0,
        "days_half_day": 0,
        "days_on_leave": 4,
        "total_hours_worked": 208,
        "overtime_hours": 8
      }
    }
  ]
}
```

### Generate Bulk Payroll
```http
POST /accounting/payroll/generate_bulk/
Authorization: Bearer <token>
Content-Type: application/json

{
  "month": 1,
  "year": 2026
}
```

### Mark Payroll as Paid
```http
POST /accounting/payroll/{id}/mark_paid/
Authorization: Bearer <token>
Content-Type: application/json

{
  "payment_method": "Bank Transfer",
  "payment_date": "2026-01-31"
}
```

### Download Salary Slip
```http
GET /accounting/payroll/{id}/salary_slip/
Authorization: Bearer <token>
```
Returns PDF file

### Email Salary Slip
```http
POST /accounting/payroll/{id}/email_salary_slip/
Authorization: Bearer <token>
```

---

## ✅ Approval Workflows

### List Workflows
```http
GET /accounting/approval-workflows/
Authorization: Bearer <token>

Query Parameters:
- model_type: expense|payroll|invoice
- is_active: true|false
- branch: <branch_id>
```

**Response:**
```json
{
  "count": 2,
  "results": [
    {
      "id": 1,
      "name": "Expense Approval",
      "model_type": "expense",
      "model_type_display": "Expense",
      "branch": 1,
      "branch_name": "Main Branch",
      "is_active": true,
      "levels": [
        {
          "level": 1,
          "approval_type": "role",
          "role": "manager",
          "user": null,
          "threshold_amount": "10000.00"
        },
        {
          "level": 2,
          "approval_type": "role",
          "role": "admin",
          "user": null,
          "threshold_amount": null
        }
      ]
    }
  ]
}
```

### List Approval Requests
```http
GET /accounting/approval-requests/
Authorization: Bearer <token>

Query Parameters:
- model_type: expense|payroll|invoice
- status: pending|approved|rejected|cancelled
- current_level: 1|2|3
```

### Get My Pending Approvals
```http
GET /accounting/approval-requests/my_pending_approvals/
Authorization: Bearer <token>
```

### Approve Request
```http
POST /accounting/approval-requests/{id}/approve/
Authorization: Bearer <token>
Content-Type: application/json

{
  "comments": "Approved - looks good"  // Optional
}
```

### Reject Request
```http
POST /accounting/approval-requests/{id}/reject/
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Missing documentation"  // Required
}
```

### Get Approval Statistics
```http
GET /accounting/approval-requests/statistics/
Authorization: Bearer <token>

Query Parameters:
- start_date: YYYY-MM-DD
- end_date: YYYY-MM-DD
```

**Response:**
```json
{
  "total_requests": 50,
  "pending_requests": 10,
  "approved_requests": 35,
  "rejected_requests": 5,
  "total_amount": "500000.00",
  "approved_amount": "450000.00",
  "pending_amount": "50000.00",
  "approval_rate": 87.5,
  "average_approval_time_hours": 24.5,
  "by_type": {
    "expense": {
      "count": 30,
      "amount": "300000.00"
    },
    "payroll": {
      "count": 15,
      "amount": "150000.00"
    },
    "invoice": {
      "count": 5,
      "amount": "50000.00"
    }
  }
}
```

---

## 📊 GST Reports

### GSTR-1 Report
```http
GET /accounting/gst-reports/gstr1/
Authorization: Bearer <token>

Query Parameters:
- month: 1-12 (required)
- year: YYYY (required)
- branch: <branch_id>
```

**Response:**
```json
{
  "period": {
    "month": 1,
    "year": 2026
  },
  "grand_total": {
    "total_invoices": 50,
    "total_invoice_value": "500000.00",
    "total_tax_collected": "90000.00"
  },
  "b2b_supplies": {
    "count": 30,
    "total_invoice_value": "400000.00",
    "total_tax_collected": "72000.00",
    "details": [
      {
        "invoice_number": "INV-001",
        "customer_name": "ABC Corp",
        "customer_gstin": "29ABCDE1234F1Z5",
        "taxable_value": "10000.00",
        "tax_rate": 18,
        "total_tax": "1800.00",
        "invoice_value": "11800.00"
      }
    ]
  },
  "b2c_large_supplies": {
    "count": 5,
    "total_invoice_value": "75000.00",
    "total_tax_collected": "13500.00",
    "details": []
  },
  "b2c_small_supplies": {
    "count": 15,
    "total_invoice_value": "25000.00",
    "total_tax_collected": "4500.00",
    "summary_by_rate": [
      {
        "tax_rate": 18,
        "invoice_count": 10,
        "total_invoice_value": "20000.00",
        "total_tax": "3600.00"
      }
    ]
  }
}
```

### GSTR-3B Report
```http
GET /accounting/gst-reports/gstr3b/
Authorization: Bearer <token>

Query Parameters:
- month: 1-12 (required)
- year: YYYY (required)
- branch: <branch_id>
```

**Response:**
```json
{
  "period": {
    "month": 1,
    "year": 2026
  },
  "outward_supplies": {
    "taxable_value": "500000.00",
    "central_tax": "45000.00",
    "state_tax": "45000.00",
    "total_tax": "90000.00"
  },
  "inward_supplies": {
    "taxable_value": "200000.00",
    "central_tax": "18000.00",
    "state_tax": "18000.00",
    "total_input_tax_credit": "36000.00"
  },
  "tax_liability": {
    "central_tax": "27000.00",
    "state_tax": "27000.00",
    "total_tax_payable": "54000.00"
  },
  "summary": {
    "total_tax_payable": "54000.00"
  }
}
```

### HSN Summary
```http
GET /accounting/gst-reports/hsn_summary/
Authorization: Bearer <token>

Query Parameters:
- month: 1-12 (required)
- year: YYYY (required)
- branch: <branch_id>
```

### Tax Liability Register
```http
GET /accounting/gst-reports/tax_liability_register/
Authorization: Bearer <token>

Query Parameters:
- year: YYYY (required)
- branch: <branch_id>
```

**Response:**
```json
{
  "year": 2026,
  "annual_summary": {
    "total_outward_taxable_value": "6000000.00",
    "total_output_tax": "1080000.00",
    "total_inward_taxable_value": "2400000.00",
    "total_input_tax_credit": "432000.00",
    "net_tax_liability": "648000.00"
  },
  "monthly_data": [
    {
      "month": 1,
      "month_name": "January",
      "outward_taxable_value": "500000.00",
      "output_tax": "90000.00",
      "inward_taxable_value": "200000.00",
      "input_tax_credit": "36000.00",
      "net_tax_liability": "54000.00"
    }
  ]
}
```

---

## 💼 Expenses

### List Expenses
```http
GET /accounting/expenses/
Authorization: Bearer <token>

Query Parameters:
- start_date: YYYY-MM-DD
- end_date: YYYY-MM-DD
- category: <category_id>
- branch: <branch_id>
- status: pending|approved|rejected
```

### Create Expense
```http
POST /accounting/expenses/
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": 1,
  "amount": "5000.00",
  "description": "Office supplies",
  "date": "2026-01-31",
  "branch": 1,
  "payment_method": "Cash"
}
```

---

## 📄 Invoices

### List Invoices
```http
GET /accounting/invoices/
Authorization: Bearer <token>

Query Parameters:
- start_date: YYYY-MM-DD
- end_date: YYYY-MM-DD
- customer: <customer_id>
- branch: <branch_id>
- status: draft|sent|paid|cancelled
```

### Create Invoice
```http
POST /accounting/invoices/
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer": 1,
  "invoice_date": "2026-01-31",
  "due_date": "2026-02-15",
  "branch": 1,
  "items": [
    {
      "description": "Car Detailing Service",
      "quantity": 1,
      "unit_price": "5000.00",
      "tax_rate": "18.00"
    }
  ]
}
```

### Download Invoice PDF
```http
GET /accounting/invoices/{id}/download_pdf/
Authorization: Bearer <token>
```

---

## 📈 Reports

### Profit & Loss Report
```http
GET /accounting/reports/profit-loss/
Authorization: Bearer <token>

Query Parameters:
- start_date: YYYY-MM-DD (required)
- end_date: YYYY-MM-DD (required)
- branch: <branch_id>
```

### Cash Flow Report
```http
GET /accounting/reports/cash-flow/
Authorization: Bearer <token>

Query Parameters:
- start_date: YYYY-MM-DD (required)
- end_date: YYYY-MM-DD (required)
- branch: <branch_id>
```

### Tax Summary
```http
GET /accounting/reports/tax-summary/
Authorization: Bearer <token>

Query Parameters:
- start_date: YYYY-MM-DD (required)
- end_date: YYYY-MM-DD (required)
- branch: <branch_id>
```

---

## 🏢 Branches

### List Branches
```http
GET /branches/
Authorization: Bearer <token>
```

### Get Branch Details
```http
GET /branches/{id}/
Authorization: Bearer <token>
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid input data",
  "errors": {
    "field_name": ["Error message"]
  }
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error. Please try again later."
}
```

---

## 📝 Notes

### Pagination
All list endpoints support pagination:
```http
GET /api/endpoint/?page=2&page_size=20
```

**Response:**
```json
{
  "count": 100,
  "next": "http://api.example.com/api/endpoint/?page=3",
  "previous": "http://api.example.com/api/endpoint/?page=1",
  "results": []
}
```

### Filtering
Most endpoints support filtering via query parameters. Check individual endpoint documentation for available filters.

### Date Format
All dates should be in `YYYY-MM-DD` format.

### Time Format
All times should be in `HH:MM:SS` format (24-hour).

### Currency
All amounts are in INR (Indian Rupees) and represented as strings with 2 decimal places.

---

**API Version:** 1.0.0  
**Last Updated:** January 31, 2026  
**Status:** ✅ Production Ready
