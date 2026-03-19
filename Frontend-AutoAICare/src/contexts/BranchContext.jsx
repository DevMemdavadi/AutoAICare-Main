import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const BranchContext = createContext(null);

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within BranchProvider');
  }
  return context;
};

export const BranchProvider = ({ children }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [initialized, setInitialized] = useState(false); // Track if branch is initialized

  // Determine if current user is super admin
  const isSuperAdmin = user?.role === 'super_admin';
  const isCompanyAdmin = user?.role === 'company_admin';

  // Determine if current user is branch admin or staff
  const isBranchAdmin = user?.role === 'branch_admin';
  const isFloorManager = user?.role === 'floor_manager';
  const isSupervisor = user?.role === 'supervisor';

  // Initialize selectedBranch based on user immediately (before API call)
  const getInitialBranch = () => {
    if (!user) return null;

    if (isSuperAdmin || isCompanyAdmin) {
      // Super admin and Company admin start with "All Branches" (null)
      return null;
    } else if ((isBranchAdmin || isFloorManager || isSupervisor || user.role === 'customer') && user.branch) {
      // Admin/Staff/Customer get their assigned branch from user object immediately
      return {
        id: user.branch,
        name: user.branch_name,
        code: user.branch_code
      };
    }
    return null;
  };

  const [selectedBranch, setSelectedBranch] = useState(getInitialBranch());

  // Fetch branches list
  const fetchBranches = async () => {
    if (!user) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/branches/');
      setBranches(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  useEffect(() => {
    if (user) {
      // Set initial branch immediately from user data
      setSelectedBranch(getInitialBranch());
      setInitialized(false);

      // Then fetch branches list in background
      if (isSuperAdmin || isCompanyAdmin || isBranchAdmin || isFloorManager || isSupervisor) {
        fetchBranches();
      } else {
        // For customers, just mark as initialized
        setLoading(false);
        setInitialized(true);
      }
    } else {
      setSelectedBranch(null);
      setLoading(false);
      setInitialized(true);
    }
  }, [user]);

  // Handle branch selection (super admin or company admin)
  const handleBranchChange = (branchId) => {
    if (!isSuperAdmin && !isCompanyAdmin) return; // Only super admin or company admin can change branch

    if (branchId === 'all') {
      setSelectedBranch(null);
    } else {
      const branch = branches.find(b => b.id === parseInt(branchId));
      setSelectedBranch(branch);
    }
  };

  // Get current branch ID for API filters
  const getCurrentBranchId = () => {
    if (isSuperAdmin || isCompanyAdmin) {
      return selectedBranch?.id || null; // null means all branches
    }
    // For admin, staff, and customers - use their assigned branch
    return selectedBranch?.id || user?.branch || null;
  };

  // Get current branch name for display
  const getCurrentBranchName = () => {
    if (isSuperAdmin || isCompanyAdmin) {
      return selectedBranch?.name || 'All Branches';
    }
    // For admin, staff, and customers - show their assigned branch
    return selectedBranch?.name || user?.branch_name || 'No Branch';
  };

  // Check if a feature should show branch filter
  const showBranchFilter = () => {
    return isSuperAdmin || isCompanyAdmin;
  };

  // Get API query params for branch filtering
  const getBranchFilterParams = () => {
    const branchId = getCurrentBranchId();
    return branchId ? { branch: branchId } : {};
  };

  const value = {
    branches,
    selectedBranch,
    setSelectedBranch: handleBranchChange,
    isSuperAdmin,
    isBranchAdmin,
    isFloorManager,
    isSupervisor,
    getCurrentBranchId,
    getCurrentBranchName,
    showBranchFilter,
    getBranchFilterParams,
    fetchBranches,
    loading,
    initialized, // Add initialized flag
    isCompanyAdmin,
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
};
