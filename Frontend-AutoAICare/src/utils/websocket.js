/**
 * WebSocket utility functions for real-time notifications
 */

/**
 * Get WebSocket URL based on environment.
 * 
 * In production, WebSocket connections must go through the API server
 * (api.autoaicare.com) where Nginx proxies /ws/ to Daphne (port 8021).
 * Tenant subdomains (e.g. shineauto.autoaicare.com) serve the frontend
 * but do NOT have WebSocket proxy configuration.
 * 
 * We derive the WS host from VITE_API_URL to ensure connections always
 * reach Daphne, regardless of which subdomain the user is on.
 * 
 * @returns {string} WebSocket base URL (e.g. wss://api.autoaicare.com)
 */
export const getWebSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL; // e.g. "https://api.autoaicare.com/api"

    if (apiUrl) {
        try {
            const url = new URL(apiUrl);
            const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
            // Use the API server's host (api.autoaicare.com) for WebSocket
            return `${protocol}://${url.host}`;
        } catch (e) {
            console.warn('Failed to parse VITE_API_URL for WebSocket, falling back to window.location:', e);
        }
    }

    // Fallback: use current page host (works for local dev on localhost)
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}`;
};

/**
 * Create WebSocket URL with authentication token
 * @param {string} token - JWT access token
 * @returns {string} Complete WebSocket URL with token
 */
export const createWebSocketUrl = (token) => {
    const baseUrl = getWebSocketUrl();
    return `${baseUrl}/ws/notifications/?token=${token}`;
};

/**
 * WebSocket connection states
 */
export const WS_STATES = {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
    RECONNECTING: 'reconnecting',
};
