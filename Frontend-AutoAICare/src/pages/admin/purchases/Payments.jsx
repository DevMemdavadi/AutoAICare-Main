import { useState, useEffect } from 'react';
import { DollarSign, Search, Calendar, CheckCircle } from 'lucide-react';
import api from '../../../utils/api';

const Payments = () => {
    const [outstandingPurchases, setOutstandingPurchases] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [paymentData, setPaymentData] = useState({
        amount: '',
        payment_mode: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        notes: ''
    });

    useEffect(() => {
        fetchOutstandingPurchases();
        fetchPayments();
    }, []);

    const fetchOutstandingPurchases = async () => {
        try {
            const response = await api.get('/purchases/payments/outstanding_purchases/');
            setOutstandingPurchases(response.data);
        } catch (error) {
            console.error('Error fetching outstanding purchases:', error);
        }
    };

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await api.get('/purchases/payments/');
            setPayments(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();

        try {
            await api.post('/purchases/payments/', {
                purchase: selectedPurchase.id,
                ...paymentData,
                amount: parseFloat(paymentData.amount)
            });

            alert('Payment recorded successfully!');
            setShowModal(false);
            setSelectedPurchase(null);
            setPaymentData({
                amount: '',
                payment_mode: 'cash',
                payment_date: new Date().toISOString().split('T')[0],
                reference_number: '',
                notes: ''
            });

            fetchOutstandingPurchases();
            fetchPayments();
        } catch (error) {
            console.error('Error recording payment:', error);
            alert('Failed to record payment');
        }
    };

    const openPaymentModal = (purchase) => {
        setSelectedPurchase(purchase);
        setPaymentData({
            ...paymentData,
            amount: purchase.outstanding_amount
        });
        setShowModal(true);
    };

    const filteredPurchases = outstandingPurchases.filter(purchase =>
        purchase.purchase_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
                <p className="text-gray-600 mt-1">Record and track purchase payments</p>
            </div>

            {/* Outstanding Purchases */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Outstanding Purchases</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search purchases..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                                        No outstanding purchases
                                    </td>
                                </tr>
                            ) : (
                                filteredPurchases.map((purchase) => (
                                    <tr key={purchase.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium">{purchase.purchase_number}</td>
                                        <td className="px-4 py-3 text-sm">{purchase.supplier_name}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {new Date(purchase.purchase_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium">₹{purchase.total_amount.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-sm text-green-600">₹{purchase.paid_amount.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-orange-600">
                                            ₹{purchase.outstanding_amount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {purchase.due_date ? new Date(purchase.due_date).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => openPaymentModal(purchase)}
                                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                            >
                                                <DollarSign size={16} />
                                                Pay
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Payments</h2>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                            No payments recorded yet
                                        </td>
                                    </tr>
                                ) : (
                                    payments.slice(0, 10).map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm">
                                                {new Date(payment.payment_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium">{payment.purchase_number}</td>
                                            <td className="px-4 py-3 text-sm">{payment.supplier_name}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-green-600">
                                                ₹{payment.amount.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm capitalize">
                                                {payment.payment_mode.replace('_', ' ')}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {payment.reference_number || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showModal && selectedPurchase && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Record Payment</h2>

                        {/* Purchase Info */}
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-600">Purchase:</span>
                                <span className="text-sm font-medium">{selectedPurchase.purchase_number}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-600">Supplier:</span>
                                <span className="text-sm font-medium">{selectedPurchase.supplier_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Outstanding:</span>
                                <span className="text-sm font-bold text-orange-600">
                                    ₹{selectedPurchase.outstanding_amount.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleRecordPayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter amount"
                                    max={selectedPurchase.outstanding_amount}
                                    step="0.01"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                                <select
                                    value={paymentData.payment_mode}
                                    onChange={(e) => setPaymentData({ ...paymentData, payment_mode: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="upi">UPI</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                                <input
                                    type="date"
                                    value={paymentData.payment_date}
                                    onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                                <input
                                    type="text"
                                    value={paymentData.reference_number}
                                    onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Transaction/Cheque number"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={paymentData.notes}
                                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                                    rows="2"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Additional notes..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setSelectedPurchase(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <CheckCircle size={18} className="inline mr-2" />
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

export default Payments;
