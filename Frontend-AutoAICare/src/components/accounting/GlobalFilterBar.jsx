import { useState, useRef, useEffect } from 'react';
import { useAccountingFilter } from '@/contexts/AccountingFilterContext';
import { Button, Select } from '@/components/ui';
import {
    Calendar,
    Building,
    Filter,
    X,
    ChevronDown,
    Check,
    RefreshCw,
    TrendingUp,
    BarChart3
} from 'lucide-react';

const GlobalFilterBar = ({ onRefresh }) => {
    const {
        datePreset,
        startDate,
        endDate,
        setDatePreset,
        setCustomDateRange,
        getDatePresets,
        selectedBranches,
        setSelectedBranches,
        toggleBranch,
        branches,
        isSuperAdmin,
        isCompanyAdmin,
        compareMode,
        setCompareMode,
        showInThousands,
        setShowInThousands,
        resetFilters,
        getFilterDescription
    } = useAccountingFilter();

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showBranchPicker, setShowBranchPicker] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const datePickerRef = useRef(null);
    const branchPickerRef = useRef(null);

    const datePresets = getDatePresets();

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                setShowDatePicker(false);
            }
            if (branchPickerRef.current && !branchPickerRef.current.contains(event.target)) {
                setShowBranchPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format date for display
    const formatDisplayDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Get date range display text
    const getDateRangeText = () => {
        const dateStr = startDate && endDate
            ? new Date(startDate).toDateString() === new Date(endDate).toDateString()
                ? formatDisplayDate(startDate)
                : `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
            : '';

        if (datePreset !== 'custom' && datePresets[datePreset]) {
            if (datePreset === 'allTime') return datePresets[datePreset].label;
            return `${datePresets[datePreset].label}${dateStr ? ` (${dateStr})` : ''}`;
        }
        return dateStr || 'Select Date Range';
    };

    // Get branch display text
    const getBranchText = () => {
        if (selectedBranches.length === 0) {
            return 'All Branches';
        }
        if (selectedBranches.includes('all')) {
            return 'Global / General';
        }
        if (selectedBranches.length === 1) {
            const branch = branches.find(b => b.id === selectedBranches[0]);
            return branch?.name || 'Selected Branch';
        }
        return `${selectedBranches.length} Branches`;
    };

    // Handle custom date apply
    const handleApplyCustomDates = () => {
        if (customStart && customEnd) {
            setCustomDateRange(customStart, customEnd);
            setShowDatePicker(false);
        }
    };

    // Handle preset selection
    const handlePresetSelect = (preset) => {
        setDatePreset(preset);
        if (preset !== 'custom') {
            setShowDatePicker(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
                {/* Date Range Filter */}
                <div className="relative" ref={datePickerRef}>
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-xs md:text-sm"
                    >
                        <Calendar size={14} className="text-gray-500 md:hidden" />
                        <Calendar size={18} className="text-gray-500 hidden md:block" />
                        <span className="font-medium text-gray-700">{getDateRangeText()}</span>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform md:hidden ${showDatePicker ? 'rotate-180' : ''}`} />
                        <ChevronDown size={16} className={`text-gray-400 transition-transform hidden md:block ${showDatePicker ? 'rotate-180' : ''}`} />
                    </button>

                    {showDatePicker && (
                        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                            <div className="p-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Presets</h4>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {Object.entries(datePresets).filter(([key]) => key !== 'custom').map(([key, preset]) => (
                                        <button
                                            key={key}
                                            onClick={() => handlePresetSelect(key)}
                                            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${datePreset === key
                                                ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="border-t border-gray-200 pt-4">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Custom Range</h4>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                                            <input
                                                type="date"
                                                value={customStart}
                                                onChange={(e) => setCustomStart(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                                            <input
                                                type="date"
                                                value={customEnd}
                                                onChange={(e) => setCustomEnd(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleApplyCustomDates}
                                        disabled={!customStart || !customEnd}
                                        className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Apply Custom Range
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Branch Filter (Super Admin or Company Admin only) */}
                {(isSuperAdmin || isCompanyAdmin) && (
                    <div className="relative" ref={branchPickerRef}>
                        <button
                            onClick={() => setShowBranchPicker(!showBranchPicker)}
                            className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-xs md:text-sm"
                        >
                            <Building size={14} className="text-gray-500 md:hidden" />
                            <Building size={18} className="text-gray-500 hidden md:block" />
                            <span className="font-medium text-gray-700">{getBranchText()}</span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform md:hidden ${showBranchPicker ? 'rotate-180' : ''}`} />
                            <ChevronDown size={16} className={`text-gray-400 transition-transform hidden md:block ${showBranchPicker ? 'rotate-180' : ''}`} />
                        </button>

                        {showBranchPicker && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-auto">
                                <div className="p-3">
                                    {/* All Branches Option */}
                                    <button
                                        onClick={() => {
                                            setSelectedBranches('all');
                                            setShowBranchPicker(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-2 transition-colors ${selectedBranches.length === 0
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                                            }`}
                                    >
                                        <span className="text-sm font-medium">All Branches</span>
                                        {selectedBranches.length === 0 && <Check size={16} className="text-blue-600" />}
                                    </button>

                                    <div className="border-t border-gray-200 pt-2 mt-2">
                                        <p className="text-xs text-gray-500 px-3 mb-2">Select category or branch:</p>
                                        <div className="space-y-1">
                                            {/* Global/General Option */}
                                            <button
                                                onClick={() => {
                                                    setSelectedBranches(['all']);
                                                    setShowBranchPicker(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${selectedBranches.includes('all')
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                                    }`}
                                            >
                                                <span className="text-sm font-medium">Global / General</span>
                                                {selectedBranches.includes('all') && (
                                                    <Check size={16} className="text-blue-600" />
                                                )}
                                            </button>

                                            {branches.map((branch) => (
                                                <button
                                                    key={branch.id}
                                                    onClick={() => {
                                                        setSelectedBranches([branch.id]);
                                                        setShowBranchPicker(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${selectedBranches.includes(branch.id)
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                >
                                                    <span className="text-sm">{branch.name}</span>
                                                    {selectedBranches.includes(branch.id) && (
                                                        <Check size={16} className="text-blue-600" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Divider */}
                <div className="h-8 w-px bg-gray-200 hidden md:block" />

                {/* Compare Mode Toggle */}
                <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2.5 rounded-lg border transition-colors text-xs md:text-sm ${compareMode
                        ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <TrendingUp size={14} className="md:hidden" />
                    <TrendingUp size={18} className="hidden md:block" />
                    <span className="font-medium">Compare</span>
                </button>

                {/* Show in K/L/Cr Toggle */}
                <button
                    onClick={() => setShowInThousands(!showInThousands)}
                    className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2.5 rounded-lg border transition-colors text-xs md:text-sm ${showInThousands
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <BarChart3 size={14} className="md:hidden" />
                    <BarChart3 size={18} className="hidden md:block" />
                    <span className="font-medium">{showInThousands ? 'K/L/Cr' : 'Full'}</span>
                </button>

                {/* Spacer - only on desktop */}
                <div className="hidden md:flex flex-1" />

                {/* Reset Filters */}
                <button
                    onClick={resetFilters}
                    className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 text-gray-500 hover:text-gray-700 transition-colors text-xs md:text-sm"
                >
                    <X size={14} className="md:hidden" />
                    <X size={16} className="hidden md:block" />
                    <span>Reset</span>
                </button>

                {/* Refresh Button */}
                {onRefresh && (
                    <Button
                        onClick={onRefresh}
                        variant="outline"
                        className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-2"
                    >
                        <RefreshCw size={14} className="md:hidden" />
                        <RefreshCw size={16} className="hidden md:block" />
                        <span>Refresh</span>
                    </Button>
                )}
            </div>

            {/* Active Filter Summary */}
            <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                    <Filter size={12} className="inline mr-1" />
                    Showing: <span className="font-medium text-gray-700">{getFilterDescription()}</span>
                    {compareMode && <span className="ml-2 text-purple-600">• Comparing with previous period</span>}
                </p>
            </div>
        </div>
    );
};

export default GlobalFilterBar;
