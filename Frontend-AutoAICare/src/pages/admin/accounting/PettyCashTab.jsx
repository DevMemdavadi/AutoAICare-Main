import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { Card, Button, Input, Select, Modal, Textarea } from '@/components/ui';
import {
    Wallet,
    Plus,
    TrendingUp,
    TrendingDown,
    Calendar,
    Download,
    Upload,
    ArrowRightLeft,
    AlertCircle,
    Receipt,
    DollarSign,
    FileText
} from 'lucide-react';
import { StatCardSkeleton, TableSkeleton } from './SkeletonLoaders';

const PettyCashTab = () => {
    const { user } = useAuth();
    const { currentBranch, branches } = useBranch();

    const [transactions, setTransactions] = useState([]);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');

    // Form states
    const [transactionForm, setTransactionForm] = useState({
        transaction_type: 'out',
        amount: '',
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        receipt: null
    });

    const [reconcileForm, setReconcileForm] = useState({
        counted_amount: '',
        notes: ''
    });

    const [transferForm, setTransferForm] = useState({
        to_branch: '',
        amount: '',
        description: ''
    });

    const categoryOptions = [
        { value: 'office_supplies', label: 'Office Supplies' },
        { value: 'refreshments', label: 'Refreshments' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'utilities', label: 'Utilities' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'miscellaneous', label: 'Miscellaneous' }
    ];

    useEffect(() => {
        fetchTransactions();
        fetchCurrentBalance();
    }, [startDate, endDate, selectedBranch]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const params = {};
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (selectedBranch) params.branch = selectedBranch;

            const response = await api.get('/accounting/petty-cash/', { params });
            // Handle both paginated and non-paginated responses
            const data = response.data.results || response.data;
            setTransactions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching petty cash transactions:', error);
            setTransactions([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentBalance = async () => {
        try {
            const params = {};
            if (selectedBranch) params.branch = selectedBranch;

            const response = await api.get('/accounting/petty-cash/current_balance/', { params });
            setCurrentBalance(response.data.current_balance);
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('transaction_type', transactionForm.transaction_type);
            formData.append('amount', transactionForm.amount);
            formData.append('description', transactionForm.description);
            formData.append('category', transactionForm.category);
            formData.append('date', transactionForm.date);

            const branchId = transactionForm.branch || currentBranch?.id;
            if (branchId) {
                formData.append('branch', branchId);
            }

            if (transactionForm.receipt) {
                formData.append('receipt', transactionForm.receipt);
            }

            await api.post('/accounting/petty-cash/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setShowAddModal(false);
            setTransactionForm({
                transaction_type: 'out',
                amount: '',
                description: '',
                category: '',
                date: new Date().toISOString().split('T')[0],
                receipt: null
            });
            fetchTransactions();
            fetchCurrentBalance();
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Failed to add transaction: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleReconcile = async (e) => {
        e.preventDefault();
        try {
            const difference = parseFloat(reconcileForm.counted_amount) - currentBalance;

            if (difference !== 0) {
                // Create adjustment transaction
                await api.post('/accounting/petty-cash/', {
                    transaction_type: 'adjustment',
                    amount: Math.abs(difference),
                    description: `Daily reconciliation - ${reconcileForm.notes}`,
                    category: 'reconciliation',
                    date: new Date().toISOString().split('T')[0],
                    branch: currentBranch?.id
                });
            }

            setShowReconcileModal(false);
            setReconcileForm({ counted_amount: '', notes: '' });
            fetchTransactions();
            fetchCurrentBalance();
            alert('Reconciliation completed successfully!');
        } catch (error) {
            console.error('Error reconciling:', error);
            alert('Failed to reconcile: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        try {
            // Create cash out transaction for current branch
            await api.post('/accounting/petty-cash/', {
                transaction_type: 'out',
                amount: transferForm.amount,
                description: `Transfer to branch: ${transferForm.description}`,
                category: 'transfer',
                date: new Date().toISOString().split('T')[0],
                branch: currentBranch?.id
            });

            // Create cash in transaction for destination branch
            await api.post('/accounting/petty-cash/', {
                transaction_type: 'in',
                amount: transferForm.amount,
                description: `Transfer from branch: ${transferForm.description}`,
                category: 'transfer',
                date: new Date().toISOString().split('T')[0],
                branch: transferForm.to_branch
            });

            setShowTransferModal(false);
            setTransferForm({ to_branch: '', amount: '', description: '' });
            fetchTransactions();
            fetchCurrentBalance();
            alert('Transfer completed successfully!');
        } catch (error) {
            console.error('Error transferring:', error);
            alert('Failed to transfer: ' + (error.response?.data?.detail || error.message));
        }
    };

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'in':
                return <TrendingUp className="text-green-600" size={20} />;
            case 'out':
                return <TrendingDown className="text-red-600" size={20} />;
            default:
                return <ArrowRightLeft className="text-blue-600" size={20} />;
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Calculate daily summary
    const getDailySummary = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayTransactions = transactions.filter(t => t.date === today);

        const cashIn = todayTransactions
            .filter(t => t.transaction_type === 'in')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const cashOut = todayTransactions
            .filter(t => t.transaction_type === 'out')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        return { cashIn, cashOut, netChange: cashIn - cashOut };
    };

    const dailySummary = getDailySummary();

    return (
        <div className="space-y-6">
            {/* Header with Balance and Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Wallet className="text-blue-600" size={28} />
                        Petty Cash Management
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Track and manage daily cash transactions
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                        <Plus size={16} />
                        Add Transaction
                    </Button>
                    <Button variant="outline" onClick={() => setShowReconcileModal(true)} className="flex items-center gap-2">
                        <Receipt size={16} />
                        Reconcile
                    </Button>
                    {user?.is_superuser && (
                        <Button variant="outline" onClick={() => setShowTransferModal(true)} className="flex items-center gap-2">
                            <ArrowRightLeft size={16} />
                            Transfer
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <>
                    {/* Summary Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </div>
                    {/* Filters Skeleton */}
                    <Card className="p-6">
                        <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="h-16 bg-gray-200 rounded"></div>
                            <div className="h-16 bg-gray-200 rounded"></div>
                            <div className="h-16 bg-gray-200 rounded"></div>
                            <div className="h-16 bg-gray-200 rounded"></div>
                        </div>
                    </Card>
                    {/* Table Skeleton */}
                    <TableSkeleton rows={8} />
                </>
            ) : (
                <>
                    {/* Current Balance & Daily Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium opacity-90">Current Balance</span>
                                    <Wallet size={20} className="opacity-75" />
                                </div>
                                <div className="text-3xl font-bold">{formatCurrency(currentBalance)}</div>
                                <div className="text-xs opacity-75 mt-1">
                                    {currentBranch ? currentBranch.name : 'All Branches'}
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium opacity-90">Today's Cash In</span>
                                    <TrendingUp size={20} className="opacity-75" />
                                </div>
                                <div className="text-3xl font-bold">{formatCurrency(dailySummary.cashIn)}</div>
                                <div className="text-xs opacity-75 mt-1">Receipts</div>
                            </div>
                        </Card>

                        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium opacity-90">Today's Cash Out</span>
                                    <TrendingDown size={20} className="opacity-75" />
                                </div>
                                <div className="text-3xl font-bold">{formatCurrency(dailySummary.cashOut)}</div>
                                <div className="text-xs opacity-75 mt-1">Payments</div>
                            </div>
                        </Card>

                        <Card className={`bg-gradient-to-br ${dailySummary.netChange >= 0 ? 'from-purple-500 to-purple-600' : 'from-orange-500 to-orange-600'} text-white`}>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium opacity-90">Net Change</span>
                                    <DollarSign size={20} className="opacity-75" />
                                </div>
                                <div className="text-3xl font-bold">{formatCurrency(dailySummary.netChange)}</div>
                                <div className="text-xs opacity-75 mt-1">Today</div>
                            </div>
                        </Card>
                    </div>

                    {/* Filters */}
                    <Card title="Filters">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input
                                type="date"
                                label="Start Date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <Input
                                type="date"
                                label="End Date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                            {user?.is_superuser && (
                                <Select
                                    label="Branch"
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Branches' },
                                        ...branches.map(b => ({ value: b.id, label: b.name }))
                                    ]}
                                />
                            )}
                            <div className="flex items-end">
                                <Button variant="outline" onClick={() => {
                                    setStartDate('');
                                    setEndDate('');
                                    setSelectedBranch('');
                                }} className="w-full">
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Transactions Table */}
                    <Card title="Transaction History">
                        {transactions.length === 0 ? (
                            <div className="text-center py-12">
                                <Wallet className="mx-auto text-gray-400" size={48} />
                                <p className="mt-4 text-gray-600">No transactions found</p>
                                <Button onClick={() => setShowAddModal(true)} className="mt-4">
                                    Add First Transaction
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {transactions.map((transaction) => (
                                            <tr key={transaction.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {new Date(transaction.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {getTransactionIcon(transaction.transaction_type)}
                                                        <span className="text-sm capitalize">{transaction.transaction_type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{transaction.description}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                                                    {transaction.category || '-'}
                                                </td>
                                                <td className={`px-4 py-3 text-sm text-right font-semibold ${transaction.transaction_type === 'in' ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {transaction.transaction_type === 'in' ? '+' : '-'}
                                                    {formatCurrency(transaction.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                                    {formatCurrency(transaction.balance_after)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {transaction.receipt ? (
                                                        <a
                                                            href={transaction.receipt}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800"
                                                        >
                                                            <FileText size={16} className="inline" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {/* Add Transaction Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add Petty Cash Transaction"
            >
                <form onSubmit={handleAddTransaction} className="space-y-4">
                    <Select
                        label="Transaction Type"
                        value={transactionForm.transaction_type}
                        onChange={(e) => setTransactionForm({ ...transactionForm, transaction_type: e.target.value })}
                        options={[
                            { value: 'in', label: 'Cash In' },
                            { value: 'out', label: 'Cash Out' }
                        ]}
                        required
                    />

                    <Input
                        type="number"
                        label="Amount"
                        value={transactionForm.amount}
                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                    />

                    <Input
                        label="Description"
                        value={transactionForm.description}
                        onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                        required
                        placeholder="e.g., Office supplies purchase"
                    />

                    <Select
                        label="Category"
                        value={transactionForm.category}
                        onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                        options={[
                            { value: '', label: 'Select Category' },
                            ...categoryOptions
                        ]}
                    />

                    <Input
                        type="date"
                        label="Date"
                        value={transactionForm.date}
                        onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                        required
                    />

                    {['super_admin', 'company_admin'].includes(user?.role) && (
                        <Select
                            label="Branch"
                            value={transactionForm.branch || ''}
                            onChange={(e) => setTransactionForm({ ...transactionForm, branch: e.target.value })}
                            options={[
                                { value: '', label: 'Select Branch' },
                                ...branches.map(b => ({ value: b.id, label: b.name }))
                            ]}
                            required
                        />
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Receipt (Optional)
                        </label>
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setTransactionForm({ ...transactionForm, receipt: e.target.files[0] })}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Add Transaction
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Reconcile Modal */}
            <Modal
                isOpen={showReconcileModal}
                onClose={() => setShowReconcileModal(false)}
                title="Daily Cash Reconciliation"
            >
                <form onSubmit={handleReconcile} className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">System Balance:</span>
                            <span className="text-lg font-bold text-blue-600">{formatCurrency(currentBalance)}</span>
                        </div>
                    </div>

                    <Input
                        type="number"
                        label="Counted Cash Amount"
                        value={reconcileForm.counted_amount}
                        onChange={(e) => setReconcileForm({ ...reconcileForm, counted_amount: e.target.value })}
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                    />

                    {reconcileForm.counted_amount && (
                        <div className={`p-4 rounded-lg ${parseFloat(reconcileForm.counted_amount) === currentBalance
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-yellow-50 border border-yellow-200'
                            }`}>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Difference:</span>
                                <span className={`text-lg font-bold ${parseFloat(reconcileForm.counted_amount) === currentBalance
                                    ? 'text-green-600'
                                    : 'text-yellow-600'
                                    }`}>
                                    {formatCurrency(parseFloat(reconcileForm.counted_amount) - currentBalance)}
                                </span>
                            </div>
                        </div>
                    )}

                    <Textarea
                        label="Notes"
                        value={reconcileForm.notes}
                        onChange={(e) => setReconcileForm({ ...reconcileForm, notes: e.target.value })}
                        placeholder="Add any notes about the reconciliation..."
                        rows={3}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowReconcileModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Complete Reconciliation
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Transfer Modal */}
            <Modal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                title="Transfer Cash Between Branches"
            >
                <form onSubmit={handleTransfer} className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Available Balance:</span>
                            <span className="text-lg font-bold text-blue-600">{formatCurrency(currentBalance)}</span>
                        </div>
                    </div>

                    <Select
                        label="To Branch"
                        value={transferForm.to_branch}
                        onChange={(e) => setTransferForm({ ...transferForm, to_branch: e.target.value })}
                        options={[
                            { value: '', label: 'Select Branch' },
                            ...branches.filter(b => b.id !== currentBranch?.id).map(b => ({ value: b.id, label: b.name }))
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
                        max={currentBalance}
                        step="0.01"
                        placeholder="0.00"
                    />

                    <Input
                        label="Description"
                        value={transferForm.description}
                        onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                        required
                        placeholder="Reason for transfer"
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowTransferModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Transfer Cash
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default PettyCashTab;
