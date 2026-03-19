/**
 * WebSocket Connection Status Indicator
 * Shows the current WebSocket connection state with visual feedback
 */

import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { WS_STATES } from '../utils/websocket';
import './WebSocketStatus.css';

const WebSocketStatus = () => {
    const { connectionState, reconnectWebSocket } = useNotifications();

    const getStatusInfo = () => {
        switch (connectionState) {
            case WS_STATES.CONNECTED:
                return {
                    color: '#10b981',
                    icon: '●',
                    text: 'Live',
                    description: 'Real-time notifications active'
                };
            case WS_STATES.CONNECTING:
                return {
                    color: '#f59e0b',
                    icon: '◐',
                    text: 'Connecting',
                    description: 'Establishing connection...'
                };
            case WS_STATES.RECONNECTING:
                return {
                    color: '#f59e0b',
                    icon: '◐',
                    text: 'Reconnecting',
                    description: 'Attempting to reconnect...'
                };
            case WS_STATES.DISCONNECTED:
                return {
                    color: '#6b7280',
                    icon: '○',
                    text: 'Disconnected',
                    description: 'Using fallback mode'
                };
            case WS_STATES.ERROR:
                return {
                    color: '#ef4444',
                    icon: '✕',
                    text: 'Error',
                    description: 'Connection failed'
                };
            default:
                return {
                    color: '#6b7280',
                    icon: '○',
                    text: 'Unknown',
                    description: 'Status unavailable'
                };
        }
    };

    const status = getStatusInfo();

    return (
        <div className="websocket-status" title={status.description}>
            <span
                className="status-indicator"
                style={{ color: status.color }}
            >
                {status.icon}
            </span>
            <span className="status-text">{status.text}</span>

            {(connectionState === WS_STATES.ERROR || connectionState === WS_STATES.DISCONNECTED) && (
                <button
                    className="reconnect-button"
                    onClick={reconnectWebSocket}
                    title="Attempt to reconnect"
                >
                    ↻
                </button>
            )}
        </div>
    );
};

export default WebSocketStatus;
