/**
 * Custom React hook for real-time timer updates via WebSocket
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWebSocketUrl, WS_STATES } from '../utils/websocket';

export const useTimerSocket = (callbacks = {}) => {
    const { accessToken, user } = useAuth();
    const [connectionState, setConnectionState] = useState(WS_STATES.DISCONNECTED);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);

    const MAX_RECONNECT_ATTEMPTS = 5;
    const INITIAL_RECONNECT_DELAY = 1000;

    const {
        onTimerWarning15Min,
        onTimerWarning10Min,
        onTimerWarning7Min,
        onTimerWarning5Min,
        onTimerWarning3Min,
        onTimerWarning2Min,
        onTimerWarning,
        onTimerCritical,
        onTimerOverdue,
        onTimerUpdated,
        onTimerStarted,
        onTimerStopped,
    } = callbacks;

    const handleMessage = useCallback((event) => {
        try {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'connection_established':
                    console.log('Timer WebSocket connected:', message.message);
                    break;

                // Handle all warning thresholds
                case 'timer_warning_15min':
                    console.log('⚠️ Timer Warning (15min):', message.data);
                    if (onTimerWarning15Min) onTimerWarning15Min(message.data);
                    break;
                case 'timer_warning_10min':
                    console.log('⚠️ Timer Warning (10min):', message.data);
                    if (onTimerWarning10Min) onTimerWarning10Min(message.data);
                    break;
                case 'timer_warning_7min':
                    console.log('⚠️ Timer Warning (7min):', message.data);
                    if (onTimerWarning7Min) onTimerWarning7Min(message.data);
                    break;
                case 'timer_warning_5min':
                    console.log('⚠️ Timer Warning (5min):', message.data);
                    if (onTimerWarning5Min) onTimerWarning5Min(message.data);
                    break;
                case 'timer_warning_3min':
                    console.log('⚠️ Timer Warning (3min):', message.data);
                    if (onTimerWarning3Min) onTimerWarning3Min(message.data);
                    break;
                case 'timer_warning_2min':
                    console.log('⚠️ Timer Warning (2min):', message.data);
                    if (onTimerWarning2Min) onTimerWarning2Min(message.data);
                    break;

                // Legacy warning handler
                case 'timer_warning':
                    console.log('⚠️ Timer Warning:', message.data);
                    if (onTimerWarning) onTimerWarning(message.data);
                    break;

                case 'timer_critical':
                    console.log('🔴 Timer Critical:', message.data);
                    if (onTimerCritical) onTimerCritical(message.data);
                    break;
                case 'timer_overdue':
                    console.log('❌ Timer Overdue:', message.data);
                    if (onTimerOverdue) onTimerOverdue(message.data);
                    break;
                case 'timer_updated':
                    if (onTimerUpdated) onTimerUpdated(message.data);
                    break;
                case 'timer_started':
                    if (onTimerStarted) onTimerStarted(message.data);
                    break;
                case 'timer_stopped':
                    if (onTimerStopped) onTimerStopped(message.data);
                    break;
                case 'pong':
                    // Heartbeat response
                    break;
                default:
                    console.log('Unknown timer message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing timer WebSocket message:', error);
        }
    }, [
        onTimerWarning15Min,
        onTimerWarning10Min,
        onTimerWarning7Min,
        onTimerWarning5Min,
        onTimerWarning3Min,
        onTimerWarning2Min,
        onTimerWarning,
        onTimerCritical,
        onTimerOverdue,
        onTimerUpdated,
        onTimerStarted,
        onTimerStopped
    ]);

    const connect = useCallback(() => {
        if (!accessToken || !user) return;

        // Only staff roles should connect to timer socket
        const staffRoles = ['supervisor', 'floor_manager', 'admin', 'branch_admin', 'super_admin', 'applicator', 'staff'];
        if (!staffRoles.includes(user.role)) {
            return;
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const baseUrl = getWebSocketUrl();
            const wsUrl = `${baseUrl}/ws/timers/?token=${accessToken}`;

            setConnectionState(WS_STATES.CONNECTING);
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                setConnectionState(WS_STATES.CONNECTED);
                reconnectAttemptsRef.current = 0;
            };

            wsRef.current.onmessage = handleMessage;

            wsRef.current.onerror = () => {
                setConnectionState(WS_STATES.ERROR);
            };

            wsRef.current.onclose = () => {
                setConnectionState(WS_STATES.DISCONNECTED);

                // Auto-reconnect
                if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current += 1;
                        connect();
                    }, delay);
                }
            };
        } catch (error) {
            console.error('Error creating timer WebSocket:', error);
            setConnectionState(WS_STATES.ERROR);
        }
    }, [accessToken, user, handleMessage]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setConnectionState(WS_STATES.DISCONNECTED);
    }, []);

    useEffect(() => {
        if (accessToken && user) {
            connect();
        }
        return () => {
            disconnect();
        };
    }, [accessToken, user?.id]);

    return { connectionState, reconnect: connect, disconnect };
};
