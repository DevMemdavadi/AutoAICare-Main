import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useBranch } from './BranchContext';

const AccountingFilterContext = createContext(null);

export const useAccountingFilter = () => {
    const context = useContext(AccountingFilterContext);
    if (!context) {
        throw new Error('useAccountingFilter must be used within AccountingFilterProvider');
    }
    return context;
};

// Helper functions for date calculations
const getDatePresets = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const startOfLastQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 - 3, 1);
    const endOfLastQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    return {
        today: {
            label: 'Today',
            startDate: today,
            endDate: today
        },
        yesterday: {
            label: 'Yesterday',
            startDate: yesterday,
            endDate: yesterday
        },
        thisWeek: {
            label: 'This Week',
            startDate: startOfWeek,
            endDate: today
        },
        thisMonth: {
            label: 'This Month',
            startDate: startOfMonth,
            endDate: today
        },
        thisQuarter: {
            label: 'This Quarter',
            startDate: startOfQuarter,
            endDate: today
        },
        thisYear: {
            label: 'This Year',
            startDate: startOfYear,
            endDate: today
        },
        lastMonth: {
            label: 'Last Month',
            startDate: startOfLastMonth,
            endDate: endOfLastMonth
        },
        lastQuarter: {
            label: 'Last Quarter',
            startDate: startOfLastQuarter,
            endDate: endOfLastQuarter
        },
        last7Days: {
            label: 'Last 7 Days',
            startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
            endDate: today
        },
        last30Days: {
            label: 'Last 30 Days',
            startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
            endDate: today
        },
        last90Days: {
            label: 'Last 90 Days',
            startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
            endDate: today
        },
        allTime: {
            label: 'All Time',
            startDate: null,
            endDate: null
        },
        custom: {
            label: 'Custom Range',
            startDate: null,
            endDate: null
        }
    };
};

