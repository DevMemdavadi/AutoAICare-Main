import { createWebSocketUrl, getWebSocketUrl, WS_STATES } from '@/utils/websocket';

describe('WebSocket Utility Functions', () => {
  beforeEach(() => {
    // Mock window.location for testing
    delete window.location;
    window.location = {
      protocol: 'https:',
      host: 'localhost:3000',
    };
  });

  describe('getWebSocketUrl', () => {
    test('returns correct WebSocket URL for HTTPS', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          host: 'localhost:3000',
        },
        writable: true,
      });

      const url = getWebSocketUrl();
      expect(url).toBe('wss://localhost:3000');
    });

    test('returns correct WebSocket URL for HTTP', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          host: 'localhost:3000',
        },
        writable: true,
      });

      const url = getWebSocketUrl();
      expect(url).toBe('ws://localhost:3000');
    });

    test('uses current host for WebSocket URL', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          host: 'example.com',
        },
        writable: true,
      });

      const url = getWebSocketUrl();
      expect(url).toBe('wss://example.com');
    });
  });

  describe('createWebSocketUrl', () => {
    test('creates WebSocket URL with token for HTTPS', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          host: 'localhost:3000',
        },
        writable: true,
      });

      const url = createWebSocketUrl('mock-token');
      expect(url).toBe('wss://localhost:3000/ws/notifications/?token=mock-token');
    });

    test('creates WebSocket URL with token for HTTP', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          host: 'localhost:3000',
        },
        writable: true,
      });

      const url = createWebSocketUrl('mock-token');
      expect(url).toBe('ws://localhost:3000/ws/notifications/?token=mock-token');
    });

    test('includes token in URL parameter', () => {
      const url = createWebSocketUrl('test-token-123');
      expect(url).toContain('token=test-token-123');
    });
  });

  describe('WS_STATES', () => {
    test('contains all expected connection states', () => {
      expect(WS_STATES).toHaveProperty('CONNECTING');
      expect(WS_STATES).toHaveProperty('CONNECTED');
      expect(WS_STATES).toHaveProperty('DISCONNECTED');
      expect(WS_STATES).toHaveProperty('ERROR');
      expect(WS_STATES).toHaveProperty('RECONNECTING');
    });

    test('has correct state values', () => {
      expect(WS_STATES.CONNECTING).toBe('connecting');
      expect(WS_STATES.CONNECTED).toBe('connected');
      expect(WS_STATES.DISCONNECTED).toBe('disconnected');
      expect(WS_STATES.ERROR).toBe('error');
      expect(WS_STATES.RECONNECTING).toBe('reconnecting');
    });
  });
});