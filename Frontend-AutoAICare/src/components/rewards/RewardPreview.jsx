import React from 'react';
import { TrendingUp, TrendingDown, Clock, Award } from 'lucide-react';
import { Badge } from '@/components/ui';

/**
 * RewardPreview Component
 * Displays potential reward or deduction for a job card based on current timer status
 * 
 * @param {Object} rewardData - Reward calculation data from API
 * @param {boolean} compact - Whether to show compact version
 * @param {boolean} showBreakdown - Whether to show supervisor/applicator breakdown
 */
const RewardPreview = ({ rewardData, compact = false, showBreakdown = false }) => {
    if (!rewardData) {
        return null;
    }

    const { transaction_type, total_amount, supervisor_amount, tier, time_difference_minutes, status } = rewardData;

    // Determine color scheme based on transaction type
    const isReward = transaction_type === 'reward';
    const colorClasses = {
        reward: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-700',
            icon: 'text-green-600',
            badge: 'success'
        },
        deduction: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: 'text-red-600',
            badge: 'danger'
        },
        onTrack: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-700',
            icon: 'text-blue-600',
            badge: 'info'
        }
    };

    const colors = isReward ? colorClasses.reward : colorClasses.deduction;
    const Icon = isReward ? TrendingUp : TrendingDown;

    // Compact version for job cards
    if (compact) {
        return (
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${colors.bg} ${colors.border} border`}>
                <Icon size={14} className={colors.icon} />
                <span className={`text-xs font-semibold ${colors.text}`}>
                    {isReward ? '+' : '-'}₹{total_amount.toFixed(0)}
                </span>
                {tier && (
                    <Badge variant={colors.badge} className="text-[9px] px-1 py-0">
                        {tier.replace('tier_', 'T')}
                    </Badge>
                )}
            </div>
        );
    }

    // Full version with details
    return (
        <div className={`p-4 rounded-lg ${colors.bg} ${colors.border} border-2`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Icon size={20} className={colors.icon} />
                    <div>
                        <h4 className={`font-bold text-sm ${colors.text}`}>
                            {isReward ? 'Potential Reward' : 'Potential Deduction'}
                        </h4>
                        <p className="text-xs text-gray-600">
                            {Math.abs(time_difference_minutes)} min {status}
                        </p>
                    </div>
                </div>
                {tier && (
                    <Badge variant={colors.badge}>
                        {tier.replace('tier_', 'Tier ')}
                    </Badge>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                    <span className={`text-xl font-bold ${colors.text}`}>
                        {isReward ? '+' : '-'}₹{total_amount.toFixed(2)}
                    </span>
                </div>

                {showBreakdown && supervisor_amount !== undefined && (
                    <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Supervisor Share:</span>
                            <span className={`font-semibold ${colors.text}`}>
                                ₹{supervisor_amount.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-gray-600">Applicator Pool:</span>
                            <span className={`font-semibold ${colors.text}`}>
                                ₹{(total_amount - supervisor_amount).toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Performance indicator */}
            <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock size={12} />
                    <span>
                        {isReward
                            ? `Completed ${Math.abs(time_difference_minutes)} minutes early`
                            : `Running ${Math.abs(time_difference_minutes)} minutes late`
                        }
                    </span>
                </div>
            </div>
        </div>
    );
};

/**
 * RewardBadge Component
 * Small badge indicator for reward status
 */
export const RewardBadge = ({ rewardData }) => {
    if (!rewardData) {
        return null;
    }

    const { transaction_type, total_amount } = rewardData;
    const isReward = transaction_type === 'reward';

    return (
        <Badge
            variant={isReward ? 'success' : 'danger'}
            className="text-xs font-semibold"
        >
            {isReward ? '+' : '-'}₹{total_amount.toFixed(0)}
        </Badge>
    );
};

/**
 * RewardTooltip Component
 * Tooltip content for reward preview
 */
export const RewardTooltipContent = ({ rewardData }) => {
    if (!rewardData) {
        return null;
    }

    const { transaction_type, total_amount, supervisor_amount, tier, time_difference_minutes } = rewardData;
    const isReward = transaction_type === 'reward';

    return (
        <div className="text-xs space-y-1">
            <div className="font-semibold">
                {isReward ? 'Reward' : 'Deduction'}: ₹{total_amount.toFixed(2)}
            </div>
            {tier && <div>Tier: {tier.replace('tier_', '').toUpperCase()}</div>}
            <div>{Math.abs(time_difference_minutes)} min {isReward ? 'early' : 'late'}</div>
            {supervisor_amount !== undefined && (
                <>
                    <div className="border-t border-gray-300 pt-1 mt-1">
                        <div>Supervisor: ₹{supervisor_amount.toFixed(2)}</div>
                        <div>Applicators: ₹{(total_amount - supervisor_amount).toFixed(2)}</div>
                    </div>
                </>
            )}
        </div>
    );
};

export default RewardPreview;
