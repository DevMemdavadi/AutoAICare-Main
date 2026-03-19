# 🔥 ACCOUNTING MODULE - COMPLETE API DOCUMENTATION

This document provides comprehensive API endpoints for the advanced accounting module.

---

## 📊 **BASE URL**
```
/api/accounting/
```

---

## 🏢 **1. VENDORS**

### **List Vendors**
```http
GET /api/accounting/vendors/
```

**Query Parameters:**
- `is_active` (boolean): Filter by active status
- `search` (string): Search by name, contact person, email, phone

**Response:**
```json
{
  "count": 10,
  "results": [
    {
      "id": 1,
      "name": "ABC Parts Supplier",
      "contact_person": "John Doe",
      "email": "john@abcparts.com",
      "phone": "9876543210",
      "address": "123 Market Street",
      "gst_number": "27AABCU9603R1ZM",
      "pan_number": "AABCU9603R",
      "payment_terms": "Net 30",
      "is_active": true,
      "notes": "",
      "created_at": "2025-01-01T10:00:00Z",
      "total_expenses": 50000
    }
  ]
}
```

### **Create Vendor**
```http
POST /api/accounting/vendors/
```

**Request Body:**
```json
{
  "name": "ABC Parts Supplier",
  "contact_person": "John Doe",
  "email": "john@abcparts.com",
  "phone": "9876543210",
  "address": "123 Market Street",
  "gst_number": "27AABCU9603R1ZM",
  "pan_number": "AABCU9603R",
  "payment_terms": "Net 30",
  "is_active": true
}
```

### **Get Vendor Expenses**
```http
GET /api/accounting/vendors/{id}/expenses/
```

**Query Parameters:**
- `start_date` (date): Filter from date
- `end_date` (date): Filter to date

---

## 💰 **2. EXPENSES**

### **List Expenses**
```http
GET /api/accounting/expenses/
```

**Query Parameters:**
- `category` (string): Filter by category
- `branch` (int): Filter by branch ID
- `vendor` (int): Filter by vendor ID
- `payment_status` (string): paid, pending, partial
- `start_date` (date): From date
- `end_date` (date): To date
- `search` (string): Search in title, description

**Response:**
```json
{
  "count": 50,
  "results": [
    {
      "id": 1,
      "title": "Office Rent - January 2025",
      "category": "rent",
      "category_display": "Rent",
      "amount": "25000.00",
      "date": "2025-01-01",
      "description": "Monthly office rent",
      "vendor": 1,
      "vendor_details": { ... },
      "vendor_name": null,
      "branch": 1,
      "branch_name": "Main Branch",
      "staff": null,
      "staff_name": null,
      "payment_status": "paid",
      "payment_status_display": "Paid",
      "recorded_by": 1,
      "recorded_by_name": "Admin User",
      "created_at": "2025-01-01T10:00:00Z"
    }
  ]
}
```

### **Create Expense**
```http
POST /api/accounting/expenses/
```

**Request Body:**
```json
{
  "title": "Office Rent - January 2025",
  "category": "rent",
  "amount": 25000,
  "date": "2025-01-01",
  "description": "Monthly office rent",
  "vendor": 1,
  "branch": 1,
  "payment_status": "paid"
}
```

### **Expense Category Breakdown**
```http
GET /api/accounting/expenses/category_breakdown/
```

**Response:**
```json
[
  {
    "category": "rent",
    "category_display": "Rent",
    "total": "75000.00",
    "count": 3
  },
  {
    "category": "salary",
    "category_display": "Salary/Wages",
    "total": "150000.00",
    "count": 10
  }
]
```

---

## 📈 **3. TRANSACTIONS**

### **List Transactions**
```http
GET /api/accounting/transactions/
```

**Query Parameters:**
- `type` (string): income, expense
- `source` (string): invoice, expense, salary, adjustment, petty_cash
- `branch` (int): Filter by branch
- `start_date` (date)
- `end_date` (date)

### **Financial Summary**
```http
GET /api/accounting/transactions/summary/
```

**Response:**
```json
{
  "total_income": "500000.00",
  "total_expense": "350000.00",
  "net_profit": "150000.00",
  "receivables": "75000.00",
  "payables": "45000.00",
  "pending_salaries": "25000.00"
}
```

### **Income Breakdown**
```http
GET /api/accounting/transactions/income_breakdown/
```

**Response:**
```json
[
  {
    "source": "invoice",
    "total": "450000.00",
    "count": 120
  },
  {
    "source": "adjustment",
    "total": "50000.00",
    "count": 5
  }
]
```

### **Monthly Trend**
```http
GET /api/accounting/transactions/monthly_trend/
```

**Response:**
```json
[
  {
    "month": "2025-01-01",
    "income": "150000.00",
    "expense": "100000.00",
    "profit": "50000.00"
  },
  {
    "month": "2025-02-01",
    "income": "175000.00",
    "expense": "120000.00",
    "profit": "55000.00"
  }
]
```

