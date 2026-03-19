import OTPVerificationPage from '@/pages/auth/OTPVerificationPage';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    verifyOTP: vi.fn().mockResolvedValue({ success: true })
  })
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({
      state: { email: 'test@example.com' }
    }),
    useNavigate: () => vi.fn()
  };
});

describe('OTPVerificationPage', () => {
  test('renders without crashing', () => {
    // Simple test to ensure the component renders without errors
    expect(() => {
      render(
        <BrowserRouter>
          <OTPVerificationPage />
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});