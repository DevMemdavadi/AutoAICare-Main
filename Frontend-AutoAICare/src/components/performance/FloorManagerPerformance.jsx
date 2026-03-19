import React, { useState, useEffect } from 'react';
import {
    UserCog,
    TrendingUp,
    Award,
    Clock,
    CheckCircle,
    DollarSign,
    Users,
    ChevronDown,
    ChevronUp,
    AlertCircle,
} from 'lucide-react';
import api from '@/utils/api';

const FloorManagerPerformance = ({ period, branchId, singleFm = false, fmId = null, startDate, endDate }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortKey, setSortKey] = useState('paid_job_value');
    const [sortAsc, setSortAsc] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);

    useEffect(() => {
        fetchData();
    }, [period, branchId, singleFm, fmId, startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { period };
            if (period === 'custom') {
                params.start_date = startDate;
                params.end_date = endDate;
            }

            if (singleFm) {
                // Floor manager viewing their own data
                if (fmId) params.floor_manager_id = fmId;
                const res = await api.get('/jobcards/performance/floor-manager-summary/', { params });
                setData(Array.isArray(res.data) ? res.data : [res.data]);
            } else {
                // Admin / branch-admin viewing leaderboard of all FMs
                params.metric = 'total_job_value';
                params.limit = 20;
                if (branchId) params.branch_id = branchId;
                const res = await api.get('/jobcards/performance/floor-manager-leaderboard/', { params });
                setData(res.data);
            }
        } catch (err) {
            console.error('FloorManagerPerformance fetch error:', err);
            setError(err.response?.data?.error || 'Failed to load floor manager performance data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

    const formatMinutes = (minutes) => {
        if (!minutes && minutes !== 0) return '—';
        const h = Math.floor(Math.abs(minutes) / 60);
        const m = Math.abs(minutes) % 60;
        const sign = minutes < 0 ? '-' : '';
        return h > 0 ? `${sign}${h}h ${m}m` : `${sign}${m}m`;
    };

    const sortedData = [...data].sort((a, b) => {
        const aVal = parseFloat(a[sortKey] || 0);
        const bVal = parseFloat(b[sortKey] || 0);
        return sortAsc ? aVal - bVal : bVal - aVal;
    });

    const handleSort = (key) => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(false); }
    };

    const SortIcon = ({ col }) => (
        sortKey === col
            ? (sortAsc ? <ChevronUp className="w-3.5 h-3.5 inline ml-1" /> : <ChevronDown className="w-3.5 h-3.5 inline ml-1" />)
            : <ChevronDown className="w-3.5 h-3.5 inline ml-1 opacity-30" />
    );

    // Aggregate totals across all floor managers for the summary cards
    const totals = data.reduce((acc, fm) => ({
        jobs: acc.jobs + (fm.total_jobs_completed || 0),
        paidValue: acc.paidValue + parseFloat(fm.paid_job_value || 0),
        totalValue: acc.totalValue + parseFloat(fm.total_job_value || 0),
        rewards: acc.rewards + parseFloat(fm.total_rewards_earned || 0),
        onTime: acc.onTime + (fm.jobs_on_time || 0),
    }), { jobs: 0, paidValue: 0, totalValue: 0, rewards: 0, onTime: 0 });

    const overallOnTime = totals.jobs > 0 ? ((totals.onTime / totals.jobs) * 100).toFixed(1) : 0;

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-28" />
                    ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 h-64" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Total Jobs',
                        value: totals.jobs,
                        icon: <CheckCircle className="w-5 h-5" />,
                        color: 'from-blue-500 to-indigo-600',
                        bg: 'bg-blue-50',
                        text: 'text-blue-700',
                    },
                    {
                        label: 'Paid Revenue',
                        value: formatCurrency(totals.paidValue),
                        icon: <DollarSign className="w-5 h-5" />,
                        color: 'from-emerald-500 to-green-600',
                        bg: 'bg-emerald-50',
                        text: 'text-emerald-700',
                    },
                    {
                        label: 'Total Rewards',
                        value: formatCurrency(totals.rewards),
                        icon: <Award className="w-5 h-5" />,
                        color: 'from-amber-500 to-orange-500',
                        bg: 'bg-amber-50',
                        text: 'text-amber-700',
                    },
                    {
                        label: 'On-Time Rate',
                        value: `${overallOnTime}%`,
                        icon: <Clock className="w-5 h-5" />,
                        color: 'from-violet-500 to-purple-600',
                        bg: 'bg-violet-50',
                        text: 'text-violet-700',
                    },
                ].map((card) => (
                    <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} text-white`}>
                                {card.icon}
                            </div>
                            <span className="text-sm font-medium text-gray-500">{card.label}</span>
                        </div>
                        <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Floor Manager Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-slate-600 to-gray-700 rounded-lg">
                        <UserCog className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">
                            {singleFm ? 'My Performance History' : 'Floor Manager Rankings'}
                        </h3>
                        <p className="text-xs text-gray-500">
                            {singleFm
                                ? `${data[0]?.floor_manager_name || 'Floor Manager'} · ${period}`
                                : `${data.length} floor manager${data.length !== 1 ? 's' : ''} · ${period}`
                            }
                        </p>
                    </div>
                </div>

                {sortedData.length === 0 ? (
                    <div className="p-16 text-center">
                        <UserCog className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h4 className="text-gray-600 font-medium mb-1">No floor manager data yet</h4>
                        <p className="text-sm text-gray-400">Performance records will appear once jobs are completed.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Floor Manager</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('total_jobs_completed')}>
                                        Jobs <SortIcon col="total_jobs_completed" />
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('paid_job_value')}>
                                        Revenue (Paid) <SortIcon col="paid_job_value" />
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('total_rewards_earned')}>
                                        Rewards <SortIcon col="total_rewards_earned" />
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort('efficiency_percentage')}>
                                        Efficiency <SortIcon col="efficiency_percentage" />
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Teams
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        On-Time %
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sortedData.map((fm, idx) => {
                                    const isExpanded = expandedRow === fm.id;
                                    const onTimePct = parseFloat(fm.on_time_percentage || 0);
                                    const effPct = parseFloat(fm.efficiency_percentage || 0);
                                    const rankNum = idx + 1;
                                    const rankColors = ['text-yellow-600', 'text-gray-500', 'text-orange-700'];

                                    return (
                                        <React.Fragment key={fm.id}>
                                            <tr
                                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                onClick={() => setExpandedRow(isExpanded ? null : fm.id)}
                                            >
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`font-bold text-sm ${rankColors[rankNum - 1] || 'text-gray-700'}`}>
                                                        {rankNum <= 3 ? ['🥇', '🥈', '🥉'][rankNum - 1] : `#${rankNum}`}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                            {(fm.floor_manager_name || 'FM')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">{fm.floor_manager_name}</p>
                                                            <p className="text-xs text-gray-500">{fm.floor_manager_email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{fm.branch_name}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                                                    {fm.total_jobs_completed || 0}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="text-sm font-bold text-gray-900">{formatCurrency(fm.paid_job_value)}</span>
                                                        {parseFloat(fm.paid_job_value) < parseFloat(fm.total_job_value) && (
                                                            <span className="text-[10px] text-gray-400">of {formatCurrency(fm.total_job_value)}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                                    {formatCurrency(fm.total_rewards_earned)}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${effPct >= 80 ? 'bg-green-100 text-green-800' : effPct >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'}`}>
                                                        {effPct.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                                                        <Users className="w-3.5 h-3.5 text-gray-400" />
                                                        {fm.supervised_teams_count || 0}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-sm font-semibold text-gray-900">{onTimePct.toFixed(1)}%</span>
                                                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${onTimePct >= 80 ? 'bg-green-500' : onTimePct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                style={{ width: `${Math.min(onTimePct, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" /> : <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />}
                                                </td>
                                            </tr>

                                            {/* Expanded detail row */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50">
                                                    <td colSpan={10} className="px-6 py-4">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                                <p className="text-xs text-gray-500 mb-1">Time Saved (Net)</p>
                                                                <p className="text-base font-bold text-gray-900">{formatMinutes(fm.net_time_performance)}</p>
                                                            </div>
                                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                                <p className="text-xs text-gray-500 mb-1">Avg Completion</p>
                                                                <p className="text-base font-bold text-gray-900">{formatMinutes(parseFloat(fm.average_completion_time || 0))}</p>
                                                            </div>
                                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                                <p className="text-xs text-gray-500 mb-1">Jobs Delayed</p>
                                                                <p className="text-base font-bold text-gray-900">{fm.jobs_delayed || 0}</p>
                                                            </div>
                                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                                <p className="text-xs text-gray-500 mb-1">Avg Reward / Job</p>
                                                                <p className="text-base font-bold text-gray-900">{formatCurrency(fm.average_reward_per_job)}</p>
                                                            </div>
                                                        </div>

                                                        {/* Supervised Teams */}
                                                        {fm.supervised_teams && fm.supervised_teams.length > 0 && (
                                                            <div className="mt-4">
                                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Supervisors Under This FM</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {fm.supervised_teams.map((sup) => (
                                                                        <span key={sup.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700">
                                                                            <TrendingUp className="w-3 h-3 text-blue-500" />
                                                                            {sup.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FloorManagerPerformance;
