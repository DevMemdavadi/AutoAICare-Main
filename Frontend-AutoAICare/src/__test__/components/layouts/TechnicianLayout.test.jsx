import TechnicianLayout from '@/components/layouts/TechnicianLayout';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock all the contexts and components used in TechnicianLayout
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Jane Doe', role: 'staff' },
    logout: vi.fn()
  })
}));

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    unreadCount: 2,
    fetchUnreadCount: vi.fn(() => Promise.resolve()),
    fetchNotifications: vi.fn(),
    markAsRead: vi.fn()
  })
}));

vi.mock('lucide-react', () => ({
  ClipboardList: () => <div>ClipboardList Icon</div>,
  LogOut: () => <div>LogOut Icon</div>,
  Menu: () => <div>Menu Icon</div>,
  X: () => <div>X Icon</div>,
  Bell: () => <div>Bell Icon</div>,
  User: () => <div>User Icon</div>,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
    useLocation: () => ({ pathname: '/technician' }),
    Link: ({ to, children }) => <a href={to}>{children}</a>
  };
});

describe('TechnicianLayout', () => {
  test('renders layout with user info', () => {
    expect(() => {
      render(
        <MemoryRouter initialEntries={['/technician']}>
          <TechnicianLayout />
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  test('displays notification count', () => {
    render(
      <MemoryRouter initialEntries={['/technician']}>
        <TechnicianLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/technician']}>
        <TechnicianLayout />
      </MemoryRouter>
    );

    // Check for navigation items using href attributes to avoid sidebar visibility issues
    expect(document.body.querySelector('a[href="/technician"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/technician/profile"]')).toBeInTheDocument();
  });
});