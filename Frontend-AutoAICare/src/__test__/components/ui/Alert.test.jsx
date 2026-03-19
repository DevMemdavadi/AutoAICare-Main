import Alert from '@/components/ui/Alert';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

describe('Alert Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders alert with message', () => {
    render(<Alert message="Test message" />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  test('renders alert with message', () => {
    render(<Alert message="Test message" type="info" />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  test('calls onClose callback when close button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<Alert message="Test message" onClose={onCloseMock} />);
    
    const closeButton = screen.getByRole('button');
    closeButton.click();
    
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  
});