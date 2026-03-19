import { Button, Card, Textarea, Input } from '@/components/ui';
import api from '@/utils/api';import {MessageSquare,Phone,Search,XCircle,Plus,Send,Clock,CheckCircle} from 'lucide-react';
import { useBranch } from '@/contexts/BranchContext';
import { useEffect, useState } from 'react';

const WhatsAppLogs = () => {
    const { getCurrentBranchId, initialized } = useBranch();
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // all, SENT, DELIVERED, FAILED
    const [searchPhone, setSearchPhone] = useState('');
    
    // Compose Modal State
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composePhone, setComposePhone] = useState('');
    const [composeMessage, setComposeMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (initialized) {
            fetchLogs();
            fetchStats();
        }
    }, [filter, getCurrentBranchId(), initialized]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {
                branch: getCurrentBranchId()
            };
            if (filter !== 'all') params.status = filter;
            if (searchPhone) params.phone = searchPhone;

            const response = await api.get('/notify/whatsapp/logs/', { params });
            setLogs(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching WhatsApp logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const params = {
                branch: getCurrentBranchId()
            };
            const response = await api.get('/notify/whatsapp/logs/stats/', { params });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchLogs();
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'DELIVERED':
            case 'READ':
                return <CheckCircle size={18} className="text-green-600" />;
            case 'SENT':
                return <Clock size={18} className="text-blue-600" />;
            case 'FAILED':
                return <XCircle size={18} className="text-red-600" />;
            default:
                return <Clock size={18} className="text-gray-600" />;
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            QUEUED: 'bg-gray-100 text-gray-800',
            SENT: 'bg-blue-100 text-blue-800',
            DELIVERED: 'bg-green-100 text-green-800',
            READ: 'bg-purple-100 text-purple-800',
            FAILED: 'bg-red-100 text-red-800',
        };

        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${colors[status] || colors.QUEUED}`}>
                {getStatusIcon(status)}
                {status}
            </span>
        );
    };

    const handleSendMessage = async () => {
        if (!composePhone.trim() || !composeMessage.trim()) {
            alert("Phone number and message are required");
            return;
        }

        try {
            setSending(true);
            const payload = {
                phone_number: composePhone.trim(),
                content: composeMessage.trim()
            };
            
            console.log('Sending WhatsApp Message Payload:', payload);
            const response = await api.post('/whatsapp/send/', payload);
            console.log('Backend Response for SendMessage:', response.data);

            alert('Message sent successfully!');
            setIsComposeOpen(false);
            setComposePhone('');
            setComposeMessage('');
            fetchLogs();
            fetchStats();
        } catch (error) {
            console.error('Error sending message. Details:', error);
            if (error.response?.status === 500) {
                const backendError = error.response?.data?.error || '';
                alert(`Internal Server Error: Failed to send message. ${backendError}`);
            } else {
                alert(error.response?.data?.error || 'Failed to send message.');
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">WhatsApp Message Logs</h1>
                    <p className="text-gray-600 mt-1">Monitor delivery and send targeted messages</p>
                </div>
                <Button onClick={() => setIsComposeOpen(true)} className="flex items-center gap-2">
                    <Plus size={18} />
                    New Message
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Messages</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <MessageSquare size={32} className="text-gray-400" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Sent</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
                            </div>
                            <Clock size={32} className="text-blue-400" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Delivered</p>
                                <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
                            </div>
                            <CheckCircle size={32} className="text-green-400" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Failed</p>
                                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                            </div>
                            <XCircle size={32} className="text-red-400" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Success Rate</p>
                                <p className="text-2xl font-bold text-primary">{stats.success_rate}%</p>
                            </div>
                            <CheckCircle size={32} className="text-primary-400" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <div className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Status Filter */}
                        <div className="flex gap-2">
                            {['all', 'SENT', 'DELIVERED', 'FAILED'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === status
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {status === 'all' ? 'All' : status}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                            <div className="relative flex-1">
                                <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchPhone}
                                    onChange={(e) => setSearchPhone(e.target.value)}
                                    placeholder="Search by phone number..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                            <Button type="submit">
                                <Search size={18} className="mr-2" />
                                Search
                            </Button>
                        </form>
                    </div>
                </div>
            </Card>

            {/* Logs Table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date & Time</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Recipient</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Template</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Delivered At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <>
                                    {[...Array(8)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4">
                                                <div className="h-3.5 bg-gray-200 rounded w-32" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="h-3.5 bg-gray-200 rounded w-28 mb-1.5" />
                                                <div className="h-2.5 bg-gray-200 rounded w-36" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="h-3.5 bg-gray-200 rounded w-24" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="h-3.5 bg-gray-200 rounded w-28" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="h-5 bg-gray-200 rounded-full w-20" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="h-3.5 bg-gray-200 rounded w-28" />
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No WhatsApp messages found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{log.recipient_name || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">{log.recipient_email || ''}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-gray-400" />
                                                {log.recipient_phone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{log.template_name || 'N/A'}</td>
                                        <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {log.delivered_at ? new Date(log.delivered_at).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Compose Message Modal */}
            {isComposeOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">New Message</h3>
                                <p className="text-sm text-gray-500">Send a direct message via WP Hub</p>
                            </div>
                            <button 
                                onClick={() => setIsComposeOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Recipient Phone Number
                                </label>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={composePhone}
                                        onChange={(e) => setComposePhone(e.target.value)}
                                        placeholder="e.g., +919876543210"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        disabled={sending}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +91)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Message Content
                                </label>
                                <Textarea
                                    value={composeMessage}
                                    onChange={(e) => setComposeMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                    rows={5}
                                    disabled={sending}
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                            <Button 
                                variant="outline" 
                                onClick={() => setIsComposeOpen(false)}
                                disabled={sending}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSendMessage}
                                disabled={sending || !composePhone.trim() || !composeMessage.trim()}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
                            >
                                {sending ? (
                                    <Clock size={16} className="animate-spin" />
                                ) : (
                                    <Send size={16} />
                                )}
                                {sending ? 'Sending...' : 'Send Message'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppLogs;
