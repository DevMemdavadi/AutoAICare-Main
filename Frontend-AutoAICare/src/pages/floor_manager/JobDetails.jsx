import JobTimer from '@/components/JobTimer';
import JobCardPartsPanel from '@/components/JobCardPartsPanel';
import { Alert, Badge, Button, Card, Modal, Select, SkeletonLoader, Textarea, Input } from '@/components/ui';
import WorkflowActions from '@/components/WorkflowActions';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkflowPermissions } from '@/hooks/useWorkflowPermissions';
import api from '@/utils/api';
import {
  ArrowLeft,
  Camera,
  Car,
  Check,
  Clock,
  Eye,
  FileText,
  List,
  RotateCcw,
  Save,
  User,
  UserPlus,
  Wrench,
  MessageSquare,
  ListTodo,
  LayoutDashboard,
  History,
  Image as ImageIcon,
  Package,
  Plus,
  Trash2,
  Edit,
  X,
  ZoomIn
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NotesPanel from '@/components/NotesPanel';
import DynamicTasksPanel from '@/components/DynamicTasksPanel';
import ActivityTimeline from '@/components/ActivityTimeline';
import TimerControls from '@/components/TimerControls';
import { useJobCardSocket } from '@/hooks/useJobCardSocket';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = useWorkflowPermissions();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showQCModal, setShowQCModal] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [qcData, setQcData] = useState({
    scratches: '',
    dents: '',
    notes: '',
    checklist: [],
    supervisor: ''
  });

  // Parts Used state
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [availableParts, setAvailableParts] = useState([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [partFormData, setPartFormData] = useState({
    part_id: '',
    quantity: 1,
  });
  const [editingPartId, setEditingPartId] = useState(null);
  const [editQuantity, setEditQuantity] = useState(1);

  // Supervisor Assignment state
  const [showAssignSupervisorModal, setShowAssignSupervisorModal] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [assigningSupervisor, setAssigningSupervisor] = useState(false);

  // Applicator Assignment state
  const [showAssignApplicatorModal, setShowAssignApplicatorModal] = useState(false);
  const [selectedApplicators, setSelectedApplicators] = useState([]);
  const [applicators, setApplicators] = useState([]);
  const [applicatorsLoading, setApplicatorsLoading] = useState(false);
  const [assigningApplicators, setAssigningApplicators] = useState(false);


  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/jobcards/${id}/`);
      console.log('Floor Manager - Job details fetched:', res.data);
      setJob(res.data);

      // Initialize QC data if job has QC report
      if (res.data.qc_report) {
        setQcData({
          scratches: res.data.qc_report.scratches || '',
          dents: res.data.qc_report.dents || '',
          notes: res.data.qc_report.notes || '',
          checklist: res.data.qc_report.checklist_points || [],
          supervisor: res.data.supervisor?.id || ''
        });
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
      showAlert('error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  // WebSocket connection for real-time updates
  useJobCardSocket(id, {
    onTimerPaused: (data) => {
      console.log('🔴 Floor Manager - Timer paused event received:', data);
      // Update job state immediately
      setJob(prev => prev ? {
        ...prev,
        is_timer_paused: true,
        pause_started_at: data.pause_started_at,
        pause_reason: data.pause_reason,
        total_pause_duration_seconds: data.total_pause_duration_seconds,
      } : prev);
      // Fetch full data for consistency
      setTimeout(() => fetchJobDetails(), 100);
    },
    onTimerResumed: (data) => {
      console.log('🟢 Floor Manager - Timer resumed event received:', data);
      // Update job state immediately
      setJob(prev => prev ? {
        ...prev,
        is_timer_paused: false,
        pause_started_at: null,
        pause_reason: null,
        total_pause_duration_seconds: data.total_pause_duration_seconds,
      } : prev);
      // Fetch full data for consistency
      setTimeout(() => fetchJobDetails(), 100);
    },
    onStatusChanged: (data) => {
      console.log('📊 Floor Manager - Status changed:', data);
      fetchJobDetails();
    },
  });

  // Fetch supervisors for the dropdown
  const fetchSupervisors = async () => {
    try {
      setSupervisorsLoading(true);
      const res = await api.get('/auth/users/', {
        params: { role: 'supervisor' }
      });
      setSupervisors(res.data.results || []);
    } catch (err) {
      console.error('Error fetching supervisors:', err);
      setSupervisors([]);
      showAlert('error', 'Failed to load supervisors');
    } finally {
      setSupervisorsLoading(false);
    }
  };

  const getStatusLabel = (status, supervisorReview) => {
    // If this is a work_completed status and there's a supervisor review that was rejected
    // with a Floor Manager rejection reason, show a more descriptive status
    if (status === 'work_completed' && supervisorReview?.status === 'rejected' &&
      supervisorReview?.rejection_reason?.includes('Floor Manager QC Reject')) {
      return 'Floor Manager Rejected';
    }

    // For other statuses, just replace underscores with spaces
    return status.replace(/_/g, ' ');
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

  const getStatusBadgeVariant = (status, supervisorReview) => {
    // If this is a work_completed status and there's a supervisor review that was rejected
    // with a Floor Manager rejection reason, show danger (red) color
    if (status === 'work_completed' && supervisorReview?.status === 'rejected' &&
      supervisorReview?.rejection_reason?.includes('Floor Manager QC Reject')) {
      return 'danger';
    }

    const map = {
      qc_pending: 'warning',
      qc_rejected: 'destructive',
      qc_completed: 'info',
      supervisor_approved: 'success',
      work_in_progress: 'warning',
      work_completed: 'success',
      final_qc_pending: 'warning',
      final_qc_passed: 'success',
      final_qc_failed: 'destructive',
      customer_approved: 'success',
      ready_for_billing: 'info',
      billed: 'default',
      ready_for_delivery: 'success',
      delivered: 'default',
      closed: 'default'
    };
    return map[status] || 'default';
  };

  const handleStartQC = async () => {
    setShowQCModal(true);
    // Fetch supervisors when opening the QC modal
    await fetchSupervisors();
  };

  const handleSaveQC = async () => {
    try {
      const requestData = {
        scratches: qcData.scratches,
        dents: qcData.dents,
        notes: qcData.notes,
        checklist_points: qcData.checklist
      };

      // Add supervisor ID if selected
      if (qcData.supervisor) {
        requestData.supervisor_id = qcData.supervisor;
      }

      await api.post(`/jobcards/${id}/complete_qc/`, requestData);

      showAlert('success', 'QC completed successfully');
      setShowQCModal(false);
      fetchJobDetails();
    } catch (err) {
      console.error('Error completing QC:', err);
      showAlert('error', 'Failed to complete QC');
    }
  };

  const handleSendToSupervisor = async () => {
    try {
      const requestData = {
        scratches: qcData.scratches,
        dents: qcData.dents,
        notes: qcData.notes,
        checklist_points: qcData.checklist
      };

      // Add supervisor ID if selected
      if (qcData.supervisor) {
        requestData.supervisor_id = qcData.supervisor;
      }

      await api.post(`/jobcards/${id}/complete_qc/`, requestData);

      showAlert('success', 'Job sent to supervisor for review');
      fetchJobDetails();
    } catch (err) {
      console.error('Error sending to supervisor:', err);
      showAlert('error', 'Failed to send job to supervisor');
    }
  };

  const openPhotoModal = (photo) => {
    setSelectedPhoto(photo);
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
  };

  const handleAddNote = async (noteData) => {
    const response = await api.post(`/jobcards/${id}/add_note/`, noteData);
    fetchJobDetails();
    return response.data;
  };

  const handleAddTask = async (taskData) => {
    const response = await api.post(`/jobcards/${id}/add_dynamic_task/`, taskData);
    fetchJobDetails();
    return response.data;
  };

  const handleUpdateTask = async (taskId, updateData) => {
    const response = await api.patch(`/jobcards/${id}/dynamic_tasks/${taskId}/`, updateData);
    fetchJobDetails();
    return response.data;
  };

  // Parts Used handlers
  const fetchAvailableParts = async () => {
    try {
      setLoadingParts(true);
      const response = await api.get('/jobcards/parts/', {
        params: { in_stock: true }
      });
      setAvailableParts(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error fetching parts:', err);
      showAlert('error', 'Failed to load available parts');
    } finally {
      setLoadingParts(false);
    }
  };

  const handleAddPart = async () => {
    try {
      if (!partFormData.part_id) {
        showAlert('error', 'Please select a part');
        return;
      }

      const selectedPart = availableParts.find(p => p.id === parseInt(partFormData.part_id));
      if (!selectedPart) {
        showAlert('error', 'Invalid part selected');
        return;
      }

      // Check stock availability
      if (selectedPart.stock < partFormData.quantity) {
        showAlert('error', `Insufficient stock. Only ${selectedPart.stock} ${selectedPart.unit} available`);
        return;
      }

      await api.post(`/jobcards/${id}/add_part/`, {
        part: partFormData.part_id,
        quantity: partFormData.quantity,
      });

      showAlert('success', 'Part added successfully');
      setShowAddPartModal(false);
      setPartFormData({ part_id: '', quantity: 1 });
      fetchJobDetails();
    } catch (err) {
      console.error('Error adding part:', err);
      showAlert('error', err.response?.data?.error || 'Failed to add part');
    }
  };

  const handleRemovePart = async (partUsedId) => {
    if (!confirm('Are you sure you want to remove this part? Stock will be restored.')) return;

    try {
      await api.delete(`/jobcards/${id}/parts_used/${partUsedId}/`);
      showAlert('success', 'Part removed successfully. Stock has been restored.');
      fetchJobDetails();
    } catch (err) {
      console.error('Error removing part:', err);
      showAlert('error', err.response?.data?.error || 'Failed to remove part');
    }
  };

  const handleUpdatePart = async (partUsedId) => {
    try {
      if (editQuantity < 1) {
        showAlert('error', 'Quantity must be at least 1');
        return;
      }

      await api.patch(`/jobcards/${id}/parts_used/${partUsedId}/`, {
        quantity: editQuantity
      });

      showAlert('success', 'Part quantity updated successfully');
      setEditingPartId(null);
      setEditQuantity(1);
      fetchJobDetails();
    } catch (err) {
      console.error('Error updating part:', err);
      showAlert('error', err.response?.data?.error || 'Failed to update part');
    }
  };

  const handleStartEdit = (partUsed) => {
    setEditingPartId(partUsed.id);
    setEditQuantity(partUsed.quantity);
  };

  const handleCancelEdit = () => {
    setEditingPartId(null);
    setEditQuantity(1);
  };

  const handleOpenAddPartModal = () => {
    setShowAddPartModal(true);
    fetchAvailableParts();
  };

  // Supervisor Assignment handlers
  const handleAssignSupervisor = async () => {
    if (!selectedSupervisor) {
      showAlert('error', 'Please select a supervisor');
      return;
    }

    try {
      setAssigningSupervisor(true);
      await api.post(`/jobcards/${id}/assign_supervisor/`, {
        supervisor_id: parseInt(selectedSupervisor)
      });

      showAlert('success', 'Supervisor assigned successfully');
      setShowAssignSupervisorModal(false);
      setSelectedSupervisor('');
      fetchJobDetails(); // Refresh job card data
    } catch (error) {
      console.error('Error assigning supervisor:', error);
      showAlert('error', error.response?.data?.error || 'Failed to assign supervisor');
    } finally {
      setAssigningSupervisor(false);
    }
  };

  const openAssignSupervisorModal = () => {
    fetchSupervisors();
    setShowAssignSupervisorModal(true);
  };

  // Applicator Assignment handlers
  const fetchApplicators = async () => {
    try {
      setApplicatorsLoading(true);
      const params = { role: 'applicator' };
      if (job?.booking) {
        params.booking_id = job.booking;
      } else if (job?.booking_details?.id) {
        params.booking_id = job.booking_details.id;
      }

      const res = await api.get('/auth/users/', { params });
      setApplicators(res.data.results || []);
    } catch (err) {
      console.error('Error fetching applicators:', err);
      showAlert('error', 'Failed to load applicators');
    } finally {
      setApplicatorsLoading(false);
    }
  };

  const handleAssignApplicators = async () => {
    if (selectedApplicators.length === 0) {
      showAlert('error', 'Please select at least one applicator');
      return;
    }

    try {
      setAssigningApplicators(true);
      await api.post(`/jobcards/${id}/assign_applicators_admin/`, {
        applicator_ids: selectedApplicators
      });

      showAlert('success', 'Applicator team assigned successfully');
      setShowAssignApplicatorModal(false);
      setSelectedApplicators([]);
      fetchJobDetails(); // Refresh job card data
    } catch (error) {
      console.error('Error assigning applicators:', error);
      showAlert('error', error.response?.data?.error || 'Failed to assign applicators');
    } finally {
      setAssigningApplicators(false);
    }
  };

  const openAssignApplicatorModal = () => {
    fetchApplicators();
    // Pre-select existing team
    setSelectedApplicators([]); // Clear first
    if (job?.applicator_team_details) {
      setSelectedApplicators(job.applicator_team_details.map(a => a.id));
    }
    setShowAssignApplicatorModal(true);
  };

  // Timer control handlers
  const handleTimerUpdate = (response) => {
    // Show success message
    showAlert('success', response.message || 'Timer updated successfully');

    // Refresh job card data
    fetchJobDetails();
  };




  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/floor-manager/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mt-2 animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        {/* Overview cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <SkeletonLoader key={i} type="card" className="h-32" />
          ))}
        </div>

        <SkeletonLoader type="card" className="h-48" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center text-gray-500">
        Job not found
      </div>
    );
  }

  // Get photos by category
  const beforePhotos = job.photos?.filter(photo => photo.photo_type === 'initial' || photo.photo_type === 'before') || [];
  const inProgressPhotos = job.photos?.filter(photo => photo.photo_type === 'in_progress') || [];
  const afterPhotos = job.photos?.filter(photo => photo.photo_type === 'after') || [];

  const baseTabs = [
    { id: 'details', label: 'Details', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks & Services', icon: ListTodo, count: job.dynamic_tasks?.length || 0 },
    { id: 'notes', label: 'Notes', icon: MessageSquare, count: job.notes?.length || 0 },
    { id: 'photos', label: 'Photos', icon: ImageIcon, count: job.photos?.length || 0 },
    // { id: 'timeline', label: 'Timeline', icon: History }
  ];

  // Add Parts Used tab if user has permission
  const partsTab = hasPermission('can_add_parts') ? [
    { id: 'parts', label: 'Parts Used', icon: Package, count: job.parts_used?.length || 0 }
  ] : [];

  const tabs = [...baseTabs, ...partsTab];

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
          <Button
            variant="outline"
            onClick={() => navigate("/floor-manager/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Job #{job.id}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {job.booking_details?.customer_name || "Guest"} - {job.booking_details?.vehicle_details?.registration_number || "N/A"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusBadgeVariant(job.status, job.supervisor_review)}>
            {getStatusLabel(job.status, job.supervisor_review)}
          </Badge>
          {job.job_started_at && (
            <JobTimer
              jobStartedAt={job.job_started_at}
              allowedDurationMinutes={job.allowed_duration_display || job.allowed_duration_minutes}
              effectiveDurationMinutes={job.effective_duration_minutes}
              elapsedWorkTime={job.elapsed_work_time}
              isTimerPaused={job.is_timer_paused}
              pauseStartedAt={job.pause_started_at}
              totalPauseDurationSeconds={job.total_pause_duration_seconds}
              status={job.status}
              reflectPause={false}
            />
          )}
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
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                <Icon size={16} />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`
                    ml-1 px-2 py-0.5 rounded-full text-xs
                    ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}
                  `}>
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

        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="space-y-6">

            {/* Workflow Actions Section */}
            <Card className="p-4 bg-blue-50/30 border-blue-100">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Actions
              </h3>
              <WorkflowActions
                jobCard={job}
                onUpdate={fetchJobDetails}
                userRole="floor_manager"
              />
            </Card>

            <div className={`grid grid-cols-1 gap-6 ${['qc_completed', 'supervisor_review', 'supervisor_approved', 'supervisor_rejected', 'assigned_to_applicator', 'work_in_progress', 'work_completed', 'final_qc_pending', 'final_qc_passed', 'final_qc_failed', 'customer_approval_pending', 'customer_approved', 'customer_revision_requested', 'ready_for_billing', 'billed', 'ready_for_delivery', 'delivered', 'closed'].includes(job.status) ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
              <Card className="p-4" title="Vehicle Information">
                <div className="space-y-2 text-sm mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Registration:</span>
                    <span className="font-medium">{job.booking_details?.vehicle_details?.registration_number || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Brand/Model:</span>
                    <span className="font-medium">
                      {job.booking_details?.vehicle_details?.brand || ""} {job.booking_details?.vehicle_details?.model || ""}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4" title="Customer Information">
                <div className="space-y-2 text-sm mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{job.booking_details?.customer_name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{job.booking_details?.customer_details?.user?.phone || "N/A"}</span>
                  </div>
                </div>
              </Card>


              {/* Assigned Team Card - Only show after QC completion as 4th box */}
              {['qc_completed', 'supervisor_review', 'supervisor_approved', 'supervisor_rejected', 'assigned_to_applicator', 'work_in_progress', 'work_completed', 'final_qc_pending',
                'final_qc_passed', 'final_qc_failed', 'customer_approval_pending', 'customer_approved', 'customer_revision_requested', 'ready_for_billing', 'billed', 'ready_for_delivery', 'delivered',
                'closed'].includes(job.status) && (
                  <Card className="p-2" title="Assigned Team">
                    <div className="space-y-1 mt-1">
                      {/* Supervisor */}
                      <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                        <div className="flex-1">
                          <span className="text-xs text-gray-500 leading-tight">
                            Supervisor
                          </span>
                          <div className="text-sm font-medium leading-tight">
                            {job.supervisor_details?.name || "-"}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={openAssignSupervisorModal}
                          className="h-5 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <UserPlus size={12} className="mr-1" />
                          {job.supervisor_details ? 'Update' : 'Assign'}
                        </Button>
                      </div>

                      {/* Applicators */}
                      <div className="bg-gray-50 p-2 rounded-md mt-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500 leading-tight">
                            Applicators
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={openAssignApplicatorModal}
                            className="h-5 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <UserPlus size={12} className="mr-1" />
                            {job.applicator_team_details && job.applicator_team_details.length > 0 ? 'Update' : 'Assign'}
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {job.applicator_team_details && job.applicator_team_details.length > 0 ? (
                            job.applicator_team_details.map((app) => (
                              <span
                                key={app.id}
                                className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded leading-tight"
                              >
                                {app.name}
                              </span>
                            ))
                          ) : (
                            <div className="text-sm font-medium leading-tight text-gray-400">
                              -
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
            </div>

            {/* {!job.invoice && job.booking_details?.price_breakdown && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Package size={18} className="text-blue-600" />
                    Service Summary
                  </h3>
                  <Badge variant="info" size="sm">Estimate</Badge>
                </div>
                <div className="space-y-3">
=                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500">Package</p>
                        <p className="font-medium text-gray-900">
                          {job.booking_details.price_breakdown.package?.name || "N/A"}
                        </p>
                      </div>
                      <span className="f  ont-bold text-gray-900">
                        ₹{job.booking_details.price_breakdown.package?.price || "0.00"}
                      </span>
                    </div>
                  </div>

                  {job.booking_details.price_breakdown.addons?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Add-ons</p>
                      {job.booking_details.price_breakdown.addons.map((addon, index) => (
                        <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                          <span className="text-gray-700">{addon.name}</span>
                          <span className="font-medium">₹{addon.price}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Estimated Total</span>
                      <span className="text-lg font-bold text-gray-900">
                        ₹{job.booking_details.price_breakdown.total_price}
                      </span>
                    </div>
                    {parseFloat(job.booking_details.price_breakdown.discount_amount || 0) > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Includes ₹{job.booking_details.price_breakdown.discount_amount} discount
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )} */}

            {/* Timer Controls & Buffer Management */}
            {job.job_started_at && (
              <Card
                title={
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    <span>Timer Controls & Buffer Management</span>
                  </div>
                }
              >
                <div className="p-4 space-y-4">
                  {/* Enhanced Timer Display */}
                  <JobTimer
                    jobStartedAt={job.job_started_at}
                    allowedDurationMinutes={job.allowed_duration_minutes}
                    effectiveDurationMinutes={job.effective_duration_minutes}
                    elapsedWorkTime={job.elapsed_work_time}
                    isTimerPaused={job.is_timer_paused}
                    pauseStartedAt={job.pause_started_at}
                    totalPauseDurationSeconds={job.total_pause_duration_seconds}
                    status={job.status}
                    reflectPause={false}
                  />

                  {/* Timer Controls */}
                  <TimerControls
                    jobCard={job}
                    onUpdate={handleTimerUpdate}
                  />
                </div>
              </Card>
            )}
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <List size={18} className="text-orange-600" />
                  Quality Check Report
                </h3>
                {job.status === "qc_pending" &&
                  (qcData.scratches || qcData.dents || qcData.notes) && (
                    <Button
                      onClick={handleSendToSupervisor}
                      variant="primary"
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <Check size={16} />
                      Confirm & Send to Supervisor
                    </Button>
                  )}
              </div>

              {job.qc_report ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 text-xs uppercase text-gray-500">Scratches</h4>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-100">
                      {job.qc_report.scratches || "No scratches reported"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 text-xs uppercase text-gray-500">Dents</h4>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-100">
                      {job.qc_report.dents || "No dents reported"}
                    </p>
                  </div>

                  {/* Additional Tasks - Only show if present */}
                  {job.qc_report.additional_tasks && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 text-xs uppercase text-gray-500">Additional Tasks</h4>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-100">
                        {job.qc_report.additional_tasks}
                      </p>
                    </div>
                  )}

                  {/* Additional Tasks Price - Only show if present */}
                  {job.qc_report.additional_tasks_price != null && job.qc_report.additional_tasks_price > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 text-xs uppercase text-gray-500">Additional Tasks Price</h4>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-100">
                        ₹{job.qc_report.additional_tasks_price}
                      </p>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <h4 className="font-medium text-gray-900 mb-2 text-xs uppercase text-gray-500">QC Notes</h4>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-100">
                      {job.qc_report.notes || "No notes provided"}
                    </p>
                  </div>
                  {job.status === "qc_rejected" && job.supervisor_review?.rejection_reason && (
                    <div className="md:col-span-2">
                      <h4 className="font-medium text-red-600 mb-2 text-xs uppercase">Rejection Reason</h4>
                      <p className="text-sm text-red-700 bg-red-50 p-3 rounded border border-red-100">
                        {job.supervisor_review.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded border border-dashed border-gray-200">
                  <p>QC report has not been filled yet.</p>
                  {job.status === 'qc_pending' && (
                    <p className="text-sm mt-1">Use "Update QC" in Actions above to fill it.</p>
                  )}
                </div>
              )}
            </Card>



          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="h-[600px]">
            <DynamicTasksPanel
              jobCardId={job.id}
              tasks={job.dynamic_tasks || []}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              currentUserRole={user?.role}
              applicators={job.applicator_team_details || []}
            />
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="h-[600px]">
            <NotesPanel
              jobCardId={job.id}
              notes={job.notes || []}
              onAddNote={handleAddNote}
              currentUserRole={user?.role}
            />
          </div>
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <Card>
            <div className="p-6">
              {job.photos && job.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {job.photos.map((photo) => (
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

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <ActivityTimeline activities={job.recent_activities || []} />
        )}

        {/* PARTS USED TAB */}
        {activeTab === 'parts' && hasPermission('can_add_parts') && (
          <Card title="Parts Used">
            <div className="p-6">
              <JobCardPartsPanel
                jobCardId={id}
                parts={job.parts_used || []}
                onUpdate={fetchJobDetails}
              />
            </div>
          </Card>
        )}

      </div>

      {/* QC Modal - Kept separate as it's a modal */}
      {showQCModal && (
        <Modal
          isOpen={showQCModal}
          onClose={() => setShowQCModal(false)}
          title="Complete Quality Check"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scratches Detected
              </label>
              <Textarea
                value={qcData.scratches}
                onChange={(e) =>
                  setQcData({ ...qcData, scratches: e.target.value })
                }
                placeholder="Describe any scratches found..."
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dents Detected
              </label>
              <Textarea
                value={qcData.dents}
                onChange={(e) =>
                  setQcData({ ...qcData, dents: e.target.value })
                }
                placeholder="Describe any dents found..."
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <Textarea
                value={qcData.notes}
                onChange={(e) =>
                  setQcData({ ...qcData, notes: e.target.value })
                }
                placeholder="Any other observations..."
                rows={3}
              />
            </div>

            {/* Supervisor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign Supervisor
              </label>
              <Select
                value={qcData.supervisor}
                onChange={(e) =>
                  setQcData({ ...qcData, supervisor: e.target.value })
                }
                disabled={supervisorsLoading}
              >
                <option value="">Select Supervisor</option>
                {supervisors.map((supervisor) => (
                  <option key={supervisor.id} value={supervisor.id}>
                    {supervisor.name}
                  </option>
                ))}
              </Select>
              {supervisorsLoading && (
                <p className="text-xs text-gray-500 mt-1">Loading supervisors...</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowQCModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveQC}
                disabled={!qcData.supervisor}
              >
                Save & Complete QC
              </Button>
            </div>
          </div>
        </Modal>
      )}

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
                {getPhotoTypeLabel(selectedPhoto.photo_type)} - Job Card #{job.id}
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
                      {job.booking_details?.customer_name || 'N/A'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Vehicle:</span>{' '}
                      {job.booking_details?.vehicle_details?.model || 'N/A'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Registration:</span>{' '}
                      {job.booking_details?.vehicle_details?.registration_number || 'N/A'}
                    </p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium text-gray-900">Status:</span>{' '}
                      <Badge variant={getStatusBadgeVariant(job.status, job.supervisor_review)}>
                        {getStatusLabel(job.status, job.supervisor_review)}
                      </Badge>
                    </div>
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

      {/* Add Part Modal */}
      {showAddPartModal && hasPermission('can_add_parts') && (
        <Modal
          isOpen={showAddPartModal}
          onClose={() => {
            setShowAddPartModal(false);
            setPartFormData({ part_id: '', quantity: 1 });
          }}
          title="Add Part to Job"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Part *
              </label>
              <Select
                value={partFormData.part_id}
                onChange={(e) => setPartFormData({ ...partFormData, part_id: e.target.value })}
                disabled={loadingParts}
              >
                <option value="">Select a part</option>
                {availableParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.name} ({part.sku}) - Stock: {part.stock} {part.unit} - ₹{parseFloat(part.selling_price).toFixed(2)}
                  </option>
                ))}
              </Select>
              {loadingParts && (
                <p className="text-xs text-gray-500 mt-1">Loading parts...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <Input
                type="number"
                min="1"
                value={partFormData.quantity}
                onChange={(e) => setPartFormData({ ...partFormData, quantity: parseInt(e.target.value) || 1 })}
                placeholder="Enter quantity"
              />
            </div>

            {partFormData.part_id && (
              <div className="bg-blue-50 p-3 rounded">
                {(() => {
                  const selected = availableParts.find(p => p.id === parseInt(partFormData.part_id));
                  if (!selected) return null;
                  const total = parseFloat(selected.selling_price) * partFormData.quantity;
                  return (
                    <div className="text-sm">
                      <p className="text-gray-700 mb-1">
                        <span className="font-medium">Part:</span> {selected.name}
                      </p>
                      <p className="text-gray-700 mb-1">
                        <span className="font-medium">Price per unit:</span> ₹{parseFloat(selected.selling_price).toFixed(2)}
                      </p>
                      <p className="text-gray-700 mb-1">
                        <span className="font-medium">Available stock:</span> {selected.stock} {selected.unit}
                      </p>
                      <p className="text-blue-700 font-bold mt-2">
                        Total: ₹{total.toFixed(2)}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddPartModal(false);
                  setPartFormData({ part_id: '', quantity: 1 });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddPart}
                disabled={!partFormData.part_id || partFormData.quantity < 1}
              >
                Add Part
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Supervisor Modal */}
      {showAssignSupervisorModal && (
        <Modal
          isOpen={showAssignSupervisorModal}
          onClose={() => {
            setShowAssignSupervisorModal(false);
            setSelectedSupervisor('');
          }}
          title="Assign Supervisor"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Supervisor *
              </label>
              {supervisorsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <Select
                  value={selectedSupervisor}
                  onChange={(e) => setSelectedSupervisor(e.target.value)}
                  options={[
                    { value: '', label: 'Select a supervisor' },
                    ...supervisors.map((sup) => ({
                      value: sup.id,
                      label: `${sup.name}${sup.email ? ` (${sup.email})` : ''}`,
                    })),
                  ]}
                  required
                />
              )}
              {supervisors.length === 0 && !supervisorsLoading && (
                <p className="text-sm text-gray-500 italic mt-2">
                  No supervisors available for this branch.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignSupervisorModal(false);
                  setSelectedSupervisor('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAssignSupervisor}
                disabled={!selectedSupervisor || assigningSupervisor}
              >
                {assigningSupervisor ? 'Assigning...' : 'Assign Supervisor'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Applicator Modal */}
      {showAssignApplicatorModal && (
        <Modal
          isOpen={showAssignApplicatorModal}
          onClose={() => {
            setShowAssignApplicatorModal(false);
            setSelectedApplicators([]);
          }}
          title="Assign Applicator Team"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Applicators *
              </label>
              {applicatorsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded p-2">
                  {applicators.map((applicator) => (
                    <label
                      key={applicator.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedApplicators.includes(applicator.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedApplicators([...selectedApplicators, applicator.id]);
                          } else {
                            setSelectedApplicators(selectedApplicators.filter(id => id !== applicator.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">
                        {applicator.name}
                        {applicator.email && (
                          <span className="text-gray-500 ml-1">({applicator.email})</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {applicators.length === 0 && !applicatorsLoading && (
                <p className="text-sm text-gray-500 italic mt-2">
                  No applicators available for this branch.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignApplicatorModal(false);
                  setSelectedApplicators([]);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAssignApplicators}
                disabled={selectedApplicators.length === 0 || assigningApplicators}
              >
                {assigningApplicators ? 'Assigning...' : 'Assign Team'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default JobDetails;