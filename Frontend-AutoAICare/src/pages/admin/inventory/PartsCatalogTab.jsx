import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input, Modal, Select, Table } from '@/components/ui';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { AlertCircle, Edit, Package, Plus, Search, TrendingDown, TrendingUp } from 'lucide-react';

const PartsCatalogTab = () => {
    const navigate = useNavigate();
    const { isSuperAdmin, getCurrentBranchId } = useBranch();
    const { user } = useAuth();
    const [parts, setParts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
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
        is_global: user?.role === 'branch_admin' ? false : true,
        branch: user?.role === 'branch_admin' ? (user?.branch || '') : '',
        stock_tracking_mode: 'global',
        is_active: true
    });
    const [stockQuantity, setStockQuantity] = useState('');
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

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
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchParts();
        fetchStockSummary();
        fetchBranches();
    }, [categoryFilter, stockFilter, pagination.page, pageSize, debouncedSearchTerm, getCurrentBranchId()]);

    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [categoryFilter, stockFilter, debouncedSearchTerm, pageSize]);



    const fetchParts = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                page_size: pageSize,
            };

            if (categoryFilter) params.category = categoryFilter;
            if (stockFilter) params.stock_status = stockFilter;
            if (debouncedSearchTerm) params.search = debouncedSearchTerm;
            if (getCurrentBranchId()) params.branch = getCurrentBranchId();

            const response = await api.get('/jobcards/parts/', { params });

            setParts(response.data.results || []);

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
        } finally {
            setLoading(false);
        }
    };

    const fetchStockSummary = async () => {
        try {
            const params = {};
            if (getCurrentBranchId()) params.branch = getCurrentBranchId();
            const response = await api.get('/jobcards/parts/stock_summary/', { params });
            setStockSummary(response.data);
        } catch (error) {
            console.error('Error fetching stock summary:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            const response = await api.get('/branches/');
            setBranches(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedPart) {
                await api.put(`/jobcards/parts/${selectedPart.id}/`, formData);
            } else {
                await api.post('/jobcards/parts/', formData);
            }
            setShowAddModal(false);
            resetForm();
            fetchParts();
            fetchStockSummary();
            showAlert('success', selectedPart ? 'Part updated successfully!' : 'Part added successfully!');
        } catch (error) {
            console.error('❌ [PartsCatalog] Error saving part:', error);
            console.error('Error response:', error.response?.data);

            const data = error.response?.data;
            let errorMessage = 'Error saving part. Please try again.';
            if (data) {
                if (typeof data === 'string') {
                    errorMessage = data;
                } else if (data.detail) {
                    errorMessage = data.detail;
                } else if (data.non_field_errors) {
                    const errs = data.non_field_errors;
                    errorMessage = Array.isArray(errs) ? errs[0] : errs;
                } else {
                    // Field-level errors e.g. { sku: ["A part with SKU..."] }
                    const firstEntry = Object.values(data)[0];
                    errorMessage = Array.isArray(firstEntry) ? firstEntry[0] : String(firstEntry);
                }
            }
            showAlert('error', errorMessage);
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
            showAlert('success', `Stock added successfully!`);
        } catch (error) {
            console.error('Error adding stock:', error);
            showAlert('error', error.response?.data?.error || 'Error adding stock');
        }
    };

    const resetForm = () => {
        const isBranchAdmin = user?.role === 'branch_admin';
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
            is_global: !getCurrentBranchId(), // Default to global ONLY if no branch is selected in header
            branch: getCurrentBranchId() || (isBranchAdmin ? (user?.branch || '') : ''),
            stock_tracking_mode: 'global',
            is_active: true
        });
        setSelectedPart(null);
    };

    const openEditModal = (part) => {
        console.log('✏️ [PartsCatalog] Opening edit modal for part:', part);

        // Branch admins cannot edit global parts
        if (user?.role === 'branch_admin' && part.is_global) {
            showAlert('error', 'Branch admins cannot edit global parts. Please contact your company admin.');
            return;
        }

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
        console.log('📋 [PartsCatalog] Edit form data:', editFormData);
        setFormData(editFormData);
        setShowAddModal(true);
    };

    const openStockModal = (part) => {
        setSelectedPart(part);
        setShowStockModal(true);
    };

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
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

    // Note: Search filtering is handled by the backend API
    // The 'parts' state already contains filtered results based on searchTerm

    return (
        <div className="space-y-6">
            {/* Alert */}
            {alert.show && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert({ show: false, type: '', message: '' })}
                />
            )}

            {/* Quick Actions */}
            <div className="flex justify-end gap-2">
                <Button
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Part
                </Button>
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
                                <p className="text-sm text-gray-600">Total Value</p>
                                <p className="text-2xl font-bold">₹{stockSummary.total_stock_value?.toLocaleString() || 0}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input
                        placeholder="Search by name, SKU or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        prefix={<Search className="text-gray-400" size={18} />}
                        className="w-full"
                    />

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>

                    <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Stock Status</option>
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>

                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(parseInt(e.target.value))}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="10">10 per page</option>
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                    </select>
                </div>
            </Card >

            {/* Parts Table */}
            < Card >
                <Table
                    headers={['Part Details', 'Category', 'Price', 'Stock', 'Scope', 'Status', 'Actions']}
                    // headers={['Part Details', 'Category', 'Price', 'Stock', 'Tracking Mode', 'Scope', 'Status', 'Actions']}
                    loading={loading}
                    emptyMessage="No parts found"
                    data={parts}
                    renderRow={(part) => (
                        <tr key={part.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900">{part.name}</div>
                                <div className="text-xs text-gray-500">SKU: {part.sku}</div>
                            </td>
                            <td className="px-4 py-3 text-sm capitalize">{part.category}</td>
                            <td className="px-4 py-3 text-sm">
                                <div>₹{part.selling_price}</div>
                                <div className="text-xs text-gray-500">Cost: ₹{part.cost_price}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                                <div className={part.stock <= part.min_stock_level ? 'text-red-600 font-semibold' : ''}>
                                    {part.stock} {part.unit}
                                </div>
                                <div className="text-xs text-gray-500">Min: {part.min_stock_level}</div>
                            </td>
                            {/* <td className="px-4 py-3 text-sm">
                                {part.stock_tracking_mode === 'branch' ? (
                                    <Badge variant="info">Branch</Badge>
                                ) : (
                                    <Badge variant="secondary">Global</Badge>
                                )}
                            </td> */}
                            <td className="px-4 py-3 text-sm">
                                {part.is_global ? (
                                    <Badge variant="success">Global</Badge>
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
                                    {/* {part.stock_tracking_mode === 'global' && ( */}
                                    <Button size="sm" variant="primary" onClick={() => openStockModal(part)} title="Add Stock">
                                        <Plus className="h-3 w-3 mr-1" />
                                        Stock
                                    </Button>
                                    {/* )} */}
                                </div>
                            </td>
                        </tr>
                    )}
                />

                {/* Pagination */}
                {
                    pagination.totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Showing page {pagination.page} of {pagination.totalPages} ({pagination.count} total parts)
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                        disabled={!pagination.hasPrevious}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                        disabled={!pagination.hasNext}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </Card >

            {/* Add/Edit Part Modal - Keeping the same modal from PartsManagement */}
            < Modal
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

                        {/* Only show Global checkbox for admins (not branch_admin) */}
                        {user?.role !== 'branch_admin' && (
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
                        )}

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            <span className="text-sm">Active</span>
                        </label>
                    </div>

                    {/* Show info for branch admin */}
                    {user?.role === 'branch_admin' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                                ℹ️ <strong>Branch Admin:</strong> Parts you create will only be available to your branch. Contact company admin to create global parts.
                            </p>
                        </div>
                    )}

                    {/* <Select
                        label="Stock Tracking Mode"
                        value={formData.stock_tracking_mode}
                        onChange={(e) => setFormData({ ...formData, stock_tracking_mode: e.target.value })}
                    >
                        <option value="global">Global - Single stock pool for all branches</option>
                        <option value="branch">Branch - Track stock separately per branch</option>
                    </Select> */}

                    {/* Info box when branch-specific */}
                    {!formData.is_global && user?.role !== 'branch_admin' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                                ℹ️ <strong>Branch-Specific Part:</strong>
                                {selectedPart
                                    ? ' Branch assignment is locked after creation.'
                                    : ' You must select a branch below since this part is not available to all branches.'}
                            </p>
                        </div>
                    )}

                    {/* Branch Selection - Show for all admins (except branch_admin) when is_global is false */}
                    {!formData.is_global && user?.role !== 'branch_admin' && (
                        selectedPart ? (
                            /* Read-only display when editing */
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

                    {/* Show branch info for branch admin (read-only) */}
                    {user?.role === 'branch_admin' && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700">
                                <strong>Branch:</strong> {branches.find(b => b.id === user?.branch)?.name || 'Your Branch'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">This part will only be available to your branch.</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {selectedPart ? 'Update Part' : 'Add Part'}
                        </Button>
                    </div>
                </form>
            </Modal >

            {/* Add Stock Modal */}
            < Modal
                isOpen={showStockModal}
                onClose={() => { setShowStockModal(false); setStockQuantity(''); setSelectedPart(null); }}
                title="Add Stock"
            >
                {selectedPart && (
                    <form onSubmit={handleAddStock} className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Part: <span className="font-semibold">{selectedPart.name}</span></p>
                            <p className="text-sm text-gray-600">Current Stock: <span className="font-semibold">{selectedPart.stock} {selectedPart.unit}</span></p>
                        </div>

                        <Input
                            label="Quantity to Add"
                            type="number"
                            required
                            value={stockQuantity}
                            onChange={(e) => setStockQuantity(e.target.value)}
                            placeholder="Enter quantity"
                        />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => { setShowStockModal(false); setStockQuantity(''); setSelectedPart(null); }}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                Add Stock
                            </Button>
                        </div>
                    </form>
                )}
            </Modal >
        </div >
    );
};

export default PartsCatalogTab;
