import Accounting from '@/pages/admin/Accounting';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'admin' },
    loading: false
  }),
  AuthProvider: ({ children }) => <div>{children}</div>
}));

// Mock the BranchContext
vi.mock('@/contexts/BranchContext', () => ({
  useBranch: () => ({
    branches: [],
    selectedBranch: null,
    setSelectedBranch: vi.fn(),
    isSuperAdmin: false,
    isBranchAdmin: true,
    getCurrentBranchId: vi.fn(),
    getCurrentBranchName: vi.fn(),
    showBranchFilter: vi.fn(),
    getBranchFilterParams: vi.fn(),
    fetchBranches: vi.fn(),
    loading: false,
    initialized: true
  }),
  BranchProvider: ({ children }) => <div>{children}</div>
}));

// Mock react-chartjs-2 components
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Accounting Page', () => {
  test('renders the page without crashing', () => {
    localStorageMock.getItem
      .mockReturnValueOnce(JSON.stringify({ role: 'admin' }))
      .mockReturnValueOnce('mock-token');
      
    expect(() => {
      render(
        <BrowserRouter>
          <Accounting />
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});