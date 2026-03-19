import { BranchProvider } from '@/contexts/BranchContext';
import CustomersStaff from '@/pages/admin/CustomersStaff';
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

describe('CustomersStaff Page', () => {
  test('renders the page without crashing', () => {
    expect(() => {
      render(
        <BrowserRouter>
          <BranchProvider>
            <CustomersStaff />
          </BranchProvider>
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});