import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Mail,
  MapPin,
  Package,
  Phone,
  Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const BranchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin } = useBranch();
  const [branch, setBranch] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/admin');
      return;
    }
    fetchBranchDetails();
  }, [id, isSuperAdmin]);

  const fetchBranchDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/branches/${id}/`);
      setBranch(response.data);
    } catch (error) {
      console.error('Error fetching branch details:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'stock', label: 'Inventory', icon: Package },
    { id: 'bookings', label: 'Bookings', icon: ClipboardList },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Branch not found</p>
        <button
          onClick={() => navigate('/admin/branches')}
          className="mt-4 btn btn-primary"
        >
          Back to Branches
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/branches')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{branch.name}</h1>
          <p className="text-gray-600 mt-1">Branch Details & Management</p>
        </div>
        {/* <button className="btn btn-outline flex items-center gap-2">
          <Edit size={18} />
          Edit Branch
        </button> */}
      </div>

      {/* Branch Info Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-primary bg-opacity-10 rounded-lg">
              <Building2 size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Branch Name</p>
              <p className="font-semibold text-gray-900">{branch.name}</p>
            </div>
          </div>

          {branch.address && (
            <div className="flex items-start gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <MapPin size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-medium text-gray-900">{branch.address}</p>
              </div>
            </div>
          )}

          {branch.phone && (
            <div className="flex items-start gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <Phone size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{branch.phone}</p>
              </div>
            </div>
          )}

          {branch.email && (
            <div className="flex items-start gap-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Mail size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{branch.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab branch={branch} />}
          {activeTab === 'staff' && <StaffTab branch={branch} />}
          {activeTab === 'stock' && <StockTab branchId={branch.id} />}
          {activeTab === 'bookings' && <BookingsTab branchId={branch.id} />}
          {activeTab === 'invoices' && <InvoicesTab branchId={branch.id} />}
          {activeTab === 'analytics' && <AnalyticsTab branchId={branch.id} />}
        </div>
      </div>
    </div>
  );
};

// Tab Components
const OverviewTab = ({ branch }) => {
  const [bookingsCount, setBookingsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingsCount = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/bookings/?branch=${branch.id}`);
        const count = response.data.count !== undefined ? response.data.count : response.data.length || 0;
        setBookingsCount(count);
      } catch (err) {
        console.error('Error fetching bookings count:', err);
        setBookingsCount(0);
      } finally {
        setLoading(false);
      }
    };

    if (branch && branch.id) {
      fetchBookingsCount();
    }
  }, [branch]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="p-6 bg-blue-50 rounded-lg">
        <Users className="text-blue-600 mb-2" size={32} />
        <p className="text-3xl font-bold text-gray-900">{branch.staff_count || branch.staff_members?.length || 0}</p>
        <p className="text-sm text-gray-600">Total Staff</p>
      </div>
      <div className="p-6 bg-green-50 rounded-lg">
        <ClipboardList className="text-green-600 mb-2" size={32} />
        <p className="text-3xl font-bold text-gray-900">
          {loading ? (
            <span className="h-8 bg-gray-200 rounded animate-pulse w-12 inline-block"></span>
          ) : (
            bookingsCount
          )}
        </p>
        <p className="text-sm text-gray-600">Active Jobs</p>
      </div>
      <div className="p-6 bg-purple-50 rounded-lg">
        <Package className="text-purple-600 mb-2" size={32} />
        <p className="text-3xl font-bold text-gray-900">0</p>
        <p className="text-sm text-gray-600">Stock Items</p>
      </div>
    </div>
  );
};

const StaffTab = ({ branch }) => {
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Staff members are already included in the branch data from the API
    if (branch && branch.staff_members) {
      setStaffMembers(branch.staff_members);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [branch]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (staffMembers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Users size={48} className="mx-auto mb-3 text-gray-300" />
        <p>No staff members found for this branch</p>
      </div>
    );
  }

  const adminMembers = staffMembers.filter(member => member.role === 'admin');
  const staffOnly = staffMembers.filter(member => member.role === 'staff');

  return (
    <div className="space-y-6">
      {adminMembers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Administrators</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminMembers.map((member) => (
              <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-800 font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Admin
                  </span>
                  {member.phone && (
                    <span className="text-sm text-gray-500">{member.phone}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {staffOnly.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Members</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffOnly.map((member) => (
              <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-800 font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Staff
                  </span>
                  {member.phone && (
                    <span className="text-sm text-gray-500">{member.phone}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StockTab = ({ branchId }) => (
  <div className="text-center py-12 text-gray-500">
    <Package size={48} className="mx-auto mb-3 text-gray-300" />
    <p>Inventory for this branch</p>
    <p className="text-sm">Coming soon...</p>
  </div>
);

const BookingsTab = ({ branchId }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/bookings/?branch=${branchId}`);
        setBookings(response.data.results || response.data || []);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    if (branchId) {
      fetchBookings();
    }
  }, [branchId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
        <p>No bookings found for this branch</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      vehicle_arrived: 'bg-blue-100 text-blue-800',
      assigned_to_fm: 'bg-orange-100 text-orange-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      // Job card statuses
      qc_pending: 'bg-yellow-100 text-yellow-800',
      qc_completed: 'bg-yellow-100 text-yellow-800',
      qc_rejected: 'bg-red-100 text-red-800',
      supervisor_approved: 'bg-blue-100 text-blue-800',
      supervisor_rejected: 'bg-red-100 text-red-800',
      floor_manager_confirmed: 'bg-orange-100 text-orange-800',
      assigned_to_applicator: 'bg-blue-100 text-blue-800',
      work_in_progress: 'bg-purple-100 text-purple-800',
      work_completed: 'bg-blue-100 text-blue-800',
      final_qc_pending: 'bg-yellow-100 text-yellow-800',
      final_qc_passed: 'bg-green-100 text-green-800',
      final_qc_failed: 'bg-red-100 text-red-800',
      floor_manager_final_qc_confirmed: 'bg-orange-100 text-orange-800',
      customer_approval_pending: 'bg-yellow-100 text-yellow-800',
      customer_approved: 'bg-green-100 text-green-800',
      customer_revision_requested: 'bg-orange-100 text-orange-800',
      ready_for_billing: 'bg-blue-100 text-blue-800',
      billed: 'bg-green-100 text-green-800',
      delivered: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {bookings.map((booking) => (
            <tr key={booking.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">#{booking.id}</td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {booking.customer_details?.user?.name || 'N/A'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {booking.packages_details?.length > 0
                  ? booking.packages_details.map(p => p.name).join(', ')
                  : (booking.package_details?.name || 'N/A')}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {new Date(booking.booking_datetime).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                  {booking.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                ₹{booking.total_price || 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const InvoicesTab = ({ branchId }) => (
  <div className="text-center py-12 text-gray-500">
    <FileText size={48} className="mx-auto mb-3 text-gray-300" />
    <p>Invoices for this branch</p>
    <p className="text-sm">Coming soon...</p>
  </div>
);

const AnalyticsTab = ({ branchId }) => (
  <div className="text-center py-12 text-gray-500">
    <BarChart3 size={48} className="mx-auto mb-3 text-gray-300" />
    <p>Analytics for this branch</p>
    <p className="text-sm">Coming soon...</p>
  </div>
);

export default BranchDetail;
