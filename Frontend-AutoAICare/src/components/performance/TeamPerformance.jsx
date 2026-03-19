import React from 'react';
import {
    Users,
    TrendingUp,
    Award,
    Clock,
    CheckCircle,
    Target,
    DollarSign,
} from 'lucide-react';

const TeamPerformance = ({ summary, period, loading }) => {
    console.log('👥 [TeamPerformance] props:', { summary, summaryLength: summary?.length, period, loading });

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
                        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!summary || summary.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Data</h3>
                <p className="text-gray-500">Team performance data will appear here once jobs are completed</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Team Cards */}
            {summary.map((team, index) => (
                <div key={team.id || index} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Team Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-lg shadow-sm">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{team.supervisor_name}</h3>
                                    <p className="text-sm text-gray-600">{team.branch_name}</p>
                                </div>
                            </div>

                            {/* Efficiency Badge */}
                            <div className="text-right">
                                <p className="text-sm text-gray-600 mb-1">Efficiency</p>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${(team.efficiency_percentage || 0) >= 80
                                    ? 'bg-green-100 text-green-800'
                                    : (team.efficiency_percentage || 0) >= 60
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                    {parseFloat(team.efficiency_percentage || 0).toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team Stats */}
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-4 h-4 text-gray-400" />
                                    <p className="text-sm text-gray-600">Jobs Completed</p>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{team.total_jobs_completed || 0}</p>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-gray-400" />
                                    <p className="text-sm text-gray-600">Paid Revenue</p>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(team.paid_job_value || 0)}
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Award className="w-4 h-4 text-gray-400" />
                                    <p className="text-sm text-gray-600">Rewards Earned</p>
                                </div>
                                <p className="text-2xl font-bold text-orange-600">
                                    {formatCurrency(team.total_rewards_earned || 0)}
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <p className="text-sm text-gray-600">Time Performance</p>
                                </div>
                                <p className={`text-2xl font-bold ${(team.total_time_saved || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {formatTime(team.total_time_saved || 0)}
                                </p>
                            </div>
                        </div>

                        {/* Performance Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Completion Stats */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Completion Stats</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">On Time</span>
                                        <span className="text-sm font-semibold text-green-600">
                                            {team.jobs_on_time || 0} ({parseFloat(team.on_time_percentage || 0).toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Delayed</span>
                                        <span className="text-sm font-semibold text-red-600">
                                            {team.jobs_delayed || 0}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                                        <div
                                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(team.on_time_percentage || 0, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Quality Metrics */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Quality Metrics</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Avg Quality Score</span>
                                        <span className="text-sm font-semibold text-blue-600">
                                            {parseFloat(team.avg_quality_score || 0).toFixed(1)}/10
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Customer Satisfaction</span>
                                        <span className="text-sm font-semibold text-purple-600">
                                            {parseFloat(team.avg_customer_satisfaction || 0).toFixed(1)}/10
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${(team.avg_quality_score || 0) * 10}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Team Members */}
                        {team.team_members && team.team_members.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">
                                    Team Members ({team.team_size || team.team_members.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {team.team_members.map((member) => (
                                        <div
                                            key={member.id}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-semibold">
                                                {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            {member.name || `#${member.id}`}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-6">
                    <Target className="w-8 h-8" />
                    <div>
                        <h3 className="text-xl font-bold">Overall Team Performance</h3>
                        <p className="text-blue-100 text-sm">This {period}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-blue-100 text-sm mb-1">Total Teams</p>
                        <p className="text-3xl font-bold">{summary.length}</p>
                    </div>
                    <div>
                        <p className="text-blue-100 text-sm mb-1">Total Jobs</p>
                        <p className="text-3xl font-bold">
                            {summary.reduce((acc, team) => acc + (team.total_jobs_completed || 0), 0)}
                        </p>
                    </div>
                    <div>
                        <p className="text-blue-100 text-sm mb-1">Paid Revenue</p>
                        <p className="text-3xl font-bold">
                            {formatCurrency(summary.reduce((acc, team) => acc + parseFloat(team.paid_job_value || 0), 0))}
                        </p>
                    </div>
                    <div>
                        <p className="text-blue-100 text-sm mb-1">Total Rewards</p>
                        <p className="text-3xl font-bold">
                            {formatCurrency(summary.reduce((acc, team) => acc + parseFloat(team.total_rewards_earned || 0), 0))}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamPerformance;
