import { Input, Modal, Select, Textarea, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { FileText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

const ExpenseFormModal = ({ isOpen, onClose, onSuccess, editingExpense = null }) => {
    const { user } = useAuth();
    const [vendors, setVendors] = useState([]);
    const [branches, setBranches] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [showVendorModal, setShowVendorModal] = useState(false);
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

    const [expenseForm, setExpenseForm] = useState({
        title: '',
        amount: '',
        category: 'other',
        date: new Date().toISOString().split('T')[0],
        description: '',
        vendor: '',
        vendor_name: '',
        branch: '',
        payment_status: 'paid',
        payment_method: 'cash',
        partial_amount: '',
        receipt: null
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

    useEffect(() => {
        if (isOpen) {
            fetchVendorsAndBranches();
            if (editingExpense) {
                setExpenseForm({
                    title: editingExpense.title,
                    amount: editingExpense.amount,
                    category: editingExpense.category,
                    date: editingExpense.date,
                    description: editingExpense.description || '',
                    vendor: editingExpense.vendor || '',
                    vendor_name: editingExpense.vendor_name || '',
                    branch: editingExpense.branch || user?.branch || '',
                    payment_status: editingExpense.payment_status,
                    payment_method: editingExpense.payment_method || 'cash',
                    partial_amount: editingExpense.partial_amount || '',
                    receipt: null
                });
            } else {
                resetForm();
            }
        }
    }, [isOpen, editingExpense, user]);

    const fetchVendorsAndBranches = async () => {
        try {
            const [vendorsRes, branchesRes] = await Promise.all([
                api.get('/accounting/vendors/'),
                api.get('/branches/')
            ]);
            setVendors(vendorsRes.data.results || []);
            setBranches(branchesRes.data.results || []);
        } catch (error) {
            console.error('Error fetching vendors/branches:', error);
        }
    };

    const resetForm = () => {
        setExpenseForm({
            title: '',
            amount: '',
            category: 'other',
            date: new Date().toISOString().split('T')[0],
            description: '',
            vendor: '',
            vendor_name: '',
            branch: user?.branch || '',
            payment_status: 'paid',
            payment_method: 'cash',
            partial_amount: '',
            receipt: null
        });
    };

    const validateReceipt = (file) => {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

        if (file.size > maxSize) {
            alert(`File size must be less than 5MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            alert('Only PDF and image files (JPG, PNG) are allowed');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate receipt if present
        if (expenseForm.receipt && expenseForm.receipt instanceof File) {
            if (!validateReceipt(expenseForm.receipt)) {
                return;
            }
        }

        try {
            setSubmitting(true);
            const formData = new FormData();
            Object.entries(expenseForm).forEach(([key, value]) => {
                if (key === 'receipt') {
                    return;
                }
                if (value !== null && value !== '' && value !== undefined) {
                    formData.append(key, value);
                }
            });

            if (expenseForm.receipt && expenseForm.receipt instanceof File) {
                formData.append('receipt', expenseForm.receipt);
            }

            if (editingExpense) {
                await api.put(`/accounting/expenses/${editingExpense.id}/`, formData);
            } else {
                await api.post('/accounting/expenses/', formData);
            }

            resetForm();
            onClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error saving expense:', error);
            if (error.response?.data?.receipt) {
                alert(`Receipt upload error: ${error.response.data.receipt[0]}`);
            } else {
                alert('Failed to save expense. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleCreateVendor = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/accounting/vendors/', vendorForm);
            const newVendor = response.data;

            // Refresh vendors list
            await fetchVendorsAndBranches();

            // Auto-select the newly created vendor
            setExpenseForm({ ...expenseForm, vendor: newVendor.id });

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

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title={editingExpense ? 'Edit Expense' : 'Add Expense'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <Input
                        label="Title"
                        value={expenseForm.title}
                        onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                        required
                        placeholder="e.g., Office Supplies"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Amount"
                            type="number"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            required
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                        />
                        <Input
                            label="Date"
                            type="date"
                            value={expenseForm.date}
                            onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                            required
                        />
                    </div>

                    <Select
                        label="Category"
                        value={expenseForm.category}
                        onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                        options={categoryOptions}
                    />

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Vendor (Optional)
                            </label>
                            <div className="relative">
                                <Select
                                    value={expenseForm.vendor}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                                    options={[
                                        { value: '', label: 'Select Vendor' },
                                        ...vendors.map(v => ({ value: v.id, label: v.name }))
                                    ]}
                                    className="pr-12" // Add padding to the right for the button
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowVendorModal(true)}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 whitespace-nowrap px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 text-xs rounded-md"
                                    title="Add New Vendor"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        {/* <Input
                            label="Or Vendor Name"
                            value={expenseForm.vendor_name}
                            onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })}
                            placeholder="Vendor name"
                        /> */}
                    </div>

                    {['super_admin', 'company_admin'].includes(user?.role) && (
                        <Select
                            label="Branch"
                            value={expenseForm.branch}
                            onChange={(e) => setExpenseForm({ ...expenseForm, branch: e.target.value })}
                            required
                            options={[
                                { value: '', label: 'Select Branch' },
                                { value: 'all', label: 'Global / General' },
                                ...branches.map(b => ({ value: b.id, label: b.name }))
                            ]}
                        />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Payment Status"
                            value={expenseForm.payment_status}
                            onChange={(e) => setExpenseForm({ ...expenseForm, payment_status: e.target.value, partial_amount: e.target.value === 'partial' ? expenseForm.partial_amount : '' })}
                            options={[
                                { value: 'paid', label: 'Paid' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'partial', label: 'Partially Paid' }
                            ]}
                        />

                        <Select
                            label="Payment Method"
                            value={expenseForm.payment_method}
                            onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                            options={[
                                { value: 'cash', label: 'Cash' },
                                { value: 'online', label: 'Online' }
                            ]}
                        />
                    </div>

                    {expenseForm.payment_status === 'partial' && (
                        <Input
                            label="Partial Amount Paid"
                            type="number"
                            value={expenseForm.partial_amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, partial_amount: e.target.value })}
                            required
                            placeholder="Enter amount paid"
                            min="0"
                            step="0.01"
                            max={expenseForm.amount}
                        />
                    )}

                    <Textarea
                        label="Description"
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                        placeholder="Optional details..."
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Receipt (PDF/Image)
                        </label>

                        {editingExpense && editingExpense.receipt && (
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText size={16} className="text-blue-600" />
                                    <span className="text-sm text-blue-700">Current receipt attached</span>
                                </div>
                                <a
                                    href={editingExpense.receipt}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                                >
                                    View
                                </a>
                            </div>
                        )}

                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    if (validateReceipt(file)) {
                                        setExpenseForm({ ...expenseForm, receipt: file });
                                    } else {
                                        e.target.value = '';
                                    }
                                } else {
                                    setExpenseForm({ ...expenseForm, receipt: null });
                                }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            {editingExpense && editingExpense.receipt
                                ? 'Upload a new file to replace the current receipt (PDF or Image, Max 5MB)'
                                : 'Upload receipt (PDF or Image, Max 5MB)'
                            }
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Add New Vendor Modal */}
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

            {/* Add New Vendor Modal */}
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
        </>
    );
};

export default ExpenseFormModal;
