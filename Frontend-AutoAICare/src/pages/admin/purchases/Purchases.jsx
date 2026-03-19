import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    Filter,
    Download,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    TrendingUp,
    DollarSign,
    Package
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import api from '../../../utils/api';

const Purchases = ({ isTabView = false }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isSuperAdmin, getCurrentBranchId } = useBranch();
    const isBranchAdmin = user?.role === 'branch_admin';

    const [purchases, setPurchases] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState(getCurrentBranchId() || (isBranchAdmin ? user.branch : ''));

    // Sync branch filter with global branch
    useEffect(() => {
        if (getCurrentBranchId()) {
            setBranchFilter(getCurrentBranchId());
        } else if (!isBranchAdmin) {
            setBranchFilter('');
        }
    }, [getCurrentBranchId(), isBranchAdmin, user.branch]);
    const [summary, setSummary] = useState(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchPurchases();
        fetchSummary();
    }, [statusFilter, paymentFilter, branchFilter, dateRange, getCurrentBranchId()]);

    const fetchBranches = async () => {
        try {
            const response = await api.get('/branches/');
            setBranches(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (paymentFilter !== 'all') params.append('payment_status', paymentFilter);
            if (branchFilter) params.append('branch', branchFilter);
            if (dateRange.start) params.append('purchase_date__gte', dateRange.start);
            if (dateRange.end) params.append('purchase_date__lte', dateRange.end);

            const response = await api.get(`/purchases/purchases/?${params}`);
            setPurchases(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const params = new URLSearchParams();
            if (branchFilter) params.append('branch', branchFilter);
            if (dateRange.start) params.append('start_date', dateRange.start);
            if (dateRange.end) params.append('end_date', dateRange.end);

            const response = await api.get(`/purchases/purchases/summary/?${params}`);
            setSummary(response.data.statistics);
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const handleApprovePurchase = async (purchaseId) => {
        if (!window.confirm('Are you sure you want to approve this purchase?')) return;

        try {
            await api.post(`/purchases/purchases/${purchaseId}/approve/`);
            fetchPurchases();
            fetchSummary();
            alert('Purchase approved successfully!');
        } catch (error) {
            console.error('Error approving purchase:', error);
            alert(error.response?.data?.error || 'Failed to approve purchase');
        }
    };

    const handleCancelPurchase = async (purchaseId) => {
        if (!window.confirm('Are you sure you want to cancel this purchase?')) return;

        try {
            await api.post(`/purchases/purchases/${purchaseId}/cancel/`);
            fetchPurchases();
            fetchSummary();
            alert('Purchase cancelled successfully!');
        } catch (error) {
            console.error('Error cancelling purchase:', error);
            alert(error.response?.data?.error || 'Failed to cancel purchase');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
            pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
            approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
            completed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Completed' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
        };
        const badge = badges[status] || badges.draft;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    const getPaymentBadge = (paymentStatus) => {
        const badges = {
            unpaid: { bg: 'bg-red-100', text: 'text-red-800', label: 'Unpaid' },
            partial: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Partial' },
            paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' }
        };
        const badge = badges[paymentStatus] || badges.unpaid;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    const filteredPurchases = purchases.filter(purchase =>
        purchase.purchase_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.supplier_invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={isTabView ? "space-y-6" : "p-6 space-y-6"}>
            {/* Header - Only show when not in tab view */}
            {!isTabView && (
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Purchase Management</h1>
                        <p className="text-gray-600 mt-1">Manage inventory purchases and supplier payments</p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/purchases/create')}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                        New Purchase
                    </button>
                </div>
            )}

            {/* Quick Action for tab view */}
            {isTabView && (
                <div className="flex justify-end">
                    <button
                        onClick={() => navigate('/admin/purchases/create')}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                        New Purchase
                    </button>
                </div>
            )}

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Purchases</p>
                                <p className="text-2xl font-bold text-gray-900">{summary.total_purchases || 0}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Package className="text-blue-600" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    ₹{(summary.total_amount || 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <DollarSign className="text-green-600" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Outstanding</p>
                                <p className="text-2xl font-bold text-orange-600">
                                    ₹{(summary.outstanding_amount || 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-lg">
                                <TrendingUp className="text-orange-600" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pending Approval</p>
                                <p className="text-2xl font-bold text-yellow-600">{summary.pending_count || 0}</p>
                            </div>
                            <div className="p-3 bg-yellow-100 rounded-lg">
                                <Clock className="text-yellow-600" size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search purchases..."
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
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="approved">Approved</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    {/* Branch Filter */}
                    {!getCurrentBranchId() && (
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isBranchAdmin ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                            disabled={isBranchAdmin}
                        >
                            {!isBranchAdmin && <option value="">All Branches</option>}
                            {branches.map(branch => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Payment Filter */}
                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Payments</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partially Paid</option>
                        <option value="paid">Paid</option>
                    </select>

                    {/* Date Range */}
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Purchases Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Purchase #
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Supplier
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payment
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
                                        {/* Purchase # / Invoice */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-28 bg-gray-200 rounded mb-1" />
                                            <div className="h-3 w-20 bg-gray-100 rounded" />
                                        </td>
                                        {/* Supplier / items */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                                            <div className="h-3 w-16 bg-gray-100 rounded" />
                                        </td>
                                        {/* Date */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-24 bg-gray-200 rounded" />
                                        </td>
                                        {/* Amount / Due */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-20 bg-gray-200 rounded mb-1" />
                                            <div className="h-3 w-16 bg-gray-100 rounded" />
                                        </td>
                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <div className="h-5 w-20 bg-gray-200 rounded-full" />
                                        </td>
                                        {/* Payment */}
                                        <td className="px-6 py-4">
                                            <div className="h-5 w-16 bg-gray-200 rounded-full" />
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
                            ) : filteredPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        No purchases found
                                    </td>
                                </tr>
                            ) : (
                                filteredPurchases.map((purchase) => (
                                    <tr key={purchase.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{purchase.purchase_number}</div>
                                            {purchase.supplier_invoice_number && (
                                                <div className="text-xs text-gray-500">Inv: {purchase.supplier_invoice_number}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{purchase.supplier_name}</div>
                                            <div className="text-xs text-gray-500">{purchase.items_count} items</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(purchase.purchase_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                ₹{purchase.total_amount.toLocaleString()}
                                            </div>
                                            {purchase.outstanding_amount > 0 && (
                                                <div className="text-xs text-orange-600">
                                                    Due: ₹{purchase.outstanding_amount.toLocaleString()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(purchase.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getPaymentBadge(purchase.payment_status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/admin/purchases/${purchase.id}`)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {purchase.status === 'pending_approval' && (
                                                    <button
                                                        onClick={() => handleApprovePurchase(purchase.id)}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                                {purchase.status === 'draft' && (
                                                    <button
                                                        onClick={() => handleCancelPurchase(purchase.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Cancel"
                                                    >
                                                        <XCircle size={18} />
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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => navigate('/admin/accounting')}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
                >
                    <h3 className="font-semibold text-gray-900">Manage Suppliers</h3>
                    <p className="text-sm text-gray-600 mt-1">Add and manage supplier information</p>
                </button>
                <button
                    onClick={() => navigate('/admin/purchases/payments')}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
                >
                    <h3 className="font-semibold text-gray-900">Record Payment</h3>
                    <p className="text-sm text-gray-600 mt-1">Record payments against purchases</p>
                </button>
                <button
                    onClick={() => navigate('/admin/purchases/reports')}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
                >
                    <h3 className="font-semibold text-gray-900">View Reports</h3>
                    <p className="text-sm text-gray-600 mt-1">GST reports, supplier analysis & more</p>
                </button>
            </div>
        </div>
    );
};

export default Purchases;
