import JobTimer from '@/components/JobTimer';
import { Alert, Badge, Button, Card, Input, Select, SkeletonLoader, Table } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  Eye,
  Filter,
  ListChecks,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Users,
  Wrench
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SupervisorRewardSummary from '@/components/supervisor/SupervisorRewardSummary';

const TABS = [
  { key: 'pending_review', label: 'Pending QC Review' },
  { key: 'approved', label: 'Ready for Assignment' },
  { key: 'assigned', label: 'Work In Progress' },
  { key: 'rejected', label: 'QC Failed' },
  { key: 'all_my', label: 'All Jobs' },
];

// Operational statuses that supervisor actively manages
const OPERATIONAL_STATUSES = [
  'qc_completed',
  'supervisor_approved',
  'floor_manager_confirmed',
  'assigned_to_applicator',
  'work_in_progress',
  'qc_rejected',
  'final_qc_failed',
  'work_completed',
  'ready_for_billing'
];

// Business statuses (shown only in "All Jobs" view)
const BUSINESS_STATUSES = [
  'billed',
  'delivered',
  'closed'
];

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    pending_qc_review: 0,
    ready_for_assignment: 0,
    work_in_progress: 0,
    qc_failed: 0,
    final_qc_pending: 0,
    ready_for_billing: 0,
  });

  const [activeTab, setActiveTab] = useState('pending_review');
  const [jobs, setJobs] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchJobs(activeTab);
  }, [activeTab]);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await api.get('/jobcards/supervisor/summary/');
      setSummary(res.data || {});
    } catch (err) {
      console.error('Error fetching supervisor summary:', err);
      showAlert('error', 'Failed to load summary data');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchJobs = async (bucket) => {
    try {
      setLoadingJobs(true);
      const res = await api.get('/jobcards/supervisor/jobs/', {
        params: { bucket },
      });
      setJobs(res.data || []);
    } catch (err) {
      console.error('Error fetching supervisor jobs:', err);
      setJobs([]);
      showAlert('error', 'Failed to load jobs list');
    } finally {
      setLoadingJobs(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    // For non-"All Jobs" tabs, exclude business statuses
    if (activeTab !== 'all_my' && BUSINESS_STATUSES.includes(job.status)) {
      return false;
    }

    if (statusFilter && job.status !== statusFilter) return false;
    if (!search) return true;

    const term = search.toLowerCase().trim();

    const idMatch = job.id?.toString().includes(term);
    const regMatch =
      job.booking_details?.vehicle_details?.registration_number
        ?.toLowerCase()
        .includes(term);
    const customerMatch =
      (job.booking_details?.vehicle_details?.customer?.name || '')
        .toLowerCase()
        .includes(term) ||
      (job.booking_details?.customer_name || '')
        .toLowerCase()
        .includes(term);

    return idMatch || regMatch || customerMatch;
  });

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...Array.from(new Set(jobs.map((j) => j.status))).map((status) => ({
      value: status,
      label: status.replace(/_/g, ' '),
    })),
  ];

  const getStatusBadgeVariant = (status) => {
    const map = {
      qc_pending: 'warning',
      qc_completed: 'info',
      qc_rejected: 'destructive',
      supervisor_approved: 'success',
      supervisor_rejected: 'destructive',
      floor_manager_confirmed: 'success',
      assigned_to_applicator: 'info',
      work_in_progress: 'warning',
      work_completed: 'success',
      final_qc_pending: 'warning',
      final_qc_passed: 'success',
      final_qc_failed: 'destructive',
      ready_for_billing: 'info',
      billed: 'default',
      delivered: 'default',
      closed: 'default'
    };
    return map[status] || 'default';
  };

  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const handleRefresh = () => {
    fetchSummary();
    fetchJobs(activeTab);
  };

  // Get job priority based on various factors
  const getJobPriority = (job) => {
    // High priority if job is overdue
    if (job.timer_status === 'overdue') return 'high';

    // Medium priority if job is in warning zone
    if (job.timer_status === 'warning') return 'medium';

    // High priority if job was rejected and needs correction
    if (job.status === 'qc_rejected' || job.status === 'final_qc_failed') return 'high';

    // Low priority for completed jobs
    if (job.status === 'work_completed' || job.status === 'supervisor_approved') return 'low';

    // Default to medium for pending jobs
    return 'medium';
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

  // Format applicator team
  const formatApplicatorTeam = (job) => {
    if (!job.applicator_team_details || job.applicator_team_details.length === 0) {
      return <span className="text-gray-400 text-xs">Not assigned</span>;
    }

    const teamNames = job.applicator_team_details.map(a => a.name).join(', ');
    return (
      <div className="flex items-center">
        <Users size={14} className="mr-1 text-gray-400" />
        <span className="text-xs">{teamNames}</span>
      </div>
    );
  };

  // Format timer/ETA
  const formatTimerOrETA = (job) => {
    // For active jobs, show the JobTimer component
    if (job.job_started_at && ['assigned_to_applicator', 'work_in_progress'].includes(job.status)) {
      return (
        <JobTimer
          jobStartedAt={job.job_started_at}
          allowedDurationMinutes={job.allowed_duration_display || job.allowed_duration_minutes}
          status={job.status}
        />
      );
    }

    // For other jobs, show time since last update
    if (job.updated_at) {
      const now = new Date();
      const updated = new Date(job.updated_at);
      const diffMs = now - updated;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours > 24) {
        const days = Math.floor(diffHours / 24);
        return <span className="text-xs text-gray-500">{days}d ago</span>;
      } else if (diffHours > 0) {
        return <span className="text-xs text-gray-500">{diffHours}h ago</span>;
      } else {
        return <span className="text-xs text-gray-500">{diffMins}m ago</span>;
      }
    }

    return <span className="text-xs text-gray-400">-</span>;
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Supervisor Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Review QC reports, assign work to teams, and monitor progress.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-gray-600">
              Logged in as <span className="font-semibold">{user.name}</span>
            </span>
          )}
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleRefresh}
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards - 6 Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadingSummary ? (
          <>
            {[...Array(6)].map((_, i) => (
              <SkeletonLoader key={i} type="summary-card" />
            ))}
          </>
        ) : (
          <>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-100">
                  <Clock className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending QC Review</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.pending_qc_review ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <CheckCircle className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Ready for Assignment</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.ready_for_assignment ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <Wrench className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Work In Progress</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.work_in_progress ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100">
                  <AlertTriangle className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">QC Failed</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.qc_failed ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100">
                  <ShieldCheck className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Final QC Pending</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.final_qc_pending ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-teal-100">
                  <ClipboardList className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Ready for Billing</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.ready_for_billing ?? 0}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Reward Summary */}
      <SupervisorRewardSummary />

      {/* Tabs + filters */}
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${activeTab === tab.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="w-56">
                <Input
                  placeholder="Search ID, reg no, customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  prefix={<Search size={18} className="text-gray-400" />}
                />
              </div>
              <div className="w-48">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={statusOptions}
                  prefix={<Filter size={18} className="text-gray-400" />}
                />
              </div>
            </div>
          </div>

          {/* Jobs table */}
          <div>
            {loadingJobs ? (
              <SkeletonLoader type="table" count={5} />
            ) : filteredJobs.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No jobs found in this bucket.
              </div>
            ) : (
              <Table
                headers={[
                  'Job ID',
                  'Customer',
                  'Vehicle',
                  'Service',
                  'Applicator',
                  'Priority',
                  'ETA / Timer',
                  'Status',
                  'Created',
                  'Actions',
                ]}
                data={filteredJobs}
                renderRow={(job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      #{job.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex items-center">
                        <User size={14} className="mr-1 text-gray-400" />
                        {job.booking_details?.customer_name ||
                          job.booking_details?.vehicle_details?.customer?.name ||
                          'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex items-center">
                        <span className="font-medium">
                          {job.booking_details?.vehicle_details?.registration_number || 'N/A'}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          {job.booking_details?.vehicle_details?.brand} {job.booking_details?.vehicle_details?.model}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {job.service_package_details?.name ||
                        job.booking_details?.package_details?.name ||
                        'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatApplicatorTeam(job)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getPriorityBadgeVariant(getJobPriority(job))}>
                        {getJobPriority(job).charAt(0).toUpperCase() + getJobPriority(job).slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {formatTimerOrETA(job)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusBadgeVariant(job.status)}>
                        {job.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1 text-gray-400" />
                        {job.created_at
                          ? new Date(job.created_at).toLocaleDateString()
                          : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex items-center gap-1"
                          onClick={() => navigate(`/supervisor/job/${job.id}`)}
                        >
                          <Eye size={14} />
                          View
                        </Button>
                        {activeTab === 'pending_review' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                            onClick={() =>
                              navigate(`/supervisor/job/${job.id}`)
                            }
                          >
                            <ListChecks size={14} />
                            Review
                          </Button>
                        )}
                        {(activeTab === 'approved' || activeTab === 'rejected') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                            onClick={() =>
                              navigate(`/supervisor/job/${job.id}`)
                            }
                          >
                            <Users size={14} />
                            Assign
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SupervisorDashboard;