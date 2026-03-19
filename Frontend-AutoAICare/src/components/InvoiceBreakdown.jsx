import React from 'react';
import { DollarSign, Percent, Tag } from 'lucide-react';

/**
 * InvoiceBreakdown Component
 * 
 * Displays a clear, visual breakdown of invoice amounts including:
 * - Subtotal (base amount before tax and discount)
 * - Tax (calculated from tax rate)
 * - Discount (with type and reason)
 * - Total Amount (final amount to pay)
 * 
 * @param {Object} props
 * @param {number} props.subtotal - Base amount before tax and discount
 * @param {number} props.taxRate - Tax percentage (e.g., 18 for 18%)
 * @param {number} props.taxAmount - Calculated tax amount
 * @param {string} props.discountType - Type of discount ('none', 'percentage', 'fixed', 'coupon')
 * @param {number} props.discountPercentage - Discount percentage (if type is 'percentage')
 * @param {number} props.discountAmount - Final discount amount
 * @param {string} props.discountReason - Reason for discount (optional)
 * @param {number} props.total - Final total amount
 * @param {boolean} props.compact - Use compact layout (optional)
 */
const InvoiceBreakdown = ({
    subtotal = 0,
    taxRate = 0,
    taxAmount = 0,
    discountType = 'none',
    discountPercentage = 0,
    discountAmount = 0,
    system_discount_amount = 0,
    additional_discount_amount = 0,
    discountReason = '',
    total = 0,
    amountPaid = 0,
    amountRemaining = 0,
    payments = [],
    compact = false
}) => {
    const formatCurrency = (amount) => {
        const roundedAmount = Math.round(parseFloat(amount || 0));
        return `₹${roundedAmount.toLocaleString('en-IN')}`;
    };

    const getDiscountLabel = () => {
        switch (discountType) {
            case 'percentage':
                return `Discount (${discountPercentage}%)`;
            case 'fixed':
                return 'Discount (Fixed)';
            case 'coupon':
                return 'Discount (Coupon)';
            default:
                return 'Discount';
        }
    };

    if (compact) {
        return (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm border border-gray-200">
                <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-medium text-blue-600">{formatCurrency(taxAmount)}</span>
                </div>
                {discountType !== 'none' && discountAmount > 0 && (
                    <div className="flex justify-between text-gray-700">
                        <span>{getDiscountLabel()}:</span>
                        <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                    </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200 mt-1">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(total)}</span>
                </div>
                {amountPaid > 0 && (
                    <>
                        <div className="flex justify-between text-green-700">
                            <span>Paid So Far:</span>
                            <span className="font-medium">{formatCurrency(amountPaid)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-gray-200 mt-1">
                            <span className="font-semibold text-gray-900">Balance:</span>
                            <span className="font-bold text-orange-600">{formatCurrency(amountRemaining)}</span>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign size={18} className="text-blue-600" />
                Invoice Breakdown
            </h3>

            <div className="space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-sm sm:text-base">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                </div>

                {/* Tax */}
                <div className="flex justify-between items-center text-sm sm:text-base">
                    <div className="flex items-center gap-1 text-gray-600">
                        <Percent size={14} />
                        <span>Tax ({taxRate}%):</span>
                    </div>
                    <span className="font-medium text-blue-600">{formatCurrency(taxAmount)}</span>
                </div>

                {/* System Discount (Referral/Coupon) */}
                {parseFloat(system_discount_amount || 0) > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-2 -mx-1">
                        <div className="flex justify-between items-center text-sm sm:text-base">
                            <div className="flex items-center gap-1 text-gray-700">
                                <Tag size={14} className="text-green-600" />
                                <span className="font-medium">System Discount:</span>
                            </div>
                            <span className="font-semibold text-green-600">-{formatCurrency(system_discount_amount)}</span>
                        </div>
                    </div>
                )}

                {/* Additional Discount (Manual) */}
                {parseFloat(additional_discount_amount || 0) > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-2 -mx-1">
                        <div className="flex justify-between items-center text-sm sm:text-base">
                            <div className="flex items-center gap-1 text-gray-700">
                                <Tag size={14} className="text-red-600" />
                                <span className="font-medium">Additional Discount:</span>
                            </div>
                            <span className="font-semibold text-red-600">-{formatCurrency(additional_discount_amount)}</span>
                        </div>
                        {discountReason && (
                            <p className="text-xs text-gray-600 mt-1 italic">
                                Reason: {discountReason}
                            </p>
                        )}
                    </div>
                )}

                {/* Legacy/Total Discount (Only show if neither of above are shown but it exists) */}
                {parseFloat(discountAmount || 0) > 0 && parseFloat(system_discount_amount || 0) === 0 && parseFloat(additional_discount_amount || 0) === 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-2 -mx-1">
                        <div className="flex justify-between items-center text-sm sm:text-base">
                            <div className="flex items-center gap-1 text-gray-700">
                                <Tag size={14} className="text-gray-600" />
                                <span className="font-medium">Applied Discount:</span>
                            </div>
                            <span className="font-semibold text-gray-600">-{formatCurrency(discountAmount)}</span>
                        </div>
                    </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-3 border-t-2 border-blue-300">
                    <span className="font-bold text-gray-900 text-lg">Total Amount:</span>
                    <span className="font-bold text-2xl text-blue-600">{formatCurrency(total)}</span>
                </div>

                {/* Paid & Remaining (Only show if there are payments) */}
                {amountPaid > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-200 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-green-700 font-medium">Total Paid:</span>
                            <span className="text-green-700 font-bold">{formatCurrency(amountPaid)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-orange-50 border border-orange-200 rounded">
                            <span className="text-orange-800 font-bold">Remaining Balance:</span>
                            <span className="text-orange-800 font-extrabold text-xl">{formatCurrency(amountRemaining)}</span>
                        </div>

                        {/* Payment History List */}
                        {payments.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment History</p>
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                    {payments.map((p, idx) => (
                                        <div key={p.id || idx} className="flex justify-between items-center text-xs p-2 bg-white/50 rounded border border-blue-100">
                                            <div>
                                                <span className="font-medium capitalize">{p.payment_method_display || p.payment_method}</span>
                                                <span className="text-gray-500 ml-2">{new Date(p.payment_date).toLocaleDateString('en-IN')}</span>
                                            </div>
                                            <span className="font-bold text-green-600">{formatCurrency(p.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoiceBreakdown;
