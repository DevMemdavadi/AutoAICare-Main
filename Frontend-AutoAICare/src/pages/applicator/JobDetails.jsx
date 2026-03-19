import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@/components/ui';
import api from '@/utils/api';
import { ArrowLeft, FileText, Car, Wrench, Clock, CheckCircle, XCircle, User, Calendar, AlertCircle, List, Camera } from 'lucide-react';
import ApplicatorTaskView from '@/components/ApplicatorTaskView';
import DynamicTasksPanel from '@/components/DynamicTasksPanel';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/jobcards/${id}/`);
      setJobCard(response.data);
    } catch (error) {
      console.error('Error fetching job details:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to load job details' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'created': 'Created',
      'qc_pending': 'QC Pending',
      'qc_completed': 'QC Completed',
      'qc_rejected': 'QC Rejected',
      'supervisor_approved': 'Supervisor Approved',
      'assigned_to_applicator': 'Assigned to Applicator',
      'work_in_progress': 'Work In Progress',
      'work_completed': 'Work Completed',
      'final_qc_pending': 'Final QC Pending',
      'final_qc_passed': 'Final QC Passed',
      'final_qc_failed': 'Final QC Failed',
      'customer_approval_pending': 'Customer Approval Pending',
      'customer_approved': 'Customer Approved',
      'customer_revision_requested': 'Customer Revision Requested',
      'ready_for_billing': 'Ready for Billing',
      'billed': 'Billed',
      'delivered': 'Delivered',
      'closed': 'Closed'
    };
    return statusMap[status] || status;
  };

  const getStatusBadge = (status) => {
    const badgeMap = {
      'created': 'secondary',
      'qc_pending': 'warning',
      'qc_completed': 'info',
      'qc_rejected': 'danger',
      'supervisor_approved': 'success',
      'assigned_to_applicator': 'primary',
      'work_in_progress': 'warning',
      'work_completed': 'success',
      'final_qc_pending': 'warning',
      'final_qc_passed': 'success',
      'final_qc_failed': 'danger',
      'customer_approval_pending': 'warning',
      'customer_approved': 'success',
      'customer_revision_requested': 'danger',
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

  const handleAddTask = async (taskData) => {
    try {
      await api.post(`/jobcards/${id}/add_dynamic_task/`, taskData);
      fetchJobDetails();
      setAlert({ show: true, type: 'success', message: 'Task added successfully' });
    } catch (error) {
      console.error('Error adding task:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to add task' });
    }
  };

  const handleUpdateTask = async (taskId, updateData) => {
    try {
      await api.patch(`/jobcards/${id}/dynamic_tasks/${taskId}/`, updateData);
      fetchJobDetails();
      setAlert({ show: true, type: 'success', message: 'Task updated successfully' });
    } catch (error) {
      console.error('Error updating task:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to update task' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!jobCard) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Job not found</p>
        <Button onClick={() => navigate('/applicator/dashboard')} className="mt-4">
          Back to Dashboard
        </Button>
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
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/applicator/dashboard")}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Job Card #{jobCard.id}
            </h1>
            <p className="text-gray-600 mt-1">
              {jobCard.service_package_details?.name || jobCard.booking_details?.package_details?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusBadge(jobCard.status)}>
            {getStatusLabel(jobCard.status)}
          </Badge>
          {jobCard.timer_status && (
            <Badge variant={jobCard.timer_status === 'overdue' ? 'danger' : jobCard.timer_status === 'warning' ? 'warning' : 'success'}>
              <div className="flex items-center">
                <Clock size={14} className="mr-1" />
                {jobCard.timer_status === 'overdue' ? 'Overdue' :
                  jobCard.timer_status === 'warning' ? 'Due Soon' : 'On Time'}
              </div>
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer & Vehicle Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Customer Details">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Customer Name</p>
                  <p className="font-medium text-gray-900">
                    {jobCard.booking_details?.customer_name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Contact</p>
                  <p className="font-medium text-gray-900">
                    {jobCard.booking_details?.customer_details?.user?.phone || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <p className="font-medium text-gray-900">
                    {jobCard.booking_details?.customer_details?.user?.email || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Vehicle Details">
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Car size={18} className="text-gray-400" />
                <span className="font-medium text-gray-900">
                  {jobCard.booking_details?.vehicle_details?.brand}{" "}
                  {jobCard.booking_details?.vehicle_details?.model}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Reg. Number</p>
                  <p className="font-medium">
                    {jobCard.booking_details?.vehicle_details?.registration_number || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">VIN</p>
                  <p className="font-medium">
                    {jobCard.booking_details?.vehicle_details?.vin || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Color</p>
                  <p className="font-medium">
                    {jobCard.booking_details?.vehicle_details?.color || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Assigned Tasks Section */}
          {(jobCard.status === 'assigned_to_applicator' || jobCard.status === 'work_in_progress') && (
            <Card title="My Assigned Tasks">
              <div className="p-6">
                <ApplicatorTaskView jobCard={jobCard} />
              </div>
            </Card>
          )}

          {/* Extra Services / Dynamic Tasks */}
          <div className="h-[500px]">
            <DynamicTasksPanel
              jobCardId={jobCard.id}
              tasks={jobCard.dynamic_tasks || []}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              currentUserRole="applicator"
              applicators={jobCard.applicator_team_details || []}
            />
          </div>
        </div>

        {/* Timeline & Actions */}
        <div className="space-y-6">
          <Card title="Timeline">
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle size={16} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Job Created</p>
                    <p className="text-xs text-gray-500">
                      {jobCard.created_at
                        ? new Date(jobCard.created_at).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {jobCard.qc_completed_at && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileText size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">QC Completed</p>
                      <p className="text-xs text-gray-500">
                        {new Date(jobCard.qc_completed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {jobCard.supervisor_approved_at && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <CheckCircle size={16} className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Supervisor Approved</p>
                      <p className="text-xs text-gray-500">
                        {new Date(jobCard.supervisor_approved_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {jobCard.assigned_to_applicator_at && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                      <User size={16} className="text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Assigned to Applicator Team</p>
                      <p className="text-xs text-gray-500">
                        {new Date(jobCard.assigned_to_applicator_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {jobCard.job_started_at && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <Wrench size={16} className="text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Work Started</p>
                      <p className="text-xs text-gray-500">
                        {new Date(jobCard.job_started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {jobCard.work_completed_at && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Work Completed</p>
                      <p className="text-xs text-gray-500">
                        {new Date(jobCard.work_completed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card title="Service Details">
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Service Package</p>
                <p className="font-medium text-gray-900">
                  {jobCard.service_package_details?.name || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Estimated Duration</p>
                <p className="font-medium text-gray-900">
                  {formatTimeEstimate(jobCard)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Service Description</p>
                <p className="text-gray-900">
                  {jobCard.service_package_details?.description || "N/A"}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Assigned Team">
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-600">Applicator Team Members</p>
              {jobCard.applicator_team_details && jobCard.applicator_team_details.length > 0 ? (
                <div className="space-y-2">
                  {jobCard.applicator_team_details.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User size={16} className="text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {member.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No team members assigned</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;