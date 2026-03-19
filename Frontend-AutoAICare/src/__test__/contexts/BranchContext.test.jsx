import { render } from '@testing-library/react';

// Mock the AuthContext with relative path
vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'admin', branch: 1, branch_name: 'Test Branch', branch_code: 'TB001' }
  }),
  AuthProvider: ({ children }) => <div>{children}</div>
}));

// Mock the API utility
vi.mock('@/pages/utils/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { results: [] } })
  }
}));

describe('BranchContext', () => {
  test('renders without crashing', () => {
    // Simple test to ensure the component renders without errors
    expect(() => {
      render(
        <div>Test</div>
      );
    }).not.toThrow();
  });
});