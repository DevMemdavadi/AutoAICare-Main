import { Button, Card, Input } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import api from '@/utils/api';
import { ArrowLeft, CheckCircle, CreditCard, Loader } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const PayInvoice = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [paymentDetails, setPaymentDetails] = useState({
    upi_id: '',
    card_number: '',
    card_expiry: '',
    card_cvv: '',
    card_name: '',
  });

  useEffect(() => {
    fetchInvoiceData();
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      // Corrected Endpoint: /billing/{id}/
      const response = await api.get(`/billing/${invoiceId}/`);
      setInvoice(response.data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (paymentMethod === 'upi' && !paymentDetails.upi_id) {
      setError('Please enter UPI ID');
      return;
    }

    if (paymentMethod === 'card') {
      if (!paymentDetails.card_number || !paymentDetails.card_expiry || !paymentDetails.card_cvv) {
        setError('Please fill all card details');
        return;
      }
    }

    try {
      setProcessing(true);
      setError('');

      // Use the record_payment endpoint on the Invoice ViewSet
      // Endpoint: /billing/{id}/record_payment/
      await api.post(`/billing/${invoiceId}/record_payment/`, {
        payment_method: paymentMethod,
        amount: invoice.total_amount,
        // In a real app, you would pass tokenized card details here
        // For this demo/offline flow, we are simulating a successful payment
      });

      setSuccess('Payment successful! Redirecting...');

      setTimeout(() => {
        navigate('/customer/track');
      }, 2000);

    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Invoice not found</p>
        <Button onClick={() => navigate('/customer/track')} className="mt-4">
          <ArrowLeft size={18} className="mr-2" />
          Back to Tracking
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => navigate('/customer/track')}
          variant="outline"
          size="sm"
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pay Invoice</h1>
          <p className="text-gray-600 mt-1">Invoice #{invoice.invoice_number}</p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 flex items-center gap-2">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Payment Methods */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Select Payment Method">
            <div className="p-6 space-y-4">
              {/* UPI */}
              <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${paymentMethod === 'upi' ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">UPI Payment</p>
                  <p className="text-sm text-gray-600">Pay using Google Pay, PhonePe, Paytm, etc.</p>
                  {paymentMethod === 'upi' && (
                    <Input
                      placeholder="Enter UPI ID (e.g., yourname@paytm)"
                      value={paymentDetails.upi_id}
                      onChange={(e) => setPaymentDetails({ ...paymentDetails, upi_id: e.target.value })}
                      className="mt-3"
                    />
                  )}
                </div>
              </label>

              {/* Card */}
              <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard size={20} className="text-gray-600" />
                    <p className="font-medium text-gray-900">Credit/Debit Card</p>
                  </div>
                  <p className="text-sm text-gray-600">Visa, Mastercard, Rupay</p>
                  {paymentMethod === 'card' && (
                    <div className="mt-3 space-y-3">
                      <Input
                        placeholder="Card Number"
                        value={paymentDetails.card_number}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, card_number: e.target.value })}
                        maxLength={16}
                      />
                      <Input
                        placeholder="Cardholder Name"
                        value={paymentDetails.card_name}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, card_name: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="MM/YY"
                          value={paymentDetails.card_expiry}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, card_expiry: e.target.value })}
                          maxLength={5}
                        />
                        <Input
                          placeholder="CVV"
                          type="password"
                          value={paymentDetails.card_cvv}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, card_cvv: e.target.value })}
                          maxLength={3}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div>
          <Card title="Payment Summary">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Invoice Amount</span>
                <span className="font-medium">₹{invoice.total_amount}</span>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">Total to Pay</span>
                  <span className="text-2xl font-bold text-primary">₹{invoice.total_amount}</span>
                </div>
              </div>

              <Button
                onClick={handleSubmitPayment}
                disabled={processing}
                className="w-full mt-4"
              >
                {processing ? (
                  <>
                    <Loader className="animate-spin mr-2" size={18} />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} className="mr-2" />
                    Pay Now
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-gray-500 mt-4">
                <span className="flex items-center justify-center gap-1">
                  <CheckCircle size={12} />
                  Secure Payment Gateway
                </span>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PayInvoice;
