import { Button, Card } from '@/components/ui';
import NotificationDetails from '@/components/NotificationDetails';
import { useNotifications } from '@/contexts/NotificationContext';
import { AlertCircle, Bell, Calendar, Info, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminNotifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  } = useNotifications();
  const [filter, setFilter] = useState('all'); // all, unread, read

  // Refresh notifications when component mounts (only once)
  useEffect(() => {
    refreshNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'job_completed':
      case 'payment_success':
      case 'ready_for_delivery_alert':
        return <Truck size={20} className="text-green-600" />;
      case 'payment_failed':
      case 'booking_cancelled':
      case 'booking_cancelled_alert':
      case 'job_overdue':
        return <AlertCircle size={20} className="text-red-600" />;
      case 'job_in_progress':
      case 'job_started':
      case 'job_warning':
        return <AlertCircle size={20} className="text-yellow-600" />;
      case 'feedback_request':
        return <Info size={20} className="text-blue-600" />;
      case 'new_booking_alert':
      case 'appointment_created':
      case 'appointment_approved':
      case 'appointment_rejected':
        return <Calendar size={20} className="text-blue-600" />;
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

  const handleNotificationClick = (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.related_jobcard_id) {
      navigate(`/admin/jobcards/${notification.related_jobcard_id}`);
    } else if (notification.related_booking_id) {
      navigate(`/admin/bookings/${notification.related_booking_id}`);
    } else if (notification.related_invoice_id) {
      navigate(`/admin/billing`);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  });

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Notifications</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">Stay updated with important alerts and messages</p>
        </div>
        <div className="flex flex-row items-center justify-between md:justify-end gap-3 bg-gray-50 md:bg-transparent p-3 md:p-0 rounded-xl border border-gray-100 md:border-none">
          <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider">
            {unreadCount} unread
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
              className={`py-3 px-1 border-b-2 font-bold text-xs md:text-sm transition-all whitespace-nowrap min-w-max uppercase tracking-widest ${filter === key
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
              className={`group overflow-hidden rounded-2xl border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 ${!notification.is_read ? 'bg-blue-50/30' : 'bg-white'}`}
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

                <div
                  className="flex-1 min-w-0 cursor-pointer w-full"
                  onClick={async () => {
                    // Mark as read on click
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                    // Navigate to related resource if available
                    try {
                      if (notification.related_jobcard_id) {
                        navigate(`/admin/jobcards/${notification.related_jobcard_id}`);
                      } else if (notification.related_booking_id) {
                        navigate(`/admin/bookings/${notification.related_booking_id}`);
                      } else if (notification.extra_data?.appointment_id) {
                        // Fetch current appointment status from API to ensure we redirect to the correct section
                        try {
                          const response = await fetch(`/api/appointments/${notification.extra_data.appointment_id}/`, {
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                            }
                          });

                          if (response.ok) {
                            const appointmentData = await response.json();
                            const currentStatus = appointmentData.status || 'pending';
                            navigate(`/admin/appointments?filter=${currentStatus}&appointmentId=${notification.extra_data.appointment_id}`);
                          } else {
                            // Fallback to stored status if API call fails
                            const appointmentStatus = notification.extra_data?.appointment_status || 'pending';
                            navigate(`/admin/appointments?filter=${appointmentStatus}&appointmentId=${notification.extra_data.appointment_id}`);
                          }
                        } catch (apiError) {
                          console.error('Error fetching appointment status:', apiError);
                          // Fallback to stored status
                          const appointmentStatus = notification.extra_data?.appointment_status || 'pending';
                          navigate(`/admin/appointments?filter=${appointmentStatus}&appointmentId=${notification.extra_data.appointment_id}`);
                        }
                      }
                    } catch (error) {
                      console.error('Navigation error:', error);
                    }
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h3 className={`text-sm md:text-base ${notification.is_read ? 'text-gray-900 font-bold' : 'text-blue-900 font-black'}`}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase tracking-widest shadow-lg shadow-blue-100">
                          New
                        </span>
                      )}
                      <span className="sm:hidden text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 uppercase tracking-tighter">
                        {getTimeAgo(notification.created_at)}
                      </span>
                    </div>
                  </div>

                  <p className="mt-1.5 text-xs md:text-sm text-gray-600 leading-relaxed">
                    {notification.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] md:text-xs">
                    <div className="flex items-center gap-1.5 text-gray-400 font-bold">
                      <Calendar size={12} />
                      <span>{new Date(notification.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-blue-400 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-50">
                      <Bell size={12} />
                      <span>{getTimeAgo(notification.created_at)}</span>
                    </div>
                    <span className="sm:hidden text-gray-300">|</span>
                    <span className="sm:hidden text-gray-400 font-bold">{new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="mt-3">
                    <NotificationDetails extraData={notification.extra_data} />
                  </div>
                </div>

                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    className="w-full sm:w-auto mt-2 sm:mt-0 text-[10px] md:text-xs font-black text-blue-600 hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest border border-blue-100 sm:border-transparent rounded-xl py-2 px-4 shadow-sm sm:shadow-none"
                  >
                    Mark read
                  </Button>
                )}
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

export default AdminNotifications;