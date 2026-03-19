import React from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { TrendingUp, Award, Target, DollarSign } from 'lucide-react';

const PerformanceCharts = ({ branchData, period, loading }) => {
    console.log('📈 [PerformanceCharts] props:', { branchData, branchDataLength: branchData?.length, period, loading });

    if (loading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!branchData || branchData.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Branch Data</h3>
                <p className="text-gray-500">Branch analytics will appear here once data is available</p>
            </div>
        );
    }

    // Prepare chart data
    const chartData = branchData.map(branch => ({
        name: branch.branch_name?.split('-').pop().trim() || branch.branch_name,
        jobs: branch.total_jobs_completed || 0,
        value: parseFloat(branch.paid_job_value || 0),
        rewards: parseFloat(branch.total_rewards_earned || 0),
        efficiency: parseFloat(branch.efficiency_percentage || 0),
        onTime: parseFloat(branch.on_time_percentage || 0),
    }));

    // Colors for charts
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Format currency for display
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="space-y-6">
            {/* Jobs Completion by Branch */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Jobs Completed by Branch</h3>
                        <p className="text-sm text-gray-500">This {period}</p>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <defs>
                            <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.4} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                            dataKey="name"
                            stroke="#6B7280"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#6B7280"
                            style={{ fontSize: '12px' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar
                            dataKey="jobs"
                            fill="url(#colorJobs)"
                            radius={[8, 8, 0, 0]}
                            name="Jobs Completed"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Job Value by Branch */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Revenue by Branch</h3>
                        <p className="text-sm text-gray-500">Total job value this {period}</p>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                            dataKey="name"
                            stroke="#6B7280"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#6B7280"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                                            <p className="font-semibold text-gray-900 mb-2">{label}</p>
                                            <p className="text-sm text-green-600">
                                                Revenue: {formatCurrency(payload[0].value)}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#10B981"
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            name="Job Value"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Efficiency & On-Time Performance */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Target className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Efficiency & On-Time Rate</h3>
                        <p className="text-sm text-gray-500">Performance metrics by branch</p>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                            dataKey="name"
                            stroke="#6B7280"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#6B7280"
                            style={{ fontSize: '12px' }}
                            domain={[0, 100]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="efficiency"
                            stroke="#8B5CF6"
                            strokeWidth={3}
                            dot={{ fill: '#8B5CF6', r: 5 }}
                            activeDot={{ r: 7 }}
                            name="Efficiency (%)"
                        />
                        <Line
                            type="monotone"
                            dataKey="onTime"
                            stroke="#10B981"
                            strokeWidth={3}
                            dot={{ fill: '#10B981', r: 5 }}
                            activeDot={{ r: 7 }}
                            name="On-Time Rate (%)"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Rewards Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <Award className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Rewards Distribution</h3>
                        <p className="text-sm text-gray-500">Total rewards earned by branch</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="rewards"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                                                <p className="font-semibold text-gray-900 mb-2">{payload[0].name}</p>
                                                <p className="text-sm text-orange-600">
                                                    Rewards: {formatCurrency(payload[0].value)}
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Rewards Table */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Breakdown by Branch</h4>
                        {chartData.map((branch, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    ></div>
                                    <span className="text-sm font-medium text-gray-900">{branch.name}</span>
                                </div>
                                <span className="text-sm font-semibold text-orange-600">
                                    {formatCurrency(branch.rewards)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Performance Summary Cards */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Performance Highlights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Top Performing Branch</p>
                        <p className="text-xl font-bold text-blue-600">
                            {chartData.reduce((max, item) => item.jobs > max.jobs ? item : max, chartData[0] || {}).name || '-'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {chartData.reduce((max, item) => item.jobs > max.jobs ? item : max, chartData[0] || {}).jobs || 0} jobs completed
                        </p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Highest Efficiency</p>
                        <p className="text-xl font-bold text-purple-600">
                            {Math.max(...chartData.map(d => d.efficiency || 0)).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {chartData.find(d => d.efficiency === Math.max(...chartData.map(d => d.efficiency || 0)))?.name || '-'}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Total Rewards</p>
                        <p className="text-xl font-bold text-orange-600">
                            {formatCurrency(chartData.reduce((sum, item) => sum + (item.rewards || 0), 0))}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Across all branches</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceCharts;
