import { useBranch } from '@/contexts/BranchContext';
import { ChevronDown, Building2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const BranchSelector = () => {
  const {
    branches,
    selectedBranch,
    setSelectedBranch,
    isSuperAdmin,
    isCompanyAdmin,
    getCurrentBranchName
  } = useBranch();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Show for super admin and company admin
  if (!isSuperAdmin && !isCompanyAdmin) {
    return null;
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (branchId) => {
    setSelectedBranch(branchId);
    setIsOpen(false);
  };

  // Check if branch is currently selected
  const isBranchSelected = (branchId) => {
    if (branchId === 'all') {
      return !selectedBranch || selectedBranch === 'all';
    }
    return selectedBranch?.id === branchId;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Building2 size={18} className="text-gray-600" />
        <span className="text-sm font-medium text-gray-900">
          {getCurrentBranchName()}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
              Select Branch
            </div>

            {/* All Branches Option */}
            <button
              onClick={() => handleSelect('all')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${isBranchSelected('all')
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <div className="flex items-center gap-2">
                <Building2 size={16} />
                <span className="font-medium">All Branches</span>
              </div>
              <p className="text-xs mt-0.5 opacity-80">
                View data from all locations
              </p>
            </button>

            <div className="my-2 border-t border-gray-200"></div>

            {/* Individual Branches */}
            <div className="max-h-64 overflow-y-auto">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => handleSelect(branch.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${isBranchSelected(branch.id)
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={16} />
                    <span className="font-medium">{branch.name}</span>
                  </div>
                  {branch.address && (
                    <p className="text-xs mt-0.5 opacity-80 truncate">
                      {branch.address}
                    </p>
                  )}
                </button>
              ))}
            </div>

            {branches.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-gray-500">
                No branches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchSelector;
