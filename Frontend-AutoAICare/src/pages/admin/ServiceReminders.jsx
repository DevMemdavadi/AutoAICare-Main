import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Wrench,
    Send,
    CheckCircle,
    XCircle,
    Clock,
    Filter,
    Search,
    RefreshCw,
    MessageCircle,
    Bell,
    ChevronRight,
    Settings,
    MoreVertical,
    BarChart3
} from 'lucide-react';
import api from '@/utils/api';
import { Badge, Button, Card, Input } from '@/components/ui';
import { useBranch } from '@/contexts/BranchContext';

const ServiceReminders = () => {
    const [loading, setLoading] = useState(true);
    const [reminders, setReminders] = useState([]);
    const [stats, setStats] = useState(null);
    const [activeFilter, setActiveFilter] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    const { selectedBranch, getCurrentBranchId } = useBranch();

    useEffect(() => {
        fetchReminders();
        fetchStats();
    }, [activeFilter, selectedBranch]);

    const fetchReminders = async () => {
        try {
            setLoading(true);
            const branchId = getCurrentBranchId();
            const response = await api.get('/customers/reminders/', {
                params: {
                    status: activeFilter === 'all' ? '' : activeFilter,
                    branch: branchId
                }
            });
            setReminders(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching reminders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const branchId = getCurrentBranchId();
            const response = await api.get('/customers/reminders/stats/', {
                params: { branch: branchId }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleAction = async (id, action) => {
        try {
            setActionLoading(id);
            await api.post(`/customers/reminders/${id}/action/`, { action });
            fetchReminders();
            fetchStats();
        } catch (error) {
            console.error(`Error performing ${action}:`, error);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            pending: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', icon: Clock },
            sent: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: Send },
            completed: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', icon: CheckCircle },
            cancelled: { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100', icon: XCircle }
        };
        return configs[status] || configs.pending;
    };

    const filteredReminders = reminders.filter(r =>
        r.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.vehicle_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight truncate">Service Reminders</h1>
                    <p className="text-sm sm:text-base text-slate-500 mt-1">Nurture client relationships with automated follow-ups</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto justify-center border-none" onClick={fetchReminders}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-white to-slate-50 border-none shadow-sm h-full">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-500/10 text-blue-600 rounded-2xl">
                            <Bell size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Pending Reminders</p>
                            <p className="text-3xl font-bold text-slate-900">{stats?.pending || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-white to-slate-50 border-none shadow-sm h-full">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-orange-500/10 text-orange-600 rounded-2xl">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Due Today</p>
                            <p className="text-3xl font-bold text-slate-900">{stats?.due_today || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-white to-red-50 border-none shadow-sm h-full">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-red-500/10 text-red-600 rounded-2xl">
                            <XCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Overdue</p>
                            <p className="text-3xl font-bold text-slate-900">{stats?.overdue || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-primary to-blue-600 text-white border-none shadow-lg h-full">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-white/20 text-white rounded-2xl">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white/80">Conversion Rate</p>
                            <p className="text-3xl font-bold text-white">{stats?.conversion_rate || 0}%</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card className="p-4 border-none shadow-sm bg-white/60 backdrop-blur-md">
                <div className="flex flex-col lg:row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto">
                        {['pending', 'sent', 'completed', 'cancelled', 'all'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                                    ${activeFilter === filter
                                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Search customer or vehicle..."
                            className="pl-10 h-10 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Reminders Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl shadow-sm p-6 animate-pulse">
                            {/* Card header: avatar + name + status badge */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-28" />
                                        <div className="h-5 bg-gray-200 rounded-lg w-20" />
                                    </div>
                                </div>
                                <div className="h-6 bg-gray-200 rounded-xl w-20" />
                            </div>
                            {/* Info rows */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="h-3 bg-gray-200 rounded w-16" />
                                    <div className="h-3 bg-gray-200 rounded w-24" />
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                                    <div className="h-2.5 bg-gray-200 rounded w-20" />
                                    <div className="h-3 bg-gray-200 rounded w-32" />
                                </div>
                            </div>
                            {/* Action buttons */}
                            <div className="grid grid-cols-2 gap-3 mt-8">
                                <div className="h-9 bg-gray-200 rounded-lg" />
                                <div className="h-9 bg-gray-200 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredReminders.length === 0 ? (
                <Card className="p-20 text-center border-dashed border-2 bg-slate-50/50">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Wrench size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">No Reminders Found</h3>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                        There are no service reminders matching your criteria.
                        Reminders are automatically generated when jobs are delivered.
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredReminders.map(reminder => {
                        const config = getStatusConfig(reminder.status);
                        const StatusIcon = config.icon;
                        const isOverdue = new Date(reminder.due_date) < new Date();

                        return (
                            <Card key={reminder.id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                                                {reminder.customer_name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                                    {reminder.customer_name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-0.5">
                                                    <Badge variant="outline" className="bg-slate-50 font-medium">
                                                        {reminder.vehicle_number}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${config.bg} ${config.color}`}>
                                            <StatusIcon size={12} />
                                            {reminder.status_display}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className="text-primary" />
                                                <span className="text-sm font-semibold text-slate-700">Due Date</span>
                                            </div>
                                            <span className={`text-sm font-bold ${isOverdue && reminder.status === 'pending' ? 'text-red-500' : 'text-slate-900'}`}>
                                                {new Date(reminder.due_date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                                {isOverdue && reminder.status === 'pending' && ' (Overdue)'}
                                            </span>
                                        </div>

                                        <div className="p-3 bg-slate-50 rounded-xl">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Service Interest</p>
                                            <p className="text-sm text-slate-700 font-medium">{reminder.reminder_type.replace(/_/g, ' ')}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-8">
                                        {reminder.status === 'pending' && (
                                            <>
                                                <Button
                                                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white border-none shadow-md shadow-green-200"
                                                    disabled={actionLoading === reminder.id}
                                                    onClick={() => handleAction(reminder.id, 'send')}
                                                >
                                                    <MessageCircle size={16} />
                                                    WhatsApp
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="w-full gap-2 hover:bg-slate-50"
                                                    disabled={actionLoading === reminder.id}
                                                    onClick={() => handleAction(reminder.id, 'complete')}
                                                >
                                                    <CheckCircle size={16} />
                                                    Done
                                                </Button>
                                            </>
                                        )}
                                        {reminder.status === 'sent' && (
                                            <Button
                                                className="w-full col-span-2 gap-2 bg-primary text-white shadow-md shadow-primary/20"
                                                onClick={() => handleAction(reminder.id, 'complete')}
                                            >
                                                <CheckCircle size={16} />
                                                Mark Completed
                                            </Button>
                                        )}
                                        {['completed', 'cancelled'].includes(reminder.status) && (
                                            <Button
                                                variant="outline"
                                                className="w-full col-span-2 text-slate-400 border-slate-200"
                                                disabled
                                            >
                                                <XCircle size={16} />
                                                Action Closed
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ServiceReminders;
