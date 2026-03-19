import { Button, Card, Input } from '@/components/ui';
import { Car, Plus, Search, CheckCircle, XCircle, Loader2, UserCheck, UserPlus } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/utils/api';

const CustomerSelection = ({
    customerData,
    setCustomerData,
    searchQuery,
    setSearchQuery,
    searchCustomer,
    loading,
    searchResults,
    showCustomerSearch,
    setShowCustomerSearch,
    selectCustomer,
    setAddingNewVehicle,
    customerVehicles,
    vehicleData,
    setVehicleData,
    selectVehicle,
    bookingAmount = 0,
    onReferralDiscountChange,
}) => {
    // Phone auto-lookup state
    const [phoneLookupStatus, setPhoneLookupStatus] = useState(null); // null | 'searching' | 'found' | 'new'
    const phoneLookupRef = useRef(null);
    // Referral code validation state
    const [referralValidation, setReferralValidation] = useState({
        isValidating: false,
        isValid: null,
        message: ''
    });

    // Auto-lookup when phone number reaches 10 digits
    useEffect(() => {
        // Clear any pending lookup
        if (phoneLookupRef.current) clearTimeout(phoneLookupRef.current);

        const phone = customerData.phone;

        // Only run when phone is exactly 10 digits AND no existing customer is already selected
        if (phone && phone.length === 10 && !customerData.id) {
            setPhoneLookupStatus('searching');
            phoneLookupRef.current = setTimeout(async () => {
                try {
                    const response = await api.get('/bookings/', {
                        params: { search: phone, page_size: 5 }
                    });
                    const results = response.data.results || [];

                    // Extract first unique customer from any booking result
                    let found = null;
                    const seen = new Set();
                    for (const booking of results) {
                        const u = booking.customer_details?.user;
                        if (u && u.phone === phone && !seen.has(u.id)) {
                            found = u;
                            seen.add(u.id);
                            break;
                        }
                    }

                    if (found) {
                        // Auto-select the found customer
                        selectCustomer(found);
                        setPhoneLookupStatus('found');
                    } else {
                        setPhoneLookupStatus('new');
                    }
                } catch {
                    setPhoneLookupStatus(null);
                }
            }, 600);
        } else {
            // Reset status when phone is cleared or incomplete
            if (!customerData.id) setPhoneLookupStatus(null);
        }

        return () => { if (phoneLookupRef.current) clearTimeout(phoneLookupRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerData.phone, customerData.id]);

    // Debounced referral code validation
    useEffect(() => {
        const validateReferralCode = async (code) => {
            if (!code || code.trim() === '') {
                setReferralValidation({
                    isValidating: false,
                    isValid: null,
                    message: '',
                    discount: null
                });
                // Clear discount in parent
                if (onReferralDiscountChange) {
                    onReferralDiscountChange(null);
                }
                return;
            }

            setReferralValidation({
                isValidating: true,
                isValid: null,
                message: 'Validating...',
                discount: null
            });

            try {
                const response = await api.post('/customers/referral-codes/validate_code/', {
                    referral_code: code.toUpperCase(),
                    booking_amount: bookingAmount || 0
                });

                if (response.data.status === 'valid') {
                    const discountInfo = response.data.discount;
                    setReferralValidation({
                        isValidating: false,
                        isValid: true,
                        message: `Valid code from ${response.data.code.customer_name} - ${discountInfo.display_text} discount`,
                        discount: discountInfo
                    });

                    // Pass discount to parent component
                    if (onReferralDiscountChange) {
                        onReferralDiscountChange(discountInfo);
                    }
                }
            } catch (error) {
                console.error('Referral code validation error:', error.response?.data);

                // Extract error message from various possible response formats
                let errorMessage = 'Invalid referral code';

                if (error.response?.data) {
                    const errorData = error.response.data;

                    // Check for field-specific error (referral_code field)
                    if (errorData.referral_code) {
                        errorMessage = Array.isArray(errorData.referral_code)
                            ? errorData.referral_code[0]
                            : errorData.referral_code;
                    }
                    // Check for non_field_errors
                    else if (errorData.non_field_errors) {
                        errorMessage = Array.isArray(errorData.non_field_errors)
                            ? errorData.non_field_errors[0]
                            : errorData.non_field_errors;
                    }
                    // Check for detail field
                    else if (errorData.detail) {
                        errorMessage = errorData.detail;
                    }
                    // Check for error field
                    else if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                    // Check for message field
                    else if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                }

                setReferralValidation({
                    isValidating: false,
                    isValid: false,
                    message: errorMessage,
                    discount: null
                });

                // Clear discount in parent
                if (onReferralDiscountChange) {
                    onReferralDiscountChange(null);
                }
            }
        };

        // Debounce validation by 500ms
        const timeoutId = setTimeout(() => {
            if (customerData.referral_code && !customerData.id) {
                validateReferralCode(customerData.referral_code);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [customerData.referral_code, customerData.id, bookingAmount, onReferralDiscountChange]);

    return (
        <Card title="Customer Information">
            <div className="space-y-6">
                {/* Search Existing Customer */}
                <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                        Search Existing Customer
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <Input
                            placeholder="Enter Mobile or Vehicle number"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            prefix={<Search className="text-gray-400" size={18} />}
                            className="w-full sm:w-64"
                        />
                        <Button onClick={searchCustomer} disabled={loading} className="w-full sm:w-auto">
                            {loading ? "Searching..." : "Search"}
                        </Button>
                    </div>

                    {showCustomerSearch && (
                        <div className="mt-4">
                            {searchResults.length > 0 ? (
                                <div className="space-y-2">
                                    {searchResults.map((customer) => (
                                        <div
                                            key={customer.id}
                                            className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                            onClick={() => selectCustomer(customer)}
                                        >
                                            <div>
                                                <div className="font-medium">{customer.name}</div>
                                                <div className="text-sm text-gray-600">
                                                    {customer.phone}
                                                </div>
                                                {customer.branch_name && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Branch: {customer.branch_name}
                                                    </div>
                                                )}
                                            </div>
                                            <Button size="sm" variant="outline">
                                                Select
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-500">
                                    No customers found
                                </div>
                            )}
                            <Button
                                variant="ghost"
                                className="mt-2"
                                onClick={() => {
                                    setShowCustomerSearch(false);
                                    setAddingNewVehicle(false);
                                    // Clear search query to prevent confusion
                                    setSearchQuery('');
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>

                {/* Customer Details */}
                <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                        Customer Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Input
                                label="Full Name"
                                placeholder="Customer name"
                                value={customerData.name}
                                onChange={(e) => {
                                    setCustomerData({
                                        ...customerData,
                                        name: e.target.value,
                                    });
                                }}
                                required
                                disabled={!!customerData.id}
                                className={customerData.id ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}
                            />
                            {customerData.id && (
                                <p className="mt-1 text-xs text-gray-400">Existing customer — name locked</p>
                            )}
                        </div>
                        <div className="relative">
                            <Input
                                label="Phone Number"
                                placeholder="Phone number"
                                value={customerData.phone}
                                onChange={(e) => {
                                    // Allow only numeric input and limit to 10 digits
                                    const value = e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 10);
                                    // Reset lookup state and customer selection when phone changes
                                    if (value !== customerData.phone) {
                                        setPhoneLookupStatus(null);
                                        if (customerData.id) {
                                            setCustomerData({ id: null, name: '', phone: value, email: '', referral_code: '' });
                                        } else {
                                            setCustomerData({ ...customerData, phone: value });
                                        }
                                    }
                                }}
                                required
                                maxLength={10}
                            />
                            {/* Phone lookup status indicator */}
                            {phoneLookupStatus === 'searching' && (
                                <div className="absolute right-3 top-9 flex items-center gap-1 text-gray-400">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-xs">Looking up...</span>
                                </div>
                            )}
                            {phoneLookupStatus === 'found' && (
                                <div className="mt-1 flex items-center gap-1 text-green-600">
                                    <UserCheck className="h-4 w-4" />
                                    <span className="text-xs font-medium">Existing customer found &amp; selected</span>
                                </div>
                            )}
                            {phoneLookupStatus === 'new' && (
                                <div className="mt-1 flex items-center gap-1 text-blue-600">
                                    <UserPlus className="h-4 w-4" />
                                    <span className="text-xs font-medium">New customer — fill in the name below</span>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <Input
                                label="Email (Optional)"
                                placeholder="Email address"
                                value={customerData.email}
                                onChange={(e) =>
                                    setCustomerData({
                                        ...customerData,
                                        email: e.target.value,
                                    })
                                }
                                type="email"
                                disabled={!!customerData.id}
                                className={customerData.id ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}
                            />
                            {customerData.id && (
                                <p className="mt-1 text-xs text-gray-400">Existing customer — email locked</p>
                            )}
                        </div>
                        {!customerData.id && (
                            <div className="relative">
                                <Input
                                    label="Referral Code (Optional)"
                                    placeholder="Enter referral code"
                                    value={customerData.referral_code}
                                    onChange={(e) =>
                                        setCustomerData({
                                            ...customerData,
                                            referral_code: e.target.value.toUpperCase(),
                                        })
                                    }
                                    className={
                                        referralValidation.isValid === true
                                            ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                                            : referralValidation.isValid === false
                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                                : ''
                                    }
                                />
                                {/* Validation icon */}
                                <div className="absolute right-3 top-9">
                                    {referralValidation.isValidating && (
                                        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                                    )}
                                    {!referralValidation.isValidating && referralValidation.isValid === true && (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                    )}
                                    {!referralValidation.isValidating && referralValidation.isValid === false && (
                                        <XCircle className="h-5 w-5 text-red-500" />
                                    )}
                                </div>
                                {/* Custom helper text with color coding */}
                                <p className={`mt-1.5 text-sm ${referralValidation.isValid === true
                                    ? 'text-green-600 font-medium'
                                    : referralValidation.isValid === false
                                        ? 'text-red-600 font-medium'
                                        : 'text-gray-500'
                                    }`}>
                                    {referralValidation.message || "If referred by another customer"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer Vehicles - Only show for EXISTING customers */}
                {customerData.id && (
                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-medium text-gray-900">
                                Select or Add Vehicle
                            </h3>
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1.5"
                                onClick={() => {
                                    // Clear vehicle selection to allow entering new vehicle details
                                    setVehicleData({
                                        id: null,
                                        registration_number: "",
                                        brand: "",
                                        model: "",
                                        year: "",
                                        color: ""
                                    });
                                    setAddingNewVehicle(true);
                                }}
                            >
                                <Plus size={16} />
                                Add New Vehicle
                            </Button>
                        </div>

                        {customerVehicles.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                {customerVehicles.map((vehicle) => (
                                    <div
                                        key={vehicle.id}
                                        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${vehicleData.id === vehicle.id
                                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100 shadow-sm"
                                            : "border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
                                            }`}
                                        onClick={() => {
                                            selectVehicle(vehicle);
                                            setAddingNewVehicle(false);
                                        }}
                                    >
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0 mt-1">
                                                <Car className="text-blue-500" size={20} />
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold text-gray-900">
                                                        {vehicle.brand} {vehicle.model}
                                                    </h4>
                                                    {vehicleData.id === vehicle.id && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            Selected
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-2 grid grid-cols-2 gap-1">
                                                    <div className="text-sm">
                                                        <span className="text-gray-500">Reg: </span>
                                                        <span className="font-medium text-gray-900">
                                                            {vehicle.registration_number}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="text-gray-500">Year: </span>
                                                        <span className="font-medium text-gray-900">
                                                            {vehicle.year}
                                                        </span>
                                                    </div>
                                                </div>
                                                {vehicle.vehicle_type && (
                                                    <div className="mt-2">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            {vehicle.vehicle_type_display || vehicle.vehicle_type}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg
                                        className="h-5 w-5 text-blue-400"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-blue-800">
                                        {customerVehicles.length > 0
                                            ? "Select a vehicle above or add a new one"
                                            : "No vehicles found for this customer. Please add a new vehicle below."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default CustomerSelection;
