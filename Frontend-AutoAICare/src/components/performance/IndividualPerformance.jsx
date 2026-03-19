import React from 'react';
import {
    TrendingUp,
    Award,
    Clock,
    CheckCircle,
    Target,
    Zap,
} from 'lucide-react';

const IndividualPerformance = ({ stats, period, loading }) => {
    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value || 0);
    };

    // Format time
    const formatTime = (minutes) => {
        const hours = Math.floor(Math.abs(minutes) / 60);
        const mins = Math.abs(minutes) % 60;
        const sign = minutes < 0 ? '-' : '+';
        if (hours > 0) {
            return `${sign}${hours}h ${mins}m`;
        }
        return `${sign}${mins}m`;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Performance Data</h3>
                <p className="text-gray-500">Complete some jobs to see your performance metrics</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Jobs Completed</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total_jobs || 0}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        {period === 'custom' ? 'Selected range' : `This ${period}`}
                    </p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">On-Time Rate</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.on_time_percentage?.toFixed(1) || 0}%
                            </p>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(stats.on_time_percentage || 0, 100)}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <Award className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Rewards</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(stats.total_rewards || 0)}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        {period === 'custom' ? 'Earned in range' : `Earned this ${period}`}
                    </p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 rounded-lg ${(stats.net_time_performance || 0) >= 0 ? 'bg-purple-100' : 'bg-red-100'
                            }`}>
                            <Clock className={`w-6 h-6 ${(stats.net_time_performance || 0) >= 0 ? 'text-purple-600' : 'text-red-600'
                                }`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Net Time</p>
                            <p className={`text-2xl font-bold ${(stats.net_time_performance || 0) >= 0 ? 'text-purple-600' : 'text-red-600'
                                }`}>
                                {formatTime(stats.net_time_performance || 0)}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        {(stats.net_time_performance || 0) >= 0 ? 'Time saved' : 'Time delayed'}
                    </p>
                </div>
            </div>

            {/* Detailed Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Jobs Breakdown */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-4">Job Completion</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Jobs On Time</span>
                                <span className="text-sm font-semibold text-green-600">
                                    {stats.jobs_on_time || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Jobs Delayed</span>
                                <span className="text-sm font-semibold text-red-600">
                                    {stats.jobs_delayed || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                <span className="text-sm font-medium text-gray-900">Total Jobs</span>
                                <span className="text-sm font-bold text-gray-900">
                                    {stats.total_jobs || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Time Performance */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-4">Time Performance</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Time Saved</span>
                                <span className="text-sm font-semibold text-green-600">
                                    {formatTime(stats.total_time_saved || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Time Delayed</span>
                                <span className="text-sm font-semibold text-red-600">
                                    {formatTime(Math.abs(stats.total_time_delayed || 0))}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                <span className="text-sm font-medium text-gray-900">Net Performance</span>
                                <span className={`text-sm font-bold ${(stats.net_time_performance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {formatTime(stats.net_time_performance || 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Efficiency Score */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Zap className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Efficiency Score</h3>
                            <p className="text-sm text-gray-600">Based on time performance and completion rate</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-bold text-blue-600">
                            {stats.efficiency_percentage?.toFixed(0) || 0}
                        </p>
                        <p className="text-sm text-gray-600">out of 100</p>
                    </div>
                </div>

                <div className="w-full bg-blue-200 rounded-full h-3">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(stats.efficiency_percentage || 0, 100)}%` }}
                    ></div>
                </div>
            </div>

            {/* Performance Tips */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
                <div className="space-y-3">
                    {(stats.on_time_percentage || 0) >= 80 && (
                        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-green-900">Excellent On-Time Performance!</p>
                                <p className="text-xs text-green-700 mt-1">
                                    You're completing {stats.on_time_percentage?.toFixed(0)}% of jobs on time. Keep it up!
                                </p>
                            </div>
                        </div>
                    )}

                    {(stats.on_time_percentage || 0) < 80 && (
                        <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                            <Target className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-yellow-900">Room for Improvement</p>
                                <p className="text-xs text-yellow-700 mt-1">
                                    Try to improve your on-time completion rate to earn more rewards.
                                </p>
                            </div>
                        </div>
                    )}

                    {(stats.total_rewards || 0) > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                            <Award className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-blue-900">Great Earnings!</p>
                                <p className="text-xs text-blue-700 mt-1">
                                    You've earned {formatCurrency(stats.total_rewards)} in rewards {period === 'custom' ? 'in this range' : `this ${period}`}.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IndividualPerformance;
