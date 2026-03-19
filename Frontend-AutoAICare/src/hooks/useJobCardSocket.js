/**
 * Custom React hook for real-time job card updates via WebSocket
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWebSocketUrl, WS_STATES } from '../utils/websocket';

export const useJobCardSocket = (jobCardId, callbacks = {}) => {
    const { accessToken } = useAuth();
    const [connectionState, setConnectionState] = useState(WS_STATES.DISCONNECTED);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);

    const MAX_RECONNECT_ATTEMPTS = 5;
    const INITIAL_RECONNECT_DELAY = 1000;

    const {
        onNoteAdded,
        onNoteUpdated,
        onTaskCreated,
        onTaskUpdated,
        onStatusChanged,
        onPhotoUploaded,
        onActivityLogged,
        onAssignmentChanged,
        onTimerPaused,
        onTimerResumed,
        onJobCardUpdated,
    } = callbacks;

    const handleMessage = useCallback((event) => {
        try {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'connection_established':
                    console.log('JobCard WebSocket connected:', message.message);
                    break;
                case 'note_added':
                    if (onNoteAdded) onNoteAdded(message.data);
                    break;
                case 'note_updated':
                    if (onNoteUpdated) onNoteUpdated(message.data);
                    break;
                case 'task_created':
                    if (onTaskCreated) onTaskCreated(message.data);
                    break;
                case 'task_updated':
                    if (onTaskUpdated) onTaskUpdated(message.data);
                    break;
                case 'status_changed':
                    if (onStatusChanged) onStatusChanged(message.data);
                    break;
                case 'photo_uploaded':
                    if (onPhotoUploaded) onPhotoUploaded(message.data);
                    break;
                case 'activity_logged':
                    if (onActivityLogged) onActivityLogged(message.data);
                    break;
                case 'assignment_changed':
                    if (onAssignmentChanged) onAssignmentChanged(message.data);
                    break;
                case 'timer_paused':
                    if (onTimerPaused) onTimerPaused(message.data);
                    break;
                case 'timer_resumed':
                    if (onTimerResumed) onTimerResumed(message.data);
                    break;
                case 'jobcard_updated':
                    if (onJobCardUpdated) onJobCardUpdated(message.data);
                    break;
                case 'pong':
                    // Heartbeat response
                    break;
                default:
                    console.log('Unknown job card message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing job card WebSocket message:', error);
        }
    }, [onNoteAdded, onNoteUpdated, onTaskCreated, onTaskUpdated, onStatusChanged, onPhotoUploaded, onActivityLogged, onAssignmentChanged, onTimerPaused, onTimerResumed, onJobCardUpdated]);

    const connect = useCallback(() => {
        if (!accessToken || !jobCardId) return;

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const baseUrl = getWebSocketUrl();
            const wsUrl = `${baseUrl}/ws/jobcard/${jobCardId}/?token=${accessToken}`;

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
            console.error('Error creating job card WebSocket:', error);
            setConnectionState(WS_STATES.ERROR);
        }
    }, [accessToken, jobCardId, handleMessage]);

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
        if (accessToken && jobCardId) {
            connect();
        }
        return () => {
            disconnect();
        };
    }, [accessToken, jobCardId]);

    return { connectionState, reconnect: connect, disconnect };
};
