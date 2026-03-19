import { BranchProvider } from '@/contexts/BranchContext';
import BranchManagement from '@/pages/admin/BranchManagement';
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

describe('BranchManagement Page', () => {
  test('renders the page without crashing', () => {
    expect(() => {
      render(
        <BrowserRouter>
          <BranchProvider>
            <BranchManagement />
          </BranchProvider>
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});