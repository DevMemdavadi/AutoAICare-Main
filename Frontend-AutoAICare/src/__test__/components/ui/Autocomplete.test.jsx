import { render } from '@testing-library/react';
import Autocomplete from '../../../components/ui/Autocomplete';

// Mock scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock options for testing
const mockOptions = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Honda', 'Toyota'];

describe('Autocomplete Component', () => {
  test('renders without crashing', () => {
    expect(() => {
      render(
        <Autocomplete
          label="Vehicle Brand"
          placeholder="Search brand..."
          options={mockOptions}
          value=""
          onChange={() => {}}
        />
      );
    }).not.toThrow();
  });
});