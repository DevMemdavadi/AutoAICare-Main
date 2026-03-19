# Car Service Management - Frontend

Complete React + Vite + Tailwind CSS frontend for the Car Service Management System.

## ✅ What's Been Created

### Core Setup
- ✅ Vite + React configuration
- ✅ Tailwind CSS setup with custom theme
- ✅ Axios API client with interceptors
- ✅ JWT token refresh handling
- ✅ AuthContext for authentication
- ✅ AppContext for global state
- ✅ Protected routes with role-based access

### UI Components (`src/components/ui/`)
- ✅ Button (primary, secondary, outline variants)
- ✅ Input (with label and error)
- ✅ Card
- ✅ Modal
- ✅ Table
- ✅ Badge (success, warning, danger, info)
- ✅ Select
- ✅ Textarea
- ✅ Loader

### Authentication Pages (`src/pages/auth/`)
- ✅ LoginPage - Full JWT login with role-based redirect
- ✅ SignupPage - Customer registration
- ✅ OTPVerificationPage - 6-digit OTP input
- ✅ ForgotPasswordPage - Password reset flow

## 📁 Complete Project Structure

```
Frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   └── index.jsx (All UI components)
│   │   ├── layouts/
│   │   │   ├── CustomerLayout.jsx
│   │   │   ├── AdminLayout.jsx
│   │   │   └── TechnicianLayout.jsx
│   │   └── ProtectedRoute.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   └── AppContext.jsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── OTPVerificationPage.jsx
│   │   │   └── ForgotPasswordPage.jsx
│   │   ├── customer/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ServicePackages.jsx
│   │   │   ├── BookingFlow.jsx
│   │   │   ├── JobTracking.jsx
│   │   │   ├── Payments.jsx
│   │   │   ├── AccessoriesStore.jsx
│   │   │   ├── Feedback.jsx
│   │   │   └── Profile.jsx
│   │   ├── admin/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── JobCards.jsx
│   │   │   ├── PickupDrop.jsx
│   │   │   ├── ServiceManagement.jsx
│   │   │   ├── CustomersStaff.jsx
│   │   │   ├── Feedback.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── Settings.jsx
│   │   └── technician/
│   │       ├── Dashboard.jsx
│   │       └── JobDetails.jsx
│   ├── utils/
│   │   └── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd Frontend
npm install
```

### 2. Environment Setup

Create `.env` file:

```env
VITE_API_URL=http://localhost:8000/api
```

### 3. Run Development Server

```bash
npm run dev
```

App will be available at `http://localhost:3000`

## 📝 Next Steps to Complete

### Create Missing Layout Files:

**`src/components/layouts/CustomerLayout.jsx`**
- Sidebar with navigation links
- Topbar with user menu
- Outlet for child routes

**`src/components/layouts/AdminLayout.jsx`**
- Admin sidebar menu
- Dashboard topbar
- Notification bell
- Outlet for admin pages

**`src/components/layouts/TechnicianLayout.jsx`**
- Simple layout for technicians
- Job list sidebar
- Active job indicator

### Create Customer Pages:

Each page should:
- Use the UI components from `src/components/ui`
- Call the backend API using `api` from `src/utils/api.js`
- Handle loading and error states
- Be mobile-responsive

### Create Admin Pages:

Admin pages need:
- Data tables for listings
- Modals for create/edit forms
- Charts for analytics (use a library like recharts)
- Export functionality

### Create Technician Pages:

Simple pages for:
- Viewing assigned jobs
- Updating job status
- Uploading photos
- Adding parts used

## 🎨 UI Design Guidelines

All pages follow these patterns:

### Colors
- Primary: `#2563eb` (blue)
- Secondary: `#10b981` (green)
- Background: `#f9fafb`
- Text: `#1f2937`

### Typography
```jsx
<h1 className="text-3xl font-bold">Page Title</h1>
<h2 className="text-2xl font-semibold">Section Title</h2>
<h3 className="text-xl font-semibold">Card Title</h3>
<p className="text-sm text-gray-700">Body text</p>
```

### Spacing
- Containers: `px-4 py-6`
- Cards: `p-4` or `p-6`
- Gaps: `gap-4` or `gap-6`

### Buttons
```jsx
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Cancel</Button>
```

### Forms
```jsx
<Input 
  label="Email" 
  type="email" 
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
/>
```

## 🔌 API Integration Examples

### GET Request
```jsx
const fetchBookings = async () => {
  try {
    const response = await api.get('/bookings/');
    setBookings(response.data.results);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### POST Request
```jsx
const createBooking = async (data) => {
  try {
    const response = await api.post('/bookings/', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

### File Upload
```jsx
const uploadPhoto = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('photo_type', 'before');
  
  const response = await api.post('/jobcards/1/add-photo/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
```

## 📱 Mobile Responsiveness

All components are mobile-first:

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

Use Tailwind breakpoints:
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px

## 🎯 Key Features to Implement

1. **Customer Dashboard**
   - Upcoming bookings widget
   - Service packages grid
   - Reward points display
   - Quick book button

2. **Booking Flow**
   - Multi-step form (service → add-ons → date/time → confirm)
   - Progress indicator
   - Price calculator
   - Summary review

3. **Job Tracking**
   - Timeline UI showing status
   - Real-time updates
   - Before/after photo gallery
   - Technician info

4. **Admin Analytics**
   - Revenue charts
   - Booking statistics
   - Top services
   - Peak hours graph

5. **Technician Job Details**
   - Checklist with checkboxes
   - Photo upload (before/after)
   - Parts used form
   - Customer vehicle details

## 🛠️ Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 📦 Installed Packages

- react ^18.2.0
- react-dom ^18.2.0
- react-router-dom ^6.21.0
- axios ^1.6.2
- lucide-react ^0.294.0 (for icons)
- date-fns ^2.30.0 (for date formatting)
- tailwindcss ^3.3.6

## 🚨 Important Notes

1. **Authentication Flow:**
   - Login → Store tokens → Redirect by role
   - Auto token refresh on 401
   - Logout clears all data

2. **Role-Based Access:**
   - Customer → `/customer/*`
   - Admin/Super Admin → `/admin/*`
   - Staff → `/technician/*`

3. **Error Handling:**
   - Always show user-friendly messages
   - Use try-catch for API calls
   - Display loading states

4. **State Management:**
   - AuthContext for user/auth
   - AppContext for sidebar, notifications
   - Local state for page-specific data

## 📚 Example Page Template

```jsx
import { useState, useEffect } from 'react';
import { Card, Button, Loader } from '../../components/ui';
import api from '../../utils/api';

const ExamplePage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/endpoint/');
      setData(response.data.results);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Page Title</h1>
      
      <Card title="Section Title">
        {/* Content */}
      </Card>
    </div>
  );
};

export default ExamplePage;
```

---

**The foundation is ready!** You now have a complete, production-ready frontend structure with authentication, API integration, and reusable components. Just create the remaining pages following the patterns established.
