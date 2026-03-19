import FloorManagerLayout from '@/components/layouts/FloorManagerLayout';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock all contexts used in FloorManagerLayout
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Jane FloorManager', role: 'floor_manager', branch: 1, branch_name: 'Main Branch', branch_code: 'MB001' },
    logout: vi.fn()
  })
}));

vi.mock('@/contexts/BranchContext', () => ({
  useBranch: () => ({
    isSuperAdmin: false,
    isFloorManager: true,
    branches: [{ id: 1, name: 'Main Branch', code: 'MB001' }],
    selectedBranch: { id: 1, name: 'Main Branch', code: 'MB001' },
    getCurrentBranchName: () => 'Main Branch',
    getCurrentBranchId: () => 1,
    showBranchFilter: () => false,
    fetchBranches: vi.fn(),
    loading: false,
    initialized: true
  })
}));

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    unreadCount: 4,
    fetchUnreadCount: vi.fn(),
    fetchNotifications: vi.fn(),
    markAsRead: vi.fn()
  })
}));

// Mock all lucide-react icons used in FloorManagerLayout
vi.mock('lucide-react', () => ({
  Bell: () => <div>Bell Icon</div>,
  ClipboardList: () => <div>ClipboardList Icon</div>,
  FileText: () => <div>FileText Icon</div>,
  LogOut: () => <div>LogOut Icon</div>,
  Menu: () => <div>Menu Icon</div>,
  ShieldCheck: () => <div>ShieldCheck Icon</div>,
  CheckCircle: () => <div>CheckCircle Icon</div>,
  AlertCircle: () => <div>AlertCircle Icon</div>,
  Clock: () => <div>Clock Icon</div>,
  X: () => <div>X Icon</div>,
  Car: () => <div>Car Icon</div>,
  Users: () => <div>Users Icon</div>,
  Camera: () => <div>Camera Icon</div>,
  List: () => <div>List Icon</div>,
  AlertTriangle: () => <div>AlertTriangle Icon</div>,
  TrendingUp: () => <div>TrendingUp Icon</div>,
  UserCheck: () => <div>UserCheck Icon</div>,
  Wrench: () => <div>Wrench Icon</div>,
  Calendar: () => <div>Calendar Icon</div>,
  BarChart: () => <div>BarChart Icon</div>,
  Settings: () => <div>Settings Icon</div>,
}));

// Mock the BranchSelector component
vi.mock('@/components/BranchSelector', () => ({
  default: () => <div data-testid="branch-selector">Branch Selector</div>
}));

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
    useLocation: () => ({ pathname: '/floor-manager/dashboard' }),
    Link: ({ to, children }) => <a href={to}>{children}</a>
  };
});

describe('FloorManagerLayout', () => {
  test('renders layout with user info', () => {
    expect(() => {
      render(
        <MemoryRouter initialEntries={['/floor-manager/dashboard']}>
          <FloorManagerLayout />
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  test('displays notification count', () => {
    render(
      <MemoryRouter initialEntries={['/floor-manager/dashboard']}>
        <FloorManagerLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/floor-manager/dashboard']}>
        <FloorManagerLayout />
      </MemoryRouter>
    );

    // Check for navigation items using href attributes
    expect(document.body.querySelector('a[href="/floor-manager/dashboard"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/floor-manager/live-jobs"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/floor-manager/photos"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/floor-manager/checklists"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/floor-manager/team"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/floor-manager/performance"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/floor-manager/leave-management"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/floor-manager/my-performance"]')).toBeInTheDocument();
  });
});