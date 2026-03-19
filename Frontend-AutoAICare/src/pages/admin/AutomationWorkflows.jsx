import React, { useState, useEffect } from 'react';
import {
    Plus, Play, Pause, Trash2, Edit, Copy, Save, Settings,
    Zap, Clock, Filter, Search, RefreshCw, Download, Upload,
    CheckCircle, XCircle, AlertCircle, Activity, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const AutomationWorkflows = () => {
    const navigate = useNavigate();
    const [workflows, setWorkflows] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchWorkflows();
        fetchTemplates();
    }, []);

    const fetchWorkflows = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const response = await axios.get(`${API_BASE_URL}/automation/workflows/`, config);
            setWorkflows(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching workflows:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const response = await axios.get(`${API_BASE_URL}/automation/workflow-templates/`, config);
            setTemplates(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const handleToggleWorkflow = async (workflowId, currentStatus) => {
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.patch(
                `${API_BASE_URL}/automation/workflows/${workflowId}/`,
                { is_active: !currentStatus },
                config
            );

            fetchWorkflows();
        } catch (error) {
            console.error('Error toggling workflow:', error);
            alert('Failed to toggle workflow');
        }
    };

    const handleDeleteWorkflow = async (workflowId) => {
        if (!window.confirm('Are you sure you want to delete this workflow?')) {
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.delete(`${API_BASE_URL}/automation/workflows/${workflowId}/`, config);
            fetchWorkflows();
        } catch (error) {
            console.error('Error deleting workflow:', error);
            alert('Failed to delete workflow');
        }
    };

    const handleDuplicateWorkflow = async (workflow) => {
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const newWorkflow = {
                ...workflow,
                name: `${workflow.name} (Copy)`,
                is_active: false
            };
            delete newWorkflow.id;
            delete newWorkflow.created_at;
            delete newWorkflow.updated_at;

            await axios.post(`${API_BASE_URL}/automation/workflows/`, newWorkflow, config);
            fetchWorkflows();
        } catch (error) {
            console.error('Error duplicating workflow:', error);
            alert('Failed to duplicate workflow');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-gray-100 text-gray-800',
            error: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getTriggerIcon = (triggerType) => {
        const icons = {
            lead_created: Clock,
            lead_status_changed: Activity,
            booking_created: CheckCircle,
            booking_completed: CheckCircle,
            customer_inactive: AlertCircle,
            scheduled: Clock
        };
        return icons[triggerType] || Zap;
    };

    const filteredWorkflows = workflows.filter(workflow => {
        const matchesFilter = filter === 'all' ||
            (filter === 'active' && workflow.is_active) ||
            (filter === 'inactive' && !workflow.is_active);

        const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            workflow.description?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    const StatCard = ({ icon: Icon, label, value, color }) => (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );

    const WorkflowCard = ({ workflow }) => {
        const TriggerIcon = getTriggerIcon(workflow.trigger_type);

        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${workflow.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <TriggerIcon className={`w-5 h-5 ${workflow.is_active ? 'text-green-600' : 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{workflow.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">{workflow.description}</p>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${workflow.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {workflow.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                    {workflow.trigger_type_display || workflow.trigger_type}
                                </span>
                                {workflow.execution_count > 0 && (
                                    <span className="text-xs text-gray-500">
                                        {workflow.execution_count} executions
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleToggleWorkflow(workflow.id, workflow.is_active)}
                            className={`p-2 rounded-lg ${workflow.is_active
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                            title={workflow.is_active ? 'Pause' : 'Activate'}
                        >
                            {workflow.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => navigate(`/admin/automation/workflows/${workflow.id}`)}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                            title="Edit"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDuplicateWorkflow(workflow)}
                            className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                            title="Duplicate"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Actions Preview */}
                {workflow.actions && workflow.actions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">Actions ({workflow.actions.length}):</p>
                        <div className="flex flex-wrap gap-2">
                            {workflow.actions.slice(0, 3).map((action, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                    {action.action_type_display || action.action_type}
                                </span>
                            ))}
                            {workflow.actions.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                    +{workflow.actions.length - 3} more
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const TemplateCard = ({ template }) => (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.name}</h3>
                        <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-600">
                    {template.category_display || template.category}
                </span>
                <button
                    onClick={() => navigate(`/admin/automation/workflows/new?template=${template.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    Use Template
                </button>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const activeWorkflows = workflows.filter(w => w.is_active).length;
    const totalExecutions = workflows.reduce((sum, w) => sum + (w.execution_count || 0), 0);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Automation Workflows</h1>
                        <p className="text-gray-600">Create and manage automated workflows for your business</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchWorkflows}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            onClick={() => navigate('/admin/automation/workflows/new')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Workflow
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        icon={Zap}
                        label="Total Workflows"
                        value={workflows.length}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={CheckCircle}
                        label="Active Workflows"
                        value={activeWorkflows}
                        color="bg-green-500"
                    />
                    <StatCard
                        icon={Activity}
                        label="Total Executions"
                        value={totalExecutions}
                        color="bg-purple-500"
                    />
                    <StatCard
                        icon={BarChart3}
                        label="Templates Available"
                        value={templates.length}
                        color="bg-orange-500"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search workflows..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg ${filter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('active')}
                            className={`px-4 py-2 rounded-lg ${filter === 'active'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setFilter('inactive')}
                            className={`px-4 py-2 rounded-lg ${filter === 'inactive'
                                ? 'bg-gray-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>
            </div>

            {/* Templates Section */}
            {templates.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Start Templates</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {templates.slice(0, 3).map((template) => (
                            <TemplateCard key={template.id} template={template} />
                        ))}
                    </div>
                    {templates.length > 3 && (
                        <button
                            onClick={() => navigate('/admin/automation/templates')}
                            className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                        >
                            View all {templates.length} templates →
                        </button>
                    )}
                </div>
            )}

            {/* Workflows List */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Your Workflows ({filteredWorkflows.length})
                </h2>
                {filteredWorkflows.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredWorkflows.map((workflow) => (
                            <WorkflowCard key={workflow.id} workflow={workflow} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No workflows found</h3>
                        <p className="text-gray-600 mb-6">
                            {searchTerm || filter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Get started by creating your first automation workflow'}
                        </p>
                        {!searchTerm && filter === 'all' && (
                            <button
                                onClick={() => navigate('/admin/automation/workflows/new')}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Create Your First Workflow
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutomationWorkflows;