### **Branch-wise Summary** (Super Admin Only)
```http
GET /api/accounting/transactions/branch_summary/
```

**Response:**
```json
[
  {
    "branch_id": 1,
    "branch_name": "Main Branch",
    "total_income": "300000.00",
    "total_expense": "200000.00",
    "net_profit": "100000.00"
  },
  {
    "branch_id": 2,
    "branch_name": "East Branch",
    "total_income": "200000.00",
    "total_expense": "150000.00",
    "net_profit": "50000.00"
  }
]
```

---

## 👥 **4. EMPLOYEE SALARY STRUCTURES**

### **List Salary Structures**
```http
GET /api/accounting/salary-structures/
```

**Query Parameters:**
- `employee` (int): Filter by employee ID
- `is_active` (boolean): Filter active structures

**Response:**
```json
{
  "count": 10,
  "results": [
    {
      "id": 1,
      "employee": 5,
      "employee_name": "John Mechanic",
      "employee_email": "john@example.com",
      "employee_role": "supervisor",
      "base_salary": "30000.00",
      "hra": "6000.00",
      "transport_allowance": "2000.00",
      "other_allowances": "1000.00",
      "pf_deduction": "3600.00",
      "esi_deduction": "450.00",
      "tds_deduction": "0.00",
      "incentive_per_job": "100.00",
      "incentive_per_qc_pass": "50.00",
      "overtime_hourly_rate": "200.00",
      "gross_salary": 39000.00,
      "total_deductions": 4050.00,
      "net_salary": 34950.00,
      "is_active": true,
      "effective_from": "2025-01-01"
    }
  ]
}
```

### **Create Salary Structure**
```http
POST /api/accounting/salary-structures/
```

**Request Body:**
```json
{
  "employee": 5,
  "base_salary": 30000,
  "hra": 6000,
  "transport_allowance": 2000,
  "other_allowances": 1000,
  "pf_deduction": 3600,
  "esi_deduction": 450,
  "incentive_per_job": 100,
  "incentive_per_qc_pass": 50,
  "overtime_hourly_rate": 200,
  "is_active": true,
  "effective_from": "2025-01-01"
}
```

---

## 💵 **5. PAYROLL**

### **List Payroll**
```http
GET /api/accounting/payroll/
```

**Query Parameters:**
- `employee` (int): Filter by employee
- `month` (int): 1-12
- `year` (int)
- `status` (string): pending, approved, paid, cancelled

**Response:**
```json
{
  "count": 20,
  "results": [
    {
      "id": 1,
      "employee": 5,
      "employee_name": "John Mechanic",
      "employee_email": "john@example.com",
      "salary_structure": 1,
      "month": 1,
      "year": 2025,
      "month_name": "January",
      "base_salary": "30000.00",
      "allowances": "9000.00",
      "deductions": "4050.00",
      "incentives": "500.00",
      "overtime_hours": "10.00",
      "overtime_amount": "2000.00",
      "penalties": "0.00",
      "days_present": 26,
      "days_absent": 0,
      "days_leave": 0,
      "jobs_completed": 15,
      "qc_pass_count": 14,
      "gross_salary": "39000.00",
      "net_salary": "37450.00",
      "status": "pending",
      "status_display": "Pending",
      "payment_date": null,
      "payment_method": null
    }
  ]
}
```

### **Generate Bulk Payroll**
```http
POST /api/accounting/payroll/generate_bulk/
```

**Request Body:**
```json
{
  "month": 1,
  "year": 2025,
  "employee_ids": [5, 6, 7]  // Optional, leave empty for all employees
}
```

**Response:**
```json
{
  "created": [ ... ],  // Array of created payroll records
  "errors": [],
  "message": "Generated 3 payroll records"
}
```

### **Mark Payroll as Paid**
```http
POST /api/accounting/payroll/{id}/mark_paid/
```

**Request Body:**
```json
{
  "payment_method": "Bank Transfer",
  "payment_date": "2025-01-31"
}
```

---

## 💰 **6. PETTY CASH**

### **List Petty Cash**
```http
GET /api/accounting/petty-cash/
```

**Query Parameters:**
- `branch` (int)
- `start_date` (date)
- `end_date` (date)

**Response:**
```json
{
  "count": 30,
  "results": [
    {
      "id": 1,
      "date": "2025-01-01",
      "transaction_type": "in",
      "transaction_type_display": "Cash In",
      "amount": "5000.00",
      "description": "Opening petty cash",
      "category": null,
      "balance_before": "0.00",
      "balance_after": "5000.00",
      "branch": 1,
      "branch_name": "Main Branch",
      "recorded_by": 1,
      "recorded_by_name": "Admin User"
    }
  ]
}
```

