import { Button, Card } from '@/components/ui';
import { AlertCircle, Bell, CheckCircle, Clock, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';

const CustomerNotifications = () => {
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
        return <CheckCircle size={20} className="text-green-600" />;
      case 'payment_failed':
      case 'booking_cancelled':
        return <AlertCircle size={20} className="text-red-600" />;
      case 'job_in_progress':
      case 'job_started':
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

  const handleNotificationClick = (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.related_jobcard_id) {
      // Navigate to job tracking with jobcard ID to auto-open the modal
      navigate(`/customer/track?jobcardId=${notification.related_jobcard_id}`);
    } else if (notification.related_booking_id) {
      // Navigate to job tracking with booking ID to auto-open the modal
      navigate(`/customer/track?bookingId=${notification.related_booking_id}`);
    } else if (notification.related_invoice_id) {
      // Navigate to payments page (invoices are shown there)
      navigate(`/customer/payments`);
    } else {
      // Default: navigate to job tracking
      navigate(`/customer/track`);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">Stay updated with your service status and important updates</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </span>
          <Button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            variant="outline"
          >
            Mark all as read
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { key: 'all', label: 'All Notifications' },
            { key: 'unread', label: 'Unread' },
            { key: 'read', label: 'Read' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${filter === key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-blue-50 border-blue-200' : ''
                }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-1">
                  {getIcon(notification.notification_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                        {notification.title}
                      </h3>
                      <p className="text-gray-600 mt-1">{notification.message}</p>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                        title="Mark as read"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock size={14} />
                      <span>{getTimeAgo(notification.created_at)}</span>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${notification.notification_type === 'job_completed' || notification.notification_type === 'payment_success'
                      ? 'bg-green-100 text-green-800'
                      : notification.notification_type === 'payment_failed' || notification.notification_type === 'booking_cancelled'
                        ? 'bg-red-100 text-red-800'
                        : notification.notification_type === 'job_in_progress' || notification.notification_type === 'job_started'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                      {notification.notification_type_display || notification.notification_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
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

export default CustomerNotifications;

