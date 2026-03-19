import React from 'react';
import {
    BanknotesIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    TrophyIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

const IncentivePreview = ({ data, loading }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <BanknotesIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No incentive data available</p>
            </div>
        );
    }

    const { employee, period, summary, breakdown, performance } = data;

    const getTierColor = (tier) => {
        switch (tier) {
            case 'tier_1':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'tier_2':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'tier_3':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            default:
                return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const getTierLabel = (tier) => {
        switch (tier) {
            case 'tier_1':
                return 'Tier 1 (15 min early)';
            case 'tier_2':
                return 'Tier 2 (30 min early)';
            case 'tier_3':
                return 'Tier 3 (45 min early)';
            default:
                return tier;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold mb-1">Incentive Preview</h2>
                        <p className="text-amber-100 text-sm">
                            {employee.name} - {period.month}/{period.year}
                        </p>
                    </div>
                    <div className="sm:text-right">
                        <p className="text-amber-100 text-xs md:text-sm mb-1">Net Incentive</p>
                        <p className="text-3xl md:text-4xl font-bold">₹{summary.net_incentive.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-4 md:p-6">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                        <h3 className="text-xs md:text-sm font-medium text-slate-700">Total Rewards</h3>
                        <CheckCircleIcon className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
                    </div>
                    <p className="text-xl md:text-3xl font-bold text-green-600 mb-1 md:mb-2">
                        ₹{summary.total_rewards.toFixed(2)}
                    </p>
                    <p className="text-xs md:text-sm text-slate-600">
                        From {breakdown.filter(b => b.type === 'reward').length} early completions
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-4 md:p-6">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                        <h3 className="text-xs md:text-sm font-medium text-slate-700">Total Deductions</h3>
                        <XCircleIcon className="h-4 w-4 md:h-6 md:w-6 text-red-600" />
                    </div>
                    <p className="text-xl md:text-3xl font-bold text-red-600 mb-1 md:mb-2">
                        ₹{summary.total_deductions.toFixed(2)}
                    </p>
                    <p className="text-xs md:text-sm text-slate-600">
                        From {breakdown.filter(b => b.type === 'deduction').length} late completions
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 p-4 md:p-6">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                        <h3 className="text-xs md:text-sm font-medium text-slate-700">Jobs Completed</h3>
                        <TrophyIcon className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
                    </div>
                    <p className="text-xl md:text-3xl font-bold text-blue-600 mb-1 md:mb-2">
                        {summary.jobs_completed}
                    </p>
                    <p className="text-xs md:text-sm text-slate-600">This month</p>
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
                <h3 className="text-base md:text-lg font-bold text-slate-900 mb-3 md:mb-4 flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                    Performance Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="p-3 md:p-4 bg-blue-50 rounded-lg">
                        <p className="text-xs md:text-sm text-blue-700 mb-1">QC Pass Rate</p>
                        <p className="text-xl md:text-2xl font-bold text-blue-900">
                            {performance.qc_pass_rate.toFixed(1)}%
                        </p>
                    </div>
                    <div className="p-3 md:p-4 bg-purple-50 rounded-lg">
                        <p className="text-xs md:text-sm text-purple-700 mb-1">Avg Completion</p>
                        <p className="text-xl md:text-2xl font-bold text-purple-900">
                            {performance.avg_completion_time} min
                        </p>
                    </div>
                    <div className="p-3 md:p-4 bg-green-50 rounded-lg">
                        <p className="text-xs md:text-sm text-green-700 mb-1">Efficiency Score</p>
                        <p className="text-xl md:text-2xl font-bold text-green-900">
                            {performance.efficiency_score.toFixed(1)}/100
                        </p>
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">Incentive Breakdown</h3>
                    <p className="text-sm text-slate-600 mt-1">
                        Detailed breakdown of all rewards and deductions
                    </p>
                </div>

                {breakdown.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-slate-500">No incentive transactions this month</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {breakdown.map((item, index) => (
                            <div key={index} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-lg ${item.type === 'reward'
                                                ? 'bg-green-100'
                                                : 'bg-red-100'
                                                }`}>
                                                {item.type === 'reward' ? (
                                                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                                ) : (
                                                    <XCircleIcon className="h-5 w-5 text-red-600" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900">
                                                    Job Card #{item.job_card_id}
                                                </h4>
                                                <p className="text-sm text-slate-500">
                                                    {item.type === 'reward' ? 'Early Completion' : 'Late Completion'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="ml-14 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            {item.tier && (
                                                <div>
                                                    <p className="text-slate-500 mb-1">Tier</p>
                                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getTierColor(item.tier)}`}>
                                                        {getTierLabel(item.tier)}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-slate-500 mb-1">Time Difference</p>
                                                <p className="font-medium text-slate-900">
                                                    {Math.abs(item.time_difference)} min {item.time_difference < 0 ? 'early' : 'late'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 mb-1">Amount</p>
                                                <p className={`font-bold ${item.type === 'reward' ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {item.type === 'reward' ? '+' : '-'}₹{item.amount.toFixed(2)}
                                                </p>
                                            </div>
                                            {item.notes && (
                                                <div className="col-span-2 md:col-span-1">
                                                    <p className="text-slate-500 mb-1">Notes</p>
                                                    <p className="text-xs text-slate-600">{item.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary Footer */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-slate-900 mb-3">💡 Tips to Increase Earnings</h4>
                        <ul className="space-y-2 text-sm text-slate-700">
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">✓</span>
                                <span>Complete jobs 15+ minutes early for Tier 1 rewards</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">✓</span>
                                <span>Maintain high QC pass rate for better efficiency score</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">✓</span>
                                <span>Avoid late completions to prevent deductions</span>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-900 mb-3">📊 This Month's Stats</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Early Completions:</span>
                                <span className="font-semibold text-green-600">
                                    {breakdown.filter(b => b.type === 'reward').length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Late Completions:</span>
                                <span className="font-semibold text-red-600">
                                    {breakdown.filter(b => b.type === 'deduction').length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">On-Time Rate:</span>
                                <span className="font-semibold text-blue-600">
                                    {summary.jobs_completed > 0
                                        ? ((breakdown.filter(b => b.type === 'reward').length / summary.jobs_completed) * 100).toFixed(1)
                                        : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IncentivePreview;
