import React, { useState, useEffect } from 'react';
import {
    Users, Phone, Mail, TrendingUp, Calendar, Filter,
    Plus, Search, Download, RefreshCw, Star, Clock,
    CheckCircle, XCircle, AlertCircle, Target, Award, Trash2
} from 'lucide-react';
import axios from 'axios';
import LeadDetailModal from './components/LeadDetailModal';
import AddLeadModal from './components/AddLeadModal';
import { exportLeadsToCSV } from '../../utils/exportUtils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const LeadManagement = () => {
    const [activeTab, setActiveTab] = useState('pipeline');
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState(null);
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        source: 'all',
        search: ''
    });

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [leadsRes, statsRes, sourcesRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/leads/leads/`, config),
                axios.get(`${API_BASE_URL}/leads/leads/stats/?days=30`, config),
                axios.get(`${API_BASE_URL}/leads/sources/`, config)
            ]);

            setLeads(leadsRes.data.results || leadsRes.data);
            setStats(statsRes.data);
            setSources(sourcesRes.data.results || sourcesRes.data);
        } catch (error) {
            console.error('Error fetching lead data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            new: 'bg-blue-100 text-blue-800',
            contacted: 'bg-purple-100 text-purple-800',
            qualified: 'bg-green-100 text-green-800',
            proposal_sent: 'bg-yellow-100 text-yellow-800',
            negotiation: 'bg-orange-100 text-orange-800',
            won: 'bg-emerald-100 text-emerald-800',
            lost: 'bg-gray-100 text-gray-800',
            on_hold: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            urgent: 'bg-red-500 text-white',
            high: 'bg-orange-500 text-white',
            medium: 'bg-blue-500 text-white',
            low: 'bg-gray-500 text-white'
        };
        return colors[priority] || 'bg-gray-500 text-white';
    };

    const getScoreColor = (score) => {
        if (score >= 75) return 'text-green-600 bg-green-50';
        if (score >= 50) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    // Bulk Actions
    const handleSelectAll = () => {
        if (selectedLeads.length === filteredLeads.length) {
            setSelectedLeads([]);
        } else {
            setSelectedLeads(filteredLeads.map(lead => lead.id));
        }
    };

    const handleSelectLead = (leadId) => {
        if (selectedLeads.includes(leadId)) {
            setSelectedLeads(selectedLeads.filter(id => id !== leadId));
        } else {
            setSelectedLeads([...selectedLeads, leadId]);
        }
    };

    const handleBulkExport = () => {
        const leadsToExport = leads.filter(lead => selectedLeads.includes(lead.id));
        exportLeadsToCSV(leadsToExport);
        setSelectedLeads([]);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedLeads.length} leads?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await Promise.all(
                selectedLeads.map(id =>
                    axios.delete(`${API_BASE_URL}/leads/leads/${id}/`, config)
                )
            );

            fetchData();
            setSelectedLeads([]);
            alert('Leads deleted successfully');
        } catch (error) {
            console.error('Error deleting leads:', error);
            alert('Failed to delete some leads');
        }
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await Promise.all(
                selectedLeads.map(id =>
                    axios.patch(`${API_BASE_URL}/leads/leads/${id}/`, { status: newStatus }, config)
                )
            );

            fetchData();
            setSelectedLeads([]);
            alert('Status updated successfully');
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update some leads');
        }
    };


    const StatCard = ({ icon: Icon, label, value, trend, color }) => (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {trend && (
                        <p className={`text-sm mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );

    const LeadCard = ({ lead }) => (
        <div
            className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedLead(lead)}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                    <p className="text-sm text-gray-600">{lead.organization || 'Individual'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(lead.priority)}`}>
                        {lead.priority_display}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getScoreColor(lead.score)}`}>
                        {lead.score}
                    </span>
                </div>
            </div>

            <div className="space-y-2 mb-3">
                <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {lead.phone}
                </div>
                {lead.email && (
                    <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        {lead.email}
                    </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                    <Target className="w-4 h-4 mr-2" />
                    {lead.source_name || 'Unknown Source'}
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                    {lead.status_display}
                </span>
                <span className="text-xs text-gray-500">
                    {lead.days_old} days old
                </span>
            </div>
        </div>
    );

    const PipelineView = () => {
        const stages = [
            { key: 'new', label: 'New', icon: Star },
            { key: 'contacted', label: 'Contacted', icon: Phone },
            { key: 'qualified', label: 'Qualified', icon: CheckCircle },
            { key: 'proposal_sent', label: 'Proposal', icon: Mail },
            { key: 'negotiation', label: 'Negotiation', icon: TrendingUp },
            { key: 'won', label: 'Won', icon: Award }
        ];

        const getLeadsByStatus = (status) => {
            return leads.filter(lead => lead.status === status);
        };

        return (
            <div className="grid grid-cols-6 gap-4">
                {stages.map(stage => {
                    const stageLeads = getLeadsByStatus(stage.key);
                    const Icon = stage.icon;

                    return (
                        <div key={stage.key} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-5 h-5 text-gray-600" />
                                    <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                                </div>
                                <span className="bg-white px-2 py-1 rounded text-sm font-medium text-gray-700">
                                    {stageLeads.length}
                                </span>
                            </div>

                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {stageLeads.map(lead => (
                                    <div
                                        key={lead.id}
                                        className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => setSelectedLead(lead)}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-medium text-sm text-gray-900">{lead.name}</h4>
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getScoreColor(lead.score)}`}>
                                                {lead.score}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-2">{lead.phone}</p>
                                        <div className="flex items-center justify-between">
                                            <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(lead.priority)}`}>
                                                {lead.priority_display}
                                            </span>
                                            <span className="text-xs text-gray-500">{lead.days_old}d</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const ListView = () => {
        const filteredLeads = leads.filter(lead => {
            if (filters.status !== 'all' && lead.status !== filters.status) return false;
            if (filters.priority !== 'all' && lead.priority !== filters.priority) return false;
            if (filters.source !== 'all' && lead.source !== parseInt(filters.source)) return false;
            if (filters.search && !lead.name.toLowerCase().includes(filters.search.toLowerCase()) &&
                !lead.phone.includes(filters.search) &&
                !(lead.organization || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
            return true;
        });

        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredLeads.map(lead => (
                                <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="font-medium text-gray-900">{lead.name}</div>
                                            <div className="text-sm text-gray-500">{lead.organization || 'Individual'}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{lead.phone}</div>
                                        {lead.email && <div className="text-sm text-gray-500">{lead.email}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {lead.source_name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                                            {lead.status_display}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(lead.priority)}`}>
                                            {lead.priority_display}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(lead.score)}`}>
                                            {lead.score}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {lead.days_old} days
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button className="text-blue-600 hover:text-blue-800">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead Management</h1>
                <p className="text-gray-600">Track and manage your sales pipeline</p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                    <StatCard
                        icon={Users}
                        label="Total Leads"
                        value={stats.total_leads}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={Star}
                        label="New Leads"
                        value={stats.new_leads}
                        color="bg-purple-500"
                    />
                    <StatCard
                        icon={CheckCircle}
                        label="Qualified"
                        value={stats.qualified_leads}
                        color="bg-green-500"
                    />
                    <StatCard
                        icon={Award}
                        label="Converted"
                        value={stats.converted_leads}
                        color="bg-emerald-500"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Conversion Rate"
                        value={`${stats.conversion_rate}%`}
                        color="bg-orange-500"
                    />
                </div>
            )}

            {/* Filters and Actions */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search leads..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>

                        <select
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="all">All Status</option>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="proposal_sent">Proposal Sent</option>
                            <option value="negotiation">Negotiation</option>
                            <option value="won">Won</option>
                            <option value="lost">Lost</option>
                        </select>

                        <select
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={filters.priority}
                            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                        >
                            <option value="all">All Priority</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        {/* Bulk Actions */}
                        {selectedLeads.length > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                <span className="text-sm font-medium text-blue-900">
                                    {selectedLeads.length} selected
                                </span>
                                <button
                                    onClick={handleBulkExport}
                                    className="px-3 py-1 text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 flex items-center gap-1 text-sm"
                                >
                                    <Download className="w-3 h-3" />
                                    Export
                                </button>
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleBulkStatusUpdate(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                    className="px-3 py-1 text-sm border border-blue-300 rounded hover:bg-blue-50"
                                >
                                    <option value="">Change Status</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="proposal_sent">Proposal Sent</option>
                                    <option value="negotiation">Negotiation</option>
                                    <option value="won">Won</option>
                                    <option value="lost">Lost</option>
                                </select>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1 text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 flex items-center gap-1 text-sm"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                </button>
                            </div>
                        )}

                        <button
                            onClick={fetchData}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Lead
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('pipeline')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pipeline'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Pipeline View
                        </button>
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'list'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            List View
                        </button>
                    </nav>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'pipeline' ? <PipelineView /> : <ListView />}

            {/* Modals */}
            {selectedLead && (
                <LeadDetailModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onUpdate={fetchData}
                />
            )}

            {showAddModal && (
                <AddLeadModal
                    sources={sources}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
};

export default LeadManagement;
