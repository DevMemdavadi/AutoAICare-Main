/**
 * Timer Context for managing real-time timer alerts across the application
 * Supports multi-stage warnings: 15, 10, 7, 5, 3, 2, 1 minutes, and overdue
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useTimerSocket } from '../hooks/useTimerSocket';
import { WS_STATES } from '../utils/websocket';

const TimerContext = createContext(null);

export const useTimers = () => {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error('useTimers must be used within TimerProvider');
    }
    return context;
};

export const TimerProvider = ({ children }) => {
    const { user } = useAuth();
    const [timerAlerts, setTimerAlerts] = useState([]);
    const [overdueJobs, setOverdueJobs] = useState([]);
    const [warningJobs, setWarningJobs] = useState([]);
    const [criticalJobs, setCriticalJobs] = useState([]);
    const [audioContext, setAudioContext] = useState(null);

    // Initialize AudioContext on first user interaction
    useEffect(() => {
        const initAudioContext = () => {
            if (!audioContext) {
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    setAudioContext(ctx);
                    console.log('✅ AudioContext initialized');
                    // Remove listener after first interaction
                    document.removeEventListener('click', initAudioContext);
                    document.removeEventListener('keydown', initAudioContext);
                } catch (error) {
                    console.error('❌ Failed to initialize AudioContext:', error);
                }
            }
        };

        // Listen for user interaction to initialize AudioContext
        document.addEventListener('click', initAudioContext);
        document.addEventListener('keydown', initAudioContext);

        return () => {
            document.removeEventListener('click', initAudioContext);
            document.removeEventListener('keydown', initAudioContext);
        };
    }, [audioContext]);

    // Progressive sound frequencies for different warning levels
    const SOUND_FREQUENCIES = {
        15: 440,   // A4 - soft
        10: 523,   // C5 - moderate
        7: 587,    // D5 - moderate-high
        5: 659,    // E5 - high
        3: 784,    // G5 - urgent
        2: 880,    // A5 - very urgent
        1: 988,    // B5 - critical
        overdue: 1047  // C6 - maximum urgency
    };

    // Play alert sound with progressive urgency
    const playAlertSound = useCallback(async (threshold = 5, type = 'warning') => {
        try {
            // Use existing audioContext or create a new one
            let ctx = audioContext;
            if (!ctx) {
                ctx = new (window.AudioContext || window.webkitAudioContext)();
                setAudioContext(ctx);
            }

            // Resume AudioContext if suspended (browser autoplay policy)
            if (ctx.state === 'suspended') {
                await ctx.resume();
                console.log('🔊 AudioContext resumed');
            }

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Get frequency based on threshold
            let frequency = SOUND_FREQUENCIES[threshold] || 440;

            // Use higher frequency for critical and overdue
            if (type === 'critical') {
                frequency = SOUND_FREQUENCIES[1];
                oscillator.type = 'square';
            } else if (type === 'overdue') {
                frequency = SOUND_FREQUENCIES.overdue;
                oscillator.type = 'square';
            } else {
                oscillator.type = 'sine';
            }

            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.5);

            console.log(`🔊 Playing ${type} sound at ${frequency} Hz for ${threshold} min threshold`);
        } catch (error) {
            console.error('❌ Could not play alert sound:', error);
            console.error('Error details:', error.message);
        }
    }, [audioContext]);

    // Generic handler for all warning levels
    const handleWarningLevel = useCallback((data, threshold) => {
        console.log(`⚠️ Timer Warning (${threshold}min) received:`, data);

        const alert = {
            id: `warning-${threshold}min-${data.job_id}-${Date.now()}`,
            type: threshold <= 2 ? 'critical' : 'warning',
            threshold: threshold,
            jobId: data.job_id,
            message: data.message,
            remainingMinutes: data.remaining_minutes,
            vehicleInfo: data.vehicle_info,
            customerName: data.customer_name,
            timestamp: new Date(),
        };

        setTimerAlerts(prev => [...prev, alert]);

        // Update appropriate job list
        if (threshold <= 2) {
            setCriticalJobs(prev => {
                if (!prev.find(j => j.id === data.job_id)) {
                    return [...prev, { id: data.job_id, ...data, threshold }];
                }
                return prev;
            });
            // Remove from warning list
            setWarningJobs(prev => prev.filter(j => j.id !== data.job_id));
        } else {
            setWarningJobs(prev => {
                if (!prev.find(j => j.id === data.job_id)) {
                    return [...prev, { id: data.job_id, ...data, threshold }];
                }
                return prev;
            });
        }

        playAlertSound(threshold, threshold <= 2 ? 'critical' : 'warning');

        // Show browser notification
        if (Notification.permission === 'granted') {
            const emoji = threshold <= 2 ? '🔴' : '⚠️';
            const urgency = threshold <= 2 ? 'CRITICAL' : 'WARNING';
            new Notification(`${emoji} ${urgency}: Job Timer - ${threshold} Minutes`, {
                body: data.message,
                icon: '/warning-icon.png',
                tag: `timer-warning-${threshold}min-${data.job_id}`,
                requireInteraction: threshold <= 2,
            });
        }
    }, [playAlertSound]);

    // Handlers for each warning level
    const handleTimer15Min = useCallback((data) => handleWarningLevel(data, 15), [handleWarningLevel]);
    const handleTimer10Min = useCallback((data) => handleWarningLevel(data, 10), [handleWarningLevel]);
    const handleTimer7Min = useCallback((data) => handleWarningLevel(data, 7), [handleWarningLevel]);
    const handleTimer5Min = useCallback((data) => handleWarningLevel(data, 5), [handleWarningLevel]);
    const handleTimer3Min = useCallback((data) => handleWarningLevel(data, 3), [handleWarningLevel]);
    const handleTimer2Min = useCallback((data) => handleWarningLevel(data, 2), [handleWarningLevel]);

    // Handle timer warning (legacy - maps to 5 minutes)
    const handleTimerWarning = useCallback((data) => {
        handleWarningLevel(data, data.threshold || 5);
    }, [handleWarningLevel]);

    // Handle critical timer warning (1 minute remaining)
    const handleTimerCritical = useCallback((data) => {
        console.log('🔴 Timer CRITICAL (1min) received:', data);

        const alert = {
            id: `critical-1min-${data.job_id}-${Date.now()}`,
            type: 'critical',
            threshold: 1,
            jobId: data.job_id,
            message: data.message,
            remainingMinutes: data.remaining_minutes,
            vehicleInfo: data.vehicle_info,
            customerName: data.customer_name,
            timestamp: new Date(),
        };

        setTimerAlerts(prev => [...prev, alert]);
        setCriticalJobs(prev => {
            if (!prev.find(j => j.id === data.job_id)) {
                return [...prev, { id: data.job_id, ...data, threshold: 1 }];
            }
            return prev;
        });

        // Remove from warning list
        setWarningJobs(prev => prev.filter(j => j.id !== data.job_id));

        playAlertSound(1, 'critical');

        // Show browser notification
        if (Notification.permission === 'granted') {
            new Notification('🔴 CRITICAL: Job Timer - 1 Minute', {
                body: data.message,
                icon: '/critical-icon.png',
                tag: `timer-critical-${data.job_id}`,
                requireInteraction: true,
            });
        }
    }, [playAlertSound]);

    // Handle timer overdue
    const handleTimerOverdue = useCallback((data) => {
        console.log('❌ Timer OVERDUE received:', data);

        const alert = {
            id: `overdue-${data.job_id}-${Date.now()}`,
            type: 'overdue',
            jobId: data.job_id,
            message: data.message,
            overdueMinutes: data.overdue_minutes,
            vehicleInfo: data.vehicle_info,
            customerName: data.customer_name,
            timestamp: new Date(),
        };

        setTimerAlerts(prev => [...prev, alert]);
        setOverdueJobs(prev => {
            if (!prev.find(j => j.id === data.job_id)) {
                return [...prev, { id: data.job_id, ...data }];
            }
            return prev;
        });

        // Remove from warning and critical lists
        setWarningJobs(prev => prev.filter(j => j.id !== data.job_id));
        setCriticalJobs(prev => prev.filter(j => j.id !== data.job_id));

        playAlertSound('overdue', 'overdue');

        // Show browser notification
        if (Notification.permission === 'granted') {
            new Notification('❌ OVERDUE: Job Timer', {
                body: data.message,
                icon: '/overdue-icon.png',
                tag: `timer-overdue-${data.job_id}`,
                requireInteraction: true,
            });
        }
    }, [playAlertSound]);

    // Handle timer updates
    const handleTimerUpdated = useCallback((data) => {
        console.log('Timer Updated:', data);
    }, []);

    // Handle timer started
    const handleTimerStarted = useCallback((data) => {
        console.log('Timer Started:', data);
    }, []);

    // Handle timer stopped
    const handleTimerStopped = useCallback((data) => {
        console.log('Timer Stopped:', data);
        // Remove job from all tracking lists
        setWarningJobs(prev => prev.filter(j => j.id !== data.job_id));
        setCriticalJobs(prev => prev.filter(j => j.id !== data.job_id));
        setOverdueJobs(prev => prev.filter(j => j.id !== data.job_id));
    }, []);

    // Connect to timer WebSocket with all handlers
    const { connectionState } = useTimerSocket({
        onTimerWarning15Min: handleTimer15Min,
        onTimerWarning10Min: handleTimer10Min,
        onTimerWarning7Min: handleTimer7Min,
        onTimerWarning5Min: handleTimer5Min,
        onTimerWarning3Min: handleTimer3Min,
        onTimerWarning2Min: handleTimer2Min,
        onTimerWarning: handleTimerWarning,  // Legacy handler
        onTimerCritical: handleTimerCritical,
        onTimerOverdue: handleTimerOverdue,
        onTimerUpdated: handleTimerUpdated,
        onTimerStarted: handleTimerStarted,
        onTimerStopped: handleTimerStopped,
    });

    // Clear a specific alert
    const clearAlert = useCallback((alertId) => {
        setTimerAlerts(prev => prev.filter(a => a.id !== alertId));
    }, []);

    // Clear all alerts
    const clearAllAlerts = useCallback(() => {
        setTimerAlerts([]);
    }, []);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const value = {
        timerAlerts,
        overdueJobs,
        warningJobs,
        criticalJobs,
        clearAlert,
        clearAllAlerts,
        connectionState,
        isConnected: connectionState === WS_STATES.CONNECTED,
    };

    return (
        <TimerContext.Provider value={value}>
            {children}
        </TimerContext.Provider>
    );
};

export default TimerContext;

