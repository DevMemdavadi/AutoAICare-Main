# 🎯 BRANCH-AWARE ADMIN PANEL IMPLEMENTATION GUIDE

## ✅ COMPLETED FEATURES

### 1. Core Infrastructure ✅
- **BranchContext** (`src/contexts/BranchContext.jsx`)
  - Global branch state management
  - Super admin vs Branch admin detection
  - Branch filtering utilities
  - Auto-fetches branches on login
  
- **BranchSelector Component** (`src/components/BranchSelector.jsx`)
  - Dropdown for Super Admin only
  - "All Branches" option
  - Individual branch selection
  - Auto-hidden for branch admins

- **BranchFilter Component** (`src/components/BranchFilter.jsx`)
  - Reusable branch filter for module pages
  - Only visible to Super Admin
  - Used in Bookings, Billing, etc.

### 2. Updated Admin Layout ✅
- **AdminLayout** (`src/components/layouts/AdminLayout.jsx`)
  - Branch selector in topbar (Super Admin only)
  - Conditional sidebar navigation based on role
  - New menu items:
    - Branches (Super Admin only)
    - Bookings
    - Billing
    - Inventory
    - Store
    - Campaigns
    - Membership
    - Rewards
    - Referrals

### 3. Branch Management Module ✅ (Super Admin Only)
- **Branch List** (`src/pages/admin/BranchManagement.jsx`)
  - View all branches
  - Search by name/location
  - Add new branch
  - View branch details
  - Edit/Delete branches
  
- **Branch Detail** (`src/pages/admin/BranchDetail.jsx`)
  - Overview tab
  - Staff tab (placeholder)
  - Inventory tab (placeholder)
  - Bookings tab (placeholder)
  - Invoices tab (placeholder)
  - Analytics tab (placeholder)

### 4. Branch-Aware Dashboard ✅
- **Updated Dashboard** (`src/pages/admin/Dashboard.jsx`)
  - Shows current branch name in header
  - Branch-filtered statistics
  - Super Admin: Branch Performance Comparison widget
  - Branch Admin: Only see their branch data
  - Auto-refreshes when branch selection changes

### 5. Bookings Module ✅
- **Bookings Management** (`src/pages/admin/Bookings.jsx`)
  - Branch filter (Super Admin)
  - Branch column in table (Super Admin)
  - Status filter
  - Search functionality
  - Pagination
  - Respects global branch selection

### 6. Billing Module ✅
- **Billing Management** (`src/pages/admin/Billing.jsx`)
  - Invoice list with branch filter
  - Branch column (Super Admin)
  - Status badges
  - Download/Send invoice actions
  - Revenue statistics
  - Search and filters

### 7. App Integration ✅
- **App.jsx** updated with:
  - BranchProvider wrapper
  - All new routes configured
  - Placeholder routes for pending modules

---

## 📋 REMAINING MODULES TO IMPLEMENT

Use the **Bookings** or **Billing** module as templates. Each module should include:

### Template Structure:
```javascript
import { useBranch } from '@/contexts/BranchContext';
import BranchFilter from '@/components/BranchFilter';

const YourModule = () => {
  const { 
    isSuperAdmin, 
    getBranchFilterParams,
    branches 
  } = useBranch();
  
  // Add branch filter state
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  
  // Fetch data with branch params
  const params = {
    ...getBranchFilterParams(),
    // Super admin can override with specific branch
    ...(isSuperAdmin && selectedBranchFilter !== 'all' 
      ? { branch: selectedBranchFilter } 
      : {}
    )
  };
  
  // Use BranchFilter component
  {isSuperAdmin && (
    <BranchFilter 
      value={selectedBranchFilter}
      onChange={setSelectedBranchFilter}
    />
  )}
  
  // Add branch column in tables if isSuperAdmin
  {isSuperAdmin && (
    <th>Branch</th>
  )}
}
```

### 🔨 Modules to Create:

