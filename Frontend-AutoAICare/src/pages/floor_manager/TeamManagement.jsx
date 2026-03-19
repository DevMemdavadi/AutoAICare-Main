import { Alert, Badge, Button, Card, Input, Table, SkeletonLoader } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import {
  Users,
  RefreshCw,
  Search,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

const TeamManagement = () => {
  const { user } = useAuth();

  const [teamMembers, setTeamMembers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchTeamData();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchTeamData = async () => {
    try {
      setLoading(true);

      // Fetch team members (in a real app, this would come from a specific endpoint)
      // For now, we'll simulate team data
      const teamData = [
        { id: 1, name: 'John Smith', role: 'Applicator', status: 'available', jobs_assigned: 3 },
        { id: 2, name: 'Mike Johnson', role: 'Applicator', status: 'busy', jobs_assigned: 5 },
        { id: 3, name: 'Sarah Williams', role: 'Applicator', status: 'break', jobs_assigned: 0 },
        { id: 4, name: 'David Brown', role: 'Applicator', status: 'available', jobs_assigned: 2 },
        { id: 5, name: 'Lisa Davis', role: 'Applicator', status: 'busy', jobs_assigned: 4 },
      ];

      setTeamMembers(teamData);

      // Fetch jobs to show workload distribution
      const res = await api.get('/jobcards/floor-manager/jobs/', {
        params: { bucket: 'all_my' },
      });
      setJobs(res.data || []);
    } catch (err) {
      console.error('Error fetching team data:', err);
      showAlert('error', 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTeamMembers = teamMembers.filter((member) => {
    if (!search) return true;

    const term = search.toLowerCase().trim();
    const nameMatch = member.name?.toLowerCase().includes(term);
    const roleMatch = member.role?.toLowerCase().includes(term);

    return nameMatch || roleMatch;
  });

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'available': return 'success';
      case 'busy': return 'warning';
      case 'break': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <CheckCircle size={16} className="text-green-600" />;
      case 'busy': return <Clock size={16} className="text-yellow-600" />;
      case 'break': return <AlertCircle size={16} className="text-red-600" />;
      default: return null;
    }
  };

  const handleRefresh = () => {
    fetchTeamData();
  };

  // Get workload distribution
  const getWorkloadStats = () => {
    const totalJobs = jobs.length;
    const assignedJobs = jobs.filter(job =>
      job.applicator_team_details && job.applicator_team_details.length > 0
    ).length;

    return {
      totalJobs,
      assignedJobs,
      unassignedJobs: totalJobs - assignedJobs
    };
  };

  const workloadStats = getWorkloadStats();

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Manage applicator team and workload distribution
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

      {/* Team Stats */}
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
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Total Team Members</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {teamMembers.length}
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
                  <p className="text-xs md:text-sm font-medium text-gray-600">Available</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {teamMembers.filter(m => m.status === 'available').length}
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
                  <p className="text-xs md:text-sm font-medium text-gray-600">Busy</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {teamMembers.filter(m => m.status === 'busy').length}
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
                  <p className="text-xs md:text-sm font-medium text-gray-600">On Break</p>
                  <p className="text-lg md:text-xl font-semibold text-gray-900">
                    {teamMembers.filter(m => m.status === 'break').length}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Workload Distribution */}
      <Card className="p-3 md:p-4">
        <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4">Workload Distribution</h3>
        {loading ? (
          <SkeletonLoader type="card" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900">Total Jobs</h4>
                <div className="p-2 rounded-full bg-blue-100">
                  <Wrench className="w-4 h-4 text-blue-700" />
                </div>
              </div>
              <p className="text-2xl font-bold mt-2">{workloadStats.totalJobs}</p>
              <p className="text-xs text-gray-500 mt-1">All active jobs</p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900">Assigned Jobs</h4>
                <div className="p-2 rounded-full bg-green-100">
                  <CheckCircle className="w-4 h-4 text-green-700" />
                </div>
              </div>
              <p className="text-2xl font-bold mt-2">{workloadStats.assignedJobs}</p>
              <p className="text-xs text-gray-500 mt-1">Jobs with assigned teams</p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900">Unassigned Jobs</h4>
                <div className="p-2 rounded-full bg-yellow-100">
                  <AlertCircle className="w-4 h-4 text-yellow-700" />
                </div>
              </div>
              <p className="text-2xl font-bold mt-2">{workloadStats.unassignedJobs}</p>
              <p className="text-xs text-gray-500 mt-1">Jobs needing assignment</p>
            </div>
          </div>
        )}
      </Card>

      {/* Team Members Table */}
      <Card>
        <div className="p-3 md:p-4 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
            <h3 className="text-base md:text-lg font-medium text-gray-900">Team Members</h3>
            <div className="w-full sm:w-80">
              <Input
                placeholder="Search team members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                prefix={<Search size={16} className="text-gray-400" />}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader type="table" count={5} />
        ) : filteredTeamMembers.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No team members found.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[700px]">
              <Table
                headers={[
                  'Name',
                  'Role',
                  'Status',
                  'Jobs Assigned',
                  'Availability',
                  'Actions',
                ]}
                data={filteredTeamMembers}
                renderRow={(member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {member.role}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(member.status)}
                        <Badge variant={getStatusBadgeVariant(member.status)}>
                          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {member.jobs_assigned}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${member.jobs_assigned === 0 ? 'bg-green-600' :
                            member.jobs_assigned <= 3 ? 'bg-blue-600' : 'bg-yellow-600'
                            }`}
                          style={{ width: `${Math.min(100, member.jobs_assigned * 20)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          Message
                        </Button>
                        <Button size="sm" variant="ghost">
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Workload Visualization */}
      <Card className="p-3 md:p-4">
        <h3 className="text-base md:text-lg font-medium text-gray-900 mb-4">Team Workload</h3>
        {loading ? (
          <SkeletonLoader type="card" />
        ) : (
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-900">
                  {member.name}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{member.jobs_assigned} jobs</span>
                    <span>
                      {member.jobs_assigned === 0 ? 'Light' :
                        member.jobs_assigned <= 3 ? 'Moderate' : 'Heavy'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${member.jobs_assigned === 0 ? 'bg-green-600' :
                        member.jobs_assigned <= 3 ? 'bg-blue-600' : 'bg-yellow-600'
                        }`}
                      style={{ width: `${Math.min(100, member.jobs_assigned * 20)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Information Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">Status Legend</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center">
              <CheckCircle size={14} className="text-green-600 mr-2" />
              <span>Available - Ready for assignments</span>
            </li>
            <li className="flex items-center">
              <Clock size={14} className="text-yellow-600 mr-2" />
              <span>Busy - Currently working on jobs</span>
            </li>
            <li className="flex items-center">
              <AlertCircle size={14} className="text-red-600 mr-2" />
              <span>On Break - Not available for work</span>
            </li>
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">Workload Levels</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center">
              <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
              <span>Light (0 jobs) - Underloaded</span>
            </li>
            <li className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
              <span>Moderate (1-3 jobs) - Optimal load</span>
            </li>
            <li className="flex items-center">
              <div className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></div>
              <span>Heavy (4+ jobs) - Overloaded</span>
            </li>
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Adjust team member availability</li>
            <li>• Rebalance workload distribution</li>
            <li>• Send team notifications</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default TeamManagement;