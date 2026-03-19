import { BranchProvider } from '@/contexts/BranchContext';
import ServiceManagement from '@/pages/admin/ServiceManagement';
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

describe('ServiceManagement Page', () => {
  test('renders the page without crashing', () => {
    expect(() => {
      render(
        <BrowserRouter>
          <BranchProvider>
            <ServiceManagement />
          </BranchProvider>
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});