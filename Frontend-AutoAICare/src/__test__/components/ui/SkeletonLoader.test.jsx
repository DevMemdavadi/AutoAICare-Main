import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { render, screen } from '@testing-library/react';

describe('SkeletonLoader Component', () => {
  test('renders card skeleton by default', () => {
    render(<SkeletonLoader />);
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('bg-white');
    expect(skeleton).toHaveClass('rounded-lg');
  });

  test('renders multiple skeletons when count is provided', () => {
    render(<SkeletonLoader count={3} />);
    const skeletons = screen.getAllByTestId('skeleton-loader');
    expect(skeletons).toHaveLength(3);
  });

  test('renders table skeleton when type is table', () => {
    render(<SkeletonLoader type="table" />);
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toBeInTheDocument();
    // Check for table-specific classes
    expect(skeleton).toHaveClass('bg-white');
  });

  test('renders list skeleton when type is list', () => {
    render(<SkeletonLoader type="list" />);
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toBeInTheDocument();
  });

  test('renders avatar skeleton when type is avatar', () => {
    render(<SkeletonLoader type="avatar" />);
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<SkeletonLoader className="custom-skeleton" />);
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveClass('custom-skeleton');
  });
});