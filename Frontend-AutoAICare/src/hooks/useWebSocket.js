/**
 * Custom React hook for managing WebSocket connections
 *
 * Fixes applied:
 * 1. Stale closure bug — connectRef always points to the latest connect fn
 * 2. Faster reconnect on server-initiated close (1 s first attempt stays as-is)
 * 3. Heartbeat timeout: if no pong within 10s, treat connection as dead and reconnect
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createWebSocketUrl, WS_STATES } from '../utils/websocket';

export const useWebSocket = (token, onMessage) => {
    const [connectionState, setConnectionState] = useState(WS_STATES.DISCONNECTED);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const heartbeatIntervalRef = useRef(null);
    const heartbeatTimeoutRef = useRef(null); // NEW: pong watchdog
    const isManuallyClosedRef = useRef(false);

    // Keep a stable ref to the latest connect fn to avoid stale closures
    const connectRef = useRef(null);

    const MAX_RECONNECT_ATTEMPTS = 10;
    const INITIAL_RECONNECT_DELAY = 1000; // 1 second
    const MAX_RECONNECT_DELAY = 30000;    // 30 seconds
    const HEARTBEAT_INTERVAL = 25000;     // 25 seconds (slightly below typical proxy timeout)
    const PONG_TIMEOUT = 10000;           // 10 seconds to receive pong before declaring dead

    const getReconnectDelay = useCallback(() => {
        return Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
            MAX_RECONNECT_DELAY
        );
    }, []);

    const stopHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
        if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = null;
        }
    }, []);

    const sendHeartbeat = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'ping',
                timestamp: new Date().toISOString(),
            }));

            // Watchdog: if we don't get a pong within PONG_TIMEOUT, the connection is dead
            heartbeatTimeoutRef.current = setTimeout(() => {
                console.warn('WebSocket pong timeout — forcing reconnect');
                if (wsRef.current) {
                    wsRef.current.close(); // triggers onclose → reconnect
                }
            }, PONG_TIMEOUT);
        }
    }, []);

    const startHeartbeat = useCallback(() => {
        stopHeartbeat();
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    }, [sendHeartbeat, stopHeartbeat]);

    const connect = useCallback(() => {
        if (!token) {
            return;
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return;
        }

        // Clear any pending reconnect before opening a new socket
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        try {
            const wsUrl = createWebSocketUrl(token);
            console.log('WebSocket connecting:', wsUrl.replace(token, 'TOKEN_HIDDEN'));

            setConnectionState(WS_STATES.CONNECTING);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket connected ✅');
                setConnectionState(WS_STATES.CONNECTED);
                reconnectAttemptsRef.current = 0;
                isManuallyClosedRef.current = false;
                startHeartbeat();
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Pong received — clear the watchdog timer
                    if (data.type === 'pong') {
                        if (heartbeatTimeoutRef.current) {
                            clearTimeout(heartbeatTimeoutRef.current);
                            heartbeatTimeoutRef.current = null;
                        }
                        return;
                    }

                    if (data.type === 'connection_established') {
                        console.log('WebSocket connection established:', data.message);
                        return;
                    }

                    // Dispatch global event for any component to listen
                    window.dispatchEvent(new CustomEvent('websocket-message', { detail: data }));

                    if (data.type === 'notification' && onMessage) {
                        onMessage(data.data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnectionState(WS_STATES.ERROR);
            };

            ws.onclose = (event) => {
                console.log('WebSocket closed:', event.code, event.reason);
                setConnectionState(WS_STATES.DISCONNECTED);
                stopHeartbeat();

                // Only reconnect if not manually closed and we have attempts left
                if (!isManuallyClosedRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    const delay = getReconnectDelay();
                    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

                    setConnectionState(WS_STATES.RECONNECTING);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current += 1;
                        // Use connectRef.current to avoid stale closure capturing old token/callbacks
                        connectRef.current?.();
                    }, delay);
                } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                    console.error('Max WebSocket reconnection attempts reached');
                    setConnectionState(WS_STATES.ERROR);
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            setConnectionState(WS_STATES.ERROR);
        }
    }, [token, onMessage, getReconnectDelay, startHeartbeat, stopHeartbeat]);

    // Always keep connectRef pointing to the latest connect function
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    const disconnect = useCallback(() => {
        isManuallyClosedRef.current = true;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        stopHeartbeat();

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setConnectionState(WS_STATES.DISCONNECTED);
        reconnectAttemptsRef.current = 0;
    }, [stopHeartbeat]);

    const reconnect = useCallback(() => {
        disconnect();
        reconnectAttemptsRef.current = 0;
        isManuallyClosedRef.current = false;
        setTimeout(() => connectRef.current?.(), 100);
    }, [disconnect]);

    // Auto-connect when token becomes available
    useEffect(() => {
        if (token) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        connectionState,
        reconnect,
        disconnect,
    };
};
