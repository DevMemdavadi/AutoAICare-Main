import Bookings from '@/pages/admin/Bookings';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the BranchContext
vi.mock('@/contexts/BranchContext', () => ({
  useBranch: () => ({
    isSuperAdmin: false,
    getBranchFilterParams: () => ({}),
    branches: [],
    selectedBranch: null,
    getCurrentBranchId: () => 1
  })
}));

// Mock the API utility
vi.mock('@/pages/utils/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ 
      data: { 
        results: []
      } 
    })
  }
}));

// Mock the UI components
vi.mock('@/components/ui', () => ({
  Badge: ({ children, variant, className }) => <span className={className}>{children}</span>,
  Button: ({ children, variant, className, ...props }) => <button className={className} {...props}>{children}</button>,
  Card: ({ title, children, className, actions }) => (
    <div className={className}>
      {title && <h3>{title}</h3>}
      {children}
      {actions && <div>{actions}</div>}
    </div>
  ),
  Input: ({ label, error, prefix, className, ...props }) => (
    <div>
      {label && <label>{label}</label>}
      <div>
        {prefix}
        <input className={className} {...props} />
      </div>
      {error && <p>{error}</p>}
    </div>
  ),
  Modal: ({ isOpen, onClose, title, children, footer }) => (
    isOpen ? (
      <div>
        {title && <h2>{title}</h2>}
        <div>{children}</div>
        {footer && <div>{footer}</div>}
      </div>
    ) : null
  ),
  Select: ({ label, options, error, className, ...props }) => (
    <div>
      {label && <label>{label}</label>}
      <select className={className} {...props}>
        {options && options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p>{error}</p>}
    </div>
  ),
  Table: ({ headers, data, renderRow }) => (
    <table>
      <thead>
        <tr>
          {headers && headers.map((header, index) => (
            <th key={index}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data && data.map((item, index) => renderRow(item, index))}
      </tbody>
    </table>
  )
}));

// Mock react-router-dom Link
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children }) => <div>{children}</div>
  };
});

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Building2: () => <div />,
  Eye: () => <div />,
  RefreshCw: () => <div />,
  Search: () => <div />,
  UserPlus: () => <div />
}));

describe('AdminBookings', () => {
  test('renders without crashing', () => {
    // Simple test to ensure the component renders without errors
    expect(() => {
      render(
        <BrowserRouter>
          <Bookings />
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});