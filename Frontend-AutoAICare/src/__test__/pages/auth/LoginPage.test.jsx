import LoginPage from '@/pages/auth/LoginPage';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue({}),
    logout: vi.fn(),
    user: null,
    loading: false
  })
}));

describe('LoginPage', () => {
  test('renders login form elements', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Check that the main elements are present
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com or +1234567890')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    // expect(screen.getByText('Sign up')).toBeInTheDocument(); // Commented out in actual component
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });
});