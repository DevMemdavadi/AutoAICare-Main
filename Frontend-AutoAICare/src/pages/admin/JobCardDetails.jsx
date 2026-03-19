import ActivityTimeline from '@/components/ActivityTimeline';
import DynamicTasksPanel from '@/components/DynamicTasksPanel';
import JobCardPartsPanel from '@/components/JobCardPartsPanel';
import JobTimer from '@/components/JobTimer';
import NotesPanel from '@/components/NotesPanel';
import RewardPreview from '@/components/rewards/RewardPreview';
import { Alert, Badge, Button, Card, Modal, Select } from '@/components/ui';
import WorkflowActions from '@/components/WorkflowActions';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { useWorkflowPermissions } from '@/hooks/useWorkflowPermissions';
import api from '@/utils/api';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  FileCheck,
  FileText,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  ListTodo,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Plus,
  User,
  UserPlus,
  X,
  ZoomIn,
  Award,
  RefreshCw,
  Wrench
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TimerControls from '@/components/TimerControls';
import BufferExtensionModal from '@/components/BufferExtensionModal';
import { useJobCardSocket } from '@/hooks/useJobCardSocket';

const JobDetails = () => {
  const { isSuperAdmin, getBranchFilterParams } = useBranch();
  const { user } = useAuth();
  const { hasPermission } = useWorkflowPermissions();
  const navigate = useNavigate();
  const { id } = useParams();
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncingParts, setSyncingParts] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const isInitialMount = useRef(true);
  const isMutating = useRef(false); // suppress WebSocket refetches during mutations
  const fetchDebounceTimer = useRef(null); // debounce rapid fetchJobCard calls

  // Booking datetime edit state
  const [bookingDatetime, setBookingDatetime] = useState(null); // fetched separately from /bookings/{id}/
  const [editingBookingDate, setEditingBookingDate] = useState(false);
  const [bookingDatetimeValue, setBookingDatetimeValue] = useState('');
  const [savingBookingDate, setSavingBookingDate] = useState(false);

  // Supervisor assignment states
  const [showAssignSupervisorModal, setShowAssignSupervisorModal] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [assigningSupervisor, setAssigningSupervisor] = useState(false);

  // Floor Manager assignment states
  const [showAssignFloorManagerModal, setShowAssignFloorManagerModal] = useState(false);
  const [floorManagers, setFloorManagers] = useState([]);
  const [selectedFloorManager, setSelectedFloorManager] = useState('');
  const [assigningFloorManager, setAssigningFloorManager] = useState(false);
  const [modalError, setModalError] = useState('');

  // Applicator assignment states
  const [showAssignApplicatorModal, setShowAssignApplicatorModal] = useState(false);
  const [applicators, setApplicators] = useState([]);
  const [selectedApplicators, setSelectedApplicators] = useState([]);
  const [assigningApplicators, setAssigningApplicators] = useState(false);

  // Buffer extension modal state
  const [showBufferExtensionModal, setShowBufferExtensionModal] = useState(false);

  // Edit Services modal state
  const [showEditServicesModal, setShowEditServicesModal] = useState(false);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [selectedPackageIds, setSelectedPackageIds] = useState([]);
  const [restoreParts, setRestoreParts] = useState(false);
  const [editServicesLoading, setEditServicesLoading] = useState(false);
  const [editServicesError, setEditServicesError] = useState('');
  const [editServicesResult, setEditServicesResult] = useState(null);

  // Helper functions for status display
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      assigned: 'Assigned',
      qc_pending: 'QC Pending',
      qc_completed: 'QC Completed',
      qc_rejected: 'QC Rejected',
      supervisor_review: 'Supervisor Review',
      supervisor_approved: 'Supervisor Approved',
      supervisor_rejected: 'Supervisor Rejected',
      assigned_to_applicator: 'Assigned to Applicator',
      work_in_progress: 'Work in Progress',
      work_completed: 'Work Completed',
      final_qc_pending: 'Final QC Pending',
      final_qc_passed: 'Final QC Passed',
      final_qc_failed: 'Final QC Failed',
      customer_approval_pending: 'Customer Approval Pending',
      customer_approved: 'Customer Approved',
      customer_revision_requested: 'Customer Revision Requested',
      ready_for_billing: 'Ready for Billing',
      billed: 'Billed',
      ready_for_delivery: 'Ready For Delivery',
      delivered: 'Delivered',
      closed: 'Closed'
    };
    return labels[status] || status;
  };

  const getPhotoTypeLabel = (type) => {
    if (!type) return 'N/A';
    const labelMap = {
      'initial': 'BEFORE',
      'before': 'BEFORE',
      'after': 'AFTER',
      'qc': 'QC',
      'in_progress': 'IN PROGRESS'
    };
    return labelMap[type.toLowerCase()] || type.replace(/_/g, ' ').toUpperCase();
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'default',
      assigned: 'info',
      qc_pending: 'warning',
      qc_completed: 'success',
      qc_rejected: 'destructive',
      supervisor_review: 'warning',
      supervisor_approved: 'success',
      supervisor_rejected: 'destructive',
      assigned_to_applicator: 'info',
      work_in_progress: 'warning',
      work_completed: 'success',
      final_qc_pending: 'warning',
      final_qc_passed: 'success',
      final_qc_failed: 'destructive',
      customer_approval_pending: 'warning',
      customer_approved: 'success',
      customer_revision_requested: 'destructive',
      ready_for_billing: 'info',
      billed: 'success',
      ready_for_delivery: 'success',
      delivered: 'success',
      closed: 'default'
    };
    return variants[status] || 'default';
  };

  const fetchJobCard = useCallback(async (isInitial = false) => {
    // Debounce: cancel any pending fetch and schedule a new one
    if (fetchDebounceTimer.current) {
      clearTimeout(fetchDebounceTimer.current);
    }
    fetchDebounceTimer.current = setTimeout(async () => {
      try {
        if (isInitial) setLoading(true);
        const response = await api.get(`/jobcards/${id}/`);
        const jc = response.data;
        setJobCard(jc);
        // booking_datetime is now included in booking_details by the backend serializer
        setBookingDatetime(jc.booking_details?.booking_datetime || null);
      } catch (err) {
        console.error('Error fetching job card:', err);
        setError(err.response?.data?.detail || 'Failed to load job card');
      } finally {
        if (isInitial) setLoading(false);
        isInitialMount.current = false;
        // Release the mutation lock after data is fresh
        isMutating.current = false;
      }
    }, isInitial ? 0 : 500); // No delay on mount, 500ms debounce for subsequent calls
  }, [id]);

  // Wrapped version for use as onUpdate — sets isMutating to suppress WS double-fetches
  const handleUpdate = useCallback(() => {
    isMutating.current = true;
    fetchJobCard(false);
  }, [fetchJobCard]);

  useEffect(() => {
    fetchJobCard(true);
    return () => {
      if (fetchDebounceTimer.current) clearTimeout(fetchDebounceTimer.current);
    };
  }, [fetchJobCard]);

  // Visibility-based fallback: refresh data when user switches back to this tab
  // This covers the case where WebSocket disconnects while tab is in background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isMutating.current) {
        console.log('🔄 Tab visible — refreshing job card data');
        fetchJobCard(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchJobCard]);

  // WebSocket connection for real-time updates
  useJobCardSocket(id, {
    onTimerPaused: (data) => {
      setJobCard(prev => prev ? {
        ...prev,
        is_timer_paused: true,
        pause_started_at: data.pause_started_at,
        pause_reason: data.pause_reason,
        total_pause_duration_seconds: data.total_pause_duration_seconds,
      } : prev);
    },
    onTimerResumed: (data) => {
      setJobCard(prev => prev ? {
        ...prev,
        is_timer_paused: false,
        pause_started_at: null,
        pause_reason: null,
        total_pause_duration_seconds: data.total_pause_duration_seconds,
      } : prev);
    },
    onStatusChanged: (data) => {
      if (!isMutating.current) fetchJobCard(false);
    },
    onAssignmentChanged: (data) => {
      if (!isMutating.current) fetchJobCard(false);
    },
    onJobCardUpdated: (data) => {
      if (!isMutating.current) fetchJobCard(false);
    },
  });

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true);
      await api.post('/billing/invoices/from_jobcard/', { jobcard_id: jobCard.id });
      setAlert({ show: true, type: 'success', message: 'Invoice generated successfully' });
      fetchJobCard();
    } catch (error) {
      console.error('Error generating invoice:', error);
      setAlert({ show: true, type: 'error', message: error.response?.data?.message || 'Failed to generate invoice' });
      setLoading(false);
    }
  };

  const handleAddNote = async (noteData) => {
    const response = await api.post(`/jobcards/${id}/add_note/`, noteData);
    // Optimistically update or refetch
    fetchJobCard();
    return response.data;
  };

  const handleAddTask = async (taskData) => {
    const response = await api.post(`/jobcards/${id}/add_dynamic_task/`, taskData);
    fetchJobCard();
    return response.data;
  };

  const handleUpdateTask = async (taskId, updateData) => {
    const response = await api.patch(`/jobcards/${id}/dynamic_tasks/${taskId}/`, updateData);
    fetchJobCard();
    return response.data;
  };

  const handleApproveTask = async (taskId) => {
    try {
      const response = await api.post(`/jobcards/${id}/approve_dynamic_task/${taskId}/`);
      fetchJobCard();
      setAlert({ show: true, type: 'success', message: 'Task approved successfully' });
      return response.data;
    } catch (error) {
      console.error("Error approving task:", error);
      setAlert({ show: true, type: 'error', message: error.response?.data?.error || 'Failed to approve task' });
    }
  };

  const openPhotoModal = (photo) => {
    setSelectedPhoto(photo);
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
  };

  // Fetch supervisors
  const fetchSupervisors = async () => {
    try {
      let url = '/auth/users/?role=supervisor';

      // If jobCard has booking info, pass the booking ID to filter by branch
      if (jobCard && jobCard.booking) {
        if (typeof jobCard.booking === 'object' && jobCard.booking.id) {
          url += `&booking_id=${jobCard.booking.id}`;
        } else if (typeof jobCard.booking === 'number' || typeof jobCard.booking === 'string') {
          url += `&booking_id=${jobCard.booking}`;
        }
      }

      const response = await api.get(url);
      setSupervisors(response.data.results || []);
    } catch (error) {
      console.error('Error fetching supervisors:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to load supervisors' });
    }
  };

  // Handle assign supervisor
  const handleAssignSupervisor = async () => {
    if (!selectedSupervisor) {
      setAlert({ show: true, type: 'error', message: 'Please select a supervisor' });
      return;
    }

    try {
      setAssigningSupervisor(true);
      await api.post(`/jobcards/${id}/assign_supervisor/`, {
        supervisor_id: parseInt(selectedSupervisor)
      });

      setAlert({ show: true, type: 'success', message: 'Supervisor assigned successfully' });
      setShowAssignSupervisorModal(false);
      setSelectedSupervisor('');
      fetchJobCard(); // Refresh job card data
    } catch (error) {
      console.error('Error assigning supervisor:', error);
      setAlert({
        show: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to assign supervisor'
      });
    } finally {
      setAssigningSupervisor(false);
    }
  };

  // Open supervisor assignment modal
  const openAssignSupervisorModal = () => {
    fetchSupervisors();
    setShowAssignSupervisorModal(true);
  };

  // Fetch Floor Managers
  const fetchFloorManagers = async () => {
    try {
      let url = '/auth/users/?role=floor_manager';

      // If jobCard has booking info, pass the booking ID to filter by branch
      if (jobCard && jobCard.booking) {
        // Check if booking is an object with id or just the ID
        if (typeof jobCard.booking === 'object' && jobCard.booking.id) {
          url += `&booking_id=${jobCard.booking.id}`;
        } else if (typeof jobCard.booking === 'number' || typeof jobCard.booking === 'string') {
          // booking might be just the ID (as number or string)
          url += `&booking_id=${jobCard.booking}`;
        }
      }

      const response = await api.get(url);
      setFloorManagers(response.data.results || []);
    } catch (error) {
      console.error('Error fetching floor managers:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to load floor managers' });
    }
  };

  // Handle assign floor manager
  const handleAssignFloorManager = async () => {
    if (!selectedFloorManager) {
      setModalError('Please select a floor manager');
      return;
    }

    try {
      setModalError('');
      setAssigningFloorManager(true);
      await api.post(`/jobcards/${id}/assign_floor_manager_admin/`, {
        floor_manager_id: parseInt(selectedFloorManager)
      });

      setAlert({ show: true, type: 'success', message: 'Floor manager assigned successfully' });
      setShowAssignFloorManagerModal(false);
      setSelectedFloorManager('');
      fetchJobCard();
    } catch (error) {
      console.error('Error assigning floor manager:', error);
      setAlert({
        show: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to assign floor manager'
      });
    } finally {
      setAssigningFloorManager(false);
    }
  };

  // Open floor manager modal
  const openAssignFloorManagerModal = () => {
    setModalError('');
    fetchFloorManagers();
    setShowAssignFloorManagerModal(true);
  };

  // Fetch Applicators
  const fetchApplicators = async () => {
    try {
      let url = '/auth/users/?role=applicator';

      // If jobCard has booking info, pass the booking ID to filter by branch
      if (jobCard && jobCard.booking) {
        if (typeof jobCard.booking === 'object' && jobCard.booking.id) {
          url += `&booking_id=${jobCard.booking.id}`;
        } else if (typeof jobCard.booking === 'number' || typeof jobCard.booking === 'string') {
          url += `&booking_id=${jobCard.booking}`;
        }
      }

      const response = await api.get(url);
      setApplicators(response.data.results || []);
    } catch (error) {
      console.error('Error fetching applicators:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to load applicators' });
    }
  };

  // Handle assign applicators
  const handleAssignApplicators = async () => {
    if (selectedApplicators.length === 0) {
      setAlert({ show: true, type: 'error', message: 'Please select at least one applicator' });
      return;
    }

    try {
      setAssigningApplicators(true);
      await api.post(`/jobcards/${id}/assign_applicators_admin/`, {
        applicator_ids: selectedApplicators
      });

      setAlert({ show: true, type: 'success', message: 'Applicator team assigned successfully' });
      setShowAssignApplicatorModal(false);
      setSelectedApplicators([]);
      fetchJobCard();
    } catch (error) {
      console.error('Error assigning applicators:', error);
      setAlert({
        show: true,
        type: 'error',
        message: error.response?.data?.error || 'Failed to assign applicators'
      });
    } finally {
      setAssigningApplicators(false);
    }
  };

  // Open applicator modal
  const openAssignApplicatorModal = () => {
    fetchApplicators();
    // Pre-select existing team
    if (jobCard?.applicator_team_details) {
      setSelectedApplicators(jobCard.applicator_team_details.map(a => a.id));
    }
    setShowAssignApplicatorModal(true);
  };

  // Timer control handlers
  const handleTimerUpdate = (response) => {
    // Show success message
    setAlert({
      show: true,
      type: 'success',
      message: response.message || 'Timer updated successfully'
    });

    // Refresh job card data
    fetchJobCard();
  };

  const handleBufferExtensionSuccess = (response) => {
    // Show success message
    setAlert({
      show: true,
      type: 'success',
      message: 'Buffer extension request submitted successfully!'
    });

    // Close modal
    setShowBufferExtensionModal(false);

    // Refresh job card data
    fetchJobCard();
  };

  // Save booking datetime
  const handleSaveBookingDatetime = async () => {
    const bookingId = typeof jobCard.booking === 'object' ? jobCard.booking?.id : jobCard.booking;
    if (!bookingId || !bookingDatetimeValue) return;
    try {
      setSavingBookingDate(true);
      await api.post(`/jobcards/${id}/update-booking-date/`, { booking_datetime: bookingDatetimeValue });
      // Immediately reflect the updated date in the UI
      setBookingDatetime(bookingDatetimeValue);
      setEditingBookingDate(false);
      setAlert({ show: true, type: 'success', message: 'Booking date updated successfully' });
      fetchJobCard(); // background refresh
    } catch (err) {
      console.error('Error saving booking datetime:', err);
      setAlert({ show: true, type: 'error', message: err.response?.data?.error || err.response?.data?.detail || 'Failed to update booking date' });
    } finally {
      setSavingBookingDate(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-64 mt-2 animate-pulse"></div>
            </div>
          </div>
          <div className="h-10 w-24 bg-gray-200 rounded-full animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-32 mt-2 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div >
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Job Card</h2>
          <p className="text-gray-600 mb-6">{error || 'The job card you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Job Cards
            </Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!jobCard) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Card Not Found</h2>
          <p className="text-gray-600 mb-6">The job card you're looking for doesn't exist.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Cards
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ListTodo, count: jobCard.dynamic_tasks?.length || 0 },
    ...(hasPermission('can_add_parts') ? [
      { id: 'parts', label: 'Parts', icon: Package, count: jobCard.parts_used?.length || 0 }
    ] : []),
    { id: 'notes', label: 'Notes', icon: MessageSquare, count: jobCard.notes?.length || 0 },
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'photos', label: 'Photos', icon: ImageIcon, count: jobCard.photos?.length || 0 },
    // { id: 'documents', label: 'Documents', icon: FileCheck }
  ];

  return (
    <div className="space-y-6">
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: "", message: "" })}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)} size="icon">
            <ArrowLeft size={18} />
          </Button>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Job Card #{jobCard.id}
              <Badge variant={getStatusBadge(jobCard.status)} className="ml-2">
                {getStatusLabel(jobCard.status)}
              </Badge>
            </h1>
            <p className="text-gray-600 flex items-center gap-2 text-sm">
              <Calendar size={14} />
              {new Date(jobCard.created_at).toLocaleDateString()}
              <span className="text-gray-300">|</span>
              <User size={14} />
              {jobCard.booking_details?.vehicle_details?.customer_name ||
                "Guest"}
            </p>
          </div>
        </div>
        {jobCard.job_started_at && (
          <div className="ml-auto">
            <JobTimer
              jobStartedAt={jobCard.job_started_at}
              allowedDurationMinutes={jobCard.allowed_duration_display || jobCard.allowed_duration_minutes}
              effectiveDurationMinutes={jobCard.effective_duration_minutes}
              elapsedWorkTime={jobCard.elapsed_work_time}
              isTimerPaused={jobCard.is_timer_paused}
              pauseStartedAt={jobCard.pause_started_at}
              totalPauseDurationSeconds={jobCard.total_pause_duration_seconds}
              status={jobCard.status}
              reflectPause={false}
            />
          </div>
        )}

        {/* Workflow Actions (Always visible) */}
        <div className="flex-shrink-0">
          {/* We can put primary action here if WorkflowActions exposes it, 
               but for now keeping full component below */}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                <Icon size={16} />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`
                    ml-1 px-2 py-0.5 rounded-full text-xs
                    ${activeTab === tab.id
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                      }
                  `}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {/* Workflow Actions Panel - Always visible for quick access */}
        <div className="mb-6">
          <WorkflowActions
            jobCard={jobCard}
            onUpdate={handleUpdate}
            userRole={user?.role}
          />
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer & Vehicle - Left Column */}
            <div className="space-y-6 lg:col-span-1">
              <Card title="Customer Details">
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="text-gray-500" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {jobCard.booking_details?.customer_name || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500">Customer Name</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Phone className="text-gray-500" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {jobCard.booking_details?.customer_details?.user
                          ?.phone || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500">Phone</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Mail className="text-gray-500" size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 break-words">
                        {jobCard.booking_details?.customer_details?.user
                          ?.email || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500">Email</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Vehicle Details">
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Car className="text-gray-500" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {jobCard.booking_details?.vehicle_details?.model ||
                          "Unknown Model"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {jobCard.booking_details?.vehicle_details
                          ?.registration_number || "No Reg #"}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Assign Team - Only for Admin and Floor Manager roles */}
              {(user?.role === 'branch_admin' || user?.role === 'company_admin' || user?.role === 'super_admin' || user?.role === 'floor_manager') && (
                <Card title="Assign Team">
                  <div className="p-4 space-y-4">
                    {/* Floor Manager - Only show for Admin/Super Admin roles */}
                    {(user?.role === 'branch_admin' || user?.role === 'super_admin' || user?.role === 'company_admin') && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <span className="text-sm text-gray-600 block">Floor Manager</span>
                            {jobCard.floor_manager_details ? (
                              <span className="text-sm font-medium text-gray-900">
                                {jobCard.floor_manager_details.name}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 italic">Not assigned</span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={openAssignFloorManagerModal}
                            className="h-6 px-2 py-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <UserPlus size={14} className="mr-1" />
                            {jobCard.floor_manager_details ? 'Update' : 'Assign'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Before QC completion - show empty state message for FM role */}
                    {user?.role === 'floor_manager' && !['qc_completed', 'supervisor_review', 'supervisor_approved', 'supervisor_rejected', 'assigned_to_applicator', 'work_in_progress', 'work_completed', 'final_qc_pending', 'final_qc_passed', 'final_qc_failed', 'customer_approval_pending', 'customer_approved', 'customer_revision_requested', 'ready_for_billing', 'billed', 'ready_for_delivery', 'delivered', 'closed'].includes(jobCard.status) && (
                      <div className="text-center py-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                          <UserPlus className="text-gray-400" size={24} />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Complete QC to assign team</p>
                        <p className="text-xs text-gray-400 mt-1">Team assignment will be available after quality check</p>
                      </div>
                    )}

                    {/* After QC completion - show Supervisor assignment */}
                    {['qc_completed', 'supervisor_review', 'supervisor_approved', 'supervisor_rejected', 'assigned_to_applicator',
                      'work_in_progress', 'work_completed', 'final_qc_pending', 'final_qc_passed', 'final_qc_failed', 'customer_approval_pending',
                      'customer_approved', 'customer_revision_requested', 'ready_for_billing', 'billed', 'ready_for_delivery', 'delivered', 'closed'].includes(jobCard.status) && (
                        <>
                          {/* Supervisor Section */}
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <span className="text-sm text-gray-600 block">Supervisor</span>
                                {jobCard.supervisor_details ? (
                                  <span className="text-sm font-medium text-gray-900">
                                    {jobCard.supervisor_details.name}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400 italic">Not assigned</span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={openAssignSupervisorModal}
                                className="h-6 px-2 py-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <UserPlus size={14} className="mr-1" />
                                {jobCard.supervisor_details ? 'Update' : 'Assign'}
                              </Button>
                            </div>
                          </div>

                          {/* Applicators Section */}
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <span className="text-sm text-gray-600 block">Applicators</span>
                                {jobCard.applicator_team_details && jobCard.applicator_team_details.length > 0 ? (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {jobCard.applicator_team_details.map((app) => (
                                      <span
                                        key={app.id}
                                        className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-700"
                                      >
                                        {app.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400 italic">Not assigned</span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={openAssignApplicatorModal}
                                className="h-6 px-2 py-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <UserPlus size={14} className="mr-1" />
                                {jobCard.applicator_team_details && jobCard.applicator_team_details.length > 0 ? 'Update' : 'Assign'}
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column (Span 2) */}
            <div className="space-y-6 lg:col-span-2">

              {/* Timer Controls & Buffer Management */}
              {jobCard.job_started_at && (
                <Card
                  title={
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={18} className="text-blue-600" />
                        <span>Timer Controls & Buffer Management</span>
                      </div>
                      {(user?.role === 'floor_manager' || user?.role === 'supervisor') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowBufferExtensionModal(true)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Plus size={16} className="mr-1" />
                          Request Extension
                        </Button>
                      )}
                    </div>
                  }
                >
                  <div className="p-4 space-y-4">
                    {/* Enhanced Timer Display */}
                    <JobTimer
                      jobStartedAt={jobCard.job_started_at}
                      allowedDurationMinutes={jobCard.allowed_duration_display || jobCard.allowed_duration_minutes}
                      effectiveDurationMinutes={jobCard.effective_duration_minutes}
                      elapsedWorkTime={jobCard.elapsed_work_time}
                      isTimerPaused={jobCard.is_timer_paused}
                      pauseStartedAt={jobCard.pause_started_at}
                      totalPauseDurationSeconds={jobCard.total_pause_duration_seconds}
                      status={jobCard.status}
                      reflectPause={false}
                    />

                    {/* Timer Controls */}
                    <TimerControls
                      jobCard={jobCard}
                      onUpdate={handleTimerUpdate}
                    />
                  </div>
                </Card>
              )}

              {/* Buffer Extension Modal */}
              <BufferExtensionModal
                isOpen={showBufferExtensionModal}
                onClose={() => setShowBufferExtensionModal(false)}
                jobCard={jobCard}
                onSuccess={handleBufferExtensionSuccess}
              />

              {/* Scheduled Date & Time */}
              <Card title={
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-blue-600" />
                  <span>Scheduled Date &amp; Time</span>
                </div>
              }>
                <div className="p-4">
                  {bookingDatetime === null ? (
                    /* Skeleton while booking API is still loading */
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="h-10 w-10 bg-gray-200 rounded-full flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-40 bg-gray-200 rounded" />
                        <div className="h-3 w-28 bg-gray-100 rounded" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <Calendar className="text-blue-600" size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {new Date(bookingDatetime).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit', hour12: true
                            })}
                          </p>
                          <p className="text-xs text-gray-500">Scheduled date &amp; time</p>
                        </div>
                      </div>
                      {['branch_admin', 'company_admin', 'super_admin'].includes(user?.role) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const d = new Date(bookingDatetime);
                            const pad = (n) => String(n).padStart(2, '0');
                            const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                            setBookingDatetimeValue(local);
                            setEditingBookingDate(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Clock size={14} className="mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Edit Booking Date Modal */}
              {editingBookingDate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Edit Scheduled Date &amp; Time</h3>
                      </div>
                      <button
                        onClick={() => setEditingBookingDate(false)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {/* Modal Body */}
                    <div className="px-6 py-5 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Date &amp; Time
                        </label>
                        <input
                          type="datetime-local"
                          value={bookingDatetimeValue}
                          onChange={(e) => setBookingDatetimeValue(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          autoFocus
                        />
                        <p className="text-xs text-gray-400 mt-1.5">Past dates are allowed for backdating purposes.</p>
                      </div>
                    </div>
                    {/* Modal Footer */}
                    <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                      <Button
                        variant="outline"
                        onClick={() => setEditingBookingDate(false)}
                        className="flex-1"
                        disabled={savingBookingDate}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveBookingDatetime}
                        disabled={savingBookingDate || !bookingDatetimeValue}
                        className="flex-1"
                      >
                        {savingBookingDate ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </span>
                        ) : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Service & Pricing Summary - Show when no invoice exists */}
              {!jobCard.invoice && jobCard.booking_details?.price_breakdown && (
                <Card title={
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Package size={18} className="text-blue-600" />
                      <span>Service &amp; Pricing Summary</span>
                      <Badge variant="info" className="ml-2">Estimate</Badge>
                    </div>
                    {['branch_admin', 'company_admin', 'super_admin'].includes(user?.role) && (
                      <button
                        id="edit-services-btn"
                        onClick={async () => {
                          setEditServicesError('');
                          setEditServicesResult(null);
                          setRestoreParts(false);
                          // Pre-select current packages
                          const currentIds = (jobCard.booking_details?.price_breakdown?.packages || []).map(p => p.id);
                          setSelectedPackageIds(currentIds);
                          // Fetch available packages
                          try {
                            const res = await api.get('/services/packages/', { params: { is_active: true, page_size: 100 } });
                            setAvailablePackages(res.data.results || res.data);
                          } catch {
                            setAvailablePackages([]);
                          }
                          setShowEditServicesModal(true);
                        }}
                        disabled={['work_completed', 'final_qc_pending', 'final_qc_passed', 'final_qc_failed', 'floor_manager_final_qc_confirmed', 'customer_approval_pending', 'customer_approved', 'customer_revision_requested', 'ready_for_billing', 'billed', 'ready_for_delivery', 'delivered', 'closed'].includes(jobCard.status)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Wrench size={13} />
                        Edit Services
                      </button>
                    )}
                  </div>
                }>
                  <div className="p-6 space-y-4">
                    {/* Services (all packages) */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Services</h4>
                      <div className="space-y-2">
                        {(jobCard.booking_details.price_breakdown.packages?.length > 0
                          ? jobCard.booking_details.price_breakdown.packages
                          : jobCard.booking_details.price_breakdown.package
                            ? [jobCard.booking_details.price_breakdown.package]
                            : []
                        ).map((pkg, index) => (
                          <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <span className="font-medium text-gray-900">{pkg.name}</span>
                            <span className="font-bold text-gray-900">₹{parseFloat(pkg.price || 0).toFixed(2)}</span>
                          </div>
                        ))}
                        {(jobCard.booking_details.price_breakdown.packages?.length === 0 &&
                          !jobCard.booking_details.price_breakdown.package) && (
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                              <span className="font-medium text-gray-500 italic">No services</span>
                              <span className="font-bold text-gray-900">₹0.00</span>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Add-ons */}
                    {jobCard.booking_details.price_breakdown.addons?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Add-ons</h4>
                        <div className="space-y-2">
                          {jobCard.booking_details.price_breakdown.addons.map((addon, index) => (
                            <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                              <span className="text-gray-700">{addon.name}</span>
                              <span className="font-medium text-gray-900">₹{addon.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parts Included in Service */}
                    {jobCard.parts_used?.length > 0 && (() => {
                      // Group default parts by their service package
                      const defaultParts = jobCard.parts_used.filter(p => p.is_service_default);
                      const additionalParts = jobCard.parts_used.filter(p => !p.is_service_default);

                      // Group default parts by service_package_name
                      const grouped = defaultParts.reduce((acc, part) => {
                        const key = part.service_package_name || 'Service Parts';
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(part);
                        return acc;
                      }, {});

                      const serviceNames = Object.keys(grouped);
                      const multiService = serviceNames.length > 1;

                      return (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Parts</h4>
                          <div className="space-y-3">
                            {/* Service default parts grouped by service */}
                            {serviceNames.map(serviceName => (
                              <div key={serviceName}>
                                {multiService && (
                                  <p className="text-xs font-semibold text-blue-600 uppercase mb-1.5 px-1">
                                    {serviceName}
                                  </p>
                                )}
                                <div className="space-y-1.5">
                                  {grouped[serviceName].map((part, index) => (
                                    <div key={`default-${serviceName}-${index}`} className="flex justify-between items-center bg-teal-50 p-3 rounded-lg border border-teal-100">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-700">{part.part_name}</span>
                                        {part.quantity > 1 && <span className="text-xs text-gray-500">(x{part.quantity})</span>}
                                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Included</span>
                                      </div>
                                      <span className="font-medium text-teal-600">₹0.00</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {/* Additional (non-service) parts */}
                            {additionalParts.map((part, index) => (
                              <div key={`additional-${index}`} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-700">{part.part_name}</span>
                                  {part.quantity > 1 && <span className="text-xs text-gray-500">(x{part.quantity})</span>}
                                </div>
                                <span className="font-medium text-gray-900">₹{parseFloat(part.total_price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Pricing Summary */}
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">₹{jobCard.booking_details.price_breakdown.subtotal}</span>
                      </div>
                      {jobCard.parts_used?.filter(p => !p.is_service_default).length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Additional Parts</span>
                          <span className="font-medium">
                            ₹{jobCard.parts_used.filter(p => !p.is_service_default).reduce((sum, p) => sum + parseFloat(p.total_price || 0), 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST</span>
                        <span className="font-medium">₹{jobCard.booking_details.price_breakdown.gst_amount}</span>
                      </div>
                      {parseFloat(jobCard.booking_details.price_breakdown.discount_amount || 0) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span className="font-medium">-₹{jobCard.booking_details.price_breakdown.discount_amount}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                        <span className="text-gray-900">Estimated Total</span>
                        <span className="text-gray-900">₹{jobCard.booking_details.price_breakdown.total_price}</span>
                      </div>
                    </div>

                    {/* Service Duration */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">Service Duration</span>
                        </div>
                        <span className="font-bold text-blue-600">
                          {Math.floor(jobCard.allowed_duration_display / 60)}h {jobCard.allowed_duration_display % 60}m
                        </span>
                      </div>
                    </div>

                    {/* Note */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-800">
                        <strong>Note:</strong> This is an estimate. Final invoice may include additional tasks, parts, or adjustments identified during service.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Billing & Payment Status */}
              {jobCard.invoice && (
                <Card title={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-blue-600" />
                      <span>Billing & Payment Status</span>
                    </div>
                    <Badge variant={
                      jobCard.invoice.status === 'paid' ? 'success' :
                        jobCard.invoice.status === 'pending' ? 'warning' :
                          jobCard.invoice.status === 'overdue' ? 'destructive' : 'default'
                    }>
                      {jobCard.invoice.status === 'paid' ? 'Paid' :
                        jobCard.invoice.status === 'pending' ? 'Pending' :
                          jobCard.invoice.status === 'overdue' ? 'Overdue' :
                            jobCard.invoice.status}
                    </Badge>
                  </div>
                }>
                  <div className="p-6 space-y-4">
                    {/* Invoice Number */}
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Invoice Number</span>
                      <span className="font-mono font-medium text-gray-900">
                        {jobCard.invoice.invoice_number}
                      </span>
                    </div>

                    {/* Invoice Items Breakdown */}
                    <div className="space-y-3">
                      {/* Individual Items */}
                      {jobCard.invoice.items && jobCard.invoice.items.length > 0 && (
                        <div className="space-y-2 pb-3 border-b border-gray-100">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase">Items</h4>
                          {jobCard.invoice.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <div className="flex-1">
                                <span className="text-gray-700">{item.description}</span>
                                {item.quantity > 1 && (
                                  <span className="text-gray-500 text-xs ml-1">
                                    (x{item.quantity} @ ₹{parseFloat(item.unit_price).toFixed(2)})
                                  </span>
                                )}
                              </div>
                              <span className="font-medium text-gray-900 ml-4">
                                ₹{parseFloat(item.total || (item.quantity * item.unit_price)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Subtotal */}
                      <div className="flex justify-between text-sm pt-2">
                        <span className="text-gray-600 font-medium">Subtotal</span>
                        <span className="font-medium">₹{jobCard.invoice.subtotal}</span>
                      </div>

                      {/* GST */}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST ({jobCard.invoice.tax_rate}%)</span>
                        <span className="font-medium">₹{jobCard.invoice.tax_amount}</span>
                      </div>

                      {/* Discount */}
                      {parseFloat(jobCard.invoice.discount_amount) > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Discount</span>
                          <span>-₹{jobCard.invoice.discount_amount}</span>
                        </div>
                      )}

                      {/* Total */}
                      <div className="flex justify-between text-base font-bold pt-3 border-t border-gray-200">
                        <span className="text-gray-900">Total Amount</span>
                        <span className="text-gray-900">₹{jobCard.invoice.total_amount}</span>
                      </div>
                    </div>

                    {/* Payment Status */}
                    {jobCard.invoice.total_paid > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Amount Paid</span>
                          <span className="text-lg font-bold text-green-600">
                            ₹{parseFloat(jobCard.invoice.total_paid).toFixed(2)}
                          </span>
                        </div>

                        {parseFloat(jobCard.invoice.remaining_balance) !== 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">
                              {jobCard.invoice.is_overpaid ? 'Overpaid' : 'Amount Remaining'}
                            </span>
                            <span className={`text-lg font-bold ${jobCard.invoice.is_overpaid ? 'text-green-600' : 'text-orange-600'}`}>
                              ₹{Math.abs(parseFloat(jobCard.invoice.remaining_balance)).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Payment Progress Bar */}
                        <div className="pt-2">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Payment Progress</span>
                            <span>
                              {Math.min(100, jobCard.invoice.payment_progress_percent || 0).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${jobCard.invoice.is_overpaid || jobCard.invoice.remaining_balance <= 0 ? 'bg-green-600' : 'bg-orange-500'}`}
                              style={{
                                width: `${Math.min(100, jobCard.invoice.payment_progress_percent || 0)}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment History */}
                    {jobCard.invoice.payment_details && jobCard.invoice.payment_details.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Payment History</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {jobCard.invoice.payment_details.map((payment, idx) => (
                            <div
                              key={payment.id || idx}
                              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle size={14} className="text-green-600" />
                                  <span className="text-sm font-medium text-gray-900">
                                    ₹{parseFloat(payment.amount).toFixed(2)}
                                  </span>
                                  <Badge variant="default" className="text-xs">
                                    {payment.payment_method_display || payment.payment_method?.toUpperCase()}
                                  </Badge>
                                  {payment.payment_status !== 'completed' && (
                                    <Badge variant="warning" className="text-xs">
                                      {payment.payment_status_display || payment.payment_status}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}</span>
                                  {payment.reference_number && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <span className="font-mono text-xs">Ref: {payment.reference_number}</span>
                                    </>
                                  )}
                                  {payment.recorded_by && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <span>By: {payment.recorded_by}</span>
                                    </>
                                  )}
                                </div>
                                {payment.notes && (
                                  <p className="text-xs text-gray-500 mt-1 italic">{payment.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Invoice Dates */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Issued Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(jobCard.invoice.issued_date).toLocaleDateString()}
                        </p>
                      </div>
                      {jobCard.invoice.paid_date && (
                        <div>
                          <p className="text-xs text-gray-500">Paid Date</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(jobCard.invoice.paid_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Warning for calculation mismatch */}
                    {jobCard.invoice.calculation_warning && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800">
                              Calculation Warning
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                              {jobCard.invoice.calculation_warning.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}



              {/* Quick Notes Preview */}
              {jobCard.notes && jobCard.notes.length > 0 && (
                <Card title="Recent Notes">
                  <div className="p-4 space-y-3">
                    {jobCard.notes.slice(0, 3).map((note) => (
                      <div
                        key={note.id}
                        className="text-sm border-l-2 border-blue-500 pl-3 py-1"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900">
                            {note.created_by_details?.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1 line-clamp-2">
                          {note.content}
                        </p>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setActiveTab("notes")}
                    >
                      View All Notes
                    </Button>
                  </div>
                </Card>
              )}

              {/* Pickup & Drop Details */}
              {(jobCard.booking_details?.pickup_required || jobCard.booking_details?.pickup_request_details) && (
                <Card title="Pickup & Drop Details">
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Pickup Required</h4>
                        <p className="font-semibold text-gray-900">
                          {jobCard.booking_details.pickup_required ? 'Yes' : 'No'}
                        </p>
                      </div>
                      {jobCard.booking_details.location && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Pickup Address</h4>
                          <p className="font-semibold text-gray-900">
                            {jobCard.booking_details.location}
                          </p>
                        </div>
                      )}
                      {jobCard.booking_details.pickup_request_details?.pickup_time && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Pickup Time</h4>
                          <p className="font-semibold text-gray-900">
                            {new Date(jobCard.booking_details.pickup_request_details.pickup_time).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {jobCard.booking_details.pickup_request_details?.status && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Pickup Status</h4>
                          <p className="font-semibold text-gray-900 capitalize">
                            {jobCard.booking_details.pickup_request_details.status.replace('_', ' ')}
                          </p>
                        </div>
                      )}
                      {jobCard.booking_details.pickup_request_details?.driver && (
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-medium text-gray-500">Assigned Driver</h4>
                          <p className="font-semibold text-gray-900">
                            {jobCard.booking_details.pickup_request_details.driver.name} - {jobCard.booking_details.pickup_request_details.driver.phone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Notes & Details - Comprehensive View */}
              {(jobCard.booking_details?.notes || jobCard.booking_details?.initial_damages ||
                jobCard.booking_details?.check_in_notes || jobCard.notes?.length > 0 ||
                jobCard.qc_report || jobCard.supervisor_review || jobCard.final_qc_report) && (
                  <Card title="Notes & Details">
                    <div className="p-4 space-y-4">
                      {/* Booking Notes */}
                      {jobCard.booking_details?.notes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <MessageSquare size={16} />
                            Booking Notes
                          </h4>
                          <p className="text-sm text-blue-800 whitespace-pre-wrap">{jobCard.booking_details.notes}</p>
                        </div>
                      )}

                      {/* Check-In Notes */}
                      {jobCard.booking_details?.check_in_notes && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                            <CheckCircle size={16} />
                            Check-In Notes
                          </h4>
                          <p className="text-sm text-green-800 whitespace-pre-wrap">{jobCard.booking_details.check_in_notes}</p>
                          {jobCard.booking_details.checked_in_by_details && (
                            <p className="text-xs text-green-600 mt-2">
                              By: {jobCard.booking_details.checked_in_by_details.name} on {new Date(jobCard.booking_details.vehicle_arrived_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Initial Damages */}
                      {jobCard.booking_details?.initial_damages && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                            <AlertCircle size={16} />
                            Initial Damages Observed
                          </h4>
                          <p className="text-sm text-yellow-800 whitespace-pre-wrap">{jobCard.booking_details.initial_damages}</p>
                        </div>
                      )}

                      {/* QC Report Notes */}
                      {jobCard.qc_report && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                            <FileCheck size={16} />
                            QC Report Details
                          </h4>
                          <div className="space-y-2">
                            {jobCard.qc_report.scratches && (
                              <div>
                                <span className="text-xs font-medium text-indigo-700">Scratches:</span>
                                <p className="text-sm text-indigo-800 whitespace-pre-wrap">{jobCard.qc_report.scratches}</p>
                              </div>
                            )}
                            {jobCard.qc_report.dents && (
                              <div>
                                <span className="text-xs font-medium text-indigo-700">Dents:</span>
                                <p className="text-sm text-indigo-800 whitespace-pre-wrap">{jobCard.qc_report.dents}</p>
                              </div>
                            )}
                            {jobCard.qc_report.additional_tasks && (
                              <div>
                                <span className="text-xs font-medium text-indigo-700">Additional Tasks:</span>
                                <p className="text-sm text-indigo-800 whitespace-pre-wrap">{jobCard.qc_report.additional_tasks}</p>
                              </div>
                            )}
                            {jobCard.qc_report.additional_tasks_price != null && jobCard.qc_report.additional_tasks_price > 0 && (
                              <div>
                                <span className="text-xs font-medium text-indigo-700">Additional Tasks Price:</span>
                                <p className="text-sm text-indigo-800 whitespace-pre-wrap">₹{jobCard.qc_report.additional_tasks_price}</p>
                              </div>
                            )}
                            {jobCard.qc_report.notes && (
                              <div>
                                <span className="text-xs font-medium text-indigo-700">Notes:</span>
                                <p className="text-sm text-indigo-800 whitespace-pre-wrap">{jobCard.qc_report.notes}</p>
                              </div>
                            )}
                            {jobCard.qc_report.floor_manager_details && (
                              <p className="text-xs text-indigo-600 mt-2">
                                By: {jobCard.qc_report.floor_manager_details.name} on {new Date(jobCard.qc_report.created_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Supervisor Review Notes */}
                      {jobCard.supervisor_review && (
                        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-cyan-900 mb-3 flex items-center gap-2">
                            <User size={16} />
                            Supervisor Review
                          </h4>
                          <div className="space-y-2">
                            {jobCard.supervisor_review.review_notes && (
                              <div>
                                <span className="text-xs font-medium text-cyan-700">Review Notes:</span>
                                <p className="text-sm text-cyan-800 whitespace-pre-wrap">{jobCard.supervisor_review.review_notes}</p>
                              </div>
                            )}
                            {jobCard.supervisor_review.rejection_reason && (
                              <div>
                                <span className="text-xs font-medium text-red-700">Rejection Reason:</span>
                                <p className="text-sm text-red-800 whitespace-pre-wrap">{jobCard.supervisor_review.rejection_reason}</p>
                              </div>
                            )}
                            {jobCard.supervisor_review.supervisor_details && (
                              <p className="text-xs text-cyan-600 mt-2">
                                By: {jobCard.supervisor_review.supervisor_details.name} on {new Date(jobCard.supervisor_review.created_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Final QC Report Notes */}
                      {jobCard.final_qc_report && (
                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-teal-900 mb-3 flex items-center gap-2">
                            <CheckCircle size={16} />
                            Final QC Report
                          </h4>
                          <div className="space-y-2">
                            {jobCard.final_qc_report.quality_notes && (
                              <div>
                                <span className="text-xs font-medium text-teal-700">Quality Notes:</span>
                                <p className="text-sm text-teal-800 whitespace-pre-wrap">{jobCard.final_qc_report.quality_notes}</p>
                              </div>
                            )}
                            {jobCard.final_qc_report.issues_found && (
                              <div>
                                <span className="text-xs font-medium text-orange-700">Issues Found:</span>
                                <p className="text-sm text-orange-800 whitespace-pre-wrap">{jobCard.final_qc_report.issues_found}</p>
                              </div>
                            )}
                            {jobCard.final_qc_report.failure_reason && (
                              <div>
                                <span className="text-xs font-medium text-red-700">Failure Reason:</span>
                                <p className="text-sm text-red-800 whitespace-pre-wrap">{jobCard.final_qc_report.failure_reason}</p>
                              </div>
                            )}
                            {jobCard.final_qc_report.supervisor_details && (
                              <p className="text-xs text-teal-600 mt-2">
                                By: {jobCard.final_qc_report.supervisor_details.name} on {new Date(jobCard.final_qc_report.created_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Job Card Notes */}
                      {jobCard.notes && jobCard.notes.length > 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                            <FileText size={16} />
                            Job Card Notes ({jobCard.notes.length})
                          </h4>
                          <div className="space-y-3">
                            {jobCard.notes.map((note, index) => (
                              <div key={note.id || index} className="bg-white rounded p-3 border border-purple-100">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {note.created_by_details?.name || 'Staff'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(note.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                                {note.note_type && (
                                  <span className="inline-block mt-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                    {note.note_type}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <div className="h-[600px]">
            <DynamicTasksPanel
              jobCardId={jobCard.id}
              tasks={jobCard.dynamic_tasks || []}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onApproveTask={handleApproveTask}
              currentUserRole={user?.role}
              applicators={jobCard.applicator_team_details || []}
            />
          </div>
        )}

        {/* PARTS TAB */}
        {activeTab === "parts" && hasPermission('can_add_parts') && (
          <Card title={
            <div className="flex items-center justify-between w-full gap-4">
              <span className="font-semibold text-gray-800">Parts Used</span>
              <button
                id="sync-service-parts-btn"
                onClick={async () => {
                  setSyncingParts(true);
                  setSyncResult(null);
                  try {
                    const res = await api.post(`/jobcards/${jobCard.id}/deduct_service_parts/`);
                    setSyncResult({ type: 'success', message: res.data.message, deducted: res.data.deducted });
                    fetchJobCard();
                  } catch (err) {
                    setSyncResult({ type: 'error', message: err.response?.data?.error || 'Failed to sync parts.' });
                  } finally {
                    setSyncingParts(false);
                  }
                }}
                disabled={syncingParts}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <RefreshCw size={13} className={syncingParts ? 'animate-spin' : ''} />
                {syncingParts ? 'Syncing…' : 'Sync Service Parts'}
              </button>
            </div>
          }>
            <div className="px-6 pb-2">
              {syncResult && (
                <div className={`mb-3 p-3 rounded-lg text-sm ${syncResult.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {syncResult.message}
                  {syncResult.deducted?.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
                      {syncResult.deducted.map((d, i) => (
                        <li key={i} className="text-xs">[{d.package}] {d.part} × {d.quantity}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 pb-6">
              <JobCardPartsPanel
                jobCardId={jobCard.id}
                parts={jobCard.parts_used || []}
                onUpdate={fetchJobCard}
              />
            </div>
          </Card>
        )}

        {/* NOTES TAB */}
        {activeTab === "notes" && (
          <div className="h-[600px]">
            <NotesPanel
              jobCardId={jobCard.id}
              notes={jobCard.notes || []}
              onAddNote={handleAddNote}
              currentUserRole={user?.role}
            />
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === "timeline" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActivityTimeline activities={jobCard.recent_activities || []} />
            </div>
            <div className="lg:col-span-1">
              {/* Could add filters or stats here later */}
              <Card title="Timeline Stats">
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Activities</span>
                    <span className="font-medium">
                      {jobCard.recent_activities?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Created</span>
                    <span className="font-medium">
                      {new Date(jobCard.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {jobCard.completed_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completed</span>
                      <span className="font-medium">
                        {new Date(jobCard.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* PHOTOS TAB */}
        {activeTab === "photos" && (
          <Card>
            <div className="p-6">
              {jobCard.photos && jobCard.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {jobCard.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-pointer"
                      onClick={() => openPhotoModal(photo)}
                    >
                      <img
                        src={photo.image}
                        alt={photo.photo_type}
                        className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                      />
                      <button
                        className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/75 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPhotoModal(photo);
                        }}
                      >
                        <ZoomIn size={16} />
                      </button>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <span className="text-white text-xs font-medium uppercase tracking-wider">
                          {getPhotoTypeLabel(photo.photo_type)}
                        </span>
                        <span className="text-white/80 text-[10px]">
                          {new Date(photo.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No photos uploaded yet.</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <Card title="Financial Documents">
              <div className="p-6">
                {jobCard.invoice ? (
                  <div className="flex items-center justify-between border p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                        <FileText className="text-green-600" size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Invoice #{jobCard.invoice.invoice_number}
                        </p>
                        <p className="text-sm text-gray-500">
                          Amount: ₹{jobCard.invoice.total_amount} • Status:{" "}
                          <span className="capitalize">
                            {jobCard.invoice.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate("/admin/accounting")}
                      variant="outline"
                      size="sm"
                    >
                      View details
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      No invoice generated yet.
                    </p>
                    {jobCard.status === "ready_for_billing" && (
                      <Button onClick={handleGenerateInvoice}>
                        Generate Invoice
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {(jobCard.qc_report || jobCard.final_qc_report) && (
              <Card title="Technician Reports">
                <div className="p-6 space-y-4">
                  {jobCard.qc_report && (
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileCheck className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Initial QC Report
                          </p>
                          <p className="text-sm text-gray-500">
                            Completed by {jobCard.floor_manager_details?.name}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          /* TODO: View Report Modal */
                        }}
                      >
                        View Report
                      </Button>
                    </div>
                  )}
                  {jobCard.final_qc_report && (
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="text-purple-600" size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Final QC Report
                          </p>
                          <p className="text-sm text-gray-500">
                            Completed by {jobCard.supervisor_details?.name}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          /* TODO: View Report Modal */
                        }}
                      >
                        View Report
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={closePhotoModal}
        >
          <div
            className="bg-white rounded-lg max-w-5xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {getPhotoTypeLabel(selectedPhoto.photo_type)} - Job Card #{jobCard.id}
              </h3>
              <button
                onClick={closePhotoModal}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <img
                src={selectedPhoto.image}
                alt={selectedPhoto.photo_type}
                className="max-w-full max-h-[60vh] mx-auto rounded-lg shadow-lg"
              />
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Job Details</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Customer:</span>{' '}
                      {jobCard.booking_details?.customer_name || 'N/A'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Vehicle:</span>{' '}
                      {jobCard.booking_details?.vehicle_details?.model || 'N/A'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Registration:</span>{' '}
                      {jobCard.booking_details?.vehicle_details?.registration_number || 'N/A'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Status:</span>{' '}
                      <Badge variant={getStatusBadge(jobCard.status)} className="ml-1">
                        {getStatusLabel(jobCard.status)}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Photo Details</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Type:</span>{' '}
                      {getPhotoTypeLabel(selectedPhoto.photo_type)}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Uploaded:</span>{' '}
                      {selectedPhoto.created_at
                        ? new Date(selectedPhoto.created_at).toLocaleString()
                        : 'N/A'}
                    </p>
                    {selectedPhoto.uploaded_by_details && (
                      <p className="text-gray-600">
                        <span className="font-medium text-gray-900">Uploaded by:</span>{' '}
                        {selectedPhoto.uploaded_by_details.name || 'N/A'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Supervisor Modal */}
      <Modal
        isOpen={showAssignSupervisorModal}
        onClose={() => {
          setShowAssignSupervisorModal(false);
          setSelectedSupervisor('');
        }}
        title={jobCard?.supervisor_details ? "Change Supervisor" : "Assign Supervisor"}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Select a supervisor to assign to Job Card #{jobCard?.id}
            </p>
            <Select
              label="Supervisor"
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              options={[
                { value: '', label: 'Select a supervisor' },
                ...supervisors.map(supervisor => ({
                  value: supervisor.id.toString(),
                  label: supervisor.name
                }))
              ]}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignSupervisorModal(false);
                setSelectedSupervisor('');
              }}
              disabled={assigningSupervisor}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignSupervisor}
              disabled={assigningSupervisor || !selectedSupervisor}
            >
              {assigningSupervisor ? 'Assigning...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Floor Manager Modal */}
      <Modal
        isOpen={showAssignFloorManagerModal}
        onClose={() => {
          setShowAssignFloorManagerModal(false);
          setSelectedFloorManager('');
          setModalError('');
        }}
        title={jobCard?.floor_manager_details ? "Change Floor Manager" : "Assign Floor Manager"}
      >
        <div className="space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {modalError}
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Select a floor manager for Job Card #{jobCard?.id}
            </p>
            <Select
              label="Floor Manager"
              value={selectedFloorManager}
              onChange={(e) => setSelectedFloorManager(e.target.value)}
              options={[
                { value: '', label: 'Select a floor manager' },
                ...floorManagers.map(fm => ({
                  value: fm.id.toString(),
                  label: fm.name
                }))
              ]}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignFloorManagerModal(false);
                setSelectedFloorManager('');
                setModalError('');
              }}
              disabled={assigningFloorManager}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignFloorManager}
              disabled={assigningFloorManager}
            >
              {assigningFloorManager ? 'Assigning...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Applicators Modal */}
      <Modal
        isOpen={showAssignApplicatorModal}
        onClose={() => {
          setShowAssignApplicatorModal(false);
          setSelectedApplicators([]);
        }}
        title={jobCard?.applicator_team_details?.length > 0 ? "Update Applicator Team" : "Assign Applicators"}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Select applicators for Job Card #{jobCard?.id}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
              {applicators.map(app => (
                <label
                  key={app.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedApplicators.includes(app.id)
                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                    : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedApplicators.includes(app.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedApplicators([...selectedApplicators, app.id]);
                      } else {
                        setSelectedApplicators(selectedApplicators.filter(id => id !== app.id));
                      }
                    }}
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${selectedApplicators.includes(app.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                    }`}>
                    {selectedApplicators.includes(app.id) && <CheckCircle size={10} className="text-white" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{app.name}</span>
                </label>
              ))}
            </div>
            {applicators.length === 0 && (
              <p className="text-center py-4 text-gray-500 italic">No applicators available.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignApplicatorModal(false);
                setSelectedApplicators([]);
              }}
              disabled={assigningApplicators}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignApplicators}
              disabled={assigningApplicators || selectedApplicators.length === 0}
            >
              {assigningApplicators ? 'Saving...' : 'Save Team'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Services Modal */}
      {showEditServicesModal && (
        <Modal
          isOpen={showEditServicesModal}
          onClose={() => { setShowEditServicesModal(false); setEditServicesResult(null); setEditServicesError(''); }}
          title="Edit Services"
        >
          <div className="space-y-4">
            {/* Mid-work warning */}
            {jobCard.status === 'work_in_progress' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Work is in progress</p>
                  <p className="text-xs mt-0.5">Parts for newly added services will be deducted. Parts for removed services will be handled per your selection below.</p>
                </div>
              </div>
            )}

            {/* Package selection */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Select Services</p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {availablePackages.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Loading packages…</p>
                ) : (
                  availablePackages.map(pkg => {
                    const vehicleType = jobCard.booking_details?.vehicle_type || 'sedan';
                    const priceKey = `${vehicleType}_price`;
                    const price = pkg[priceKey] || pkg.base_price || pkg.sedan_price || 0;
                    const isSelected = selectedPackageIds.includes(pkg.id);
                    return (
                      <label
                        key={pkg.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-violet-50 border-violet-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedPackageIds(prev =>
                                prev.includes(pkg.id) ? prev.filter(id => id !== pkg.id) : [...prev, pkg.id]
                              );
                            }}
                            className="w-4 h-4 text-violet-600 rounded"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{pkg.name}</p>
                            <p className="text-xs text-gray-500">{pkg.duration} min · {pkg.category}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-800 shrink-0">₹{parseFloat(price).toFixed(0)}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live price preview */}
            {selectedPackageIds.length > 0 && (() => {
              const vehicleType = jobCard.booking_details?.vehicle_type || 'sedan';
              const priceKey = `${vehicleType}_price`;
              const newTotal = availablePackages
                .filter(p => selectedPackageIds.includes(p.id))
                .reduce((sum, p) => sum + parseFloat(p[priceKey] || p.base_price || p.sedan_price || 0), 0);
              const oldTotal = parseFloat(jobCard.booking_details?.price_breakdown?.subtotal || 0);
              const diff = newTotal - oldTotal;
              return (
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg text-sm">
                  <span className="text-gray-600">New Subtotal</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">₹{newTotal.toFixed(2)}</span>
                    {diff !== 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {diff > 0 ? '+' : ''}₹{diff.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Restore parts toggle (mid-work only) */}
            {(jobCard.status === 'work_in_progress') && (
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreParts}
                  onChange={e => setRestoreParts(e.target.checked)}
                  className="w-4 h-4 text-violet-600 rounded"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">Restore stock for removed services</p>
                  <p className="text-xs text-gray-500">Check only if removed service parts were NOT consumed yet</p>
                </div>
              </label>
            )}

            {/* Error / Result */}
            {editServicesError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={15} />
                {editServicesError}
              </div>
            )}
            {editServicesResult && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <p className="font-semibold">{editServicesResult.message}</p>
                {editServicesResult.mid_work && !restoreParts && (
                  <p className="text-xs mt-1 text-amber-700">⚠ Parts for removed services were not restocked.</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowEditServicesModal(false)} disabled={editServicesLoading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={editServicesLoading || selectedPackageIds.length === 0}
                onClick={async () => {
                  setEditServicesLoading(true);
                  setEditServicesError('');
                  setEditServicesResult(null);
                  try {
                    isMutating.current = true;
                    const res = await api.post(`/jobcards/${jobCard.id}/update_services/`, {
                      package_ids: selectedPackageIds,
                      restore_parts: restoreParts,
                    });
                    setEditServicesResult(res.data);
                    setTimeout(() => {
                      setShowEditServicesModal(false);
                      fetchJobCard().finally(() => { isMutating.current = false; });
                    }, 1200);
                  } catch (err) {
                    isMutating.current = false;
                    setEditServicesError(err.response?.data?.error || 'Failed to update services.');
                  } finally {
                    setEditServicesLoading(false);
                  }
                }}
              >
                {editServicesLoading ? 'Updating…' : 'Update Services'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default JobDetails;