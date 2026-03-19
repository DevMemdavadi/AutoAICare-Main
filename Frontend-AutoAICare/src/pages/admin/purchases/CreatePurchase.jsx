import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Upload, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '../../../utils/api';

const CreatePurchase = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isBranchAdmin = user?.role === 'branch_admin';

    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [parts, setParts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [partSearch, setPartSearch] = useState({});

    const [formData, setFormData] = useState({
        supplier: '',
        branch: isBranchAdmin ? user.branch : '',
        purchase_date: new Date().toISOString().split('T')[0],
        due_date: '',
        supplier_invoice_number: '',
        payment_mode: 'cash',
        status: 'draft',
        notes: '',
        invoice_file: null
    });

    const [items, setItems] = useState([
        { part: '', quantity: 1, unit_price: 0, discount: 0, gst_rate: 18 }
    ]);

    useEffect(() => {
        fetchSuppliers();
        fetchParts();
        fetchBranches();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const response = await api.get('/accounting/vendors/');
            setSuppliers(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const fetchParts = async () => {
        try {
            console.log('Fetching all parts...');
            let allParts = [];
            let nextUrl = '/jobcards/parts/?page_size=100'; // Fetch 100 at a time

            // Fetch all pages
            while (nextUrl) {
                const response = await api.get(nextUrl);
                const data = response.data;

                if (data.results) {
                    allParts = [...allParts, ...data.results];
                    // Get next page URL (remove base URL if present)
                    nextUrl = data.next ? data.next.replace('http://localhost:8000/api', '') : null;
                } else {
                    // Non-paginated response
                    allParts = data;
                    nextUrl = null;
                }
            }

            console.log(`Fetched ${allParts.length} parts total`);
            setParts(allParts);
        } catch (error) {
            console.error('Error fetching parts:', error);
            console.error('Error response:', error.response?.data);
        }
    };

    const fetchBranches = async () => {
        try {
            const response = await api.get('/branches/');
            console.log('Branches response:', response.data);
            const branchesData = response.data.results || response.data;
            console.log('Branches data:', branchesData);
            setBranches(branchesData);
        } catch (error) {
            console.error('Error fetching branches:', error);
            console.error('Error response:', error.response?.data);
        }
    };

    const addItem = () => {
        setItems([...items, { part: '', quantity: 1, unit_price: 0, discount: 0, gst_rate: 18 }]);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // Auto-fill price when part is selected
        if (field === 'part' && value) {
            const selectedPart = parts.find(p => p.id === parseInt(value));
            if (selectedPart) {
                newItems[index].unit_price = selectedPart.cost_price || 0;
                newItems[index].gst_rate = selectedPart.gst_rate || 18;
            }
        }

        setItems(newItems);
    };

    const calculateItemTotal = (item) => {
        const baseAmount = (item.quantity * item.unit_price) - item.discount;
        const gstAmount = (baseAmount * item.gst_rate) / 100;
        return baseAmount + gstAmount;
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) =>
            sum + (item.quantity * item.unit_price), 0);
        const totalDiscount = items.reduce((sum, item) => sum + parseFloat(item.discount || 0), 0);
        const totalGst = items.reduce((sum, item) => {
            const baseAmount = (item.quantity * item.unit_price) - item.discount;
            return sum + (baseAmount * item.gst_rate) / 100;
        }, 0);
        const total = subtotal - totalDiscount + totalGst;

        return { subtotal, totalDiscount, totalGst, total };
    };

    const handleSubmit = async (e, submitStatus = 'pending_approval') => {
        e.preventDefault();

        // Validation
        if (!formData.supplier) {
            alert('Please select a supplier');
            return;
        }

        if (items.length === 0 || items.some(item => !item.part)) {
            alert('Please add at least one item with a valid part');
            return;
        }

        setLoading(true);
        try {
            const itemsData = items.map(item => ({
                part: parseInt(item.part),
                quantity: parseFloat(item.quantity),
                unit_price: parseFloat(item.unit_price),
                discount: parseFloat(item.discount || 0),
                gst_rate: parseFloat(item.gst_rate),
                batch_number: item.batch_number || '',
                expiry_date: item.expiry_date || null
            }));

            // Handle file upload
            if (formData.invoice_file) {
                const formDataWithFile = new FormData();

                // Add all form fields
                formDataWithFile.append('supplier', formData.supplier);
                if (formData.branch) formDataWithFile.append('branch', formData.branch);
                formDataWithFile.append('purchase_date', formData.purchase_date);
                if (formData.due_date) formDataWithFile.append('due_date', formData.due_date);
                if (formData.supplier_invoice_number) formDataWithFile.append('supplier_invoice_number', formData.supplier_invoice_number);
                formDataWithFile.append('payment_mode', formData.payment_mode);
                formDataWithFile.append('status', submitStatus);
                if (formData.notes) formDataWithFile.append('notes', formData.notes);

                // Add items as JSON string
                formDataWithFile.append('items', JSON.stringify(itemsData));

                // Add file
                formDataWithFile.append('invoice_file', formData.invoice_file);

                console.log('Submitting with file - FormData entries:');
                for (let pair of formDataWithFile.entries()) {
                    console.log(pair[0], pair[1]);
                }

                await api.post('/purchases/purchases/', formDataWithFile, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                const purchaseData = {
                    ...formData,
                    status: submitStatus,
                    items: itemsData
                };

                console.log('Submitting purchase data:', purchaseData);
                await api.post('/purchases/purchases/', purchaseData);
            }

            alert('Purchase created successfully!');
            navigate('/admin/inventory?tab=purchases');
        } catch (error) {
            console.error('Error creating purchase:', error);
            console.error('Error response:', error.response?.data);
            const errorMsg = error.response?.data?.error || JSON.stringify(error.response?.data) || 'Failed to create purchase';
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const totals = calculateTotals();

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Purchase</h1>
                    <p className="text-gray-600 mt-1">Add a new purchase order</p>
                </div>
                <button
                    onClick={() => navigate('/admin/inventory?tab=purchases')}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    <X size={20} />
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Supplier <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select Supplier</option>
                                {suppliers.map(supplier => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                            <select
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${isBranchAdmin ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                disabled={isBranchAdmin}
                            >
                                <option value="">Select Branch</option>
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Purchase Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.purchase_date}
                                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Supplier Invoice Number
                            </label>
                            <input
                                type="text"
                                value={formData.supplier_invoice_number}
                                onChange={(e) => setFormData({ ...formData, supplier_invoice_number: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Supplier's invoice number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                            <select
                                value={formData.payment_mode}
                                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="upi">UPI</option>
                                <option value="cheque">Cheque</option>
                                <option value="credit">Credit</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Upload Invoice (PDF/Image)
                            </label>
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setFormData({ ...formData, invoice_file: e.target.files[0] })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>
                </div>

                {/* Purchase Items */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Purchase Items</h2>
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus size={18} />
                            Add Item
                        </button>
                    </div>

                    <div>
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST %</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {items.map((item, index) => {
                                    const selectedPart = parts.find(p => p.id === parseInt(item.part));
                                    const searchTerm = partSearch[index] || '';
                                    const filteredParts = parts.filter(part => {
                                        if (!searchTerm) return true;
                                        const search = searchTerm.toLowerCase();
                                        return part.name.toLowerCase().includes(search) ||
                                            part.sku.toLowerCase().includes(search);
                                    });
                                    const showDropdown = partSearch[index] !== undefined && !selectedPart;

                                    return (
                                        <tr key={index}>
                                            <td className="px-4 py-2">
                                                <div className="relative min-w-[300px]">
                                                    {/* Display selected part or search input */}
                                                    {selectedPart ? (
                                                        <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                            <div className="flex-1">
                                                                <div className="font-medium text-gray-900">{selectedPart.name}</div>
                                                                <div className="text-xs text-gray-600">
                                                                    SKU: {selectedPart.sku} • Cost: ₹{selectedPart.cost_price}
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    updateItem(index, 'part', '');
                                                                    setPartSearch({ ...partSearch, [index]: '' });
                                                                }}
                                                                className="ml-2 text-gray-400 hover:text-gray-600"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <input
                                                                type="text"
                                                                placeholder="Search parts by name or SKU..."
                                                                value={searchTerm}
                                                                onChange={(e) => setPartSearch({ ...partSearch, [index]: e.target.value })}
                                                                onFocus={() => {
                                                                    if (partSearch[index] === undefined) {
                                                                        setPartSearch({ ...partSearch, [index]: '' });
                                                                    }
                                                                }}
                                                                onBlur={() => {
                                                                    setTimeout(() => {
                                                                        if (!item.part) {
                                                                            const newSearch = { ...partSearch };
                                                                            delete newSearch[index];
                                                                            setPartSearch(newSearch);
                                                                        }
                                                                    }, 200);
                                                                }}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            />

                                                            {showDropdown && (
                                                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
                                                                    {filteredParts.length > 0 ? (
                                                                        <div className="py-2">
                                                                            {filteredParts.slice(0, 20).map(part => (
                                                                                <button
                                                                                    key={part.id}
                                                                                    type="button"
                                                                                    onMouseDown={(e) => {
                                                                                        e.preventDefault();
                                                                                        updateItem(index, 'part', part.id.toString());
                                                                                        const newSearch = { ...partSearch };
                                                                                        delete newSearch[index];
                                                                                        setPartSearch(newSearch);
                                                                                    }}
                                                                                    className="w-full px-4 py-2.5 text-left hover:bg-blue-50/80 transition-all group flex flex-col gap-0.5"
                                                                                >
                                                                                    <div className="font-semibold text-gray-800 group-hover:text-blue-700">{part.name}</div>
                                                                                    <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                                                                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded capitalize">SKU: {part.sku}</span>
                                                                                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded italic">Cost: ₹{part.cost_price}</span>
                                                                                        <span className={`px-1.5 py-0.5 rounded ${part.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                                                            Stock: {part.stock}
                                                                                        </span>
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                            {filteredParts.length > 20 && (
                                                                                <div className="px-4 py-2 text-[10px] text-gray-400 font-medium bg-gray-50/50 sticky bottom-0 border-t border-gray-100">
                                                                                    Showing 20 of {filteredParts.length} results. Continue typing to filter...
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="px-4 py-8 text-sm text-gray-400 text-center italic">
                                                                            No parts found matching "{searchTerm}"
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    min="0.01"
                                                    step="0.01"
                                                    required
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                                    className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={item.discount}
                                                    onChange={(e) => updateItem(index, 'discount', e.target.value)}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={item.gst_rate}
                                                    onChange={(e) => updateItem(index, 'gst_rate', e.target.value)}
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-4 py-2 font-medium">
                                                ₹{calculateItemTotal(item).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="text-red-600 hover:text-red-900"
                                                    disabled={items.length === 1}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="mt-6 border-t pt-4">
                        <div className="flex justify-end">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Discount:</span>
                                    <span className="font-medium text-red-600">-₹{totals.totalDiscount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">GST:</span>
                                    <span className="font-medium">₹{totals.totalGst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t pt-2">
                                    <span>Total:</span>
                                    <span className="text-blue-600">₹{totals.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, 'draft')}
                        disabled={loading}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                        <Save size={18} className="inline mr-2" />
                        Save as Draft
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Purchase'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreatePurchase;
