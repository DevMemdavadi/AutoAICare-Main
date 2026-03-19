import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Autocomplete from './Autocomplete';

// Mock options for testing
const mockOptions = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Honda', 'Toyota'];

describe('Autocomplete Component', () => {
  test('renders with label and placeholder', () => {
    render(
      <Autocomplete
        label="Vehicle Brand"
        placeholder="Search brand..."
        options={mockOptions}
        value=""
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Vehicle Brand')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search brand...')).toBeInTheDocument();
  });

  test('displays filtered options when typing', async () => {
    const userOnChange = vi.fn();
    render(
      <Autocomplete
        label="Vehicle Brand"
        placeholder="Search brand..."
        options={mockOptions}
        value=""
        onChange={userOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ta' } });

    // Wait for the dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Tata')).toBeInTheDocument();
    });

    // Should show only matching options
    expect(screen.queryByText('Maruti Suzuki')).not.toBeInTheDocument();
    expect(screen.queryByText('Hyundai')).not.toBeInTheDocument();
    expect(screen.getByText('Tata')).toBeInTheDocument();
    expect(screen.queryByText('Honda')).not.toBeInTheDocument();
    expect(screen.queryByText('Toyota')).not.toBeInTheDocument();
  });

  test('allows selection with mouse click', async () => {
    const userOnChange = vi.fn();
    render(
      <Autocomplete
        label="Vehicle Brand"
        placeholder="Search brand..."
        options={mockOptions}
        value=""
        onChange={userOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ta' } });

    // Wait for the dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Tata')).toBeInTheDocument();
    });

    // Click on the option
    fireEvent.click(screen.getByText('Tata'));

    // Verify the onChange was called with correct value
    expect(userOnChange).toHaveBeenCalledWith('Tata');
    
    // Verify input value is updated
    expect(input.value).toBe('Tata');
  });

  test('supports keyboard navigation with arrow keys', async () => {
    const userOnChange = vi.fn();
    render(
      <Autocomplete
        label="Vehicle Brand"
        placeholder="Search brand..."
        options={mockOptions}
        value=""
        onChange={userOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    
    // Open dropdown
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    // Wait for the dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Maruti Suzuki')).toBeInTheDocument();
    });

    // Navigate with arrow keys
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // First option
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // Second option
    
    // Press Enter to select
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // Verify the onChange was called with correct value
    expect(userOnChange).toHaveBeenCalledWith('Hyundai');
  });

  test('supports selection with Enter key when typing exact match', async () => {
    const userOnChange = vi.fn();
    render(
      <Autocomplete
        label="Vehicle Brand"
        placeholder="Search brand..."
        options={mockOptions}
        value=""
        onChange={userOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    
    // Type exact match
    fireEvent.change(input, { target: { value: 'Tata' } });
    
    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // Verify the onChange was called with correct value
    expect(userOnChange).toHaveBeenCalledWith('Tata');
  });

  test('closes dropdown with Escape key', async () => {
    const userOnChange = vi.fn();
    render(
      <Autocomplete
        label="Vehicle Brand"
        placeholder="Search brand..."
        options={mockOptions}
        value=""
        onChange={userOnChange}
      />
    );

    const input = screen.getByRole('textbox');
    
    // Open dropdown
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    // Wait for the dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Maruti Suzuki')).toBeInTheDocument();
    });
    
    // Close with Escape
    fireEvent.keyDown(input, { key: 'Escape' });
    
    // Verify dropdown is closed
    expect(screen.queryByText('Maruti Suzuki')).not.toBeInTheDocument();
  });
});