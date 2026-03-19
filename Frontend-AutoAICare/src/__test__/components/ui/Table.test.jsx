import { Table } from '@/components/ui';
import { render } from '@testing-library/react';

describe('Table', () => {
  test('renders without crashing', () => {
    // Simple test to ensure the component renders without errors
    expect(() => {
      render(
        <Table 
          headers={['Name', 'Email']} 
          data={[{ name: 'John', email: 'john@test.com' }]}
          renderRow={(item) => (
            <tr key={item.name}>
              <td>{item.name}</td>
              <td>{item.email}</td>
            </tr>
          )}
        />
      );
    }).not.toThrow();
  });
});