import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';
import { useAccountingFilter } from '@/contexts/AccountingFilterContext';
import { Card, Button, Modal, Input, Select, Badge } from '@/components/ui';
import {
    Search,
    FileText,
    Download,
    CheckCircle,
    Clock,
    AlertCircle,
    Eye,
    Printer,
    CreditCard,
    X
} from 'lucide-react';

const InvoicesTab = () => {
    const navigate = useNavigate();
    const { getFilterParams, formatCurrency, selectedBranches } = useAccountingFilter();

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        payment_method: 'cash'
    });
    const [processingPayment, setProcessingPayment] = useState(false);

    // Fetch invoices
    const fetchInvoices = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                ...getFilterParams(),
                search: searchQuery,
                status: statusFilter !== 'all' ? statusFilter : undefined
            };

            const response = await api.get('/billing/', { params });
            setInvoices(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    }, [getFilterParams, searchQuery, statusFilter]);

    // Initial fetch and re-fetch when filters change
    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleMarkPaid = (invoice) => {
        setSelectedInvoice(invoice);
        setPaymentForm({
            amount: invoice.total_amount, // Default to full amount
            payment_method: 'cash'
        });
        setShowPaymentModal(true);
    };

    const submitPayment = async (e) => {
        e.preventDefault();
        if (!selectedInvoice) return;

        try {
            setProcessingPayment(true);
            await api.post(`/billing/${selectedInvoice.id}/record_payment/`, paymentForm);

            setShowPaymentModal(false);
            fetchInvoices(); // Refresh list
            // Could show success toast here
        } catch (error) {
            console.error('Error recording payment:', error);
            alert(error.response?.data?.error || 'Failed to record payment');
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleDownloadPdf = async (invoiceId) => {
        try {
            // Use API client with authentication to download PDF
            const response = await api.get(`/billing/${invoiceId}/download/`, {
                responseType: 'blob'  // Important for binary data
            });

            // Create blob and download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `invoice_${invoiceId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download invoice PDF. Please try again.');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid':
                return <Badge variant="success" className="flex items-center gap-1"><CheckCircle size={12} /> Paid</Badge>;
            case 'pending':
                return <Badge variant="warning" className="flex items-center gap-1"><Clock size={12} /> Pending</Badge>;
            case 'overdue':
                return <Badge variant="danger" className="flex items-center gap-1"><AlertCircle size={12} /> Overdue</Badge>;
            case 'cancelled':
                return <Badge variant="default">Cancelled</Badge>;
            default:
                return <Badge variant="default">{status}</Badge>;
        }
    };

    const TableRowSkeleton = () => (
        <tr className="animate-pulse">
            <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-16"></div>
            </td>
            <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-24"></div>
            </td>
            <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
            </td>
            <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
            </td>
            <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
            </td>
            <td className="px-6 py-4">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
            </td>
            <td className="px-6 py-4">
                <div className="flex justify-end gap-2">
                    <div className="h-6 w-6 bg-gray-200 rounded"></div>
                    <div className="h-6 w-6 bg-gray-200 rounded"></div>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="space-y-6">
            {/* Local Actions Bar */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                {/* <Button variant="secondary" className="flex items-center gap-2">
          <Download size={16} /> Export List
        </Button> */}
            </div>

            {/* Invoices List */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Info</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <>
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                    <TableRowSkeleton />
                                </>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                                        No invoices found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                                            <div className="flex flex-col gap-0.5">
                                                {invoice.jobcard && <div className="text-[10px] text-gray-500">Job Card: {invoice.jobcard}</div>}
                                                {invoice.breakdown?.addons > 0 && (
                                                    <div className="text-[10px] text-blue-600 font-medium">Add-ons: {formatCurrency(invoice.breakdown.addons)}</div>
                                                )}
                                                {invoice.breakdown?.services > 0 && (
                                                    <div className="text-[10px] text-indigo-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                                                        Services: {formatCurrency(invoice.breakdown.services)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{invoice.customer_details?.user?.name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">{invoice.customer_details?.user?.phone || ''}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(invoice.issued_date || invoice.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {formatCurrency(invoice.total_amount)}
                                                    </div>
                                                    {invoice.calculation_warning && (
                                                        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded" title={`Calculation mismatch: ${invoice.calculation_warning.message}`}>
                                                            ⚠️
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    GST: {invoice.tax_rate}%
                                                </div>
                                                {invoice.amount_paid > 0 && (
                                                    <div className="text-xs text-gray-500">
                                                        Paid: {formatCurrency(invoice.amount_paid)}
                                                        {invoice.amount_remaining > 0 && (
                                                            <span className="text-orange-600 ml-1">
                                                                ({formatCurrency(invoice.amount_remaining)} due)
                                                            </span>
                                                        )}
                                                        {invoice.amount_remaining < 0 && (
                                                            <span className="text-green-600 ml-1">
                                                                ({formatCurrency(Math.abs(invoice.amount_remaining))} overpaid)
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {invoice.payment_details?.length > 0
                                                ? [...new Set(invoice.payment_details.map(p => {
                                                    const method = (p.payment_method || '').toLowerCase();
                                                    if (method === 'upi') return 'UPI';
                                                    if (method === 'bank_transfer') return 'Bank Transfer';
                                                    if (method === 'card') return 'Card';
                                                    if (method === 'cash') return 'Cash';
                                                    return method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                                }))].filter(Boolean).join(', ')
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(invoice.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                {invoice.jobcard && (
                                                    <button
                                                        onClick={() => navigate(`/admin/jobcards/${invoice.jobcard}`)}
                                                        className="text-gray-400 hover:text-indigo-600 tooltip"
                                                        title="View Job Card"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDownloadPdf(invoice.id)}
                                                    className="text-gray-400 hover:text-blue-600 tooltip"
                                                    title="Download PDF"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                                    <button
                                                        onClick={() => handleMarkPaid(invoice)}
                                                        className="text-gray-400 hover:text-green-600 tooltip"
                                                        title="Record Payment"
                                                    >
                                                        <CreditCard size={18} />
                                                    </button>
                                                )}
                                                {/* <button className="text-gray-400 hover:text-gray-600">
                          <Eye size={18} />
                        </button> */}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Record Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Record Payment"
            >
                <form onSubmit={submitPayment} className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                        <div>
                            <p className="text-sm text-gray-500">Invoice</p>
                            <p className="font-medium">{selectedInvoice?.invoice_number}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                            <div>
                                <p className="text-xs text-gray-500">Total Amount</p>
                                <p className="text-lg font-bold text-gray-900">{selectedInvoice && formatCurrency(selectedInvoice.total_amount)}</p>
                            </div>
                            {selectedInvoice?.amount_paid > 0 && (
                                <>
                                    <div>
                                        <p className="text-xs text-gray-500">Already Paid</p>
                                        <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedInvoice.amount_paid)}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-gray-500">Remaining Balance</p>
                                        <p className={`text-xl font-bold ${selectedInvoice?.amount_remaining > 0 ? 'text-orange-600' : selectedInvoice?.amount_remaining < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                            {formatCurrency(Math.abs(selectedInvoice?.amount_remaining || 0))}
                                            {selectedInvoice?.amount_remaining < 0 && ' (Overpaid)'}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Payment History */}
                        {selectedInvoice?.payment_details && selectedInvoice.payment_details.length > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-2">Payment History</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {selectedInvoice.payment_details.map((payment, idx) => (
                                        <div key={payment.id || idx} className="flex justify-between text-xs bg-white p-2 rounded border border-gray-100">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-700">{payment.payment_method.toUpperCase()}</span>
                                                <span className="text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Input
                        label="Payment Amount"
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        required
                        min="0"
                        step="0.01"
                    />

                    <Select
                        label="Payment Method"
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                        options={[
                            { value: 'cash', label: 'Cash' },
                            { value: 'upi', label: 'UPI' },
                            { value: 'card', label: 'Credit/Debit Card' },
                            { value: 'bank_transfer', label: 'Bank Transfer' }
                        ]}
                    />

                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPaymentModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={processingPayment}
                        >
                            {processingPayment ? 'Processing...' : 'Confirm Payment'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default InvoicesTab;
