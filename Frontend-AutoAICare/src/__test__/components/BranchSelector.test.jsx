import BranchSelector from '@/components/BranchSelector';
import { render, screen } from '@testing-library/react';

// Mock the BranchContext
vi.mock('@/contexts/BranchContext', () => ({
  useBranch: () => ({
    branches: [
      { id: 1, name: 'Branch 1', code: 'B1' },
      { id: 2, name: 'Branch 2', code: 'B2' }
    ],
    selectedBranch: null,
    setSelectedBranch: vi.fn(),
    isSuperAdmin: true,
    getCurrentBranchName: () => 'All Branches'
  })
}));

describe('BranchSelector Component', () => {
  test('renders branch selector button', () => {
    render(<BranchSelector />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('displays current branch name', () => {
    render(<BranchSelector />);
    expect(screen.getByText('All Branches')).toBeInTheDocument();
  });
});