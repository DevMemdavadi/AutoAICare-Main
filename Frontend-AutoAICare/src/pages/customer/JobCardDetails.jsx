import { Alert, Badge, Button, Card } from '@/components/ui';
import JobTimer from '@/components/JobTimer';
import api from '@/utils/api';
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Star,
  User,
  Wrench,
  LayoutDashboard,
  MessageSquare,
  ListTodo,
  Image as ImageIcon,
  History,
  FileCheck,
  X,
  ZoomIn
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NotesPanel from '@/components/NotesPanel';
import DynamicTasksPanel from '@/components/DynamicTasksPanel';
import ActivityTimeline from '@/components/ActivityTimeline';

const CustomerJobCardDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

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
      customer_approval_pending: 'Your Approval Pending',
      customer_approved: 'You Approved',
      customer_revision_requested: 'Revision Requested',
      ready_for_billing: 'Ready for Billing',
      billed: 'Billed',
      delivered: 'Delivered',
      closed: 'Closed'
    };
    return labels[status] || status;
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
      delivered: 'success',
      closed: 'default'
    };
    return variants[status] || 'default';
  };

  const fetchJobCard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/jobcards/${id}/`);
      setJobCard(response.data);
    } catch (err) {
      console.error('Error fetching job card:', err);
      setError(err.response?.data?.detail || 'Failed to load job card');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJobCard();

    // Set up auto-refresh every minute
    const refreshInterval = setInterval(() => {
      fetchJobCard();
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, [fetchJobCard]);

  const handleAddNote = async (noteData) => {
    const response = await api.post(`/jobcards/${id}/add_note/`, noteData);
    // Optimistically update or refetch
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
      </div>
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
            <Button variant="outline" onClick={() => navigate('/customer/track')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Jobs
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
          <Button variant="outline" onClick={() => navigate('/customer/track')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: 'Extra Services', icon: ListTodo, count: jobCard.dynamic_tasks?.length || 0 },
    { id: 'notes', label: 'Messages', icon: MessageSquare, count: jobCard.notes?.filter(n => n.visible_to_customer).length || 0 },
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'photos', label: 'Photos', icon: ImageIcon, count: jobCard.photos?.length || 0 },
    // { id: 'documents', label: 'Reports', icon: FileCheck }
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
          <Button variant="outline" onClick={() => navigate('/customer/track')} size="icon">
            <ArrowLeft size={18} />
          </Button>
          <div>
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
              {jobCard.booking_details?.vehicle_details?.customer_name || "Guest"}
            </p>
          </div>
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

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer & Vehicle - Left Column */}
            <div className="space-y-6 lg:col-span-1">
              <Card title="Your Vehicle">
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Car className="text-gray-500" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {jobCard.booking_details?.vehicle_details?.model || "Unknown Model"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {jobCard.booking_details?.vehicle_details?.registration_number || "No Reg #"}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Service Information">
                <div className="p-4 space-y-3">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Service Name</p>
                      <p className="font-bold text-gray-900">
                        {jobCard.service_package_details?.name || jobCard.booking_details?.package_details?.name || "Standard Service"}
                      </p>
                    </div>

                    {jobCard.booking_details?.addon_details?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Add-ons Service Information</p>
                        <div className="mt-2 space-y-2">
                          {jobCard.booking_details.addon_details.map((addon, idx) => (
                            <div key={idx} className="flex flex-col">
                              <span className="text-sm text-gray-900 font-bold">
                                {addon.name}
                              </span>
                              {addon.duration > 0 && (
                                <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                  <Clock size={10} />
                                  {addon.duration} min
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-2">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Pricing Details</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Service Price</span>
                        <span className="font-medium text-gray-900">₹{jobCard.booking_details?.price_breakdown?.package?.price || jobCard.service_package_details?.price || jobCard.booking_details?.package_details?.price || 0}</span>
                      </div>

                      {jobCard.booking_details?.price_breakdown?.addons?.map((addon, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-500">Add-ons Price</span>
                          <span className="font-medium text-gray-900">₹{parseFloat(addon.price || 0).toFixed(2)}</span>
                        </div>
                      ))}

                      <div className="flex justify-between text-sm font-bold text-gray-800 pt-2 mt-2 border-t border-dashed">
                        <span>Subtotal</span>
                        <span>₹{parseFloat(jobCard.booking_details?.price_breakdown?.subtotal || jobCard.booking_details?.subtotal || 0).toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">GST (18%)</span>
                        <span className="font-medium text-gray-900">₹{parseFloat(jobCard.booking_details?.price_breakdown?.gst_amount || jobCard.booking_details?.gst_amount || 0).toFixed(2)}</span>
                      </div>

                      {parseFloat(jobCard.booking_details?.discount_amount || 0) > 0 && (
                        <div className="flex justify-between text-sm text-green-600 font-medium">
                          <span>Discount</span>
                          <span>- ₹{parseFloat(jobCard.booking_details.discount_amount).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center bg-green-50 px-3 py-2 rounded-lg border border-green-100 mt-3">
                        <span className="text-sm font-bold text-green-800">Total Amount</span>
                        <span className="text-lg font-black text-green-700">₹{parseFloat(jobCard.booking_details?.price_breakdown?.total_price || jobCard.booking_details?.total_price || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <Badge variant={getStatusBadge(jobCard.status)} className="mt-1">
                      {getStatusLabel(jobCard.status)}
                    </Badge>
                  </div>
                </div>
              </Card>

              {jobCard.job_started_at && (
                <Card title="Live Timer">
                  <div className="p-4">
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
                </Card>
              )}

              {/* Google Review Section */}
              {(jobCard.status === 'delivered' || jobCard.status === 'closed') && jobCard.branch_details?.google_review_url && (
                <Card title="Rate Your Experience">
                  <div className="p-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 flex items-center gap-2">
                        <Star size={20} />
                        Rate Us on Google
                      </h4>
                      <p className="text-sm text-yellow-800 mt-1">
                        We would love to hear your feedback! Please rate your experience on Google.
                      </p>
                      <Button
                        onClick={() => window.open(jobCard.branch_details.google_review_url, '_blank')}
                        className="w-full mt-3 bg-yellow-500 hover:bg-yellow-600 text-yellow-900"
                      >
                        <ExternalLink size={18} className="mr-2" />
                        Leave a Review
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Service Details - Right Column (Span 2) */}
            <div className="space-y-6 lg:col-span-2">
              <Card title="Service Progress">
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="font-medium">{Math.floor(jobCard.allowed_duration_display / 60)}h {jobCard.allowed_duration_display % 60}m</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Started</p>
                      <p className="font-medium">{jobCard.job_started_at ? new Date(jobCard.job_started_at).toLocaleDateString() : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Est. Delivery</p>
                      <p className="font-medium">{jobCard.estimated_delivery_time ? new Date(jobCard.estimated_delivery_time).toLocaleDateString() : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <Badge variant={getStatusBadge(jobCard.status)} className="mt-1">
                        {getStatusLabel(jobCard.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quick Notes Preview */}
              {jobCard.notes && jobCard.notes.filter(n => n.visible_to_customer).length > 0 && (
                <Card title="Recent Messages">
                  <div className="p-4 space-y-3">
                    {jobCard.notes.filter(n => n.visible_to_customer).slice(0, 3).map(note => (
                      <div key={note.id} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900">{note.created_by_details?.name}</span>
                          <span className="text-xs text-gray-500">{new Date(note.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-600 mt-1 line-clamp-2">{note.content}</p>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setActiveTab('notes')}>
                      View All Messages
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="h-[600px]">
            <DynamicTasksPanel
              jobCardId={jobCard.id}
              tasks={jobCard.dynamic_tasks || []}
              onAddTask={() => { }} // Customers usually don't add tasks
              onUpdateTask={() => { }} // Customers don't update tasks
              onApproveTask={handleApproveTask}
              currentUserRole="customer" // This will hide edit buttons
            />
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="h-[600px]">
            <NotesPanel
              jobCardId={jobCard.id}
              notes={jobCard.notes?.filter(n => n.visible_to_customer) || []}
              onAddNote={handleAddNote}
              currentUserRole="customer"
            />
          </div>
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActivityTimeline activities={jobCard.recent_activities?.filter(
                // Filter out purely internal activities for customer view
                a => a.description.includes("customer") ||
                  a.description.includes("Customer") ||
                  a.description.includes("approved") ||
                  a.description.includes("completed") ||
                  a.description.includes("started") ||
                  !a.description.includes("internal")
              ) || []} />
            </div>
            <div className="lg:col-span-1">
              <Card title="Timeline Stats">
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Updates</span>
                    <span className="font-medium">{jobCard.recent_activities?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Created</span>
                    <span className="font-medium">{new Date(jobCard.created_at).toLocaleDateString()}</span>
                  </div>
                  {jobCard.completed_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completed</span>
                      <span className="font-medium">{new Date(jobCard.completed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
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
                        <span className="text-white text-xs font-medium uppercase tracking-wider">{photo.photo_type}</span>
                        <span className="text-white/80 text-[10px]">{new Date(photo.created_at).toLocaleDateString()}</span>
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
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {(jobCard.qc_report || jobCard.final_qc_report) && (
              <Card title="Service Reports">
                <div className="p-6 space-y-4">
                  {jobCard.qc_report && (
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileCheck className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Initial QC Report</p>
                          <p className="text-sm text-gray-500">Completed by {jobCard.floor_manager_details?.name}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => {/* TODO: View Report Modal */ }}>
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
                          <p className="font-semibold text-gray-900">Final QC Report</p>
                          <p className="text-sm text-gray-500">Completed by {jobCard.supervisor_details?.name}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => {/* TODO: View Report Modal */ }}>
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
                {selectedPhoto.photo_type?.replace(/_/g, ' ').toUpperCase()} - Job Card #{jobCard.id}
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
                      {selectedPhoto.photo_type?.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Uploaded:</span>{' '}
                      {selectedPhoto.created_at
                        ? new Date(selectedPhoto.created_at).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerJobCardDetails;
