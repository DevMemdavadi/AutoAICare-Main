import AdminDashboard from '@/pages/admin/Dashboard';
import { render } from '@testing-library/react';

// Mock all dependencies
vi.mock('@/contexts/BranchContext', () => ({
  useBranch: () => ({
    isSuperAdmin: false,
    isBranchAdmin: true,
    getCurrentBranchId: () => 1,
    getCurrentBranchName: () => 'Test Branch',
    selectedBranch: null,
    branches: [],
    initialized: true
  })
}));

vi.mock('@/pages/utils/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} })
  }
}));

vi.mock('@/components/ui', () => ({
  Card: ({ title, children }) => <div>{children}</div>
}));

vi.mock('lucide-react', () => ({
  Calendar: () => <div />,
  CheckCircle: () => <div />,
  Clock: () => <div />,
  IndianRupee: () => <div />,
  Star: () => <div />,
  TrendingUp: () => <div />,
  Users: () => <div />,
  Wrench: () => <div />,
  Building2: () => <div />,
  BarChart: () => <div />,
  Briefcase: () => <div />,
  Download: () => <div />,
  Eye: () => <div />,
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  Link: ({ children }) => <div>{children}</div>,
}));

describe('AdminDashboard', () => {
  test('renders without crashing', () => {
    // Just test that it renders without throwing errors
    expect(() => {
      render(<AdminDashboard />);
    }).not.toThrow();
  });
});