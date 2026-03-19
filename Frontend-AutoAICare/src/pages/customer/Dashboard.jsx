import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Car, Award, Plus, Clock, CheckCircle, Building2 } from 'lucide-react';
import api from '@/utils/api';
import { Card } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    upcomingBookings: 0,
    completedServices: 0,
    rewardPoints: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [bookingsRes, customerRes] = await Promise.all([
        api.get('/bookings/'),
        api.get('/customers/me/'),
      ]);

      const bookings = bookingsRes.data.results || [];
      const upcoming = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed');
      const completed = bookings.filter(b => b.status === 'completed');

      setStats({
        upcomingBookings: upcoming.length,
        completedServices: completed.length,
        rewardPoints: customerRes.data.reward_points || 0,
      });

      setUpcomingBookings(upcoming.slice(0, 3));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl md:text-4xl font-black text-gray-900">{value}</p>
        </div>
        <div className={`p-3 md:p-4 rounded-xl ${color} shadow-lg shadow-${color.split('-')[1] || 'primary'}/20`}>
          <Icon size={20} md:size={28} className="text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">Dashboard</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-sm md:text-base text-gray-500 font-medium">Welcome back! Here's your service overview.</p>
            {user?.branch_name && (
              <>
                <span className="hidden md:inline text-gray-300">•</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/5 rounded-full text-primary text-xs md:text-sm">
                  <Building2 size={14} />
                  <span className="font-bold tracking-tight">{user.branch_name}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <div className="col-span-1">
          <StatCard
            icon={Calendar}
            title="Bookings"
            value={stats.upcomingBookings}
            color="bg-primary"
          />
        </div>
        <div className="col-span-1">
          <StatCard
            icon={CheckCircle}
            title="Completed"
            value={stats.completedServices}
            color="bg-emerald-500"
          />
        </div>
        <div className="col-span-2 md:col-span-1">
          <StatCard
            icon={Award}
            title="Rewards"
            value={stats.rewardPoints}
            color="bg-amber-400"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 px-1">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Link
            to="/customer/book"
            className="flex flex-col items-center justify-center text-center gap-3 p-4 md:p-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-primary hover:bg-primary-50 transition-all group"
          >
            <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
              <Plus className="text-primary" size={24} md:size={28} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm md:text-base">New Booking</p>
              <p className="hidden md:block text-xs text-gray-500 mt-1">Schedule service</p>
            </div>
          </Link>

          <Link
            to="/customer/track"
            className="flex flex-col items-center justify-center text-center gap-3 p-4 md:p-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-primary hover:bg-primary-50 transition-all group"
          >
            <div className="p-3 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform">
              <Clock className="text-blue-600" size={24} md:size={28} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm md:text-base">Track Job</p>
              <p className="hidden md:block text-xs text-gray-500 mt-1">Check status</p>
            </div>
          </Link>

          <Link
            to="/customer/services"
            className="flex flex-col items-center justify-center text-center gap-3 p-4 md:p-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-primary hover:bg-primary-50 transition-all group"
          >
            <div className="p-3 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform">
              <Car className="text-purple-600" size={24} md:size={28} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm md:text-base">Packages</p>
              <p className="hidden md:block text-xs text-gray-500 mt-1">Browse services</p>
            </div>
          </Link>

          <Link
            to="/customer/store"
            className="flex flex-col items-center justify-center text-center gap-3 p-4 md:p-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-primary hover:bg-primary-50 transition-all group"
          >
            <div className="p-3 bg-amber-100 rounded-xl group-hover:scale-110 transition-transform">
              <Award className="text-amber-600" size={24} md:size={28} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm md:text-base">Store</p>
              <p className="hidden md:block text-xs text-gray-500 mt-1">Shop accessories</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <Card
        title="Upcoming Bookings"
        actions={
          <Link to="/customer/track" className="text-sm text-primary hover:underline">
            View all
          </Link>
        }
      >
        {upcomingBookings.length > 0 ? (
          <div className="space-y-4">
            {upcomingBookings.map((booking) => (
              <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl gap-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{booking.packages_details?.[0]?.name || 'Service'}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                      {new Date(booking.booking_datetime).toLocaleDateString()} • {new Date(booking.booking_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-50">
                  <span className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${booking.status === 'confirmed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                    }`}>
                    {booking.status}
                  </span>
                  <Link
                    to={`/customer/track`}
                    className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-dark transition-colors"
                  >
                    Track
                    <Plus className="rotate-[-45deg]" size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar size={48} className="mx-auto mb-3 text-gray-400" />
            <p>No upcoming bookings</p>
            <Link to="/customer/book" className="text-primary hover:underline mt-2 inline-block">
              Request an appointment now
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
