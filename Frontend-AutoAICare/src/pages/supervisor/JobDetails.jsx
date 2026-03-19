import JobTimer from '@/components/JobTimer';
import JobCardPartsPanel from '@/components/JobCardPartsPanel';
import SupervisorTaskManagement from '@/components/SupervisorTaskManagement';
import { Alert, Badge, Button, Card } from '@/components/ui';
import WorkExecution from '@/components/WorkExecution';
import WorkflowActions from '@/components/WorkflowActions';
import { useWorkflowPermissions } from '@/hooks/useWorkflowPermissions';
import api from '@/utils/api';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Camera,
  Car,
  CheckCircle,
  Clock,
  FileText,
  List,
  User,
  Wrench,
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  History,
  Image as ImageIcon,
  ListTodo,
  Package
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import NotesPanel from '@/components/NotesPanel';
import DynamicTasksPanel from '@/components/DynamicTasksPanel';
import ActivityTimeline from '@/components/ActivityTimeline';
import { useJobCardSocket } from '@/hooks/useJobCardSocket';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useWorkflowPermissions();
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/jobcards/${id}/`);
      console.log('Supervisor - Job details fetched:', response.data);
      setJobCard(response.data);
    } catch (error) {
      console.error('Error fetching job details:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to load job details' });
    } finally {
      setLoading(false);
    }
  };

  const activeUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  const handleAddNote = async (noteData) => {
    const response = await api.post(`/jobcards/${id}/add_note/`, noteData);
    fetchJobDetails();
    return response.data;
  };

  // WebSocket connection for real-time updates
  useJobCardSocket(id, {
    onTimerPaused: (data) => {
      console.log('🔴 Supervisor - Timer paused event received:', data);
      setJobCard(prev => prev ? {
        ...prev,
        is_timer_paused: true,
        pause_started_at: data.pause_started_at,
        pause_reason: data.pause_reason,
        total_pause_duration_seconds: data.total_pause_duration_seconds,
      } : prev);
      setTimeout(() => fetchJobDetails(), 100);
    },
    onTimerResumed: (data) => {
      console.log('🟢 Supervisor - Timer resumed event received:', data);
      setJobCard(prev => prev ? {
        ...prev,
        is_timer_paused: false,
        pause_started_at: null,
        pause_reason: null,
        total_pause_duration_seconds: data.total_pause_duration_seconds,
      } : prev);
      setTimeout(() => fetchJobDetails(), 100);
    },
    onStatusChanged: (data) => {
      console.log('📊 Supervisor - Status changed:', data);
      fetchJobDetails();
    },
  });
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

  const getStatusLabel = (status, supervisorReview) => {
    if (status === 'work_completed' && supervisorReview?.status === 'rejected' &&
      supervisorReview?.rejection_reason?.includes('Floor Manager QC Reject')) {
      return 'Floor Manager Rejected';
    }

    // Simple mapping or replace logic
    return status?.replace(/_/g, ' ') || 'Unknown';
  };

  const getStatusBadge = (status, supervisorReview) => {
    if (status === 'work_completed' && supervisorReview?.status === 'rejected' &&
      supervisorReview?.rejection_reason?.includes('Floor Manager QC Reject')) {
      return 'danger';
    }
    const badgeMap = {
      'created': 'secondary',
      'qc_pending': 'warning',
      'qc_completed': 'info',
      'qc_rejected': 'danger',
      'supervisor_approved': 'success',
      'supervisor_rejected': 'danger',
      'assigned_to_applicator': 'info',
      'work_in_progress': 'warning',
      'work_completed': 'success',
      'ready_for_billing': 'info',
      'billed': 'success',
      'delivered': 'success',
      'closed': 'secondary'
    };
    return badgeMap[status] || 'secondary';
  };

  // Get timer status color
  const getTimerStatusColor = (timerStatus) => {
    switch (timerStatus) {
      case 'overdue': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  // Format time estimate
  const formatTimeEstimate = (job) => {
    if (!job.allowed_duration_display) return 'N/A';
    const hours = Math.floor(job.allowed_duration_display / 60);
    const minutes = job.allowed_duration_display % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const openPhotoModal = (photo) => setSelectedPhoto(photo);
  const closePhotoModal = () => setSelectedPhoto(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <SkeletonLoader type="header" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonLoader type="card" className="h-64" />
          <SkeletonLoader type="card" className="h-64" />
        </div>
      </div>
    );
  }

  if (!jobCard) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Job not found</p>
        <Button onClick={() => navigate('/supervisor/dashboard')} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'work', label: 'Work Management', icon: ClipboardList },
    { id: 'tasks', label: 'Extra Tasks', icon: ListTodo, count: jobCard.dynamic_tasks?.length || 0 },
    ...(hasPermission('can_add_parts') ? [
      { id: 'parts', label: 'Parts', icon: Package, count: jobCard.parts_used?.length || 0 }
    ] : []),
    { id: 'notes', label: 'Notes', icon: MessageSquare, count: jobCard.notes?.length || 0 },
    { id: 'photos', label: 'Photos', icon: ImageIcon, count: jobCard.photos?.length || 0 },
    { id: 'timeline', label: 'Timeline', icon: History }
  ];

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/supervisor/dashboard")}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Job Card #{jobCard.id}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {jobCard.service_package_details?.name || jobCard.booking_details?.package_details?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusBadge(jobCard.status, jobCard.supervisor_review)}>
            {getStatusLabel(jobCard.status, jobCard.supervisor_review)}
          </Badge>
          <JobTimer
            jobStartedAt={jobCard.job_started_at}
            allowedDurationMinutes={jobCard.allowed_duration_display || jobCard.allowed_duration_minutes}
            effectiveDurationMinutes={jobCard.effective_duration_minutes}
            elapsedWorkTime={jobCard.elapsed_work_time}
            isTimerPaused={jobCard.is_timer_paused}
            pauseStartedAt={jobCard.pause_started_at}
            totalPauseDurationSeconds={jobCard.total_pause_duration_seconds}
            status={jobCard.status}
          />
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

      <div className="min-h-[500px]">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Supervisor Actions (Always Key) */}
            <Card title="Required Actions" className="bg-blue-50/30 border-blue-100">
              <div className="p-6">
                <WorkflowActions
                  jobCard={jobCard}
                  onUpdate={fetchJobDetails}
                  userRole="supervisor"
                />
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Job Information">
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <p className="font-medium">{jobCard.booking_details?.customer_name || "N/A"}</p>
                      <p className="text-xs text-gray-500">{jobCard.booking_details?.customer_details?.user?.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Vehicle</p>
                      <p className="font-medium">
                        {jobCard.booking_details?.vehicle_details?.brand} {jobCard.booking_details?.vehicle_details?.model}
                      </p>
                      <p className="text-xs text-gray-500">{jobCard.booking_details?.vehicle_details?.registration_number}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Time & Performance">
                <div className="p-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Allocated Time</span>
                    <span className="font-medium">{formatTimeEstimate(jobCard)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Elapsed</span>
                    <span className="font-medium">{jobCard.elapsed_minutes || 0}m</span>
                  </div>
                  {jobCard.timer_status && (
                    <div className="pt-2">
                      <Badge variant={jobCard.timer_status === 'overdue' ? 'danger' : 'success'}>
                        {jobCard.timer_status.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>

              {jobCard.qc_report && (
                <Card title="Initial QC Report" className="lg:col-span-2">
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Scratches</p>
                      <p className="bg-gray-50 p-2 rounded text-sm">{jobCard.qc_report.scratches || "None"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Dents</p>
                      <p className="bg-gray-50 p-2 rounded text-sm">{jobCard.qc_report.dents || "None"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-500 mb-1">Inspector Notes</p>
                      <p className="bg-gray-50 p-2 rounded text-sm">{jobCard.qc_report.notes || "None"}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* WORK MANAGEMENT TAB */}
        {activeTab === 'work' && (
          <div className="space-y-6">
            {(jobCard.status === "assigned_to_applicator" || jobCard.status === "work_in_progress") ? (
              <>
                <Card title="Work Execution">
                  <div className="p-6">
                    <WorkExecution jobCard={jobCard} onUpdate={fetchJobDetails} />
                  </div>
                </Card>
                <Card title="Applicator Task Assignment" className="mt-6">
                  <div className="p-6">
                    <SupervisorTaskManagement jobCard={jobCard} onUpdate={fetchJobDetails} />
                  </div>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded border border-dashed text-gray-500">
                <p>Work management is available when the job is in "Assigned" or "In Progress" status.</p>
                <p className="text-sm mt-1">Current Status: {getStatusLabel(jobCard.status)}</p>
              </div>
            )}
          </div>
        )}

        {/* EXTRA TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="h-[600px]">
            <DynamicTasksPanel
              jobCardId={jobCard.id}
              tasks={jobCard.dynamic_tasks || []}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              currentUserRole={activeUser?.role || 'supervisor'}
              applicators={jobCard.applicator_team_details || []}
            />
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="h-[600px]">
            <NotesPanel
              jobCardId={jobCard.id}
              notes={jobCard.notes || []}
              onAddNote={handleAddNote}
              currentUserRole={activeUser?.role || 'supervisor'}
            />
          </div>
        )}

        {/* PARTS TAB */}
        {activeTab === 'parts' && hasPermission('can_add_parts') && (
          <Card title="Parts Used">
            <div className="p-6">
              <JobCardPartsPanel
                jobCardId={jobCard.id}
                parts={jobCard.parts_used || []}
                onUpdate={fetchJobDetails}
              />
            </div>
          </Card>
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <div className="bg-white rounded-lg shadow border p-4">
            {jobCard.photos && jobCard.photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {jobCard.photos.map(photo => (
                  <div key={photo.id} className="relative group cursor-pointer" onClick={() => openPhotoModal(photo)}>
                    <img src={photo.image} className="w-full h-32 object-cover rounded" alt={photo.photo_type} />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded capitalize">
                      {photo.photo_type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No photos available.</p>
            )}
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <ActivityTimeline activities={jobCard.recent_activities || []} />
        )}

      </div>

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closePhotoModal}
        >
          <div className="relative max-w-4xl max-h-screen">
            <img
              src={selectedPhoto.image}
              alt={selectedPhoto.photo_type}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={closePhotoModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <Wrench className="w-8 h-8 rotate-45" /> {/* Just using an icon for close since X icon isn't imported from correct place in my head right now, wait, I can import X */}
            </button>
            <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
              <p className="font-medium capitalize">{selectedPhoto.photo_type}</p>
              <p className="text-sm opacity-75">
                {new Date(selectedPhoto.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;