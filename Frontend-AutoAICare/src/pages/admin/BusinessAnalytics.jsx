import React, { useState, useEffect } from 'react';
import {
    Users, DollarSign, TrendingUp, Package, Calendar, Award,
    BarChart3, PieChart, Activity, Filter, Download, RefreshCw,
    Car, Star, Clock, Target, Zap, ShoppingCart
} from 'lucide-react';
import axios from 'axios';
import {
    BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const ComprehensiveAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [timeRange, setTimeRange] = useState('30');
    const [stats, setStats] = useState({
        customers: {},
        revenue: {},
        services: {},
        performance: {}
    });

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Fetch all analytics data
            const [customersRes, bookingsRes, servicesRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/customers/customers/`, config),
                axios.get(`${API_BASE_URL}/bookings/bookings/`, config),
                axios.get(`${API_BASE_URL}/services/services/`, config)
            ]);

            const customers = customersRes.data.results || customersRes.data;
            const bookings = bookingsRes.data.results || bookingsRes.data;
            const services = servicesRes.data.results || servicesRes.data;

            // Calculate customer analytics
            const customerStats = {
                total: customers.length,
                new: customers.filter(c => {
                    const createdDate = new Date(c.created_at);
                    const daysAgo = (new Date() - createdDate) / (1000 * 60 * 60 * 24);
                    return daysAgo <= parseInt(timeRange);
                }).length,
                active: customers.filter(c => c.is_active).length,
                vip: customers.filter(c => c.membership_type === 'premium' || c.membership_type === 'vip').length,
                avgLifetimeValue: Math.round(customers.reduce((sum, c) => sum + (c.lifetime_value || 0), 0) / customers.length),
                totalRewardPoints: customers.reduce((sum, c) => sum + (c.reward_points || 0), 0)
            };

            // Calculate revenue analytics
            const revenueStats = {
                total: bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
                completed: bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.total_amount || 0), 0),
                pending: bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled').reduce((sum, b) => sum + (b.total_amount || 0), 0),
                avgBookingValue: Math.round(bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0) / bookings.length),
                totalBookings: bookings.length,
                completedBookings: bookings.filter(b => b.status === 'completed').length
            };

            // Calculate service analytics
            const serviceStats = {
                total: services.length,
                active: services.filter(s => s.is_active).length,
                mostPopular: getMostPopularService(bookings, services),
                totalRevenue: bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
            };

            setStats({
                customers: customerStats,
                revenue: revenueStats,
                services: serviceStats,
                performance: calculatePerformanceMetrics(bookings, customers)
            });

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getMostPopularService = (bookings, services) => {
        const serviceCounts = {};
        bookings.forEach(b => {
            if (b.service) {
                serviceCounts[b.service] = (serviceCounts[b.service] || 0) + 1;
            }
        });
        const mostPopularId = Object.keys(serviceCounts).reduce((a, b) =>
            serviceCounts[a] > serviceCounts[b] ? a : b, null
        );
        const service = services.find(s => s.id === parseInt(mostPopularId));
        return service ? service.name : 'N/A';
    };

    const calculatePerformanceMetrics = (bookings, customers) => {
        const completed = bookings.filter(b => b.status === 'completed').length;
        const total = bookings.length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            completionRate,
            customerSatisfaction: 4.5, // Mock data
            avgResponseTime: '2.5 hours', // Mock data
            repeatCustomerRate: Math.round((customers.filter(c => (c.total_bookings || 0) > 1).length / customers.length) * 100)
        };
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

    const CustomerAnalytics = () => {
        const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

        const customerSegmentData = [
            { name: 'Active', value: stats.customers.active, color: '#10B981' },
            { name: 'New', value: stats.customers.new, color: '#3B82F6' },
            { name: 'VIP', value: stats.customers.vip, color: '#F59E0B' },
            { name: 'Inactive', value: stats.customers.total - stats.customers.active, color: '#EF4444' }
        ];

        const customerTrendData = [
            { month: 'Jan', customers: 45, revenue: 125000 },
            { month: 'Feb', customers: 52, revenue: 145000 },
            { month: 'Mar', customers: 61, revenue: 168000 },
            { month: 'Apr', customers: 58, revenue: 155000 },
            { month: 'May', customers: 70, revenue: 195000 },
            { month: 'Jun', customers: 85, revenue: 235000 }
        ];

        return (
            <div className="space-y-6">
                {/* Customer Metrics */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        icon={Users}
                        label="Total Customers"
                        value={stats.customers.total}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="New Customers"
                        value={stats.customers.new}
                        color="bg-green-500"
                        subtext={`Last ${timeRange} days`}
                    />
                    <StatCard
                        icon={Award}
                        label="VIP Customers"
                        value={stats.customers.vip}
                        color="bg-orange-500"
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Avg Lifetime Value"
                        value={`₹${stats.customers.avgLifetimeValue}`}
                        color="bg-purple-500"
                    />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Customer Segments */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer Segments</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <RechartsPieChart>
                                <Pie
                                    data={customerSegmentData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {customerSegmentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Customer Growth */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Customer Growth</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={customerTrendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="customers" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Lifetime Value</h3>
                    <div className="space-y-3">
                        {[
                            { name: 'John Doe', value: 45000, bookings: 12 },
                            { name: 'Jane Smith', value: 38000, bookings: 10 },
                            { name: 'Mike Johnson', value: 32000, bookings: 8 },
                            { name: 'Sarah Williams', value: 28000, bookings: 7 }
                        ].map((customer, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{customer.name}</p>
                                        <p className="text-xs text-gray-500">{customer.bookings} bookings</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">₹{customer.value.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Lifetime Value</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const RevenueAnalytics = () => {
        const revenueData = [
            { month: 'Jan', revenue: 125000, bookings: 45 },
            { month: 'Feb', revenue: 145000, bookings: 52 },
            { month: 'Mar', revenue: 168000, bookings: 61 },
            { month: 'Apr', revenue: 155000, bookings: 58 },
            { month: 'May', revenue: 195000, bookings: 70 },
            { month: 'Jun', revenue: 235000, bookings: 85 }
        ];

        const revenueByService = [
            { name: 'Full Detailing', value: 450000 },
            { name: 'Ceramic Coating', value: 380000 },
            { name: 'Paint Protection', value: 320000 },
            { name: 'Interior Cleaning', value: 280000 },
            { name: 'Others', value: 170000 }
        ];

        const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

        return (
            <div className="space-y-6">
                {/* Revenue Metrics */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        icon={DollarSign}
                        label="Total Revenue"
                        value={`₹${stats.revenue.total.toLocaleString()}`}
                        color="bg-green-500"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Completed Revenue"
                        value={`₹${stats.revenue.completed.toLocaleString()}`}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={Clock}
                        label="Pending Revenue"
                        value={`₹${stats.revenue.pending.toLocaleString()}`}
                        color="bg-yellow-500"
                    />
                    <StatCard
                        icon={BarChart3}
                        label="Avg Booking Value"
                        value={`₹${stats.revenue.avgBookingValue}`}
                        color="bg-purple-500"
                    />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Revenue Trend */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue Trend</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue (₹)" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Revenue by Service */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenue by Service</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <RechartsPieChart>
                                <Pie
                                    data={revenueByService}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {revenueByService.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {revenueByService.map((service, index) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">{service.name}</span>
                                    <span className="text-lg font-bold text-gray-900">₹{service.value.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full"
                                        style={{
                                            width: `${(service.value / revenueByService[0].value) * 100}%`,
                                            backgroundColor: COLORS[index % COLORS.length]
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const ServiceAnalytics = () => {
        const servicePerformance = [
            { name: 'Full Detailing', bookings: 145, revenue: 450000, rating: 4.8 },
            { name: 'Ceramic Coating', bookings: 98, revenue: 380000, rating: 4.9 },
            { name: 'Paint Protection', bookings: 87, revenue: 320000, rating: 4.7 },
            { name: 'Interior Cleaning', bookings: 156, revenue: 280000, rating: 4.6 },
            { name: 'Exterior Wash', bookings: 234, revenue: 170000, rating: 4.5 }
        ];

        return (
            <div className="space-y-6">
                {/* Service Metrics */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        icon={Package}
                        label="Total Services"
                        value={stats.services.total}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={Zap}
                        label="Active Services"
                        value={stats.services.active}
                        color="bg-green-500"
                    />
                    <StatCard
                        icon={Star}
                        label="Most Popular"
                        value={stats.services.mostPopular}
                        color="bg-yellow-500"
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Service Revenue"
                        value={`₹${stats.services.totalRevenue.toLocaleString()}`}
                        color="bg-purple-500"
                    />
                </div>

                {/* Service Performance Chart */}
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Service Performance</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={servicePerformance}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="bookings" fill="#3B82F6" name="Bookings" />
                            <Bar dataKey="revenue" fill="#10B981" name="Revenue (₹)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Service Details */}
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h3>
                    <div className="space-y-3">
                        {servicePerformance.map((service, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-medium text-gray-900">{service.name}</p>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                            <span className="text-sm font-medium text-gray-700">{service.rating}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm text-gray-600">
                                        <span>{service.bookings} bookings</span>
                                        <span>₹{service.revenue.toLocaleString()} revenue</span>
                                        <span>₹{Math.round(service.revenue / service.bookings)} avg</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const PerformanceMetrics = () => {
        const performanceData = [
            { metric: 'Completion Rate', value: stats.performance.completionRate, target: 95, unit: '%' },
            { metric: 'Customer Satisfaction', value: stats.performance.customerSatisfaction, target: 4.5, unit: '/5' },
            { metric: 'Repeat Customer Rate', value: stats.performance.repeatCustomerRate, target: 60, unit: '%' },
            { metric: 'Avg Response Time', value: 2.5, target: 2, unit: 'hrs' }
        ];

        return (
            <div className="space-y-6">
                {/* Performance Metrics */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        icon={Target}
                        label="Completion Rate"
                        value={`${stats.performance.completionRate}%`}
                        color="bg-green-500"
                    />
                    <StatCard
                        icon={Star}
                        label="Customer Satisfaction"
                        value={`${stats.performance.customerSatisfaction}/5`}
                        color="bg-yellow-500"
                    />
                    <StatCard
                        icon={Users}
                        label="Repeat Customers"
                        value={`${stats.performance.repeatCustomerRate}%`}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={Clock}
                        label="Avg Response Time"
                        value={stats.performance.avgResponseTime}
                        color="bg-purple-500"
                    />
                </div>

                {/* Performance vs Target */}
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance vs Target</h3>
                    <div className="space-y-4">
                        {performanceData.map((item, index) => {
                            const percentage = (item.value / item.target) * 100;
                            const isAboveTarget = percentage >= 100;

                            return (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">{item.metric}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-900">
                                                {item.value}{item.unit}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                / {item.target}{item.unit}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className={`h-3 rounded-full ${isAboveTarget ? 'bg-green-500' : 'bg-yellow-500'}`}
                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Team Performance */}
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h3>
                    <div className="space-y-3">
                        {[
                            { name: 'John Doe', role: 'Senior Technician', bookings: 45, rating: 4.9 },
                            { name: 'Jane Smith', role: 'Technician', bookings: 38, rating: 4.8 },
                            { name: 'Mike Johnson', role: 'Technician', bookings: 32, rating: 4.7 },
                            { name: 'Sarah Williams', role: 'Junior Technician', bookings: 28, rating: 4.6 }
                        ].map((member, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{member.name}</p>
                                        <p className="text-xs text-gray-500">{member.role}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">{member.bookings}</p>
                                        <p className="text-xs text-gray-500">bookings</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        <span className="text-sm font-medium text-gray-700">{member.rating}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Analytics</h1>
                        <p className="text-gray-600">Comprehensive insights into your business performance</p>
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

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { key: 'overview', label: 'Overview', icon: BarChart3 },
                            { key: 'customers', label: 'Customers', icon: Users },
                            { key: 'revenue', label: 'Revenue', icon: DollarSign },
                            { key: 'services', label: 'Services', icon: Package },
                            { key: 'performance', label: 'Performance', icon: TrendingUp }
                        ].map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                        <StatCard icon={Users} label="Total Customers" value={stats.customers.total} color="bg-blue-500" />
                        <StatCard icon={DollarSign} label="Total Revenue" value={`₹${stats.revenue.total.toLocaleString()}`} color="bg-green-500" />
                        <StatCard icon={Package} label="Total Bookings" value={stats.revenue.totalBookings} color="bg-purple-500" />
                        <StatCard icon={Star} label="Completion Rate" value={`${stats.performance.completionRate}%`} color="bg-yellow-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <CustomerAnalytics />
                        <RevenueAnalytics />
                    </div>
                </div>
            )}
            {activeTab === 'customers' && <CustomerAnalytics />}
            {activeTab === 'revenue' && <RevenueAnalytics />}
            {activeTab === 'services' && <ServiceAnalytics />}
            {activeTab === 'performance' && <PerformanceMetrics />}
        </div>
    );
};

export default ComprehensiveAnalytics;
