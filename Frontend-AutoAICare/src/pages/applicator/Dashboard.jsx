import { Button, Card } from '@/components/ui';
import api from '@/utils/api';
import {
  Bell,
  Calendar,
  CheckCircle,
  FileText,
  Search,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Car,
  List,
  Wrench
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ApplicatorDashboard = () => {
  const navigate = useNavigate();
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned');
  const [filters, setFilters] = useState({
    search: '',
    date: '',
  });
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [unreadCount, setUnreadCount] = useState(0);

  // Tab configuration
  const tabs = [
    { key: 'assigned', label: 'Assigned Work' },
    { key: 'in_progress', label: 'Work In Progress' },
    { key: 'completed', label: 'Completed Work' }
  ];

  // Summary card configuration based on active tab
  const getSummaryCards = () => {
    switch (activeTab) {
      case 'assigned':
        return [
          {
            title: 'Total Assigned',
            value: jobCards.length,
            description: 'Jobs assigned to you',
            icon: <FileText className="w-6 h-6 text-blue-600" />,
            bgColor: 'bg-blue-100'
          },
          {
            title: 'Urgent Jobs',
            value: jobCards.filter(job => job.timer_status === 'overdue').length,
            description: 'Overdue jobs',
            icon: <AlertCircle className="w-6 h-6 text-red-600" />,
            bgColor: 'bg-red-100'
          }
        ];
      
      case 'in_progress':
        return [
          {
            title: 'Active Jobs',
            value: jobCards.length,
            description: 'Currently in progress',
            icon: <Wrench className="w-6 h-6 text-yellow-600" />,
            bgColor: 'bg-yellow-100'
          },
          {
            title: 'Avg. Completion',
            value: jobCards.length > 0 
              ? `${Math.round(jobCards.reduce((acc, job) => {
                  if (job.job_started_at && job.updated_at) {
                    const start = new Date(job.job_started_at);
                    const end = new Date(job.updated_at);
                    const duration = (end - start) / (1000 * 60); // in minutes
                    return acc + duration;
                  }
                  return acc;
                }, 0) / jobCards.length)} mins`
              : '0 mins',
            description: 'Average time per job',
            icon: <Clock className="w-6 h-6 text-purple-600" />,
            bgColor: 'bg-purple-100'
          }
        ];
      
      case 'completed':
        return [
          {
            title: 'Completed Today',
            value: jobCards.filter(job => {
              const today = new Date().toISOString().split('T')[0];
              const jobDate = job.updated_at ? job.updated_at.split('T')[0] : '';
              return jobDate === today;
            }).length,
            description: 'Jobs completed today',
            icon: <CheckCircle className="w-6 h-6 text-green-600" />,
            bgColor: 'bg-green-100'
          },
          {
            title: 'Total Completed',
            value: jobCards.length,
            description: 'All completed jobs',
            icon: <CheckCircle className="w-6 h-6 text-green-600" />,
            bgColor: 'bg-green-100'
          }
        ];
      
      default:
        return [];
    }
  };

  useEffect(() => {
    fetchJobCards();
    fetchUnreadNotifications();
  }, [activeTab]);

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      // Use applicator jobs endpoint for all tabs
      const response = await api.get(`/jobcards/applicator/jobs/?bucket=${activeTab}`);
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Filter jobs based on search and date filters
  const filteredJobs = jobCards.filter(job => {
    const matchesSearch = job.id.toString().includes(filters.search) || 
      (job.vehicle_details?.registration_number?.toLowerCase().includes(filters.search.toLowerCase())) ||
      (job.customer_details?.user?.name?.toLowerCase().includes(filters.search.toLowerCase()));
    
    const matchesDate = filters.date ? job.created_at.startsWith(filters.date) : true;
    
    return matchesSearch && matchesDate;
  });

  // Get priority badge styling
  const getPriorityBadge = (job) => {
    if (job.timer_status === 'overdue') {
      return { text: 'Overdue', variant: 'danger' };
    } else if (job.timer_status === 'warning') {
      return { text: 'Due Soon', variant: 'warning' };
    }
    return { text: 'On Time', variant: 'success' };
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
            {tabs.find(tab => tab.key === activeTab)?.label} - Applicator Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your assigned work and track progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            onClick={() => navigate('/admin/notifications')}
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
        {getSummaryCards().map((card, index) => (
          <Card key={index} className="p-6 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.description}</p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                {card.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs and Filters */}
      <Card className="p-6 bg-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by job ID, reg. no., or customer..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary w-full sm:w-64"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              value={filters.date}
              onChange={(e) => handleFilterChange("date", e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Job Cards List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {tabs.find(tab => tab.key === activeTab)?.label} Job Cards
        </h2>

        {filteredJobs.length === 0 ? (
          <Card className="p-8 text-center bg-white shadow-sm">
            <p className="text-gray-500">
              {filters.search ||
              filters.date
                ? "No job cards match your filters."
                : `No job cards found in ${tabs.find(tab => tab.key === activeTab)?.label.toLowerCase()} section.`}
            </p>
          </Card>
        ) : (
          filteredJobs.map((job) => {
            const priorityBadge = getPriorityBadge(job);
            
            return (
              <Card
                key={job.id}
                className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/applicator/job/${job.id}`)}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Job #{job.id}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {job.service_package_details?.name || job.booking_details?.package_details?.name}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Car size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {job.vehicle_details?.brand} {job.vehicle_details?.model}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({job.vehicle_details?.registration_number})
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1">
                        <User size={16} className="text-gray-400" />
                        <span className="text-gray-600">
                          {job.customer_details?.user?.name || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-gray-600">
                          {new Date(job.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-gray-600">
                          Est: {formatTimeEstimate(job)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      priorityBadge.variant === 'danger' ? 'bg-red-100 text-red-800' :
                      priorityBadge.variant === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {priorityBadge.text}
                    </span>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ApplicatorDashboard;