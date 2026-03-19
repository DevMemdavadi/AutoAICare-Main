import { BranchProvider } from '@/contexts/BranchContext';
import JobCards from '@/pages/admin/JobCards';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'admin' },
    loading: false
  })
}));

describe('JobCards Page', () => {
  test('renders the page without crashing', () => {
    expect(() => {
      render(
        <BrowserRouter>
          <BranchProvider>
            <JobCards />
          </BranchProvider>
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});