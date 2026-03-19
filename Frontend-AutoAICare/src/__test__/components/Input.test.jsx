import { Input } from '@/components/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

describe('Input', () => {
  test('renders with label', () => {
    render(<Input label="Email Address" />);
    
    const label = screen.getByText('Email Address');
    expect(label).toBeInTheDocument();
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  test('renders without label', () => {
    render(<Input />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  test('displays error message', () => {
    render(<Input error="This field is required" />);
    
    const error = screen.getByText('This field is required');
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass('text-red-500');
  });

  test('applies error styling to input', () => {
    render(<Input error="This field is required" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
  });

  test('applies custom className', () => {
    render(<Input className="custom-input" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input');
  });

  test('passes additional props', () => {
    render(<Input placeholder="Enter email" type="email" name="email" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
  });

  test('handles change events', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});