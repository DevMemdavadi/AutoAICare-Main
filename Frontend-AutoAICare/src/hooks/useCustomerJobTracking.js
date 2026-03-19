/**
 * Custom React hook for customer job tracking via WebSocket
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWebSocketUrl, WS_STATES } from '../utils/websocket';

export const useCustomerJobTracking = (jobCardId, callbacks = {}) => {
    const { accessToken } = useAuth();
    const [connectionState, setConnectionState] = useState(WS_STATES.DISCONNECTED);
    const [jobData, setJobData] = useState(null);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);

    const MAX_RECONNECT_ATTEMPTS = 5;
    const INITIAL_RECONNECT_DELAY = 1000;

    const {
        onStatusChanged,
        onProgressUpdated,
        onTaskApprovalRequired,
        onTaskUpdated,
        onPhotoUploaded,
        onActivityLogged,
        onNoteAdded,
    } = callbacks;

    const handleMessage = useCallback((event) => {
        try {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'connection_established':
                    console.log('✅ Customer Job Tracking connected:', message.message);
                    if (message.job_data) {
                        setJobData(message.job_data);
                        setPendingApprovals(message.job_data.pending_approvals || []);
                    }
                    break;

                case 'status_changed':
                    console.log('🔄 Status changed:', message.data);
                    if (onStatusChanged) onStatusChanged(message.data);
                    if (message.data.status) {
                        setJobData(prev => ({ ...prev, status: message.data.status }));
                    }
                    break;

                case 'progress_updated':
                    console.log('📊 Progress updated:', message.data);
                    if (onProgressUpdated) onProgressUpdated(message.data);
                    if (message.data.progress_percentage !== undefined) {
                        setJobData(prev => ({
                            ...prev,
                            progress_percentage: message.data.progress_percentage
                        }));
                    }
                    break;

                case 'task_approval_required':
                    console.log('⚠️ Task approval required:', message.data);
                    if (onTaskApprovalRequired) onTaskApprovalRequired(message.data);
                    // Add to pending approvals
                    setPendingApprovals(prev => {
                        const task = message.data.task || message.data;
                        if (!prev.find(t => t.id === task.id)) {
                            return [...prev, task];
                        }
                        return prev;
                    });
                    break;

                case 'task_updated':
                    console.log('✏️ Task updated:', message.data);
                    if (onTaskUpdated) onTaskUpdated(message.data);
                    // Update or remove from pending approvals
                    setPendingApprovals(prev => {
                        const task = message.data.task || message.data;
                        if (task.approved_by_customer) {
                            return prev.filter(t => t.id !== task.id);
                        }
                        return prev.map(t => t.id === task.id ? task : t);
                    });
                    break;

                case 'photo_uploaded':
                    console.log('📸 Photo uploaded:', message.data);
                    if (onPhotoUploaded) onPhotoUploaded(message.data);
                    break;

                case 'activity_logged':
                    console.log('📝 Activity logged:', message.data);
                    if (onActivityLogged) onActivityLogged(message.data);
                    break;

                case 'note_added':
                    console.log('💬 Note added:', message.data);
                    if (onNoteAdded) onNoteAdded(message.data);
                    break;

                case 'pong':
                    // Heartbeat response
                    break;

                default:
                    console.log('Unknown customer tracking message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing customer tracking WebSocket message:', error);
        }
    }, [onStatusChanged, onProgressUpdated, onTaskApprovalRequired, onTaskUpdated, onPhotoUploaded, onActivityLogged, onNoteAdded]);

    const connect = useCallback(() => {
        if (!accessToken || !jobCardId) return;

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const baseUrl = getWebSocketUrl();
            const wsUrl = `${baseUrl}/ws/customer/job/${jobCardId}/?token=${accessToken}`;

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
            console.error('Error creating customer tracking WebSocket:', error);
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

    const approveTask = useCallback((taskId) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'approve_task',
                task_id: taskId,
            }));

            // Optimistically update local state
            setPendingApprovals(prev => prev.filter(t => t.id !== taskId));
        }
    }, []);

    useEffect(() => {
        if (accessToken && jobCardId) {
            connect();
        }
        return () => {
            disconnect();
        };
    }, [accessToken, jobCardId]);

    return {
        connectionState,
        jobData,
        pendingApprovals,
        approveTask,
        reconnect: connect,
        disconnect
    };
};
