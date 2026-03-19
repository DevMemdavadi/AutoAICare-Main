import { Alert, Badge, Button, Card, Input, Modal, Select, Table } from '@/components/ui';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import { Camera, Car, CheckCircle, ClipboardCheck, Eye, FileText, RefreshCw, Search, Upload, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const Bookings = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSuperAdmin, isCompanyAdmin, getBranchFilterParams, branches = [], selectedBranch, getCurrentBranchId, isBranchAdmin } = useBranch();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInData, setCheckInData] = useState({
    initial_photos: [],
    initial_damages: '',
    check_in_notes: '',
  });

  const [floorManagers, setFloorManagers] = useState([]);
  const [floorManagersLoading, setFloorManagersLoading] = useState(false);
  const [assignFMLoading, setAssignFMLoading] = useState(false);
  const [showAssignFloorManagerModal, setShowAssignFloorManagerModal] = useState(false);
  const [assignFloorManagerData, setAssignFloorManagerData] = useState({
    floor_manager_id: '',
  });
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    branch: 'all',
  });
  const [assignData, setAssignData] = useState({
    floor_manager: '',
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    count: 0,
    hasNext: false,
    hasPrevious: false,
  });
  const [pageSize, setPageSize] = useState(10);

  // Quick booking modal state
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [quickBookingData, setQuickBookingData] = useState({
    customer_name: '',
    customer_phone: '',
    registration_number: '',
    service_package: '',
  });
  const [packages, setPackages] = useState([]); // For quick booking modal

  // Alert state
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Refs for debouncing
  const searchTimeoutRef = useRef(null);
  const currentSearchTermRef = useRef(''); // Track current search term to prevent race conditions
  const isInitialMount = useRef(true);
  const fileInputRef = useRef(null);

  // Styled alert function
  const showStyledAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  // Fetch bookings with pagination
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page: pagination.page,
        page_size: pageSize,
        ...getBranchFilterParams(),
      };

      // Add search parameter to API call using current search term ref to prevent race conditions
      if (currentSearchTermRef.current) {
        params.search = currentSearchTermRef.current;
      }

      if (filters.status) {
        params.status = filters.status;
      }

      if ((isSuperAdmin || isCompanyAdmin) && filters.branch !== 'all') {
        params.branch = filters.branch;
      }

      console.log('Fetching bookings with params:', params); // Debug log

      const response = await api.get('/bookings/', { params });

      setBookings(response.data.results || []);
      setFilteredBookings(response.data.results || []);

      // Use DRF's `next` and `previous` as source of truth
      const hasNext = !!response.data.next;
      const hasPrevious = !!response.data.previous;
      const totalCount = response.data.count || 0;
      // Update the totalPages calculation to use dynamic page size
      const totalPages = hasNext || pagination.page > 1
        ? Math.ceil(totalCount / pageSize)
        : pagination.page; // fallback

      setPagination({
        page: pagination.page,
        totalPages: totalPages,
        count: totalCount,
        hasNext,
        hasPrevious,
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
      setFilteredBookings([]);
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
  }, [filters.status, filters.branch, isSuperAdmin, isCompanyAdmin, selectedBranch, pagination.page, pageSize]);

  const fetchTechnicians = async () => {
    try {
      setFloorManagersLoading(true);
      // Ensure we're filtering by the current branch for branch admins
      const params = {
        role: 'floor_manager'
      };

      // For super admins, if a specific branch is selected, filter by it
      if (isSuperAdmin || isCompanyAdmin) {
        const branchFilterParams = getBranchFilterParams();
        if (branchFilterParams && branchFilterParams.branch) {
          params.branch = branchFilterParams.branch;
        }
        // If no branch is selected ("all" branches), we don't add branch filter
      } else {
        // For branch admins and staff, always filter by their assigned branch
        const currentBranchId = getCurrentBranchId();
        console.log('Current branch ID:', currentBranchId);
        if (currentBranchId) {
          params.branch = currentBranchId;
        }
      }

      console.log('Fetching floor managers with params:', params);
      const response = await api.get('/auth/users/', { params });
      console.log('Floor managers response:', response.data);
      setFloorManagers(response.data.results || []);
    } catch (error) {
      console.error('Error fetching floor managers:', error);
      setFloorManagers([]);
    } finally {
      setFloorManagersLoading(false);
    }
  };

  const fetchFloorManagers = async (booking = null) => {
    try {
      setFloorManagersLoading(true);
      const params = {
        role: 'floor_manager'
      };

      // If a booking is provided (for assignment), use the booking's branch
      if (booking && booking.id) {
        params.booking_id = booking.id;
      } else if (isSuperAdmin || isCompanyAdmin) {
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

      const response = await api.get('/auth/users/', { params });
      setFloorManagers(response.data.results || []);
    } catch (error) {
      console.error('Error fetching floor managers:', error);
      setFloorManagers([]);
    } finally {
      setFloorManagersLoading(false);
    }
  };

  // Fetch service packages for quick booking
  const fetchPackages = async () => {
    try {
      const params = {
        is_active: true,
        ...getBranchFilterParams(),
      };

      const response = await api.get('/services/packages/', { params });
      setPackages(response.data.results || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      setPackages([]);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchPackages(); // Fetch packages for quick booking
  }, [fetchBookings]);

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

  // Check for openCheckIn parameter in URL and open check-in modal if present
  useEffect(() => {
    const bookingIdToCheckIn = searchParams.get('openCheckIn');
    if (bookingIdToCheckIn) {
      // Find the booking in the current bookings list
      let booking = bookings.find(b => b.id === parseInt(bookingIdToCheckIn));
      if (booking) {
        // Booking found in current list, open check-in modal
        openCheckInModal(booking);
      } else {
        // Booking not found in current list, fetch it directly
        const fetchBooking = async () => {
          try {
            const response = await api.get(`/bookings/${bookingIdToCheckIn}/`);
            openCheckInModal(response.data);
          } catch (error) {
            console.error('Error fetching booking for check-in:', error);
            // Remove the parameter if booking doesn't exist
            navigate('/admin/bookings', { replace: true });
          }
        };
        fetchBooking();
      }
    }
  }, [bookings, searchParams, navigate]);

  const handleAssignTechnician = async () => {
    try {
      if (!assignData.floor_manager) {
        setModalError('Please select a floor manager');
        return;
      }

      setModalError('');
      setAssignFMLoading(true);
      const response = await api.post(`/bookings/${selectedBooking.id}/assign_floor_manager/`, {
        floor_manager_id: assignData.floor_manager,
      });

      // Show success message with custom styled alert
      showStyledAlert('success', response.data.message || 'Floor Manager assigned successfully!');

      setShowAssignModal(false);
      setAssignData({ floor_manager: '' });
      fetchBookings();
    } catch (error) {
      console.error('Error assigning floor manager:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to assign floor manager';
      showStyledAlert('error', `Error: ${errorMessage}`);
    } finally {
      setAssignFMLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'default',
      confirmed: 'info',
      vehicle_arrived: 'info',
      assigned_to_fm: 'warning',
      in_progress: 'warning',
      completed: 'success',
      cancelled: 'destructive',
      // Job card statuses that might appear in booking context
      qc_pending: 'warning',
      qc_completed: 'warning',
      qc_rejected: 'destructive',
      supervisor_approved: 'info',
      supervisor_rejected: 'destructive',
      floor_manager_confirmed: 'warning',
      assigned_to_applicator: 'info',
      work_in_progress: 'warning',
      work_completed: 'info',
      final_qc_pending: 'warning',
      final_qc_passed: 'success',
      final_qc_failed: 'destructive',
      floor_manager_final_qc_confirmed: 'warning',
      customer_approval_pending: 'warning',
      customer_approved: 'success',
      customer_revision_requested: 'warning',
      ready_for_billing: 'info',
      billed: 'success',
      ready_for_delivery: 'success',
      delivered: 'success',
      closed: 'default',
    };
    return variants[status] || 'default';
  };

  const handleCheckIn = async () => {
    try {
      if (!checkInData.initial_photos || checkInData.initial_photos.length === 0) {
        showStyledAlert('error', 'Please upload at least one initial photo');
        return;
      }

      setCheckInLoading(true);
      await api.put(`/bookings/${selectedBooking.id}/check_in/`, checkInData);

      showStyledAlert('success', 'Vehicle checked in successfully!');
      setShowCheckInModal(false);
      setCheckInData({ initial_photos: [], initial_damages: '', check_in_notes: '' });
      fetchBookings();
      // Remove the openCheckIn parameter from URL after successful check-in
      navigate('/admin/bookings', { replace: true });
    } catch (error) {
      console.error('Error checking in vehicle:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to check in vehicle';
      showStyledAlert('error', `Error: ${errorMessage}`);
    } finally {
      setCheckInLoading(false);
    }
  };

  const openCheckInModal = (booking) => {
    if (booking.status === 'vehicle_arrived') {
      showStyledAlert('error', 'Vehicle has already been checked in');
      return;
    }
    setSelectedBooking(booking);
    setCheckInData({
      initial_photos: [],
      initial_damages: '',
      check_in_notes: '',
    });
    setShowCheckInModal(true);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);

    // Check if any files were selected
    if (files.length === 0) {
      showStyledAlert('error', 'No files selected. Please choose at least one photo.');
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
        showStyledAlert('error', `Error processing photo: ${error.message}`);
      }
    }

    // Update state with processed photos
    if (processedPhotos.length > 0) {
      setCheckInData(prev => ({
        ...prev,
        initial_photos: [...prev.initial_photos, ...processedPhotos]
      }));
    } else {
      showStyledAlert('error', 'No valid photos were processed. Please try again with different images.');
    }
  };

  const removePhoto = (index) => {
    setCheckInData(prev => ({
      ...prev,
      initial_photos: prev.initial_photos.filter((_, i) => i !== index)
    }));
  };



  const openAssignModal = (booking) => {
    setSelectedBooking(booking);
    setModalError('');
    // Set the floor manager selection to the currently assigned floor manager if exists
    const currentFloorManagerId = booking.jobcard?.floor_manager_details?.id || '';
    setAssignData({ floor_manager: currentFloorManagerId });
    // Fetch floor managers for the current branch
    fetchTechnicians();
    setShowAssignModal(true);
  };

  const openAssignFloorManagerModal = (booking) => {
    setSelectedBooking(booking);
    setModalError('');
    // Set the floor manager selection to the currently assigned floor manager if exists
    const currentFloorManagerId = booking.jobcard?.floor_manager_details?.id || '';
    setAssignFloorManagerData({ floor_manager_id: currentFloorManagerId });
    // Fetch floor managers for the booking's branch
    fetchFloorManagers(booking);
    setShowAssignFloorManagerModal(true);
  };

  const handleAssignFloorManager = async () => {
    try {
      if (!assignFloorManagerData.floor_manager_id) {
        setModalError('Please select a floor manager');
        return;
      }

      setModalError('');

      if (!selectedBooking?.id) {
        showStyledAlert('error', 'No booking selected.');
        return;
      }

      setAssignFMLoading(true);
      const response = await api.post(
        `/bookings/${selectedBooking.id}/assign_floor_manager/`,
        { floor_manager_id: assignFloorManagerData.floor_manager_id }
      );

      showStyledAlert('success', response.data.message || 'Floor Manager assigned successfully!');
      setShowAssignFloorManagerModal(false);
      setAssignFloorManagerData({ floor_manager_id: '' });
      fetchBookings();
    } catch (error) {
      console.error('Error assigning floor manager:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to assign floor manager';
      showStyledAlert('error', `Error: ${errorMessage}`);
    } finally {
      setAssignFMLoading(false);
    }
  };

  // Handle search input changes with improved debouncing
  const handleSearchChange = (value) => {
    // Clear any existing timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Update the current search term ref to prevent race conditions
    currentSearchTermRef.current = value;

    // Update the filters immediately for UI feedback
    setFilters(prev => ({ ...prev, search: value }));

    // Reset to first page when search changes
    setPagination(prev => ({ ...prev, page: 1 }));

    // Debounce the API call
    searchTimeoutRef.current = setTimeout(() => {
      // Trigger fetchBookings directly to ensure search is executed
      fetchBookings();
    }, 500); // 500ms debounce delay as per project specifications
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle quick booking submission
  const handleQuickBooking = async () => {
    try {
      // Validate required fields
      if (!quickBookingData.customer_name || !quickBookingData.customer_phone ||
        !quickBookingData.registration_number || !quickBookingData.service_package) {
        showStyledAlert('error', 'Please fill in all required fields');
        return;
      }

      // Get current branch
      const branchId = getCurrentBranchId();
      if (!branchId) {
        showStyledAlert('error', 'Admin must be assigned to a branch to create bookings');
        return;
      }

      // Prepare data for submission
      const bookingData = {
        customer: {
          name: quickBookingData.customer_name,
          phone: quickBookingData.customer_phone,
        },
        vehicle: {
          registration_number: quickBookingData.registration_number,
        },
        package: parseInt(quickBookingData.service_package),
        booking_datetime: new Date().toISOString(),
        pickup_required: false,
        branch: branchId,
      };

      setLoading(true);
      const response = await api.post('/bookings/admin_create/', bookingData);

      // Success - show alert and refresh bookings
      showStyledAlert('success', 'Quick booking created successfully!');
      setShowQuickBooking(false);
      setQuickBookingData({
        customer_name: '',
        customer_phone: '',
        registration_number: '',
        service_package: '',
      });
      fetchBookings();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Error creating quick booking';
      showStyledAlert('error', errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isInitialMount.current) {
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

        {/* Bookings Table Skeleton */}
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Manage customer bookings and assign floor managers
          </p>
        </div>
        <div className="flex gap-2">
          {/* Quick Booking Button */}
          {/* <Button 
            variant="default" 
            className="flex items-center gap-2"
            onClick={() => setShowQuickBooking(true)}
          >
            <Plus size={18} />
            Quick Booking
          </Button> */}

          {/* Full Booking Button */}
          <Link to="/admin/bookings/create-walk-in" className="flex-1 md:flex-initial">
            <Button variant="default" className="w-full md:w-auto flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base px-2 md:px-4 py-2 whitespace-nowrap">
              <UserPlus size={16} className="md:hidden" />
              <UserPlus size={18} className="hidden md:block" />
              <span>Create Booking</span>
            </Button>
          </Link>

          <Button
            onClick={fetchBookings}
            variant="outline"
            className="flex-1 md:flex-initial w-full md:w-auto flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base px-2 md:px-4 py-2 whitespace-nowrap"
          >
            <RefreshCw size={16} className="md:hidden" />
            <RefreshCw size={18} className="hidden md:block" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Alert Component */}
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: "", message: "" })}
        />
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search bookings..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            prefix={<Search size={18} className="text-gray-400" />}
          />
          <Select
            // label="Status"
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            options={[
              { value: "", label: "All Statuses" },
              { value: "pending", label: "Pending" },
              { value: "confirmed", label: "Confirmed" },
              { value: "vehicle_arrived", label: "Vehicle Arrived" },
              { value: "assigned_to_fm", label: "Assigned to FM" },
              { value: "in_progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          {(isSuperAdmin || isCompanyAdmin) && (
            <Select
              // label="Branch"
              value={filters.branch}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, branch: e.target.value }))
              }
              options={[
                { value: "all", label: "All Branches" },
                ...branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                })),
              ]}
            />
          )}
        </div>
      </Card>

      {/* Bookings Table */}
      <Card
        title="Bookings"
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
          headers={[
            "ID",
            "Customer",
            "Contact",
            "Regi. Number",
            "Vehicle Type",
            "Service",
            // Conditionally show Branch column only for super admins
            ...((isSuperAdmin || isCompanyAdmin) ? ["Branch"] : []),
            "Date",
            // Conditionally show Booked on column only for super admins
            ...((isSuperAdmin || isCompanyAdmin) ? ["Booked on"] : []),
            "Price",
            "Floor Manager",
            "Status",
            "Actions",
          ]}
          data={filteredBookings}
          renderRow={(booking) => (
            <tr key={booking.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                <Link to={`/admin/bookings/${booking.id}`} className="block w-fit">
                  #{booking.id}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {booking.customer_name || "N/A"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {booking.customer_details.user.phone || "N/A"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {booking.vehicle_details?.registration_number || "N/A"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                {booking.vehicle_type || "N/A"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {booking.packages_details?.length > 0
                  ? booking.packages_details.map(p => p.name).join(', ')
                  : (booking.package_details?.name || 'N/A')}
              </td>
              {/* Conditionally show Branch cell only for super admins */}
              {(isSuperAdmin || isCompanyAdmin) && (
                <td className="px-4 py-3 text-sm text-gray-700">
                  {booking.branch_details?.name || "N/A"}
                </td>
              )}
              <td className="px-4 py-3 text-sm text-gray-700">
                {new Date(booking.booking_datetime).toLocaleDateString()}
              </td>
              {/* Conditionally show Booked on cell only for super admins */}
              {(isSuperAdmin || isCompanyAdmin) && (
                <td className="px-4 py-3 text-sm text-gray-700">
                  {new Date(booking.created_at).toLocaleDateString()}
                </td>
              )}
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                ₹{booking.total_price}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {booking.jobcard?.floor_manager_details?.name || "Unassigned"}
              </td>
              <td className="px-4 py-3">
                <Badge variant={getStatusBadge(booking.jobcard?.status || booking.status)}>
                  <span className="whitespace-nowrap">
                    {(() => {
                      // Use job card status if available, otherwise use booking status
                      const displayStatus = booking.jobcard?.status || booking.status;

                      // Status label mappings
                      const statusLabels = {
                        'assigned_to_fm': 'Assigned to FM',
                        'qc_pending': 'QC Pending',
                        'qc_completed': 'QC Completed',
                        'qc_rejected': 'QC Rejected',
                        'supervisor_approved': 'Supervisor Approved',
                        'supervisor_rejected': 'Supervisor Rejected',
                        'floor_manager_confirmed': 'FM Confirmed',
                        'assigned_to_applicator': 'Assigned to Applicator',
                        'work_in_progress': 'Work In Progress',
                        'work_completed': 'Work Completed',
                        'final_qc_pending': 'Final QC Pending',
                        'final_qc_passed': 'Final QC Passed',
                        'final_qc_failed': 'Final QC Failed',
                        'floor_manager_final_qc_confirmed': 'FM Final QC Confirmed',
                        'customer_approval_pending': 'Customer Approval Pending',
                        'customer_approved': 'Customer Approved',
                        'customer_revision_requested': 'Customer Revision Requested',
                        'ready_for_billing': 'Ready for Billing',
                        'billed': 'Billed',
                        'ready_for_delivery': 'Ready For Delivery',
                        'delivered': 'Delivered',
                        'closed': 'Closed',
                        'pending': 'Pending',
                        'confirmed': 'Confirmed',
                        'vehicle_arrived': 'Vehicle Arrived',
                        'in_progress': 'In Progress',
                        'completed': 'Completed',
                        'cancelled': 'Cancelled'
                      };

                      return statusLabels[displayStatus] || displayStatus.replace(/_/g, " ");
                    })()}
                  </span>
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {/* Check In button - Show for pending or confirmed bookings */}
                  {(booking.status === "pending" ||
                    booking.status === "confirmed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1 px-3 py-1 text-xs"
                        onClick={() => openCheckInModal(booking)}
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
                        onClick={() => openAssignFloorManagerModal(booking)}
                      >
                        <ClipboardCheck size={14} />
                        Assign FM
                      </Button>
                    )}
                  {booking.jobcard && booking.jobcard.id && (
                    <Link to={`/admin/jobcards/${booking.jobcard.id}`}>
                      <Button size="sm" variant="ghost" className="px-2 py-1">
                        <FileText size={16} />
                      </Button>
                    </Link>
                  )}
                  <Link to={`/admin/bookings/${booking.id}`}>
                    <Button size="sm" variant="ghost" className="px-2 py-1">
                      <Eye size={16} />
                    </Button>
                  </Link>
                </div>
              </td>
            </tr>
          )}
        />

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing page {pagination.page} of {pagination.totalPages} (
                {pagination.count} total bookings)
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

      {/* Assign Technician Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setModalError('');
        }}
        title="Assign Floor Manager"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setShowAssignModal(false);
              setModalError('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignTechnician}
              disabled={floorManagersLoading || assignFMLoading}
            >
              {assignFMLoading ? "Assigning..." : "Assign Floor Manager"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {modalError}
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 mb-1">Booking ID</p>
            <p className="font-medium">#{selectedBooking?.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Customer</p>
            <p className="font-medium">
              {selectedBooking?.customer_name || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Service</p>
            <p className="font-medium">
              {selectedBooking?.packages_details?.length > 0
                ? selectedBooking.packages_details.map(p => p.name).join(', ')
                : (selectedBooking?.package_details?.name || 'N/A')}
            </p>
          </div>
          {floorManagersLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <Select
              label="Select Floor Manager"
              value={assignData.floor_manager}
              onChange={(e) =>
                setAssignData({ ...assignData, floor_manager: e.target.value })
              }
              options={[
                { value: "", label: "Select a floor manager" },
                ...floorManagers.map((fm) => ({
                  value: fm.id,
                  label: `${fm.name} (${fm.branch_name})`,
                })),
              ]}
              required
            />
          )}
          {floorManagers.length === 0 && !floorManagersLoading && (
            <div className="text-sm text-gray-500 italic">
              No floor managers available for this branch.
            </div>
          )}
        </div>
      </Modal>

      {/* Assign Floor Manager Modal */}
      <Modal
        isOpen={showAssignFloorManagerModal}
        onClose={() => {
          setShowAssignFloorManagerModal(false);
          setModalError('');
        }}
        title="Assign Floor Manager"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignFloorManagerModal(false);
                setModalError('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignFloorManager}
              disabled={
                floorManagersLoading || assignFMLoading
              }
            >
              {assignFMLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin mr-2" />
                  Assigning...
                </>
              ) : (
                'Assign Floor Manager'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {modalError}
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 mb-1">Booking ID</p>
            <p className="font-medium">#{selectedBooking?.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Customer</p>
            <p className="font-medium">
              {selectedBooking?.customer_name || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Reg. Number</p>
            <p className="font-medium">
              {selectedBooking?.vehicle_details?.registration_number || "N/A"}
            </p>
          </div>
          {/* <div>
            <p className="text-sm text-gray-600 mb-1">Job Card ID</p>
            <p className="font-medium">
              #{selectedBooking?.jobcard?.id || "N/A"}
            </p>
          </div> */}
          {floorManagersLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <Select
              label="Select Floor Manager"
              value={assignFloorManagerData.floor_manager_id}
              onChange={(e) =>
                setAssignFloorManagerData({
                  ...assignFloorManagerData,
                  floor_manager_id: e.target.value,
                })
              }
              options={[
                { value: "", label: "Select a floor manager" },
                ...floorManagers.map((fm) => ({
                  value: fm.id,
                  label: `${fm.name}${fm.branch_name ? ` (${fm.branch_name})` : ""
                    }`,
                })),
              ]}
              required
            />
          )}
          {floorManagers.length === 0 && !floorManagersLoading && (
            <div className="text-sm text-gray-500 italic">
              No floor managers available for this branch.
            </div>
          )}
        </div>
      </Modal>

      {/* Quick Booking Modal */}
      <Modal
        isOpen={showQuickBooking}
        onClose={() => setShowQuickBooking(false)}
        title="Quick Booking"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowQuickBooking(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleQuickBooking} disabled={loading}>
              {loading ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Create a quick booking with minimal information. For more options,
            use the Full Booking form.
          </p>

          <Input
            label="Customer Name"
            placeholder="Enter customer name"
            value={quickBookingData.customer_name}
            onChange={(e) =>
              setQuickBookingData({
                ...quickBookingData,
                customer_name: e.target.value,
              })
            }
            prefix={<UserPlus className="text-gray-400" size={18} />}
            required
          />

          <Input
            label="Customer Phone"
            placeholder="Enter customer phone"
            value={quickBookingData.customer_phone}
            onChange={(e) =>
              setQuickBookingData({
                ...quickBookingData,
                customer_phone: e.target.value,
              })
            }
            required
          />

          <Input
            label="Vehicle Registration Number"
            placeholder="Enter registration number"
            value={quickBookingData.registration_number}
            onChange={(e) =>
              setQuickBookingData({
                ...quickBookingData,
                registration_number: e.target.value,
              })
            }
            prefix={<Car className="text-gray-400" size={18} />}
            required
          />

          <Select
            label="Service Package"
            value={quickBookingData.service_package}
            onChange={(e) =>
              setQuickBookingData({
                ...quickBookingData,
                service_package: e.target.value,
              })
            }
            options={[
              { value: "", label: "Select a service package" },
              ...packages.map((pkg) => ({
                value: pkg.id.toString(),
                label: `${pkg.name} (₹${pkg.price})`,
              })),
            ]}
            required
          />
        </div>
      </Modal>

      {/* Check-In Modal */}
      <Modal
        isOpen={showCheckInModal}
        onClose={() => {
          // Remove the openCheckIn parameter from URL and close modal
          navigate('/admin/bookings', { replace: true });
          setShowCheckInModal(false);
        }}
        title="Vehicle Check-In"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                // Remove the openCheckIn parameter from URL and close modal
                navigate('/admin/bookings', { replace: true });
                setShowCheckInModal(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={checkInData.initial_photos.length === 0 || checkInLoading}
            >
              {checkInLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin mr-2" />
                  Checking In...
                </>
              ) : (
                'Check In Vehicle'
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <p className="text-sm text-gray-600 mb-1">Booking ID</p>
            <p className="font-medium">#{selectedBooking?.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Customer</p>
            <p className="font-medium">
              {selectedBooking?.customer_name || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Reg. Number</p>
            <p className="font-medium">
              {selectedBooking?.vehicle_details?.registration_number || "N/A"}
            </p>
          </div>

          <div>
            <label className="label">Before Photos *</label>

            {/* Camera and Upload Options */}
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
                className="btn btn-primary flex items-center gap-2"
              >
                <Camera size={16} />
                Take Photo
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline flex items-center gap-2"
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
                      onClick={() => removePhoto(index)}
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
              className="input"
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
              className="input"
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
      </Modal>
    </div>
  );
};

export default Bookings;