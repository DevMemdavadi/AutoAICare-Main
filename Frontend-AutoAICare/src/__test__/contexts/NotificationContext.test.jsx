import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: (token, onMessage) => ({
    connectionState: 'connected',
    reconnect: vi.fn()
  })
}));

// Test component to consume the context
const TestComponent = ({ onContextValue }) => {
  const contextValue = useNotifications();
  
  if (onContextValue) {
    onContextValue(contextValue);
  }
  
  return <div>Test Component</div>;
};

describe('NotificationContext', () => {
  beforeEach(() => {
    localStorageMock.getItem
      .mockReturnValueOnce(JSON.stringify({ role: 'admin' }))
      .mockReturnValueOnce('mock-token');
  });

  test('provides initial context values', () => {
    const contextValues = {};
    
    render(
      <MemoryRouter>
        <AuthProvider>
          <NotificationProvider>
            <TestComponent onContextValue={(value) => Object.assign(contextValues, value)} />
          </NotificationProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Check that all expected notification context values are available
    expect(contextValues).toHaveProperty('notifications');
    expect(contextValues).toHaveProperty('unreadCount');
    expect(contextValues).toHaveProperty('loading');
    expect(contextValues).toHaveProperty('lastFetchTime');
    expect(contextValues).toHaveProperty('markAsRead');
    expect(contextValues).toHaveProperty('markAllAsRead');
    expect(contextValues).toHaveProperty('refreshNotifications');
    expect(contextValues).toHaveProperty('fetchNotifications');
    expect(contextValues).toHaveProperty('fetchUnreadCount');
    expect(contextValues).toHaveProperty('connectionState');
    expect(contextValues).toHaveProperty('reconnectWebSocket');
  });

  test('should handle notification operations without crashing', () => {
    const contextValues = {};
    
    render(
      <MemoryRouter>
        <AuthProvider>
          <NotificationProvider>
            <TestComponent onContextValue={(value) => Object.assign(contextValues, value)} />
          </NotificationProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Test that notification functions exist and are callable
    expect(typeof contextValues.markAsRead).toBe('function');
    expect(typeof contextValues.markAllAsRead).toBe('function');
    expect(typeof contextValues.refreshNotifications).toBe('function');
    expect(typeof contextValues.fetchNotifications).toBe('function');
    expect(typeof contextValues.fetchUnreadCount).toBe('function');
    
    // Call the functions to ensure they don't throw errors
    expect(() => {
      contextValues.markAsRead(1);
      contextValues.markAllAsRead();
      contextValues.refreshNotifications();
      contextValues.fetchNotifications();
      contextValues.fetchUnreadCount();
    }).not.toThrow();
  });
});