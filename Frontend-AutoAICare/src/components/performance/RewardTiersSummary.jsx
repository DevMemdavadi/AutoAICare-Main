import React, { useState, useEffect } from 'react';
import {
    Award,
    TrendingUp,
    Clock,
    DollarSign,
    Info,
    Zap,
    Target,
    Users,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import api from '@/utils/api';

const RewardTiersSummary = ({ branchId }) => {
    const [rewardSettings, setRewardSettings] = useState(null);
    const [teamPerformance, setTeamPerformance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedTeams, setExpandedTeams] = useState({});

    useEffect(() => {
        loadRewardData();
    }, [branchId]);

    const loadRewardData = async () => {
        setLoading(true);
        try {
            // Load reward settings
            const settingsRes = await api.get('/jobcards/reward-settings/');
            const settings = settingsRes.data.results?.[0] || settingsRes.data;
            setRewardSettings(settings);

            // Load monthly performance data by team using branch-summary
            // This endpoint returns team performance for all branches (company admin)
            // or specific branch (branch admin)
            const perfRes = await api.get('/jobcards/performance/branch-summary/', {
                params: {
                    period: 'monthly',
                }
            });

            console.log('Team performance data:', perfRes.data);
            setTeamPerformance(perfRes.data || []);
        } catch (error) {
            console.error('Error loading reward data:', error);
            console.error('Error details:', error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value || 0);
    };

    const calculateTeamReward = (team) => {
        if (!rewardSettings || !rewardSettings.use_percentage_based_rewards) {
            return { totalRevenue: 0, totalReward: 0, tier: null, percentage: 0 };
        }

        const totalRevenue = parseFloat(team.paid_job_value || 0);
        let tier = null;
        let percentage = 0;

        // Determine tier based on team revenue
        if (totalRevenue >= parseFloat(rewardSettings.tier_4_job_value_min)) {
            tier = 4;
            percentage = parseFloat(rewardSettings.tier_4_reward_percentage);
        } else if (totalRevenue >= parseFloat(rewardSettings.tier_3_job_value_min)) {
            tier = 3;
            percentage = parseFloat(rewardSettings.tier_3_reward_percentage);
        } else if (totalRevenue >= parseFloat(rewardSettings.tier_2_job_value_min)) {
            tier = 2;
            percentage = parseFloat(rewardSettings.tier_2_reward_percentage);
        } else if (totalRevenue >= parseFloat(rewardSettings.tier_1_job_value_min)) {
            tier = 1;
            percentage = parseFloat(rewardSettings.tier_1_reward_percentage);
        }

        const baseReward = (totalRevenue * percentage) / 100;

        // Calculate time bonus if applicable
        let timeBonus = 0;
        if (rewardSettings.apply_time_bonus && tier) {
            const totalTimeSaved = team.total_time_saved || 0;
            const bonusIntervals = Math.floor(totalTimeSaved / rewardSettings.time_bonus_interval_minutes);
            const bonusPercentage = bonusIntervals * parseFloat(rewardSettings.time_bonus_percentage);
            timeBonus = (totalRevenue * bonusPercentage) / 100;
        }

        const totalReward = baseReward + timeBonus;

        // Calculate distribution
        const applicatorSharePct = parseFloat(rewardSettings.applicator_share_percentage) / 100;
        const supervisorShare = totalReward * (1 - applicatorSharePct);
        const applicatorPool = totalReward * applicatorSharePct;

        // Get team size from team_members array
        const teamSize = team.team_members?.length || 0;
        const applicatorIndividual = teamSize > 0 ? applicatorPool / teamSize : 0;

        return {
            totalRevenue,
            baseReward,
            timeBonus,
            totalReward,
            tier,
            percentage,
            supervisorShare,
            applicatorPool,
            applicatorIndividual,
            timeSaved: team.total_time_saved || 0,
            teamSize,
        };
    };

    const toggleTeamExpand = (teamId) => {
        setExpandedTeams(prev => ({
            ...prev,
            [teamId]: !prev[teamId]
        }));
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
            </div>
        );
    }

    if (!rewardSettings || !rewardSettings.use_percentage_based_rewards) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                        Percentage-based rewards are not enabled. Contact your administrator to configure reward settings.
                    </p>
                </div>
            </div>
        );
    }

    // Calculate totals across all teams
    const grandTotals = teamPerformance.reduce((acc, team) => {
        const reward = calculateTeamReward(team);
        acc.totalRevenue += reward.totalRevenue;
        acc.totalReward += reward.totalReward;
        acc.totalSupervisorShare += reward.supervisorShare;
        acc.totalApplicatorPool += reward.applicatorPool;
        return acc;
    }, { totalRevenue: 0, totalReward: 0, totalSupervisorShare: 0, totalApplicatorPool: 0 });

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Monthly Reward Projections</h4>
                        <p className="text-sm text-blue-800">
                            This tab shows <strong>projected end-of-month rewards</strong> based on current month-to-date performance.
                            Rewards are calculated using revenue tiers and time bonuses. Teams must reach minimum tier thresholds
                            (₹{formatCurrency(parseFloat(rewardSettings.tier_1_job_value_min))}) to earn rewards.
                        </p>
                        <p className="text-xs text-blue-700 mt-2">
                            💡 <strong>Tip:</strong> Rewards are paid at the end of each month based on total monthly revenue per team.
                        </p>
                    </div>
                </div>
            </div>

            {/* Overall Summary */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-white/20 rounded-lg">
                        <Award className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold">Monthly Reward Summary</h3>
                        <p className="text-green-100 text-sm">
                            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Month-to-Date)
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-green-100 text-sm mb-1">Total Revenue (Paid MTD)</p>
                        <p className="text-3xl font-bold">{formatCurrency(grandTotals.totalRevenue)}</p>
                    </div>
                    <div>
                        <p className="text-green-100 text-sm mb-1">Projected Rewards</p>
                        <p className="text-3xl font-bold">{formatCurrency(grandTotals.totalReward)}</p>
                    </div>
                    <div>
                        <p className="text-green-100 text-sm mb-1">Supervisor Share</p>
                        <p className="text-3xl font-bold">{formatCurrency(grandTotals.totalSupervisorShare)}</p>
                    </div>
                    <div>
                        <p className="text-green-100 text-sm mb-1">Applicator Pool</p>
                        <p className="text-3xl font-bold">{formatCurrency(grandTotals.totalApplicatorPool)}</p>
                    </div>
                </div>
            </div>

            {/* Reward Tiers Reference */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Target className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Reward Tiers</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((tierNum) => {
                        const minValue = parseFloat(rewardSettings[`tier_${tierNum}_job_value_min`]);
                        const percentage = parseFloat(rewardSettings[`tier_${tierNum}_reward_percentage`]);

                        return (
                            <div
                                key={tierNum}
                                className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 rounded-lg bg-blue-500">
                                        <Award className="w-4 h-4 text-white" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900">Tier {tierNum}</h4>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                    {formatCurrency(minValue)}+
                                </p>
                                <p className="text-2xl font-bold text-gray-900">{percentage}%</p>
                                <p className="text-xs text-gray-500 mt-1">reward percentage</p>
                            </div>
                        );
                    })}
                </div>

                {/* Time Bonus Info */}
                {rewardSettings.apply_time_bonus && (
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-1">Time Bonus</h4>
                                <p className="text-sm text-gray-700">
                                    +{rewardSettings.time_bonus_percentage}% for every {rewardSettings.time_bonus_interval_minutes} minutes saved
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Team-wise Rewards */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Users className="w-6 h-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Team Rewards Breakdown</h3>
                </div>

                {teamPerformance.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No team performance data available for this month</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {teamPerformance.map((team) => {
                            const reward = calculateTeamReward(team);
                            const isExpanded = expandedTeams[team.id];

                            return (
                                <div
                                    key={team.id}
                                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                                >
                                    {/* Team Header */}
                                    <div
                                        className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 cursor-pointer"
                                        onClick={() => toggleTeamExpand(team.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                                    <Users className="w-5 h-5 text-purple-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">
                                                        {team.supervisor_name}
                                                    </h4>
                                                    <p className="text-sm text-gray-600">{team.branch_name}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-600">Revenue</p>
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {formatCurrency(reward.totalRevenue)}
                                                    </p>
                                                </div>
                                                {reward.tier && (
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-600">Tier</p>
                                                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                                                            Tier {reward.tier}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-600">Total Reward</p>
                                                    <p className="text-lg font-bold text-green-600">
                                                        {formatCurrency(reward.totalReward)}
                                                    </p>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="p-4 bg-white border-t border-gray-200">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Calculation Breakdown */}
                                                <div>
                                                    <h5 className="font-medium text-gray-900 mb-3">Calculation</h5>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Base Revenue:</span>
                                                            <span className="font-medium">{formatCurrency(reward.totalRevenue)}</span>
                                                        </div>
                                                        {reward.tier && (
                                                            <>
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-600">Tier {reward.tier} ({reward.percentage}%):</span>
                                                                    <span className="font-medium">{formatCurrency(reward.baseReward)}</span>
                                                                </div>
                                                                {reward.timeBonus > 0 && (
                                                                    <div className="flex justify-between text-blue-600">
                                                                        <span>Time Bonus ({reward.timeSaved} min saved):</span>
                                                                        <span className="font-medium">+{formatCurrency(reward.timeBonus)}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
                                                                    <span>Total Reward:</span>
                                                                    <span className="text-green-600">{formatCurrency(reward.totalReward)}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                        {!reward.tier && (
                                                            <p className="text-yellow-600 text-sm">
                                                                Revenue below minimum tier threshold
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Distribution */}
                                                {reward.tier && (
                                                    <div>
                                                        <h5 className="font-medium text-gray-900 mb-3">Distribution</h5>
                                                        <div className="space-y-3">
                                                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Award className="w-4 h-4 text-orange-600" />
                                                                    <span className="text-sm font-medium text-gray-900">Supervisor</span>
                                                                </div>
                                                                <p className="text-2xl font-bold text-orange-600">
                                                                    {formatCurrency(reward.supervisorShare)}
                                                                </p>
                                                                <p className="text-xs text-gray-600 mt-1">
                                                                    {100 - parseFloat(rewardSettings.applicator_share_percentage)}% of total
                                                                </p>
                                                            </div>

                                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Users className="w-4 h-4 text-blue-600" />
                                                                    <span className="text-sm font-medium text-gray-900">
                                                                        Applicator Team ({reward.teamSize} members)
                                                                    </span>
                                                                </div>
                                                                <p className="text-2xl font-bold text-blue-600">
                                                                    {formatCurrency(reward.applicatorPool)}
                                                                </p>
                                                                <p className="text-xs text-gray-600 mt-1">
                                                                    {formatCurrency(reward.applicatorIndividual)} per applicator
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RewardTiersSummary;
