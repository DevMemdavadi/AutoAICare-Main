import { Textarea } from '@/components/ui';
import { render } from '@testing-library/react';

describe('Textarea', () => {
  test('renders without crashing', () => {
    // Simple test to ensure the component renders without errors
    expect(() => {
      render(<Textarea />);
    }).not.toThrow();
  });
});