import { Button, Card } from '@/components/ui';
import { AlertCircle, Bell, CheckCircle, Clock, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';

const TechnicianNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notify/in-app/');
      const fetchedNotifications = response.data.results || response.data || [];
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notify/in-app/${id}/mark_as_read/`);
      setNotifications(notifications.map(notif =>
        notif.id === id ? { ...notif, is_read: true } : notif
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notify/in-app/mark_all_as_read/');
      setNotifications(notifications.map(notif => ({ ...notif, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'job_completed':
      case 'payment_success':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'payment_failed':
      case 'booking_cancelled':
      case 'job_overdue':
        return <AlertCircle size={20} className="text-red-600" />;
      case 'job_in_progress':
      case 'job_started':
      case 'job_warning':
        return <AlertCircle size={20} className="text-yellow-600" />;
      case 'feedback_request':
        return <Info size={20} className="text-blue-600" />;
      default:
        return <Bell size={20} className="text-gray-600" />;
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
    const diffMins = Math.floor(((diffMs % 86400000) % 3600000) / 60000);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHrs > 0) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-1 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Notifications</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">Stay updated with important alerts and messages</p>
        </div>
        <div className="flex flex-row items-center justify-between md:justify-end gap-3 bg-white md:bg-transparent p-3 md:p-0 rounded-xl border border-gray-100 md:border-none shadow-sm md:shadow-none">
          <span className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest">
            {unreadCount} UNREAD
          </span>
          <Button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            variant="outline"
            className="text-xs md:text-sm h-9 md:h-10 px-4 rounded-lg shadow-sm font-bold"
          >
            Mark all read
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-md z-10 pt-2 -mx-4 px-4 md:mx-0 md:px-0">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar pb-px">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'read', label: 'Read' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`py-3 px-1 border-b-2 font-bold text-xs md:text-sm uppercase tracking-widest transition-all whitespace-nowrap min-w-max ${filter === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`group overflow-hidden rounded-2xl border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 ${!notification.is_read ? 'bg-blue-50/30 shadow-sm' : 'bg-white'}`}
              onClick={() => {
                if (!notification.is_read) {
                  markAsRead(notification.id);
                }
                // Navigate based on notification type
                if (notification.related_jobcard_id) {
                  navigate(`/technician/job/${notification.related_jobcard_id}`);
                } else if (notification.related_booking_id) {
                  navigate(`/technician/job/${notification.related_jobcard_id || notification.related_booking_id}`);
                }
              }}
            >
              <div className="relative flex flex-col sm:flex-row items-start gap-4 p-4 md:p-6">
                {!notification.is_read && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                )}
                <div className="flex-shrink-0">
                  <div className={`p-2.5 rounded-xl shadow-sm ${!notification.is_read ? 'bg-white text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                    {getIcon(notification.notification_type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className={`text-sm md:text-base pr-8 sm:pr-0 ${!notification.is_read ? 'text-blue-900 font-black' : 'text-gray-900 font-bold'
                        }`}>
                        {notification.title}
                      </h3>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Mark as read"
                      >
                        <CheckCircle size={20} />
                      </button>
                    )}
                  </div>

                  <p className="mt-1.5 text-xs md:text-sm text-gray-600 leading-relaxed font-medium">{notification.message}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-[10px] md:text-xs">
                    <div className="flex items-center gap-1.5 text-gray-400 font-bold">
                      <Clock size={12} />
                      <span>{getTimeAgo(notification.created_at)}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${notification.notification_type === 'job_completed' || notification.notification_type === 'payment_success'
                        ? 'bg-emerald-100 text-emerald-700'
                        : notification.notification_type === 'payment_failed' || notification.notification_type === 'booking_cancelled' || notification.notification_type === 'job_overdue'
                          ? 'bg-rose-100 text-rose-700'
                          : notification.notification_type === 'job_in_progress' || notification.notification_type === 'job_started' || notification.notification_type === 'job_warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                      {notification.notification_type_display || notification.notification_type.replace('_', ' ')}
                    </span>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <span className="text-gray-400 font-bold">{new Date(notification.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <Bell size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
            <p className="text-gray-500">
              {filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications at the moment."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianNotifications;