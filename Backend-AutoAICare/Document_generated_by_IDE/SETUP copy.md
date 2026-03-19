🚀 PHASE–1: FEATURES YOU MUST BUILD + TEST FIRST

(This is your MVP → validates core workflow)

1️⃣ User Authentication + Roles + Branch Mapping
2️⃣ Services & Packages
3️⃣ Customers + Vehicles
4️⃣ Booking System
5️⃣ Job Card System
6️⃣ Payments
7️⃣ Invoice System (basic)
8️⃣ Notifications (basic)
9️⃣ Inventory (minimal)
🔟 Accessories Store (basic)

After these 10 are stable →
you can move to the next advanced modules (memberships, rewards, wallet, etc.).

🧪 NOW LET’S DO DETAILED TESTING FOR FEATURE #1

We start with:

⭐ 1️⃣ User Authentication + Roles + Branch Mapping

We will cover testing for:

Register

Login

Role enforcement

Branch enforcement

Permissions

Session management

OTP

Admin/Staff creation

Super Admin vs Branch Admin behaviour

🧪 TEST CASES FOR AUTHENTICATION MODULE

These are manual QA test cases, exactly how you'll test in Postman or frontend.

🔶 A. User Registration API Testing

Endpoint: POST /auth/register/

✔ Test Case 1: Register with valid data

Payload:

{
  "name": "John Doe",
  "email": "john@test.com",
  "password": "Test@1234",
  "phone": "9999999999"
}


Expected Result:

Status: 201

User created

OTP sent

✔ Test Case 2: Register with existing email

Expected:

Status: 400

Error: “Email already exists”

✔ Test Case 3: Register with weak password

Expected:

Status: 400

Error message for password

🔶 B. OTP Verification Testing

Endpoint: POST /auth/verify-otp/

✔ Test Case 4: Valid OTP

Expected:

Status: 200

User marked as verified

✔ Test Case 5: Wrong OTP

Expected:

Status: 400

🔶 C. Login Testing

Endpoint: POST /auth/login/

✔ Test Case 6: Login with correct credentials

Expected:

Access + Refresh token

user.role

user.branch

✔ Test Case 7: Login with wrong password

Expected: 401

🔶 D. Role-Based Testing

We test all role types:

Roles:

super_admin

admin

staff

technician

customer

✔ Test Case 8: Customer trying to access admin endpoint

Endpoint: /admin/bookings/
Expected: 403 Forbidden

✔ Test Case 9: Admin accessing customer-only endpoint

Expected: 403 Forbidden

✔ Test Case 10: Technician accessing bookings list

Expected:

Should only see job cards assigned to them

Should NOT see all bookings

🔶 E. Branch Enforcement Testing

Assume we have:

Admin of Branch A

Admin of Branch B

Super Admin

✔ Test Case 11: Admin of Branch A tries to access Branch B bookings

Expected: 403 Forbidden

✔ Test Case 12: Branch Admin creating staff — branch auto assigned

Expected:

Staff.branch == Admin.branch

✔ Test Case 13: Super Admin switching branch

UI dropdown:

All Branches
Branch A
Branch B


Expected:

All data refresh based on branch selection

🔶 F. Token Refresh Testing

Endpoint: /auth/refresh/

✔ Test Case 14: Refresh token valid

Expected:

new access token

✔ Test Case 15: Refresh token expired

Expected:

401

🔶 G. Logout Testing
✔ Test Case 16: Logout

Expected:

Refresh token invalidated

🧪 Summary: Authentication Testing Checklist
Test Type	Count
Registration	3
OTP	2
Login	2
Role Permissions	3
Branch Permissions	3
Token Refresh	2
Logout	1

Total test cases for Feature #1 → 16 Test Cases

🎉 Done with Feature #1 Testing

If you want, we move to:

🔥 Next Feature to Test → 2️⃣ Services & Packages

This includes:

Create packages

Update packages

List packages

Branch-specific packages

Global packages

Add-ons

Price override per branch

Customer visibility

Just tell me: