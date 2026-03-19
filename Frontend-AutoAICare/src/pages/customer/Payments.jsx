import { Badge, Button, Card, Modal, Select } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import api from '@/utils/api';
import {
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Eye,
  Search,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Payments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payments'); // payments, invoices
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });

  useEffect(() => {
    fetchPaymentsAndInvoices();
  }, []);

  const fetchPaymentsAndInvoices = async () => {
    try {
      setLoading(true);
      const [paymentsRes, invoicesRes] = await Promise.all([
        api.get('/payments/payments/'),
        api.get('/billing/'),
      ]);
      const paymentsData = paymentsRes.data;
      const invoicesData = invoicesRes.data;
      setPayments(
        Array.isArray(paymentsData)
          ? paymentsData
          : Array.isArray(paymentsData?.results)
            ? paymentsData.results
            : []
      );
      setInvoices(
        Array.isArray(invoicesData)
          ? invoicesData
          : Array.isArray(invoicesData?.results)
            ? invoicesData.results
            : []
      );
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await api.get(`/billing/${invoiceId}/download/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading invoice:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to download invoice' });
    }
  };

  const openDetailsModal = (payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed', icon: XCircle },
      refunded: { color: 'bg-blue-100 text-blue-800', label: 'Refunded', icon: CheckCircle },
    };
    return variants[status] || { color: 'bg-gray-100 text-gray-800', label: status, icon: Clock };
  };

  const getInvoiceStatusBadge = (status) => {
    const variants = {
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      overdue: { color: 'bg-red-100 text-red-800', label: 'Overdue' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
    };
    return variants[status] || { color: 'bg-gray-100 text-gray-800', label: status };
  };

  const filteredPayments = payments.filter(payment => {
    if (filters.status && payment.payment_status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        payment.id?.toString().includes(searchLower) ||
        payment.booking?.toString().includes(searchLower) ||
        payment.payment_method?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const filteredInvoices = invoices.filter(invoice => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        invoice.invoice_number?.toLowerCase().includes(searchLower) ||
        invoice.id?.toString().includes(searchLower)
      );
    }
    return true;
  });

  // Calculate stats
  const totalPaid = payments
    .filter(p => p.payment_status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalPending = payments
    .filter(p => p.payment_status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payments & Invoices</h1>
        <p className="text-gray-600 mt-1">Manage your payment history and invoices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Paid</p>
          <p className="text-2xl font-bold text-green-600 mt-1">₹{totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">₹{totalPending.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Payments</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Invoices</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{invoices.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'payments'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <CreditCard size={16} className="inline mr-2" />
            Payment History ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'invoices'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Download size={16} className="inline mr-2" />
            Invoices ({invoices.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={activeTab === 'payments' ? 'Search payments...' : 'Search invoices...'}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input pl-10 w-full"
            />
          </div>
          {activeTab === 'payments' && (
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              options={[
                { value: '', label: 'All Status' },
                { value: 'completed', label: 'Completed' },
                { value: 'pending', label: 'Pending' },
                { value: 'failed', label: 'Failed' },
                { value: 'refunded', label: 'Refunded' },
              ]}
            />
          )}
        </div>
      </Card>

      {/* Payment History */}
      {activeTab === 'payments' && (
        <Card title="Payment History">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Booking</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Method</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => {
                    const statusInfo = getStatusBadge(payment.payment_status);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">#{payment.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          Booking #{payment.booking}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                          {payment.payment_method?.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-green-600">
                          ₹{payment.amount}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${statusInfo.color}`}>
                            <StatusIcon size={14} />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openDetailsModal(payment)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No payments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Invoice</p>
                    <p className="font-bold text-gray-900 text-lg">{invoice.invoice_number}</p>
                  </div>
                  <Badge variant={getInvoiceStatusBadge(invoice.status).color.replace('bg-', '').replace('-100', '')}>
                    {getInvoiceStatusBadge(invoice.status).label}
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Jobcard:</span>
                    <span className="font-medium text-gray-900">#{invoice.jobcard}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Date:</span>
                    <span className="text-gray-900">{new Date(invoice.issued_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="text-lg font-bold text-green-600">₹{invoice.total_amount}</span>
                  </div>
                </div>

                {invoice.status === 'pending' && (
                  <Button
                    onClick={() => navigate(`/customer/pay-invoice/${invoice.id}`)}
                    className="w-full mb-2"
                  >
                    <CreditCard size={16} className="mr-2" />
                    Pay Now
                  </Button>
                )}

                <Button
                  onClick={() => handleDownloadInvoice(invoice.id)}
                  variant="outline"
                  className="w-full"
                >
                  <Download size={16} className="mr-2" />
                  Download PDF
                </Button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Download size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No invoices found</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Payment #${selectedPayment?.id} Details`}
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(selectedPayment.payment_status).color
                }`}>
                {getStatusBadge(selectedPayment.payment_status).label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedPayment.payment_date).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Booking ID</p>
                <p className="font-medium text-gray-900">#{selectedPayment.booking}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                <p className="font-medium text-gray-900 capitalize">
                  {selectedPayment.payment_method?.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Amount</p>
                <p className="text-2xl font-bold text-green-600">₹{selectedPayment.amount}</p>
              </div>
            </div>

            {selectedPayment.transaction_id && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
                <p className="font-mono text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {selectedPayment.transaction_id}
                </p>
              </div>
            )}

            {selectedPayment.stripe_payment_intent && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Stripe Payment Intent</p>
                <p className="font-mono text-xs text-gray-900 bg-gray-50 p-2 rounded break-all">
                  {selectedPayment.stripe_payment_intent}
                </p>
              </div>
            )}

            {/* <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={() => handleDownloadInvoice(selectedPayment.booking)}
                variant="outline"
                className="w-full"
              >
                <Download size={16} className="mr-2" />
                Download Invoice
              </Button>
            </div> */}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Payments;
