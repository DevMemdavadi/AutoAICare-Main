import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Loader, Alert, Badge } from '@/components/ui';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    History,
    CheckCircle,
    Clock,
    XCircle
} from 'lucide-react';
import api from '@/utils/api';

const SupervisorRewardSummary = () => {
    const [summary, setSummary] = useState(null);
    const [recentRewards, setRecentRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        fetchRewardData();
    }, []);

    const fetchRewardData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch summary
            const summaryResponse = await api.get('/jobcards/rewards/summary/');
            setSummary(summaryResponse.data);

            // Fetch recent rewards
            const rewardsResponse = await api.get('/jobcards/rewards/?limit=5');
            setRecentRewards(rewardsResponse.data.results || rewardsResponse.data);

        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load reward data');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'warning';
            case 'approved':
                return 'info';
            case 'paid':
                return 'success';
            case 'cancelled':
                return 'danger';
            default:
                return 'default';
        }
    };

    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount).toFixed(2)}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <Card>
                <Loader />
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <Alert type="error" message={error} />
            </Card>
        );
    }

    return (
        <>
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">💰 Reward Summary</h3>
                    <Button size="sm" variant="outline" onClick={() => setShowHistory(true)}>
                        <History size={16} className="mr-2" />
                        View History
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Pending Net */}
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={18} className="text-orange-600" />
                            <p className="text-xs font-medium text-orange-700">Pending (Net)</p>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">
                            {formatCurrency(summary?.net_pending || 0)}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">Awaiting approval</p>
                    </div>

                    {/* Approved Net */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={18} className="text-blue-600" />
                            <p className="text-xs font-medium text-blue-700">Approved (Net)</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(summary?.net_approved || 0)}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">Ready for payroll</p>
                    </div>

                    {/* Total Rewards */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={18} className="text-green-600" />
                            <p className="text-xs font-medium text-green-700">Total Rewards</p>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                            {summary?.count?.rewards || 0}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                            Paid: {formatCurrency(summary?.total_rewards?.paid || 0)}
                        </p>
                    </div>

                    {/* Total Deductions */}
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown size={18} className="text-red-600" />
                            <p className="text-xs font-medium text-red-700">Total Deductions</p>
                        </div>
                        <p className="text-2xl font-bold text-red-600">
                            {summary?.count?.deductions || 0}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                            Paid: {formatCurrency(summary?.total_deductions?.paid || 0)}
                        </p>
                    </div>
                </div>

                {/* Recent Rewards Table */}
                {recentRewards.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Rewards & Deductions</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Job #</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Time Diff</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {recentRewards.slice(0, 5).map((reward) => (
                                        <tr key={reward.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                #{reward.jobcard}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${reward.transaction_type === 'reward'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {reward.transaction_type === 'reward' ? (
                                                        <TrendingUp size={12} />
                                                    ) : (
                                                        <TrendingDown size={12} />
                                                    )}
                                                    {reward.transaction_type_display || reward.transaction_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-sm font-bold ${reward.transaction_type === 'reward' ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {formatCurrency(reward.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-gray-600">
                                                    {Math.abs(reward.time_difference_minutes)} min {reward.time_difference_minutes > 0 ? 'early' : 'late'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={getStatusColor(reward.status)}>
                                                    {reward.status_display || reward.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                {formatDate(reward.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {recentRewards.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <DollarSign size={48} className="mx-auto mb-2 text-gray-300" />
                        <p>No rewards or deductions yet</p>
                        <p className="text-sm mt-1">Complete jobs early to earn rewards!</p>
                    </div>
                )}
            </Card>

            {/* History Modal */}
            <Modal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                title="Reward History"
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Job #</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tier</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {recentRewards.map((reward) => (
                                <tr key={reward.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                        #{reward.jobcard}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={reward.transaction_type === 'reward' ? 'success' : 'danger'}>
                                            {reward.transaction_type_display || reward.transaction_type}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                        {formatCurrency(reward.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        {reward.tier ? reward.tier.replace('_', ' ').toUpperCase() : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={getStatusColor(reward.status)}>
                                            {reward.status_display || reward.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        {formatDate(reward.created_at)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button onClick={() => setShowHistory(false)}>Close</Button>
                </div>
            </Modal>
        </>
    );
};

export default SupervisorRewardSummary;
