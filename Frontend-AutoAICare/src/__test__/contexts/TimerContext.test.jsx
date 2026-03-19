import { AuthProvider } from '@/contexts/AuthContext';
import { TimerProvider, useTimers } from '@/contexts/TimerContext';
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

// Replace localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock the useTimerSocket hook
vi.mock('@/hooks/useTimerSocket', () => ({
  useTimerSocket: vi.fn(() => ({
    connectionState: 'connected',
  }))
}));

// Mock the websocket utils
vi.mock('@/utils/websocket', () => ({
  WS_STATES: {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
    RECONNECTING: 'reconnecting',
  }
}));

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'granted',
    requestPermission: vi.fn(() => Promise.resolve('granted')),
  },
  writable: true,
});

// Mock AudioContext
window.AudioContext = vi.fn(() => ({
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { setValueAtTime: vi.fn() },
    type: 'sine',
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  })),
  currentTime: 0,
  destination: {},
}));

// Mock webkitAudioContext
window.webkitAudioContext = window.AudioContext;

// Test component to consume the context
const TestComponent = ({ onContextValue }) => {
  const contextValue = useTimers();
  
  if (onContextValue) {
    onContextValue(contextValue);
  }
  
  return <div>Test Component</div>;
};

describe('TimerContext', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    
    // Mock user data in localStorage
    localStorageMock.getItem
      .mockReturnValueOnce(JSON.stringify({ id: 1, name: 'Test User', role: 'technician' })) // user
      .mockReturnValueOnce('mock-token'); // access token
  });

  test('provides initial context values', () => {
    const contextValues = {};
    
    render(
      <MemoryRouter>
        <AuthProvider>
          <TimerProvider>
            <TestComponent onContextValue={(value) => Object.assign(contextValues, value)} />
          </TimerProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Check that all expected timer context values are available
    expect(contextValues).toHaveProperty('timerAlerts');
    expect(contextValues).toHaveProperty('overdueJobs');
    expect(contextValues).toHaveProperty('warningJobs');
    expect(contextValues).toHaveProperty('criticalJobs');
    expect(contextValues).toHaveProperty('clearAlert');
    expect(contextValues).toHaveProperty('clearAllAlerts');
    expect(contextValues).toHaveProperty('connectionState');
    expect(contextValues).toHaveProperty('isConnected');
  });

  test('should handle timer operations without crashing', () => {
    const contextValues = {};
    
    render(
      <MemoryRouter>
        <AuthProvider>
          <TimerProvider>
            <TestComponent onContextValue={(value) => Object.assign(contextValues, value)} />
          </TimerProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Test that timer functions exist and are callable
    expect(typeof contextValues.clearAlert).toBe('function');
    expect(typeof contextValues.clearAllAlerts).toBe('function');
    
    // Call the functions to ensure they don't throw errors
    expect(() => {
      contextValues.clearAlert('test-alert-id');
      contextValues.clearAllAlerts();
    }).not.toThrow();
  });
});