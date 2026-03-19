import { Alert, Badge, Button, Card, Input, Table, SkeletonLoader } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import {
  List,
  Eye,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ChecklistManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchJobs();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      // Fetch all jobs assigned to this floor manager
      const res = await api.get('/jobcards/floor-manager/jobs/', {
        params: { bucket: 'all_my' },
      });
      setJobs(res.data || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setJobs([]);
      showAlert('error', 'Failed to load jobs');
    } finally {
      setLoading(false);
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

  const handleRefresh = () => {
    fetchJobs();
  };

  // Calculate checklist progress
  const getChecklistProgress = (job) => {
    if (!job.qc_report || !job.qc_report.checklist_points) return { completed: 0, total: 0, percentage: 0 };

    const checklist = job.qc_report.checklist_points;
    const total = checklist.length;
    const completed = checklist.filter(item => item.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  // Calculate parts status
  const getPartsStatus = (job) => {
    if (!job.qc_report || !job.qc_report.required_parts) return { required: 0, available: 0, missing: 0 };

    const requiredParts = job.qc_report.required_parts;
    const required = requiredParts.length;
    const available = requiredParts.filter(part => part.available).length;
    const missing = required - available;

    return { required, available, missing };
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Checklist & Parts Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Track checklist completion and parts requirements for all jobs
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {user && (
            <span className="text-xs md:text-sm text-gray-600 hidden md:inline">
              Logged in as <span className="font-semibold">{user.name}</span>
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1 md:gap-2"
            onClick={handleRefresh}
          >
            <RefreshCw size={14} className="md:hidden" />
            <RefreshCw size={16} className="hidden md:block" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <SkeletonLoader key={i} type="summary-card" />
            ))}
          </>
        ) : (
          <>
            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-blue-100 w-fit">
                  <List className="w-4 h-4 md:w-5 md:h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Total Checklists</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {jobs.filter(job => job.qc_report).length}
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
                  <p className="text-xs md:text-sm font-medium text-gray-600">Completed Tasks</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {jobs.reduce((acc, job) => acc + getChecklistProgress(job).completed, 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-yellow-100 w-fit">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Pending Tasks</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {jobs.reduce((acc, job) => acc + (getChecklistProgress(job).total - getChecklistProgress(job).completed), 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-red-100 w-fit">
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Missing Parts</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {jobs.reduce((acc, job) => acc + getPartsStatus(job).missing, 0)}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by job ID, vehicle reg, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<Search size={16} className="text-gray-400" />}
              className="text-sm"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-sm"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Jobs Table */}
      {loading ? (
        <SkeletonLoader type="table" count={5} />
      ) : filteredJobs.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          No jobs found matching your search.
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[900px]">
              <Table
                headers={[
                  'Job ID',
                  'Customer',
                  'Vehicle',
                  'Service',
                  'Checklist Progress',
                  'Parts Status',
                  'Status',
                  'Actions',
                ]}
                data={filteredJobs}
                renderRow={(job) => {
                  const progress = getChecklistProgress(job);
                  const parts = getPartsStatus(job);

                  return (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        #{job.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {job.booking_details?.customer_name ||
                          job.booking_details?.vehicle_details?.customer?.name ||
                          'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {job.booking_details?.vehicle_details?.registration_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {job.service_package_details?.name ||
                          job.booking_details?.package_details?.name ||
                          'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>{progress.completed}/{progress.total} tasks</span>
                            <span>{progress.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${progress.percentage === 100 ? 'bg-green-600' :
                                progress.percentage >= 50 ? 'bg-blue-600' : 'bg-yellow-600'
                                }`}
                              style={{ width: `${progress.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center text-xs">
                            <CheckCircle size={12} className="text-green-600 mr-1" />
                            <span>{parts.available} available</span>
                          </div>
                          {parts.missing > 0 && (
                            <div className="flex items-center text-xs mt-1">
                              <AlertCircle size={12} className="text-red-600 mr-1" />
                              <span className="text-red-600">{parts.missing} missing</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(job.status)}>
                          {job.status.replace(/_/g, ' ')}
                        </Badge>
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
                        </div>
                      </td>
                    </tr>
                  );
                }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Information Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">Checklist Legend</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center">
              <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
              <span>100% Completed</span>
            </li>
            <li className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
              <span>50-99% Completed</span>
            </li>
            <li className="flex items-center">
              <div className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></div>
              <span>0-49% Completed</span>
            </li>
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">Parts Status</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center">
              <CheckCircle size={14} className="text-green-600 mr-2" />
              <span>Available parts</span>
            </li>
            <li className="flex items-center">
              <AlertCircle size={14} className="text-red-600 mr-2" />
              <span>Missing parts (requires attention)</span>
            </li>
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Click "View" to see detailed checklist</li>
            <li>• Update checklist progress in job details</li>
            <li>• Report missing parts to inventory</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default ChecklistManagement;