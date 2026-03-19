import React, { useState, useEffect } from 'react';
import {
    CheckCircle, XCircle, Clock, Filter, Search, RefreshCw,
    Calendar, Activity, AlertCircle, Eye, Download
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const WorkflowExecutions = () => {
    const [executions, setExecutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExecution, setSelectedExecution] = useState(null);

    useEffect(() => {
        fetchExecutions();
    }, []);

    const fetchExecutions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const response = await axios.get(`${API_BASE_URL}/automation/workflow-executions/`, config);
            setExecutions(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching executions:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            success: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            running: 'bg-blue-100 text-blue-800',
            pending: 'bg-yellow-100 text-yellow-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status) => {
        const icons = {
            success: CheckCircle,
            failed: XCircle,
            running: Activity,
            pending: Clock
        };
        return icons[status] || AlertCircle;
    };

    const filteredExecutions = executions.filter(execution => {
        const matchesFilter = filter === 'all' || execution.status === filter;
        const matchesSearch = execution.workflow_name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const ExecutionCard = ({ execution }) => {
        const StatusIcon = getStatusIcon(execution.status);

        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${getStatusColor(execution.status)}`}>
                            <StatusIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {execution.workflow_name || `Workflow #${execution.workflow}`}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(execution.started_at).toLocaleString()}
                                </div>
                                {execution.completed_at && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        Duration: {Math.round((new Date(execution.completed_at) - new Date(execution.started_at)) / 1000)}s
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                            {execution.status}
                        </span>
                        <button
                            onClick={() => setSelectedExecution(execution)}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {execution.error_message && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{execution.error_message}</p>
                    </div>
                )}

                {execution.result && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 mb-1">Result:</p>
                        <p className="text-sm text-gray-600">{JSON.stringify(execution.result, null, 2)}</p>
                    </div>
                )}
            </div>
        );
    };

    const ExecutionModal = ({ execution, onClose }) => {
        if (!execution) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">Execution Details</h2>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Status */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(execution.status)}`}>
                                {execution.status}
                            </span>
                        </div>

                        {/* Workflow */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Workflow</h3>
                            <p className="text-gray-900">{execution.workflow_name || `Workflow #${execution.workflow}`}</p>
                        </div>

                        {/* Timing */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Started At</h3>
                                <p className="text-gray-900">{new Date(execution.started_at).toLocaleString()}</p>
                            </div>
                            {execution.completed_at && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Completed At</h3>
                                    <p className="text-gray-900">{new Date(execution.completed_at).toLocaleString()}</p>
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {execution.error_message && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Error Message</h3>
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-800">{execution.error_message}</p>
                                </div>
                            </div>
                        )}

                        {/* Result */}
                        {execution.result && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Result</h3>
                                <pre className="p-4 bg-gray-50 rounded-lg overflow-x-auto text-sm">
                                    {JSON.stringify(execution.result, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* Context */}
                        {execution.context && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Context</h3>
                                <pre className="p-4 bg-gray-50 rounded-lg overflow-x-auto text-sm">
                                    {JSON.stringify(execution.context, null, 2)}
                                </pre>
                            </div>
                        )}
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

    const successCount = executions.filter(e => e.status === 'success').length;
    const failedCount = executions.filter(e => e.status === 'failed').length;
    const runningCount = executions.filter(e => e.status === 'running').length;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflow Executions</h1>
                        <p className="text-gray-600">Monitor and review workflow execution history</p>
                    </div>
                    <button
                        onClick={fetchExecutions}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Total Executions</p>
                                <p className="text-2xl font-bold text-gray-900">{executions.length}</p>
                            </div>
                            <Activity className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Successful</p>
                                <p className="text-2xl font-bold text-green-600">{successCount}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Failed</p>
                                <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                            </div>
                            <XCircle className="w-8 h-8 text-red-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Running</p>
                                <p className="text-2xl font-bold text-blue-600">{runningCount}</p>
                            </div>
                            <Clock className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
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
                                placeholder="Search executions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {['all', 'success', 'failed', 'running'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg capitalize ${filter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Executions List */}
            <div>
                {filteredExecutions.length > 0 ? (
                    <div className="space-y-4">
                        {filteredExecutions.map((execution) => (
                            <ExecutionCard key={execution.id} execution={execution} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No executions found</h3>
                        <p className="text-gray-600">
                            {searchTerm || filter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Workflow executions will appear here'}
                        </p>
                    </div>
                )}
            </div>

            {/* Execution Detail Modal */}
            {selectedExecution && (
                <ExecutionModal
                    execution={selectedExecution}
                    onClose={() => setSelectedExecution(null)}
                />
            )}
        </div>
    );
};

export default WorkflowExecutions;
