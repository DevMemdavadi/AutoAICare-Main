import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Download,
    Printer,
    DollarSign,
    Package,
    Calendar,
    FileText,
    User
} from 'lucide-react';
import api from '../../../utils/api';

const PurchaseDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [purchase, setPurchase] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('cash');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [referenceNumber, setReferenceNumber] = useState('');

    useEffect(() => {
        fetchPurchaseDetails();
    }, [id]);

    const fetchPurchaseDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/purchases/purchases/${id}/`);
            setPurchase(response.data);
        } catch (error) {
            console.error('Error fetching purchase details:', error);
            alert('Failed to load purchase details');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!window.confirm('Are you sure you want to approve this purchase?')) return;

        try {
            await api.post(`/purchases/purchases/${id}/approve/`);
            fetchPurchaseDetails();
            alert('Purchase approved successfully!');
        } catch (error) {
            console.error('Error approving purchase:', error);
            alert(error.response?.data?.error || 'Failed to approve purchase');
        }
    };

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel this purchase?')) return;

        try {
            await api.post(`/purchases/purchases/${id}/cancel/`);
            fetchPurchaseDetails();
            alert('Purchase cancelled successfully!');
        } catch (error) {
            console.error('Error cancelling purchase:', error);
            alert(error.response?.data?.error || 'Failed to cancel purchase');
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();

        try {
            await api.post('/purchases/payments/', {
                purchase: id,
                amount: parseFloat(paymentAmount),
                payment_mode: paymentMode,
                payment_date: paymentDate,
                reference_number: referenceNumber
            });

            setShowPaymentModal(false);
            fetchPurchaseDetails();
            alert('Payment recorded successfully!');

            // Reset form
            setPaymentAmount('');
            setReferenceNumber('');
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Failed to record payment');
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
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!purchase) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <p className="text-gray-600">Purchase not found</p>
                    <button
                        onClick={() => navigate('/admin/inventory?tab=purchases')}
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        Back to Purchases
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/inventory?tab=purchases')}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{purchase.purchase_number}</h1>
                        <p className="text-gray-600 mt-1">Purchase Details</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {getStatusBadge(purchase.status)}
                    {purchase.status === 'pending_approval' && (
                        <button
                            onClick={handleApprove}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            <CheckCircle size={18} />
                            Approve
                        </button>
                    )}
                    {purchase.status === 'draft' && (
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            <XCircle size={18} />
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* Purchase Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <User className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Supplier</p>
                            <p className="text-lg font-semibold text-gray-900">{purchase.supplier_name}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <DollarSign className="text-green-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="text-lg font-semibold text-gray-900">₹{purchase.total_amount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <Calendar className="text-orange-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Purchase Date</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {new Date(purchase.purchase_date).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Purchase Items */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Items</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {purchase.items?.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900">{item.part_name}</div>
                                                <div className="text-xs text-gray-500">{item.part_sku}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">₹{item.unit_price}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">₹{item.discount}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {item.gst_rate}% (₹{item.gst_total})
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                ₹{item.total_amount}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="mt-6 border-t pt-4">
                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal:</span>
                                        <span className="font-medium">₹{purchase.subtotal}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Discount:</span>
                                        <span className="font-medium text-red-600">-₹{purchase.discount}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">GST:</span>
                                        <span className="font-medium">₹{purchase.gst_amount}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                                        <span>Total:</span>
                                        <span className="text-blue-600">₹{purchase.total_amount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Branch</p>
                                <p className="text-sm font-medium text-gray-900">{purchase.branch_name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Supplier Invoice</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {purchase.supplier_invoice_number || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Due Date</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {purchase.due_date ? new Date(purchase.due_date).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Payment Mode</p>
                                <p className="text-sm font-medium text-gray-900 capitalize">
                                    {purchase.payment_mode?.replace('_', ' ')}
                                </p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm text-gray-600">Notes</p>
                                <p className="text-sm font-medium text-gray-900">{purchase.notes || 'No notes'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Payment Summary */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Amount:</span>
                                <span className="text-sm font-medium">₹{purchase.total_amount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Paid Amount:</span>
                                <span className="text-sm font-medium text-green-600">₹{purchase.paid_amount}</span>
                            </div>
                            <div className="flex justify-between border-t pt-3">
                                <span className="text-sm font-semibold">Outstanding:</span>
                                <span className="text-sm font-semibold text-orange-600">
                                    ₹{purchase.outstanding_amount}
                                </span>
                            </div>
                        </div>

                        {purchase.outstanding_amount > 0 && purchase.status === 'approved' && (
                            <button
                                onClick={() => {
                                    setShowPaymentModal(true);
                                    // Auto-select the purchase's payment mode
                                    setPaymentMode(purchase.payment_mode || 'cash');
                                    // Auto-fill the outstanding amount
                                    setPaymentAmount(purchase.outstanding_amount.toString());
                                }}
                                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <DollarSign size={18} />
                                Record Payment
                            </button>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                        <div className="space-y-2">
                            <button className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                                <Printer size={18} />
                                Print Purchase Order
                            </button>
                            <button className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                                <Download size={18} />
                                Download PDF
                            </button>
                            {/* {purchase.status === 'approved' && (
                                <button
                                    onClick={() => navigate(`/admin/purchases/returns/create?purchase=${id}`)}
                                    className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                >
                                    <Package size={18} />
                                    Create Return
                                </button>
                            )} */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Record Payment</h2>
                        <form onSubmit={handleRecordPayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter amount"
                                    max={purchase.outstanding_amount}
                                    step="0.01"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Outstanding: ₹{purchase.outstanding_amount}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                                <select
                                    value={paymentMode}
                                    onChange={(e) => setPaymentMode(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="upi">UPI</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="card">Card</option>
                                    <option value="credit">Credit</option>
                                    <option value="online">Online</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reference Number
                                </label>
                                <input
                                    type="text"
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Transaction/Cheque number"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseDetails;
