import CustomerLayout from '@/components/layouts/CustomerLayout';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';



// Mock all the contexts and components used in CustomerLayout

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'John Doe', role: 'customer', email: 'john@example.com' },
    logout: vi.fn()
  })
}));

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    unreadCount: 3,
    fetchUnreadCount: vi.fn()
  })
}));

vi.mock('lucide-react', () => ({
  LayoutDashboard: () => <div>LayoutDashboard Icon</div>,
  Wrench: () => <div>Wrench Icon</div>,
  Calendar: () => <div>Calendar Icon</div>,
  CalendarDays: () => <div>CalendarDays Icon</div>,
  CreditCard: () => <div>CreditCard Icon</div>,
  ShoppingBag: () => <div>ShoppingBag Icon</div>,
  ShoppingCart: () => <div>ShoppingCart Icon</div>,
  Star: () => <div>Star Icon</div>,
  User: () => <div>User Icon</div>,
  LogOut: () => <div>LogOut Icon</div>,
  Menu: () => <div>Menu Icon</div>,
  X: () => <div>X Icon</div>,
  MessageSquare: () => <div>MessageSquare Icon</div>,
  Package: () => <div>Package Icon</div>,
  IndianRupee: () => <div>IndianRupee Icon</div>,
  Building2: () => <div>Building2 Icon</div>,
  Bell: () => <div>Bell Icon</div>,
  Crown: () => <div>Crown Icon</div>,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
    useLocation: () => ({ pathname: '/customer' }),
    Link: ({ to, children }) => <a href={to}>{children}</a>
  };
});

describe('CustomerLayout', () => {
  test('renders layout with user info', () => {
    render(
      <MemoryRouter>
        <CustomerLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('Car Service')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  test('displays notification count', () => {
    render(
      <MemoryRouter>
        <CustomerLayout />
      </MemoryRouter>
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/customer']}>
        <CustomerLayout />
      </MemoryRouter>
    );

    // Check if navigation structure exists by looking for nav element
    const navElement = screen.getByRole('navigation');
    expect(navElement).toBeInTheDocument();
    
    // Check for some navigation items, using a more flexible approach
    expect(document.body.querySelector('a[href="/customer"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/customer/services"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/customer/request-appointment"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/customer/appointments"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/customer/track"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/customer/memberships"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/customer/payments"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/customer/store"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/customer/feedback"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/customer/notifications"]')).toBeInTheDocument();
    expect(document.body.querySelector('a[href="/customer/profile"]')).toBeInTheDocument();
  });
});