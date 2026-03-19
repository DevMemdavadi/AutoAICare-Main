import SupervisorLayout from '@/components/layouts/SupervisorLayout';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock all the contexts and components used in SupervisorLayout
vi.mock('@/components/BranchSelector', () => ({
  default: () => <div data-testid="branch-selector">Branch Selector</div>
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Bob Supervisor', role: 'supervisor' },
    logout: vi.fn()
  })
}));

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    unreadCount: 3,
    fetchUnreadCount: vi.fn(() => Promise.resolve()),
    fetchNotifications: vi.fn(),
    markAsRead: vi.fn()
  })
}));

vi.mock('lucide-react', () => ({
  LayoutDashboard: () => <div>LayoutDashboard Icon</div>,
  Briefcase: () => <div>Briefcase Icon</div>,
  FileCheck: () => <div>FileCheck Icon</div>,
  LogOut: () => <div>LogOut Icon</div>,
  Bell: () => <div>Bell Icon</div>,
  Search: () => <div>Search Icon</div>,
  Menu: () => <div>Menu Icon</div>,
  X: () => <div>X Icon</div>,
  User: () => <div>User Icon</div>,
  Calendar: () => <div>Calendar Icon</div>,
  BarChart: () => <div>BarChart Icon</div>,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
    useLocation: () => ({ pathname: '/supervisor' }),
    Link: ({ to, children }) => <a href={to}>{children}</a>
  };
});

describe('SupervisorLayout', () => {
  test('renders layout with user info', () => {
    render(
      <MemoryRouter initialEntries={['/supervisor/dashboard']}>
        <SupervisorLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('Bob Supervisor')).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  test('displays notification count', () => {
    render(
      <MemoryRouter initialEntries={['/supervisor/dashboard']}>
        <SupervisorLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/supervisor/dashboard']}>
        <SupervisorLayout />
      </MemoryRouter>
    );

    // Check for navigation items using href attributes to avoid sidebar visibility issues
    expect(document.body.querySelector('a[href="/supervisor/dashboard"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/supervisor/leave-management"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/supervisor/performance"]')).toBeInTheDocument();
  });
});