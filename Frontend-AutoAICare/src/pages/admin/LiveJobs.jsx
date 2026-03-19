import { Alert, Badge, Button, Card, SkeletonLoader } from '@/components/ui';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import JobTimer from '@/components/JobTimer';
import { Building2, Clock, RefreshCw, User, Wrench, LayoutGrid, List } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_COLUMNS = [
  { key: 'new', label: 'New / QC Pending', statuses: ['booking_confirmed', 'qc_pending'], color: 'blue' },
  { key: 'review', label: 'QC & Review', statuses: ['qc_rejected', 'qc_completed', 'supervisor_approved'], color: 'orange' },
  { key: 'work', label: 'Work In Progress', statuses: ['assigned_to_applicator', 'started', 'in_progress', 'work_in_progress'], color: 'purple' },
  { key: 'final', label: 'Final QC / Approval', statuses: ['work_completed', 'final_qc_pending', 'final_qc_passed', 'final_qc_failed', 'customer_approval_pending', 'customer_revision_requested'], color: 'indigo' },
  { key: 'billing', label: 'Billing / Ready', statuses: ['customer_approved', 'ready_for_billing', 'billed', 'ready_for_delivery'], color: 'green' },
];

const LiveJobs = () => {
  const { isSuperAdmin, getBranchFilterParams } = useBranch();
  const [activeJobs, setActiveJobs] = useState([]);
  const [viewMode, setViewMode] = useState('board'); // Default to board view
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const navigate = useNavigate();
  const isInitialMount = useRef(true);

  const handleJobClick = (jobId) => {
    console.log('Navigating to job:', jobId);
    navigate(`/admin/jobcards/${jobId}`);
  };

  const fetchActiveJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = getBranchFilterParams();

      const response = await api.get('/jobcards/', {
        params: {
          ...params,
          exclude_status: 'delivered,closed',
          ordering: '-created_at'
        }
      });

      const activeStatuses = [
        'booking_confirmed', 'qc_pending', 'qc_rejected', 'qc_completed',
        'supervisor_approved', 'assigned_to_applicator', 'started',
        'in_progress', 'work_in_progress', 'work_completed',
        'final_qc_pending', 'final_qc_passed', 'final_qc_failed',
        'customer_approval_pending', 'customer_revision_requested',
        'customer_approved', 'ready_for_billing', 'billed', 'ready_for_delivery'
      ];

      const jobs = response.data.results || response.data || [];
      const filteredJobs = jobs.filter(job => activeStatuses.includes(job.status));
      setActiveJobs(filteredJobs);
    } catch (error) {
      console.error('Error fetching active jobs:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to load active jobs' });
      setActiveJobs([]);
    } finally {
      setLoading(false);
      isInitialMount.current = false;
    }
  }, [getBranchFilterParams]);

  useEffect(() => {
    fetchActiveJobs();
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchActiveJobs, 30000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [fetchActiveJobs, autoRefresh]);

  const getStatusBadge = (status) => {
    const variants = {
      booking_confirmed: 'default', qc_pending: 'warning', qc_rejected: 'danger',
      qc_completed: 'info', supervisor_approved: 'success', assigned_to_applicator: 'default',
      started: 'info', in_progress: 'warning', work_in_progress: 'warning',
      work_completed: 'success', final_qc_pending: 'warning', final_qc_passed: 'success',
      final_qc_failed: 'danger', customer_approval_pending: 'warning',
      customer_approved: 'success', customer_revision_requested: 'danger',
      ready_for_billing: 'info', billed: 'success', ready_for_delivery: 'success', delivered: 'success', closed: 'default'
    };
    return variants[status] || 'default';
  };

  const getJobBorderColor = (job) => {
    if (job.timer_status === 'overdue') return 'border-red-500';
    if (job.timer_status === 'warning') return 'border-yellow-500';

    const statusColors = {
      qc_rejected: 'border-red-500', final_qc_failed: 'border-red-500',
      customer_revision_requested: 'border-red-500', qc_pending: 'border-orange-500',
      final_qc_pending: 'border-orange-500', customer_approval_pending: 'border-orange-500',
      work_in_progress: 'border-blue-500', in_progress: 'border-blue-500',
      started: 'border-blue-500', qc_completed: 'border-blue-400',
      ready_for_billing: 'border-blue-600', work_completed: 'border-green-500',
      final_qc_passed: 'border-green-500', customer_approved: 'border-green-600',
      supervisor_approved: 'border-green-500', billed: 'border-green-700', ready_for_delivery: 'border-green-600'
    };
    return statusColors[job.status] || 'border-gray-300';
  };

  const renderListView = (jobs) => (
    <div className="divide-y divide-gray-200 sm:divide-y-0 sm:space-y-0">
      {jobs.map((job) => (
        <div
          key={job.id}
          onClick={() => handleJobClick(job.id)}
          className={`p-4 sm:p-6 mb-3 sm:mb-0 rounded-lg sm:rounded-none hover:bg-gray-50 transition-colors border-l-4 cursor-pointer ${getJobBorderColor(job)}`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              {/* Title and Badges */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Job #{job.id}</h3>
                <Badge variant={getStatusBadge(job.status)} className="text-xs">{job.status?.replace('_', ' ')}</Badge>
                {job.timer_status === 'overdue' && <Badge variant="danger" className="text-xs">OVERDUE</Badge>}
                {job.timer_status === 'warning' && <Badge variant="warning" className="text-xs">WARNING</Badge>}
              </div>

              {/* Main Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{job.booking_details?.customer_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Vehicle</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{job.booking_details?.vehicle_details?.registration_number || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Service</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{job.booking_details?.package_details?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Secondary Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs text-gray-500">Floor Manager</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{job.floor_manager_details?.name || 'Unassigned'}</p>
                </div>
                {isSuperAdmin && (
                  <div>
                    <p className="text-xs text-gray-500">Branch</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{job.branch_details?.name || 'N/A'}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Created At</p>
                  <p className="text-sm font-medium text-gray-900">{job.created_at ? new Date(job.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Timer/Status Section */}
            <div className="flex flex-col items-start lg:items-end gap-2 mt-2 lg:mt-0">
              {job.job_started_at && ['started', 'in_progress', 'work_in_progress'].includes(job.status) && (
                <div className="w-full lg:min-w-[200px]">
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
                </div>
              )}
              {(!job.job_started_at || !['started', 'in_progress', 'work_in_progress'].includes(job.status)) && (
                <div className="text-left lg:text-right">
                  <p className="text-xs text-gray-500">Current Stage</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{job.status?.replace(/_/g, ' ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderBoardView = () => (
    <div className="relative w-full">
      <div className="w-full overflow-x-auto scroll-smooth snap-x snap-mandatory">
        <div className="flex gap-4 pb-4 min-w-max">
          {STATUS_COLUMNS.map((column) => {
            const columnJobs = activeJobs.filter(job => column.statuses.includes(job.status));
            return (
              <div key={column.key} className="flex flex-col w-[280px] flex-shrink-0 snap-start">
                <div className={`p-3 rounded-t-lg bg-${column.color}-50 border-b-2 border-${column.color}-200 flex items-center justify-between`}>
                  <h3 className={`font-bold text-sm text-${column.color}-800`}>{column.label}</h3>
                  <Badge variant="secondary" className="bg-white/80 text-gray-700">{columnJobs.length}</Badge>
                </div>
                <div className="flex-1 bg-gray-50/50 p-2 rounded-b-lg border border-t-0 border-gray-200 min-h-[500px] space-y-3">
                  {columnJobs.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                      <Clock size={20} className="mb-2 opacity-20" /><p className="text-[10px]">No active jobs</p>
                    </div>
                  ) : (
                    columnJobs.map((job) => (
                      <Card
                        key={job.id}
                        onClick={() => handleJobClick(job.id)}
                        className={`p-3 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer ${getJobBorderColor(job)} bg-white`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-gray-400">#{job.id}</span>
                            <Badge variant={getStatusBadge(job.status)} className="text-[9px] px-1.5 py-0">{job.status?.replace(/_/g, ' ')}</Badge>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800 truncate">{job.booking_details?.customer_name}</p>
                            <p className="text-[10px] text-blue-600 font-medium">{job.booking_details?.vehicle_details?.registration_number}</p>
                          </div>
                          <div className="space-y-1 pt-1 border-t border-gray-100 italic text-gray-500">
                            <div className="flex items-center gap-1.5 text-[10px] truncate">
                              <Wrench size={10} /> {job.booking_details?.package_details?.name}
                            </div>

                            {job.floor_manager_details?.name && (
                              <div className="flex items-center gap-1.5 text-[10px] truncate">
                                <User size={10} /> FM : {job.floor_manager_details.name}
                              </div>
                            )}

                            {job.supervisor_details?.name && (
                              <div className="flex items-center gap-1.5 text-[10px] truncate">
                                <User size={10} /> Supervisor : {job.supervisor_details.name}
                              </div>
                            )}
                          </div>

                          {job.job_started_at && (
                            <div className="ml-auto">
                              <JobTimer
                                jobStartedAt={job.job_started_at}
                                allowedDurationMinutes={
                                  job.allowed_duration_display || job.allowed_duration_minutes
                                }
                                effectiveDurationMinutes={job.effective_duration_minutes}
                                isTimerPaused={job.is_timer_paused}
                                pauseStartedAt={job.pause_started_at}
                                totalPauseDurationSeconds={job.total_pause_duration_seconds}
                                status={job.status}
                                compact={false}
                                reflectPause={false}
                              />
                            </div>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div><div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div></div>
          <div className="flex gap-2"><div className="h-10 bg-gray-200 rounded w-10 animate-pulse"></div><div className="h-10 bg-gray-200 rounded w-10 animate-pulse"></div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => (<div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>))}</div>
        {viewMode === 'board' ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">{[...Array(5)].map((_, i) => (<SkeletonLoader key={i} type="kanban-column" count={2} />))}</div>
        ) : (
          <Card className="p-6 space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>))}</Card>
        )}
      </div>
    );
  }

  const sortedJobs = [...activeJobs].sort((a, b) => {
    const statusPriority = {
      'qc_rejected': 10, 'qc_pending': 9, 'final_qc_failed': 8, 'work_in_progress': 7, 'in_progress': 7, 'started': 7,
      'assigned_to_applicator': 6, 'work_completed': 5, 'final_qc_pending': 5, 'qc_completed': 4, 'supervisor_approved': 3,
      'final_qc_passed': 2, 'customer_approved': 2, 'ready_for_billing': 1, 'billed': 1, 'booking_confirmed': 0
    };
    const priorityA = statusPriority[a.status] || 0;
    const priorityB = statusPriority[b.status] || 0;
    if (priorityB !== priorityA) return priorityB - priorityA;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="space-y-6">
      {alert.show && <Alert type={alert.type} message={alert.message} onClose={() => setAlert({ show: false, type: '', message: '' })} />}

      {/* Responsive Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Live Jobs</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Real-time status of all active job cards</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <Button
              variant={viewMode === 'board' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('board')}
              className={`flex items-center justify-center gap-1 md:gap-2 h-8 text-xs md:text-sm px-2 md:px-3 ${viewMode === 'board' ? 'shadow-sm' : ''}`}
            >
              <LayoutGrid size={14} />
              <span>Board</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`flex items-center justify-center gap-1 md:gap-2 h-8 text-xs md:text-sm px-2 md:px-3 ${viewMode === 'list' ? 'shadow-sm' : ''}`}
            >
              <List size={14} />
              <span>List</span>
            </Button>
          </div>

          {/* Refresh Button */}
          <Button
            onClick={fetchActiveJobs}
            variant="outline"
            className="flex items-center justify-center gap-1 md:gap-2 h-8 text-xs md:text-sm px-2 md:px-3"
            size="sm"
          >
            <RefreshCw size={14} className="md:hidden" />
            <RefreshCw size={16} className="hidden md:block" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Active', value: activeJobs.length, color: 'text-gray-900' },
          { label: 'Pending QC', value: activeJobs.filter(j => ['qc_pending', 'qc_rejected'].includes(j.status)).length, color: 'text-orange-600' },
          { label: 'WIP', value: activeJobs.filter(j => ['assigned_to_applicator', 'work_in_progress', 'started', 'in_progress'].includes(j.status)).length, color: 'text-blue-600' },
          { label: 'Awaiting Final QC', value: activeJobs.filter(j => ['work_completed', 'final_qc_pending'].includes(j.status)).length, color: 'text-purple-600' }
        ].map(stat => (
          <Card key={stat.label} className="p-4"><p className="text-sm text-gray-600 font-medium">{stat.label}</p><p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p></Card>
        ))}
      </div>
      <div className="min-h-[600px]">{viewMode === 'list' ? (<Card className="overflow-hidden">{activeJobs.length === 0 ? (<div className="p-12 text-center text-gray-500"><Clock className="mx-auto mb-4" size={48} /><p className="text-lg">No active jobs</p></div>) : renderListView(sortedJobs)}</Card>) : renderBoardView()}</div>
    </div>
  );
};

export default LiveJobs;

