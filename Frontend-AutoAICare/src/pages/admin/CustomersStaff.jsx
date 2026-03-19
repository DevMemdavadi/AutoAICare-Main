import { Button, Card, Input, Modal, Select } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import { Building2, Edit2, Eye, EyeOff, Mail, Phone, Search, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CustomersStaff = () => {
  const { isSuperAdmin, isCompanyAdmin, getBranchFilterParams, branches, selectedBranch, getCurrentBranchId, getCurrentBranchName } = useBranch();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('customers'); // customers, staff, admins
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all'); // Add role filter state
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer',
    password: '',
    password2: '',
    is_active: true,
    branch: null,
  });

  useEffect(() => {
    fetchUsers();
    setCurrentPage(1);
  }, [activeTab, selectedBranch, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let params = {
        ...getBranchFilterParams(),
        page_size: 10000 // Fetch everything for global frontend search
      };

      // Map tabs to appropriate role filters
      if (activeTab === 'customers') {
        params.role = 'customer';
      } else if (activeTab === 'staff') {
        params.role = 'staff';
      } else if (activeTab === 'admins') {
        params.role = 'admin';
      }

      if ((isSuperAdmin || isCompanyAdmin) && roleFilter !== 'all') {
        params.specific_role = roleFilter;
      }

      const response = await api.get(`/auth/users/`, { params });

      // Store all results for local filtering and pagination
      const userData = response.data.results || response.data || [];
      setUsers(userData);
      setTotalCount(response.data.count || userData.length);

      // Initial total pages based on all data
      const total = Math.ceil((response.data.count || userData.length) / pageSize);
      setTotalPages(total);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    // Validate branch selection for super admin
    if ((isSuperAdmin || isCompanyAdmin) &&
      ['floor_manager', 'supervisor', 'applicator', 'branch_admin', 'customer'].includes(userForm.role) &&
      !userForm.branch) {
      setAlert({ show: true, type: 'error', message: 'Please select a branch' });
      return;
    }

    // Validate password match
    if (userForm.password !== userForm.password2) {
      setAlert({ show: true, type: 'error', message: 'Passwords do not match!' });
      return;
    }

    try {
      // Prepare user data with branch assignment
      const userData = { ...userForm };

      // If creating a customer and not super admin, auto-assign current branch
      if (userForm.role === 'customer' && !isSuperAdmin && !isCompanyAdmin) {
        const currentBranchId = getCurrentBranchId();
        if (currentBranchId) {
          userData.branch = currentBranchId;
        }
      }

      // Use different endpoints for different user types
      let response;
      if (['floor_manager', 'supervisor', 'branch_admin', 'applicator'].includes(userForm.role)) {
        // For staff roles, use the create-staff endpoint
        response = await api.post('/auth/create-staff/', userData);
      } else {
        // For customers, use the register endpoint
        response = await api.post('/auth/register/', userData);
      }

      setShowAddModal(false);
      setUserForm({
        name: '',
        email: '',
        phone: '',
        role: activeTab === 'staff' ? 'floor_manager' : activeTab === 'admins' ? 'super_admin' : 'customer',
        password: '',
        password2: '',
        is_active: true,
        branch: null,
      });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      // Handle specific error types
      let errorMsg = 'Unknown error';

      // Handle password validation errors
      if (error.response?.data?.password) {
        if (Array.isArray(error.response.data.password)) {
          errorMsg = error.response.data.password[0];
        } else {
          errorMsg = error.response.data.password;
        }
      } else if (error.response?.data?.password2?.[0]) {
        errorMsg = error.response?.data?.password2?.[0];
      } else if (error.response?.data?.email?.[0]) {
        errorMsg = error.response?.data?.email?.[0];
      } else if (error.response?.data?.branch?.[0]) {
        errorMsg = error.response?.data?.branch?.[0];
      } else if (error.response?.data?.message) {
        errorMsg = error.response?.data?.message;
      } else if (error.response?.data?.error) {
        errorMsg = error.response?.data?.error;
      } else if (error.response?.data) {
        // Handle any other validation errors
        const errorData = error.response.data;
        for (const key in errorData) {
          if (Array.isArray(errorData[key]) && errorData[key].length > 0) {
            errorMsg = errorData[key][0];
            break;
          }
        }
      }

      setAlert({ show: true, type: 'error', message: 'Failed to create user: ' + errorMsg });
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    // Validate branch selection for super admin
    if ((isSuperAdmin || isCompanyAdmin) &&
      ['floor_manager', 'supervisor', 'applicator', 'branch_admin', 'customer'].includes(userForm.role) &&
      !userForm.branch) {
      setAlert({ show: true, type: 'error', message: 'Please select a branch' });
      return;
    }

    try {
      const updateData = {
        name: userForm.name,
        email: userForm.email,
        phone: userForm.phone,
        role: userForm.role,
        is_active: userForm.is_active,
        branch: userForm.branch || null,
      };
      // Only include password if it's provided
      if (userForm.password) {
        updateData.password = userForm.password;
      }
      await api.put(`/auth/users/${selectedUser.id}/`, updateData);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMsg = error.response?.data?.email?.[0] ||
        error.response?.data?.message ||
        'Failed to update user';
      setAlert({ show: true, type: 'error', message: errorMsg });
    }
  };

  const handleDeleteUser = async (id) => {
    // Store the user ID to be deleted and show confirmation modal
    setPendingDeleteUserId(id);
    setShowDeleteUserModal(true);
  };

  const handleConfirmDeleteUser = async () => {
    setShowDeleteUserModal(false);

    try {
      await api.delete(`/auth/users/${pendingDeleteUserId}/`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to delete user' });
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await api.patch(`/auth/users/${user.id}/`, { is_active: !user.is_active });
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to update user status' });
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: '', // Don't populate password
      is_active: user.is_active,
      branch: user.branch ? user.branch.toString() : null,
    });
    setShowEditModal(true);
  };

  const openAddModal = () => {
    const roleMap = {
      customers: 'customer',
      staff: 'floor_manager', // Default to floor_manager for staff tab
      admins: 'super_admin',  // Default to super_admin for admins tab
    };

    // Get current branch for branch admin
    const currentBranchId = getCurrentBranchId();

    setUserForm({
      name: '',
      email: '',
      phone: '',
      role: roleMap[activeTab],
      password: '',
      password2: '',
      is_active: true,
      // Auto-set branch for branch admin (but allow super admin to choose)
      branch: currentBranchId ? currentBranchId.toString() : null,
    });
    setShowAddModal(true);
  };

  const filteredUsers = users.filter(user => {
    // Search filter - enhanced to include role search
    const matchesSearch = user.id?.toString().includes(searchTerm) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm) ||
      // Add role search - check if search term matches role (case insensitive)
      (user.role && user.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
      // Add role display name search (e.g., searching "Supervisor" should match "supervisor" role)
      (user.role && user.role.replace('_', ' ').toLowerCase().includes(searchTerm.toLowerCase()));

    // Branch filter for Super Admin
    let matchesBranch = true;
    if ((isSuperAdmin || isCompanyAdmin) && branchFilter !== 'all') {
      matchesBranch = (user.branch && user.branch.toString() === branchFilter) ||
        (user.branch_name && user.branch?.toString() === branchFilter);
    }
    return matchesSearch && matchesBranch;
  });

  // Calculate current page display after filtering
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Update total pages when filtered results change
  useEffect(() => {
    const total = Math.ceil(filteredUsers.length / pageSize);
    setTotalPages(total);
    if (currentPage > total && total > 0) {
      setCurrentPage(1);
    }
  }, [filteredUsers.length, pageSize, currentPage]);

  // Reset branch filter when branch context changes
  useEffect(() => {
    setBranchFilter('all');
    setRoleFilter('all'); // Reset role filter as well
  }, [selectedBranch, activeTab]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, roleFilter, branchFilter, searchTerm]);

  const getRoleBadge = (role) => {
    const variants = {
      super_admin: 'danger',
      admin: 'warning',
      staff: 'info',
      applicator: 'info',
      customer: 'default',
    };
    return variants[role] || 'default';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-80 mt-2 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-16 mt-2 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="border-b border-gray-200">
          <div className="flex gap-8">
            <div className="py-4">
              <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
            <div className="py-4">
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
            <div className="py-4">
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Search Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Users Table Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[...Array(7)].map((_, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Users Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Manage customers, staff, and administrators
          </p>
        </div>
        <Button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base px-2 md:px-4 py-2 whitespace-nowrap w-full md:w-auto"
        >
          <UserPlus size={16} className="md:hidden" />
          <UserPlus size={18} className="hidden md:block" />
          <span>
            Add{" "}
            {activeTab === "customers"
              ? "Customer"
              : activeTab === "staff"
                ? "Staff"
                : "Admin"}
          </span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4">
          <p className="text-xs md:text-sm text-gray-600">Total Users</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
            {totalCount}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4">
          <p className="text-xs md:text-sm text-gray-600">Active</p>
          <p className="text-xl md:text-2xl font-bold text-green-600 mt-1">
            {users.filter((u) => u.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4">
          <p className="text-xs md:text-sm text-gray-600">Inactive</p>
          <p className="text-xl md:text-2xl font-bold text-red-600 mt-1">
            {users.filter((u) => !u.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4">
          <p className="text-xs md:text-sm text-gray-600">Verified Email</p>
          <p className="text-xl md:text-2xl font-bold text-blue-600 mt-1">
            {users.filter((u) => u.is_email_verified).length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto scroll-smooth">
        <nav className="flex gap-4 md:gap-8">
          <button
            onClick={() => setActiveTab("customers")}
            className={`py-2 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap flex-shrink-0 ${activeTab === "customers"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            <Users size={14} className="inline mr-1 md:mr-2 md:hidden" />
            <Users size={16} className="inline mr-2 hidden md:inline" />
            <span>Customers</span>
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`py-2 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap flex-shrink-0 ${activeTab === "staff"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            <Shield size={14} className="inline mr-1 md:mr-2 md:hidden" />
            <Shield size={16} className="inline mr-2 hidden md:inline" />
            <span>Staff</span>
          </button>
        </nav>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3">
        {/* Search bar — full width always */}
        <Card className="w-full">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by ID, name, email, phone, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </Card>

        {/* Filters row — wraps on mobile */}
        <div className="flex flex-wrap gap-3 items-end">
          {(isSuperAdmin || isCompanyAdmin) && activeTab !== 'customers' && (
            <>
              <div className="flex-1 min-w-[140px]">
                <Select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Branches" },
                    ...branches.map((branch) => ({
                      value: branch.id.toString(),
                      label: branch.name,
                    })),
                  ]}
                  className="w-full"
                />
              </div>
              {activeTab === 'staff' && (
                <div className="flex-1 min-w-[140px]">
                  <Select
                    label="Filter by Role"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    options={[
                      { value: "all", label: "All Roles" },
                      { value: "branch_admin", label: "Branch Admin" },
                      { value: "floor_manager", label: "Floor Manager" },
                      { value: "supervisor", label: "Supervisor" },
                      { value: "applicator", label: "Applicator" },
                    ]}
                    className="w-full"
                  />
                </div>
              )}
              {activeTab === 'admins' && (
                <div className="flex-1 min-w-[140px]">
                  <Select
                    label="Filter by Role"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    options={[
                      { value: "all", label: "All Roles" },
                      { value: "super_admin", label: "Super Admin" },
                    ]}
                    className="w-full"
                  />
                </div>
              )}
            </>
          )}

          {/* Page Size Selector */}
          <div className="w-full sm:w-auto sm:min-w-[120px]">
            <Select
              label="Items per page"
              value={pageSize.toString()}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              options={[
                { value: "10", label: "10" },
                { value: "20", label: "20" },
                { value: "50", label: "50" },
                { value: "100", label: "100" },
              ]}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <Card
        title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} List`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Phone
                </th>
                {(activeTab === 'staff' || activeTab === 'admins') && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Role
                    </th>
                    {(isSuperAdmin || isCompanyAdmin) && (
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Branch
                      </th>
                    )}
                  </>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      #{user.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex items-center gap-1">
                        <Mail size={14} className="text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {user.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone size={14} className="text-gray-400" />
                          {user.phone}
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    {(activeTab === 'staff' || activeTab === 'admins') && (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'branch_admin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'floor_manager' ? 'bg-indigo-100 text-indigo-800' :
                                user.role === 'supervisor' ? 'bg-blue-100 text-blue-800' :
                                  user.role === 'applicator' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                            }`}>
                            {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        {(isSuperAdmin || isCompanyAdmin) && (
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {user.branch_name ? (
                              <div className="flex items-center gap-1">
                                <Building2 size={14} className="text-gray-400" />
                                {user.branch_name}
                              </div>
                            ) : (
                              <span className="text-gray-400">Not assigned</span>
                            )}
                          </td>
                        )}
                      </>
                    )}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-3 py-1 text-xs font-medium rounded-full ${user.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                          }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {activeTab === 'customers' && (
                          <button
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                            className="text-green-600 hover:text-green-800"
                            title="View Customer Details"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit User"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={(activeTab === 'staff' || activeTab === 'admins') ? ((isSuperAdmin || isCompanyAdmin) ? 8 : 7) : 6}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-3 md:px-6 py-3 md:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center gap-3 sm:gap-0 sm:justify-between">
            <div className="text-xs md:text-sm text-gray-600 text-center sm:text-left">
              Showing {filteredUsers.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}–{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} results
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-md ${currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                ← Prev
              </button>

              {/* Page Numbers — hidden on very small screens, show current/total */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 sm:hidden px-2">
                  {currentPage} / {totalPages}
                </span>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${currentPage === pageNum
                          ? 'bg-primary text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-md ${currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New User"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <Input
            label="Full Name"
            value={userForm.name}
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={userForm.email}
            onChange={(e) =>
              setUserForm({ ...userForm, email: e.target.value })
            }
            required
          />
          <Input
            label="Phone (Optional)"
            type="tel"
            value={userForm.phone}
            onChange={(e) =>
              setUserForm({ ...userForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
            }
            maxLength={10}
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={userForm.password}
              onChange={(e) =>
                setUserForm({ ...userForm, password: e.target.value })
              }
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="relative">
            <Input
              label="Confirm Password"
              type={showPassword2 ? "text" : "password"}
              value={userForm.password2}
              onChange={(e) =>
                setUserForm({ ...userForm, password2: e.target.value })
              }
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword2(!showPassword2)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            >
              {showPassword2 ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Select
            label="Role"
            value={userForm.role}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
            options={
              isSuperAdmin || isCompanyAdmin
                ? [
                  { value: "customer", label: "Customer" },
                  { value: "floor_manager", label: "Floor Manager" },
                  { value: "supervisor", label: "Supervisor" },
                  { value: "applicator", label: "Applicator" },
                  { value: "branch_admin", label: "Branch Admin" },
                  { value: "company_admin", label: "Company Admin" },
                ]
                : [
                  { value: "customer", label: "Customer" },
                  { value: "floor_manager", label: "Floor Manager" },
                  { value: "supervisor", label: "Supervisor" },
                  { value: "applicator", label: "Applicator" },
                ]
            }
            required
          />
          {/* Branch Selection - For Staff and Admin (and Customer for super admin) */}
          {(isSuperAdmin || isCompanyAdmin) && (
            userForm.role === 'floor_manager' ||
            userForm.role === 'supervisor' ||
            userForm.role === 'applicator' ||
            userForm.role === 'branch_admin' ||
            userForm.role === 'customer'
          ) && (
              <>
                <Select
                  label="Branch"
                  value={userForm.branch || ''}
                  onChange={(e) => setUserForm({ ...userForm, branch: e.target.value || null })}
                  options={[
                    { value: "", label: "Select Branch" },
                    ...branches.map((branch) => ({
                      value: branch.id.toString(),
                      label: branch.name,
                    })),
                  ]}
                  required
                />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Branch:</strong> {branches.find(b => b.id.toString() === userForm.branch?.toString())?.name || 'Your Branch'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Users are assigned to your branch automatically.
                  </p>
                </div>
              </>
            )}
          {/* Show branch info for non-super admin */}
          {(!isSuperAdmin && !isCompanyAdmin) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Branch:</strong> {getCurrentBranchName()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This {userForm.role} will be assigned to your branch automatically.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_add"
              checked={userForm.is_active}
              onChange={(e) =>
                setUserForm({ ...userForm, is_active: e.target.checked })
              }
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="is_active_add" className="text-sm text-gray-700">
              Active Account
            </label>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Update User</Button>
          </>
        }
      >
        <form onSubmit={handleUpdateUser} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <Input
            label="Full Name"
            value={userForm.name}
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={userForm.email}
            onChange={(e) =>
              setUserForm({ ...userForm, email: e.target.value })
            }
            required
          />
          <Input
            label="Phone (Optional)"
            type="tel"
            value={userForm.phone}
            onChange={(e) =>
              setUserForm({ ...userForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
            }
            maxLength={10}
          />
          {/* <Input
            label="New Password (Leave blank to keep current)"
            type="password"
            value={userForm.password}
            onChange={(e) =>
              setUserForm({ ...userForm, password: e.target.value })
            }
            placeholder="••••••••"
          /> */}
          <Select
            label="Role"
            value={userForm.role}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
            options={
              isSuperAdmin || isCompanyAdmin
                ? [
                  { value: "customer", label: "Customer" },
                  { value: "floor_manager", label: "Floor Manager" },
                  { value: "supervisor", label: "Supervisor" },
                  { value: "applicator", label: "Applicator" },
                  { value: "branch_admin", label: "Branch Admin" },
                  { value: "company_admin", label: "Company Admin" },
                ]
                : [
                  { value: "customer", label: "Customer" },
                  { value: "floor_manager", label: "Floor Manager" },
                  { value: "supervisor", label: "Supervisor" },
                  { value: "applicator", label: "Applicator" },
                ]
            }
            required
          />
          {/* Branch Selection - For Staff and Admin */}
          {(isSuperAdmin || isCompanyAdmin) && (
            userForm.role === 'floor_manager' ||
            userForm.role === 'supervisor' ||
            userForm.role === 'applicator' ||
            userForm.role === 'branch_admin' ||
            userForm.role === 'customer'
          ) && (
              <>
                <Select
                  label="Branch"
                  value={userForm.branch || ''}
                  onChange={(e) => setUserForm({ ...userForm, branch: e.target.value || null })}
                  options={[
                    { value: "", label: "Select Branch" },
                    ...branches.map((branch) => ({
                      value: branch.id.toString(),
                      label: branch.name,
                    })),
                  ]}
                  required
                />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Branch:</strong> {branches.find(b => b.id.toString() === userForm.branch?.toString())?.name || 'Your Branch'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Users are assigned to your branch automatically.
                  </p>
                </div>
              </>
            )}
          {/* Show branch info for non-super admin */}
          {(!isSuperAdmin && !isCompanyAdmin) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Branch:</strong> {getCurrentBranchName()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Users are assigned to your branch automatically.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={userForm.is_active}
              onChange={(e) =>
                setUserForm({ ...userForm, is_active: e.target.checked })
              }
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="is_active_edit" className="text-sm text-gray-700">
              Active Account
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={showDeleteUserModal}
        onClose={() => setShowDeleteUserModal(false)}
        title="Delete User"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteUserModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeleteUser}>
              {/* <Trash2 size={18} className="mr-2" /> */}
              Delete User
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this user? This action cannot be undone and all associated data will be permanently removed.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CustomersStaff;
