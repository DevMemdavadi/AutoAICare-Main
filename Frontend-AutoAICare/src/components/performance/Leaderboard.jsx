import React, { useState, useEffect } from 'react';
import {
    Award, TrendingUp, DollarSign, Zap, CheckCircle,
    Users, UserCog, Clock, ChevronRight, Info,
} from 'lucide-react';
import api from '@/utils/api';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmt = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const fmtPct = (v) => `${parseFloat(v || 0).toFixed(1)}%`;

const MEDAL = [
    '#FFD700',  // gold
    '#C0C0C0',  // silver
    '#CD7F32',  // bronze
];

const PODIUM_STYLES = [
    // 1st — centre, tallest
    { order: 'md:order-2', mt: '', border: 'border-yellow-500', grad: 'from-yellow-50 to-amber-50', ring: 'bg-gradient-to-br from-yellow-400 to-yellow-600', size: 'w-16 h-16 md:w-24 md:h-24', textSize: 'text-lg md:text-xl', valBg: 'bg-yellow-500 text-gray-900', crown: true },
    // 2nd — left
    { order: 'md:order-1', mt: 'md:mt-8', border: 'border-gray-400', grad: 'from-gray-50 to-gray-100', ring: 'bg-gray-400', size: 'w-12 h-12 md:w-20 md:h-20', textSize: 'text-sm md:text-lg', valBg: 'bg-gray-200 text-gray-800', crown: false },
    // 3rd — right
    { order: 'md:order-3', mt: 'md:mt-8', border: 'border-orange-700', grad: 'from-orange-50 to-amber-50', ring: 'bg-orange-700', size: 'w-12 h-12 md:w-20 md:h-20', textSize: 'text-sm md:text-lg', valBg: 'bg-orange-700 text-white', crown: false },
];
const PODIUM_ORDER = [1, 0, 2]; // order to place: 2nd, 1st, 3rd visually

const METRICS = [
    { key: 'paid_job_value', label: 'Paid Revenue', icon: DollarSign, fmt: fmt },
    { key: 'total_jobs_completed', label: 'Jobs', icon: CheckCircle, fmt: (v) => v || 0 },
    { key: 'total_rewards_earned', label: 'Rewards', icon: Award, fmt: fmt },
    { key: 'efficiency_percentage', label: 'Efficiency', icon: Zap, fmt: fmtPct },
    { key: 'on_time_percentage', label: 'On-Time %', icon: Clock, fmt: fmtPct },
];

// efficiency colour
const effClass = (v) =>
    parseFloat(v) >= 80 ? 'bg-green-100 text-green-800'
        : parseFloat(v) >= 60 ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-700';

