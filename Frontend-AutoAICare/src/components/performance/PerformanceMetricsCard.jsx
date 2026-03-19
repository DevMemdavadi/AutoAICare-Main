import React from 'react';
import {
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    StarIcon,
    TrophyIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

const PerformanceMetricsCard = ({ metrics }) => {
    const {
        jobs_assigned = 0,
        jobs_completed = 0,
        jobs_in_progress = 0,
        completion_rate = 0,
        qc_passed = 0,
        qc_failed = 0,
        qc_pass_rate = 0,
        avg_completion_time = 0,
        time_saved = 0,
        time_overrun = 0,
        efficiency_score = 0,
        total_rewards = 0,
        total_deductions = 0,
        net_incentive = 0,
        avg_customer_rating = 0,
        feedback_count = 0,
        branch_rank = null,
        overall_rank = null,
        is_top_performer = false
    } = metrics;

    const MetricCard = ({ title, value, subtitle, icon: Icon, color, bgColor }) => (
        <div className={`${bgColor} rounded-xl p-3 md:p-6 border-2 ${color.replace('text-', 'border-').replace('600', '200')}`}>
            <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-xs md:text-sm font-medium text-slate-700 leading-tight">{title}</h3>
                <Icon className={`h-4 w-4 md:h-6 md:w-6 flex-shrink-0 ${color}`} />
            </div>
            <p className={`text-xl md:text-3xl font-bold ${color} mb-0.5 md:mb-1`}>{value}</p>
            {subtitle && <p className="text-xs text-slate-600 leading-tight">{subtitle}</p>}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Top Performer Badge */}
            {is_top_performer && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-white bg-opacity-20 rounded-full">
                            <TrophyIcon className="h-12 w-12" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-1">🎉 Top Performer!</h2>
                            <p className="text-amber-100">
                                You're in the top 10% this month. Keep up the excellent work!
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Job Completion Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
                <h2 className="text-base md:text-xl font-bold text-slate-900 mb-4 md:mb-6 flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                    Job Completion Metrics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <MetricCard
                        title="Jobs Assigned"
                        value={jobs_assigned}
                        subtitle="Total jobs this month"
                        icon={ClockIcon}
                        color="text-blue-600"
                        bgColor="bg-blue-50"
                    />
                    <MetricCard
                        title="Jobs Completed"
                        value={jobs_completed}
                        subtitle={`${completion_rate.toFixed(1)}% completion rate`}
                        icon={CheckCircleIcon}
                        color="text-green-600"
                        bgColor="bg-green-50"
                    />
                    <MetricCard
                        title="In Progress"
                        value={jobs_in_progress}
                        subtitle="Currently working on"
                        icon={ClockIcon}
                        color="text-amber-600"
                        bgColor="bg-amber-50"
                    />
                </div>
            </div>

            {/* Quality Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
                <h2 className="text-base md:text-xl font-bold text-slate-900 mb-4 md:mb-6 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                    Quality Control Metrics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <MetricCard
                        title="QC Pass Rate"
                        value={`${qc_pass_rate.toFixed(1)}%`}
                        subtitle="Quality standard"
                        icon={CheckCircleIcon}
                        color="text-green-600"
                        bgColor="bg-green-50"
                    />
                    <MetricCard
                        title="QC Passed"
                        value={qc_passed}
                        subtitle="Jobs passed QC"
                        icon={CheckCircleIcon}
                        color="text-blue-600"
                        bgColor="bg-blue-50"
                    />
                    <MetricCard
                        title="QC Failed"
                        value={qc_failed}
                        subtitle="Needs improvement"
                        icon={XCircleIcon}
                        color="text-red-600"
                        bgColor="bg-red-50"
                    />
                </div>
            </div>

            {/* Time Efficiency */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
                <h2 className="text-base md:text-xl font-bold text-slate-900 mb-4 md:mb-6 flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                    Time Efficiency
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <MetricCard
                        title="Avg Completion Time"
                        value={`${avg_completion_time} min`}
                        subtitle="Per job"
                        icon={ClockIcon}
                        color="text-purple-600"
                        bgColor="bg-purple-50"
                    />
                    <MetricCard
                        title="Time Saved"
                        value={`${time_saved} min`}
                        subtitle="Early completions"
                        icon={CheckCircleIcon}
                        color="text-green-600"
                        bgColor="bg-green-50"
                    />
                    <MetricCard
                        title="Time Overrun"
                        value={`${time_overrun} min`}
                        subtitle="Late completions"
                        icon={XCircleIcon}
                        color="text-red-600"
                        bgColor="bg-red-50"
                    />
                    <MetricCard
                        title="Efficiency Score"
                        value={`${efficiency_score.toFixed(1)}/100`}
                        subtitle="Overall efficiency"
                        icon={ChartBarIcon}
                        color="text-indigo-600"
                        bgColor="bg-indigo-50"
                    />
                </div>
            </div>

            {/* Incentives & Earnings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
                <h2 className="text-base md:text-xl font-bold text-slate-900 mb-4 md:mb-6 flex items-center gap-2">
                    <span className="text-xl md:text-2xl">💰</span>
                    Incentives &amp; Earnings
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 md:p-6 border-2 border-green-200">
                        <div className="flex items-center justify-between mb-2 md:mb-3">
                            <h3 className="text-xs md:text-sm font-medium text-slate-700">Total Rewards</h3>
                            <CheckCircleIcon className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
                        </div>
                        <p className="text-xl md:text-3xl font-bold text-green-600 mb-0.5 md:mb-1">
                            ₹{total_rewards.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-600">Early completion bonuses</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-3 md:p-6 border-2 border-red-200">
                        <div className="flex items-center justify-between mb-2 md:mb-3">
                            <h3 className="text-xs md:text-sm font-medium text-slate-700">Total Deductions</h3>
                            <XCircleIcon className="h-4 w-4 md:h-6 md:w-6 text-red-600" />
                        </div>
                        <p className="text-xl md:text-3xl font-bold text-red-600 mb-0.5 md:mb-1">
                            ₹{total_deductions.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-600">Late completion penalties</p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 md:p-6 border-2 border-amber-300">
                        <div className="flex items-center justify-between mb-2 md:mb-3">
                            <h3 className="text-xs md:text-sm font-medium text-slate-700">Net Incentive</h3>
                            <span className="text-xl md:text-2xl">🎯</span>
                        </div>
                        <p className="text-xl md:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-0.5 md:mb-1">
                            ₹{net_incentive.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-600">This month's earnings</p>
                    </div>
                </div>
            </div>

            {/* Customer Satisfaction */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
                <h2 className="text-base md:text-xl font-bold text-slate-900 mb-4 md:mb-6 flex items-center gap-2">
                    <StarIcon className="h-5 w-5 md:h-6 md:w-6 text-amber-500" />
                    Customer Satisfaction
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border-2 border-amber-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-slate-700">Average Rating</h3>
                            <StarIcon className="h-6 w-6 text-amber-500" />
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-3xl font-bold text-amber-600">
                                {avg_customer_rating.toFixed(1)}
                            </p>
                            <p className="text-lg text-slate-500">/ 5.0</p>
                        </div>
                        <div className="flex gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <StarIcon
                                    key={star}
                                    className={`h-5 w-5 ${star <= Math.round(avg_customer_rating)
                                        ? 'text-amber-500 fill-amber-500'
                                        : 'text-slate-300'
                                        }`}
                                />
                            ))}
                        </div>
                        <p className="text-sm text-slate-600">Based on {feedback_count} reviews</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-slate-700">Rankings</h3>
                            <TrophyIcon className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Branch Rank</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    #{branch_rank || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Overall Rank</p>
                                <p className="text-2xl font-bold text-pink-600">
                                    #{overall_rank || '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceMetricsCard;
