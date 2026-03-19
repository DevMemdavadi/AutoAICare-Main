import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { WS_STATES } from '../utils/websocket';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const audioContextRef = useRef(null);
  const fallbackIntervalRef = useRef(null);
  const [useWebSocketEnabled, setUseWebSocketEnabled] = useState(true);

  const SOUND_PATTERNS = useMemo(() => ({
    default: [
      { freq: 880, duration: 160, gain: 0.18 },
    ],
    doubleBeep: [
      { freq: 780, duration: 140, gain: 0.2 },
      { freq: 920, duration: 140, gain: 0.2 },
    ],
    successTune: [
      { freq: 660, duration: 150, gain: 0.18 },
      { freq: 880, duration: 180, gain: 0.18 },
      { freq: 990, duration: 220, gain: 0.16 },
    ],
    errorTone: [
      { freq: 360, duration: 250, gain: 0.22, type: 'sawtooth' },
      { freq: 260, duration: 250, gain: 0.2, type: 'sawtooth' },
    ],
    softDing: [
      { freq: 1040, duration: 220, gain: 0.12, type: 'triangle' },
    ],
    alertBurst: [
      { freq: 1200, duration: 120, gain: 0.25 },
      { freq: 900, duration: 120, gain: 0.25 },
      { freq: 1200, duration: 120, gain: 0.25 },
    ],
  }), []);

  const SOUND_MAP = useMemo(() => ({
    booking_created: 'doubleBeep',
    booking_confirmed: 'doubleBeep',
    technician_assigned: 'softDing',
    payment_success: 'successTune',
    payment_failed: 'errorTone',
    job_started: 'softDing',
    job_in_progress: 'softDing',
    job_completed: 'successTune',
    job_warning: 'alertBurst',
    job_overdue: 'errorTone',
    invoice_created: 'softDing',
    urgent_admin_message: 'alertBurst',
    admin_alert: 'alertBurst',
    feedback_request: 'softDing',
    job_status_update: 'softDing',
    new_booking_alert: 'doubleBeep',
    booking_cancelled_alert: 'errorTone',
    ready_for_delivery_alert: 'successTune',
    default: 'default',
  }), []);

  const playNotificationSound = useCallback((notificationType = 'default') => {
    try {
      console.log('🔔 Playing notification sound for type:', notificationType);

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn('AudioContext not supported in this browser');
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;
      console.log('AudioContext state before playing:', ctx.state);

      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          console.log('AudioContext resumed from suspended state');
        });
      }

      const patternKey = SOUND_MAP[notificationType] || SOUND_MAP.default;
      const pattern = SOUND_PATTERNS[patternKey] || SOUND_PATTERNS.default;

      let cursor = ctx.currentTime;

      pattern.forEach(step => {
        const { freq, duration, gain = 0.18, type = 'sine' } = step;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, cursor);

        gainNode.gain.setValueAtTime(gain, cursor);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, cursor + duration / 1000);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(cursor);
        oscillator.stop(cursor + duration / 1000);

        cursor += (duration + 40) / 1000; // slight gap between tones
      });

      console.log('✅ Notification sound played successfully');
    } catch (error) {
      console.error('❌ Error playing notification sound:', error);
    }
  }, [SOUND_MAP, SOUND_PATTERNS]);

  // Handle incoming WebSocket notification
  const handleWebSocketNotification = useCallback((notificationData) => {
    console.log('Received WebSocket notification:', notificationData);

    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => n.id === notificationData.id);
      if (exists) {
        return prev;
      }

      // Add new notification to the top
      return [notificationData, ...prev];
    });

    // Update unread count
    if (!notificationData.is_read) {
      setUnreadCount(prev => prev + 1);
    }

    // Show browser notification with click handler
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(notificationData.title, {
        body: notificationData.message,
        icon: '/favicon.ico',
        tag: `notification-${notificationData.id}`,
        requireInteraction: false,
      });

      // Add click handler to navigate to the related location
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();

        // Determine the navigation path based on user role and notification data
        let path = null;

        if (notificationData.related_jobcard_id) {
          // Determine role-based path for job cards
          if (user?.role === 'supervisor') {
            path = `/supervisor/job/${notificationData.related_jobcard_id}`;
          } else if (user?.role === 'floor_manager') {
            path = `/floor-manager/job/${notificationData.related_jobcard_id}`;
          } else if (user?.role === 'staff') {
            path = `/technician/job/${notificationData.related_jobcard_id}`;
          } else if (user?.role === 'applicator') {
            path = `/applicator/job/${notificationData.related_jobcard_id}`;
          } else if (user?.role === 'customer') {
            // Use query parameter for customer to auto-open the modal
            path = `/customer/track?jobcardId=${notificationData.related_jobcard_id}`;
          } else if (['super_admin', 'branch_admin'].includes(user?.role)) {
            path = `/admin/jobcards/${notificationData.related_jobcard_id}`;
          }
        } else if (notificationData.related_booking_id) {
          if (user?.role === 'customer') {
            // Navigate to job tracking with booking ID
            path = `/customer/track?bookingId=${notificationData.related_booking_id}`;
          } else if (['super_admin', 'branch_admin'].includes(user?.role)) {
            path = `/admin/bookings`;
          }
        } else if (notificationData.related_invoice_id) {
          if (user?.role === 'customer') {
            // Navigate to payments page where invoices are shown
            path = `/customer/payments`;
          } else if (['super_admin', 'branch_admin'].includes(user?.role)) {
            path = `/admin/accounting`;
          }
        }

        // Navigate to the path if determined
        // Use window.location.href for browser notifications to ensure navigation works
        // even when the app is in the background
        if (path) {
          window.location.href = path;
        }

        notification.close();
      };
    }

    // Play sound
    playNotificationSound(notificationData.notification_type);
  }, [playNotificationSound, user]);

  // WebSocket connection
  const { connectionState, reconnect: reconnectWebSocket } = useWebSocket(
    useWebSocketEnabled && user && (user.role === 'customer' || ['super_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator', 'staff'].includes(user.role)) ? accessToken : null,
    handleWebSocketNotification
  );

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!user || (user.role !== 'customer' && !['super_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator', 'staff'].includes(user.role))) return;

    try {
      if (!silent) setLoading(true);
      const response = await api.get('/notify/in-app/');
      const fetchedNotifications = response.data.results || response.data || [];

      setNotifications(fetchedNotifications.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      ));

      setLastFetchTime(new Date());
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user || (user.role !== 'customer' && !['super_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator', 'staff'].includes(user.role))) return;

    try {
      const response = await api.get('/notify/in-app/unread_count/');
      const count = response.data.unread_count || 0;
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      await api.post(`/notify/in-app/${id}/mark_as_read/`);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/notify/in-app/mark_all_as_read/');
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  // Fallback polling when WebSocket is not connected
  useEffect(() => {
    if (!user || (user.role !== 'customer' && !['super_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator', 'staff'].includes(user.role))) {
      return;
    }

    // If WebSocket is in error state, enable fallback polling
    if (connectionState === WS_STATES.ERROR || connectionState === WS_STATES.DISCONNECTED) {
      console.log('WebSocket not available, using fallback polling');

      const poll = () => {
        fetchNotifications(true);
        fetchUnreadCount();
      };

      // Poll every 10 seconds as fallback
      fallbackIntervalRef.current = setInterval(poll, 10000);

      return () => {
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
      };
    }
  }, [user, connectionState, fetchNotifications, fetchUnreadCount]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Initialize AudioContext on first user interaction to bypass autoplay policy
  useEffect(() => {
    const initAudioContext = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
          console.log('AudioContext initialized on user interaction, state:', audioContextRef.current.state);
        }

        // Resume if suspended
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
            console.log('AudioContext resumed, state:', audioContextRef.current.state);
          });
        }

        // Remove listeners after first successful initialization
        if (audioContextRef.current.state === 'running') {
          window.removeEventListener('click', initAudioContext);
          window.removeEventListener('keydown', initAudioContext);
          window.removeEventListener('touchstart', initAudioContext);
        }
      } catch (error) {
        console.error('Error initializing AudioContext:', error);
      }
    };

    // Listen for user interactions to initialize AudioContext
    window.addEventListener('click', initAudioContext);
    window.addEventListener('keydown', initAudioContext);
    window.addEventListener('touchstart', initAudioContext);

    return () => {
      window.removeEventListener('click', initAudioContext);
      window.removeEventListener('keydown', initAudioContext);
      window.removeEventListener('touchstart', initAudioContext);
    };
  }, []);

  // Initial fetch when user logs in
  useEffect(() => {
    if (user && (user.role === 'customer' || ['super_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator', 'staff'].includes(user.role))) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  // Refresh notifications manually
  const refreshNotifications = useCallback(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    loading,
    lastFetchTime,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    fetchNotifications,
    fetchUnreadCount,
    connectionState,
    reconnectWebSocket,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