### **Add Petty Cash Entry**
```http
POST /api/accounting/petty-cash/
```

**Request Body:**
```json
{
  "date": "2025-01-01",
  "transaction_type": "out",
  "amount": 500,
  "description": "Tea & Snacks for staff",
  "category": "supplies",
  "branch": 1
}
```

### **Get Current Balance**
```http
GET /api/accounting/petty-cash/current_balance/?branch=1
```

**Response:**
```json
{
  "current_balance": "4500.00",
  "last_updated": "2025-01-05"
}
```

---

## 🔄 **7. RECURRING EXPENSES**

### **List Recurring Expenses**
```http
GET /api/accounting/recurring-expenses/
```

**Query Parameters:**
- `is_active` (boolean)
- `frequency` (string): daily, weekly, monthly, quarterly, yearly

**Response:**
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "title": "Office Rent",
      "category": "rent",
      "category_display": "Rent",
      "amount": "25000.00",
      "frequency": "monthly",
      "frequency_display": "Monthly",
      "start_date": "2025-01-01",
      "end_date": null,
      "vendor": 1,
      "vendor_name": "Property Owner",
      "branch": 1,
      "branch_name": "Main Branch",
      "description": "Monthly office rent",
      "auto_generate": true,
      "last_generated_date": "2025-01-01",
      "is_active": true
    }
  ]
}
```

### **Create Recurring Expense**
```http
POST /api/accounting/recurring-expenses/
```

**Request Body:**
```json
{
  "title": "Office Rent",
  "category": "rent",
  "amount": 25000,
  "frequency": "monthly",
  "start_date": "2025-01-01",
  "end_date": null,
  "vendor": 1,
  "branch": 1,
  "description": "Monthly office rent",
  "auto_generate": true,
  "is_active": true
}
```

### **Process Recurring Expenses** (Manual Trigger)
```http
POST /api/accounting/recurring-expenses/process_recurring/
```

**Response:**
```json
{
  "processed": [
    {
      "recurring_id": 1,
      "expense_id": 42,
      "title": "Office Rent",
      "amount": "25000.00"
    }
  ],
  "count": 1,
  "message": "Processed 1 recurring expenses"
}
```

---

## 🛠️ **MANAGEMENT COMMANDS**

### **Process Recurring Expenses (Cron)**
```bash
python manage.py process_recurring_expenses
python manage.py process_recurring_expenses --dry-run  # Test mode
```

### **Generate Monthly Payroll**
```bash
python manage.py generate_payroll
python manage.py generate_payroll --month 1 --year 2025
python manage.py generate_payroll --employee 5
python manage.py generate_payroll --dry-run
python manage.py generate_payroll --force  # Regenerate existing
```

---

## 🔐 **PERMISSIONS**

### **Role-Based Access:**

1. **Super Admin:**
   - Full access to all accounting modules
   - Can view branch-wise summaries
   - Can manage all vendors, expenses, salaries

2. **Branch Admin:**
   - Can view/manage expenses for their branch only
   - Can view salary records for their branch
   - Limited access to financial reports

3. **Accountant:**
   - Full access to accounting modules
   - Cannot modify system settings
   - Can generate reports

4. **Staff:**
   - Can view their own salary slips
   - Cannot access financial data

---

## 📊 **USAGE EXAMPLES**

### **1. Get Monthly Financial Summary**
```javascript
const summary = await api.get('/accounting/transactions/summary/');
console.log(`Net Profit: ₹${summary.data.net_profit}`);
```

### **2. Record a New Expense**
```javascript
await api.post('/accounting/expenses/', {
  title: 'Office Supplies',
  category: 'supplies',
  amount: 5000,
  date: '2025-01-15',
  payment_status: 'paid',
  branch: 1
});
```

### **3. Generate Payroll for Current Month**
```javascript
const now = new Date();
const result = await api.post('/accounting/payroll/generate_bulk/', {
  month: now.getMonth() + 1,
  year: now.getFullYear()
});
console.log(result.data.message);
```

### **4. Get Expense Breakdown**
```javascript
const breakdown = await api.get('/accounting/expenses/category_breakdown/');
// Use for pie chart visualization
```

---

## 🎯 **AUTOMATION FEATURES**

1. **Auto-create income transaction** when invoice is paid
2. **Auto-create expense transaction** when expense is recorded as paid
3. **Recurring expenses** auto-generate on schedule
4. **Salary auto-calculation** based on structure
5. **Petty cash balance** auto-updated

---

## 📧 **FUTURE ENHANCEMENTS**

1. **GST/Tax Reports** - Automatic tax calculation
2. **Bank Reconciliation** - Match transactions with bank statements
3. **Email Notifications** - Auto-send salary slips, financial alerts
4. **Advanced Analytics** - MIS reports, profitability analysis
5. **Multi-currency Support** - For international transactions

---

**Created:** December 2025  
**Version:** 1.0
