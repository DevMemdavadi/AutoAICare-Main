import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import {
    ChartBarIcon,
    TrophyIcon,
    BanknotesIcon,
    ClockIcon,
    CheckBadgeIcon
} from '@heroicons/react/24/outline';
import PerformanceMetricsCard from '../../components/performance/PerformanceMetricsCard';
import PerformanceCharts from '../../components/performance/PerformanceCharts';
import Leaderboard from '../../components/performance/Leaderboard';
import IncentivePreview from '../../components/performance/IncentivePreview';
import api from '../../utils/api';

import { useBranch } from '../../contexts/BranchContext';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const PerformanceDashboard = () => {
    const { getCurrentBranchId, getCurrentBranchName } = useBranch();
    const [selectedTab, setSelectedTab] = useState(0);
    const [dashboardData, setDashboardData] = useState(null);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [incentiveData, setIncentiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [userRole, setUserRole] = useState('');
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(user.role || '');
        setUserId(user.id);
        fetchData(user.id);
    }, [selectedMonth, selectedYear, getCurrentBranchId()]);

    const fetchData = async (empId) => {
        setLoading(true);
        const branchId = getCurrentBranchId();
        try {
            // Fetch performance dashboard
            const dashboardRes = await api.get('/accounting/performance-metrics/dashboard/', {
                params: {
                    employee_id: empId,
                    month: selectedMonth,
                    year: selectedYear,
                    branch: branchId
                }
            });
            setDashboardData(dashboardRes.data || {});

            // Fetch leaderboard
            const leaderboardRes = await api.get('/accounting/performance-metrics/leaderboard/', {
                params: {
                    month: selectedMonth,
                    year: selectedYear,
                    limit: 10,
                    branch: branchId
                }
            });
            const leaderboardDataArr = leaderboardRes.data.results || leaderboardRes.data;
            setLeaderboardData(Array.isArray(leaderboardDataArr) ? leaderboardDataArr : []);

            // Fetch incentive preview
            const incentiveRes = await api.get('/accounting/performance-metrics/incentive_preview/', {
                params: {
                    employee_id: empId,
                    month: selectedMonth,
                    year: selectedYear,
                    branch: branchId
                }
            });
            setIncentiveData(incentiveRes.data || null);
        } catch (error) {
            console.error('Error fetching performance data:', error);
            // Set safe defaults on error
            setDashboardData({});
            setLeaderboardData([]);
            setIncentiveData(null);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        {
            name: 'My Performance',
            icon: ChartBarIcon,
            show: true
        },
        {
            name: 'Leaderboard',
            icon: TrophyIcon,
            show: true
        },
        {
            name: 'Incentives',
            icon: BanknotesIcon,
            show: true
        },
    ].filter(tab => tab.show);

    const currentMetrics = dashboardData?.current_month || {};

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-3 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                        Performance Dashboard
                    </h1>
                    <p className="text-sm md:text-base text-slate-600">
                        Track your performance, earnings, and rankings
                    </p>
                </div>

                {/* Period Selector */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4 mb-4 md:mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                        <label className="text-xs md:text-sm font-medium text-slate-700">Period:</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="w-full sm:w-auto px-3 md:px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(2024, i, 1).toLocaleString('default', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="w-full sm:w-auto px-3 md:px-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            {Array.from({ length: 5 }, (_, i) => (
                                <option key={i} value={new Date().getFullYear() - i}>
                                    {new Date().getFullYear() - i}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Quick Stats */}
                {!loading && currentMetrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs md:text-sm font-medium text-slate-600">Jobs Done</span>
                                <CheckBadgeIcon className="h-5 w-5 md:h-8 md:w-8 text-green-500" />
                            </div>
                            <div className="flex items-baseline gap-1 md:gap-2">
                                <span className="text-xl md:text-3xl font-bold text-slate-900">
                                    {currentMetrics.jobs_completed || 0}
                                </span>
                                <span className="text-xs md:text-sm text-slate-500">
                                    / {currentMetrics.jobs_assigned || 0}
                                </span>
                            </div>
                            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 md:h-2">
                                <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 md:h-2 rounded-full transition-all"
                                    style={{ width: `${currentMetrics.completion_rate || 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {currentMetrics.completion_rate?.toFixed(1) || 0}%
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs md:text-sm font-medium text-slate-600">QC Rate</span>
                                <ChartBarIcon className="h-5 w-5 md:h-8 md:w-8 text-blue-500" />
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl md:text-3xl font-bold text-slate-900">
                                    {currentMetrics.qc_pass_rate?.toFixed(1) || 0}%
                                </span>
                            </div>
                            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 md:h-2">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 md:h-2 rounded-full transition-all"
                                    style={{ width: `${currentMetrics.qc_pass_rate || 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {currentMetrics.qc_passed || 0}✓ {currentMetrics.qc_failed || 0}✗
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs md:text-sm font-medium text-slate-600">Efficiency</span>
                                <ClockIcon className="h-5 w-5 md:h-8 md:w-8 text-purple-500" />
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl md:text-3xl font-bold text-slate-900">
                                    {currentMetrics.efficiency_score?.toFixed(1) || 0}
                                </span>
                                <span className="text-xs md:text-sm text-slate-500">/ 100</span>
                            </div>
                            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 md:h-2">
                                <div
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 md:h-2 rounded-full transition-all"
                                    style={{ width: `${currentMetrics.efficiency_score || 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {currentMetrics.avg_completion_time || 0} min/job
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs md:text-sm font-medium text-slate-600">Net Incentive</span>
                                <BanknotesIcon className="h-5 w-5 md:h-8 md:w-8 text-amber-500" />
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg md:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                    ₹{currentMetrics.net_incentive?.toFixed(0) || 0}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs">
                                <span className="text-green-600">+₹{currentMetrics.total_rewards?.toFixed(0) || 0}</span>
                                <span className="text-red-600">-₹{currentMetrics.total_deductions?.toFixed(0) || 0}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {currentMetrics.is_top_performer ? '🏆 Top!' : 'Keep going!'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Rankings Badge */}
                {!loading && currentMetrics && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-xs md:text-sm mb-1">Branch Ranking</p>
                                    <p className="text-3xl md:text-4xl font-bold">#{currentMetrics.branch_rank || '-'}</p>
                                    <p className="text-purple-100 text-xs md:text-sm mt-1 md:mt-2">in your branch</p>
                                </div>
                                <TrophyIcon className="h-12 w-12 md:h-16 md:w-16 text-purple-200" />
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-amber-100 text-xs md:text-sm mb-1">Overall Ranking</p>
                                    <p className="text-3xl md:text-4xl font-bold">#{currentMetrics.overall_rank || '-'}</p>
                                    <p className="text-amber-100 text-xs md:text-sm mt-1 md:mt-2">across all branches</p>
                                </div>
                                <TrophyIcon className="h-12 w-12 md:h-16 md:w-16 text-amber-200" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                    <Tab.List className="flex space-x-2 rounded-xl bg-white p-1.5 md:p-2 shadow-sm border border-slate-200 mb-4 md:mb-6 overflow-x-auto">
                        {tabs.map((tab) => (
                            <Tab
                                key={tab.name}
                                className={({ selected }) =>
                                    classNames(
                                        'whitespace-nowrap rounded-lg py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-medium leading-5 transition-all',
                                        'ring-white ring-opacity-60 ring-offset-2 ring-offset-purple-400 focus:outline-none focus:ring-2',
                                        selected
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                                            : 'text-slate-700 hover:bg-slate-100 hover:text-purple-600'
                                    )
                                }
                            >
                                <div className="flex items-center justify-center gap-1 md:gap-2">
                                    <tab.icon className="h-4 w-4 md:h-5 md:w-5" />
                                    <span>{tab.name}</span>
                                </div>
                            </Tab>
                        ))}
                    </Tab.List>

                    <Tab.Panels className="mt-6">
                        {/* My Performance Tab */}
                        <Tab.Panel>
                            {loading ? (
                                <div className="flex items-center justify-center h-64">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <PerformanceMetricsCard metrics={currentMetrics} />
                                    <PerformanceCharts
                                        trendData={dashboardData?.trend || []}
                                        currentMetrics={currentMetrics}
                                    />
                                </div>
                            )}
                        </Tab.Panel>

                        {/* Leaderboard Tab */}
                        <Tab.Panel>
                            <Leaderboard
                                data={leaderboardData}
                                currentUserId={userId}
                                month={selectedMonth}
                                year={selectedYear}
                            />
                        </Tab.Panel>

                        {/* Incentives Tab */}
                        <Tab.Panel>
                            <IncentivePreview
                                data={incentiveData}
                                loading={loading}
                            />
                        </Tab.Panel>
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </div>
    );
};

export default PerformanceDashboard;
