import { Loader } from '@/components/ui';
import { render } from '@testing-library/react';

describe('Loader', () => {
  test('renders without crashing', () => {
    // Simple test to ensure the component renders without errors
    expect(() => {
      render(<Loader />);
    }).not.toThrow();
  });
});