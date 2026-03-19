import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';
import { Alert, Card, Button, Badge, Input, Select, Modal } from '@/components/ui';
import { FileText, IndianRupee, Calendar, User, DollarSign } from 'lucide-react';

const Invoices = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        payment_method: 'cash',
        amount: ''
    });

    // Alert state
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

    useEffect(() => {
        fetchInvoices();
    }, [filter]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const params = filter !== 'all' ? { status: filter } : {};
            const response = await api.get('/billing/', { params });
            setInvoices(response.data.results || response.data);
        } catch (err) {
            console.error('Error fetching invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/billing/${selectedInvoice.id}/record_payment/`, paymentForm);
            setShowPaymentModal(false);
            setSelectedInvoice(null);
            setPaymentForm({ payment_method: 'cash', amount: '' });
            fetchInvoices();
            showAlert('success', 'Payment recorded successfully!');
        } catch (err) {
            console.error('Error recording payment:', err);
            showAlert('error', 'Failed to record payment');
        }
    };

    const openPaymentModal = (invoice) => {
        setSelectedInvoice(invoice);
        setPaymentForm({
            payment_method: 'cash',
            amount: invoice.total_amount
        });
        setShowPaymentModal(true);
    };

    const getStatusBadge = (status) => {
        const variants = {
            pending: 'warning',
            paid: 'success',
            overdue: 'danger',
            cancelled: 'default',
            draft: 'default'
        };
        return variants[status] || 'default';
    };

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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                    <p className="text-gray-600">Manage customer invoices and payments</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {['all', 'pending', 'paid', 'overdue'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 border-b-2 font-medium transition-colors ${filter === status
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* Invoices List */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Card</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No invoices found</td>
                                </tr>
                            ) : (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <FileText size={16} className="text-gray-400" />
                                                <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {invoice.customer_details?.user?.name || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {invoice.jobcard ? `#${invoice.jobcard}` : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 font-semibold text-gray-900">
                                                    <IndianRupee size={14} />
                                                    {invoice.total_amount}
                                                </div>
                                                {invoice.amount_paid > 0 && (
                                                    <div className="text-xs text-gray-500">
                                                        Paid: ₹{invoice.amount_paid}
                                                        {invoice.amount_remaining > 0 && (
                                                            <span className="text-orange-600 ml-1">
                                                                (₹{invoice.amount_remaining} due)
                                                            </span>
                                                        )}
                                                        {invoice.amount_remaining < 0 && (
                                                            <span className="text-green-600 ml-1">
                                                                (₹{Math.abs(invoice.amount_remaining)} overpaid)
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={getStatusBadge(invoice.status)}>
                                                {invoice.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {new Date(invoice.issued_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                {invoice.status === 'pending' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => openPaymentModal(invoice)}
                                                    >
                                                        Record Payment
                                                    </Button>
                                                )}
                                                {invoice.jobcard && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => navigate(`/admin/job-cards/${invoice.jobcard}`)}
                                                    >
                                                        View Job
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Record Payment"
            >
                <form onSubmit={handleRecordPayment} className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                        <div>
                            <p className="text-sm text-gray-600">Invoice Number</p>
                            <p className="font-semibold text-gray-900">{selectedInvoice?.invoice_number}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-100">
                            <div>
                                <p className="text-xs text-gray-600">Total Amount</p>
                                <p className="text-lg font-bold text-gray-900">₹{selectedInvoice?.total_amount}</p>
                            </div>
                            {selectedInvoice?.amount_paid > 0 && (
                                <>
                                    <div>
                                        <p className="text-xs text-gray-600">Already Paid</p>
                                        <p className="text-lg font-semibold text-green-600">₹{selectedInvoice?.amount_paid}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-gray-600">Remaining Balance</p>
                                        <p className={`text-xl font-bold ${selectedInvoice?.amount_remaining > 0 ? 'text-orange-600' : selectedInvoice?.amount_remaining < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                            ₹{Math.abs(selectedInvoice?.amount_remaining || 0)}
                                            {selectedInvoice?.amount_remaining < 0 && ' (Overpaid)'}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Payment History */}
                        {selectedInvoice?.payment_details && selectedInvoice.payment_details.length > 0 && (
                            <div className="pt-2 border-t border-blue-100">
                                <p className="text-xs text-gray-600 mb-2">Payment History</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {selectedInvoice.payment_details.map((payment, idx) => (
                                        <div key={payment.id || idx} className="flex justify-between text-xs bg-white p-2 rounded">
                                            <span className="text-gray-600">
                                                {payment.payment_method.toUpperCase()} - {new Date(payment.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="font-semibold text-gray-900">₹{payment.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Select
                        label="Payment Method"
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                        options={[
                            { value: 'cash', label: 'Cash' },
                            { value: 'card', label: 'Card' },
                            { value: 'upi', label: 'UPI' },
                            { value: 'wallet', label: 'Wallet' }
                        ]}
                    />

                    <Input
                        label="Amount"
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        required
                        min="0"
                        step="0.01"
                    />

                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPaymentModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            Record Payment
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Invoices;
