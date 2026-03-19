import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { Card, Button, Alert, Modal, Input, Select, Textarea } from '@/components/ui';
import {
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    TrendingUp,
    Users,
    FileText,
    DollarSign,
    ArrowRight,
    Eye,
    ThumbsUp,
    ThumbsDown,
    History,
    Settings,
    Plus,
    Filter
} from 'lucide-react';

const ApprovalsTab = () => {
    const [activeView, setActiveView] = useState('pending'); // pending, history, workflows, statistics
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [approvalHistory, setApprovalHistory] = useState([]);
    const [workflows, setWorkflows] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedApproval, setSelectedApproval] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);
    const [actionComments, setActionComments] = useState('');

    useEffect(() => {
        if (activeView === 'pending') {
            fetchPendingApprovals();
        } else if (activeView === 'history') {
            fetchApprovalHistory();
        } else if (activeView === 'workflows') {
            fetchWorkflows();
        } else if (activeView === 'statistics') {
            fetchStatistics();
        }
    }, [activeView]);

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            const response = await api.get('/accounting/approval-requests/my_pending_approvals/');
            setPendingApprovals(response.data.results || response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch pending approvals');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchApprovalHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get('/accounting/approval-requests/', {
                params: { status: 'approved,rejected' }
            });
            setApprovalHistory(response.data.results || response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch approval history');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkflows = async () => {
        setLoading(true);
        try {
            const response = await api.get('/accounting/approval-workflows/');
            setWorkflows(response.data.results || response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch workflows');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatistics = async () => {
        setLoading(true);
        try {
            const response = await api.get('/accounting/approval-requests/statistics/');
            setStatistics(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch statistics');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedApproval) return;

        try {
            await api.post(`/accounting/approval-requests/${selectedApproval.id}/approve/`, {
                action: 'approved',
                comments: actionComments
            });
            setSuccess('Approval request approved successfully');
            setShowApproveModal(false);
            setActionComments('');
            setSelectedApproval(null);
            fetchPendingApprovals();
        } catch (err) {
            setError('Failed to approve request');
            console.error(err);
        }
    };

    const handleReject = async () => {
        if (!selectedApproval) return;

        if (!actionComments.trim()) {
            setError('Please provide a reason for rejection');
            return;
        }

        try {
            await api.post(`/accounting/approval-requests/${selectedApproval.id}/reject/`, {
                action: 'rejected',
                comments: actionComments
            });
            setSuccess('Approval request rejected');
            setShowRejectModal(false);
            setActionComments('');
            setSelectedApproval(null);
            fetchPendingApprovals();
        } catch (err) {
            setError('Failed to reject request');
            console.error(err);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
            approved: 'text-green-600 bg-green-50 border-green-200',
            rejected: 'text-red-600 bg-red-50 border-red-200',
            cancelled: 'text-gray-600 bg-gray-50 border-gray-200'
        };
        return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const getStatusIcon = (status) => {
        const icons = {
            pending: Clock,
            approved: CheckCircle,
            rejected: XCircle,
            cancelled: AlertCircle
        };
        const Icon = icons[status] || Clock;
        return <Icon size={16} />;
    };

    const getModelTypeLabel = (modelType) => {
        const labels = {
            expense: 'Expense',
            transfer: 'Transfer',
            budget: 'Budget',
            payroll: 'Payroll'
        };
        return labels[modelType] || modelType;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Approval Workflows</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage approval requests and workflows</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowWorkflowModal(true)}
                        variant="secondary"
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} />
                        New Workflow
                    </Button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <Alert variant="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* View Toggle */}
            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                {[
                    { id: 'pending', label: 'Pending Approvals', icon: Clock },
                    { id: 'history', label: 'History', icon: History },
                    { id: 'workflows', label: 'Workflows', icon: Settings },
                    { id: 'statistics', label: 'Statistics', icon: TrendingUp }
                ].map(view => (
                    <button
                        key={view.id}
                        onClick={() => setActiveView(view.id)}
                        className={`flex items-center gap-2 px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeView === view.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <view.icon size={16} />
                        {view.label}
                    </button>
                ))}
            </div>

            {/* Pending Approvals View */}
            {activeView === 'pending' && (
                <div className="space-y-4">
                    {loading ? (
                        <Card className="p-8 text-center text-gray-500">
                            Loading pending approvals...
                        </Card>
                    ) : pendingApprovals.length === 0 ? (
                        <Card className="p-8 text-center">
                            <Clock size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600 font-medium">No pending approvals</p>
                            <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
                        </Card>
                    ) : (
                        pendingApprovals.map(approval => (
                            <Card key={approval.id} className="p-6 hover:shadow-lg transition-shadow">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <FileText size={20} className="text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {getModelTypeLabel(approval.model_type)} Approval
                                                    </h3>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(approval.status)}`}>
                                                        {getStatusIcon(approval.status)}
                                                        {approval.status_display}
                                                    </span>
                                                </div>

                                                <p className="text-gray-700 mb-3">{approval.description}</p>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-500">Amount</p>
                                                        <p className="font-semibold text-gray-900">
                                                            {formatCurrency(approval.amount)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500">Requested By</p>
                                                        <p className="font-medium text-gray-900">
                                                            {approval.requested_by_details?.name || 'Unknown'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500">Level</p>
                                                        <p className="font-medium text-gray-900">
                                                            {approval.current_level} of {approval.required_levels}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500">Date</p>
                                                        <p className="font-medium text-gray-900">
                                                            {new Date(approval.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Approval Progress */}
                                                <div className="mt-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="text-sm text-gray-600">Approval Progress</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {Array.from({ length: approval.required_levels }).map((_, index) => (
                                                            <div key={index} className="flex items-center">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${index < approval.current_level
                                                                        ? 'bg-green-500 text-white'
                                                                        : index === approval.current_level
                                                                            ? 'bg-blue-500 text-white'
                                                                            : 'bg-gray-200 text-gray-500'
                                                                    }`}>
                                                                    {index + 1}
                                                                </div>
                                                                {index < approval.required_levels - 1 && (
                                                                    <ArrowRight size={16} className="mx-1 text-gray-400" />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex md:flex-col gap-2">
                                        <Button
                                            onClick={() => {
                                                setSelectedApproval(approval);
                                                setShowApproveModal(true);
                                            }}
                                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                                        >
                                            <ThumbsUp size={16} />
                                            Approve
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setSelectedApproval(approval);
                                                setShowRejectModal(true);
                                            }}
                                            variant="secondary"
                                            className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                                        >
                                            <ThumbsDown size={16} />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* History View */}
            {activeView === 'history' && (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : approvalHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                            No approval history found
                                        </td>
                                    </tr>
                                ) : (
                                    approvalHistory.map(approval => (
                                        <tr key={approval.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {getModelTypeLabel(approval.model_type)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {approval.description}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {formatCurrency(approval.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {approval.requested_by_details?.name || 'Unknown'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(approval.status)}`}>
                                                    {getStatusIcon(approval.status)}
                                                    {approval.status_display}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {new Date(approval.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Workflows View */}
            {activeView === 'workflows' && (
                <div className="space-y-4">
                    {loading ? (
                        <Card className="p-8 text-center text-gray-500">
                            Loading workflows...
                        </Card>
                    ) : workflows.length === 0 ? (
                        <Card className="p-8 text-center">
                            <Settings size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600 font-medium">No workflows configured</p>
                            <p className="text-sm text-gray-500 mt-1">Create your first workflow to get started</p>
                            <Button onClick={() => setShowWorkflowModal(true)} className="mt-4">
                                <Plus size={16} className="mr-2" />
                                Create Workflow
                            </Button>
                        </Card>
                    ) : (
                        workflows.map(workflow => (
                            <Card key={workflow.id} className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${workflow.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {workflow.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                                            <div>
                                                <p className="text-gray-500">Type</p>
                                                <p className="font-medium text-gray-900">
                                                    {getModelTypeLabel(workflow.model_type)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Threshold</p>
                                                <p className="font-medium text-gray-900">
                                                    {formatCurrency(workflow.threshold_amount)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Levels</p>
                                                <p className="font-medium text-gray-900">
                                                    {workflow.levels}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Auto-Approve Below</p>
                                                <p className="font-medium text-gray-900">
                                                    {workflow.auto_approve_below ? formatCurrency(workflow.auto_approve_below) : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* Statistics View */}
            {activeView === 'statistics' && statistics && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Clock size={20} className="text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Pending</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {statistics.pending_count || 0}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <CheckCircle size={20} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Approved</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {statistics.approved_count || 0}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <XCircle size={20} className="text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Rejected</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {statistics.rejected_count || 0}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <DollarSign size={20} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Total Amount</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {formatCurrency(statistics.total_amount || 0)}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Approval Rate */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Approval Rate</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Approved</span>
                                    <span className="font-medium text-green-600">
                                        {statistics.approval_rate?.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{ width: `${statistics.approval_rate || 0}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Rejected</span>
                                    <span className="font-medium text-red-600">
                                        {statistics.rejection_rate?.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-red-500 h-2 rounded-full"
                                        style={{ width: `${statistics.rejection_rate || 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Approve Modal */}
            <Modal
                isOpen={showApproveModal}
                onClose={() => {
                    setShowApproveModal(false);
                    setActionComments('');
                    setSelectedApproval(null);
                }}
                title="Approve Request"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                            You are about to approve this request. This action cannot be undone.
                        </p>
                    </div>

                    {selectedApproval && (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Type:</span> {getModelTypeLabel(selectedApproval.model_type)}
                            </p>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Amount:</span> {formatCurrency(selectedApproval.amount)}
                            </p>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Description:</span> {selectedApproval.description}
                            </p>
                        </div>
                    )}

                    <Textarea
                        label="Comments (Optional)"
                        value={actionComments}
                        onChange={(e) => setActionComments(e.target.value)}
                        placeholder="Add any comments about this approval..."
                        rows={3}
                    />

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowApproveModal(false);
                                setActionComments('');
                                setSelectedApproval(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApprove}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <ThumbsUp size={16} className="mr-2" />
                            Approve
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={showRejectModal}
                onClose={() => {
                    setShowRejectModal(false);
                    setActionComments('');
                    setSelectedApproval(null);
                }}
                title="Reject Request"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                            You are about to reject this request. Please provide a reason.
                        </p>
                    </div>

                    {selectedApproval && (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Type:</span> {getModelTypeLabel(selectedApproval.model_type)}
                            </p>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Amount:</span> {formatCurrency(selectedApproval.amount)}
                            </p>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Description:</span> {selectedApproval.description}
                            </p>
                        </div>
                    )}

                    <Textarea
                        label="Reason for Rejection *"
                        value={actionComments}
                        onChange={(e) => setActionComments(e.target.value)}
                        placeholder="Please explain why you are rejecting this request..."
                        rows={3}
                        required
                    />

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowRejectModal(false);
                                setActionComments('');
                                setSelectedApproval(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReject}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <ThumbsDown size={16} className="mr-2" />
                            Reject
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ApprovalsTab;
