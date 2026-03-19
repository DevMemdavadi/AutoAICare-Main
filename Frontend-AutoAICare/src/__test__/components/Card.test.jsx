import { Card } from '@/components/ui';
import { render, screen } from '@testing-library/react';

describe('Card', () => {
  test('renders children correctly', () => {
    render(<Card>Card content</Card>);
    
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  test('renders with title', () => {
    render(<Card title="Card Title">Card content</Card>);
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  test('renders with actions', () => {
    render(<Card actions={<button>Action Button</button>}>Card content</Card>);
    
    expect(screen.getByText('Card content')).toBeInTheDocument();
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  test('renders with title and actions', () => {
    render(
      <Card 
        title="Card Title" 
        actions={<button>Action Button</button>}
      >
        Card content
      </Card>
    );
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Action Button')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<Card className="custom-card">Card content</Card>);
    
    const card = screen.getByText('Card content').closest('.card');
    expect(card).toHaveClass('custom-card');
  });

  test('renders without title or actions when not provided', () => {
    render(<Card>Card content</Card>);
    
    expect(screen.getByText('Card content')).toBeInTheDocument();
    
    // Ensure no title element exists
    const titleElements = screen.queryAllByText(/Card Title|Card content/);
    expect(titleElements.length).toBe(1); // Only the content, not a title
  });
});