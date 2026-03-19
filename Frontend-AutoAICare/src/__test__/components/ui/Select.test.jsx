import { Select } from '@/components/ui';
import { render } from '@testing-library/react';

describe('Select', () => {
  test('renders without crashing', () => {
    // Simple test to ensure the component renders without errors
    expect(() => {
      render(<Select options={[{ value: '1', label: 'Option 1' }]} />);
    }).not.toThrow();
  });
});