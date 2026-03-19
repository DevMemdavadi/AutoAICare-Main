import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Save, Play, Plus, Trash2, Settings, Zap,
    Mail, MessageSquare, Bell, Clock, Filter, CheckCircle,
    AlertCircle, Users, Target, Calendar, Edit
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const WorkflowBuilder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [workflow, setWorkflow] = useState({
        name: '',
        description: '',
        trigger_type: 'lead_created',
        trigger_conditions: {},
        actions: [],
        is_active: false
    });

    useEffect(() => {
        if (id && id !== 'new') {
            fetchWorkflow();
        }
    }, [id]);

    const fetchWorkflow = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const response = await axios.get(`${API_BASE_URL}/automation/workflows/${id}/`, config);
            setWorkflow(response.data);
        } catch (error) {
            console.error('Error fetching workflow:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!workflow.name) {
            alert('Please enter a workflow name');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            if (id && id !== 'new') {
                await axios.put(`${API_BASE_URL}/automation/workflows/${id}/`, workflow, config);
            } else {
                await axios.post(`${API_BASE_URL}/automation/workflows/`, workflow, config);
            }

            alert('Workflow saved successfully!');
            navigate('/admin/automation/workflows');
        } catch (error) {
            console.error('Error saving workflow:', error);
            alert('Failed to save workflow');
        } finally {
            setSaving(false);
        }
    };

    const handleAddAction = () => {
        setWorkflow({
            ...workflow,
            actions: [
                ...workflow.actions,
                {
                    action_type: 'send_email',
                    config: {},
                    order: workflow.actions.length
                }
            ]
        });
    };

    const handleUpdateAction = (index, field, value) => {
        const updatedActions = [...workflow.actions];
        updatedActions[index] = {
            ...updatedActions[index],
            [field]: value
        };
        setWorkflow({ ...workflow, actions: updatedActions });
    };

    const handleRemoveAction = (index) => {
        const updatedActions = workflow.actions.filter((_, i) => i !== index);
        setWorkflow({ ...workflow, actions: updatedActions });
    };

    const triggerTypes = [
        { value: 'lead_created', label: 'Lead Created', icon: Target, description: 'When a new lead is added' },
        { value: 'lead_status_changed', label: 'Lead Status Changed', icon: CheckCircle, description: 'When lead status changes' },
        { value: 'booking_created', label: 'Booking Created', icon: Calendar, description: 'When a new booking is made' },
        { value: 'booking_completed', label: 'Booking Completed', icon: CheckCircle, description: 'When a booking is completed' },
        { value: 'customer_inactive', label: 'Customer Inactive', icon: AlertCircle, description: 'When customer becomes inactive' },
        { value: 'scheduled', label: 'Scheduled', icon: Clock, description: 'Run on a schedule' }
    ];

    const actionTypes = [
        { value: 'send_email', label: 'Send Email', icon: Mail, color: 'bg-blue-100 text-blue-700' },
        { value: 'send_sms', label: 'Send SMS', icon: MessageSquare, color: 'bg-green-100 text-green-700' },
        { value: 'send_whatsapp', label: 'Send WhatsApp', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-700' },
        { value: 'send_notification', label: 'Send Notification', icon: Bell, color: 'bg-purple-100 text-purple-700' },
        { value: 'update_lead_status', label: 'Update Lead Status', icon: Target, color: 'bg-orange-100 text-orange-700' },
        { value: 'assign_to_user', label: 'Assign to User', icon: Users, color: 'bg-pink-100 text-pink-700' },
        { value: 'create_task', label: 'Create Task', icon: CheckCircle, color: 'bg-yellow-100 text-yellow-700' }
    ];

    const TriggerSelector = () => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Trigger</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">When should this workflow run?</p>

            <div className="grid grid-cols-2 gap-3">
                {triggerTypes.map((trigger) => {
                    const Icon = trigger.icon;
                    const isSelected = workflow.trigger_type === trigger.value;

                    return (
                        <button
                            key={trigger.value}
                            onClick={() => setWorkflow({ ...workflow, trigger_type: trigger.value })}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600' : 'bg-gray-100'}`}>
                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                                </div>
                                <div className="flex-1">
                                    <p className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                        {trigger.label}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">{trigger.description}</p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Trigger Conditions */}
            {workflow.trigger_type === 'lead_status_changed' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        When status changes to:
                    </label>
                    <select
                        value={workflow.trigger_conditions.new_status || ''}
                        onChange={(e) => setWorkflow({
                            ...workflow,
                            trigger_conditions: { ...workflow.trigger_conditions, new_status: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Any status</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                    </select>
                </div>
            )}

            {workflow.trigger_type === 'scheduled' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Schedule:
                    </label>
                    <select
                        value={workflow.trigger_conditions.schedule || 'daily'}
                        onChange={(e) => setWorkflow({
                            ...workflow,
                            trigger_conditions: { ...workflow.trigger_conditions, schedule: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
            )}
        </div>
    );

    const ActionCard = ({ action, index }) => {
        const actionType = actionTypes.find(t => t.value === action.action_type);
        const Icon = actionType?.icon || Zap;

        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${actionType?.color || 'bg-gray-100'}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Action {index + 1}</p>
                            <p className="text-sm text-gray-600">{actionType?.label}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleRemoveAction(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Action Type
                        </label>
                        <select
                            value={action.action_type}
                            onChange={(e) => handleUpdateAction(index, 'action_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {actionTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Email Configuration */}
                    {action.action_type === 'send_email' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Template
                                </label>
                                <select
                                    value={action.config?.template_id || ''}
                                    onChange={(e) => handleUpdateAction(index, 'config', {
                                        ...action.config,
                                        template_id: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select template</option>
                                    <option value="welcome">Welcome Email</option>
                                    <option value="follow_up">Follow-up Email</option>
                                    <option value="reminder">Reminder Email</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    value={action.config?.subject || ''}
                                    onChange={(e) => handleUpdateAction(index, 'config', {
                                        ...action.config,
                                        subject: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Email subject"
                                />
                            </div>
                        </>
                    )}

                    {/* SMS/WhatsApp Configuration */}
                    {(action.action_type === 'send_sms' || action.action_type === 'send_whatsapp') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Message
                            </label>
                            <textarea
                                value={action.config?.message || ''}
                                onChange={(e) => handleUpdateAction(index, 'config', {
                                    ...action.config,
                                    message: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows="3"
                                placeholder="Enter message..."
                            />
                        </div>
                    )}

                    {/* Lead Status Update */}
                    {action.action_type === 'update_lead_status' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Status
                            </label>
                            <select
                                value={action.config?.new_status || ''}
                                onChange={(e) => handleUpdateAction(index, 'config', {
                                    ...action.config,
                                    new_status: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select status</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="proposal_sent">Proposal Sent</option>
                                <option value="won">Won</option>
                            </select>
                        </div>
                    )}

                    {/* Delay Configuration */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Delay (optional)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={action.config?.delay_value || ''}
                                onChange={(e) => handleUpdateAction(index, 'config', {
                                    ...action.config,
                                    delay_value: e.target.value
                                })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                                min="0"
                            />
                            <select
                                value={action.config?.delay_unit || 'minutes'}
                                onChange={(e) => handleUpdateAction(index, 'config', {
                                    ...action.config,
                                    delay_unit: e.target.value
                                })}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="minutes">Minutes</option>
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                            </select>
                        </div>
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
                <button
                    onClick={() => navigate('/admin/automation/workflows')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Workflows
                </button>

                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={workflow.name}
                            onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
                            className="text-3xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                            placeholder="Workflow Name"
                        />
                        <input
                            type="text"
                            value={workflow.description}
                            onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
                            className="text-gray-600 bg-transparent border-none focus:outline-none focus:ring-0 w-full mt-2"
                            placeholder="Add a description..."
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={workflow.is_active}
                                onChange={(e) => setWorkflow({ ...workflow, is_active: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Active</span>
                        </label>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Workflow'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Workflow Builder */}
            <div className="grid grid-cols-3 gap-6">
                {/* Left Column - Trigger */}
                <div className="col-span-1">
                    <TriggerSelector />
                </div>

                {/* Right Column - Actions */}
                <div className="col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
                        <button
                            onClick={handleAddAction}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Action
                        </button>
                    </div>

                    {workflow.actions.length > 0 ? (
                        <div className="space-y-4">
                            {workflow.actions.map((action, index) => (
                                <ActionCard key={index} action={action} index={index} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                            <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No actions yet</h3>
                            <p className="text-gray-600 mb-6">Add actions to define what happens when this workflow triggers</p>
                            <button
                                onClick={handleAddAction}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Add Your First Action
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkflowBuilder;
