import { Modal } from '@/components/ui';
import { render } from '@testing-library/react';

describe('Modal', () => {
  test('does not render when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(container.firstChild).toBeNull();
  });
});