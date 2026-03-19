import BranchFilter from '@/components/BranchFilter';
import { render } from '@testing-library/react';

// Mock the BranchContext
vi.mock('@/contexts/BranchContext', () => ({
  useBranch: () => ({
    branches: [
      { id: 1, name: 'Branch 1' },
      { id: 2, name: 'Branch 2' }
    ],
    selectedBranch: null,
    selectBranch: vi.fn(),
    isSuperAdmin: true
  })
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Building2: () => <div />
}));

describe('BranchFilter', () => {
  test('renders without crashing', () => {
    // Simple test to ensure the component renders without errors
    expect(() => {
      render(<BranchFilter onChange={vi.fn()} />);
    }).not.toThrow();
  });
});