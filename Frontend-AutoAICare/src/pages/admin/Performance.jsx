import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import {
    TrendingUp, Award, DollarSign, Clock, Users, RefreshCw,
    Calculator, BarChart3, Building2, UserCog, Layers,
    ClipboardList, Trophy, ChevronRight, Calendar,
} from 'lucide-react';
import api from '@/utils/api';
import PerformanceStats from '@/components/performance/PerformanceStats';
import Leaderboard from '@/components/performance/Leaderboard';
import TeamPerformance from '@/components/performance/TeamPerformance';
import RewardCalculator from '@/components/performance/RewardCalculator';
import IndividualPerformance from '@/components/performance/IndividualPerformance';
import PerformanceCharts from '@/components/performance/PerformanceCharts';
import JobPerformanceTable from '@/components/performance/JobPerformanceTable';
import RewardTiersSummary from '@/components/performance/RewardTiersSummary';
import BranchComparison from '@/components/performance/BranchComparison';
import FloorManagerPerformance from '@/components/performance/FloorManagerPerformance';

// ─────────────────────────────────────────────────────────────────
// Hierarchy Definition
//
//  company_admin / super_admin
//    └─ branch_admin
//         └─ floor_manager
//              └─ supervisor
//                   └─ applicator
//
// Each role sees itself + everything BELOW it in the hierarchy.
// ─────────────────────────────────────────────────────────────────

// Tab definitions per role — ordered top-down for each role
const TAB_CONFIG = {
    // ── Company Admin / Super Admin ─────────────────────────────
    company_admin: [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'branches', label: 'Branches', icon: Building2 },
        { id: 'floor-managers', label: 'Floor Managers', icon: UserCog },
        { id: 'teams', label: 'Supervisor Teams', icon: Users },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'job-details', label: 'Job Details', icon: ClipboardList },
        { id: 'monthly-rewards', label: 'Rewards', icon: Award },
    ],
    super_admin: [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'branches', label: 'Branches', icon: Building2 },
        { id: 'floor-managers', label: 'Floor Managers', icon: UserCog },
        { id: 'teams', label: 'Supervisor Teams', icon: Users },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'job-details', label: 'Job Details', icon: ClipboardList },
        { id: 'monthly-rewards', label: 'Rewards', icon: Award },
    ],
    // ── Branch Admin ────────────────────────────────────────────
    branch_admin: [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'floor-managers', label: 'Floor Managers', icon: UserCog },
        { id: 'teams', label: 'Supervisor Teams', icon: Users },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'job-details', label: 'Job Details', icon: ClipboardList },
        { id: 'monthly-rewards', label: 'Rewards', icon: Award },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    ],
    // ── Floor Manager ───────────────────────────────────────────
    floor_manager: [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'my-performance', label: 'My Performance', icon: Award },
        { id: 'teams', label: 'My Teams', icon: Users },
        { id: 'job-details', label: 'Job Details', icon: ClipboardList },
    ],
    // ── Supervisor ──────────────────────────────────────────────
    supervisor: [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'my-performance', label: 'My Team', icon: Users },
        { id: 'job-details', label: 'Job Details', icon: ClipboardList },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    ],
    // ── Applicator ──────────────────────────────────────────────
    applicator: [
        { id: 'overview', label: 'My Performance', icon: Award },
        { id: 'job-details', label: 'My Jobs', icon: ClipboardList },
    ],
};

// Role-aware breadcrumb label
const ROLE_LABELS = {
    // super_admin: 'Super Admin',
    company_admin: 'Company Admin',
    branch_admin: 'Branch Admin',
    floor_manager: 'Floor Manager',
    supervisor: 'Supervisor',
    applicator: 'Applicator',
};

const HIERARCHY_BADGES = {
    // super_admin: { label: 'Full Access', color: 'bg-purple-100 text-purple-800' },
    company_admin: { label: 'Company View', color: 'bg-blue-100 text-blue-800' },
    branch_admin: { label: 'Branch View', color: 'bg-indigo-100 text-indigo-800' },
    floor_manager: { label: 'Floor Manager View', color: 'bg-teal-100 text-teal-800' },
    supervisor: { label: 'Team View', color: 'bg-green-100 text-green-800' },
    applicator: { label: 'Individual View', color: 'bg-gray-100 text-gray-700' },
};

// ─────────────────────────────────────────────────────────────────

