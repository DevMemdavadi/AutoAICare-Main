import { Alert, Badge, Button, Card, Select, SkeletonLoader } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Wrench,
  BarChart3,
  PieChart
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
);

const PerformanceMetrics = () => {
  const { user } = useAuth();

  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Mock data for charts
  const [performanceData, setPerformanceData] = useState({
    jobsCompleted: [],
    qcTime: [],
    failureRate: [],
    teamPerformance: []
  });

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange]);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data based on time range
      let jobsCompletedData, qcTimeData, failureRateData, teamPerformanceData;

      if (timeRange === 'day') {
        jobsCompletedData = {
          labels: ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM'],
          datasets: [
            {
              label: 'Jobs Completed',
              data: [2, 3, 5, 4, 6, 7, 5, 4, 3],
              borderColor: 'rgb(54, 162, 235)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              tension: 0.3
            }
          ]
        };

        qcTimeData = {
          labels: ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM'],
          datasets: [
            {
              label: 'Avg QC Time (mins)',
              data: [15, 18, 12, 20, 16, 14, 17, 19, 13],
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              tension: 0.3
            }
          ]
        };
      } else if (timeRange === 'week') {
        jobsCompletedData = {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Jobs Completed',
              data: [24, 28, 32, 26, 30, 22, 18],
              borderColor: 'rgb(54, 162, 235)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              tension: 0.3
            }
          ]
        };

        qcTimeData = {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Avg QC Time (mins)',
              data: [18, 16, 15, 19, 17, 20, 22],
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              tension: 0.3
            }
          ]
        };

        failureRateData = {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'QC Failure Rate (%)',
              data: [8, 5, 7, 6, 4, 10, 12],
              borderColor: 'rgb(255, 205, 86)',
              backgroundColor: 'rgba(255, 205, 86, 0.2)',
              tension: 0.3
            }
          ]
        };
      } else {
        jobsCompletedData = {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            {
              label: 'Jobs Completed',
              data: [120, 135, 142, 138, 156, 148],
              borderColor: 'rgb(54, 162, 235)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              tension: 0.3
            }
          ]
        };

        qcTimeData = {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            {
              label: 'Avg QC Time (mins)',
              data: [17, 16, 15, 18, 16, 17],
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              tension: 0.3
            }
          ]
        };

        failureRateData = {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            {
              label: 'QC Failure Rate (%)',
              data: [7, 6, 5, 8, 6, 7],
              borderColor: 'rgb(255, 205, 86)',
              backgroundColor: 'rgba(255, 205, 86, 0.2)',
              tension: 0.3
            }
          ]
        };
      }

      teamPerformanceData = {
        labels: ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta'],
        datasets: [
          {
            label: 'Jobs Completed',
            data: [42, 38, 45, 35],
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 99, 132, 0.6)',
              'rgba(255, 205, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)'
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 205, 86, 1)',
              'rgba(75, 192, 192, 1)'
            ],
            borderWidth: 1
          }
        ]
      };

      setPerformanceData({
        jobsCompleted: jobsCompletedData,
        qcTime: qcTimeData,
        failureRate: failureRateData,
        teamPerformance: teamPerformanceData
      });
    } catch (err) {
      console.error('Error fetching performance data:', err);
      showAlert('error', 'Failed to load performance metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchPerformanceData();
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false
      }
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Performance Metrics</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Analyze team performance and identify bottlenecks
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3">
          {user && (
            <span className="text-xs md:text-sm text-gray-600 hidden md:inline">
              Logged in as <span className="font-semibold">{user.name}</span>
            </span>
          )}
          <div className="w-full sm:w-32">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={[
                { value: 'day', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' }
              ]}
              className="text-sm"
            />
          </div>
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

      {/* Key Metrics */}
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
                  <Wrench className="w-4 h-4 md:w-5 md:h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Jobs Completed</p>
                  <p className="text-xl md:text-2xl font-semibold text-gray-900">
                    {timeRange === 'day' ? '30' : timeRange === 'week' ? '180' : '720'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2 flex items-center">
                <TrendingUp size={12} className="mr-1" />
                12% increase from last period
              </p>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-green-100 w-fit">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Avg QC Time</p>
                  <p className="text-xl md:text-2xl font-semibold text-gray-900">
                    {timeRange === 'day' ? '16' : timeRange === 'week' ? '17' : '17'} mins
                  </p>
                </div>
              </div>
              <p className="text-xs text-red-600 mt-2 flex items-center">
                <TrendingUp size={12} className="mr-1" />
                2% slower than target
              </p>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-yellow-100 w-fit">
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">QC Failure Rate</p>
                  <p className="text-xl md:text-2xl font-semibold text-gray-900">
                    {timeRange === 'day' ? '8' : timeRange === 'week' ? '7' : '7'}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2 flex items-center">
                <TrendingUp size={12} className="mr-1" />
                15% improvement from last period
              </p>
            </Card>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="p-2 rounded-full bg-purple-100 w-fit">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600">Team Efficiency</p>
                  <p className="text-xl md:text-2xl font-semibold text-gray-900">
                    {timeRange === 'day' ? '85' : timeRange === 'week' ? '82' : '84'}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2 flex items-center">
                <TrendingUp size={12} className="mr-1" />
                3% improvement
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Jobs Completed Chart */}
        <Card className="p-3 md:p-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-sm md:text-base font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-600 md:hidden" />
              <BarChart3 size={18} className="text-blue-600 hidden md:block" />
              <span className="text-sm md:text-base">Jobs Completed Over Time</span>
            </h3>
          </div>
          {loading ? (
            <SkeletonLoader type="chart" />
          ) : (
            <div className="h-48 md:h-64">
              <Line data={performanceData.jobsCompleted} options={chartOptions} />
            </div>
          )}
        </Card>

        {/* QC Time Chart */}
        <Card className="p-3 md:p-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-sm md:text-base font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 size={16} className="text-red-600 md:hidden" />
              <BarChart3 size={18} className="text-red-600 hidden md:block" />
              <span className="text-sm md:text-base">Average QC Time</span>
            </h3>
          </div>
          {loading ? (
            <SkeletonLoader type="chart" />
          ) : (
            <div className="h-48 md:h-64">
              <Line data={performanceData.qcTime} options={chartOptions} />
            </div>
          )}
        </Card>

        {/* Failure Rate Chart */}
        <Card className="p-3 md:p-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-sm md:text-base font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 size={16} className="text-yellow-600 md:hidden" />
              <BarChart3 size={18} className="text-yellow-600 hidden md:block" />
              <span className="text-sm md:text-base">QC Failure Rate</span>
            </h3>
          </div>
          {loading ? (
            <SkeletonLoader type="chart" />
          ) : (
            <div className="h-48 md:h-64">
              <Line data={performanceData.failureRate} options={chartOptions} />
            </div>
          )}
        </Card>

        {/* Team Performance Chart */}
        <Card className="p-3 md:p-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-sm md:text-base font-medium text-gray-900 flex items-center gap-2">
              <PieChart size={16} className="text-purple-600 md:hidden" />
              <PieChart size={18} className="text-purple-600 hidden md:block" />
              <span className="text-sm md:text-base">Team Performance</span>
            </h3>
          </div>
          {loading ? (
            <SkeletonLoader type="chart" />
          ) : (
            <div className="h-48 md:h-64">
              <Bar data={performanceData.teamPerformance} options={chartOptions} />
            </div>
          )}
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="p-3 md:p-4">
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Bottleneck Analysis</h3>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-2 md:p-3 bg-yellow-50 rounded-lg">
              <div>
                <p className="text-sm md:text-base font-medium text-gray-900">Afternoon Rush</p>
                <p className="text-xs md:text-sm text-gray-600">2-4 PM peak hours</p>
              </div>
              <Badge variant="warning">High Wait</Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-2 md:p-3 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm md:text-base font-medium text-gray-900">Complex Packages</p>
                <p className="text-xs md:text-sm text-gray-600">Premium detailing services</p>
              </div>
              <Badge variant="destructive">Slow Processing</Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-2 md:p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm md:text-base font-medium text-gray-900">Experienced Technicians</p>
                <p className="text-xs md:text-sm text-gray-600">Senior team members</p>
              </div>
              <Badge variant="success">Fast Completion</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4">
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Quality Insights</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-xs md:text-sm text-gray-600">First-Time Pass Rate</span>
              <span className="text-sm md:text-base font-medium">88%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs md:text-sm text-gray-600">Common Defects</span>
              <span className="text-sm md:text-base font-medium">Scratch Missed (32%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs md:text-sm text-gray-600">Re-work Requests</span>
              <span className="text-sm md:text-base font-medium">12%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs md:text-sm text-gray-600">Customer Satisfaction</span>
              <span className="text-sm md:text-base font-medium">4.7/5.0</span>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4">
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Improvement Suggestions</h3>
          <ul className="space-y-2 text-xs md:text-sm text-gray-600">
            <li className="flex items-start">
              <CheckCircle size={14} className="text-green-600 mr-2 mt-0.5 flex-shrink-0 md:hidden" />
              <CheckCircle size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0 hidden md:block" />
              <span>Increase staffing during afternoon rush hours</span>
            </li>
            <li className="flex items-start">
              <CheckCircle size={14} className="text-green-600 mr-2 mt-0.5 flex-shrink-0 md:hidden" />
              <CheckCircle size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0 hidden md:block" />
              <span>Provide additional training for complex packages</span>
            </li>
            <li className="flex items-start">
              <CheckCircle size={14} className="text-green-600 mr-2 mt-0.5 flex-shrink-0 md:hidden" />
              <CheckCircle size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0 hidden md:block" />
              <span>Implement checklist reminders for common oversights</span>
            </li>
            <li className="flex items-start">
              <CheckCircle size={14} className="text-green-600 mr-2 mt-0.5 flex-shrink-0 md:hidden" />
              <CheckCircle size={16} className="text-green-600 mr-2 mt-0.5 flex-shrink-0 hidden md:block" />
              <span>Schedule regular equipment maintenance</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Information Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="p-3 md:p-4">
          <h3 className="text-sm md:text-base font-medium text-gray-900 mb-2">Metric Definitions</h3>
          <ul className="text-xs md:text-sm text-gray-600 space-y-1">
            <li>• <strong>Jobs Completed:</strong> Total QC processes finished</li>
            <li>• <strong>Avg QC Time:</strong> Time from start to completion</li>
            <li>• <strong>Failure Rate:</strong> Percentage of rejected QC reports</li>
            <li>• <strong>Team Efficiency:</strong> Productivity score</li>
          </ul>
        </Card>

        <Card className="p-3 md:p-4">
          <h3 className="text-sm md:text-base font-medium text-gray-900 mb-2">Benchmark Targets</h3>
          <ul className="text-xs md:text-sm text-gray-600 space-y-1">
            <li>• Avg QC Time: &lt;15 minutes</li>
            <li>• Failure Rate: &lt;5%</li>
            <li>• First-Time Pass: &gt;90%</li>
            <li>• Customer Satisfaction: &gt;4.5/5.0</li>
          </ul>
        </Card>

        <Card className="p-3 md:p-4">
          <h3 className="text-sm md:text-base font-medium text-gray-900 mb-2">Reporting Schedule</h3>
          <ul className="text-xs md:text-sm text-gray-600 space-y-1">
            <li>• Daily reports: 6:00 PM</li>
            <li>• Weekly summary: Every Monday</li>
            <li>• Monthly review: 1st of each month</li>
            <li>• Quarterly analysis: Executive review</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceMetrics;