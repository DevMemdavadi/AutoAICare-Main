import { Badge } from '@/components/ui';
import { render, screen } from '@testing-library/react';

describe('Badge', () => {
  test('renders children correctly', () => {
    render(<Badge>Success</Badge>);
    
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  test('renders with default variant', () => {
    render(<Badge>Default</Badge>);
    
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  test('renders with different variants', () => {
    const { rerender } = render(<Badge variant="default">Test</Badge>);
    
    expect(screen.getByText('Test')).toHaveClass('bg-gray-100', 'text-gray-800');
    
    rerender(<Badge variant="success">Test</Badge>);
    expect(screen.getByText('Test')).toHaveClass('bg-green-100', 'text-green-800');
    
    rerender(<Badge variant="warning">Test</Badge>);
    expect(screen.getByText('Test')).toHaveClass('bg-yellow-100', 'text-yellow-800');
    
    rerender(<Badge variant="danger">Test</Badge>);
    expect(screen.getByText('Test')).toHaveClass('bg-red-100', 'text-red-800');
    
    rerender(<Badge variant="info">Test</Badge>);
    expect(screen.getByText('Test')).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  test('applies custom className', () => {
    render(<Badge className="custom-badge">Test</Badge>);
    
    const badge = screen.getByText('Test');
    expect(badge).toHaveClass('custom-badge');
  });

  test('has proper text size and styling', () => {
    render(<Badge>Test</Badge>);
    
    const badge = screen.getByText('Test');
    expect(badge).toHaveClass('text-xs', 'font-medium', 'rounded-full', 'px-2', 'py-1');
  });
});