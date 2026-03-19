import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    forgotPassword: vi.fn().mockResolvedValue({ success: true })
  })
}));

// Mock react-router-dom Link
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children }) => <div>{children}</div>
  };
});

describe('ForgotPasswordPage', () => {
  test('renders without crashing', () => {
    // Simple test to ensure the component renders without errors
    expect(() => {
      render(
        <BrowserRouter>
          <ForgotPasswordPage />
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});