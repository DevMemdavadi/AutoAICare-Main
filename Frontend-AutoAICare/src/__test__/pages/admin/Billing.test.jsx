import { BranchProvider } from '@/contexts/BranchContext';
import Billing from '@/pages/admin/Billing';
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

describe('Billing Page', () => {
  test('renders the page without crashing', () => {
    expect(() => {
      render(
        <BrowserRouter>
          <BranchProvider>
            <Billing />
          </BranchProvider>
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});