import { Input } from '@/components/ui';
import { render } from '@testing-library/react';

describe('Debug Input Component', () => {
  test('debug input structure', () => {
    const { container } = render(<Input label="Email Address" />);
    console.log(container.innerHTML);
  });
});