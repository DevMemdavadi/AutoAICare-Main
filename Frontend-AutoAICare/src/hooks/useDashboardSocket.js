/**
 * Custom React hook for real-time dashboard updates via WebSocket
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWebSocketUrl, WS_STATES } from '../utils/websocket';

export const useDashboardSocket = (callbacks = {}) => {
    const { accessToken, user } = useAuth();
    const [connectionState, setConnectionState] = useState(WS_STATES.DISCONNECTED);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);

    const MAX_RECONNECT_ATTEMPTS = 5;
    const INITIAL_RECONNECT_DELAY = 1000;

    const {
        onMetricsUpdated,
        onJobListUpdated,
        onPriorityAlert,
        onBookingCreated,
        onAssignmentUpdate,
    } = callbacks;

    const handleMessage = useCallback((event) => {
        try {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'connection_established':
                    console.log('Dashboard WebSocket connected:', message.message);
                    break;
                case 'metrics_updated':
                    if (onMetricsUpdated) onMetricsUpdated(message.data);
                    break;
                case 'job_list_updated':
                    if (onJobListUpdated) onJobListUpdated(message.data);
                    break;
                case 'priority_alert':
                    console.log('🔔 Priority Alert:', message.data);
                    if (onPriorityAlert) onPriorityAlert(message.data);
                    break;
                case 'booking_created':
                    if (onBookingCreated) onBookingCreated(message.data);
                    break;
                case 'booking_update':
                    if (callbacks.onBookingUpdated) callbacks.onBookingUpdated(message.data);
                    break;
                case 'assignment_update':
                    if (onAssignmentUpdate) onAssignmentUpdate(message.data);
                    break;
                case 'pong':
                    // Heartbeat response
                    break;
                default:
                    console.log('Unknown dashboard message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing dashboard WebSocket message:', error);
        }
    }, [onMetricsUpdated, onJobListUpdated, onPriorityAlert, onBookingCreated, onAssignmentUpdate]);

    const connect = useCallback(() => {
        if (!accessToken || !user) return;

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const baseUrl = getWebSocketUrl();
            const wsUrl = `${baseUrl}/ws/dashboard/?token=${accessToken}`;

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
            console.error('Error creating dashboard WebSocket:', error);
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
