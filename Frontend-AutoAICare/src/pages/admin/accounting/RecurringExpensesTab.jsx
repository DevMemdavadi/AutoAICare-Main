import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { Card, Button, Input, Select, Modal, Textarea } from '@/components/ui';
import {
    RefreshCw,
    Plus,
    Edit,
    Trash2,
    Pause,
    Play,
    Calendar,
    DollarSign,
    Clock,
    AlertCircle,
    CheckCircle,
    XCircle
} from 'lucide-react';

const RecurringExpensesTab = () => {
    const { user } = useAuth();
    const { currentBranch, branches } = useBranch();

    const [recurringExpenses, setRecurringExpenses] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showVendorModal, setShowVendorModal] = useState(false);

    // Filters
    const [filterActive, setFilterActive] = useState('all');
    const [filterFrequency, setFilterFrequency] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        category: 'utilities',
        amount: '',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        vendor: '',
        branch: '',
        description: '',
        auto_generate: true,
        is_active: true
    });

    // Vendor form state
    const [vendorForm, setVendorForm] = useState({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        gst_number: '',
        pan_number: '',
        payment_terms: '',
        notes: ''
    });

    const categoryOptions = [
        { value: 'inventory', label: 'Inventory Purchase' },
        { value: 'salary', label: 'Salary/Wages' },
        { value: 'utilities', label: 'Utilities' },
        { value: 'rent', label: 'Rent' },
        { value: 'maintenance', label: 'Maintenance & Repairs' },
        { value: 'marketing', label: 'Marketing & Advertising' },
        { value: 'software', label: 'Software & Subscriptions' },
        { value: 'equipment', label: 'Equipment Purchase' },
        { value: 'supplies', label: 'Office Supplies' },
        { value: 'fuel', label: 'Fuel & Transport' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'taxes', label: 'Taxes & Fees' },
        { value: 'other', label: 'Other' }
    ];

    const frequencyOptions = [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'yearly', label: 'Yearly' }
    ];

    useEffect(() => {
        fetchRecurringExpenses();
        fetchVendors();
    }, [filterActive, filterFrequency]);

    const fetchRecurringExpenses = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterActive !== 'all') {
                params.is_active = filterActive === 'active';
            }
            if (filterFrequency) {
                params.frequency = filterFrequency;
            }

            const response = await api.get('/accounting/recurring-expenses/', { params });
            const data = response.data.results || response.data;
            setRecurringExpenses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching recurring expenses:', error);
            setRecurringExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const response = await api.get('/accounting/vendors/');
            const data = response.data.results || response.data;
            setVendors(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching vendors:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                branch: formData.branch || currentBranch?.id || null,
                vendor: formData.vendor || null,
                end_date: formData.end_date || null
            };

            if (editingId) {
                await api.put(`/accounting/recurring-expenses/${editingId}/`, payload);
            } else {
                await api.post('/accounting/recurring-expenses/', payload);
            }

            setShowModal(false);
            resetForm();
            fetchRecurringExpenses();
        } catch (error) {
            console.error('Error saving recurring expense:', error);
            alert('Failed to save: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEdit = (expense) => {
        setEditingId(expense.id);
        setFormData({
            title: expense.title,
            category: expense.category,
            amount: expense.amount,
            frequency: expense.frequency,
            start_date: expense.start_date,
            end_date: expense.end_date || '',
            vendor: expense.vendor || '',
            branch: expense.branch || '',
            description: expense.description || '',
            auto_generate: expense.auto_generate,
            is_active: expense.is_active
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this recurring expense?')) return;

        try {
            await api.delete(`/accounting/recurring-expenses/${id}/`);
            fetchRecurringExpenses();
        } catch (error) {
            console.error('Error deleting recurring expense:', error);
            alert('Failed to delete: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleToggleActive = async (expense) => {
        try {
            await api.patch(`/accounting/recurring-expenses/${expense.id}/`, {
                is_active: !expense.is_active
            });
            fetchRecurringExpenses();
        } catch (error) {
            console.error('Error toggling status:', error);
            alert('Failed to update status: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleProcessRecurring = async () => {
        if (!confirm('This will generate expenses for all due recurring items. Continue?')) return;

        try {
            const response = await api.post('/accounting/recurring-expenses/process_recurring/');
            alert(`Successfully processed ${response.data.count} recurring expenses!`);
            fetchRecurringExpenses();
        } catch (error) {
            console.error('Error processing recurring expenses:', error);
            alert('Failed to process: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleCreateVendor = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/accounting/vendors/', vendorForm);
            const newVendor = response.data;

            //Refresh vendors list
            await fetchVendors();

            // Auto-select the newly created vendor
            setFormData({ ...formData, vendor: newVendor.id });

            // Close vendor modal and reset form
            setShowVendorModal(false);
            setVendorForm({
                name: '',
                contact_person: '',
                email: '',
                phone: '',
                address: '',
                gst_number: '',
                pan_number: '',
                payment_terms: '',
                notes: ''
            });
        } catch (error) {
            console.error('Error creating vendor:', error);
            alert('Failed to create vendor: ' + (error.response?.data?.detail || error.message));
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            title: '',
            category: 'utilities',
            amount: '',
            frequency: 'monthly',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            vendor: '',
            branch: '',
            description: '',
            auto_generate: true,
            is_active: true
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getNextDueDate = (expense) => {
        if (!expense.last_generated_date) {
            return expense.start_date;
        }

        const lastDate = new Date(expense.last_generated_date);
        const today = new Date();

        switch (expense.frequency) {
            case 'daily':
                lastDate.setDate(lastDate.getDate() + 1);
                break;
            case 'weekly':
                lastDate.setDate(lastDate.getDate() + 7);
                break;
            case 'monthly':
                lastDate.setMonth(lastDate.getMonth() + 1);
                break;
            case 'quarterly':
                lastDate.setMonth(lastDate.getMonth() + 3);
                break;
            case 'yearly':
                lastDate.setFullYear(lastDate.getFullYear() + 1);
                break;
        }

        return lastDate.toISOString().split('T')[0];
    };

    const isDue = (expense) => {
        const nextDue = new Date(getNextDueDate(expense));
        const today = new Date();
        return nextDue <= today;
    };

    // Calculate summary stats
    const stats = {
        total: recurringExpenses.length,
        active: recurringExpenses.filter(e => e.is_active).length,
        paused: recurringExpenses.filter(e => !e.is_active).length,
        due: recurringExpenses.filter(e => e.is_active && isDue(e)).length,
        monthlyTotal: recurringExpenses
            .filter(e => e.is_active && e.frequency === 'monthly')
            .reduce((sum, e) => sum + parseFloat(e.amount), 0)
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <RefreshCw className="text-blue-600" size={28} />
                        Recurring Expenses
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Manage automated recurring expense templates
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
                        <Plus size={16} />
                        Add Template
                    </Button>
                    <Button variant="outline" onClick={handleProcessRecurring} className="flex items-center gap-2">
                        <RefreshCw size={16} />
                        Process Due
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium opacity-90">Total Templates</span>
                            <RefreshCw size={20} className="opacity-75" />
                        </div>
                        <div className="text-3xl font-bold">{stats.total}</div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium opacity-90">Active</span>
                            <CheckCircle size={20} className="opacity-75" />
                        </div>
                        <div className="text-3xl font-bold">{stats.active}</div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium opacity-90">Paused</span>
                            <Pause size={20} className="opacity-75" />
                        </div>
                        <div className="text-3xl font-bold">{stats.paused}</div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium opacity-90">Due Now</span>
                            <AlertCircle size={20} className="opacity-75" />
                        </div>
                        <div className="text-3xl font-bold">{stats.due}</div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium opacity-90">Monthly Total</span>
                            <DollarSign size={20} className="opacity-75" />
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(stats.monthlyTotal)}</div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card title="Filters">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                        label="Status"
                        value={filterActive}
                        onChange={(e) => setFilterActive(e.target.value)}
                        options={[
                            { value: 'all', label: 'All' },
                            { value: 'active', label: 'Active Only' },
                            { value: 'paused', label: 'Paused Only' }
                        ]}
                    />
                    <Select
                        label="Frequency"
                        value={filterFrequency}
                        onChange={(e) => setFilterFrequency(e.target.value)}
                        options={[
                            { value: '', label: 'All Frequencies' },
                            ...frequencyOptions
                        ]}
                    />
                    <div className="flex items-end">
                        <Button variant="outline" onClick={() => {
                            setFilterActive('all');
                            setFilterFrequency('');
                        }} className="w-full">
                            Clear Filters
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Recurring Expenses Table */}
            <Card title="Recurring Expense Templates">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-gray-600">Loading templates...</p>
                    </div>
                ) : recurringExpenses.length === 0 ? (
                    <div className="text-center py-12">
                        <RefreshCw className="mx-auto text-gray-400" size={48} />
                        <p className="mt-4 text-gray-600">No recurring expenses found</p>
                        <Button onClick={() => { resetForm(); setShowModal(true); }} className="mt-4">
                            Create First Template
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Due</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Generated</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {recurringExpenses.map((expense) => (
                                    <tr key={expense.id} className={`hover:bg-gray-50 ${!expense.is_active ? 'opacity-60' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900">{expense.title}</div>
                                            {expense.description && (
                                                <div className="text-xs text-gray-500">{expense.description}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{expense.category}</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                            {formatCurrency(expense.amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                                {expense.frequency}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            <div className="flex items-center gap-1">
                                                {isDue(expense) && expense.is_active && (
                                                    <AlertCircle size={14} className="text-orange-500" />
                                                )}
                                                {new Date(getNextDueDate(expense)).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {expense.last_generated_date
                                                ? new Date(expense.last_generated_date).toLocaleDateString()
                                                : 'Never'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {expense.is_active ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle size={12} className="mr-1" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    <Pause size={12} className="mr-1" />
                                                    Paused
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleToggleActive(expense)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title={expense.is_active ? 'Pause' : 'Resume'}
                                                >
                                                    {expense.is_active ? <Pause size={16} /> : <Play size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(expense)}
                                                    className="text-green-600 hover:text-green-800"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
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

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={editingId ? 'Edit Recurring Expense' : 'Add Recurring Expense Template'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <Input
                        label="Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="e.g., Monthly Rent"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            options={categoryOptions}
                            required
                        />

                        <Input
                            type="number"
                            label="Amount"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                        />
                    </div>

                    <Select
                        label="Frequency"
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                        options={frequencyOptions}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="date"
                            label="Start Date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            required
                        />

                        <Input
                            type="date"
                            label="End Date (Optional)"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            placeholder="Leave blank for indefinite"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Vendor (Optional)
                            </label>
                            <div className="relative">
                                <Select
                                    value={formData.vendor}
                                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                                    options={[
                                        { value: '', label: 'Select Vendor' },
                                        ...vendors.map(v => ({ value: v.id, label: v.name }))
                                    ]}
                                    className="pr-12" // Add padding to the right for the button
                                />
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={() => setShowVendorModal(true)}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 whitespace-nowrap px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 text-xs"
                                    title="Add New Vendor"
                                >
                                    <Plus size={14} />
                                </Button>
                            </div>
                        </div>

                        {['super_admin', 'company_admin', 'branch_admin'].includes(user?.role) && (
                            <Select
                                label="Branch (Optional)"
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                options={[
                                    { value: '', label: 'Select Branch' },
                                    ...branches.map(b => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        )}
                    </div>

                    <Textarea
                        label="Description (Optional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Additional details..."
                        rows={3}
                    />

                    <div className="space-y-2">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.auto_generate}
                                onChange={(e) => setFormData({ ...formData, auto_generate: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Auto-generate expenses</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Active</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingId ? 'Update Template' : 'Create Template'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Add Vendor Modal */}
            <Modal
                isOpen={showVendorModal}
                onClose={() => {
                    setShowVendorModal(false);
                    setVendorForm({
                        name: '',
                        contact_person: '',
                        email: '',
                        phone: '',
                        address: '',
                        gst_number: '',
                        pan_number: '',
                        payment_terms: '',
                        notes: ''
                    });
                }}
                title="Add New Vendor"
            >
                <form onSubmit={handleCreateVendor} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <Input
                        label="Vendor Name"
                        value={vendorForm.name}
                        onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                        required
                        placeholder="e.g., ABC Suppliers Ltd."
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Contact Person"
                            value={vendorForm.contact_person}
                            onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
                            placeholder="Contact name"
                        />

                        <Input
                            type="email"
                            label="Email"
                            value={vendorForm.email}
                            onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                            placeholder="vendor@example.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="tel"
                            label="Phone"
                            value={vendorForm.phone}
                            onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                            placeholder="Phone number"
                            maxLength={15}
                        />

                        <Input
                            label="Payment Terms"
                            value={vendorForm.payment_terms}
                            onChange={(e) => setVendorForm({ ...vendorForm, payment_terms: e.target.value })}
                            placeholder="e.g., Net 30, COD"
                        />
                    </div>

                    <Textarea
                        label="Address"
                        value={vendorForm.address}
                        onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                        placeholder="Full address"
                        rows={2}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="GST Number"
                            value={vendorForm.gst_number}
                            onChange={(e) => setVendorForm({ ...vendorForm, gst_number: e.target.value })}
                            placeholder="GST Number"
                            maxLength={50}
                        />

                        <Input
                            label="PAN Number"
                            value={vendorForm.pan_number}
                            onChange={(e) => setVendorForm({ ...vendorForm, pan_number: e.target.value })}
                            placeholder="PAN Number"
                            maxLength={20}
                        />
                    </div>

                    <Textarea
                        label="Notes"
                        value={vendorForm.notes}
                        onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                        placeholder="Additional notes..."
                        rows={2}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowVendorModal(false);
                                setVendorForm({
                                    name: '',
                                    contact_person: '',
                                    email: '',
                                    phone: '',
                                    address: '',
                                    gst_number: '',
                                    pan_number: '',
                                    payment_terms: '',
                                    notes: ''
                                });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            Create Vendor
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RecurringExpensesTab;
