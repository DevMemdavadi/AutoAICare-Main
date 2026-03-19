import React, { useState, useEffect } from 'react';
import {
    Calendar,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    Phone,
    Mail,
    Eye,
    MessageCircle,
    Cake,
    Heart,
    FileText,
    DollarSign,
    AlertTriangle,
    Wrench,
    Package,
    Users,
    Clock,
    Filter,
    Search,
    RefreshCw,
    ChevronRight,
} from 'lucide-react';
import api from '@/utils/api';
import { useBranch } from '@/contexts/BranchContext';
import BranchSelector from '@/components/BranchSelector';


const DailyFollowUp = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [statsData, setStatsData] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');

    const { selectedBranch, getCurrentBranchId } = useBranch();

    useEffect(() => {
        fetchDashboardData();
        fetchStatsData();
    }, [selectedBranch]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const branchId = getCurrentBranchId();
            const response = await api.get('/analytics/daily-followup/', {
                params: { branch: branchId }
            });
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            alert('Failed to load follow-up tasks');
        } finally {
            setLoading(false);
        }
    };

    const fetchStatsData = async () => {
        try {
            const branchId = getCurrentBranchId();
            const response = await api.get('/analytics/followup-stats/', {
                params: { branch: branchId }
            });
            setStatsData(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchDashboardData(), fetchStatsData()]);
        setRefreshing(false);
    };

    const taskCategories = [
        { id: 'all', label: 'All Tasks', icon: FileText, color: 'blue' },
        { id: 'birthdays', label: 'Birthdays', icon: Cake, color: 'purple' },
        { id: 'anniversaries', label: 'Anniversaries', icon: Heart, color: 'pink' },
        { id: 'pending_enquiries', label: 'Enquiries', icon: FileText, color: 'indigo' },
        { id: 'scheduled_followups', label: 'Follow-ups', icon: Calendar, color: 'blue' },
        { id: 'pending_payments', label: 'Payments', icon: DollarSign, color: 'yellow' },
        { id: 'overdue_payments', label: 'Overdue', icon: AlertTriangle, color: 'red' },
        { id: 'service_reminders', label: 'Service Due', icon: Wrench, color: 'orange' },
        { id: 'low_stock_items', label: 'Low Stock', icon: Package, color: 'amber' },
        { id: 'irregular_clients', label: 'Inactive', icon: Users, color: 'gray' },
        { id: 'pending_bookings', label: 'Bookings', icon: Clock, color: 'teal' },
    ];

    const getAllTasks = () => {
        if (!dashboardData?.tasks) return [];

        const allTasks = [];
        Object.entries(dashboardData.tasks).forEach(([category, tasks]) => {
            tasks.forEach(task => {
                allTasks.push({ ...task, category });
            });
        });

        return allTasks;
    };

    const getFilteredTasks = () => {
        let tasks = activeTab === 'all' ? getAllTasks() : (dashboardData?.tasks?.[activeTab] || []);

        if (searchQuery) {
            tasks = tasks.filter(task => {
                const searchFields = [
                    task.name,
                    task.customer_name,
                    task.phone,
                    task.email,
                    task.vehicle,
                    task.service,
                ].filter(Boolean);

                return searchFields.some(field =>
                    field.toLowerCase().includes(searchQuery.toLowerCase())
                );
            });
        }

        if (priorityFilter !== 'all') {
            tasks = tasks.filter(task => task.priority === priorityFilter);
        }

        return tasks;
    };

    if (loading) {
        const shimmer = 'animate-pulse bg-gray-200 rounded';
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6">
                {/* Header skeleton */}
                <div className="mb-5 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div className="space-y-2">
                            <div className={`${shimmer} h-8 w-72`} />
                            <div className={`${shimmer} h-4 w-48`} />
                        </div>
                        <div className={`${shimmer} h-9 w-24 rounded-lg`} />
                    </div>

                    {/* Summary cards skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm p-3 sm:p-6 space-y-3">
                                <div className={`${shimmer} h-9 w-9 rounded-lg`} />
                                <div className={`${shimmer} h-7 w-16`} />
                                <div className={`${shimmer} h-3 w-24`} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filter bar skeleton */}
                <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col gap-3">
                    <div className={`${shimmer} h-9 w-full rounded-lg`} />
                    <div className={`${shimmer} h-9 w-40 rounded-lg`} />
                </div>

                {/* Tab strip skeleton */}
                <div className="bg-white rounded-xl shadow-sm p-2 mb-4 sm:mb-6 flex gap-2 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`${shimmer} h-8 rounded-lg flex-shrink-0`} style={{ width: `${70 + i * 10}px` }} />
                    ))}
                </div>

                {/* Task card skeletons */}
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-sm p-3 sm:p-4 border-l-4 border-gray-200 flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                <div className={`${shimmer} h-4 w-40`} />
                                <div className={`${shimmer} h-3 w-28`} />
                                <div className={`${shimmer} h-3 w-36`} />
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <div className={`${shimmer} h-8 w-8 rounded-lg`} />
                                <div className={`${shimmer} h-8 w-8 rounded-lg`} />
                                <div className={`${shimmer} h-8 w-8 rounded-lg`} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6">
            {/* Header */}
            <div className="mb-5 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">
                            Daily Follow-up Dashboard
                        </h1>
                        <p className="text-sm sm:text-base text-gray-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">
                                {new Date(dashboardData?.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </span>
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 w-full sm:w-auto flex-shrink-0"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <SummaryCard
                        title="Total Tasks"
                        value={dashboardData?.summary?.total_tasks || 0}
                        icon={FileText}
                        color="blue"
                        trend="+12% from yesterday"
                    />
                    <SummaryCard
                        title="High Priority"
                        value={dashboardData?.summary?.high_priority || 0}
                        icon={AlertCircle}
                        color="red"
                        trend="Needs attention"
                    />
                    <SummaryCard
                        title="Follow-up Rate"
                        value={`${statsData?.followup_completion_rate || 0}%`}
                        icon={CheckCircle2}
                        color="green"
                        trend="This week"
                    />
                    <SummaryCard
                        title="Conversion Rate"
                        value={`${statsData?.lead_conversion_rate || 0}%`}
                        icon={TrendingUp}
                        color="purple"
                        trend="This month"
                    />
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex flex-col gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        >
                            <option value="all">All Priorities</option>
                            <option value="urgent">🔴 Urgent</option>
                            <option value="high">🟠 High</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="low">🟢 Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Task Tabs */}
            <div className="bg-white rounded-xl shadow-sm mb-4 sm:mb-6 tabs-scrollbar">
                <div className="flex border-b border-gray-200 p-1.5 sm:p-2 gap-1 sm:gap-2 min-w-max">
                    {taskCategories.map((category) => {
                        const count = category.id === 'all'
                            ? dashboardData?.summary?.total_tasks
                            : dashboardData?.summary?.[`${category.id}_count`] || 0;

                        const isActive = activeTab === category.id;
                        const colorClasses = {
                            blue: 'bg-blue-100 text-blue-700',
                            purple: 'bg-purple-100 text-purple-700',
                            pink: 'bg-pink-100 text-pink-700',
                            indigo: 'bg-indigo-100 text-indigo-700',
                            yellow: 'bg-yellow-100 text-yellow-700',
                            red: 'bg-red-100 text-red-700',
                            orange: 'bg-orange-100 text-orange-700',
                            amber: 'bg-amber-100 text-amber-700',
                            gray: 'bg-gray-100 text-gray-700',
                            teal: 'bg-teal-100 text-teal-700',
                        };

                        return (
                            <button
                                key={category.id}
                                onClick={() => setActiveTab(category.id)}
                                className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all whitespace-nowrap text-xs sm:text-sm ${isActive
                                    ? `${colorClasses[category.color]} font-semibold`
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <category.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span>{category.label}</span>
                                {count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${isActive
                                        ? 'bg-white/50'
                                        : 'bg-gray-200 text-gray-700'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Task List */}
            <div className="space-y-4">
                {getFilteredTasks().length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
                        <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                            All caught up!
                        </h3>
                        <p className="text-sm text-gray-600">
                            No tasks found matching your filters.
                        </p>
                    </div>
                ) : (
                    <TaskList tasks={getFilteredTasks()} activeTab={activeTab} />
                )}
            </div>
        </div>
    );
};

// Summary Card Component
const SummaryCard = ({ title, value, icon: Icon, color, trend }) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        red: 'bg-red-100 text-red-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
            </div>
            <h3 className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">{value}</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">{title}</p>
            <p className="text-xs text-gray-500 hidden sm:block">{trend}</p>
        </div>
    );
};

// Task List Component
const TaskList = ({ tasks, activeTab }) => {
    const groupedTasks = tasks.reduce((acc, task) => {
        const priority = task.priority || 'medium';
        if (!acc[priority]) acc[priority] = [];
        acc[priority].push(task);
        return acc;
    }, {});

    const priorityOrder = ['urgent', 'high', 'medium', 'low'];

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'urgent': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {priorityOrder.map(priority => {
                const priorityTasks = groupedTasks[priority] || [];
                if (priorityTasks.length === 0) return null;

                return (
                    <div key={priority}>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                            <span>{getPriorityIcon(priority)}</span>
                            <span className="capitalize">{priority} Priority</span>
                            <span className="text-xs sm:text-sm font-normal text-gray-500">
                                ({priorityTasks.length})
                            </span>
                        </h3>
                        <div className="space-y-2 sm:space-y-3">
                            {priorityTasks.map((task, index) => (
                                <TaskCard key={index} task={task} category={activeTab} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Task Card Component
const TaskCard = ({ task, category }) => {
    const handleCall = (phone) => {
        window.location.href = `tel:${phone}`;
    };

    const handleEmail = (email) => {
        window.location.href = `mailto:${email}`;
    };

    const handleWhatsApp = (phone) => {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const getPriorityBorderColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'border-red-500';
            case 'high': return 'border-orange-500';
            case 'medium': return 'border-yellow-500';
            case 'low': return 'border-green-500';
            default: return 'border-gray-500';
        }
    };

    const renderTaskContent = () => {
        switch (category) {
            case 'birthdays':
            case 'anniversaries':
                return (
                    <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{task.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">{task.phone}</p>
                        <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">
                            {task.membership_type} • {task.total_visits} visits
                        </p>
                    </div>
                );

            case 'pending_enquiries':
            case 'scheduled_followups':
                return (
                    <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{task.customer_name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">{task.phone}</p>
                        <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">
                            {task.service_interest || task.lead_status} • Score: {task.score}
                        </p>
                    </div>
                );

            case 'pending_payments':
            case 'overdue_payments':
                return (
                    <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{task.customer_name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">{task.phone}</p>
                        <p className="text-xs sm:text-sm font-semibold text-red-600 mt-0.5 sm:mt-1">
                            ₹{task.amount?.toLocaleString()}
                            {task.days_overdue && ` • ${task.days_overdue}d overdue`}
                        </p>
                    </div>
                );

            case 'service_reminders':
                return (
                    <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{task.customer_name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{task.vehicle}</p>
                        <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                            Due: {new Date(task.due_date).toLocaleDateString()} • {task.days_until_due}d
                        </p>
                    </div>
                );

            case 'low_stock_items':
                return (
                    <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{task.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">SKU: {task.sku}</p>
                        <p className="text-xs sm:text-sm text-red-600 mt-0.5 sm:mt-1">
                            Stock: {task.current_quantity} {task.unit} (Min: {task.minimum_stock_level})
                        </p>
                    </div>
                );

            case 'irregular_clients':
                return (
                    <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{task.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">{task.phone}</p>
                        <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                            Last: {task.days_since_visit}d ago • {task.total_visits} visits
                        </p>
                    </div>
                );

            case 'pending_bookings':
                return (
                    <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{task.customer_name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{task.service} • {task.vehicle}</p>
                        <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                            {new Date(task.booking_datetime).toLocaleString()} • ₹{task.total_price}
                        </p>
                    </div>
                );

            default:
                return (
                    <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {task.name || task.customer_name}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600">{task.phone}</p>
                    </div>
                );
        }
    };

    return (
        <div
            className={`bg-white rounded-lg shadow-sm p-3 sm:p-4 hover:shadow-md transition-all border-l-4 ${getPriorityBorderColor(task.priority)}`}
        >
            <div className="flex items-start justify-between gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                    {renderTaskContent()}
                </div>

                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {task.phone && (
                        <>
                            <button
                                onClick={() => handleCall(task.phone)}
                                className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Call"
                            >
                                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                                onClick={() => handleWhatsApp(task.phone)}
                                className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="WhatsApp"
                            >
                                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                        </>
                    )}
                    {task.email && (
                        <button
                            onClick={() => handleEmail(task.email)}
                            className="p-1.5 sm:p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Email"
                        >
                            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                    )}
                    <button
                        className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="View Details"
                    >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 hidden sm:block" />
                </div>
            </div>
        </div>
    );
};

export default DailyFollowUp;