#### 1. Inventory/Stock Management (`src/pages/admin/Inventory.jsx`)
**Features:**
- Product list with branch filter
- Stock levels per branch
- Low stock alerts
- Stock transfer between branches (Super Admin only)
- Add/Edit stock items
- Branch assignment

**API Endpoints:**
- `GET /inventory/?branch=X`
- `POST /inventory/transfer/` (branch A → branch B)

#### 2. Services & Packages (`src/pages/admin/ServiceManagement.jsx` - UPDATE)
**Features:**
- Global vs Branch-specific toggle
- If global: Available to all branches
- If branch-specific: Branch dropdown selector
- Price variation by branch (optional)
- List shows "Global" badge or branch name

**Fields to Add:**
- `is_global` (boolean)
- `branch` (foreign key, nullable)
- `branches` (many-to-many for multi-branch packages)

#### 3. Accessories Store Admin (`src/pages/admin/Store.jsx`)
**Features:**
- Product management
- Global or branch-specific products
- Stock per branch
- Branch filter
- Price management

#### 4. Campaigns/Marketing (`src/pages/admin/Campaigns.jsx`)
**Features:**
- Create campaign
- Target audience
- Apply to: All branches / Specific branch
- SMS/Email templates
- Schedule and status

**Fields:**
- `branches` (many-to-many)
- `is_global` (boolean)

#### 5. Membership Plans (`src/pages/admin/Membership.jsx`)
**Features:**
- Create membership plans
- Branch applicability (all or specific)
- Pricing per branch (optional)
- Active/Inactive status

#### 6. Rewards Module (`src/pages/admin/Rewards.jsx`)
**Features:**
- Points configuration
- Branch-specific rules
- Expiry settings
- Admin adjustments with branch filter

#### 7. Referrals Module (`src/pages/admin/Referrals.jsx`)
**Features:**
- Referral list with branch filter
- Branch column (Super Admin)
- Referral codes
- Points awarded
- Status tracking

#### 8. Staff Management (`src/pages/admin/CustomersStaff.jsx` - UPDATE)
**Features:**
- Add branch assignment field
- Branch filter (Super Admin)
- Branch column in staff list
- Only show staff from selected branch
- Branch selector in create/edit form

#### 9. Analytics Module (`src/pages/admin/Analytics.jsx` - UPDATE)
**Features:**
- Branch comparison charts
- Revenue by branch (bar/line chart)
- Service-wise revenue by branch
- Job volume by branch
- Staff performance by branch
- Filters for date range and branch

**Charts to Add:**
- Branch Revenue Comparison (Bar Chart)
- Monthly Revenue by Branch (Stacked)
- Top Performing Branches
- Service Usage by Branch

#### 10. Settings (`src/pages/admin/Settings.jsx` - UPDATE)
**Features:**
- Global settings (Super Admin only)
- Branch-specific settings tabs
- Template management (global vs branch)
- Tax settings per branch
- Operating hours per branch

---

## 🔧 IMPLEMENTATION CHECKLIST

### For Each Module:
- [ ] Import `useBranch` hook
- [ ] Import `BranchFilter` component
- [ ] Add `selectedBranchFilter` state (Super Admin)
- [ ] Include `getBranchFilterParams()` in API calls
- [ ] Add branch column in tables (conditionally for Super Admin)
- [ ] Add branch filter dropdown in filters section
- [ ] Update create/edit forms with branch selection
- [ ] Add "Global" toggle where applicable
- [ ] Test with both Super Admin and Branch Admin roles

---

## 🎨 UI/UX GUIDELINES

### Branch Indicator:
```jsx
// In headers
<p className="text-gray-600 mt-1">
  {isSuperAdmin 
    ? `Viewing: ${getCurrentBranchName()}`
    : `Branch: ${getCurrentBranchName()}`
  }
</p>
```

