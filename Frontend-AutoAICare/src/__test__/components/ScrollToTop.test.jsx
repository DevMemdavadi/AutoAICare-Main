import ScrollToTop from '@/components/ScrollToTop';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock react-router-dom useLocation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({
      pathname: '/admin'
    })
  };
});

describe('ScrollToTop', () => {
  test('renders without crashing', () => {
    // Simple test to ensure the component renders without errors
    expect(() => {
      render(
        <BrowserRouter>
          <ScrollToTop />
        </BrowserRouter>
      );
    }).not.toThrow();
  });
});