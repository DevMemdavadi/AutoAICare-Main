import { Alert, Button, Card, Input, Modal } from '@/components/ui';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import {
  AlertTriangle,
  BarChart,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Eye,
  FileText,
  IndianRupee,
  Package,
  RefreshCw,
  Star,
  TrendingUp,
  Upload,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const {
    isSuperAdmin,
    isCompanyAdmin,
    isBranchAdmin,
    getCurrentBranchId,
    getCurrentBranchName,
    selectedBranch,
    branches,
    initialized  // Use initialized instead of loading
  } = useBranch();

  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayJobs: 0,
    pendingBookings: 0,
    completedBookings: 0,
    averageRating: 0,
    activeCustomers: 0,
  });
  const [branchStats, setBranchStats] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [todaysJobs, setTodaysJobs] = useState([]);
  const [todaysJobsSummary, setTodaysJobsSummary] = useState(null);
  const [showTodaysJobs, setShowTodaysJobs] = useState(true);
  const [lowStockParts, setLowStockParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  // Check-in modal state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInData, setCheckInData] = useState({
    initial_photos: [],
    initial_damages: '',
    check_in_notes: '',
  });
  const [selectedBookingForCheckIn, setSelectedBookingForCheckIn] = useState(null);

  const fileInputRef = useRef(null);

  // Floor manager assignment modal state
  const [showAssignFloorManagerModal, setShowAssignFloorManagerModal] = useState(false);
  const [assignFloorManagerData, setAssignFloorManagerData] = useState({
    floor_manager_id: '',
  });
  const [floorManagers, setFloorManagers] = useState([]);
  const [floorManagersLoading, setFloorManagersLoading] = useState(false);
  const [assignFMLoading, setAssignFMLoading] = useState(false);
  const [selectedBookingForFM, setSelectedBookingForFM] = useState(null);
  // Pagination states for today's bookings
  const [todayBookings, setTodayBookings] = useState([]);
  const [todayBookingsCount, setTodayBookingsCount] = useState(0);
  const [showPagination, setShowPagination] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [bookingsPerPage] = useState(10);
  const [modalError, setModalError] = useState('');

  // Add Stock modal state
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedPartForStock, setSelectedPartForStock] = useState(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [addStockLoading, setAddStockLoading] = useState(false);

  useEffect(() => {
    // Wait for branch context to initialize before fetching data
    if (!initialized) return;

    fetchDashboardData();

    // If pagination is needed, fetch today's bookings
    if (showPagination) {
      fetchTodaysBookings(currentPage);
    }
  }, [selectedBranch, initialized, showPagination, currentPage]); // Re-fetch when branch changes or initialization completes

  // Helper function to format status text
  const formatStatusText = (status) => {
    if (!status) return 'N/A';
    return status.replaceAll("_", " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };



  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const branchId = getCurrentBranchId();
      const params = branchId ? { branch: branchId } : {};

      const [analyticsRes, bookingsRes, feedbackRes, appointmentsRes] = await Promise.all([
        api.get('/analytics/dashboard/', { params }),
        api.get('/analytics/recent-bookings/', { params }),
        api.get('/feedback/summary/', { params }),
        api.get('/appointments/', { params: { ...params, ordering: '-created_at', page_size: 10 } }),
      ]);

      setStats({
        totalRevenue: analyticsRes.data.total_revenue || 0,
        todayJobs: analyticsRes.data.today_jobs || 0,
        pendingBookings: analyticsRes.data.pending_bookings || 0,
        completedBookings: analyticsRes.data.completed_bookings || 0,
        averageRating: feedbackRes.data.average_rating || 0,
        activeCustomers: analyticsRes.data.active_customers || 0,
      });

      // Set recent bookings data
      setRecentBookings(bookingsRes.data.bookings || []);

      // Set recent appointments data
      setRecentAppointments(appointmentsRes.data.results || []);

      // Set today's bookings pagination data
      setTodayBookingsCount(bookingsRes.data.today_bookings_count || 0);
      setShowPagination(bookingsRes.data.show_pagination || false);

      // Fetch today's jobs
      try {
        const todaysJobsRes = await api.get('/analytics/todays-jobs/', { params });
        setTodaysJobs(todaysJobsRes.data.jobs || []);
        setTodaysJobsSummary(todaysJobsRes.data.summary || null);
      } catch (err) {
        console.error('Error fetching today\'s jobs:', err);
        setAlert({
          show: true,
          type: 'warning',
          message: 'Unable to load today\'s jobs data'
        });
      }

      // Fetch low stock parts
      try {
        const lowStockRes = await api.get('/jobcards/parts/low_stock_alert/');
        setLowStockParts(lowStockRes.data.parts || []);
      } catch (err) {
        console.error('Error fetching low stock parts:', err);
        // Don't show alert for this, it's not critical
      }

      // Fetch branch performance for super admin and company admin
      if ((isSuperAdmin || isCompanyAdmin) && !selectedBranch) {
        try {
          const branchStatsRes = await api.get('/analytics/branch-performance/', { params: { days: 30 } });
          setBranchStats(branchStatsRes.data.branches || []);
        } catch (err) {
          console.error('Error fetching branch stats:', err);
          setAlert({
            show: true,
            type: 'warning',
            message: 'Unable to load branch performance data'
          });
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      setAlert({
        show: true,
        type: 'error',
        message: 'Failed to load dashboard data. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch today's bookings with pagination
  const fetchTodaysBookings = async (page = 1) => {
    try {
      setLoading(true);
      const branchId = getCurrentBranchId();
      const params = {
        ...(branchId ? { branch: branchId } : {}),
        page: page,
        page_size: bookingsPerPage
      };

      // Add date filter for today
      const today = new Date().toISOString().split('T')[0];
      params.created_at_date = today;

      const response = await api.get('/bookings/', { params });
      setTodayBookings(response.data.results || []);
      setTodayBookingsCount(response.data.count || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching today\'s bookings:', err);
      setAlert({
        show: true,
        type: 'error',
        message: 'Failed to load today\'s bookings. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, trend }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {trend && (
              <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
          <Icon size={28} className={color.replace('bg-', 'text-')} />
        </div>
      </div>
    </div>
  );

  const getStatusBadge = (status) => {
    const styles = {
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
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getJobStatusBadge = (status) => {
    const styles = {
      assigned: 'bg-blue-100 text-blue-800',
      started: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };
  // Helper function to get job card ID using the standardized has_jobcard field
  const getJobCardId = (booking) => {
    return booking.jobcard?.id || null;
  };

  // Function to handle check-in for a booking
  const handleCheckIn = async (booking) => {
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      setAlert({
        show: true,
        type: 'error',
        message: 'Cannot check in vehicle. Booking status must be pending or confirmed.'
      });
      return;
    }

    // Set the selected booking and open check-in modal
    setSelectedBookingForCheckIn(booking);
    setCheckInData({
      initial_photos: [],
      initial_damages: '',
      check_in_notes: '',
    });
    setShowCheckInModal(true);
  };



  // Function to handle viewing job card
  const handleViewJobCard = (jobCardId) => {
    // Actions are handled via Link component
  };

  // Function to handle viewing booking details
  const handleViewBooking = (bookingId) => {
    // Actions are handled via Link component
  };

  // Function to handle assigning floor manager
  const handleAssignFloorManager = (booking) => {
    if (booking.status !== 'vehicle_arrived') {
      setAlert({
        show: true,
        type: 'error',
        message: 'Floor manager can only be assigned when vehicle has arrived'
      });
      return;
    }

    // Set the selected booking and open assign floor manager modal
    setSelectedBookingForFM(booking);
    setModalError('');
    // Set the floor manager selection to the currently assigned floor manager if exists
    const currentFloorManagerId = booking.jobcard?.floor_manager_details?.id || '';
    setAssignFloorManagerData({ floor_manager_id: currentFloorManagerId });
    // Fetch floor managers for the booking's branch
    fetchFloorManagers(booking);
    setShowAssignFloorManagerModal(true);
  };

  // Function to handle floor manager assignment submission
  const handleAssignFloorManagerSubmit = async () => {
    try {
      if (!assignFloorManagerData.floor_manager_id) {
        setModalError('Please select a floor manager');
        return;
      }

      setModalError('');

      if (!selectedBookingForFM?.id) {
        setAlert({
          show: true,
          type: 'error',
          message: 'No booking selected.'
        });
        return;
      }

      setAssignFMLoading(true);
      const response = await api.post(
        `/bookings/${selectedBookingForFM.id}/assign_floor_manager/`,
        { floor_manager_id: assignFloorManagerData.floor_manager_id }
      );

      setAlert({
        show: true,
        type: 'success',
        message: response.data.message || 'Floor Manager assigned successfully!'
      });

      setShowAssignFloorManagerModal(false);
      setAssignFloorManagerData({ floor_manager_id: '' });
      setSelectedBookingForFM(null);

      // Refresh dashboard data to update the recent bookings
      fetchDashboardData();
    } catch (error) {
      console.error('Error assigning floor manager:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to assign floor manager';
      setAlert({
        show: true,
        type: 'error',
        message: `Error: ${errorMessage}`
      });
    } finally {
      setAssignFMLoading(false);
    }
  };



  // Function to handle photo upload
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);

    // Check if any files were selected
    if (files.length === 0) {
      setAlert({
        show: true,
        type: 'error',
        message: 'No files selected. Please choose at least one photo.'
      });
      return;
    }

    // Process each file and convert to clean base64
    const processedPhotos = [];

    for (const file of files) {
      try {
        // Convert to base64
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // Ensure we only get the base64 data part
            const result = reader.result;
            if (typeof result === 'string' && result.startsWith('data:')) {
              // Additional validation to ensure clean data URL
              // Remove any potential HTTP response metadata that might be included
              if (result.includes('Request URL') || result.includes('HTTP') || result.includes('Status Code')) {
                // Try to extract just the data URL part
                const dataUrlMatch = result.match(/(data:image\/[^;]+;base64,[\w+/=]+)/);
                if (dataUrlMatch && dataUrlMatch[1]) {
                  resolve(dataUrlMatch[1]);
                } else {
                  reject(new Error('Invalid image data with HTTP metadata'));
                }
              } else {
                resolve(result);
              }
            } else {
              reject(new Error('Invalid image data'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Only add valid base64 data
        if (base64 && typeof base64 === 'string') {
          processedPhotos.push(base64);
        }
      } catch (error) {
        console.error('Error processing photo:', error);
        setAlert({
          show: true,
          type: 'error',
          message: `Error processing photo: ${error.message}`
        });
      }
    }

    // Update state with processed photos
    if (processedPhotos.length > 0) {
      setCheckInData(prev => ({
        ...prev,
        initial_photos: [...prev.initial_photos, ...processedPhotos]
      }));
    } else {
      setAlert({
        show: true,
        type: 'error',
        message: 'No valid photos were processed. Please try again with different images.'
      });
    }
  };

  // Function to remove photo
  const removePhoto = (index) => {
    setCheckInData(prev => ({
      ...prev,
      initial_photos: prev.initial_photos.filter((_, i) => i !== index)
    }));
  };

  // Function to fetch floor managers
  const fetchFloorManagers = async (booking = null) => {
    try {
      setFloorManagersLoading(true);
      const params = {
        role: 'floor_manager'
      };

      // If a booking is provided (for assignment), use the booking's branch
      if (booking && booking.id) {
        params.booking_id = booking.id;
      } else {
        // Filter by branch
        if (isSuperAdmin || isCompanyAdmin) {
          const branchFilterParams = getBranchFilterParams();
          if (branchFilterParams && branchFilterParams.branch) {
            params.branch = branchFilterParams.branch;
          }
        } else {
          const currentBranchId = getCurrentBranchId();
          if (currentBranchId) {
            params.branch = currentBranchId;
          }
        }
      }

      const response = await api.get('/auth/users/', { params });
      setFloorManagers(response.data.results || []);
    } catch (error) {
      console.error('Error fetching floor managers:', error);
      setFloorManagers([]);
      setAlert({
        show: true,
        type: 'error',
        message: 'Failed to load floor managers'
      });
    } finally {
      setFloorManagersLoading(false);
    }
  };

  // Function to handle check-in submission
  const handleCheckInSubmit = async () => {
    try {
      if (!checkInData.initial_photos || checkInData.initial_photos.length === 0) {
        setAlert({
          show: true,
          type: 'error',
          message: 'Please upload at least one initial photo'
        });
        return;
      }

      if (!selectedBookingForCheckIn) {
        setAlert({
          show: true,
          type: 'error',
          message: 'No booking selected for check-in'
        });
        return;
      }

      setCheckInLoading(true);
      await api.put(`/bookings/${selectedBookingForCheckIn.id}/check_in/`, checkInData);

      setAlert({
        show: true,
        type: 'success',
        message: 'Vehicle checked in successfully!'
      });

      setShowCheckInModal(false);
      setCheckInData({
        initial_photos: [],
        initial_damages: '',
        check_in_notes: '',
      });
      setSelectedBookingForCheckIn(null);

      // Refresh dashboard data to update the recent bookings
      fetchDashboardData();
    } catch (error) {
      console.error('Error checking in vehicle:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to check in vehicle';
      setAlert({
        show: true,
        type: 'error',
        message: `Error: ${errorMessage}`
      });
    } finally {
      setCheckInLoading(false);
    }
  };

  // Function to open Add Stock modal
  const handleOpenAddStockModal = (part) => {
    setSelectedPartForStock(part);
    setStockQuantity('');
    setShowAddStockModal(true);
  };

  // Function to handle Add Stock submission
  const handleAddStockSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!selectedPartForStock) {
        setAlert({
          show: true,
          type: 'error',
          message: 'No part selected'
        });
        return;
      }

      if (!stockQuantity || parseInt(stockQuantity) <= 0) {
        setAlert({
          show: true,
          type: 'error',
          message: 'Please enter a valid quantity'
        });
        return;
      }

      setAddStockLoading(true);
      await api.post(`/jobcards/parts/${selectedPartForStock.id}/add_stock/`, {
        quantity: parseInt(stockQuantity)
      });

      setAlert({
        show: true,
        type: 'success',
        message: `Stock added successfully! New stock: ${selectedPartForStock.stock + parseInt(stockQuantity)} ${selectedPartForStock.unit}`
      });

      setShowAddStockModal(false);
      setStockQuantity('');
      setSelectedPartForStock(null);

      // Refresh dashboard data to update low stock parts
      fetchDashboardData();
    } catch (error) {
      console.error('Error adding stock:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add stock';
      setAlert({
        show: true,
        type: 'error',
        message: `Error: ${errorMessage}`
      });
    } finally {
      setAddStockLoading(false);
    }
  };

  if (loading || !initialized) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mt-2 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-32 mt-2 animate-pulse"></div>
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="h-6 w-6 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-24 mt-1 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Recent Bookings Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {[...Array(6)].map((_, j) => (
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

        {/* Quick Actions Skeleton */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-3 text-sm text-red-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Component */}
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: "", message: "" })}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            {(isSuperAdmin || isCompanyAdmin) ? (
              <>
                <Building2 size={16} className="text-primary" />
                <p className="text-gray-600">
                  Viewing:{" "}
                  <span className="font-semibold text-primary">
                    {getCurrentBranchName()}
                  </span>
                </p>
              </>
            ) : (
              <>
                <Building2 size={16} className="text-gray-600" />
                <p className="text-gray-600">
                  Branch:{" "}
                  <span className="font-semibold">
                    {getCurrentBranchName()}
                  </span>
                </p>
              </>
            )}
          </div>
        </div>
        <button
          onClick={fetchDashboardData}
          className="btn btn-outline flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={IndianRupee}
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          subtitle={
            (isSuperAdmin || isCompanyAdmin) && !selectedBranch
              ? "All branches"
              : (isSuperAdmin || isCompanyAdmin)
                ? `Branch: ${getCurrentBranchName()}`
                : getCurrentBranchName()
          }
          color="bg-green-500"
          trend={12}
        />
        <StatCard
          icon={Calendar}
          title="Today's Jobs"
          value={stats.todayJobs}
          subtitle={
            !(isSuperAdmin || isCompanyAdmin) || selectedBranch
              ? getCurrentBranchName()
              : "All branches"
          }
          color="bg-blue-500"
        />
        <StatCard
          icon={Clock}
          title="Pending Bookings"
          value={stats.pendingBookings}
          subtitle={
            !(isSuperAdmin || isCompanyAdmin) || selectedBranch
              ? getCurrentBranchName()
              : "All branches"
          }
          color="bg-yellow-500"
        />
        <StatCard
          icon={CheckCircle}
          title="Completed Services"
          value={stats.completedBookings}
          subtitle={
            !(isSuperAdmin || isCompanyAdmin) || selectedBranch
              ? getCurrentBranchName()
              : "All branches"
          }
          color="bg-purple-500"
        />
        <StatCard
          icon={Star}
          title="Average Rating"
          value={stats.averageRating.toFixed(1)}
          subtitle={
            !(isSuperAdmin || isCompanyAdmin) || selectedBranch
              ? getCurrentBranchName()
              : "All branches"
          }
          color="bg-orange-500"
        />
        <StatCard
          icon={Users}
          title="Active Customers"
          value={stats.activeCustomers}
          subtitle={
            !(isSuperAdmin || isCompanyAdmin) || selectedBranch
              ? getCurrentBranchName()
              : "All branches"
          }
          color="bg-indigo-500"
        />
      </div>

      {/* Low Stock Alert Widget */}
      {lowStockParts.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Low Stock Alert</h3>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full">
                  {lowStockParts.length} {lowStockParts.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-4">The following parts are running low on stock and need to be reordered:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {lowStockParts.slice(0, 6).map((part) => (
                  <div
                    key={part.id}
                    className="bg-white rounded-lg p-3 border border-orange-200 cursor-pointer hover:shadow-md hover:border-orange-400 transition-all"
                    onClick={() => handleOpenAddStockModal(part)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <p className="font-medium text-gray-900 text-sm">{part.name}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{part.sku}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs font-semibold ${part.stock === 0 ? 'text-red-600' : 'text-orange-600'
                            }`}>
                            {part.stock} {part.unit}
                          </span>
                          <span className="text-xs text-gray-500">/ {part.min_stock_level} min</span>
                        </div>
                      </div>
                      {part.stock === 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                          OUT
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/admin/parts"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                <Package className="h-4 w-4" />
                Manage Parts Inventory
                {lowStockParts.length > 6 && (
                  <span className="ml-1 text-xs opacity-90">({lowStockParts.length - 6} more)</span>
                )}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Branch Performance Comparison - Super Admin or Company Admin Only */}
      {(isSuperAdmin || isCompanyAdmin) && !selectedBranch && branchStats.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart size={20} />
            Branch Performance (Last 30 Days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchStats.map((branch) => (
              <div
                key={branch.branch_id}
                className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={16} className="text-primary" />
                  <span className="font-semibold text-gray-900">
                    {branch.branch_name}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {branch.branch_code}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-bold text-green-600">
                      ₹{branch.revenue?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bookings:</span>
                    <span className="font-semibold text-gray-900">
                      {branch.total_bookings}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-semibold text-gray-900">
                      {branch.completed_bookings}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completion Rate:</span>
                    <span className="font-semibold text-blue-600">
                      {branch.completion_rate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Job Cards:</span>
                    <span className="font-semibold text-gray-900">
                      {branch.total_job_cards}
                    </span>
                  </div>
                  {/* <div className="flex justify-between">
                    <span className="text-gray-600">Job Completion:</span>
                    <span className="font-semibold text-purple-600">
                      {branch.job_completion_rate}%
                    </span>
                  </div> */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Rating:</span>
                    <div className="flex items-center gap-1">
                      <Star
                        size={14}
                        className="text-yellow-500 fill-yellow-500"
                      />
                      <span className="font-semibold text-gray-900">
                        {branch.avg_rating}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Jobs Section */}
      {todaysJobsSummary && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase size={20} />
              Today's Jobs
            </h3>
            <button
              onClick={() => setShowTodaysJobs(!showTodaysJobs)}
              className="text-sm text-primary hover:underline"
            >
              {showTodaysJobs ? "Hide" : "Show"}
            </button>
          </div>

          {/* Today's Jobs Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {todaysJobsSummary.total}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">Assigned</p>
              <p className="text-2xl font-bold text-blue-600">
                {todaysJobsSummary.assigned}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-600 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-purple-600">
                {todaysJobsSummary.in_progress + todaysJobsSummary.started || 0}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {todaysJobsSummary.completed}
              </p>
            </div>
          </div>

          {/* Today's Jobs List */}
          {showTodaysJobs && todaysJobs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Job ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Floor Manager
                    </th>
                    {isSuperAdmin && (
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Branch
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {todaysJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-600">
                        <Link to={`/admin/jobcards/${job.id}`} className="block w-fit">
                          #{job.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {job.customer_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {job.vehicle}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {job.service}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {job.floor_manager}
                      </td>
                      {(isSuperAdmin || isCompanyAdmin) && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {job.branch}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${getJobStatusBadge(
                            job.status
                          )}`}
                        >
                          {formatStatusText(job.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showTodaysJobs && todaysJobs.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No jobs scheduled for today
            </p>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/jobcards"
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all"
        >
          <Wrench className="text-primary mb-2" size={24} />
          <p className="font-medium text-gray-900">Manage Job Cards</p>
          <p className="text-sm text-gray-500 mt-1">View and assign jobs</p>
        </Link>
        <Link
          to="/admin/services"
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all"
        >
          <Calendar className="text-primary mb-2" size={24} />
          <p className="font-medium text-gray-900">Service Packages</p>
          <p className="text-sm text-gray-500 mt-1">Manage services</p>
        </Link>
        <Link
          to="/admin/users"
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all"
        >
          <Users className="text-primary mb-2" size={24} />
          <p className="font-medium text-gray-900">Users</p>
          <p className="text-sm text-gray-500 mt-1">Manage customers & staff</p>
        </Link>
        <Link
          to="/admin/analytics"
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all"
        >
          <TrendingUp className="text-primary mb-2" size={24} />
          <p className="font-medium text-gray-900">Analytics</p>
          <p className="text-sm text-gray-500 mt-1">View detailed reports</p>
        </Link>
      </div>

      {/* Recent Bookings and Appointments - Side by Side or Full Width */}
      {(recentBookings.length > 0 || recentAppointments.length > 0) && (
        <div className={`grid grid-cols-1 ${recentBookings.length > 0 && recentAppointments.length > 0 ? 'lg:grid-cols-2' : ''} gap-6`}>
          {/* Recent Bookings */}
          {recentBookings.length > 0 && (
            <Card title="Recent Bookings">
              <div className="flex justify-end mb-4">
                <Link
                  to="/admin/bookings"
                  className="btn btn-primary flex items-center gap-2"
                >
                  View All Bookings
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Service
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Booking Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Booked On
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Status
                      </th>
                      {(isSuperAdmin || isCompanyAdmin) && !selectedBranch && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Branch
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <Link to={`/admin/bookings/${booking.id}`} className="block w-fit">
                            #{booking.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {booking.customer_name || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {booking.packages_details?.length > 0
                            ? booking.packages_details.map(p => p.name).join(', ')
                            : (booking.package_details?.name || 'N/A')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(booking.booking_datetime).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ₹{booking.total_price}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                              booking.status
                            )}`}
                          >
                            {formatStatusText(booking.status)}
                          </span>
                        </td>
                        {(isSuperAdmin || isCompanyAdmin) && !selectedBranch && (
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {booking.branch_name || "N/A"}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Check In button - Show for pending or confirmed bookings */}
                            {(booking.status === "pending" ||
                              booking.status === "confirmed") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-1 px-3 py-1 text-xs"
                                  onClick={() => handleCheckIn(booking)}
                                >
                                  <CheckCircle size={14} />
                                  Check In
                                </Button>
                              )}
                            {/* Assign Floor Manager button - Show when jobcard exists but no floor manager assigned */}
                            {booking.status === "vehicle_arrived" &&
                              (isBranchAdmin || isSuperAdmin || isCompanyAdmin) &&
                              (!booking.jobcard ||
                                !booking.jobcard.floor_manager_details) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex items-center gap-1 px-3 py-1 text-xs"
                                  onClick={() => handleAssignFloorManager(booking)}
                                >
                                  <ClipboardCheck size={14} />
                                  Assign FM
                                </Button>
                              )}
                            {/* Job Card button - Show when jobcard exists */}
                            {!!booking.job_card && (
                              <Link to={`/admin/jobcards/${booking.job_card.id}`}>
                                <Button size="sm" variant="ghost" className="px-2 py-1">
                                  <FileText size={16} />
                                </Button>
                              </Link>
                            )}
                            {/* View details button */}
                            <Link to={`/admin/bookings/${booking.id}`}>
                              <Button size="sm" variant="ghost" className="px-2 py-1">
                                <Eye size={16} />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Conditional Pagination for Today's Bookings */}
              {showPagination && (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => fetchTodaysBookings(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => fetchTodaysBookings(currentPage + 1)}
                      disabled={currentPage * bookingsPerPage >= todayBookingsCount}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * bookingsPerPage + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * bookingsPerPage, todayBookingsCount)}
                        </span>{' '}
                        of <span className="font-medium">{todayBookingsCount}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => fetchTodaysBookings(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                          </svg>
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: Math.ceil(todayBookingsCount / bookingsPerPage) }, (_, i) => i + 1)
                          .slice(Math.max(0, currentPage - 2), Math.min(Math.ceil(todayBookingsCount / bookingsPerPage), currentPage + 1))
                          .map((page) => (
                            <button
                              key={page}
                              onClick={() => fetchTodaysBookings(page)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                                }`}
                            >
                              {page}
                            </button>
                          ))}

                        <button
                          onClick={() => fetchTodaysBookings(currentPage + 1)}
                          disabled={currentPage * bookingsPerPage >= todayBookingsCount}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                          <span className="sr-only">Next</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Recent Appointments */}
          {recentAppointments.length > 0 && (
            <Card title="Recent Appointments">
              <div className="flex justify-end mb-4">
                <Link
                  to="/admin/appointments"
                  className="btn btn-primary flex items-center gap-2"
                >
                  View All Appointments
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Service
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Vehicle
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Preferred Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Created On
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Status
                      </th>
                      {(isSuperAdmin || isCompanyAdmin) && !selectedBranch && (
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Branch
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentAppointments.map((appointment) => (
                      <tr key={appointment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <Link to={`/admin/appointments?appointmentId=${appointment.id}`} className="block w-fit">
                            #{appointment.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>{appointment.customer_details?.user?.name || "N/A"}</div>
                          <div className="text-xs text-gray-500">
                            {appointment.customer_details?.user?.phone || "N/A"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>{appointment.package_details?.name || "N/A"}</div>
                          <div className="text-xs text-gray-500">
                            {appointment.vehicle_type}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>{appointment.vehicle_details?.registration_number || "N/A"}</div>
                          <div className="text-xs text-gray-500">
                            {appointment.vehicle_details?.brand} {appointment.vehicle_details?.model}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>{new Date(appointment.preferred_datetime).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(appointment.preferred_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(appointment.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              appointment.status === 'approved' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  appointment.status === 'converted' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                              }`}
                          >
                            {formatStatusText(appointment.status)}
                          </span>
                        </td>
                        {(isSuperAdmin || isCompanyAdmin) && !selectedBranch && (
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {appointment.branch_name || "N/A"}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <Link to={`/admin/appointments?appointmentId=${appointment.id}`}>
                            <Button size="sm" variant="ghost" className="px-2 py-1">
                              <Eye size={16} />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 flex-grow flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Vehicle Check-In</h3>
                <button
                  onClick={() => {
                    setShowCheckInModal(false);
                    setCheckInData({
                      initial_photos: [],
                      initial_damages: '',
                      check_in_notes: '',
                    });
                    setSelectedBookingForCheckIn(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-grow max-h-[60vh] space-y-4">
                {selectedBookingForCheckIn && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Booking ID</p>
                      <p className="font-medium">#{selectedBookingForCheckIn.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Customer</p>
                      <p className="font-medium">{selectedBookingForCheckIn.customer_name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Reg. Number</p>
                      <p className="font-medium">{selectedBookingForCheckIn.vehicle_details?.registration_number || "N/A"}</p>
                    </div>
                  </>
                )}

                <div>
                  <label className="label">Before Photos *</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.capture = 'environment';
                        input.onchange = handlePhotoUpload;
                        input.click();
                      }}
                      className="btn btn-primary flex items-center gap-2 text-xs"
                    >
                      <Camera size={16} />
                      Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-outline flex items-center gap-2 text-xs"
                    >
                      <Upload size={16} />
                      Upload Photos
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>



                  {/* Uploaded Photos Preview */}
                  {checkInData.initial_photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {checkInData.initial_photos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo}
                            alt={`Initial ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <button
                            onClick={() => {
                              const newPhotos = [...checkInData.initial_photos];
                              newPhotos.splice(index, 1);
                              setCheckInData(prev => ({
                                ...prev,
                                initial_photos: newPhotos
                              }));
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show error message when no photos are uploaded */}
                  {checkInData.initial_photos.length === 0 && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">
                        <span className="font-medium">Required:</span> Please upload
                        at least one before photo of the vehicle
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Upload photos of the vehicle
                  </p>
                </div>

                <div>
                  <label className="label">Initial Damages (Optional)</label>
                  <textarea
                    className="input w-full"
                    rows="3"
                    placeholder="Note any minor damages observed..."
                    value={checkInData.initial_damages}
                    onChange={(e) =>
                      setCheckInData({
                        ...checkInData,
                        initial_damages: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">Check-In Notes (Optional)</label>
                  <textarea
                    className="input w-full"
                    rows="3"
                    placeholder="Additional notes from check-in process..."
                    value={checkInData.check_in_notes}
                    onChange={(e) =>
                      setCheckInData({
                        ...checkInData,
                        check_in_notes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 px-6 pb-6">
              <button
                onClick={() => {
                  setShowCheckInModal(false);
                  setCheckInData({
                    initial_photos: [],
                    initial_damages: '',
                    check_in_notes: '',
                  });
                  setSelectedBookingForCheckIn(null);
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckInSubmit}
                disabled={checkInData.initial_photos.length === 0 || checkInLoading}
                className="btn btn-primary"
              >
                {checkInLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin mr-2" />
                    Checking In...
                  </>
                ) : (
                  'Check In Vehicle'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Floor Manager Modal */}
      {showAssignFloorManagerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Assign Floor Manager</h3>
              <button
                onClick={() => {
                  setShowAssignFloorManagerModal(false);
                  setAssignFloorManagerData({ floor_manager_id: '' });
                  setSelectedBookingForFM(null);
                  setModalError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {modalError}
                </div>
              )}
              {selectedBookingForFM && (
                <>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Booking ID</p>
                    <p className="font-medium">#{selectedBookingForFM.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Customer</p>
                    <p className="font-medium">{selectedBookingForFM.customer_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Vehicle</p>
                    <p className="font-medium">{selectedBookingForFM.vehicle_details?.registration_number || "N/A"}</p>
                  </div>
                </>
              )}

              {floorManagersLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <select
                  className="input w-full"
                  value={assignFloorManagerData.floor_manager_id}
                  onChange={(e) =>
                    setAssignFloorManagerData({
                      ...assignFloorManagerData,
                      floor_manager_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select a floor manager</option>
                  {floorManagers.map((fm) => (
                    <option key={fm.id} value={fm.id}>
                      {fm.name}{fm.branch_name ? ` (${fm.branch_name})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {floorManagers.length === 0 && !floorManagersLoading && (
                <div className="text-sm text-gray-500 italic">
                  No floor managers available for this branch.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignFloorManagerModal(false);
                  setAssignFloorManagerData({ floor_manager_id: '' });
                  setSelectedBookingForFM(null);
                  setModalError('');
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignFloorManagerSubmit}
                disabled={floorManagersLoading || assignFMLoading}
                className="btn btn-primary"
              >
                {assignFMLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin mr-2" />
                    Assigning...
                  </>
                ) : (
                  'Assign Floor Manager'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && selectedPartForStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add Stock</h3>
              <button
                onClick={() => {
                  setShowAddStockModal(false);
                  setStockQuantity('');
                  setSelectedPartForStock(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddStockSubmit} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Part:</p>
                  <p className="font-semibold text-gray-900">{selectedPartForStock.name}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">SKU:</p>
                  <p className="font-medium text-gray-700">{selectedPartForStock.sku}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Current Stock:</p>
                  <p className="font-semibold text-gray-900">
                    {selectedPartForStock.stock} {selectedPartForStock.unit}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Cost Price:</p>
                  <p className="font-semibold text-gray-900">₹{parseFloat(selectedPartForStock.cost_price).toFixed(2)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Add ({selectedPartForStock.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="input w-full"
                />
              </div>

              {stockQuantity && parseInt(stockQuantity) > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Total Cost: <span className="font-bold text-blue-600">
                      ₹{(parseFloat(selectedPartForStock.cost_price) * parseInt(stockQuantity)).toFixed(2)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">An expense record will be created for this purchase</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStockModal(false);
                    setStockQuantity('');
                    setSelectedPartForStock(null);
                  }}
                  className="btn btn-outline"
                  disabled={addStockLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addStockLoading || !stockQuantity || parseInt(stockQuantity) <= 0}
                >
                  {addStockLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    'Add Stock'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