// ─────────────────────────────────────────────────────────────
// Podium component (shared by both views)
// ─────────────────────────────────────────────────────────────
const Podium = ({ data, nameKey, subKey, metricKey, metricFmt }) => {
    if (data.length < 3) return null;
    return (
        <div className="grid grid-cols-3 gap-2 md:gap-6 mb-6">
            {PODIUM_ORDER.map((pos) => {
                const item = data[pos];
                const s = PODIUM_STYLES[pos];
                const rank = pos + 1;
                return (
                    <div key={pos} className={`${s.order} ${s.mt}`}>
                        <div className={`relative bg-gradient-to-br ${s.grad} border-2 ${s.border} rounded-xl p-3 md:p-6 text-center h-full`}>
                            {s.crown && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[15px] border-b-yellow-500" />
                                </div>
                            )}
                            <div className={`${s.size} mx-auto mb-2 md:mb-3 rounded-full ${s.ring} flex items-center justify-center text-white font-bold shadow-md`}>
                                {rank === 1 ? <Award className="w-7 h-7 md:w-10 md:h-10 text-white" /> : <span className="text-xl md:text-3xl">{rank}</span>}
                            </div>
                            <h3 className={`font-bold text-gray-900 truncate ${s.textSize}`}>{item?.[nameKey]}</h3>
                            <p className="text-xs text-gray-500 truncate mb-2">{item?.[subKey]}</p>
                            <div className={`inline-flex items-center px-2 md:px-4 py-1 rounded-full ${s.valBg} font-bold text-xs md:text-sm`}>
                                {metricFmt(item?.[metricKey])}
                            </div>
                            <div className="mt-2 md:mt-4 flex justify-around">
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-500">Jobs</p>
                                    <p className="text-xs md:text-sm font-bold">{item?.total_jobs_completed || 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-500">Efficiency</p>
                                    <p className="text-xs md:text-sm font-bold">{fmtPct(item?.efficiency_percentage)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Supervisor Table
// ─────────────────────────────────────────────────────────────
const SupervisorTable = ({ data, metric }) => (
    <table className="min-w-full">
        <thead className="bg-gray-50">
            <tr>
                {['Rank', 'Supervisor', 'Floor Manager', 'Branch', 'Jobs', 'Paid Revenue', 'Total Revenue', 'Rewards', 'Efficiency', 'On-Time %'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider ${i >= 5 ? 'text-right' : 'text-left'}`}>
                        {h}
                    </th>
                ))}
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
            {data.map((team, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                return (
                    <tr key={team.id} className="hover:bg-gray-50 transition-colors" style={{ backgroundColor: isTop3 ? `${MEDAL[idx]}15` : '' }}>
                        {/* Rank */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            {isTop3
                                ? <Award className="w-5 h-5" style={{ color: MEDAL[idx] }} />
                                : <span className="text-sm text-gray-500">#{rank}</span>}
                        </td>
                        {/* Supervisor */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {(team.supervisor_name || 'S')[0].toUpperCase()}
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{team.supervisor_name}</span>
                            </div>
                        </td>
                        {/* Floor Manager */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            {team.floor_manager_name
                                ? <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                    <UserCog className="w-3.5 h-3.5 text-gray-400" />
                                    {team.floor_manager_name}
                                </div>
                                : <span className="text-gray-400 italic text-xs">Not assigned</span>}
                        </td>
                        {/* Branch */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{team.branch_name}</td>
                        {/* Jobs */}
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-gray-900">{team.total_jobs_completed || 0}</td>
                        {/* Paid Revenue */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-gray-900">{fmt(team.paid_job_value)}</span>
                            {parseFloat(team.paid_job_value) === 0 && (
                                <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Unpaid</span>
                            )}
                        </td>
                        {/* Total Revenue */}
                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs text-gray-500">{fmt(team.total_job_value)}</td>
                        {/* Rewards */}
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{fmt(team.total_rewards_earned)}</td>
                        {/* Efficiency */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${effClass(team.efficiency_percentage)}`}>
                                {fmtPct(team.efficiency_percentage)}
                            </span>
                        </td>
                        {/* On-Time */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-sm font-semibold text-gray-900">{fmtPct(team.on_time_percentage)}</span>
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${parseFloat(team.on_time_percentage) >= 80 ? 'bg-green-500' : parseFloat(team.on_time_percentage) >= 60 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${Math.min(parseFloat(team.on_time_percentage || 0), 100)}%` }} />
                                </div>
                            </div>
                        </td>
                    </tr>
                );
            })}
        </tbody>
    </table>
);

// ─────────────────────────────────────────────────────────────
// Floor Manager Table
// ─────────────────────────────────────────────────────────────
const FloorManagerTable = ({ data, metric }) => (
    <table className="min-w-full">
        <thead className="bg-gray-50">
            <tr>
                {['Rank', 'Floor Manager', 'Branch', 'Supervisor Teams', 'Jobs', 'Paid Revenue', 'Total Revenue', 'Rewards', 'Efficiency', 'On-Time %'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider ${i >= 5 ? 'text-right' : 'text-left'}`}>
                        {h}
                    </th>
                ))}
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
            {data.map((fm, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                return (
                    <tr key={fm.id} className="hover:bg-gray-50 transition-colors" style={{ backgroundColor: isTop3 ? `${MEDAL[idx]}15` : '' }}>
                        <td className="px-4 py-3 whitespace-nowrap">
                            {isTop3
                                ? <Award className="w-5 h-5" style={{ color: MEDAL[idx] }} />
                                : <span className="text-sm text-gray-500">#{rank}</span>}
                        </td>
                        {/* FM name */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-500 to-gray-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {(fm.floor_manager_name || 'F')[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{fm.floor_manager_name}</p>
                                    {fm.floor_manager_email && <p className="text-[10px] text-gray-400">{fm.floor_manager_email}</p>}
                                </div>
                            </div>
                        </td>
                        {/* Branch */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{fm.branch_name}</td>
                        {/* Supervisor Teams count */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                {fm.supervised_teams_count || 0} team{fm.supervised_teams_count !== 1 ? 's' : ''}
                            </div>
                        </td>
                        {/* Jobs */}
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-gray-900">{fm.total_jobs_completed || 0}</td>
                        {/* Paid Revenue */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-gray-900">{fmt(fm.paid_job_value)}</span>
                            {parseFloat(fm.paid_job_value) === 0 && (
                                <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Unpaid</span>
                            )}
                        </td>
                        {/* Total Revenue */}
                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs text-gray-500">{fmt(fm.total_job_value)}</td>
                        {/* Rewards */}
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">{fmt(fm.total_rewards_earned)}</td>
                        {/* Efficiency */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${effClass(fm.efficiency_percentage)}`}>
                                {fmtPct(fm.efficiency_percentage)}
                            </span>
                        </td>
                        {/* On-Time */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-sm font-semibold text-gray-900">{fmtPct(fm.on_time_percentage)}</span>
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${parseFloat(fm.on_time_percentage) >= 80 ? 'bg-green-500' : parseFloat(fm.on_time_percentage) >= 60 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${Math.min(parseFloat(fm.on_time_percentage || 0), 100)}%` }} />
                                </div>
                            </div>
                        </td>
                    </tr>
                );
            })}
        </tbody>
    </table>
);

// ─────────────────────────────────────────────────────────────
// Main Leaderboard Component
// ─────────────────────────────────────────────────────────────
const Leaderboard = ({ data: supervisorData = [], period, loading, branchId, startDate, endDate }) => {
    const [view, setView] = useState('supervisors'); // 'supervisors' | 'floor-managers'
    const [metric, setMetric] = useState('paid_job_value');

    // FM data — fetched independently so it's always accurate
    const [fmData, setFmData] = useState([]);
    const [fmLoading, setFmLoading] = useState(false);

    useEffect(() => {
        fetchFmLeaderboard();
    }, [period, branchId, startDate, endDate]);

    const fetchFmLeaderboard = async () => {
        setFmLoading(true);
        try {
            const params = { period, metric: 'paid_job_value', limit: 20 };
            if (branchId) params.branch_id = branchId;
            if (period === 'custom') {
                params.start_date = startDate;
                params.end_date = endDate;
            }
            const res = await api.get('/jobcards/performance/floor-manager-leaderboard/', { params });
            setFmData(res.data || []);
        } catch (err) {
            console.warn('FM leaderboard fetch failed:', err?.response?.data || err.message);
        } finally {
            setFmLoading(false);
        }
    };

    const metricDef = METRICS.find((m) => m.key === metric) || METRICS[0];

    // Sort active dataset by selected metric
    const activeData = view === 'supervisors' ? supervisorData : fmData;
    const sorted = [...activeData].sort((a, b) => parseFloat(b[metric] || 0) - parseFloat(a[metric] || 0));

    const nameKey = view === 'supervisors' ? 'supervisor_name' : 'floor_manager_name';
    const subKey = 'branch_name';

    const isLoading = loading || (view === 'floor-managers' && fmLoading);

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3" />
                <div className="grid grid-cols-3 gap-4"><div className="h-40 bg-gray-200 rounded" /><div className="h-52 bg-gray-200 rounded" /><div className="h-40 bg-gray-200 rounded" /></div>
                <div className="h-64 bg-gray-200 rounded" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* ── Header card ────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Title + view switcher */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                            <Award className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Leaderboard</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Rankings for <span className="font-medium capitalize">{period}</span> period
                                · {sorted.length} {view === 'supervisors' ? 'supervisor team' : 'floor manager'}{sorted.length !== 1 ? 's' : ''}
                            </p>
                        </div>

                        {/* View toggle tabs */}
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg ml-0 sm:ml-4">
                            <button
                                onClick={() => setView('supervisors')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'supervisors' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                <Users className="w-4 h-4" />
                                Supervisor Teams
                            </button>
                            <button
                                onClick={() => setView('floor-managers')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'floor-managers' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                <UserCog className="w-4 h-4" />
                                Floor Managers
                            </button>
                        </div>
                    </div>

                    {/* Metric selector */}
                    <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
                        {METRICS.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setMetric(key)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${metric === key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Data accuracy note */}
                <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
                        <strong>Paid Revenue</strong> = confirmed revenue from fully-paid invoices. &nbsp;
                        <strong>Total Revenue</strong> = estimated value including pending payments. &nbsp;
                        <strong>Efficiency</strong> = on-time completion rate. &nbsp;
                        {view === 'floor-managers' && <><strong>Supervisor Teams</strong> = number of supervisor teams under each floor manager.</>}
                    </p>
                </div>
            </div>

            {/* ── Podium ─────────────────────────────────────── */}
            {sorted.length >= 3 && (
                <Podium
                    data={sorted}
                    nameKey={nameKey}
                    subKey={subKey}
                    metricKey={metric}
                    metricFmt={metricDef.fmt}
                />
            )}

            {/* ── Full Table ─────────────────────────────────── */}
            {sorted.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {view === 'supervisors'
                                ? <Users className="w-4 h-4 text-blue-500" />
                                : <UserCog className="w-4 h-4 text-slate-500" />}
                            <span className="text-sm font-semibold text-gray-700">
                                {view === 'supervisors' ? 'Supervisor Team Rankings' : 'Floor Manager Rankings'}
                            </span>
                        </div>
                        <span className="text-xs text-gray-400">
                            Sorted by: <strong>{metricDef.label}</strong>
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        {view === 'supervisors'
                            ? <SupervisorTable data={sorted} metric={metric} />
                            : <FloorManagerTable data={sorted} metric={metric} />}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                    <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-base font-semibold text-gray-700 mb-1">No data for this period</h3>
                    <p className="text-sm text-gray-400">
                        {view === 'supervisors'
                            ? 'Complete some jobs to see supervisor team rankings.'
                            : 'Floor manager performance data will appear once jobs are completed.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