### Branch Badge:
```jsx
<span className="px-2 py-1 text-xs font-medium bg-primary bg-opacity-10 text-primary rounded">
  {item.is_global ? 'Global' : item.branch?.name}
</span>
```

### Branch Column (Tables):
```jsx
{isSuperAdmin && (
  <td className="px-6 py-4">
    <div className="flex items-center gap-2">
      <Building2 size={16} className="text-gray-400" />
      <span className="text-sm text-gray-700">
        {item.branch?.name || 'All Branches'}
      </span>
    </div>
  </td>
)}
```

---

## 🔐 ROLE-BASED ACCESS CONTROL

### Super Admin Can:
✅ Switch between branches via dropdown
✅ View "All Branches" data
✅ Access Branch Management module
✅ See branch columns in all tables
✅ Create global resources (packages, campaigns)
✅ Transfer stock between branches
✅ View branch performance comparison

### Branch Admin Can:
✅ See only their assigned branch
❌ No branch switching
❌ No branch management access
❌ No cross-branch data
✅ All other modules (filtered to their branch)

---

## 📊 BACKEND API REQUIREMENTS

### Required Query Parameters:
```
?branch=<branch_id>  // Filter by specific branch
```

### Required Fields in Models:
```python
class YourModel(models.Model):
    branch = models.ForeignKey(
        'branches.Branch', 
        on_delete=models.CASCADE,
        null=True,  # Null for global items
        blank=True
    )
    is_global = models.BooleanField(default=False)  # For applicable models
```

### Required Endpoints:
- `GET /branches/` - List branches
- `GET /branches/<id>/` - Branch details
- `POST /branches/` - Create branch (Super Admin)
- `GET /analytics/branch-comparison/` - Branch stats
- All resource endpoints should support `?branch=X` filter

---

## 🧪 TESTING CHECKLIST

### Super Admin Flow:
1. [ ] Login as Super Admin
2. [ ] See branch dropdown in topbar
3. [ ] Switch to "All Branches"
4. [ ] See branch comparison widget on dashboard
5. [ ] Access Branch Management module
6. [ ] Create a new branch
7. [ ] View each module with "All Branches"
8. [ ] Filter to specific branch in each module
9. [ ] See branch columns in all tables

### Branch Admin Flow:
1. [ ] Login as Branch Admin
2. [ ] No branch dropdown visible
3. [ ] See only their branch name in header
4. [ ] Dashboard shows only their branch stats
5. [ ] Cannot access Branch Management
6. [ ] All modules auto-filtered to their branch
7. [ ] No branch filter dropdowns visible
8. [ ] No branch columns in tables

---

## 🚀 QUICK START

### 1. Test the Implementation:
```bash
cd Frontend
npm install
npm run dev
```

### 2. Login as Super Admin:
- Email: superadmin@example.com
- You should see the branch selector in topbar

### 3. Navigate to Modules:
- ✅ Dashboard (updated)
- ✅ Branches (new)
- ✅ Bookings (new)
- ✅ Billing (new)
- ⏳ Others (use as templates)

---

## 📝 NOTES

- All branch-aware functionality is centralized in `BranchContext`
- The `useBranch()` hook provides all necessary utilities
- Branch filtering happens automatically when using `getBranchFilterParams()`
- BranchSelector component handles UI for branch switching
- BranchFilter component is reusable across all modules
- All components gracefully handle missing branch data

---

## 🎯 NEXT STEPS

1. Implement remaining modules using Bookings/Billing as templates
2. Update backend to support branch filtering on all endpoints
3. Add branch assignment in user registration/management
4. Implement stock transfer functionality
5. Create branch-specific reporting
6. Add branch performance analytics charts
7. Implement branch-specific templates (SMS/Email)

---

**Implementation Status:** 60% Complete ✅
**Core Infrastructure:** 100% Complete ✅
**Critical Modules:** 50% Complete ✅
**Remaining:** Template-based modules (follow the pattern above)
