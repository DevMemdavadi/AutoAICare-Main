import React, { useState, useMemo } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Building2,
    Users,
    DollarSign,
    Award,
    Zap,
    CheckCircle,
    ArrowUpDown,
    Trophy,
    AlertCircle,
} from 'lucide-react';

const BranchComparison = ({ branchSummary, previousBranchSummary, loading }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'total_value', direction: 'desc' });
    console.log('🏗️ [BranchComparison] props:', { branchSummary, branchSummaryLength: branchSummary?.length, previousBranchSummary, loading });

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value || 0);
    };

    // Calculate trend percentage
    const calculateTrend = (current, previous) => {
        if (!previous || previous === 0) return null;
        const change = ((current - previous) / previous) * 100;
        return Math.round(change);
    };

    // Group data by branch
    const branchData = useMemo(() => {
        if (!branchSummary || branchSummary.length === 0) return [];

        // Group by branch
        const branchMap = new Map();

        branchSummary.forEach(team => {
            const branchName = team.branch_name || 'Unknown Branch';

            if (!branchMap.has(branchName)) {
                branchMap.set(branchName, {
                    branch_name: branchName,
                    branch_id: team.branch,   // API sends `team.branch` (int), not `team.branch_id`
                    total_jobs: 0,
                    total_value: 0,
                    total_rewards: 0,
                    efficiency: 0,
                    on_time_percentage: 0,
                    teams_count: 0,
                    total_on_time: 0,
                });
            }

            const branch = branchMap.get(branchName);
            branch.total_jobs += team.total_jobs_completed || 0;
            branch.total_value += parseFloat(team.paid_job_value || 0);
            branch.total_rewards += parseFloat(team.total_rewards_earned || 0);
            branch.efficiency += parseFloat(team.efficiency_percentage || 0);
            branch.total_on_time += team.jobs_on_time || 0;
            branch.teams_count += 1;
        });

        // Calculate averages and add previous period data
        const branches = Array.from(branchMap.values()).map(branch => {
            branch.efficiency = branch.teams_count > 0 ? branch.efficiency / branch.teams_count : 0;
            branch.on_time_percentage = branch.total_jobs > 0 ? (branch.total_on_time / branch.total_jobs) * 100 : 0;

            // Find previous period data for this branch
            if (previousBranchSummary && previousBranchSummary.length > 0) {
                const prevBranchTeams = previousBranchSummary.filter(t => t.branch_name === branch.branch_name);
                if (prevBranchTeams.length > 0) {
                    const prevData = prevBranchTeams.reduce((acc, team) => {
                        acc.total_jobs += team.total_jobs_completed || 0;
                        acc.total_value += parseFloat(team.paid_job_value || 0);
                        acc.total_rewards += parseFloat(team.total_rewards_earned || 0);
                        acc.efficiency += parseFloat(team.efficiency_percentage || 0);
                        acc.total_on_time += team.jobs_on_time || 0;
                        acc.teams_count += 1;
                        return acc;
                    }, { total_jobs: 0, total_value: 0, total_rewards: 0, efficiency: 0, total_on_time: 0, teams_count: 0 });

                    prevData.efficiency = prevData.teams_count > 0 ? prevData.efficiency / prevData.teams_count : 0;
                    prevData.on_time_percentage = prevData.total_jobs > 0 ? (prevData.total_on_time / prevData.total_jobs) * 100 : 0;

                    branch.trends = {
                        jobs: calculateTrend(branch.total_jobs, prevData.total_jobs),
                        value: calculateTrend(branch.total_value, prevData.total_value),
                        rewards: calculateTrend(branch.total_rewards, prevData.total_rewards),
                        efficiency: calculateTrend(branch.efficiency, prevData.efficiency),
                        on_time: calculateTrend(branch.on_time_percentage, prevData.on_time_percentage),
                    };
                }
            }

            return branch;
        });

        return branches;
    }, [branchSummary, previousBranchSummary]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!branchData || branchData.length === 0) return [];

        const sorted = [...branchData].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle string comparisons
            if (typeof aValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            // Handle numeric comparisons
            if (sortConfig.direction === 'asc') {
                return aValue - bValue;
            }
            return bValue - aValue;
        });

        return sorted;
    }, [branchData, sortConfig]);

    // Handle sort
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // Get rank badge
    const getRankBadge = (index) => {
        if (index === 0) {
            return <Trophy className="w-4 h-4 text-yellow-500" />;
        } else if (index === 1) {
            return <Trophy className="w-4 h-4 text-gray-400" />;
        } else if (index === 2) {
            return <Trophy className="w-4 h-4 text-orange-600" />;
        }
        return null;
    };

    // Render trend indicator
    const TrendIndicator = ({ value }) => {
        if (value === null || value === undefined) return null;

        return (
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${value >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(value)}%
            </span>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-100 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Empty state
    if (!branchData || branchData.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-12">
                <div className="text-center">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Branch Data Available</h3>
                    <p className="text-gray-600">Branch performance data will appear here once jobs are completed.</p>
                </div>
            </div>
        );
    }

    // Sort header component
    const SortHeader = ({ label, sortKey, icon: Icon }) => (
        <th
            className="px-4 py-3 text-left cursor-pointer hover:bg-gray-50 transition-colors group"
            onClick={() => handleSort(sortKey)}
        >
            <div className="flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4 text-gray-500" />}
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {label}
                </span>
                <ArrowUpDown className={`w-3 h-3 transition-colors ${sortConfig.key === sortKey ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    }`} />
            </div>
        </th>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Building2 className="w-7 h-7 text-blue-600" />
                        Branch Performance Comparison
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Compare performance metrics across all branches • {branchData.length} branch{branchData.length !== 1 ? 'es' : ''}
                    </p>
                </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Rank
                                    </span>
                                </th>
                                <SortHeader label="Branch" sortKey="branch_name" icon={Building2} />
                                <SortHeader label="Jobs" sortKey="total_jobs" icon={CheckCircle} />
                                <SortHeader label="Revenue" sortKey="total_value" icon={DollarSign} />
                                <SortHeader label="Efficiency" sortKey="efficiency" icon={Zap} />
                                <SortHeader label="On-Time %" sortKey="on_time_percentage" icon={CheckCircle} />
                                <SortHeader label="Rewards" sortKey="total_rewards" icon={Award} />
                                <th className="px-4 py-3 text-left">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Teams
                                        </span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedData.map((branch, index) => (
                                <tr
                                    key={branch.branch_id || index}
                                    className="hover:bg-gray-50 transition-colors"
                                >
                                    {/* Rank */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {getRankBadge(index)}
                                            <span className="text-sm font-semibold text-gray-700">
                                                #{index + 1}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Branch Name */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Building2 className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {branch.branch_name}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Jobs */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {branch.total_jobs}
                                            </span>
                                            {branch.trends?.jobs != null && (
                                                <TrendIndicator value={branch.trends.jobs} />
                                            )}
                                        </div>
                                    </td>

                                    {/* Revenue */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(branch.total_value)}
                                            </span>
                                            {branch.trends?.value != null && (
                                                <TrendIndicator value={branch.trends.value} />
                                            )}
                                        </div>
                                    </td>

                                    {/* Efficiency */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {branch.efficiency.toFixed(1)}%
                                                </span>
                                                {branch.efficiency >= 90 && (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                        Excellent
                                                    </span>
                                                )}
                                            </div>
                                            {branch.trends?.efficiency != null && (
                                                <TrendIndicator value={branch.trends.efficiency} />
                                            )}
                                        </div>
                                    </td>

                                    {/* On-Time % */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {branch.on_time_percentage.toFixed(1)}%
                                                </span>
                                                {branch.on_time_percentage < 80 && (
                                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                                )}
                                            </div>
                                            {branch.trends?.on_time != null && (
                                                <TrendIndicator value={branch.trends.on_time} />
                                            )}
                                        </div>
                                    </td>

                                    {/* Rewards */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(branch.total_rewards)}
                                            </span>
                                            {branch.trends?.rewards != null && (
                                                <TrendIndicator value={branch.trends.rewards} />
                                            )}
                                        </div>
                                    </td>

                                    {/* Teams */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-600">
                                            {branch.teams_count} team{branch.teams_count !== 1 ? 's' : ''}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-700 font-medium mb-1">Top Performer</p>
                    <p className="text-lg font-bold text-blue-900">{sortedData[0]?.branch_name || 'N/A'}</p>
                    <p className="text-xs text-blue-600 mt-1">
                        {formatCurrency(sortedData[0]?.total_value || 0)} revenue
                    </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-700 font-medium mb-1">Highest Efficiency</p>
                    <p className="text-lg font-bold text-green-900">
                        {[...sortedData].sort((a, b) => b.efficiency - a.efficiency)[0]?.branch_name || 'N/A'}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                        {([...sortedData].sort((a, b) => b.efficiency - a.efficiency)[0]?.efficiency || 0).toFixed(1)}% efficiency
                    </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                    <p className="text-sm text-orange-700 font-medium mb-1">Most Jobs</p>
                    <p className="text-lg font-bold text-orange-900">
                        {[...sortedData].sort((a, b) => b.total_jobs - a.total_jobs)[0]?.branch_name || 'N/A'}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                        {[...sortedData].sort((a, b) => b.total_jobs - a.total_jobs)[0]?.total_jobs || 0} jobs completed
                    </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-purple-700 font-medium mb-1">Total Branches</p>
                    <p className="text-lg font-bold text-purple-900">{branchData.length}</p>
                    <p className="text-xs text-purple-600 mt-1">
                        {branchData.reduce((sum, b) => sum + b.teams_count, 0)} teams total
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BranchComparison;
