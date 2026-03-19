import { Button, Card, Select } from '@/components/ui';
import api from '@/utils/api';
import JobTimer from '@/components/JobTimer';
import {
  Calendar,
  Car,
  Clock,
  Play,
  Search,
  User,
  Wrench,
  Bell
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TechnicianDashboard = () => {
  const navigate = useNavigate();
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    priority: '',
    date: '', // New date filter
  });
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchJobCards();
    fetchUnreadNotifications();
  }, []);

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      // Fetch job cards assigned to current technician
      const response = await api.get('/jobcards/my_jobs/');
      setJobCards(response.data);
    } catch (error) {
      console.error('Error fetching job cards:', error);
      setAlert({
        show: true,
        type: 'error',
        message: 'Failed to load job cards'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const response = await api.get('/notify/in-app/unread_count/');
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    }
  };

  // Filter jobs based on selected filters
  const filteredJobs = jobCards.filter(job => {
    // Status filter
    if (filters.status && job.status !== filters.status) return false;

    // Priority filter
    if (filters.priority && job.priority !== filters.priority) return false;

    // Date filter
    if (filters.date && job.created_at?.split("T")[0] !== filters.date)
      return false;

    // Search filter - check multiple fields
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase().trim();

      const jobIdMatch = job.id?.toString().toLowerCase().includes(searchTerm);

      const regNoMatch =
        job.booking_details?.vehicle_details?.registration_number
          ?.toLowerCase()
          .includes(searchTerm);

      const customerName =
        job.booking_details?.vehicle_details?.customer?.name || "";
      const customerMatch = customerName.toLowerCase().includes(searchTerm);

      const vehicleBrand = job.booking_details?.vehicle_details?.brand || "";
      const brandMatch = vehicleBrand.toLowerCase().includes(searchTerm);

      const vehicleModel = job.booking_details?.vehicle_details?.model || "";
      const modelMatch = vehicleModel.toLowerCase().includes(searchTerm);

      const serviceName =
        job.service_package_details?.name ||
        job.booking_details?.package_details?.name ||
        "";
      const serviceMatch = serviceName.toLowerCase().includes(searchTerm);

      const branchName = job.branch_details?.name || "";
      const branchMatch = branchName.toLowerCase().includes(searchTerm);

      // Return true if ANY field matches
      if (
        !jobIdMatch &&
        !regNoMatch &&
        !customerMatch &&
        !brandMatch &&
        !modelMatch &&
        !serviceMatch &&
        !branchMatch
      ) {
        return false;
      }
    }

    return true;
  });

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get unique statuses from job cards for filter options
  const getStatusOptions = () => {
    const statuses = [...new Set(jobCards.map(job => job.status))];
    return [
      { label: 'All Status', value: '' },
      ...statuses.map(status => ({
        label: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: status
      }))
    ];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Technician Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your job cards and track progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            onClick={() => navigate('/technician/notifications')}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Jobs</p>
              <p className="text-2xl font-semibold text-gray-900">
                {jobCards.filter((job) => job.status === "pending").length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Wrench className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-semibold text-gray-900">
                {jobCards.filter((job) => job.status === "in_progress").length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Car className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Completed Today
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {
                  jobCards.filter(
                    (job) =>
                      job.status === "completed" &&
                      new Date(job.updated_at).toDateString() ===
                      new Date().toDateString()
                  ).length
                }
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Assigned
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {jobCards.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Field */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by job ID, register no..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <Select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            options={getStatusOptions()}
          />

          {/* Priority Filter */}
          {/* <Select
            value={filters.priority}
            onChange={(e) => handleFilterChange("priority", e.target.value)}
            placeholder="All Priority"
            options={[
              { label: "All Priority", value: "" },
              { label: "Low", value: "low" },
              { label: "Medium", value: "medium" },
              { label: "High", value: "high" },
              { label: "Urgent", value: "urgent" },
            ]}
          /> */}

          {/* Date Filter */}
          {/* <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.date}
            onChange={(e) => handleFilterChange("date", e.target.value)}
          /> */}
        </div>
      </Card>

      {/* Job Cards List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">My Job Cards</h2>

        {filteredJobs.length === 0 ? (
          <Card className="p-8 text-center bg-white shadow-sm">
            <p className="text-gray-500">
              {filters.search ||
                filters.status ||
                filters.priority ||
                filters.date
                ? "No job cards match your filters."
                : "You have no assigned job cards."}
            </p>
          </Card>
        ) : (
          filteredJobs.map((job) => (
            <Card
              key={job.id}
              className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/technician/job/${job.id}`)}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Job #{job.id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Reg:{" "}
                        {job.booking_details?.vehicle_details
                          ?.registration_number || "N/A"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          job.status
                        )}`}
                      >
                        {job.status.replaceAll("_", " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                      {/* <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                          job.priority
                        )}`}
                      >
                        {job.priority}
                      </span> */}
                    </div>
                  </div>

                  {/* Timer Display */}
                  {job.job_started_at && (job.status === 'started' || job.status === 'in_progress') && (
                    <div className="mt-3">
                      <JobTimer
                        jobStartedAt={job.job_started_at}
                        allowedDurationMinutes={job.allowed_duration_minutes}
                        status={job.status}
                      />
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="text-sm font-medium text-gray-900">
                        {job.booking_details.customer_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Vehicle</p>
                      <p className="text-sm font-medium text-gray-900">
                        {job.booking_details?.vehicle_details?.brand || "N/A"}{" "}
                        {/* {job.booking_details?.vehicle_details?.model || ""} */}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Service</p>
                      <p className="text-sm font-medium text-gray-900">
                        {job.service_package_details?.name || job.booking_details?.package_details?.name || "N/A"}
                      </p>
                      {(job.service_package_details?.price || job.booking_details?.package_details?.price) && (
                        <p className="text-xs text-gray-500">
                          ${(job.service_package_details?.price || job.booking_details?.package_details?.price)}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Branch</p>
                      <p className="text-sm font-medium text-gray-900">
                        {job.branch_details?.name || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4">
                    {/* <div>
                      <p className="text-xs text-gray-500">Technician</p>
                      <p className="text-sm font-medium text-gray-900">
                        {job.technician_details?.name || "N/A"}
                      </p>
                    </div> */}
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {/* <div>
                      <p className="text-xs text-gray-500">Updated</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(job.updated_at).toLocaleDateString()}
                      </p>
                    </div> */}
                    {job.estimated_delivery_time && (
                      <div>
                        <p className="text-xs text-gray-500">Est. Delivery</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(job.estimated_delivery_time).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <p className="text-sm text-gray-600">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/technician/job/${job.id}`);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TechnicianDashboard;