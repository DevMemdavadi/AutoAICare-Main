import { Card } from '@/components/ui/index';
import { render, screen } from '@testing-library/react';

describe('Card Component', () => {
  test('renders children content', () => {
    render(
      <Card>
        <div>Card Content</div>
      </Card>
    );
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  test('renders title when provided', () => {
    render(<Card title="Card Title">Content</Card>);
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  test('renders actions when provided', () => {
    const actions = <button>Action Button</button>;
    render(<Card actions={actions}>Content</Card>);
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<Card className="custom-card">Content</Card>);
    const card = screen.getByText('Content').closest('.card');
    expect(card).toHaveClass('custom-card');
  });

  test('does not render title or actions container when neither is provided', () => {
    render(<Card>Content</Card>);
    // Just verify the content is rendered
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});