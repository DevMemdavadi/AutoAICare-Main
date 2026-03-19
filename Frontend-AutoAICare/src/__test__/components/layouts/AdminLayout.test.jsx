import AdminLayout from '@/components/layouts/AdminLayout';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock all the contexts and components used in AdminLayout
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'John Doe', role: 'admin' },
    logout: vi.fn()
  })
}));

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

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    unreadCount: 5,
    fetchUnreadCount: vi.fn(),
    notifications: [],
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    refreshNotifications: vi.fn(),
    fetchNotifications: vi.fn(),
    connectionState: 'connected',
    reconnectWebSocket: vi.fn()
  })
}));

vi.mock('@/components/BranchSelector', () => ({
  default: () => <div data-testid="branch-selector">Branch Selector</div>
}));

vi.mock('lucide-react', () => ({
  BarChart3: () => <div>BarChart3 Icon</div>,
  Bell: () => <div>Bell Icon</div>,
  Building2: () => <div>Building2 Icon</div>,
  ClipboardList: () => <div>ClipboardList Icon</div>,
  Clock: () => <div>Clock Icon</div>,
  CreditCard: () => <div>CreditCard Icon</div>,
  Crown: () => <div>Crown Icon</div>,
  FileText: () => <div>FileText Icon</div>,
  Gift: () => <div>Gift Icon</div>,
  LayoutDashboard: () => <div>LayoutDashboard Icon</div>,
  LogOut: () => <div>LogOut Icon</div>,
  Megaphone: () => <div>Megaphone Icon</div>,
  Menu: () => <div>Menu Icon</div>,
  MessageSquare: () => <div>MessageSquare Icon</div>,
  Package: () => <div>Package Icon</div>,
  Settings: () => <div>Settings Icon</div>,
  ShoppingCart: () => <div>ShoppingCart Icon</div>,
  Truck: () => <div>Truck Icon</div>,
  UserPlus: () => <div>UserPlus Icon</div>,
  Users: () => <div>Users Icon</div>,
  Wrench: () => <div>Wrench Icon</div>,
  X: () => <div>X Icon</div>,
  IndianRupee: () => <div>IndianRupee Icon</div>,
  CalendarDays: () => <div>CalendarDays Icon</div>,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
    useLocation: () => ({ pathname: '/admin' }),
    Link: ({ children, to }) => <a href={to}>{children}</a>
  };
});

describe('AdminLayout', () => {
  test('renders layout with user info', () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    // Check that user information exists in the DOM
    const johnDoeElements = screen.getAllByText(/John Doe/);
    expect(johnDoeElements.length).toBeGreaterThan(0);
    
    const adminElements = screen.getAllByText(/admin/);
    expect(adminElements.length).toBeGreaterThan(0);
    
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  test('displays notification count', () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('renders branch selector', () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('branch-selector')).toBeInTheDocument();
  });
});