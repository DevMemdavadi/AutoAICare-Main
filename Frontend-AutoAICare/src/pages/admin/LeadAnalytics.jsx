import React, { useState, useEffect } from 'react';
import {
    TrendingUp, Users, Target, Award, DollarSign, Calendar,
    BarChart3, PieChart, Activity, Filter, Download, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import {
    BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const LeadAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [sourcePerformance, setSourcePerformance] = useState([]);
    const [conversionFunnel, setConversionFunnel] = useState([]);
    const [timeRange, setTimeRange] = useState('30');

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [statsRes, sourcesRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/leads/leads/stats/?days=${timeRange}`, config),
                axios.get(`${API_BASE_URL}/leads/sources/performance/`, config)
            ]);

            setStats(statsRes.data);
            setSourcePerformance(sourcesRes.data.results || sourcesRes.data);

            // Create conversion funnel data
            const funnelData = [
                { stage: 'New', count: statsRes.data.new_leads, percentage: 100 },
                { stage: 'Contacted', count: statsRes.data.contacted_leads, percentage: Math.round((statsRes.data.contacted_leads / statsRes.data.new_leads) * 100) },
                { stage: 'Qualified', count: statsRes.data.qualified_leads, percentage: Math.round((statsRes.data.qualified_leads / statsRes.data.new_leads) * 100) },
                { stage: 'Converted', count: statsRes.data.converted_leads, percentage: Math.round((statsRes.data.converted_leads / statsRes.data.new_leads) * 100) }
            ];
            setConversionFunnel(funnelData);

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, label, value, change, color, subtext }) => (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                {change !== undefined && (
                    <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
                    </span>
                )}
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
            <p className="text-sm text-gray-600">{label}</p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
    );

    const ConversionFunnel = () => {
        const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

        return (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h3>
                <div className="space-y-4">
                    {conversionFunnel.map((stage, index) => (
                        <div key={stage.stage}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-900">{stage.count}</span>
                                    <span className="text-xs text-gray-500">({stage.percentage}%)</span>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="w-full bg-gray-200 rounded-full h-8">
                                    <div
                                        className="h-8 rounded-full flex items-center justify-center text-white text-sm font-medium transition-all duration-500"
                                        style={{
                                            width: `${stage.percentage}%`,
                                            backgroundColor: COLORS[index]
                                        }}
                                    >
                                        {stage.percentage}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Conversion Rate */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Overall Conversion Rate</span>
                        <span className="text-2xl font-bold text-green-600">
                            {stats?.conversion_rate || 0}%
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const SourcePerformance = () => {
        const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

        return (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Source Performance</h3>

                {sourcePerformance.length > 0 ? (
                    <>
                        {/* Pie Chart */}
                        <div className="mb-6">
                            <ResponsiveContainer width="100%" height={250}>
                                <RechartsPieChart>
                                    <Pie
                                        data={sourcePerformance}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="total_leads"
                                    >
                                        {sourcePerformance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Source List */}
                        <div className="space-y-3">
                            {sourcePerformance.map((source, index) => (
                                <div key={source.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <div>
                                            <p className="font-medium text-gray-900">{source.name}</p>
                                            <p className="text-xs text-gray-500">{source.source_type_display}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">{source.total_leads}</p>
                                        <p className="text-xs text-gray-500">
                                            {source.conversion_rate}% conversion
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ROI Metrics */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">ROI Metrics</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {sourcePerformance.slice(0, 4).map((source) => (
                                    <div key={source.id} className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-600 mb-1">{source.name}</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold text-gray-900">
                                                ₹{source.cost_per_lead || 0}
                                            </span>
                                            <span className="text-xs text-gray-500">/lead</span>
                                        </div>
                                        {source.roi && (
                                            <p className={`text-xs mt-1 ${source.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ROI: {source.roi}%
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <p className="text-center text-gray-500 py-8">No source data available</p>
                )}
            </div>
        );
    };

    const LeadTrends = () => {
        // Mock trend data - in production, this would come from API
        const trendData = [
            { month: 'Jan', leads: 45, converted: 12 },
            { month: 'Feb', leads: 52, converted: 15 },
            { month: 'Mar', leads: 61, converted: 18 },
            { month: 'Apr', leads: 58, converted: 20 },
            { month: 'May', leads: 70, converted: 25 },
            { month: 'Jun', leads: 85, converted: 30 }
        ];

        return (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} name="Total Leads" />
                        <Line type="monotone" dataKey="converted" stroke="#10B981" strokeWidth={2} name="Converted" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const TeamPerformance = () => {
        // Mock team data - in production, this would come from API
        const teamData = [
            { name: 'John Doe', leads: 45, converted: 18, rate: 40 },
            { name: 'Jane Smith', leads: 38, converted: 15, rate: 39 },
            { name: 'Mike Johnson', leads: 32, converted: 11, rate: 34 },
            { name: 'Sarah Williams', leads: 28, converted: 10, rate: 36 }
        ];

        return (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Team Performance</h3>

                <div className="space-y-4">
                    {teamData.map((member, index) => (
                        <div key={member.name} className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {index + 1}
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="font-medium text-gray-900">{member.name}</p>
                                    <span className="text-sm font-bold text-gray-900">{member.rate}%</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-600">
                                    <span>{member.leads} leads</span>
                                    <span>{member.converted} converted</span>
                                </div>
                                <div className="mt-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${member.rate}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bar Chart */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={teamData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="leads" fill="#3B82F6" name="Total Leads" />
                            <Bar dataKey="converted" fill="#10B981" name="Converted" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead Analytics</h1>
                        <p className="text-gray-600">Track performance and optimize your sales pipeline</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="365">Last year</option>
                        </select>
                        <button
                            onClick={fetchAnalytics}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            {stats && (
                <div className="grid grid-cols-5 gap-4 mb-6">
                    <StatCard
                        icon={Users}
                        label="Total Leads"
                        value={stats.total_leads}
                        change={stats.total_leads_change}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={Target}
                        label="Qualified Leads"
                        value={stats.qualified_leads}
                        change={stats.qualified_leads_change}
                        color="bg-purple-500"
                    />
                    <StatCard
                        icon={Award}
                        label="Converted"
                        value={stats.converted_leads}
                        change={stats.converted_leads_change}
                        color="bg-green-500"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Conversion Rate"
                        value={`${stats.conversion_rate}%`}
                        change={stats.conversion_rate_change}
                        color="bg-orange-500"
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Avg. Deal Value"
                        value={`₹${stats.avg_deal_value || 0}`}
                        change={stats.avg_deal_value_change}
                        color="bg-emerald-500"
                    />
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                <ConversionFunnel />
                <SourcePerformance />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <LeadTrends />
                <TeamPerformance />
            </div>
        </div>
    );
};

export default LeadAnalytics;
