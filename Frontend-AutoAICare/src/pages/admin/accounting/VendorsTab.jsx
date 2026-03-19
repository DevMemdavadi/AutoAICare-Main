import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { Alert, Card, Button, Modal, Input, Textarea } from '@/components/ui';
import {
    Plus, Edit, Trash2, Search, Building, Phone, Mail,
    FileText, DollarSign, Eye
} from 'lucide-react';
import { StatCardSkeleton, CardSkeleton } from './SkeletonLoaders';

const VendorsTab = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [showExpensesModal, setShowExpensesModal] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [vendorExpenses, setVendorExpenses] = useState([]);
    const [filters, setFilters] = useState({
        search: '',
        is_active: 'true'
    });

    const [vendorForm, setVendorForm] = useState({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        gst_number: '',
        pan_number: '',
        payment_terms: '',
        notes: '',
        is_active: true
    });

    // Alert state
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

    useEffect(() => {
        fetchVendors();
    }, [filters]);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== '') params.append(key, value);
            });
            const response = await api.get(`/accounting/vendors/?${params}`);
            setVendors(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendorExpenses = async (vendorId) => {
        try {
            const response = await api.get(`/accounting/vendors/${vendorId}/expenses/`);
            setVendorExpenses(response.data || []);
        } catch (error) {
            console.error('Error fetching vendor expenses:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingVendor) {
                await api.put(`/accounting/vendors/${editingVendor.id}/`, vendorForm);
            } else {
                await api.post('/accounting/vendors/', vendorForm);
            }
            setShowVendorModal(false);
            setEditingVendor(null);
            resetForm();
            fetchVendors();
        } catch (error) {
            console.error('Error saving vendor:', error);
            showAlert('error', 'Error saving vendor: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEdit = (vendor) => {
        setEditingVendor(vendor);
        setVendorForm({
            name: vendor.name,
            contact_person: vendor.contact_person || '',
            email: vendor.email || '',
            phone: vendor.phone || '',
            address: vendor.address || '',
            gst_number: vendor.gst_number || '',
            pan_number: vendor.pan_number || '',
            payment_terms: vendor.payment_terms || '',
            notes: vendor.notes || '',
            is_active: vendor.is_active
        });
        setShowVendorModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this vendor?')) {
            try {
                await api.delete(`/accounting/vendors/${id}/`);
                fetchVendors();
            } catch (error) {
                console.error('Error deleting vendor:', error);
                showAlert('error', 'Error deleting vendor');
            }
        }
    };

    const handleViewExpenses = async (vendor) => {
        setSelectedVendor(vendor);
        await fetchVendorExpenses(vendor.id);
        setShowExpensesModal(true);
    };

    const resetForm = () => {
        setVendorForm({
            name: '',
            contact_person: '',
            email: '',
            phone: '',
            address: '',
            gst_number: '',
            pan_number: '',
            payment_terms: '',
            notes: '',
            is_active: true
        });
    };

    const totalVendorExpenses = vendors.reduce((sum, v) => sum + (v.total_expenses || 0), 0);
    const activeVendors = vendors.filter(v => v.is_active).length;

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

            {loading ? (
                <>
                    {/* Summary Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </div>
                    {/* Filters Skeleton */}
                    <Card className="p-4">
                        <div className="animate-pulse flex gap-4">
                            <div className="flex-1 h-10 bg-gray-200 rounded"></div>
                            <div className="h-10 w-32 bg-gray-200 rounded"></div>
                            <div className="h-10 w-32 bg-gray-200 rounded"></div>
                        </div>
                    </Card>
                    {/* Vendor Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                </>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Vendors</p>
                                    <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
                                </div>
                                <Building className="text-blue-600" size={32} />
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Active Vendors</p>
                                    <p className="text-2xl font-bold text-green-600">{activeVendors}</p>
                                </div>
                                <Building className="text-green-600" size={32} />
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Payments</p>
                                    <p className="text-2xl font-bold text-purple-600">₹{totalVendorExpenses.toLocaleString()}</p>
                                </div>
                                <DollarSign className="text-purple-600" size={32} />
                            </div>
                        </Card>
                    </div>

                    {/* Filters & Actions */}
                    <Card className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search vendors..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    icon={Search}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={filters.is_active === 'true' ? 'primary' : 'outline'}
                                    onClick={() => setFilters({ ...filters, is_active: filters.is_active === 'true' ? '' : 'true' })}
                                >
                                    Active Only
                                </Button>
                                <Button onClick={() => setShowVendorModal(true)} className="flex items-center gap-2">
                                    <Plus size={16} />
                                    Add Vendor
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Vendors Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vendors.length === 0 ? (
                            <Card className="p-8 col-span-full text-center">
                                <Building className="mx-auto text-gray-400 mb-4" size={48} />
                                <p className="text-gray-500">No vendors found. Add your first vendor to get started.</p>
                            </Card>
                        ) : (
                            vendors.map((vendor) => (
                                <Card key={vendor.id} className="p-6 hover:shadow-lg transition-shadow duration-200">
                                    <div className="space-y-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-lg text-gray-900">{vendor.name}</h3>
                                                {vendor.contact_person && (
                                                    <p className="text-sm text-gray-500">{vendor.contact_person}</p>
                                                )}
                                            </div>
                                            <div className={`px-2 py-1 text-xs font-medium rounded-full ${vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {vendor.is_active ? 'Active' : 'Inactive'}
                                            </div>
                                        </div>

                                        {/* Contact Info */}
                                        <div className="space-y-2 text-sm">
                                            {vendor.phone && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Phone size={14} />
                                                    <span>{vendor.phone}</span>
                                                </div>
                                            )}
                                            {vendor.email && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Mail size={14} />
                                                    <span>{vendor.email}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Tax Details */}
                                        {(vendor.gst_number || vendor.pan_number) && (
                                            <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-xs">
                                                {vendor.gst_number && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">GST:</span>
                                                        <span className="font-mono">{vendor.gst_number}</span>
                                                    </div>
                                                )}
                                                {vendor.pan_number && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">PAN:</span>
                                                        <span className="font-mono">{vendor.pan_number}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Payment Terms */}
                                        {vendor.payment_terms && (
                                            <div className="text-sm">
                                                <span className="text-gray-600">Payment Terms: </span>
                                                <span className="font-medium">{vendor.payment_terms}</span>
                                            </div>
                                        )}

                                        {/* Total Expenses */}
                                        <div className="border-t pt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Total Paid:</span>
                                                <span className="text-lg font-bold text-purple-600">
                                                    ₹{(vendor.total_expenses || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2 border-t">
                                            <button
                                                onClick={() => handleViewExpenses(vendor)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Eye size={16} />
                                                View Expenses
                                            </button>
                                            <button
                                                onClick={() => handleEdit(vendor)}
                                                className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(vendor.id)}
                                                className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Add/Edit Vendor Modal */}
            <Modal
                isOpen={showVendorModal}
                onClose={() => {
                    setShowVendorModal(false);
                    setEditingVendor(null);
                    resetForm();
                }}
                title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <Input
                        label="Vendor Name"
                        value={vendorForm.name}
                        onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                        required
                        placeholder="e.g., ABC Auto Parts"
                    />

                    <Input
                        label="Contact Person"
                        value={vendorForm.contact_person}
                        onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
                        placeholder="e.g., John Doe"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Email"
                            type="email"
                            value={vendorForm.email}
                            onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                            placeholder="vendor@example.com"
                        />
                        <Input
                            label="Phone"
                            value={vendorForm.phone}
                            onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                            placeholder="9876543210"
                        />
                    </div>

                    <Textarea
                        label="Address"
                        value={vendorForm.address}
                        onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                        placeholder="Full address..."
                        rows={2}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="GST Number"
                            value={vendorForm.gst_number}
                            onChange={(e) => setVendorForm({ ...vendorForm, gst_number: e.target.value })}
                            placeholder="27AABCU9603R1ZM"
                        />
                        <Input
                            label="PAN Number"
                            value={vendorForm.pan_number}
                            onChange={(e) => setVendorForm({ ...vendorForm, pan_number: e.target.value })}
                            placeholder="AABCU9603R"
                        />
                    </div>

                    <Input
                        label="Payment Terms"
                        value={vendorForm.payment_terms}
                        onChange={(e) => setVendorForm({ ...vendorForm, payment_terms: e.target.value })}
                        placeholder="e.g., Net 30, COD"
                    />

                    <Textarea
                        label="Notes"
                        value={vendorForm.notes}
                        onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                        placeholder="Any additional notes..."
                        rows={2}
                    />

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={vendorForm.is_active}
                            onChange={(e) => setVendorForm({ ...vendorForm, is_active: e.target.checked })}
                            className="rounded border-gray-300"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                            Active Vendor
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowVendorModal(false);
                                setEditingVendor(null);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingVendor ? 'Update Vendor' : 'Save Vendor'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Vendor Expenses Modal */}
            <Modal
                isOpen={showExpensesModal}
                onClose={() => {
                    setShowExpensesModal(false);
                    setSelectedVendor(null);
                    setVendorExpenses([]);
                }}
                title={`Expenses - ${selectedVendor?.name || ''}`}
            >
                <div className="space-y-4">
                    {vendorExpenses.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No expenses found for this vendor.</p>
                    ) : (
                        <>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Total Expenses:</span>
                                    <span className="text-2xl font-bold text-purple-600">
                                        ₹{vendorExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="max-h-96 overflow-y-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {vendorExpenses.map((expense) => (
                                            <tr key={expense.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                    {new Date(expense.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{expense.title}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                    ₹{parseFloat(expense.amount).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${expense.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                                        expense.payment_status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {expense.payment_status_display || expense.payment_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default VendorsTab;
