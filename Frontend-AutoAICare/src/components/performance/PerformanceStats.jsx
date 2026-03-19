import React from 'react';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Clock,
    CheckCircle,
    Zap,
    Award,
    BarChart2,
    Calendar,
    BadgeCheck,
} from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, loading }) => {
    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
        );
    }

    const colorClasses = {
        green: 'from-green-500 to-emerald-600',
        blue: 'from-blue-500 to-indigo-600',
        orange: 'from-orange-500 to-amber-600',
        purple: 'from-purple-500 to-indigo-600',
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClasses[color] || colorClasses.blue}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>

            <p className={`text-3xl font-bold mb-2 bg-gradient-to-br ${colorClasses[color] || colorClasses.blue} bg-clip-text text-transparent`}>
                {value}
            </p>

            <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">{subtitle}</p>
                {trend !== undefined && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${trend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
        </div>
    );
};

const PerformanceStats = ({ teamSummary, branchSummary, previousBranchSummary, individualStats, period, dateRange, loading }) => {
    // Helper to format date nicely
    const formatDateShort = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
        });
    };

    // Determine the best data source — current period first, fall back to previous
    const currentSource = (() => {
        if (teamSummary && teamSummary.length > 0) return teamSummary;
        if (branchSummary && branchSummary.length > 0) return branchSummary;
        return null;
    })();
    const isShowingPrevious = !currentSource && previousBranchSummary && previousBranchSummary.length > 0;
    const effectiveSource = currentSource || (isShowingPrevious ? previousBranchSummary : null);

    console.log('📊 [PerformanceStats] source:', {
        currentSource: currentSource?.length, previousLen: previousBranchSummary?.length,
        isShowingPrevious, effectiveSource: effectiveSource?.length
    });

    // Calculate aggregate stats
    const getAggregateStats = () => {
        if (!effectiveSource || effectiveSource.length === 0) {
            return null; // null = truly no data
        }

        const stats = effectiveSource.reduce((acc, team) => {
            acc.totalJobs += team.total_jobs_completed || 0;
            acc.totalValue += parseFloat(team.paid_job_value || 0);
            acc.totalRewards += parseFloat(team.total_rewards_earned || 0);
            acc.totalEfficiency += parseFloat(team.efficiency_percentage || 0);
            acc.onTimeJobs += team.jobs_on_time || 0;
            acc.timeSaved += team.total_time_saved || 0;
            return acc;
        }, {
            totalJobs: 0, totalValue: 0, totalRewards: 0,
            totalEfficiency: 0, onTimeJobs: 0, timeSaved: 0,
        });

        return {
            totalJobs: stats.totalJobs,
            totalValue: stats.totalValue,
            totalRewards: stats.totalRewards,
            avgEfficiency: effectiveSource.length > 0 ? stats.totalEfficiency / effectiveSource.length : 0,
            onTimePercentage: stats.totalJobs > 0 ? (stats.onTimeJobs / stats.totalJobs) * 100 : 0,
            timeSaved: stats.timeSaved,
        };
    };

    const stats = getAggregateStats();

    // Calculate previous period stats for trend comparison
    const getPreviousStats = () => {
        if (!previousBranchSummary || previousBranchSummary.length === 0) {
            return null;
        }

        const prevStats = previousBranchSummary.reduce((acc, team) => {
            acc.totalJobs += team.total_jobs_completed || 0;
            acc.totalValue += parseFloat(team.paid_job_value || 0);
            acc.totalRewards += parseFloat(team.total_rewards_earned || 0);
            acc.totalEfficiency += parseFloat(team.efficiency_percentage || 0);
            acc.onTimeJobs += team.jobs_on_time || 0;
            return acc;
        }, {
            totalJobs: 0,
            totalValue: 0,
            totalRewards: 0,
            totalEfficiency: 0,
            onTimeJobs: 0,
        });

        return {
            totalJobs: prevStats.totalJobs,
            totalValue: prevStats.totalValue,
            totalRewards: prevStats.totalRewards,
            avgEfficiency: previousBranchSummary.length > 0 ? prevStats.totalEfficiency / previousBranchSummary.length : 0,
            onTimePercentage: prevStats.totalJobs > 0 ? (prevStats.onTimeJobs / prevStats.totalJobs) * 100 : 0,
        };
    };

    const previousStats = getPreviousStats();

    // Calculate trend percentage
    const calculateTrend = (current, previous) => {
        if (!previous || previous === 0) return undefined;
        const change = ((current - previous) / previous) * 100;
        return Math.round(change);
    };

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Format time
    const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <BarChart2 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No data for this period</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    No jobs were completed in the selected period. Try switching to <strong>Weekly</strong>, <strong>Monthly</strong> or selecting a <strong>Custom Range</strong>.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Range and Info Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Performance Overview</h2>
                    {dateRange && (
                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-4 h-4" />
                            Analyzing data from <span className="font-semibold text-gray-700">{formatDateShort(dateRange.start_date)}</span> to <span className="font-semibold text-gray-700">{formatDateShort(dateRange.end_date)}</span>
                        </p>
                    )}
                </div>
            </div>

            {/* Previous-period banner */}
            {isShowingPrevious && (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <span className="text-lg">⚠️</span>
                    <span>
                        No data found for the current <strong>{period === 'custom' ? 'Selected range' : period}</strong>. Showing <strong>previous period</strong> data for reference.
                        Switch the range selector above to see other data.
                    </span>
                </div>
            )}
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Jobs Completed"
                    value={stats.totalJobs}
                    subtitle={period === 'custom' ? 'Selected range' : `This ${period}`}
                    icon={CheckCircle}
                    color="green"
                    trend={previousStats ? calculateTrend(stats.totalJobs, previousStats.totalJobs) : undefined}
                    loading={loading}
                />

                <StatCard
                    title="Paid Revenue"
                    value={formatCurrency(stats.totalValue)}
                    subtitle="Confirmed · invoices paid"
                    icon={BadgeCheck}
                    color="blue"
                    trend={previousStats ? calculateTrend(stats.totalValue, previousStats.totalValue) : undefined}
                    loading={loading}
                />

                <StatCard
                    title="Total Rewards"
                    value={formatCurrency(stats.totalRewards)}
                    subtitle={period === 'custom' ? 'Earned in range' : `Earned this ${period}`}
                    icon={Award}
                    color="orange"
                    trend={previousStats ? calculateTrend(stats.totalRewards, previousStats.totalRewards) : undefined}
                    loading={loading}
                />

                <StatCard
                    title="Avg Efficiency"
                    value={`${stats.avgEfficiency.toFixed(1)}%`}
                    subtitle="Team performance"
                    icon={Zap}
                    color="purple"
                    trend={previousStats ? calculateTrend(stats.avgEfficiency, previousStats.avgEfficiency) : undefined}
                    loading={loading}
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-600">On-Time Completion</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.onTimePercentage.toFixed(1)}%</p>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(stats.onTimePercentage, 100)}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-600">Time Saved</p>
                            <p className="text-2xl font-bold text-gray-900">{formatTime(stats.timeSaved)}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">Total time saved across all jobs</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-600">Avg Reward per Job</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.totalJobs > 0 ? formatCurrency(stats.totalRewards / stats.totalJobs) : '₹0'}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">Average reward distributed per completed job</p>
                </div>
            </div>

            {/* Individual Stats (if available) */}
            {individualStats && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Your Personal Performance</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-blue-600">{individualStats.total_jobs || 0}</p>
                            <p className="text-sm text-gray-600 mt-1">Jobs Completed</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-600">
                                {individualStats.on_time_percentage?.toFixed(1) || 0}%
                            </p>
                            <p className="text-sm text-gray-600 mt-1">On-Time Rate</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-orange-600">
                                {formatCurrency(individualStats.total_rewards || 0)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Total Rewards</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-purple-600">
                                {formatTime(individualStats.net_time_performance || 0)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">Net Time Saved</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceStats;