const Performance = () => {
    const { user } = useAuth();
    const { getCurrentBranchId } = useBranch();

    const role = user?.role || 'applicator';
    const tabs = TAB_CONFIG[role] || TAB_CONFIG.applicator;

    const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'overview');
    const [period, setPeriod] = useState('monthly');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // ── Data state ─────────────────────────────────────────────
    const [teamSummary, setTeamSummary] = useState(null);
    const [branchSummary, setBranchSummary] = useState(null);
    const [previousBranchSummary, setPreviousBranchSummary] = useState(null);
    const [dateRange, setDateRange] = useState(null);
    const [individualStats, setIndividualStats] = useState(null);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [fmLeaderboard, setFmLeaderboard] = useState([]);

    // Calculator modal
    const [calculatorOpen, setCalculatorOpen] = useState(false);

    // Reset to first tab when role changes (safety)
    useEffect(() => {
        setActiveTab(tabs[0]?.id || 'overview');
    }, [role]);

    useEffect(() => {
        if (!user) return;
        loadPerformanceData();
    }, [period, startDate, endDate, refreshKey, user, getCurrentBranchId()]);

    const branchId = getCurrentBranchId();

    // ── Data loading — role-aware ──────────────────────────────
    const loadPerformanceData = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const bId = getCurrentBranchId();
            const params = { period, branch_id: bId };

            if (period === 'custom') {
                if (!startDate || !endDate) {
                    setLoading(false);
                    return;
                }
                params.start_date = startDate;
                params.end_date = endDate;
            }

            // 1. Branch-level summary → for FM and above
            if (['floor_manager', 'branch_admin', 'company_admin', 'super_admin'].includes(role)) {
                try {
                    const res = await api.get('/jobcards/performance/branch-comparison/', {
                        params: params
                    });
                    setBranchSummary(res.data.current);
                    setPreviousBranchSummary(res.data.previous);
                    setDateRange(res.data.current_period);
                } catch {
                    try {
                        const res = await api.get('/jobcards/performance/branch-summary/', {
                            params: params
                        });
                        setBranchSummary(res.data);
                        setPreviousBranchSummary(null);
                    } catch { /* silent */ }
                }
            }

            // 2. Team summary → only for supervisor role (requires supervisor_id)
            if (role === 'supervisor') {
                try {
                    const res = await api.get('/jobcards/performance/team-summary/', {
                        params: { ...params, supervisor_id: user.id }
                    });
                    setTeamSummary(res.data);
                } catch { /* silent */ }
            }

            // 3. Individual stats → FM, supervisor, applicator
            if (['floor_manager', 'supervisor', 'applicator'].includes(role)) {
                try {
                    const res = await api.get('/jobcards/performance/individual/', {
                        params: params
                    });
                    setIndividualStats(res.data);
                } catch { /* silent */ }
            }

            // 4. Supervisor leaderboard → FM and above
            if (['floor_manager', 'branch_admin', 'company_admin', 'super_admin', 'supervisor'].includes(role)) {
                try {
                    const res = await api.get('/jobcards/performance/leaderboard/', {
                        params: { ...params, metric: 'paid_job_value', limit: 10 }
                    });
                    setLeaderboardData(res.data);
                } catch { /* silent */ }
            }

            // 5. FM leaderboard → branch_admin and above + FM seeing peers in branch
            if (['floor_manager', 'branch_admin', 'company_admin', 'super_admin'].includes(role)) {
                try {
                    const res = await api.get('/jobcards/performance/floor-manager-leaderboard/', {
                        params: { ...params, limit: 20 }
                    });
                    setFmLeaderboard(res.data);
                } catch { /* silent */ }
            }

        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load performance data');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => setRefreshKey(p => p + 1);
    const badge = HIERARCHY_BADGES[role] || HIERARCHY_BADGES.applicator;

    // ── Tab renderer ──────────────────────────────────────────
    const renderTab = () => {
        switch (activeTab) {
            // ── Overview — adapts for every role ────────────────
            case 'overview':
                return (
                    <PerformanceStats
                        teamSummary={teamSummary}
                        branchSummary={branchSummary}
                        previousBranchSummary={previousBranchSummary}
                        individualStats={individualStats}
                        period={period}
                        dateRange={dateRange}
                        loading={loading}
                        userRole={role}
                    />
                );

            // ── My Performance — FM or supervisor personal stats ─
            case 'my-performance':
                if (role === 'floor_manager') {
                    return (
                        <FloorManagerPerformance
                            period={period}
                            branchId={branchId}
                            singleFm={true}
                            fmId={user.id}
                            startDate={startDate}
                            endDate={endDate}
                        />
                    );
                }
                return (
                    <IndividualPerformance
                        stats={individualStats}
                        period={period}
                        loading={loading}
                        userRole={role}
                    />
                );

            // ── Branches — company_admin and above ───────────────
            case 'branches':
                return (
                    <BranchComparison
                        branchSummary={branchSummary?.length ? branchSummary : previousBranchSummary}
                        previousBranchSummary={previousBranchSummary}
                        loading={loading}
                    />
                );

            // ── Analytics — branch_admin ─────────────────────────
            case 'analytics':
                return (
                    <PerformanceCharts
                        branchData={branchSummary?.length ? branchSummary : previousBranchSummary}
                        period={period}
                        loading={loading}
                    />
                );

            // ── Floor Managers — branch_admin and above ──────────
            case 'floor-managers':
                return (
                    <FloorManagerPerformance
                        period={period}
                        branchId={branchId}
                        startDate={startDate}
                        endDate={endDate}
                    />
                );

            // ── Supervisor Teams ─────────────────────────────────
            //    FM: their own supervisors | branch_admin+: all teams
            case 'teams':
                return (
                    <TeamPerformance
                        summary={
                            (teamSummary?.length ? teamSummary : null) ||
                            (branchSummary?.length ? branchSummary : null) ||
                            previousBranchSummary || []
                        }
                        period={period}
                        loading={loading}
                        userRole={role}
                    />
                );

            // ── Leaderboard ──────────────────────────────────────
            case 'leaderboard':
                return (
                    <Leaderboard
                        data={leaderboardData}
                        period={period}
                        loading={loading}
                        branchId={branchId}
                        startDate={startDate}
                        endDate={endDate}
                    />
                );

            // ── Job Details ──────────────────────────────────────
            case 'job-details':
                return <JobPerformanceTable
                    period={period}
                    userRole={role}
                    branchId={branchId}
                    startDate={startDate}
                    endDate={endDate}
                />;

            // ── Monthly Rewards ──────────────────────────────────
            case 'monthly-rewards':
                return (
                    <RewardTiersSummary
                        branchId={branchId || user?.branch?.id}
                    />
                );

            default:
                return null;
        }
    };

    // Helper: build hierarchy breadcrumb based on role
    const HierarchyIndicator = () => {
        const chain = Object.keys(ROLE_LABELS);
        const roleIdx = chain.indexOf(role);
        const visible = chain.slice(Math.max(0, roleIdx - 1), roleIdx + 2); // show ±1 neighbour

        return (
            <div className="hidden lg:flex items-center gap-1 text-xs font-medium text-gray-400">
                {visible.map((r, i) => (
                    <React.Fragment key={r}>
                        {i > 0 && <ChevronRight className="w-3 h-3" />}
                        <span className={r === role ? 'text-blue-600 font-semibold' : ''}>
                            {ROLE_LABELS[r]}
                        </span>
                    </React.Fragment>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── Header ─────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>
                                        {badge.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-sm text-gray-500">
                                        {ROLE_LABELS[role]} · Performance & Efficiency Metrics
                                    </p>
                                    <HierarchyIndicator />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all shadow-sm">
                            <div className="flex items-center px-3 border-r border-gray-100 bg-gray-50/50">
                                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="hidden md:inline text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Period</span>
                                <select
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                    className="py-2 border-none text-sm font-bold text-gray-700 bg-transparent focus:ring-0 outline-none cursor-pointer"
                                >
                                    <option value="daily">Today</option>
                                    <option value="weekly">This Week</option>
                                    <option value="monthly">This Month</option>
                                    <option value="quarterly">This Quarter</option>
                                    <option value="yearly">This Year</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>

                            {period === 'custom' && (
                                <div className="flex items-center gap-1.5 px-3 py-1 animate-in fade-in slide-in-from-left-2 duration-200">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="py-1 border-none text-sm font-medium text-gray-700 bg-transparent focus:ring-0 outline-none w-32"
                                    />
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">to</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="py-1 border-none text-sm font-medium text-gray-700 bg-transparent focus:ring-0 outline-none w-32"
                                    />
                                </div>
                            )}
                        </div>

                        {role !== 'applicator' && (
                            <button
                                onClick={() => setCalculatorOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            >
                                <Calculator className="w-4 h-4" />
                                <span className="hidden sm:inline">Reward Calc</span>
                            </button>
                        )}

                        <button
                            onClick={handleRefresh}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Refresh Data"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Error banner ──────────────────────────────── */}
            {error && (
                <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-800 flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            )}

            {/* ── Progress bar ──────────────────────────────── */}
            {loading && (
                <div className="mx-6 mb-4">
                    <div className="h-0.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '70%' }} />
                    </div>
                </div>
            )}

            {/* ── Tab Bar ───────────────────────────────────── */}
            <div className="mx-6 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${isActive
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Tab Content ───────────────────────────────── */}
            <div className="px-6 pb-8">
                {renderTab()}
            </div>

            {/* ── Reward Calculator Modal ───────────────────── */}
            {calculatorOpen && (
                <RewardCalculator
                    isOpen={calculatorOpen}
                    onClose={() => setCalculatorOpen(false)}
                />
            )}
        </div>
    );
};

export default Performance;
