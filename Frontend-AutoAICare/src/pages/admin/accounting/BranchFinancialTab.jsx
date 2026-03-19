import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { Alert, Card, Button, Input, Select, Modal, Textarea } from '@/components/ui';
import {
    Building2,
    Plus,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ArrowRightLeft,
    Eye,
    Edit,
    Trash2,
    BarChart3,
    PieChart as PieChartIcon
} from 'lucide-react';
import { Pie, Bar } from 'react-chartjs-2';
import { StatCardSkeleton, TableSkeleton, ChartSkeleton } from './SkeletonLoaders';

const BranchFinancialTab = () => {
    const { user } = useAuth();
    const { currentBranch, branches } = useBranch();

    const [activeView, setActiveView] = useState('budgets'); // budgets, transfers, consolidated
    const [budgets, setBudgets] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [consolidatedData, setConsolidatedData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Modals
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showUtilizationModal, setShowUtilizationModal] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState(null);
    const [utilizationDetails, setUtilizationDetails] = useState(null);

    // Form states
    const [budgetForm, setBudgetForm] = useState({
        branch: '',
        period_type: 'monthly',
        start_date: '',
        end_date: '',
        total_budget: '',
        inventory_budget: '',
        salary_budget: '',
        utilities_budget: '',
        rent_budget: '',
        maintenance_budget: '',
        marketing_budget: '',
        other_budget: '',
        notes: '',
        is_active: true
    });

    const [transferForm, setTransferForm] = useState({
        from_branch: '',
        to_branch: '',
        transfer_type: 'fund',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    });

    // Alert state
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

    useEffect(() => {
        if (activeView === 'budgets') {
            fetchBudgets();
        } else if (activeView === 'transfers') {
            fetchTransfers();
        } else if (activeView === 'consolidated') {
            fetchConsolidatedView();
        }
    }, [activeView]);

    const fetchBudgets = async () => {
        try {
            setLoading(true);
            const response = await api.get('/accounting/branch-budgets/');
            const data = response.data.results || response.data;
            setBudgets(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching budgets:', error);
            setBudgets([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransfers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/accounting/inter-branch-transfers/');
            const data = response.data.results || response.data;
            setTransfers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching transfers:', error);
            setTransfers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchConsolidatedView = async () => {
        try {
            setLoading(true);
            const response = await api.get('/accounting/branch-budgets/consolidated_view/');
            setConsolidatedData(response.data);
        } catch (error) {
            console.error('Error fetching consolidated view:', error);
            setConsolidatedData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBudget = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...budgetForm,
                branch: budgetForm.branch || currentBranch?.id
            };

            if (selectedBudget) {
                await api.put(`/accounting/branch-budgets/${selectedBudget.id}/`, payload);
            } else {
                await api.post('/accounting/branch-budgets/', payload);
            }

            setShowBudgetModal(false);
            resetBudgetForm();
            fetchBudgets();
        } catch (error) {
            console.error('Error saving budget:', error);
            showAlert('error', 'Failed to save budget: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleCreateTransfer = async (e) => {
        e.preventDefault();
        try {
            await api.post('/accounting/inter-branch-transfers/', transferForm);
            setShowTransferModal(false);
            resetTransferForm();
            fetchTransfers();
            showAlert('success', 'Transfer request created successfully!');
        } catch (error) {
            console.error('Error creating transfer:', error);
            showAlert('error', 'Failed to create transfer: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleApproveTransfer = async (id) => {
        if (!confirm('Approve this transfer?')) return;

        try {
            await api.post(`/accounting/inter-branch-transfers/${id}/approve/`);
            fetchTransfers();
            showAlert('success', 'Transfer approved successfully!');
        } catch (error) {
            console.error('Error approving transfer:', error);
            showAlert('error', 'Failed to approve: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleRejectTransfer = async (id) => {
        if (!confirm('Reject this transfer?')) return;

        try {
            await api.post(`/accounting/inter-branch-transfers/${id}/reject/`);
            fetchTransfers();
            showAlert('success', 'Transfer rejected!');
        } catch (error) {
            console.error('Error rejecting transfer:', error);
            showAlert('error', 'Failed to reject: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleViewUtilization = async (budget) => {
        try {
            const response = await api.get(`/accounting/branch-budgets/${budget.id}/utilization_details/`);
            setUtilizationDetails(response.data);
            setShowUtilizationModal(true);
        } catch (error) {
            console.error('Error fetching utilization details:', error);
            showAlert('error', 'Failed to load details: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEditBudget = (budget) => {
        setSelectedBudget(budget);
        setBudgetForm({
            branch: budget.branch,
            period_type: budget.period_type,
            start_date: budget.start_date,
            end_date: budget.end_date,
            total_budget: budget.total_budget,
            inventory_budget: budget.inventory_budget || '',
            salary_budget: budget.salary_budget || '',
            utilities_budget: budget.utilities_budget || '',
            rent_budget: budget.rent_budget || '',
            maintenance_budget: budget.maintenance_budget || '',
            marketing_budget: budget.marketing_budget || '',
            other_budget: budget.other_budget || '',
            notes: budget.notes || '',
            is_active: budget.is_active
        });
        setShowBudgetModal(true);
    };

    const handleDeleteBudget = async (id) => {
        if (!confirm('Delete this budget?')) return;

        try {
            await api.delete(`/accounting/branch-budgets/${id}/`);
            fetchBudgets();
        } catch (error) {
            console.error('Error deleting budget:', error);
            showAlert('error', 'Failed to delete: ' + (error.response?.data?.detail || error.message));
        }
    };

    const resetBudgetForm = () => {
        setSelectedBudget(null);
        setBudgetForm({
            branch: '',
            period_type: 'monthly',
            start_date: '',
            end_date: '',
            total_budget: '',
            inventory_budget: '',
            salary_budget: '',
            utilities_budget: '',
            rent_budget: '',
            maintenance_budget: '',
            marketing_budget: '',
            other_budget: '',
            notes: '',
            is_active: true
        });
    };

    const resetTransferForm = () => {
        setTransferForm({
            from_branch: '',
            to_branch: '',
            transfer_type: 'fund',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            description: ''
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getUtilizationColor = (percentage) => {
        if (percentage >= 100) return 'text-red-600 bg-red-100';
        if (percentage >= 80) return 'text-orange-600 bg-orange-100';
        if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-green-600 bg-green-100';
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: 'Pending' },
            approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
            rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' }
        };
        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                <Icon size={12} className="mr-1" />
                {badge.label}
            </span>
        );
    };

    // Render Budget View
    const renderBudgetView = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Branch Budgets</h3>
                <Button onClick={() => { resetBudgetForm(); setShowBudgetModal(true); }} className="flex items-center gap-2">
                    <Plus size={16} />
                    Create Budget
                </Button>
            </div>

            {/* Budgets Table */}
            <Card>
                {loading ? (
                    <TableSkeleton rows={6} />
                ) : budgets.length === 0 ? (
                    <div className="text-center py-12">
                        <Building2 className="mx-auto text-gray-400" size={48} />
                        <p className="mt-4 text-gray-600">No budgets found</p>
                        <Button onClick={() => { resetBudgetForm(); setShowBudgetModal(true); }} className="mt-4">
                            Create First Budget
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Budget</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Spent</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Utilization</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {budgets.map((budget) => (
                                    <tr key={budget.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{budget.branch_name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            <div>{budget.period_type_display}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(budget.start_date).toLocaleDateString()} - {new Date(budget.end_date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                            {formatCurrency(budget.total_budget)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-red-600">
                                            {formatCurrency(budget.spent_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-green-600">
                                            {formatCurrency(budget.remaining_budget)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUtilizationColor(budget.utilization_percentage)}`}>
                                                {budget.utilization_percentage.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleViewUtilization(budget)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleEditBudget(budget)}
                                                    className="text-green-600 hover:text-green-800"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBudget(budget.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );

    // Render Transfers View
    const renderTransfersView = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Inter-Branch Transfers</h3>
                <Button onClick={() => { resetTransferForm(); setShowTransferModal(true); }} className="flex items-center gap-2">
                    <Plus size={16} />
                    New Transfer
                </Button>
            </div>

            {/* Transfers Table */}
            <Card>
                {loading ? (
                    <TableSkeleton rows={6} />
                ) : transfers.length === 0 ? (
                    <div className="text-center py-12">
                        <ArrowRightLeft className="mx-auto text-gray-400" size={48} />
                        <p className="mt-4 text-gray-600">No transfers found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {transfers.map((transfer) => (
                                    <tr key={transfer.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {new Date(transfer.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{transfer.from_branch_name}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{transfer.to_branch_name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{transfer.transfer_type_display}</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                            {formatCurrency(transfer.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{transfer.description}</td>
                                        <td className="px-4 py-3 text-center">
                                            {getStatusBadge(transfer.status)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {transfer.status === 'pending' && (user?.is_superuser || user?.role === 'company_admin') && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleApproveTransfer(transfer.id)}
                                                        className="text-green-600 hover:text-green-800"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectTransfer(transfer.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Reject"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );

    // Render Consolidated View
    const renderConsolidatedView = () => {
        if (!user?.is_superuser) {
            return (
                <div className="text-center py-12">
                    <AlertTriangle className="mx-auto text-orange-500" size={48} />
                    <p className="mt-4 text-gray-600">Only superusers can access consolidated view</p>
                </div>
            );
        }

        if (loading) {
            return (
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Consolidated Multi-Branch View</h3>
                    {/* Summary Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </div>
                    {/* Chart Skeleton */}
                    <ChartSkeleton />
                    {/* Table Skeleton */}
                    <TableSkeleton rows={5} />
                </div>
            );
        }

        if (!consolidatedData) {
            return (
                <div className="text-center py-12">
                    <p className="text-gray-600">No data available</p>
                </div>
            );
        }

        const chartData = {
            labels: consolidatedData.branches.map(b => b.branch_name),
            datasets: [{
                label: 'Budget',
                data: consolidatedData.branches.map(b => b.budget),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
            }, {
                label: 'Spent',
                data: consolidatedData.branches.map(b => b.spent),
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
            }]
        };

        return (
            <div className="space-y-6">
                <h3 className="text-lg font-semibold">Consolidated Multi-Branch View</h3>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <div className="p-6">
                            <div className="text-sm font-medium opacity-90">Total Budget</div>
                            <div className="text-2xl font-bold mt-2">{formatCurrency(consolidatedData.totals.total_budget)}</div>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                        <div className="p-6">
                            <div className="text-sm font-medium opacity-90">Total Spent</div>
                            <div className="text-2xl font-bold mt-2">{formatCurrency(consolidatedData.totals.total_spent)}</div>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <div className="p-6">
                            <div className="text-sm font-medium opacity-90">Total Remaining</div>
                            <div className="text-2xl font-bold mt-2">{formatCurrency(consolidatedData.totals.total_remaining)}</div>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <div className="p-6">
                            <div className="text-sm font-medium opacity-90">Overall Utilization</div>
                            <div className="text-2xl font-bold mt-2">{consolidatedData.totals.overall_utilization.toFixed(1)}%</div>
                        </div>
                    </Card>
                </div>

                {/* Chart */}
                <Card title="Budget vs Spent by Branch">
                    <div className="h-80">
                        <Bar
                            data={chartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top' }
                                }
                            }}
                        />
                    </div>
                </Card>

                {/* Branch Details Table */}
                <Card title="Branch-wise Breakdown">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Budget</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Spent</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Utilization</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {consolidatedData.branches.map((branch) => (
                                    <tr key={branch.branch_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{branch.branch_name}</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                            {formatCurrency(branch.budget)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-red-600">
                                            {formatCurrency(branch.spent)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-green-600">
                                            {formatCurrency(branch.remaining)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUtilizationColor(branch.utilization_percentage)}`}>
                                                {branch.utilization_percentage.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Alert Component */}
            {alert.show && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert({ show: false, type: '', message: '' })}
                />
            )}

            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="text-blue-600" size={28} />
                    Branch Financial Management
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                    Manage budgets, transfers, and consolidated financial views
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'budgets', label: 'Branch Budgets', icon: DollarSign },
                        { id: 'transfers', label: 'Inter-Branch Transfers', icon: ArrowRightLeft },
                        ...(user?.is_superuser ? [{ id: 'consolidated', label: 'Consolidated View', icon: BarChart3 }] : [])
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id)}
                            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeView === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            {activeView === 'budgets' && renderBudgetView()}
            {activeView === 'transfers' && renderTransfersView()}
            {activeView === 'consolidated' && renderConsolidatedView()}

            {/* Budget Modal */}
            <Modal
                isOpen={showBudgetModal}
                onClose={() => { setShowBudgetModal(false); resetBudgetForm(); }}
                title={selectedBudget ? 'Edit Budget' : 'Create Budget'}
            >
                <form onSubmit={handleCreateBudget} className="space-y-4">
                    {['super_admin', 'company_admin'].includes(user?.role) && (
                        <Select
                            label="Branch"
                            value={budgetForm.branch}
                            onChange={(e) => setBudgetForm({ ...budgetForm, branch: e.target.value })}
                            options={[
                                { value: '', label: 'Select Branch' },
                                ...branches.map(b => ({ value: b.id, label: b.name }))
                            ]}
                            required
                        />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Period Type"
                            value={budgetForm.period_type}
                            onChange={(e) => setBudgetForm({ ...budgetForm, period_type: e.target.value })}
                            options={[
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'quarterly', label: 'Quarterly' },
                                { value: 'yearly', label: 'Yearly' }
                            ]}
                            required
                        />

                        <Input
                            type="number"
                            label="Total Budget"
                            value={budgetForm.total_budget}
                            onChange={(e) => setBudgetForm({ ...budgetForm, total_budget: e.target.value })}
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="date"
                            label="Start Date"
                            value={budgetForm.start_date}
                            onChange={(e) => setBudgetForm({ ...budgetForm, start_date: e.target.value })}
                            required
                        />

                        <Input
                            type="date"
                            label="End Date"
                            value={budgetForm.end_date}
                            onChange={(e) => setBudgetForm({ ...budgetForm, end_date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Category-wise Budget Allocation (Optional)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="number"
                                label="Inventory"
                                value={budgetForm.inventory_budget}
                                onChange={(e) => setBudgetForm({ ...budgetForm, inventory_budget: e.target.value })}
                                min="0"
                                step="0.01"
                            />
                            <Input
                                type="number"
                                label="Salary"
                                value={budgetForm.salary_budget}
                                onChange={(e) => setBudgetForm({ ...budgetForm, salary_budget: e.target.value })}
                                min="0"
                                step="0.01"
                            />
                            <Input
                                type="number"
                                label="Utilities"
                                value={budgetForm.utilities_budget}
                                onChange={(e) => setBudgetForm({ ...budgetForm, utilities_budget: e.target.value })}
                                min="0"
                                step="0.01"
                            />
                            <Input
                                type="number"
                                label="Rent"
                                value={budgetForm.rent_budget}
                                onChange={(e) => setBudgetForm({ ...budgetForm, rent_budget: e.target.value })}
                                min="0"
                                step="0.01"
                            />
                            <Input
                                type="number"
                                label="Maintenance"
                                value={budgetForm.maintenance_budget}
                                onChange={(e) => setBudgetForm({ ...budgetForm, maintenance_budget: e.target.value })}
                                min="0"
                                step="0.01"
                            />
                            <Input
                                type="number"
                                label="Marketing"
                                value={budgetForm.marketing_budget}
                                onChange={(e) => setBudgetForm({ ...budgetForm, marketing_budget: e.target.value })}
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    <Textarea
                        label="Notes"
                        value={budgetForm.notes}
                        onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
                        rows={3}
                    />

                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={budgetForm.is_active}
                            onChange={(e) => setBudgetForm({ ...budgetForm, is_active: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                    </label>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => { setShowBudgetModal(false); resetBudgetForm(); }}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {selectedBudget ? 'Update Budget' : 'Create Budget'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Transfer Modal */}
            <Modal
                isOpen={showTransferModal}
                onClose={() => { setShowTransferModal(false); resetTransferForm(); }}
                title="Create Inter-Branch Transfer"
            >
                <form onSubmit={handleCreateTransfer} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="From Branch"
                            value={transferForm.from_branch}
                            onChange={(e) => setTransferForm({ ...transferForm, from_branch: e.target.value })}
                            options={[
                                { value: '', label: 'Select Branch' },
                                ...branches.map(b => ({ value: b.id, label: b.name }))
                            ]}
                            required
                        />

                        <Select
                            label="To Branch"
                            value={transferForm.to_branch}
                            onChange={(e) => setTransferForm({ ...transferForm, to_branch: e.target.value })}
                            options={[
                                { value: '', label: 'Select Branch' },
                                ...branches.filter(b => b.id !== parseInt(transferForm.from_branch)).map(b => ({ value: b.id, label: b.name }))
                            ]}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Transfer Type"
                            value={transferForm.transfer_type}
                            onChange={(e) => setTransferForm({ ...transferForm, transfer_type: e.target.value })}
                            options={[
                                { value: 'fund', label: 'Fund Transfer' },
                                { value: 'expense_reallocation', label: 'Expense Reallocation' }
                            ]}
                            required
                        />

                        <Input
                            type="number"
                            label="Amount"
                            value={transferForm.amount}
                            onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <Input
                        type="date"
                        label="Date"
                        value={transferForm.date}
                        onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                        required
                    />

                    <Textarea
                        label="Description"
                        value={transferForm.description}
                        onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                        required
                        rows={3}
                        placeholder="Reason for transfer..."
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => { setShowTransferModal(false); resetTransferForm(); }}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Create Transfer Request
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Utilization Details Modal */}
            {utilizationDetails && (
                <Modal
                    isOpen={showUtilizationModal}
                    onClose={() => { setShowUtilizationModal(false); setUtilizationDetails(null); }}
                    title="Budget Utilization Details"
                >
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-gray-600">Branch</div>
                                    <div className="text-lg font-semibold">{utilizationDetails.branch}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Period</div>
                                    <div className="text-sm font-medium">{utilizationDetails.period}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Total Budget</div>
                                    <div className="text-lg font-semibold text-blue-600">{formatCurrency(utilizationDetails.total_budget)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-600">Utilization</div>
                                    <div className={`text-lg font-semibold ${getUtilizationColor(utilizationDetails.utilization_percentage).split(' ')[0]}`}>
                                        {utilizationDetails.utilization_percentage.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Category-wise Breakdown</h4>
                            <div className="space-y-2">
                                {utilizationDetails.category_breakdown.map((cat) => (
                                    <div key={cat.category} className="border rounded-lg p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium">{cat.category_display}</span>
                                            <span className={`text-sm font-semibold ${getUtilizationColor(cat.utilization_percentage).split(' ')[0]}`}>
                                                {cat.utilization_percentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div>
                                                <div className="text-gray-600">Allocated</div>
                                                <div className="font-medium">{formatCurrency(cat.allocated)}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-600">Spent</div>
                                                <div className="font-medium text-red-600">{formatCurrency(cat.spent)}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-600">Remaining</div>
                                                <div className="font-medium text-green-600">{formatCurrency(cat.remaining)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={() => { setShowUtilizationModal(false); setUtilizationDetails(null); }}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default BranchFinancialTab;
