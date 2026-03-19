import React, { useState, useEffect } from 'react';
import {
    X, Phone, Mail, Building2, Calendar, DollarSign, User,
    MessageSquare, Clock, CheckCircle, Edit, Trash2, Plus,
    Send, FileText, TrendingUp, RefreshCw, MessageCircle
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const LeadDetailModal = ({ lead, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [activities, setActivities] = useState([]);
    const [followUps, setFollowUps] = useState([]);
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [showFollowUpForm, setShowFollowUpForm] = useState(false);

    const [formData, setFormData] = useState({
        name: lead?.name || '',
        phone: lead?.phone || '',
        email: lead?.email || '',
        organization: lead?.organization || '',
        status: lead?.status || 'new',
        priority: lead?.priority || 'medium',
        interested_services: lead?.interested_services || '',
        vehicle_info: lead?.vehicle_info || '',
        budget_range: lead?.budget_range || '',
        notes: lead?.notes || ''
    });

    const [activityForm, setActivityForm] = useState({
        activity_type: 'call_outbound',
        description: '',
        outcome: '',
        duration_minutes: ''
    });

    const [followUpForm, setFollowUpForm] = useState({
        due_date: '',
        task: '',
        priority: 'medium'
    });

    useEffect(() => {
        if (lead?.id) {
            fetchLeadDetails();
        }
    }, [lead?.id]);

    const fetchLeadDetails = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const response = await axios.get(`${API_BASE_URL}/leads/leads/${lead.id}/`, config);
            setActivities(response.data.recent_activities || []);
            setFollowUps(response.data.pending_follow_ups || []);
        } catch (error) {
            console.error('Error fetching lead details:', error);
        }
    };

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.put(`${API_BASE_URL}/leads/leads/${lead.id}/`, formData, config);
            onUpdate();
            setEditing(false);
        } catch (error) {
            console.error('Error updating lead:', error);
            alert('Failed to update lead');
        } finally {
            setLoading(false);
        }
    };

    const handleAddActivity = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.post(
                `${API_BASE_URL}/leads/leads/${lead.id}/add_activity/`,
                activityForm,
                config
            );

            setActivityForm({
                activity_type: 'call_outbound',
                description: '',
                outcome: '',
                duration_minutes: ''
            });
            setShowActivityForm(false);
            fetchLeadDetails();
        } catch (error) {
            console.error('Error adding activity:', error);
            alert('Failed to add activity');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFollowUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.post(
                `${API_BASE_URL}/leads/leads/${lead.id}/add_followup/`,
                followUpForm,
                config
            );

            setFollowUpForm({
                due_date: '',
                task: '',
                priority: 'medium'
            });
            setShowFollowUpForm(false);
            fetchLeadDetails();
        } catch (error) {
            console.error('Error adding follow-up:', error);
            alert('Failed to add follow-up');
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

    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'call_outbound':
            case 'call_inbound': return <Phone className="w-3.5 h-3.5" />;
            case 'email_sent':
            case 'email_received': return <Mail className="w-3.5 h-3.5" />;
            case 'whatsapp_sent': return <MessageCircle className="w-3.5 h-3.5" />;
            case 'status_changed': return <RefreshCw className="w-3.5 h-3.5" />;
            case 'follow_up': return <Calendar className="w-3.5 h-3.5" />;
            case 'note_added': return <FileText className="w-3.5 h-3.5" />;
            default: return <MessageSquare className="w-3.5 h-3.5" />;
        }
    };

    const getActivityColor = (type) => {
        switch (type) {
            case 'status_changed': return 'bg-orange-500';
            case 'won': return 'bg-green-500';
            case 'lost': return 'bg-red-500';
            case 'whatsapp_sent': return 'bg-emerald-500';
            case 'email_sent': return 'bg-blue-500';
            default: return 'bg-slate-500';
        }
    };

    if (!lead) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
                            <p className="text-sm text-gray-600">{lead.organization || 'Individual'}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                            {lead.status_display}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(lead.priority)}`}>
                            {lead.priority_display}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(lead.score)}`}>
                            Score: {lead.score}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Left Column - Lead Info */}
                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">Lead Information</h3>
                                    {!editing && (
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit
                                        </button>
                                    )}
                                </div>

                                {editing ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="new">New</option>
                                                <option value="contacted">Contacted</option>
                                                <option value="qualified">Qualified</option>
                                                <option value="proposal_sent">Proposal Sent</option>
                                                <option value="negotiation">Negotiation</option>
                                                <option value="won">Won</option>
                                                <option value="lost">Lost</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                            <select
                                                value={formData.priority}
                                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="urgent">Urgent</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleUpdate}
                                                disabled={loading}
                                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {loading ? 'Saving...' : 'Save Changes'}
                                            </button>
                                            <button
                                                onClick={() => setEditing(false)}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span>{lead.phone}</span>
                                        </div>
                                        {lead.email && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <span>{lead.email}</span>
                                            </div>
                                        )}
                                        {lead.organization && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                <span>{lead.organization}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span>Created {lead.days_old} days ago</span>
                                        </div>
                                        {lead.budget_range && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <DollarSign className="w-4 h-4 text-gray-400" />
                                                <span>{lead.budget_range}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Interest Details */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-3">Interest Details</h3>
                                {lead.interested_services && (
                                    <div className="mb-3">
                                        <p className="text-sm font-medium text-gray-700 mb-1">Services</p>
                                        <p className="text-sm text-gray-600">{lead.interested_services}</p>
                                    </div>
                                )}
                                {lead.vehicle_info && (
                                    <div className="mb-3">
                                        <p className="text-sm font-medium text-gray-700 mb-1">Vehicle</p>
                                        <p className="text-sm text-gray-600">{lead.vehicle_info}</p>
                                    </div>
                                )}
                                {lead.notes && (
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                                        <p className="text-sm text-gray-600">{lead.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Activities & Follow-ups */}
                        <div className="space-y-6">
                            {/* Activities */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-900">Recent Activities</h3>
                                    <button
                                        onClick={() => setShowActivityForm(!showActivityForm)}
                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add
                                    </button>
                                </div>

                                {showActivityForm && (
                                    <form onSubmit={handleAddActivity} className="bg-gray-50 rounded-lg p-4 mb-4">
                                        <div className="space-y-3">
                                            <select
                                                value={activityForm.activity_type}
                                                onChange={(e) => setActivityForm({ ...activityForm, activity_type: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                required
                                            >
                                                <option value="call_outbound">Outbound Call</option>
                                                <option value="call_inbound">Inbound Call</option>
                                                <option value="email_sent">Email Sent</option>
                                                <option value="whatsapp_sent">WhatsApp Sent</option>
                                                <option value="meeting">Meeting</option>
                                            </select>
                                            <textarea
                                                value={activityForm.description}
                                                onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                                                placeholder="Description"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                rows="2"
                                                required
                                            />
                                            <input
                                                type="text"
                                                value={activityForm.outcome}
                                                onChange={(e) => setActivityForm({ ...activityForm, outcome: e.target.value })}
                                                placeholder="Outcome"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                >
                                                    Add Activity
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowActivityForm(false)}
                                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {activities.length > 0 ? (
                                        <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 py-2 ml-3">
                                            {activities.map((activity, index) => (
                                                <div key={index} className="relative">
                                                    {/* Timeline Dot */}
                                                    <div className={`absolute -left-[33px] p-1.5 rounded-full text-white shadow-sm ${getActivityColor(activity.activity_type)}`}>
                                                        {getActivityIcon(activity.activity_type)}
                                                    </div>

                                                    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                                                                {activity.activity_type_display}
                                                            </span>
                                                            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                                                                {formatRelativeTime(activity.created_at)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 leading-relaxed">{activity.description}</p>
                                                        {activity.outcome && (
                                                            <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                                <p className="text-xs font-semibold text-blue-600">Outcome: {activity.outcome}</p>
                                                            </div>
                                                        )}
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <User size={10} className="text-slate-300" />
                                                            <span className="text-[10px] text-slate-400 font-medium">By {activity.created_by_name || 'System'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                                            <MessageSquare size={32} className="mx-auto text-slate-200 mb-2" />
                                            <p className="text-sm text-slate-400 font-medium font-sans">No interactions recorded yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Follow-ups */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-900">Follow-ups</h3>
                                    <button
                                        onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add
                                    </button>
                                </div>

                                {showFollowUpForm && (
                                    <form onSubmit={handleAddFollowUp} className="bg-gray-50 rounded-lg p-4 mb-4">
                                        <div className="space-y-3">
                                            <input
                                                type="datetime-local"
                                                value={followUpForm.due_date}
                                                onChange={(e) => setFollowUpForm({ ...followUpForm, due_date: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                required
                                            />
                                            <textarea
                                                value={followUpForm.task}
                                                onChange={(e) => setFollowUpForm({ ...followUpForm, task: e.target.value })}
                                                placeholder="Task description"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                rows="2"
                                                required
                                            />
                                            <select
                                                value={followUpForm.priority}
                                                onChange={(e) => setFollowUpForm({ ...followUpForm, priority: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            >
                                                <option value="low">Low Priority</option>
                                                <option value="medium">Medium Priority</option>
                                                <option value="high">High Priority</option>
                                                <option value="urgent">Urgent</option>
                                            </select>
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                >
                                                    Add Follow-up
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowFollowUpForm(false)}
                                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {followUps.length > 0 ? (
                                        followUps.map((followUp, index) => (
                                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                                                <div className="flex items-start justify-between mb-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(followUp.priority)}`}>
                                                        {followUp.priority_display}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(followUp.due_date).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-900 mt-2">{followUp.task}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 text-center py-4">No follow-ups scheduled</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadDetailModal;
