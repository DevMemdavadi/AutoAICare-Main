import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const SupervisorHome = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to supervisor dashboard
    navigate('/supervisor/dashboard');
  }, [navigate]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between h-16 px-4">
        <SkeletonLoader type="header" className="w-48" />
        <div className="flex items-center gap-4">
          <SkeletonLoader type="card" className="h-6 w-24" />
          <SkeletonLoader type="card" className="h-10 w-10 rounded-full" />
        </div>
      </div>
      
      <div className="flex gap-6">
        {/* Sidebar Skeleton */}
        <div className="w-64 h-screen bg-gray-900 p-4 hidden lg:block">
          <SkeletonLoader type="card" className="h-16 mb-6" />
          <div className="space-y-2 mb-6">
            {[...Array(5)].map((_, i) => (
              <SkeletonLoader key={i} type="card" className="h-12" />
            ))}
          </div>
          <div className="mt-auto">
            <SkeletonLoader type="card" className="h-20" />
            <SkeletonLoader type="card" className="h-16 mt-4" />
          </div>
        </div>
        
        {/* Main Content Skeleton */}
        <div className="flex-1">
          <div className="h-16 border-b border-gray-200 mb-6">
            <div className="flex items-center justify-between h-full px-4">
              <SkeletonLoader type="header" className="w-32" />
              <div className="flex items-center gap-4">
                <SkeletonLoader type="card" className="h-6 w-24" />
                <SkeletonLoader type="card" className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 lg:p-8">
            <SkeletonLoader type="card" className="h-96" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorHome;