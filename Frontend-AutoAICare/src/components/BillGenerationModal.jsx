import React, { useState, useEffect } from 'react';
import { Alert, Button, Modal, Textarea } from '@/components/ui';
import { DollarSign, Download, Percent } from 'lucide-react';
import api from '@/utils/api';
import InvoiceBreakdown from './InvoiceBreakdown';
import InvoiceItemEditor from './InvoiceItemEditor';

const BillGenerationModal = ({ isOpen, onClose, jobCardId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [billData, setBillData] = useState(null);
    const [items, setItems] = useState([]);
    const [taxRate, setTaxRate] = useState(18);
    const [discountType, setDiscountType] = useState('none');
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [systemDiscountAmount, setSystemDiscountAmount] = useState(0);
    const [discountReason, setDiscountReason] = useState('');
    const [notes, setNotes] = useState('');
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    // Fetch or generate bill when modal opens
    useEffect(() => {
        if (isOpen && jobCardId) {
            generateBill();
        }
    }, [isOpen, jobCardId]);

    const generateBill = async () => {
        setLoading(true);
        try {
            const response = await api.post('/billing/generate_bill/', {
                jobcard_id: jobCardId
            });

            const invoice = response.data.invoice;

            setBillData(invoice);
            setItems(invoice.items || []);
            setTaxRate(invoice.tax_rate || 18);

            // Map new split discount fields
            setSystemDiscountAmount(invoice.system_discount_amount || 0);
            setDiscountType(invoice.additional_discount_type || 'none');
            setDiscountPercentage(invoice.additional_discount_percentage || 0);
            setDiscountAmount(invoice.additional_discount_amount || 0);

            setDiscountReason(invoice.discount_reason || '');
            setNotes(invoice.notes || '');
        } catch (error) {
            console.error('Error generating bill:', error);
            setAlert({ show: true, type: 'error', message: 'Failed to generate bill. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const calculateSubtotal = () => {
        return items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
    };

    const calculateTax = () => {
        const subtotal = calculateSubtotal();
        return (subtotal * parseFloat(taxRate || 0)) / 100;
    };

    const calculateDiscount = () => {
        const subtotal = calculateSubtotal();
        if (discountType === 'percentage') {
            return (subtotal * parseFloat(discountPercentage || 0)) / 100;
        } else if (discountType === 'fixed') {
            return parseFloat(discountAmount || 0);
        }
        return 0;
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const tax = calculateTax();
        const discount = calculateDiscount();
        return subtotal + tax - parseFloat(systemDiscountAmount || 0) - discount;
    };


    // Build the payload used by both Save Draft and Download
    const buildUpdatePayload = () => ({
        tax_rate: taxRate,
        discount_type: discountType,
        discount_percentage: discountPercentage,
        discount_amount: discountType === 'fixed' ? discountAmount : 0,
        discount_reason: discountReason,
        notes: notes,
        items: items.map(item => ({
            item_type: item.item_type,
            description: item.description,
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unit_price)
        }))
    });

    // Converts Django field-level errors into a readable UI message
    const extractApiError = (error) => {
        const data = error.response?.data;
        if (!data) return 'Something went wrong. Please try again.';
        if (typeof data === 'string') return data;
        if (data.error) return data.error;
        if (data.detail) return data.detail;
        const fieldMessages = Object.entries(data)
            .filter(([, v]) => Array.isArray(v) || typeof v === 'string')
            .map(([k, v]) => {
                const label = k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ');
                const msg = Array.isArray(v) ? v[0] : v;
                return `${label}: ${msg}`;
            });
        return fieldMessages.length ? fieldMessages.join('. ') : 'Failed to save. Please check all fields and try again.';
    };

    // Validate that all items have a description before submitting
    const validateItems = () => {
        const emptyIdx = items.findIndex(item => !String(item.description).trim());
        if (emptyIdx !== -1) {
            setAlert({ show: true, type: 'error', message: `Item ${emptyIdx + 1} is missing a description. Please fill it in.` });
            return false;
        }
        return true;
    };

    const handleSaveDraft = async () => {
        if (!billData) return;
        if (!validateItems()) return;

        setLoading(true);
        try {
            await api.put(`/billing/${billData.id}/update_bill_items/`, buildUpdatePayload());
            setAlert({ show: true, type: 'success', message: 'Draft saved successfully!' });
            generateBill();
        } catch (error) {
            console.error('Error saving draft:', error);
            setAlert({ show: true, type: 'error', message: extractApiError(error) });
        } finally {
            setLoading(false);
        }
    };

    // Download invoice — saves current edits first (if still editable), then downloads PDF
    const handleDownloadInvoice = async () => {
        if (!billData) return;
        if (!validateItems()) return;

        setLoading(true);
        try {
            // Only save edits if the invoice is still editable (not paid)
            if (billData.status !== 'paid') {
                await api.put(`/billing/${billData.id}/update_bill_items/`, buildUpdatePayload());
            }

            // Download the PDF
            const pdfResponse = await api.get(`/billing/${billData.id}/download/`, {
                responseType: 'blob'
            });

            const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const customerName = (billData.customer_details?.user?.name || '').toLowerCase().replace(/\s+/g, '_');
            link.download = customerName
                ? `${billData.invoice_number}-sales_invoice-${customerName}.pdf`
                : `${billData.invoice_number}-sales_invoice.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setAlert({ show: true, type: 'success', message: 'Invoice downloaded successfully!' });
        } catch (error) {
            console.error('Error downloading invoice:', error);
            setAlert({ show: true, type: 'error', message: extractApiError(error) });
        } finally {
            setLoading(false);
        }
    };

    if (loading && !billData) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Generate Bill">
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Generate Bill - ${billData?.invoice_number || ''}`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="secondary" onClick={handleSaveDraft} disabled={loading || !billData}>
                        {loading ? 'Saving...' : 'Save Draft'}
                    </Button>
                    <Button onClick={handleDownloadInvoice} disabled={loading || !billData}>
                        <Download size={15} className="mr-1" />
                        {loading ? 'Downloading...' : 'Download Invoice'}
                    </Button>
                </>
            }
        >
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* Alert Toast */}
                {alert.show && (
                    <Alert
                        type={alert.type}
                        message={alert.message}
                        onClose={() => setAlert({ show: false, type: '', message: '' })}
                    />
                )}

                {/* Customer Info */}
                {billData && (
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 mb-2">Customer Information</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-gray-600">Name:</span>{' '}
                                <span className="font-medium">{billData.customer_details?.user?.name || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Phone:</span>{' '}
                                <span className="font-medium">{billData.customer_details?.user?.phone || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bill Items */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Bill Items</h3>
                    <InvoiceItemEditor
                        items={items}
                        setItems={setItems}
                        hideSaveButton
                    />
                </div>

                {/* Tax and Discount */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Percent size={14} className="inline mr-1" />
                                Tax Rate (%)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Discount Type
                            </label>
                            <select
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value)}
                                className="input w-full"
                            >
                                <option value="none">No Discount</option>
                                <option value="percentage">Percentage</option>
                                <option value="fixed">Fixed Amount</option>
                            </select>
                        </div>
                    </div>

                    {discountType === 'percentage' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Discount Percentage (%)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={discountPercentage}
                                onChange={(e) => setDiscountPercentage(e.target.value)}
                                className="input w-full"
                                placeholder="e.g., 10 for 10%"
                            />
                        </div>
                    )}

                    {discountType === 'fixed' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <DollarSign size={14} className="inline mr-1" />
                                Discount Amount (₹)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={discountAmount}
                                onChange={(e) => setDiscountAmount(e.target.value)}
                                className="input w-full"
                                placeholder="e.g., 500"
                            />
                        </div>
                    )}

                    {discountType !== 'none' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Discount Reason
                            </label>
                            <input
                                type="text"
                                value={discountReason}
                                onChange={(e) => setDiscountReason(e.target.value)}
                                className="input w-full"
                                placeholder="e.g., Loyal customer, Promotional offer"
                            />
                        </div>
                    )}
                </div>

                {/* Notes */}
                <div>
                    <Textarea
                        label="Notes (Optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Add any additional notes for the invoice..."
                    />
                </div>

                {/* Invoice Breakdown */}
                <InvoiceBreakdown
                    subtotal={calculateSubtotal()}
                    taxRate={parseFloat(taxRate)}
                    taxAmount={calculateTax()}
                    discountAmount={calculateDiscount() + parseFloat(systemDiscountAmount || 0)}
                    system_discount_amount={parseFloat(systemDiscountAmount || 0)}
                    additional_discount_amount={calculateDiscount()}
                    discountReason={discountReason}
                    total={calculateTotal()}
                />
            </div>
        </Modal>
    );
};

export default BillGenerationModal;
