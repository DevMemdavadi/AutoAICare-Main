import JobTimer from '@/components/JobTimer';
import { Alert, Badge, Button, Card, Input, Select, SkeletonLoader, Table } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Car,
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

const TABS = [
  { key: 'all_my', label: 'All My Jobs' },
  { key: 'waiting_qc', label: 'Waiting for QC' },
  { key: 'for_supervisor', label: 'For Supervisor Review' },
  { key: 'completed_today', label: 'Completed Today' },
];

const FloorManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    pending_qc: 0,
    completed_today: 0,
    awaiting_supervisor_review: 0,
    vehicles_arriving_today: 0,
    pending_checkins: 0,
    qc_rejected: 0,
    jobs_in_progress: 0,
    waiting_final_qc: 0,
    ready_for_billing: 0,
    delivered_today: 0
  });

  const [activeTab, setActiveTab] = useState('all_my');
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
      const res = await api.get('/jobcards/floor-manager/summary/');
      setSummary(res.data || {});
    } catch (err) {
      console.error('Error fetching floor manager summary:', err);
      showAlert('error', 'Failed to load QC summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchJobs = async (bucket) => {
    try {
      setLoadingJobs(true);
      const res = await api.get('/jobcards/floor-manager/jobs/', {
        params: { bucket },
      });
      setJobs(res.data || []);
    } catch (err) {
      console.error('Error fetching floor manager jobs:', err);
      setJobs([]);
      showAlert('error', 'Failed to load QC jobs list');
    } finally {
      setLoadingJobs(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
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

  // Check if any jobs have supervisor reviews to determine if we should show the column
  const showSupervisorReviewColumn = filteredJobs.some(job => job.supervisor_review);

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
    if (job.status === 'qc_rejected') return 'high';

    // Low priority for completed jobs
    if (job.status === 'qc_completed') return 'low';

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

  // Format timer status with icon
  const formatTimerStatus = (job) => {
    if (!job.timer_status || job.status === 'qc_completed') return null;

    switch (job.timer_status) {
      case 'overdue':
        return (
          <div className="flex items-center text-red-600">
            <AlertCircle size={14} className="mr-1" />
            Overdue
          </div>
        );
      case 'warning':
        return (
          <div className="flex items-center text-yellow-600">
            <Clock size={14} className="mr-1" />
            Due soon
          </div>
        );
      default:
        return (
          <div className="flex items-center text-green-600">
            <Clock size={14} className="mr-1" />
            On time
          </div>
        );
    }
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Floor Manager QC Dashboard</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Track vehicles waiting for QC, in review, and your completed inspections.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {user && (
            <span className="text-[10px] md:text-sm text-gray-500 font-medium">
              Logged in as <span className="font-bold text-gray-800">{user.name}</span>
            </span>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1 md:gap-2 h-8 px-2"
              onClick={handleRefresh}
            >
              <RefreshCw size={14} className="animate-spin-hover" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Today's Work Overview - Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {loadingSummary ? (
          <>
            {[...Array(5)].map((_, i) => (
              <SkeletonLoader key={i} type="summary-card" />
            ))}
          </>
        ) : (
          <>
            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-blue-100 w-fit">
                  <Car className="w-4 h-4 md:w-5 md:h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Vehicles Arriving</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.vehicles_arriving_today ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-yellow-100 w-fit">
                  <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Pending Check-Ins</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.pending_checkins ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-orange-100 w-fit">
                  <Wrench className="w-4 h-4 md:w-5 md:h-5 text-orange-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Pending QC</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.pending_qc ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-red-100 w-fit">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">QC Rejected</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.qc_rejected ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-green-100 w-fit">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">QC Completed Today</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.completed_today ?? 0}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Secondary Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {loadingSummary ? (
          <>
            {[...Array(5)].map((_, i) => (
              <SkeletonLoader key={i} type="summary-card" />
            ))}
          </>
        ) : (
          <>
            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-purple-100 w-fit">
                  <Wrench className="w-4 h-4 md:w-5 md:h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Jobs In Progress</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.jobs_in_progress ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-indigo-100 w-fit">
                  <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-indigo-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Waiting Final QC</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.waiting_final_qc ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-teal-100 w-fit">
                  <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-teal-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Ready for Billing</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.ready_for_billing ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-cyan-100 w-fit">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-cyan-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Waiting Supervisor</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.awaiting_supervisor_review ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-emerald-100 w-fit">
                  <Car className="w-4 h-4 md:w-5 md:h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Delivered Today</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {loadingSummary ? '—' : summary.delivered_today ?? 0}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Tabs + filters */}
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {/* Tabs - Horizontal scroll on mobile */}
            <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              <div className="flex gap-2 min-w-max md:min-w-0">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 text-xs md:text-sm rounded-full border transition-colors whitespace-nowrap ${activeTab === tab.key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Search and Filters - Stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search ID, reg no, customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  prefix={<Search size={16} className="text-gray-400" />}
                  className="text-sm"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={statusOptions}
                  prefix={<Filter size={16} className="text-gray-400" />}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Jobs table */}
          <div className="overflow-x-auto -mx-4 md:mx-0">
            {loadingJobs ? (
              <SkeletonLoader type="table" count={5} />
            ) : filteredJobs.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No jobs found in this bucket.
              </div>
            ) : (
              <div className="min-w-[800px]">
                <Table
                  headers={[
                    'Job ID',
                    'Customer',
                    'Vehicle',
                    'Service',
                    'Priority',
                    'Time Estimate',
                    'Status',
                    ...(showSupervisorReviewColumn ? ['Supervisor Review'] : []),
                    'Timer',
                    'Created',
                    'Actions',
                  ]}
                  data={filteredJobs}
                  renderRow={(job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <button
                          onClick={() => navigate(`/floor-manager/job/${job.id}`)}
                          className="text-left block w-fit"
                        >
                          #{job.id}
                        </button>
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
                      <td className="px-4 py-3">
                        <Badge variant={getPriorityBadgeVariant(getJobPriority(job))}>
                          {getJobPriority(job).charAt(0).toUpperCase() + getJobPriority(job).slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center">
                          <Clock size={14} className="mr-1 text-gray-400" />
                          {formatTimeEstimate(job)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(job.status)}>
                          {job.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      {/* Conditionally render supervisor review information only when supervisor review exists */}
                      {showSupervisorReviewColumn && job.supervisor_review && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Badge
                              variant={job.supervisor_review.status === 'approved' ? 'success' : 'destructive'}
                            >
                              {job.supervisor_review.status === 'approved' ? 'Approved' : 'Rejected'}
                            </Badge>
                            {job.supervisor_review.reviewed_at && (
                              <span className="text-xs text-gray-500 ml-1">
                                {new Date(job.supervisor_review.reviewed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {job.job_started_at && ['started', 'in_progress', 'work_in_progress', 'assigned_to_applicator'].includes(job.status) ? (
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
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
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
                            onClick={() => navigate(`/floor-manager/job/${job.id}`)}
                          >
                            <Eye size={14} />
                            View
                          </Button>
                          {activeTab === 'waiting_qc' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1"
                              onClick={() =>
                                navigate(`/floor-manager/job/${job.id}`)
                              }
                            >
                              <ListChecks size={14} />
                              Start QC
                            </Button>
                          )}
                          {(activeTab === 'for_supervisor' || activeTab === 'completed_today') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1"
                              onClick={() =>
                                navigate(`/floor-manager/job/${job.id}`)
                              }
                            >
                              <Eye size={14} />
                              Details
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Information section */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">QC Process Guide</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Inspect vehicle thoroughly for scratches/dents</li>
            <li>• Take clear before photos</li>
            <li>• Complete checklist accurately</li>
            <li>• Document all required parts</li>
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">Priority Legend</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center">
              <Badge variant="destructive" className="mr-2">High</Badge>
              Overdue or rejected jobs
            </li>
            <li className="flex items-center">
              <Badge variant="warning" className="mr-2">Medium</Badge>
              Due soon or pending jobs
            </li>
            <li className="flex items-center">
              <Badge variant="success" className="mr-2">Low</Badge>
              Completed jobs
            </li>
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Click "Start QC" to begin inspection</li>
            <li>• Use filters to find specific jobs</li>
            <li>• Refresh to get latest updates</li>
            <li>• View job details for full information</li>
          </ul>
        </Card>
      </div> */}
    </div>
  );
};

export default FloorManagerDashboard;