import SignupPage from '@/pages/auth/SignupPage';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the AuthContext with relative path
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: vi.fn().mockResolvedValue({ success: true })
  })
}));

// Mock the API utility with relative path
vi.mock('../../../pages/utils/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { results: [] } })
  }
}));

// Mock the UI components with relative path
vi.mock('../../../components/ui', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  Card: ({ children }) => <div>{children}</div>,
  Input: ({ label, error, ...props }) => (
    <div>
      {label && <label>{label}</label>}
      <input {...props} />
      {error && <p>{error}</p>}
    </div>
  ),
  Select: ({ label, options, error, ...props }) => (
    <div>
      {label && <label>{label}</label>}
      <select {...props}>
        {options && options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p>{error}</p>}
    </div>
  )
}));

// Mock react-router-dom useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ children }) => <div>{children}</div>
  };
});

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Eye: () => <div />,
  EyeOff: () => <div />
}));

describe('SignupPage', () => {
  test('renders without crashing', () => {
    // Simple test to ensure the component renders without errors
    expect(() => {
      render(
        <BrowserRouter>
          <SignupPage />
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});