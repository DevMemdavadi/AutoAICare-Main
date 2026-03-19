# 🗝️ Multi-Tenant Test Credentials & Environment Guide

This document contains all the credentials and URLs required to test the multi-tenant isolation, company subdomains, and role-based permissions in the local environment.

---

## 🌐 Platform Overview

| Level | Identification | Access Scope |
| :--- | :--- | :--- |
| **Global Admin** | Shared Database | All Companies, All Branches, System Settings |
| **Company Admin** | Subdomain / Company ID | Single Company (All Branches within it) |
| **Branch Staff** | Subdomain + Branch ID | Single Branch only |

---

## 🛠️ Platform Management (Global)

**URL**: `http://localhost:8000/admin/`

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Global Super Admin** | `superadmin@detailease.com` | `SuperAdmin@123` | Full System Access (All Tenants) |

---

## 🏢 Company 1: DetailEase Pro

**Primary URL**: `http://pro.localhost:8000/`  
**Test URL**: `http://pro.localhost:8000/test-subdomain/` (Verify detection)

| Role | Email | Password | Branch | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Company Admin** | `admin@pro.com` | `SecurePass@123` | - | Everything in DetailEase Pro (Company Level) |
| **Branch Admin** | `branch_admin_pro-no@test.com` | `Test@123` | North | North Branch Management |
| **Floor Manager** | `fm_pro-no@test.com` | `Test@123` | North | North Operations & QC |
| **Supervisor** | `sup_pro-no@test.com` | `Test@123` | North | North Task Review |
| **Applicator** | `app1_pro-no@test.com` | `Test@123` | North | North Work Execution |
| **Branch Admin** | `branch_admin_pro-so@test.com` | `Test@123` | South | South Branch Management |

---

## 🏢 Company 2: Elite Car Detailing

**Primary URL**: `http://elite.localhost:8000/`  
**Test URL**: `http://elite.localhost:8000/test-subdomain/` (Verify detection)

| Role | Email | Password | Branch | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Company Admin** | `admin@elite.com` | `SecurePass@123` | - | Everything in Elite Company |
| **Branch Admin** | `branch_admin_elite-ma@test.com` | `Test@123` | Main | Main Studio Management |
| **Floor Manager** | `fm_elite-ma@test.com` | `Test@123` | Main | Main Studio Operations |
| **Supervisor** | `sup_elite-ma@test.com` | `Test@123` | Main | Main Studio Quality |

---

## 🧪 Testing Workflows

### 1. Verification of Subdomain Detection

Visit `http://pro.localhost:8000/test-subdomain/`.  
**Success**: You see `JSON` with `"company": {"name": "DetailEase Pro"}`.

### 2. Data Leakage Test (The "Wall" Check)

- Login as `admin@pro.com`.
- Visit the parts/inventory list.
- **Success**: You should see only parts with SKUs like `CER-PRO`, `MF-PRO`. You should **NOT** see any `ELITE` parts.

### 3. API Isolation

Use Postman or Curl:

```bash
# Get customers for Pro (using login token for pro admin)
GET http://pro.localhost:8000/api/customers/

# Try to fetch that same list using Elite subdomain
GET http://elite.localhost:8000/api/customers/
```

### 4. Branch Isolation

- Login as `fm_pro-no@test.com` (North Branch Manager).
- Visit the staff or booking list.
- **Success**: You should see only data for **North Branch**. You should not see **South Branch** data (even though it belongs to the same company).

---

## 📑 Resetting the Environment

To wipe and recreate this exact setup, run:

```bash
python manage.py seed_multi_tenant --clear
```

---
*Note: Browser cookies are shared across subdomains on `.localhost`. If you switch between companies, we recommend logging out first or using an Incognito/Private window for each company.*
