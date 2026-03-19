import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package,
    Search,
    Filter,
    TrendingDown,
    TrendingUp,
    AlertCircle,
    ArrowRightLeft,
    Plus,
    Edit
} from 'lucide-react';
import api from '../../../utils/api';

const BranchStockView = () => {
    const navigate = useNavigate();
    const [branchStocks, setBranchStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [stockStatusFilter, setStockStatusFilter] = useState('');
    const [branches, setBranches] = useState([]);
    const [summary, setSummary] = useState(null);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);
    const [adjustQuantity, setAdjustQuantity] = useState('');
    const [adjustNotes, setAdjustNotes] = useState('');

    useEffect(() => {
        fetchBranches();
        fetchBranchStocks();
        fetchSummary();
    }, [branchFilter, stockStatusFilter]);

    const fetchBranches = async () => {
        try {
            const response = await api.get('/branches/');
            setBranches(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchBranchStocks = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (branchFilter) params.append('branch', branchFilter);
            if (stockStatusFilter) params.append('stock_status', stockStatusFilter);

            const response = await api.get(`/jobcards/branch-stock/?${params}`);
            setBranchStocks(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching branch stocks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await api.get('/jobcards/branch-stock/low_stock_alert/');
            setSummary({
                low_stock_count: response.data.length,
                total_branches: branches.length
            });
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const handleAdjustStock = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/jobcards/branch-stock/${selectedStock.id}/adjust_stock/`, {
                quantity: parseFloat(adjustQuantity),
                notes: adjustNotes
            });
            setShowAdjustModal(false);
            setSelectedStock(null);
            setAdjustQuantity('');
            setAdjustNotes('');
            fetchBranchStocks();
            fetchSummary();
            alert('Stock adjusted successfully!');
        } catch (error) {
            console.error('Error adjusting stock:', error);
            alert(error.response?.data?.error || 'Failed to adjust stock');
        }
    };

    const openAdjustModal = (stock) => {
        setSelectedStock(stock);
        setShowAdjustModal(true);
    };

    const getStockBadge = (stock) => {
        const status = stock.stock_status;
        const badges = {
            out_of_stock: { bg: 'bg-red-100', text: 'text-red-800', label: 'Out of Stock' },
            low_stock: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Low Stock' },
            in_stock: { bg: 'bg-green-100', text: 'text-green-800', label: 'In Stock' }
        };
        const badge = badges[status] || badges.in_stock;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    const filteredStocks = branchStocks.filter(stock =>
        stock.part_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.part_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.branch_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Branch Stock Management</h1>
                    <p className="text-gray-600 mt-1">View and manage stock levels across all branches</p>
                </div>
                <button
                    onClick={() => navigate('/admin/purchases/stock-transfer')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <ArrowRightLeft size={20} />
                    Transfer Stock
                </button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Branches</p>
                                <p className="text-2xl font-bold text-gray-900">{summary.total_branches}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Package className="text-blue-600" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Low Stock Items</p>
                                <p className="text-2xl font-bold text-orange-600">{summary.low_stock_count}</p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-lg">
                                <AlertCircle className="text-orange-600" size={24} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Stock Items</p>
                                <p className="text-2xl font-bold text-gray-900">{filteredStocks.length}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <TrendingUp className="text-green-600" size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by part or branch..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Branch Filter */}
                    <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Branches</option>
                        {branches.map(branch => (
                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                    </select>

                    {/* Stock Status Filter */}
                    <select
                        value={stockStatusFilter}
                        onChange={(e) => setStockStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Stock Status</option>
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>
                </div>
            </div>

            {/* Stock Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Part
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Branch
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantity
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Location
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
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
                                        {/* Part */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                                            <div className="h-3 w-20 bg-gray-100 rounded" />
                                        </td>
                                        {/* Branch */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-28 bg-gray-200 rounded" />
                                        </td>
                                        {/* Quantity */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-20 bg-gray-200 rounded" />
                                        </td>
                                        {/* Location */}
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-16 bg-gray-100 rounded" />
                                        </td>
                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <div className="h-5 w-20 bg-gray-200 rounded-full" />
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
                            ) : filteredStocks.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No stock records found
                                    </td>
                                </tr>
                            ) : (
                                filteredStocks.map((stock) => (
                                    <tr key={stock.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{stock.part_name}</div>
                                            <div className="text-xs text-gray-500">SKU: {stock.part_sku}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {stock.branch_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={stock.quantity <= stock.min_stock_level ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                                                {stock.quantity}
                                            </span>
                                            <span className="text-gray-500 text-xs ml-1">
                                                {stock.part_unit} / {stock.min_stock_level} min
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {stock.location || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStockBadge(stock)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openAdjustModal(stock)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Adjust Stock"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/admin/purchases/stock-transfer?part=${stock.part}&from_branch=${stock.branch}`)}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Transfer Stock"
                                                >
                                                    <ArrowRightLeft size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Adjust Stock Modal */}
            {showAdjustModal && selectedStock && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Adjust Stock</h2>
                        <form onSubmit={handleAdjustStock} className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600">Part: <span className="font-semibold text-gray-900">{selectedStock.part_name}</span></p>
                                <p className="text-sm text-gray-600">Branch: <span className="font-semibold text-gray-900">{selectedStock.branch_name}</span></p>
                                <p className="text-sm text-gray-600">Current Stock: <span className="font-semibold text-gray-900">{selectedStock.quantity} {selectedStock.part_unit}</span></p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity Change
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={adjustQuantity}
                                    onChange={(e) => setAdjustQuantity(e.target.value)}
                                    placeholder="Enter positive to add, negative to deduct"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    New stock will be: {(parseFloat(selectedStock.quantity) + parseFloat(adjustQuantity || 0)).toFixed(2)} {selectedStock.part_unit}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={adjustNotes}
                                    onChange={(e) => setAdjustNotes(e.target.value)}
                                    placeholder="Reason for adjustment..."
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowAdjustModal(false); setSelectedStock(null); setAdjustQuantity(''); setAdjustNotes(''); }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Adjust Stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchStockView;
