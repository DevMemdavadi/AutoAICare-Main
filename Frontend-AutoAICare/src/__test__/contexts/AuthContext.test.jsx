import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { render, screen, waitFor } from '@testing-library/react';
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

// Mock the api utility
vi.mock('@/utils/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  }
}));

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Test component to consume the context
const TestComponent = ({ onContextValue }) => {
  const contextValue = useAuth();
  
  if (onContextValue) {
    onContextValue(contextValue);
  }
  
  return (
    <div>
      <span data-testid="loading">{contextValue.loading.toString()}</span>
      <span data-testid="has-user">{!!contextValue.user}</span>
      {contextValue.user && <span data-testid="user-name">{contextValue.user.name}</span>}
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  test('provides initial context values', () => {
    const contextValues = {};
    
    render(
      <AuthProvider>
        <TestComponent onContextValue={(value) => Object.assign(contextValues, value)} />
      </AuthProvider>
    );
    
    expect(contextValues).toHaveProperty('user');
    expect(contextValues).toHaveProperty('accessToken');
    expect(contextValues).toHaveProperty('loading');
    expect(contextValues).toHaveProperty('login');
    expect(contextValues).toHaveProperty('logout');
    expect(contextValues).toHaveProperty('register');
    expect(contextValues).toHaveProperty('verifyOTP');
    expect(contextValues).toHaveProperty('forgotPassword');
    expect(contextValues).toHaveProperty('resetPassword');
    expect(contextValues).toHaveProperty('setUser');
  });

  test('loads user from localStorage on mount', async () => {
    const mockUser = { id: 1, name: 'John Doe', role: 'admin' };
    const mockToken = 'mock-access-token';
    
    localStorageMock.getItem
      .mockReturnValueOnce(JSON.stringify(mockUser))
      .mockReturnValueOnce(mockToken);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    });
    
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  test('handles login successfully', async () => {
    const mockUser = { id: 1, name: 'Jane Doe', role: 'customer' };
    
    const { default: apiMock } = await import('@/utils/api');
    apiMock.post.mockResolvedValue({
      data: { access: 'new-token', refresh: 'new-refresh', user: mockUser }
    });
    
    localStorageMock.getItem.mockReturnValue(null);
    
    const contextValues = {};
    render(
      <AuthProvider>
        <TestComponent onContextValue={(value) => Object.assign(contextValues, value)} />
      </AuthProvider>
    );
    
    // Call login function
    const loginResult = await contextValues.login('jane@example.com', 'password123');
    
    expect(loginResult).toEqual({ success: true });
    expect(apiMock.post).toHaveBeenCalledWith('/auth/login/', { email: 'jane@example.com', password: 'password123' });
    expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'new-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
  });

  test('handles login failure', async () => {
    const { default: apiMock } = await import('@/utils/api');
    apiMock.post.mockRejectedValue({
      response: {
        data: { error: 'Invalid credentials' }
      }
    });
    
    localStorageMock.getItem.mockReturnValue(null);
    
    const contextValues = {};
    render(
      <AuthProvider>
        <TestComponent onContextValue={(value) => Object.assign(contextValues, value)} />
      </AuthProvider>
    );
    
    const loginResult = await contextValues.login('invalid@example.com', 'wrongpassword');
    
    expect(loginResult).toEqual({ success: false, error: 'Invalid credentials' });
  });
});