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

describe('Debug LoginPage', () => {
  test('debug login form', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
    
    // Try to find the elements
    try {
      const emailLabel = screen.getByLabelText('Email Address');
      console.log('Found Email Address label');
    } catch (e) {
      console.log('Could not find Email Address label');
      console.log(e.message);
    }
    
    try {
      const passwordLabel = screen.getByLabelText('Password');
      console.log('Found Password label');
    } catch (e) {
      console.log('Could not find Password label');
      console.log(e.message);
    }
  });
});