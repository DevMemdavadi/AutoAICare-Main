import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowRightLeft,
    Search,
    CheckCircle,
    XCircle,
    Clock,
    Truck,
    Package,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import api from '../../../utils/api';

const StockTransfer = ({ isTabView = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getCurrentBranchId } = useBranch();
    const isBranchAdmin = user?.role === 'branch_admin';

    const [searchParams] = useSearchParams();
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [branches, setBranches] = useState([]);
    const [parts, setParts] = useState([]);

    const [formData, setFormData] = useState({
        part: searchParams.get('part') || '',
        quantity: '',
        from_branch: searchParams.get('from_branch') || getCurrentBranchId() || (isBranchAdmin ? user.branch : ''),
        to_branch: '',
        reason: '',
        notes: ''
    });

    useEffect(() => {
        fetchBranches();
        fetchTransfers();
    }, [statusFilter, getCurrentBranchId()]);

    useEffect(() => {
        if (formData.from_branch) {
            fetchParts(formData.from_branch);
        } else {
            setParts([]);
        }
    }, [formData.from_branch]);

    const fetchBranches = async () => {
        try {
            const response = await api.get('/branches/');
            const allBranches = response.data.results || response.data;
            setBranches(allBranches);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchParts = async (branchId) => {
        try {
            // Fetch parts that have stock records in this branch
            const response = await api.get(`/jobcards/branch-stock/?branch=${branchId}`);
            const branchParts = response.data.results || response.data;

            // Map all parts regardless of tracking mode
            const mappedParts = branchParts.map(item => ({
                id: item.part,
                name: item.part_name,
                sku: item.part_sku,
                quantity: item.quantity,
                unit: item.part_unit
            }));

            setParts(mappedParts);
        } catch (error) {
            console.error('StockTransfer: Error fetching parts:', error);
        }
    };

    const fetchTransfers = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (getCurrentBranchId()) params.append('branch', getCurrentBranchId());
            else if (isBranchAdmin) params.append('branch', user.branch);

            const response = await api.get(`/jobcards/stock-transfers/?${params}`);
            setTransfers(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching transfers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/jobcards/stock-transfers/', formData);
            setShowCreateModal(false);
            setFormData({
                part: '',
                quantity: '',
                from_branch: '',
                to_branch: '',
                reason: '',
                notes: ''
            });
            fetchTransfers();
            alert('Transfer request created successfully!');
        } catch (error) {
            console.error('Error creating transfer:', error);
            alert(error.response?.data?.error || JSON.stringify(error.response?.data) || 'Failed to create transfer');
        }
    };

    const handleApprove = async (transferId) => {
        if (!window.confirm('Are you sure you want to approve this transfer?')) return;

        try {
            await api.post(`/jobcards/stock-transfers/${transferId}/approve/`);
            fetchTransfers();
            alert('Transfer approved successfully!');
        } catch (error) {
            console.error('Error approving transfer:', error);
            alert(error.response?.data?.error || 'Failed to approve transfer');
        }
    };

    const handleReject = async (transferId) => {
        const reason = window.prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            await api.post(`/jobcards/stock-transfers/${transferId}/reject/`, {
                notes: reason
            });
            fetchTransfers();
            alert('Transfer rejected');
        } catch (error) {
            console.error('Error rejecting transfer:', error);
            alert(error.response?.data?.error || 'Failed to reject transfer');
        }
    };

    const handleMarkInTransit = async (transferId) => {
        try {
            await api.post(`/jobcards/stock-transfers/${transferId}/mark_in_transit/`);
            fetchTransfers();
            alert('Transfer marked as in transit');
        } catch (error) {
            console.error('Error marking in transit:', error);
            alert(error.response?.data?.error || 'Failed to mark as in transit');
        }
    };

    const handleMarkReceived = async (transferId) => {
        if (!window.confirm('Confirm that you have received this stock?')) return;

        try {
            await api.post(`/jobcards/stock-transfers/${transferId}/mark_received/`);
            fetchTransfers();
            alert('Transfer received successfully!');
        } catch (error) {
            console.error('Error marking received:', error);
            alert(error.response?.data?.error || 'Failed to mark as received');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending', icon: Clock },
            approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Approved', icon: CheckCircle },
            in_transit: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'In Transit', icon: Truck },
            received: { bg: 'bg-green-100', text: 'text-green-800', label: 'Received', icon: Package },
            rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected', icon: XCircle },
            cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled', icon: XCircle }
        };
        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                <Icon size={14} />
                {badge.label}
            </span>
        );
    };

    const filteredTransfers = transfers.filter(transfer =>
        transfer.transfer_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.part_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.from_branch_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.to_branch_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={isTabView ? "space-y-6" : "p-6 space-y-6"}>
            {/* Header - Only show when not in tab view */}
            {!isTabView && (
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Stock Transfers</h1>
                        <p className="text-gray-600 mt-1">Manage inter-branch stock transfers</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <ArrowRightLeft size={20} />
                        New Transfer
                    </button>
                </div>
            )}

            {/* Quick Action for tab view */}
            {isTabView && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <ArrowRightLeft size={20} />
                        New Transfer
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search transfers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="in_transit">In Transit</option>
                        <option value="received">Received</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Transfers Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Transfer #
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Part
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantity
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    From → To
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Requested By
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {/* Transfer # / Date */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-28 bg-gray-200 rounded mb-1" />
                                            <div className="h-3 w-20 bg-gray-100 rounded" />
                                        </td>
                                        {/* Part / SKU */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                                            <div className="h-3 w-20 bg-gray-100 rounded" />
                                        </td>
                                        {/* Quantity */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-16 bg-gray-200 rounded" />
                                        </td>
                                        {/* From → To */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-40 bg-gray-200 rounded" />
                                        </td>
                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <div className="h-5 w-20 bg-gray-200 rounded-full" />
                                        </td>
                                        {/* Requested By */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-24 bg-gray-200 rounded" />
                                        </td>
                                        {/* Actions */}
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <div className="h-5 w-5 bg-gray-200 rounded" />
                                                <div className="h-5 w-5 bg-gray-200 rounded" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredTransfers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        No transfers found
                                    </td>
                                </tr>
                            ) : (
                                filteredTransfers.map((transfer) => (
                                    <tr key={transfer.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{transfer.transfer_number}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(transfer.requested_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{transfer.part_name}</div>
                                            <div className="text-xs text-gray-500">SKU: {transfer.part_sku}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {transfer.quantity} {transfer.part_unit}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {transfer.from_branch_name} → {transfer.to_branch_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(transfer.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {transfer.requested_by_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                {transfer.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(transfer.id)}
                                                            className="text-green-600 hover:text-green-900"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(transfer.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {transfer.status === 'approved' && (
                                                    <button
                                                        onClick={() => handleMarkInTransit(transfer.id)}
                                                        className="text-purple-600 hover:text-purple-900"
                                                        title="Mark In Transit"
                                                    >
                                                        <Truck size={18} />
                                                    </button>
                                                )}
                                                {(transfer.status === 'approved' || transfer.status === 'in_transit') && (
                                                    <button
                                                        onClick={() => handleMarkReceived(transfer.id)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="Mark Received"
                                                    >
                                                        <Package size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Transfer Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Create Stock Transfer</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Part *
                                    </label>
                                    <select
                                        required
                                        value={formData.part}
                                        onChange={(e) => setFormData({ ...formData, part: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select Part</option>
                                        {parts.map(part => (
                                            <option key={part.id} value={part.id}>
                                                {part.name} ({part.sku}) - {part.quantity} {part.unit}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        placeholder="Enter quantity"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        From Branch *
                                    </label>
                                    <select
                                        required
                                        value={formData.from_branch}
                                        onChange={(e) => setFormData({ ...formData, from_branch: e.target.value })}
                                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isBranchAdmin ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                        disabled={isBranchAdmin}
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map(branch => (
                                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        To Branch *
                                    </label>
                                    <select
                                        required
                                        value={formData.to_branch}
                                        onChange={(e) => setFormData({ ...formData, to_branch: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.filter(b => b.id !== parseInt(formData.from_branch)).map(branch => (
                                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason *
                                </label>
                                <textarea
                                    required
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Why is this transfer needed?"
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Additional Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Any additional information..."
                                    rows="2"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Create Transfer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockTransfer;
