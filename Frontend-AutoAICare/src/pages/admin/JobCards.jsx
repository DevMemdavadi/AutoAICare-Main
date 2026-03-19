import JobTimer from '@/components/JobTimer';
import { Alert, Badge, Button, Card, Input, Modal, Select, Table } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import { Building2, Eye, FileText, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BillGenerationModal from '@/components/BillGenerationModal';

const JobCards = () => {
  const { isSuperAdmin, isCompanyAdmin, getBranchFilterParams, branches, selectedBranch } = useBranch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobCards, setJobCards] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  // State for assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  // State for create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [floorManagers, setTechnicians] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    branch: 'all',
  });
  const [assignData, setAssignData] = useState({
    technician: '',
    estimatedTime: '',
    duration: '', // Duration in minutes
  });
  const [createData, setCreateData] = useState({
    booking: '',
    technician: '',
    estimatedTime: '',
  });

  // State for bill generation modal
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedJobForBill, setSelectedJobForBill] = useState(null);

  // Alert state
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Add effect to log when createData changes
  useEffect(() => {
    console.log('CreateData updated:', createData);
  }, [createData]);

  // Add pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    count: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const [pageSize, setPageSize] = useState(10); // Add this line for page size state

  // Refs for debouncing
  const searchTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);

  // Memoized fetch function to prevent unnecessary re-renders
  // Update the fetchJobCards function to use dynamic page size
  const fetchJobCards = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page: pagination.page,
        page_size: pageSize, // Use dynamic page size instead of hardcoded 10
        ...getBranchFilterParams(),
      };

      if (filters.status) {
        params.status = filters.status;
      }

      if ((isSuperAdmin || isCompanyAdmin) && filters.branch !== 'all') {
        params.branch = filters.branch;
      }

      const response = await api.get('/jobcards/', { params });

      setJobCards(response.data.results || []);
      setFilteredJobs(response.data.results || []);

      // Use DRF's `next` and `previous` as source of truth
      const hasNext = !!response.data.next;
      const hasPrevious = !!response.data.previous;
      const totalCount = response.data.count || 0;
      // Update the totalPages calculation to use dynamic page size
      const totalPages = hasNext || pagination.page > 1
        ? Math.ceil(totalCount / pageSize) // Use pageSize instead of hardcoded 10
        : pagination.page; // fallback

      setPagination({
        page: pagination.page,
        totalPages: totalPages,
        count: totalCount,
        hasNext,
        hasPrevious,
      });

    } catch (error) {
      console.error('Error fetching job cards:', error);
      setJobCards([]);
      setFilteredJobs([]);
      setPagination({
        page: 1,
        totalPages: 1,
        count: 0,
        hasNext: false,
        hasPrevious: false,
      });
    } finally {
      setLoading(false);
      isInitialMount.current = false;
    }
  }, [filters.status, filters.branch, isSuperAdmin, isCompanyAdmin, selectedBranch, pagination.page, pageSize]); // Add pageSize to dependencies

  const fetchFloorManagers = useCallback(async () => {
    try {
      const params = getBranchFilterParams();
      const response = await api.get('/auth/users/?role=staff', { params });
      setTechnicians(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching floor managers:', error);
    }
  }, [selectedBranch]);

  const fetchBookings = useCallback(async () => {
    try {
      const params = getBranchFilterParams();
      // Fetch confirmed bookings that don't have job cards yet
      params.status = 'confirmed';
      const response = await api.get('/bookings/', { params });

      // Filter out bookings that already have job cards
      const bookingsWithoutJobCards = response.data.results.filter(booking => {
        // Check if booking already has a job card
        // A booking without a job card will have jobcard as null or undefined
        // A booking with a job card will have jobcard as an object with an id
        if (!booking.jobcard) {
          return true; // No job card (null, undefined, or falsy)
        }

        // If jobcard is an object, check if it has an id
        if (typeof booking.jobcard === 'object' && booking.jobcard !== null) {
          // If it has an id, then a job card exists
          if (booking.jobcard.id) {
            return false;
          }
          // If it's an object without an id, treat as no job card
          return true;
        }

        // For any other case, assume no job card exists
        return true;
      });

      setBookings(bookingsWithoutJobCards);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchJobCards();
    fetchFloorManagers();
    fetchBookings();

    // Set up auto-refresh every minute
    const refreshInterval = setInterval(() => {
      fetchJobCards();
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, [fetchJobCards, fetchFloorManagers, fetchBookings]);

  // Apply client-side filtering when jobCards or filters change
  useEffect(() => {
    let filtered = [...jobCards];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(job => {
        return (
          job.id.toString().includes(searchTerm) ||
          (job.booking_details.customer_name &&
            job.booking_details.customer_name.toLowerCase().includes(searchTerm)) ||
          (job.booking_details?.vehicle_details?.registration_number &&
            job.booking_details.vehicle_details.registration_number.toLowerCase().includes(searchTerm))
        );
      });
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(job => job.status === filters.status);
    }

    setFilteredJobs(filtered);
  }, [jobCards, filters.search, filters.status]);

  // Update filters when branch selection changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      branch: 'all'
    }));
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [selectedBranch]);

  // Add useEffect to watch for page size changes
  useEffect(() => {
    // Reset to first page when page size changes
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [pageSize]);

  const [assignLoading, setAssignLoading] = useState(false);

  const handleAssignTechnician = async () => {
    if (!assignData.technician) {
      setModalError('Please select a floor manager');
      return;
    }

    try {
      setModalError('');
      setAssignLoading(true);
      // First assign the floor manager
      await api.put(`/jobcards/${selectedJob.id}/`, {
        technician: assignData.technician,
        estimated_delivery_time: assignData.estimatedTime,
        status: 'assigned',
      });

      // If duration is provided, set it
      if (assignData.duration && assignData.duration > 0) {
        await api.put(`/jobcards/${selectedJob.id}/set_duration/`, {
          allowed_duration_minutes: parseInt(assignData.duration),
        });
      }

      setShowAssignModal(false);
      setAssignData({ technician: '', estimatedTime: '', duration: '' });
      fetchJobCards();

      // Show success message
      setAlert({ show: true, type: 'success', message: 'Floor manager assigned successfully!' });
    } catch (error) {
      console.error('Error assigning technician:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to assign floor manager' });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleCreateJobCard = async () => {
    // Validate that a booking is selected
    console.log('Create data:', createData);
    console.log('Booking value:', createData.booking);
    console.log('Booking type:', typeof createData.booking);

    // Check if booking is selected (handle both string and number cases)
    const bookingSelected = createData.booking && createData.booking !== '' && createData.booking !== 'Please select a booking...';

    if (!bookingSelected) {
      setAlert({ show: true, type: 'error', message: 'Please select a booking.' });
      return;
    }

    // Convert booking to integer if it's a string
    const bookingId = typeof createData.booking === 'string'
      ? parseInt(createData.booking, 10)
      : createData.booking;

    // Validate that it's a valid number
    if (isNaN(bookingId) || bookingId <= 0) {
      setAlert({ show: true, type: 'error', message: 'Please select a valid booking.' });
      return;
    }

    try {
      await api.post('/jobcards/', {
        booking: bookingId,
        technician: createData.technician || null,
        estimated_delivery_time: createData.estimatedTime || null,
      });

      setShowCreateModal(false);
      setCreateData({ booking: '', technician: '', estimatedTime: '' });
      fetchJobCards();

      // Show success message
      setAlert({ show: true, type: 'success', message: 'Job card created successfully!' });

      // Small delay to ensure backend processing before refreshing bookings
      setTimeout(() => {
        fetchBookings(); // Refresh bookings list
      }, 500);
    } catch (error) {
      console.error('Error creating job card:', error);

      // Check if it's a duplicate job card error
      if (error.response && error.response.data && error.response.data.booking) {
        setAlert({ show: true, type: 'error', message: 'A job card already exists for this booking. Please select a different booking.' });
      } else if (error.response && error.response.data) {
        // Show specific error messages from the server
        const errorMessages = Object.values(error.response.data).flat().join('\n');
        setAlert({ show: true, type: 'error', message: `Failed to create job card: ${errorMessages}` });
      } else {
        setAlert({ show: true, type: 'error', message: 'Failed to create job card. Please try again.' });
      }
    }
  };

  const handleStatusUpdate = async (jobId, newStatus) => {
    try {
      await api.put(`/jobcards/${jobId}/update-status/`, { status: newStatus });
      fetchJobCards();

      // Show success message
      setAlert({ show: true, type: 'success', message: 'Status updated successfully' });
    } catch (error) {
      console.error('Error updating status:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to update status' });
    }
  };

  const handleStartJob = async (jobId) => {
    try {
      await api.put(`/jobcards/${jobId}/start/`);
      fetchJobCards();

      // Show success message
      setAlert({ show: true, type: 'success', message: 'Job started successfully' });
    } catch (error) {
      console.error('Error starting job:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to start job' });
    }
  };

  const handleCreateInvoice = (jobId) => {
    // Open bill generation modal instead of directly creating invoice
    setSelectedJobForBill(jobId);
    setShowBillModal(true);
  };

  const handleBillSuccess = () => {
    // Refresh job cards after successful invoice finalization
    fetchJobCards();
    setAlert({ show: true, type: 'success', message: 'Invoice generated successfully!' });
  };

  const getStatusBadge = (status) => {
    const variants = {
      created: 'default',
      qc_pending: 'warning',
      qc_completed: 'info',
      qc_rejected: 'destructive',
      supervisor_approved: 'info',
      assigned_to_applicator: 'info',
      work_in_progress: 'warning',
      work_completed: 'info',
      final_qc_pending: 'warning',
      final_qc_passed: 'success',
      final_qc_failed: 'destructive',
      customer_approval_pending: 'warning',
      customer_approved: 'success',
      customer_revision_requested: 'warning',
      ready_for_billing: 'info',
      billed: 'success',
      delivered: 'success',
      closed: 'default',
      floor_manager_confirmed: 'info',
      floor_manager_final_qc_confirmed: 'success',
      // Legacy statuses for backward compatibility
      assigned: 'default',
      started: 'info',
      in_progress: 'warning',
      completed: 'success',
    };
    return variants[status] || 'default';
  }; const getStatusLabel = (status) => {
    const labels = {
      created: 'Job Card Created',
      qc_pending: 'QC Pending',
      qc_completed: 'QC Completed',
      qc_rejected: 'QC Rejected',
      supervisor_approved: 'Supervisor Approved',
      assigned_to_applicator: 'Assigned to Applicator',
      work_in_progress: 'Work In Progress',
      work_completed: 'Work Completed',
      final_qc_pending: 'Final QC Pending',
      final_qc_passed: 'Final QC Passed',
      final_qc_failed: 'Final QC Failed',
      customer_approval_pending: 'Customer Approval Pending',
      customer_approved: 'Customer Approved',
      customer_revision_requested: 'Customer Revision Requested',
      ready_for_billing: 'Ready for Billing',
      billed: 'Billed',
      delivered: 'Delivered',
      closed: 'Closed',
      floor_manager_confirmed: 'Floor Manager Confirmed',
      floor_manager_final_qc_confirmed: 'Floor Manager Final QC Confirmed',
    };
    return labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  const openAssignModal = (job) => {
    setSelectedJob(job);
    setModalError('');
    // Pre-fill duration if job already has one
    const defaultDuration = job.allowed_duration_minutes ||
      (job.booking_details?.package_details?.duration) || '';
    setAssignData({
      technician: '',
      estimatedTime: '',
      duration: defaultDuration ? defaultDuration.toString() : ''
    });
    setShowAssignModal(true);
  };

  const openDetailsModal = (job) => {
    // Navigate to the job card details page instead of opening a modal
    navigate(`/admin/jobcards/${job.id}`);
  };

  const handleRefresh = async () => {
    isInitialMount.current = true; // Show skeleton during refresh
    setPageSize(10); // Reset page size to 10 as per request
    if (pagination.page !== 1) {
      // This will trigger the useEffect because fetchJobCards dependency pagination.page/pageSize changes
      setPagination(prev => ({ ...prev, page: 1 }));
    } else {
      // Manual refresh for all relevant data when already on page 1
      await Promise.all([
        fetchJobCards(),
        fetchFloorManagers(),
        fetchBookings()
      ]);
    }
  };

  // Handle search input changes with debouncing
  const handleSearchChange = (value) => {
    // Clear any existing timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Update the filters immediately for UI feedback
    setFilters(prev => ({ ...prev, search: value }));

    // Reset to first page when search changes
    setPagination(prev => ({ ...prev, page: 1 }));

    // Debounce the search filtering
    searchTimeoutRef.current = setTimeout(() => {
      // Search is handled by the useEffect above
    }, 300); // 300ms debounce delay
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // console.log(jobCards);
  if (loading && isInitialMount.current) {
    return (
      <div className="space-y-6">
        {/* Alert Component */}
        {alert.show && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert({ show: false, type: '', message: '' })}
          />
        )}

        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mt-2 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
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

        {/* Job Cards Table Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[...Array((isSuperAdmin || isCompanyAdmin) ? 8 : 7)].map((_, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {[...Array((isSuperAdmin || isCompanyAdmin) ? 8 : 7)].map((_, j) => (
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
      {/* Alert Component */}
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">Job Cards</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Manage job cards and assign floor managers
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            className="flex-1 md:flex-initial w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none disabled:opacity-70"
          >
            <RefreshCw size={16} className={`md:hidden ${loading ? 'animate-spin' : ''}`} />
            <RefreshCw size={18} className={`hidden md:block ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Search */}
          <div className="relative h-11">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />

            <input
              type="text"
              placeholder="Search by ID or customer..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-3 h-full w-full rounded-lg border border-gray-300 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Clear timeouts and apply search immediately on Enter
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                  }
                  setFilters(prev => ({ ...prev, search: e.target.value }));
                }
              }}
            />
          </div>

          {/* Status Select */}
          <Select
            // label="Status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: "", label: "All Status" },
              { value: "created", label: "Created" },
              { value: "qc_pending", label: "QC Pending" },
              { value: "qc_completed", label: "QC Completed" },
              { value: "supervisor_approved", label: "Supervisor Approved" },
              { value: "assigned_to_applicator", label: "Assigned to Applicator" },
              { value: "work_in_progress", label: "Work In Progress" },
              { value: "work_completed", label: "Work Completed" },
              { value: "final_qc_passed", label: "Final QC Passed" },
              { value: "floor_manager_confirmed", label: "Floor Manager Confirmed" },
              { value: "floor_manager_final_qc_confirmed", label: "Floor Manager Final QC Confirmed" },
              { value: "customer_approved", label: "Customer Approved" },
              { value: "ready_for_billing", label: "Ready for Billing" },
              { value: "billed", label: "Billed" },
              { value: "delivered", label: "Delivered" },
              { value: "closed", label: "Closed" },
            ]}
            className="h-11 w-full text-sm"
          />
          {/* Branch Filter - Super Admin or Company Admin Only */}
          {(isSuperAdmin || isCompanyAdmin) && (
            <Select
              // label="Branch"
              value={filters.branch}
              onChange={(e) =>
                setFilters({ ...filters, branch: e.target.value })
              }
              options={[
                { value: "all", label: "All Branches" },
                ...branches.map((branch) => ({
                  value: branch.id.toString(),
                  label: branch.name,
                })),
              ]}
              className="h-11 w-full text-sm"
            />
          )}
        </div>
      </Card>

      {/* Job Cards Table */}
      <Card
        title="Job Cards List"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Items per page:</span>
            <Select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setPageSize(newSize);
              }}
              options={[
                { value: 10, label: "10" },
                { value: 20, label: "20" },
                { value: 50, label: "50" },
                { value: 100, label: "100" },
              ]}
              className="w-18 text-sm"
            />
          </div>
        }
      >
        <Table
          loading={loading}
          headers={[
            "ID",
            "Customer",
            "Reg. Number",
            "Service",
            "Floor Manager",
            ...((isSuperAdmin || isCompanyAdmin) ? ["Branch"] : []),
            "Status",
            "Timer",
            "Actions",
          ]}
          data={filteredJobs} // Use filteredJobs instead of jobCards
          renderRow={(job) => (
            <tr key={job.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                <button
                  onClick={() => openDetailsModal(job)}
                  className="text-left block w-fit"
                >
                  #{job.id}
                </button>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {/* {job.booking_details?.vehicle_details?.customer || "N/A"} */}
                {job.booking_details.customer_name || "N/A"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {job.booking_details?.vehicle_details?.registration_number ||
                  "N/A"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {job.booking_details?.package_details?.name || "N/A"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {job.floor_manager_details?.name || "Unassigned"}
              </td>
              {(isSuperAdmin || isCompanyAdmin) && (
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="flex items-center gap-1">
                    <Building2 size={14} className="text-gray-400" />
                    {job.branch_details?.name || "N/A"}
                  </div>
                </td>
              )}
              <td className="px-4 py-3">
                <Badge variant={getStatusBadge(job.status)}>
                  {getStatusLabel(job.status)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {job.job_started_at && (job.status === 'started' || job.status === 'in_progress' || job.status === 'work_in_progress' || job.status === 'assigned_to_applicator') && (
                  <JobTimer
                    jobStartedAt={job.job_started_at}
                    allowedDurationMinutes={job.allowed_duration_display || job.allowed_duration_minutes}
                    effectiveDurationMinutes={job.effective_duration_minutes}
                    isTimerPaused={job.is_timer_paused}
                    pauseStartedAt={job.pause_started_at}
                    totalPauseDurationSeconds={job.total_pause_duration_seconds}
                    status={job.status}
                    reflectPause={false}
                  />
                )}
                {(!job.job_started_at || !['started', 'in_progress', 'work_in_progress', 'assigned_to_applicator'].includes(job.status)) && (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openDetailsModal(job)}
                    className="text-blue-600 hover:text-blue-800"
                    title="View Details"
                  >
                    <Eye size={18} />
                  </button>
                  {(job.status === "ready_for_billing" || job.status === "ready_for_delivery" || job.status === "billed" || job.status === "delivered" || job.status === "closed") && (
                    <button
                      onClick={() => handleCreateInvoice(job.id)}
                      className="text-green-600 hover:text-green-800 flex items-center gap-1"
                      title="Generate Bill"
                    >
                      <FileText size={18} />
                      <span className="text-sm">Generate Bill</span>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing page {pagination.page} of {pagination.totalPages} (
                {pagination.count} total jobs)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page - 1 })
                  }
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page + 1 })
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Assign Floor Manager Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setModalError('');
        }}
        title="Assign Floor Manager"
        footer={
          <>
            <Button variant="outline" onClick={() => {
              setShowAssignModal(false);
              setModalError('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleAssignTechnician} disabled={assignLoading}>
              {assignLoading ? "Assigning..." : "Assign"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {modalError}
            </div>
          )}
          <Select
            label="Select Floor Manager"
            value={assignData.technician}
            onChange={(e) =>
              setAssignData({ ...assignData, technician: e.target.value })
            }
            options={floorManagers.map((t) => ({ value: t.id, label: t.name }))}
            required
          />
          <Input
            label="Allowed Duration (minutes)"
            type="number"
            min="1"
            value={assignData.duration}
            onChange={(e) =>
              setAssignData({ ...assignData, duration: e.target.value })
            }
            placeholder={selectedJob?.booking_details?.package_details?.duration
              ? `Package default: ${selectedJob.booking_details.package_details.duration} min`
              : "e.g. 60"}
          />
          {selectedJob?.booking_details?.package_details?.duration && (
            <p className="text-xs text-gray-500 -mt-2">
              Package default: {selectedJob.booking_details.package_details.duration} minutes
            </p>
          )}
          <Input
            label="Estimated Delivery Time (Optional)"
            type="datetime-local"
            value={assignData.estimatedTime}
            onChange={(e) =>
              setAssignData({ ...assignData, estimatedTime: e.target.value })
            }
          />
        </div>
      </Modal>

      {/* Create Job Card Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Job Card"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateJobCard}
              disabled={bookings.length === 0}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              {bookings.length > 0 ? (
                <Select
                  label="Select Booking"
                  value={createData.booking}
                  onChange={(e) => {
                    console.log('Booking selected:', e.target.value);
                    console.log('Event target:', e.target);
                    const newCreateData = { ...createData, booking: e.target.value };
                    console.log('New create data:', newCreateData);
                    setCreateData(newCreateData);
                  }}
                  options={[
                    { value: '', label: 'Please select a booking...' },
                    ...bookings
                      .filter((b) => {
                        // Ensure required fields exist and are valid
                        const hasId = b.id && typeof b.id === 'number';
                        const hasDateTime = b.booking_datetime && typeof b.booking_datetime === 'string';
                        return hasId && hasDateTime;
                      })
                      .map((b) => ({
                        value: b.id.toString(), // Ensure value is a string
                        label: `#${b.id} - ${b.vehicle?.registration_number || "N/A"
                          } (${b.customer?.user?.name || "N/A"}) - ${new Date(
                            b.booking_datetime
                          ).toLocaleDateString()}`,
                      }))
                  ]}
                  required
                />
              ) : (
                <div className="text-sm text-gray-500 p-4 border border-gray-200 rounded-lg">
                  No available bookings. All confirmed bookings already have job
                  cards.
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={fetchBookings}
              className="h-10 mb-1"
            >
              Refresh
            </Button>
          </div>
          <Select
            label="Select Floor Manager (Optional)"
            value={createData.technician}
            onChange={(e) =>
              setCreateData({ ...createData, technician: e.target.value })
            }
            options={[
              { value: "", label: "Not Assigned" },
              ...floorManagers.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
          <Input
            label="Estimated Delivery Time (Optional)"
            type="datetime-local"
            value={createData.estimatedTime}
            onChange={(e) =>
              setCreateData({ ...createData, estimatedTime: e.target.value })
            }
          />
        </div>
      </Modal>

      {/* Bill Generation Modal */}
      <BillGenerationModal
        isOpen={showBillModal}
        onClose={() => {
          setShowBillModal(false);
          setSelectedJobForBill(null);
        }}
        jobCardId={selectedJobForBill}
        onSuccess={handleBillSuccess}
      />
    </div>
  );
};

export default JobCards;