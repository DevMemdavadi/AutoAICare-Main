import { Alert, Badge, Button, Card, Input, Modal, Select, Table } from '@/components/ui';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import { AlertCircle, ArrowRightLeft, BarChart3, Edit, Package, Plus, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const PartsManagement = () => {
    const { isSuperAdmin, getCurrentBranchId } = useBranch();
    const [parts, setParts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedPart, setSelectedPart] = useState(null);
    const [stockSummary, setStockSummary] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: 'spare',
        description: '',
        cost_price: '',
        selling_price: '',
        stock: 0,
        min_stock_level: 5,
        unit: 'pieces',
        gst_applicable: true,
        gst_rate: '18.00',
        hsn_code: '',
        is_global: true,
        branch: '',
        stock_tracking_mode: 'global',
        is_active: true
    });
    const [stockQuantity, setStockQuantity] = useState('');

    // Alert state
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

    // Pagination state
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        count: 0,
        hasNext: false,
        hasPrevious: false,
    });
    const [pageSize, setPageSize] = useState(10);

    const categories = [
        { value: 'consumable', label: 'Consumable' },
        { value: 'spare', label: 'Spare Part' },
        { value: 'material', label: 'Material' },
        { value: 'chemical', label: 'Chemical/Product' },
        { value: 'tool', label: 'Tool/Equipment' }
    ];

    const units = [
        { value: 'pieces', label: 'Pieces' },
        { value: 'liters', label: 'Liters' },
        { value: 'kg', label: 'Kilograms' },
        { value: 'sets', label: 'Sets' },
        { value: 'meters', label: 'Meters' },
        { value: 'bottles', label: 'Bottles' }
    ];

    useEffect(() => {
        fetchParts();
        fetchStockSummary();
        fetchBranches();
    }, [categoryFilter, stockFilter, pagination.page, pageSize]);

    // Reset to first page when filters change
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [categoryFilter, stockFilter, searchTerm]);

    // Reset to first page when page size changes
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [pageSize]);

    // Debug: Log formData changes
    useEffect(() => {
        console.log('📊 FormData changed:', {
            is_global: formData.is_global,
            branch: formData.branch,
            stock_tracking_mode: formData.stock_tracking_mode,
            name: formData.name
        });
    }, [formData]);

    // Debug: Log branches state
    useEffect(() => {
        console.log('🏢 Branches state updated:', branches);
        console.log('Number of branches:', branches.length);
    }, [branches]);

    const fetchParts = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                page_size: pageSize,
            };

            if (categoryFilter) params.category = categoryFilter;
            if (stockFilter) params.stock_status = stockFilter;
            if (searchTerm) params.search = searchTerm;

            const response = await api.get('/jobcards/parts/', { params });

            setParts(response.data.results || []);

            // Update pagination state based on API response
            const hasNext = !!response.data.next;
            const hasPrevious = !!response.data.previous;
            const totalCount = response.data.count || 0;
            const totalPages = hasNext || pagination.page > 1
                ? Math.ceil(totalCount / pageSize)
                : pagination.page;

            setPagination({
                page: pagination.page,
                totalPages: totalPages,
                count: totalCount,
                hasNext,
                hasPrevious,
            });
        } catch (error) {
            console.error('Error fetching parts:', error);
            setParts([]);
            setPagination({
                page: 1,
                totalPages: 1,
                count: 0,
                hasNext: false,
                hasPrevious: false,
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchStockSummary = async () => {
        try {
            const response = await api.get('/jobcards/parts/stock_summary/');
            setStockSummary(response.data);
        } catch (error) {
            console.error('Error fetching stock summary:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            console.log('🔍 Fetching branches...');
            const response = await api.get('/branches/');
            const branchesData = response.data.results || response.data || [];
            console.log('✅ Branches fetched:', branchesData);
            console.log('📊 Number of branches:', branchesData.length);
            setBranches(branchesData);
        } catch (error) {
            console.error('❌ Error fetching branches:', error);
            console.error('Error details:', error.response?.data);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('📝 Submitting part form...');
        console.log('Form Data:', formData);
        console.log('is_global:', formData.is_global);
        console.log('branch:', formData.branch);
        console.log('Available branches:', branches);

        try {
            if (selectedPart) {
                console.log('🔄 Updating part:', selectedPart.id);
                await api.put(`/jobcards/parts/${selectedPart.id}/`, formData);
            } else {
                console.log('➕ Creating new part');
                await api.post('/jobcards/parts/', formData);
            }
            setShowAddModal(false);
            resetForm();
            fetchParts();
            fetchStockSummary();
            showAlert('success', selectedPart ? 'Part updated successfully!' : 'Part added successfully!');
        } catch (error) {
            console.error('❌ Error saving part:', error);
            console.error('Error response:', error.response?.data);
            showAlert('error', error.response?.data?.detail || 'Error saving part');
        }
    };

    const handleAddStock = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/jobcards/parts/${selectedPart.id}/add_stock/`, {
                quantity: parseInt(stockQuantity)
            });
            setShowStockModal(false);
            setStockQuantity('');
            setSelectedPart(null);
            fetchParts();
            fetchStockSummary();
            showAlert('success', `Stock added successfully! New stock: ${selectedPart.stock + parseInt(stockQuantity)}`);
        } catch (error) {
            console.error('Error adding stock:', error);
            showAlert('error', error.response?.data?.error || 'Error adding stock');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            sku: '',
            category: 'spare',
            description: '',
            cost_price: '',
            selling_price: '',
            stock: 0,
            min_stock_level: 5,
            unit: 'pieces',
            gst_applicable: true,
            gst_rate: '18.00',
            hsn_code: '',
            is_global: true,
            branch: '',
            stock_tracking_mode: 'global',
            is_active: true
        });
        setSelectedPart(null);
    };

    const openEditModal = (part) => {
        console.log('✏️ Opening edit modal for part:', part);
        setSelectedPart(part);
        const editFormData = {
            name: part.name,
            sku: part.sku,
            category: part.category,
            description: part.description || '',
            cost_price: part.cost_price,
            selling_price: part.selling_price,
            stock: part.stock,
            min_stock_level: part.min_stock_level,
            unit: part.unit,
            gst_applicable: part.gst_applicable,
            gst_rate: part.gst_rate,
            hsn_code: part.hsn_code || '',
            is_global: part.is_global,
            branch: part.branch || '',
            stock_tracking_mode: part.stock_tracking_mode || 'global',
            is_active: part.is_active
        };
        console.log('📋 Edit form data:', editFormData);
        setFormData(editFormData);
        setShowAddModal(true);
    };

    const openStockModal = (part) => {
        setSelectedPart(part);
        setShowStockModal(true);
    };

    const getStockBadge = (part) => {
        if (part.stock === 0) {
            return <Badge variant="destructive">Out of Stock</Badge>;
        } else if (part.stock <= part.min_stock_level) {
            return <Badge variant="warning">Low Stock</Badge>;
        } else {
            return <Badge variant="success">In Stock</Badge>;
        }
    };

    const filteredParts = parts.filter(part =>
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Parts Management</h1>
                    <p className="text-sm md:text-base text-gray-600">Manage parts catalog and inventory</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/admin/purchases/branch-stock" className="flex-1 md:flex-initial">
                        <Button variant="outline" className="w-full md:w-auto flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base px-2 md:px-4 py-2 whitespace-nowrap">
                            <Package className="h-4 w-4" />
                            <span>Branch Stock</span>
                        </Button>
                    </Link>
                    <Link to="/admin/purchases/stock-transfer" className="flex-1 md:flex-initial">
                        <Button variant="outline" className="w-full md:w-auto flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base px-2 md:px-4 py-2 whitespace-nowrap">
                            <ArrowRightLeft className="h-4 w-4" />
                            <span>Transfers</span>
                        </Button>
                    </Link>
                    <Button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="flex-1 md:flex-initial w-full md:w-auto flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base px-2 md:px-4 py-2 whitespace-nowrap"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add Part</span>
                    </Button>
                </div>
            </div>

            {/* Stock Summary Cards */}
            {stockSummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Parts</p>
                                <p className="text-2xl font-bold">{stockSummary.total_parts}</p>
                            </div>
                            <Package className="h-8 w-8 text-blue-500" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Out of Stock</p>
                                <p className="text-2xl font-bold text-red-600">{stockSummary.out_of_stock}</p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Low Stock</p>
                                <p className="text-2xl font-bold text-orange-600">{stockSummary.low_stock}</p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-orange-500" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Stock Value</p>
                                <p className="text-2xl font-bold text-green-600">₹{parseFloat(stockSummary.total_stock_value || 0).toFixed(2)}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            placeholder="Search by name or SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            icon={<Search className="h-4 w-4" />}
                        />
                    </div>

                    <Select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </Select>

                    <Select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                    >
                        <option value="">All Stock Status</option>
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </Select>
                </div>
            </Card>

            {/* Parts Table */}
            <Card
                title="Parts Inventory"
                actions={
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Items per page:</span>
                        <Select
                            value={pageSize}
                            onChange={(e) => {
                                const newSize = Number(e.target.value);
                                setPageSize(newSize);
                            }}
                            options={[
                                { value: 10, label: "10" },
                                { value: 20, label: "20" },
                                { value: 50, label: "50" },
                                { value: 100, label: "100" },
                            ]}
                            className="w-18 text-sm"
                        />
                    </div>
                }
            >
                <Table
                    headers={['SKU', 'Name', 'Category', 'Stock', 'Unit', 'Cost Price', 'Selling Price', 'Profit %', 'Scope', 'Status', 'Actions']}
                    data={filteredParts}
                    loading={loading}
                    renderRow={(part) => (
                        <tr key={part.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{part.sku}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{part.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 capitalize">{part.category.replace('_', ' ')}</td>
                            <td className="px-4 py-3 text-sm">
                                <span className={part.stock <= part.min_stock_level ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                                    {part.stock}
                                </span>
                                <span className="text-gray-500 text-xs ml-1">/ {part.min_stock_level} min</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 capitalize">{part.unit}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">₹{parseFloat(part.cost_price).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">₹{parseFloat(part.selling_price).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-green-600 font-medium">{parseFloat(part.profit_percentage).toFixed(2)}%</td>
                            <td className="px-4 py-3 text-sm">
                                {part.is_global ? (
                                    <Badge variant="info">Global</Badge>
                                ) : (
                                    <Badge variant="warning">
                                        {part.branch_details?.name || 'Branch Specific'}
                                    </Badge>
                                )}
                            </td>
                            <td className="px-4 py-3 text-sm">{getStockBadge(part)}</td>
                            <td className="px-4 py-3 text-sm">
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openEditModal(part)}>
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="primary" onClick={() => openStockModal(part)}>
                                        <Plus className="h-3 w-3 mr-1" />
                                        Stock
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    )}
                />

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Showing page {pagination.page} of {pagination.totalPages} (
                                {pagination.count} total parts)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() =>
                                        setPagination({ ...pagination, page: pagination.page - 1 })
                                    }
                                    disabled={!pagination.hasPrevious}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() =>
                                        setPagination({ ...pagination, page: pagination.page + 1 })
                                    }
                                    disabled={!pagination.hasNext}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Add/Edit Part Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); resetForm(); }}
                title={selectedPart ? 'Edit Part' : 'Add New Part'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Part Name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />

                        <Input
                            label="SKU"
                            required
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        />
                    </div>

                    <Select
                        label="Category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </Select>

                    <Input
                        label="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Cost Price (₹)"
                            type="number"
                            step="0.01"
                            required
                            value={formData.cost_price}
                            onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        />

                        <Input
                            label="Selling Price (₹)"
                            type="number"
                            step="0.01"
                            required
                            value={formData.selling_price}
                            onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Input
                            label="Initial Stock"
                            type="number"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                        />

                        <Input
                            label="Min Stock Level"
                            type="number"
                            value={formData.min_stock_level}
                            onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
                        />

                        <Select
                            label="Unit"
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        >
                            {units.map(unit => (
                                <option key={unit.value} value={unit.value}>{unit.label}</option>
                            ))}
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="GST Rate (%)"
                            type="number"
                            step="0.01"
                            value={formData.gst_rate}
                            onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                        />

                        <Input
                            label="HSN Code"
                            value={formData.hsn_code}
                            onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.gst_applicable}
                                onChange={(e) => setFormData({ ...formData, gst_applicable: e.target.checked })}
                            />
                            <span className="text-sm">GST Applicable</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.is_global}
                                disabled={!!selectedPart}
                                onChange={(e) => setFormData({ ...formData, is_global: e.target.checked, branch: e.target.checked ? '' : formData.branch })}
                            />
                            <span className={`text-sm ${selectedPart ? 'text-gray-400' : ''}`}>
                                Global (All Branches)
                                {selectedPart && <span className="ml-1 text-xs text-gray-400">(cannot change)</span>}
                            </span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            <span className="text-sm">Active</span>
                        </label>
                    </div>

                    {!formData.is_global && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                                ℹ️ <strong>Branch-Specific Part:</strong>
                                {selectedPart
                                    ? ' Branch assignment is locked after creation.'
                                    : ' You must select a branch below since this part is not available to all branches.'}
                            </p>
                        </div>
                    )}

                    {/* Branch Selection - Only show when is_global is false */}
                    {!formData.is_global && (
                        selectedPart ? (
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Branch</label>
                                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                                    {branches.find(b => b.id === formData.branch || b.id === Number(formData.branch))?.name || 'Unknown Branch'}
                                    <span className="ml-2 text-xs text-gray-400">(cannot change)</span>
                                </div>
                            </div>
                        ) : (
                            <Select
                                label="Branch"
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                required={!formData.is_global}
                            >
                                <option value="">Select Branch...</option>
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name} {branch.code ? `(${branch.code})` : ''}
                                    </option>
                                ))}
                            </Select>
                        )
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {selectedPart ? 'Update Part' : 'Add Part'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Add Stock Modal */}
            <Modal
                isOpen={showStockModal}
                onClose={() => { setShowStockModal(false); setStockQuantity(''); setSelectedPart(null); }}
                title="Add Stock"
            >
                {selectedPart && (
                    <form onSubmit={handleAddStock} className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Part: <span className="font-semibold text-gray-900">{selectedPart.name}</span></p>
                            <p className="text-sm text-gray-600">Current Stock: <span className="font-semibold text-gray-900">{selectedPart.stock} {selectedPart.unit}</span></p>
                            <p className="text-sm text-gray-600">Cost Price: <span className="font-semibold text-gray-900">₹{selectedPart.cost_price}</span></p>
                        </div>

                        <Input
                            label={`Quantity to Add (${selectedPart.unit})`}
                            type="number"
                            min="1"
                            required
                            value={stockQuantity}
                            onChange={(e) => setStockQuantity(e.target.value)}
                            placeholder="Enter quantity"
                        />

                        {stockQuantity && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-700">
                                    Total Cost: <span className="font-bold text-blue-600">₹{(parseFloat(selectedPart.cost_price) * parseInt(stockQuantity || 0)).toFixed(2)}</span>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">An expense record will be created for this purchase</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => { setShowStockModal(false); setStockQuantity(''); setSelectedPart(null); }}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary">
                                Add Stock
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default PartsManagement;
