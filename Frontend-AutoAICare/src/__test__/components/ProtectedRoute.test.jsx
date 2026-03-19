import ProtectedRoute from '@/components/ProtectedRoute';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const TestComponent = () => <div>Protected Content</div>;

// Mock the UI components
vi.mock('@/components/ui', () => ({
  Loader: () => <div data-testid="loader">Loading...</div>
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to}>Navigate to {to}</div>
  };
});

// Mock AuthContext at the top level
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

describe('ProtectedRoute', () => {
  test('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'admin' },
      loading: false
    });
    
    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['admin']}>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  test('redirects to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false
    });
    
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
  });

  test('shows loader when loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true
    });
    
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  test('redirects when user role is not allowed', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'customer' },
      loading: false
    });
    
    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['admin']}>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
  });
});