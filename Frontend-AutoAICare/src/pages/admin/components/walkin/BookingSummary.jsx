import React from 'react';
import { Button, Card, Select } from '@/components/ui';
import { Ticket, X } from 'lucide-react';

const BookingSummary = ({
    customerData,
    vehicleData,
    vehicleType,
    selectedPackageDetails,
    selectedAddonsDetails,
    bookingDateTime,
    isSuperAdmin,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    calculateTotalPrice,
    loading,
    handleSubmit,
    customerMembership,
    availableBenefits,
    packages,
    selectedPackage,
    applySpecificCoupon,
    couponLoading,
    appliedCoupon,
    removeCoupon,
    couponCode,
    setCouponCode,
    applyCoupon,
    couponError,
    pickupRequired,
    directDiscountType,
    setDirectDiscountType,
    directDiscountValue,
    setDirectDiscountValue
}) => {
    return (
        <div className="sticky top-6 space-y-6">
            <Card title="Booking Summary">
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Customer:</span>
                            <span className="font-medium">
                                {customerData.name || "Not selected"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Phone:</span>
                            <span className="font-medium">
                                {customerData.phone || "N/A"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Vehicle:</span>
                            <span className="font-medium">
                                {vehicleData.brand && vehicleData.model
                                    ? `${vehicleData.brand} ${vehicleData.model} `
                                    : "Not selected"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Vehicle Type:</span>
                            <span className="font-medium capitalize bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                {vehicleType}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Registration:</span>
                            <span className="font-medium">
                                {vehicleData.registration_number || "N/A"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Service:</span>
                            <span className="font-medium">
                                {selectedPackageDetails?.name || "Not selected"}
                            </span>
                        </div>
                        {selectedAddonsDetails.length > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Add-ons:</span>
                                <span className="font-medium text-right">
                                    {selectedAddonsDetails
                                        .map((addon) => addon.name)
                                        .join(", ")}
                                </span>
                            </div>
                        )}
                        {selectedPackageDetails && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Duration:</span>
                                <span className="font-medium">
                                    {(() => {
                                        // Calculate total duration: package + add-ons
                                        const packageDuration = selectedPackageDetails.duration || 0;
                                        const addonsDuration = selectedAddonsDetails.reduce(
                                            (total, addon) => total + (addon.duration || 0),
                                            0
                                        );
                                        const totalMinutes = packageDuration + addonsDuration;

                                        // Format duration
                                        const hours = Math.floor(totalMinutes / 60);
                                        const minutes = totalMinutes % 60;

                                        if (hours > 0 && minutes > 0) {
                                            return `${hours}h ${minutes}m`;
                                        } else if (hours > 0) {
                                            return `${hours}h`;
                                        } else {
                                            return `${minutes}m`;
                                        }
                                    })()}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-600">Date & Time:</span>
                            <span className="font-medium">
                                {bookingDateTime
                                    ? new Date(bookingDateTime).toLocaleString()
                                    : "Not selected"}
                            </span>
                        </div>
                        {pickupRequired && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Pickup:</span>
                                <span className="font-medium">Yes</span>
                            </div>
                        )}

                        {/* Membership Benefits Section - Auto-apply for washing plans */}
                        {customerMembership && selectedPackageDetails && (
                            <div className="pt-3 border-t">
                                {/* Check if this is a washing plan and service is a car wash */}
                                {customerMembership.washes_remaining > 0 &&
                                    selectedPackageDetails.name.toLowerCase().includes('wash') && (
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="text-3xl">💎</div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="font-semibold text-green-800">
                                                            {customerMembership.plan_name}
                                                        </h4>
                                                        <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                                                            ACTIVE
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 text-sm">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-green-700">Free Washes Remaining:</span>
                                                            <span className="font-bold text-green-900">
                                                                {customerMembership.washes_remaining} / {customerMembership.plan_details?.free_washes_count || customerMembership.washes_remaining}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-3 p-2 bg-white rounded border border-green-200">
                                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            <span className="text-green-800 font-medium">
                                                                This wash is FREE with your membership!
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                {/* Show discount coupons for other services */}
                                {availableBenefits.length > 0 &&
                                    (!selectedPackageDetails.name.toLowerCase().includes('wash') || customerMembership.washes_remaining === 0) && (() => {
                                        // Get selected service package details
                                        const selectedPkg = packages.find(pkg => pkg.id === parseInt(selectedPackage));

                                        // Filter coupons applicable to the selected service (HYBRID APPROACH)
                                        const applicableCoupons = availableBenefits.filter(coupon => {
                                            // 1. If coupon has specific applicable_services, check if selected service is in the list
                                            if (coupon.applicable_services && coupon.applicable_services.length > 0) {
                                                return coupon.applicable_services.some(serviceId =>
                                                    serviceId === parseInt(selectedPackage)
                                                );
                                            }

                                            // 2. If coupon has applicable_categories, check if selected service category matches
                                            if (coupon.applicable_categories && coupon.applicable_categories.length > 0 && selectedPkg) {
                                                return coupon.applicable_categories.includes(selectedPkg.category);
                                            }

                                            // 3. If no restrictions, it's a universal coupon (can be used for any service)
                                            return true;
                                        });

                                        if (applicableCoupons.length === 0) {
                                            return null; // Don't show the section if no applicable coupons
                                        }

                                        return (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-lg">🎟️</span>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Membership Coupons Available
                                                    </span>
                                                </div>
                                                <p className="text-xs text-blue-800 mb-2">
                                                    {applicableCoupons.length} coupon(s) available for this service - Click to apply
                                                </p>
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {applicableCoupons.slice(0, 5).map((benefit) => (
                                                        <div
                                                            key={benefit.id}
                                                            className="flex items-center justify-between bg-white rounded p-2 text-xs"
                                                        >
                                                            <div className="flex-1">
                                                                <span className="font-mono font-semibold text-purple-600">
                                                                    {benefit.code}
                                                                </span>
                                                                <span className="text-gray-600 ml-2">
                                                                    {benefit.coupon_type === "percentage"
                                                                        ? `${benefit.discount_percentage}% OFF`
                                                                        : benefit.coupon_type === "fixed"
                                                                            ? `₹${benefit.discount_amount} OFF`
                                                                            : "FREE"}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => applySpecificCoupon(benefit.code)}
                                                                disabled={couponLoading}
                                                                className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:opacity-50"
                                                            >
                                                                {couponLoading ? '...' : 'Apply'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                {applicableCoupons.length > 5 && (
                                                    <p className="text-xs text-gray-500 text-center pt-1">
                                                        +{applicableCoupons.length - 5} more coupons available
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}
                            </div>
                        )}

                        {/* Coupon Section */}
                        <div className="pt-3 border-t">
                            <div className="flex items-center gap-2 mb-2">
                                <Ticket size={16} className="text-purple-600" />
                                <span className="text-sm font-medium text-gray-700">
                                    Discount Coupon
                                </span>
                            </div>

                            {appliedCoupon ? (
                                <div className="flex items-center justify-between bg-green-50 rounded-lg p-2 border border-green-200">
                                    <div>
                                        <span className="font-mono font-bold text-green-600">
                                            {appliedCoupon.code}
                                        </span>
                                        <span className="text-xs text-gray-600 ml-2">
                                            {appliedCoupon.coupon_type === "percentage"
                                                ? `${appliedCoupon.discount_percentage}% off`
                                                : `₹${appliedCoupon.discount_amount} off`}
                                        </span>
                                    </div>
                                    <button
                                        onClick={removeCoupon}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        title="Remove coupon"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter code"
                                        value={couponCode}
                                        onChange={(e) =>
                                            setCouponCode(e.target.value.toUpperCase())
                                        }
                                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                    <Button
                                        onClick={applyCoupon}
                                        disabled={couponLoading}
                                        variant="outline"
                                        size="sm"
                                    >
                                        {couponLoading ? "..." : "Apply"}
                                    </Button>
                                </div>
                            )}

                            {couponError && (
                                <p className="text-xs text-red-600 mt-1">{couponError}</p>
                            )}
                        </div>

                        {/* Direct Discount Section (Admin Override) */}
                        <div className="pt-3 border-t">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">💰</span>
                                <span className="text-sm font-medium text-gray-700">
                                    Direct Discount (Admin)
                                </span>
                            </div>
                            <div className="space-y-2">
                                {/* Discount Type Toggle */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDirectDiscountType('percentage')}
                                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${directDiscountType === 'percentage'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Percentage %
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDirectDiscountType('fixed')}
                                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${directDiscountType === 'fixed'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Fixed ₹
                                    </button>
                                </div>
                                {/* Discount Value Input */}
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder={directDiscountType === 'percentage' ? 'Enter % (0-100)' : 'Enter amount'}
                                        value={directDiscountValue}
                                        onChange={(e) => setDirectDiscountValue(e.target.value)}
                                        min="0"
                                        max={directDiscountType === 'percentage' ? '100' : undefined}
                                        step={directDiscountType === 'percentage' ? '1' : '0.01'}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <span className="absolute right-3 top-2 text-gray-500 text-sm">
                                        {directDiscountType === 'percentage' ? '%' : '₹'}
                                    </span>
                                </div>
                                {directDiscountValue && parseFloat(directDiscountValue) > 0 && (
                                    <div className="flex items-center justify-between bg-orange-50 rounded p-2 text-xs">
                                        <span className="text-orange-700">
                                            Discount Applied:
                                        </span>
                                        <span className="font-bold text-orange-900">
                                            {directDiscountType === 'percentage'
                                                ? `${directDiscountValue}% OFF`
                                                : `₹${parseFloat(directDiscountValue).toFixed(2)} OFF`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedPackageDetails && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Service Price:</span>
                                <span className="font-medium">
                                    ₹
                                    {(() => {
                                        const priceMap = {
                                            hatchback: selectedPackageDetails.hatchback_price,
                                            sedan: selectedPackageDetails.sedan_price,
                                            suv: selectedPackageDetails.suv_price,
                                            bike: selectedPackageDetails.bike_price,
                                        };
                                        return parseFloat(
                                            priceMap[vehicleType] ||
                                            selectedPackageDetails.sedan_price ||
                                            0
                                        ).toFixed(2);
                                    })()}
                                </span>
                            </div>
                        )}
                        {selectedAddonsDetails.length > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Add-ons Price:</span>
                                <span className="font-medium">
                                    ₹
                                    {selectedAddonsDetails
                                        .reduce(
                                            (total, addon) =>
                                                total + (parseFloat(addon.price) || 0),
                                            0
                                        )
                                        .toFixed(2)}
                                </span>
                            </div>
                        )}
                        {/* Price Breakdown with GST and Discount */}
                        <div className="pt-3 border-t space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">
                                    ₹{calculateTotalPrice().subtotal}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 flex items-center gap-1">
                                    GST
                                    {calculateTotalPrice().gstRate > 0 && (
                                        <span className="text-xs text-gray-500">
                                            ({calculateTotalPrice().gstRate}%)
                                        </span>
                                    )}
                                    :
                                </span>
                                <span className="font-medium">
                                    ₹{calculateTotalPrice().gst}
                                </span>
                            </div>
                            {parseFloat(calculateTotalPrice().discount) > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span className="flex items-center gap-1">
                                        {appliedCoupon ? (
                                            <Ticket size={14} />
                                        ) : (
                                            <span>💎</span>
                                        )}
                                        {appliedCoupon ? 'Coupon Discount:' : 'Membership Benefit:'}
                                    </span>
                                    <span className="font-medium">
                                        -₹{calculateTotalPrice().discount}
                                    </span>
                                </div>
                            )}
                            {parseFloat(calculateTotalPrice().directDiscount) > 0 && (
                                <div className="flex justify-between text-sm text-orange-600">
                                    <span className="flex items-center gap-1">
                                        <span>💰</span>
                                        Direct Discount:
                                    </span>
                                    <span className="font-medium">
                                        -₹{calculateTotalPrice().directDiscount}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t">
                                <span className="text-gray-900 font-medium">
                                    Total Price:
                                </span>
                                <span className="text-lg font-bold text-green-600">
                                    ₹{calculateTotalPrice().total}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Branch Selection for Super Admin */}
                    {isSuperAdmin && (
                        <div className="pt-2">
                            <Select
                                label="Select Branch"
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(e.target.value)}
                                options={[
                                    { value: "", label: "Please select a branch" },
                                    ...branches.map((branch) => ({
                                        value: branch.id.toString(),
                                        label: branch.name,
                                    })),
                                ]}
                                required
                            />
                            {isSuperAdmin && !selectedBranchId && (
                                <p className="text-sm text-red-600 mt-1">
                                    Please select a branch to create the booking
                                </p>
                            )}
                        </div>
                    )}

                    {/* Create Booking Button */}
                    <div className="pt-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || (isSuperAdmin && !selectedBranchId)}
                            className="w-full"
                        >
                            {loading ? "Creating Booking..." : "Create Booking"}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default BookingSummary;
