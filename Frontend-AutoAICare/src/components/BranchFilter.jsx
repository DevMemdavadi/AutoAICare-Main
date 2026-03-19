import { useBranch } from '@/contexts/BranchContext';
import { Building2 } from 'lucide-react';

const BranchFilter = ({ value, onChange, className = '' }) => {
  const { isSuperAdmin, isCompanyAdmin, branches } = useBranch();

  // Only show for super admin or company admin
  if (!isSuperAdmin && !isCompanyAdmin) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white"
      >
        <option value="all">All Branches</option>
        {branches.map(branch => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BranchFilter;
