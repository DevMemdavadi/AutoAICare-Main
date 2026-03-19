import { Button, Card } from '@/components/ui';
import NotificationDetails from '@/components/NotificationDetails';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { useNotifications } from '@/contexts/NotificationContext';
import { AlertCircle, Bell, CheckCircle, FileText, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SupervisorNotifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // all, unread, read

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  } = useNotifications();

  // Refresh notifications when component mounts (only once)
  useEffect(() => {
    refreshNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'job_warning':
        return <AlertCircle size={20} className="text-yellow-600" />;
      case 'job_overdue':
        return <AlertCircle size={20} className="text-red-600" />;
      case 'job_created':
        return <FileText size={20} className="text-blue-600" />;
      case 'job_started':
        return <Play size={20} className="text-green-600" />;
      case 'job_completed':
        return <CheckCircle size={20} className="text-green-600" />;
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

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHrs > 0) return `${diffHrs}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  });

  if (loading && notifications.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <SkeletonLoader type="header" />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonLoader type="card" className="h-10 w-32" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <SkeletonLoader type="tabs" className="h-12" />

        {/* Notifications List Skeleton */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <SkeletonLoader key={i} type="notification-item" />
          ))}
        </div>
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
            { key: 'read', label: 'Read' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`
                whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs md:text-sm uppercase tracking-widest transition-all
                ${filter === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'unread'
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications at this time."}
            </p>
          </Card>
        ) : (
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
                    // Navigate to related job if available
                    try {
                      if (notification.related_jobcard_id) {
                        navigate(`/supervisor/job/${notification.related_jobcard_id}`);
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
        )}
      </div>
    </div>
  );
};

export default SupervisorNotifications;