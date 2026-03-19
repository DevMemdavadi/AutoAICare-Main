
const SkeletonLoader = ({ type = 'card', count = 1, className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          [...Array(count)].map((_, i) => (
            <div key={i} data-testid="skeleton-loader" className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))
        );
      
      case 'table':
        return (
          <div data-testid="skeleton-loader" className={`bg-white rounded-lg shadow-sm ${className}`}>
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded-t-lg"></div>
              {[...Array(count)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 border-b border-gray-200"></div>
              ))}
              <div className="h-12 bg-gray-50 rounded-b-lg"></div>
            </div>
          </div>
        );
      
      case 'table-row':
        return (
          <div data-testid="skeleton-loader" className={`animate-pulse ${className}`}>
            <div className="h-16 bg-gray-100 border-b border-gray-200"></div>
          </div>
        );
      
      case 'header':
        return (
          <div data-testid="skeleton-loader" className={`animate-pulse ${className}`}>
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-2/3"></div>
          </div>
        );
      
      case 'filter':
        return (
          <div data-testid="skeleton-loader" className={`animate-pulse ${className}`}>
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
        );
      
      case 'section-header':
        return (
          <div data-testid="skeleton-loader" className={`animate-pulse ${className}`}>
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        );
      
      case 'alert-panel':
        return (
          <div data-testid="skeleton-loader" className={`animate-pulse ${className}`}>
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        );
      
      case 'tabs':
        return (
          <div data-testid="skeleton-loader" className={`animate-pulse ${className}`}>
            <div className="flex gap-8 overflow-x-auto pb-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 w-24 bg-gray-200 rounded-t-lg"></div>
              ))}
            </div>
          </div>
        );
      
      case 'summary-cards':
        return (
          <div data-testid="skeleton-loader" className={`animate-pulse grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
            {[...Array(7)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'chart':
        return (
          <div data-testid="skeleton-loader" className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        );
      
      case 'summary-card':
        return (
          <div data-testid="skeleton-loader" className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
            <div className="animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'kanban-column':
        return (
          <div data-testid="skeleton-loader" className={`flex flex-col ${className}`}>
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded-t-lg mb-2"></div>
              {[...Array(count)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded mb-2"></div>
              ))}
              <div className="h-32 bg-gray-50 rounded-b-lg"></div>
            </div>
          </div>
        );
      
      case 'photo-grid':
        return (
          <div data-testid="skeleton-loader" className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${className}`}>
            {[...Array(count)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="animate-pulse">
                  <div className="h-40 bg-gray-200"></div>
                  <div className="p-3">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'job-card':
        return (
          <div data-testid="skeleton-loader" className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
            <div className="animate-pulse">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
              
              <div className="h-16 bg-gray-200 rounded-lg mb-4"></div>
              
              <div className="flex flex-wrap gap-4 mb-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
              
              <div className="h-10 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        );
      
      case 'notification-item':
        return (
          <div data-testid="skeleton-loader" className={`bg-white rounded-lg p-4 ${className}`}>
            <div className="animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="flex gap-4">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-5 w-5 rounded-full bg-gray-200"></div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div data-testid="skeleton-loader" className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        );
    }
  };

  return renderSkeleton();
};

export default SkeletonLoader;