const formatDateForApi = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const AccountingFilterProvider = ({ children }) => {
    const { branches, getCurrentBranchId, isSuperAdmin, isCompanyAdmin, selectedBranch: globalBranch } = useBranch();

    // Date range state
    const [datePreset, setDatePreset] = useState('today');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    // Branch filter state (for multi-select within accounting)
    const [selectedBranches, setSelectedBranches] = useState([]);

    // Compare mode (compare with previous period)
    const [compareMode, setCompareMode] = useState(false);

    // Display options
    const [showInThousands, setShowInThousands] = useState(false);

    // Initialize dates based on preset
    useEffect(() => {
        const presets = getDatePresets();
        if (datePreset !== 'custom' && presets[datePreset]) {
            setStartDate(presets[datePreset].startDate);
            setEndDate(presets[datePreset].endDate);
        }
    }, [datePreset]);

    // Sync branch filter with global branch context
    useEffect(() => {
        if (globalBranch) {
            setSelectedBranches([globalBranch.id]);
        } else if (isSuperAdmin || isCompanyAdmin) {
            // Super admin or Company admin with "All Branches" - clear selection (means all)
            setSelectedBranches([]);
        }
    }, [globalBranch, isSuperAdmin, isCompanyAdmin]);

    // Get filter parameters for API calls
    const getFilterParams = useCallback(() => {
        const params = {};

        // Date filters - only include if explicitly set (not default)
        // This allows showing all-time data by default
        if (startDate && datePreset !== 'allTime') {
            params.start_date = formatDateForApi(startDate);
        }
        if (endDate && datePreset !== 'allTime') {
            params.end_date = formatDateForApi(endDate);
        }

        // Branch filter
        // Branch filter
        if (selectedBranches.length > 0) {
            params.branch = selectedBranches.join(',');
        } else if (!isSuperAdmin && !isCompanyAdmin) {
            // Non-super admin and non-company admin should filter by their branch
            const branchId = getCurrentBranchId();
            if (branchId) {
                params.branch = branchId;
            }
        }

        // Comparison flag
        if (compareMode) {
            params.compare = 'true';
        }

        return params;
    }, [startDate, endDate, selectedBranches, isSuperAdmin, getCurrentBranchId, datePreset]);

    // Get comparison period dates
    const getComparisonDates = useCallback(() => {
        if (!compareMode || !startDate || !endDate) return null;

        const periodLength = endDate.getTime() - startDate.getTime();
        const prevEndDate = new Date(startDate.getTime() - 1); // Day before current start
        const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

        return {
            startDate: formatDateForApi(prevStartDate),
            endDate: formatDateForApi(prevEndDate)
        };
    }, [compareMode, startDate, endDate]);

    // Handle date preset change
    const handleDatePresetChange = useCallback((preset) => {
        setDatePreset(preset);
        if (preset !== 'custom') {
            const presets = getDatePresets();
            if (presets[preset]) {
                setStartDate(presets[preset].startDate);
                setEndDate(presets[preset].endDate);
            }
        }
    }, []);

    // Handle custom date range
    const handleCustomDateRange = useCallback((start, end) => {
        setDatePreset('custom');
        setStartDate(new Date(start));
        setEndDate(new Date(end));
    }, []);

    // Handle branch selection
    const handleBranchChange = useCallback((branchIds) => {
        if (Array.isArray(branchIds)) {
            setSelectedBranches(branchIds);
        } else if (branchIds === 'all') {
            setSelectedBranches([]);
        } else {
            setSelectedBranches([parseInt(branchIds)]);
        }
    }, []);

    // Toggle single branch selection
    const toggleBranch = useCallback((branchId) => {
        setSelectedBranches(prev => {
            if (prev.includes(branchId)) {
                return prev.filter(id => id !== branchId);
            }
            return [...prev, branchId];
        });
    }, []);

    // Reset all filters
    const resetFilters = useCallback(() => {
        setDatePreset('today');
        const presets = getDatePresets();
        setStartDate(presets.today.startDate);
        setEndDate(presets.today.endDate);
        setSelectedBranches(globalBranch ? [globalBranch.id] : []);
        setCompareMode(false);
        setShowInThousands(false);
    }, [globalBranch]);

    // Format currency for display
    const formatCurrency = useCallback((amount) => {
        if (amount === null || amount === undefined) return '₹0';

        const num = parseFloat(amount);
        if (isNaN(num)) return '₹0';

        if (showInThousands) {
            if (num >= 10000000) { // 1 Crore
                return `₹${(num / 10000000).toFixed(2)}Cr`;
            } else if (num >= 100000) { // 1 Lakh
                return `₹${(num / 100000).toFixed(2)}L`;
            } else if (num >= 1000) {
                return `₹${(num / 1000).toFixed(1)}K`;
            }
        }

        return `₹${num.toLocaleString('en-IN')}`;
    }, [showInThousands]);

    // Get human-readable filter description
    const getFilterDescription = useCallback(() => {
        const parts = [];

        // Date description
        const presets = getDatePresets();
        const formatDate = (date) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short'
            });
        };

        if (startDate && endDate && datePreset !== 'allTime') {
            const dateStr = new Date(startDate).toDateString() === new Date(endDate).toDateString()
                ? formatDate(startDate)
                : `${formatDate(startDate)} - ${formatDate(endDate)}`;

            if (datePreset !== 'custom' && presets[datePreset]) {
                parts.push(`${presets[datePreset].label} (${dateStr})`);
            } else {
                parts.push(dateStr);
            }
        } else if (datePreset === 'allTime') {
            parts.push('All Time');
        }

        // Branch description
        if (selectedBranches.length === 0) {
            parts.push('All Branches');
        } else if (selectedBranches.includes('all')) {
            parts.push('Global / General');
        } else if (selectedBranches.length === 1) {
            const branch = branches.find(b => b.id === selectedBranches[0]);
            parts.push(branch?.name || 'Selected Branch');
        } else {
            parts.push(`${selectedBranches.length} Branches`);
        }

        return parts.join(' • ');
    }, [datePreset, startDate, endDate, selectedBranches, branches]);

    const value = {
        // Date state
        datePreset,
        startDate,
        endDate,
        setDatePreset: handleDatePresetChange,
        setCustomDateRange: handleCustomDateRange,
        getDatePresets,

        // Branch state
        selectedBranches,
        setSelectedBranches: handleBranchChange,
        toggleBranch,
        branches,
        isSuperAdmin,
        isCompanyAdmin,

        // Compare mode
        compareMode,
        setCompareMode,
        getComparisonDates,

        // Display options
        showInThousands,
        setShowInThousands,
        formatCurrency,

        // Utilities
        getFilterParams,
        resetFilters,
        getFilterDescription,
    };

    return (
        <AccountingFilterContext.Provider value={value}>
            {children}
        </AccountingFilterContext.Provider>
    );
};

export default AccountingFilterContext;
