/**
 * Memberships Page (Customer)
 * View membership plans, purchase memberships, and manage existing subscriptions
 */

import { Badge, Button, Card, Modal } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import api from '@/utils/api';
import {
    Calendar,
    Car,
    Check,
    ChevronRight,
    Crown,
    Gift,
    IndianRupee,
    Percent,
    ShieldCheck,
    Ticket,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Tier styling
const TIER_GRADIENTS = {
    bronze: 'from-amber-400 to-amber-600',
    silver: 'from-gray-300 to-gray-500',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-purple-400 to-purple-600',
    diamond: 'from-blue-400 to-blue-600',
};

const TIER_ICONS = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    diamond: '👑',
};

const Memberships = () => {
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState([]);
    const [myMembership, setMyMembership] = useState(null);
    const [benefitUsages, setBenefitUsages] = useState([]);
    const [myCoupons, setMyCoupons] = useState([]);
    const [couponUsageHistory, setCouponUsageHistory] = useState([]);
    const [totalSavings, setTotalSavings] = useState(0);
    const [vehicles, setVehicles] = useState([]);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    // Purchase modal
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [vehicleType, setVehicleType] = useState('sedan');
    const [purchasing, setPurchasing] = useState(false);

    // Benefits modal
    const [showBenefitsModal, setShowBenefitsModal] = useState(false);

    const { user } = useAuth();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch plans — pass company_id so company-specific plans are shown
            // to both authenticated and anonymous users
            const companyId = user?.company_id;
            const plansUrl = companyId
                ? `/memberships/plans/public/?company=${companyId}`
                : '/memberships/plans/public/';
            const plansRes = await api.get(plansUrl);
            setPlans(plansRes.data.results || plansRes.data);

            // Fetch user's active membership
            try {
                const membershipRes = await api.get('/memberships/subscriptions/my_active_membership/');
                // API returns 200 with has_membership:false when no membership exists
                const data = membershipRes.data;
                if (data.has_membership === false) {
                    setMyMembership(null);
                    setBenefitUsages([]);
                } else {
                    setMyMembership(data);
                    // Fetch benefit usages for active membership
                    if (data?.id) {
                        try {
                            const benefitsRes = await api.get(`/memberships/subscriptions/${data.id}/available_benefits/`);
                            setBenefitUsages(benefitsRes.data.benefits || []);
                        } catch (e) {
                            console.error('Error fetching benefits:', e);
                            setBenefitUsages([]);
                        }
                    }
                }
            } catch (e) {
                // Network or auth error fallback
                setMyMembership(null);
                setBenefitUsages([]);
            }

            // Fetch user's coupons
            try {
                const couponsRes = await api.get('/memberships/coupons/my_coupons/');
                setMyCoupons(couponsRes.data.results || couponsRes.data);
            } catch (e) {
                setMyCoupons([]);
            }

            // Fetch coupon usage history
            try {
                const usageRes = await api.get('/memberships/coupons/my_coupon_usage/');
                setCouponUsageHistory(usageRes.data.usages || []);
                setTotalSavings(usageRes.data.total_savings || 0);
            } catch (e) {
                console.error('Error fetching coupon usage:', e);
                setCouponUsageHistory([]);
                setTotalSavings(0);
            }

            // Fetch user's vehicles
            const vehiclesRes = await api.get('/customers/vehicles/');
            setVehicles(vehiclesRes.data.results || vehiclesRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const openPurchaseModal = (plan) => {
        setSelectedPlan(plan);
        setShowPurchaseModal(true);
    };

    const handlePurchase = async () => {
        if (!selectedVehicle) {
            setAlert({ show: true, type: 'error', message: 'Please select a vehicle' });
            return;
        }

        setPurchasing(true);
        try {
            await api.post('/memberships/subscriptions/', {
                plan: selectedPlan.id,
                vehicle: parseInt(selectedVehicle),
                vehicle_type: vehicleType,
            });

            setAlert({ show: true, type: 'success', message: 'Membership purchased successfully!' });
            setShowPurchaseModal(false);
            fetchData();
        } catch (error) {
            console.error('Error purchasing membership:', error);
            setAlert({ show: true, type: 'error', message: 'Failed to purchase membership' });
        } finally {
            setPurchasing(false);
        }
    };

    const getPrice = (plan) => {
        const priceMap = {
            hatchback: plan.hatchback_price,
            sedan: plan.sedan_price,
            suv: plan.suv_price,
            bike: plan.bike_price,
        };
        const price = parseFloat(priceMap[vehicleType] || plan.sedan_price);
        const gst = plan.gst_applicable ? (price * parseFloat(plan.gst_rate)) / 100 : 0;
        return { price, gst, total: price + gst };
    };

    // Get vehicle type based on selected vehicle brand
    const getVehicleTypeForVehicle = (vehicleId) => {
        if (!vehicleId) return 'sedan';

        const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
        if (!vehicle || !vehicle.brand_details) return 'sedan';

        // Map brand vehicle_type to membership vehicle types
        const brandType = vehicle.brand_details.vehicle_type;
        if (brandType === 'bike') {
            return 'bike';
        }

        // For cars, we need to determine hatchback/sedan/suv based on common knowledge
        // This is a simplified approach - in a real app, you'd have a more comprehensive mapping
        const brandName = vehicle.brand.toLowerCase();
        const modelName = vehicle.model.toLowerCase();

        // Common hatchbacks
        const hatchbackBrands = ['maruti suzuki', 'hyundai', 'tata', 'mahindra', 'renault', 'nissan'];
        const hatchbackModels = ['alto', 'kwid', 'tiago', 'tigor', 'grand i10', 'santro', 'figo', 'beat'];

        // Common SUVs
        const suvBrands = ['toyota', 'mahindra', 'tata', 'hyundai', 'mg', 'jeep', 'volkswagen', 'skoda'];
        const suvModels = ['innova', 'fortuner', 'harrier', 'nexon', 'creta', 'venue', 'compass', 'taigun', 'kushaq'];

        // Check if it's clearly a hatchback
        if (hatchbackBrands.some(b => brandName.includes(b)) ||
            hatchbackModels.some(m => modelName.includes(m))) {
            return 'hatchback';
        }

        // Check if it's clearly an SUV
        if (suvBrands.some(b => brandName.includes(b)) ||
            suvModels.some(m => modelName.includes(m))) {
            return 'suv';
        }

        // Default to sedan for other cases
        return 'sedan';
    };
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-8 md:py-12 px-4 md:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-2 md:gap-3 mb-4">
                        <Crown size={28} md:size={36} className="text-yellow-400" />
                        <h1 className="text-2xl md:text-3xl font-bold">K3 Memberships</h1>
                    </div>
                    <p className="text-sm md:text-lg opacity-90 max-w-xl">
                        Join our exclusive membership program and enjoy premium benefits,
                        discounts, free services, and special coupons every month.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
                {/* Alert */}
                {alert.show && (
                    <Alert
                        type={alert.type}
                        message={alert.message}
                        onClose={() => setAlert({ show: false, type: '', message: '' })}
                    />
                )}

                {/* No Membership — Simple Message */}
                {!myMembership && (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                        <Crown size={16} className="text-blue-500 flex-shrink-0" />
                        <span>You don't have an active membership. Contact your service center to get started.</span>
                    </div>
                )}

                {/* Active Membership Card */}
                {myMembership && (

                    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 overflow-hidden">
                        <div className="p-4 md:p-6">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                <div className="w-full">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldCheck className="text-green-600" size={20} md:size={24} />
                                        <h2 className="text-lg md:text-xl font-bold text-gray-900">Your Active Membership</h2>
                                    </div>
                                    <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-4">
                                        <span className="text-xl md:text-2xl">{TIER_ICONS[myMembership.plan_tier]}</span>
                                        <span className="text-xl md:text-2xl font-bold text-gray-900">{myMembership.plan_name}</span>
                                        <Badge variant="success" className="text-[10px] md:text-xs">Active</Badge>
                                    </div>
                                    <p className="text-xs md:text-sm text-gray-600">
                                        Membership ID: <span className="font-mono font-medium">{myMembership.membership_id}</span>
                                    </p>
                                    {/* Vehicle Info */}
                                    <div className="flex items-center gap-2 mt-2 text-xs md:text-sm text-gray-600">
                                        <Car size={14} md:size={16} />
                                        <span>{myMembership.vehicle_registration} • {myMembership.vehicle_brand} {myMembership.vehicle_model}</span>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right bg-white/50 sm:bg-transparent p-3 sm:p-0 rounded-lg w-full sm:w-auto">
                                    <div className="text-2xl md:text-3xl font-bold text-green-600">{myMembership.days_remaining}</div>
                                    <div className="text-xs md:text-sm text-gray-600 uppercase tracking-wide">days remaining</div>
                                </div>
                            </div>

                            {/* Discount Badge */}
                            {myMembership.discount_percentage && parseFloat(myMembership.discount_percentage) > 0 && (
                                <div className="mt-4 inline-flex items-center flex-wrap gap-2 bg-purple-100 border border-purple-300 px-3 md:px-4 py-2 rounded-full">
                                    <Percent size={16} md:size={18} className="text-purple-600" />
                                    <span className="font-bold text-purple-800 text-sm md:text-base">
                                        {myMembership.discount_percentage}% OFF
                                    </span>
                                    <span className="text-purple-600 text-xs md:text-sm">on all services</span>
                                </div>
                            )}

                            {/* Usage Stats with Progress Bars */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                {/* Free Washes */}
                                <div className="bg-white rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">Free Washes</span>
                                        <span className="text-lg font-bold text-blue-600">
                                            {myMembership.washes_remaining} / {myMembership.total_washes || myMembership.washes_remaining}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{
                                                width: `${(myMembership.washes_remaining / (myMembership.total_washes || myMembership.washes_remaining || 1)) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Interior Cleanings */}
                                <div className="bg-white rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">Interior Cleanings</span>
                                        <span className="text-lg font-bold text-purple-600">
                                            {myMembership.interior_cleanings_remaining} / {myMembership.total_interior_cleanings || myMembership.interior_cleanings_remaining}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-purple-600 h-2 rounded-full transition-all"
                                            style={{
                                                width: `${(myMembership.interior_cleanings_remaining / (myMembership.total_interior_cleanings || myMembership.interior_cleanings_remaining || 1)) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Validity Period */}
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="bg-white/50 rounded-lg p-3 text-center">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide">Valid From</div>
                                    <div className="font-semibold text-gray-900">{myMembership.start_date}</div>
                                </div>
                                <div className="bg-white/50 rounded-lg p-3 text-center">
                                    <div className="text-xs text-gray-500 uppercase tracking-wide">Valid Until</div>
                                    <div className="font-semibold text-gray-900">{myMembership.end_date}</div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-green-100 px-4 md:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <p className="text-sm text-green-800">
                                <Zap size={16} className="inline mr-1" />
                                Your membership discount is auto-applied on all bookings!
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => window.location.href = '/customer/book'}
                            >
                                <Calendar size={16} className="mr-1" />
                                Book Now
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Available Benefits */}
                {benefitUsages.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Gift className="text-purple-500" />
                                Your Membership Benefits
                            </h2>
                            <Badge variant="info">{benefitUsages.length} Benefits Available</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {benefitUsages.map((benefitUsage) => {
                                const benefit = benefitUsage.benefit_details;
                                const isAvailable = benefitUsage.is_available;
                                const remaining = benefitUsage.coupons_remaining;

                                return (
                                    <Card
                                        key={benefitUsage.id}
                                        className={`relative overflow-hidden ${!isAvailable ? 'opacity-60' : ''}`}
                                    >
                                        {/* Status Badge */}
                                        <div className="absolute top-2 right-2 md:top-3 md:right-3">
                                            {isAvailable ? (
                                                <Badge variant="success" className="text-[10px] md:text-xs">Available</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px] md:text-xs">Used</Badge>
                                            )}
                                        </div>

                                        <div className="p-4">
                                            {/* Benefit Title */}
                                            <h3 className="font-bold text-gray-900 mb-2 pr-16 md:pr-20 text-sm md:text-base">
                                                {benefit.title}
                                            </h3>

                                            {/* Service Info */}
                                            {benefit.service_name && (
                                                <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 mb-3">
                                                    <Car size={14} />
                                                    <span className="truncate">{benefit.service_name}</span>
                                                </div>
                                            )}

                                            {/* Discount Info */}
                                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 mb-3">
                                                {benefit.discount_percentage > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        <Percent className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                                                        <span className="text-xl md:text-2xl font-bold text-purple-600">
                                                            {benefit.discount_percentage}% OFF
                                                        </span>
                                                    </div>
                                                )}
                                                {benefit.discount_fixed_amount > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        <IndianRupee className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                                                        <span className="text-xl md:text-2xl font-bold text-purple-600">
                                                            ₹{benefit.discount_fixed_amount} OFF
                                                        </span>
                                                    </div>
                                                )}
                                                {benefit.benefit_type === 'free_service' && (
                                                    <div className="flex items-center gap-2">
                                                        <Gift className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                                                        <span className="text-lg md:text-xl font-bold text-purple-600">
                                                            FREE SERVICE
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Coupon Count */}
                                            {benefitUsage.total_coupons_allocated > 0 && (
                                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <Ticket size={14} md:size={16} className="text-gray-600" />
                                                        <span className="text-xs md:text-sm text-gray-600">Coupons</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <span className="text-base md:text-lg font-bold text-primary">
                                                            {remaining}
                                                        </span>
                                                        <span className="text-xs md:text-sm text-gray-500">
                                                            / {benefitUsage.total_coupons_allocated}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* One-time Badge */}
                                            {benefitUsage.is_one_time && (
                                                <div className="mt-2 text-[10px] md:text-xs text-yellow-600 font-bold bg-yellow-50 px-2 py-0.5 rounded inline-block">
                                                    ⭐ ONE-TIME OFFER
                                                </div>
                                            )}

                                            {/* Description */}
                                            {benefit.description && (
                                                <p className="text-[10px] md:text-xs text-gray-500 mt-2 leading-relaxed">
                                                    {benefit.description}
                                                </p>
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* My Coupons Wallet */}
                {myCoupons.length > 0 && (() => {
                    const benefitCoupons = myCoupons.filter(c => c.code?.startsWith('BEN-'));
                    const voucherCoupons = myCoupons.filter(c => !c.code?.startsWith('BEN-'));
                    const activeBenefit = benefitCoupons.filter(c => c.status === 'active' || c.is_valid_now);
                    const usedBenefit = benefitCoupons.filter(c => c.status !== 'active' && !c.is_valid_now);

                    const CouponCard = ({ coupon }) => {
                        const isActive = coupon.status === 'active' || coupon.is_valid_now;
                        const isUsed = coupon.status === 'used';
                        const isExpired = !isActive && !isUsed;
                        const categories = Array.isArray(coupon.applicable_categories) && coupon.applicable_categories.length > 0
                            ? coupon.applicable_categories
                            : null;

                        return (
                            <div className={`relative rounded-2xl overflow-hidden border-2 transition-all ${isActive
                                ? 'border-purple-300 bg-white shadow-md'
                                : 'border-gray-200 bg-gray-50 opacity-60'
                                }`}>
                                {/* Top colour strip */}
                                <div className={`h-1.5 w-full ${isUsed ? 'bg-gray-300' :
                                    isExpired ? 'bg-red-200' :
                                        parseFloat(coupon.discount_percentage) === 100 || coupon.coupon_type === 'free_service' ? 'bg-gradient-to-r from-green-500 to-teal-500' :
                                            coupon.coupon_type === 'percentage' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                                'bg-gradient-to-r from-green-500 to-emerald-500'
                                    }`} />

                                {/* Status badge */}
                                <div className="absolute top-3 right-3">
                                    {isUsed && (
                                        <span className="text-xs font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">USED</span>
                                    )}
                                    {isExpired && (
                                        <span className="text-xs font-bold bg-red-100 text-red-500 px-2 py-0.5 rounded-full">EXPIRED</span>
                                    )}
                                    {isActive && (
                                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">VALID</span>
                                    )}
                                </div>

                                <div className="p-4">
                                    {/* Service name / description */}
                                    {coupon.description && (
                                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1 pr-14 leading-tight">
                                            {coupon.description}
                                        </p>
                                    )}

                                    {/* Applicable categories chips */}
                                    {categories && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {categories.map(cat => (
                                                <span key={cat} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full capitalize">
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Discount value — big and bold */}
                                    {(() => {
                                        const isFree = coupon.coupon_type === 'free_service' || parseFloat(coupon.discount_percentage) === 100;
                                        if (isFree) {
                                            return (
                                                <div className={`text-3xl font-black my-2 ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                                    FREE
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className={`text-3xl font-black my-2 ${isActive ? 'text-purple-700' : 'text-gray-400 line-through'}`}>
                                                {coupon.coupon_type === 'percentage'
                                                    ? `${parseFloat(coupon.discount_percentage)}% OFF`
                                                    : `₹${parseFloat(coupon.discount_amount).toFixed(0)} OFF`
                                                }
                                            </div>
                                        );
                                    })()}

                                    {/* Coupon code */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className={`font-mono text-sm font-bold px-3 py-1 rounded-lg tracking-wider ${isActive ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-400'
                                            }`}>
                                            {coupon.code}
                                        </div>
                                    </div>

                                    {/* Validity / expiry */}
                                    <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
                                        <Calendar size={11} />
                                        <span>
                                            {isUsed
                                                ? 'Redeemed'
                                                : isExpired
                                                    ? `Expired ${new Date(coupon.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                                    : `Valid until ${new Date(coupon.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                            }
                                        </span>
                                    </div>
                                </div>

                                {/* Decorative holes */}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gray-100 border border-gray-200" />
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-gray-100 border border-gray-200" />
                            </div>
                        );
                    };

                    return (
                        <div className="space-y-6">
                            {/* Benefit Coupons */}
                            {benefitCoupons.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                                        <Ticket className="text-purple-500" />
                                        Your Membership Coupons
                                    </h2>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Show any of these at the service counter to avail your benefit.
                                        {activeBenefit.length > 0 && <span className="ml-2 font-medium text-green-700">{activeBenefit.length} active</span>}
                                        {usedBenefit.length > 0 && <span className="ml-2 text-gray-400">{usedBenefit.length} used/expired</span>}
                                    </p>

                                    {/* Active coupons grid */}
                                    {activeBenefit.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                            {activeBenefit.map(c => <CouponCard key={c.id} coupon={c} />)}
                                        </div>
                                    )}

                                    {/* Used/expired coupons — collapsed */}
                                    {usedBenefit.length > 0 && (
                                        <details className="mt-2">
                                            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 select-none list-none flex items-center gap-1">
                                                <ChevronRight size={14} className="transition-transform [details[open]_&]:rotate-90" />
                                                Show {usedBenefit.length} used/expired coupon{usedBenefit.length > 1 ? 's' : ''}
                                            </summary>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                                                {usedBenefit.map(c => <CouponCard key={c.id} coupon={c} />)}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            )}

                            {/* Ad-hoc Vouchers */}
                            {voucherCoupons.length > 0 && (
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                                        <Gift className="text-yellow-500" />
                                        Welcome Vouchers
                                    </h2>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Special one-time vouchers issued with your membership.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {voucherCoupons.map(c => <CouponCard key={c.id} coupon={c} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Coupon Usage History */}
                {couponUsageHistory.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Ticket className="text-green-600" size={20} />
                            📋 Coupon Usage History
                        </h3>
                        <div className="space-y-3">
                            {couponUsageHistory.map((usage) => (
                                <div
                                    key={usage.id}
                                    className="border-l-4 border-green-500 bg-green-50 p-4 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-mono font-bold text-green-700 text-lg">
                                                {usage.coupon_code}
                                            </p>
                                            <p className="text-sm text-gray-700 mt-1">
                                                <span className="font-medium">Used for:</span> {usage.service_name || 'Service'}
                                            </p>
                                            <p className="text-xs text-gray-600 mt-1 flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(usage.used_at).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                                {usage.booking_id && (
                                                    <span className="flex items-center gap-1">
                                                        <Car size={12} />
                                                        Booking #{usage.booking_id}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-600">You Saved</p>
                                            <p className="text-xl font-bold text-green-600">
                                                ₹{parseFloat(usage.discount_applied).toFixed(0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total Savings Summary */}
                        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="text-green-600" size={24} />
                                    <span className="text-sm font-semibold text-green-800">
                                        Total Savings from Membership Coupons
                                    </span>
                                </div>
                                <div className="text-2xl font-bold text-green-700">
                                    ₹{totalSavings.toFixed(0)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Membership Plans — hidden until self-serve purchase is enabled */}
                {false && plans.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                            {myMembership ? '🔄 Upgrade Your Plan' : '🌟 Choose Your Membership'}
                        </h2>
                        <p className="text-center text-gray-500 mb-6">
                            {myMembership
                                ? 'Switch to a higher tier to unlock more benefits.'
                                : 'Pick a plan that fits your needs and start saving today.'}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all hover:scale-105 ${plan.is_popular ? 'ring-4 ring-yellow-400' : ''}`}
                                >
                                    {plan.is_popular && (
                                        <div className="bg-yellow-400 text-yellow-900 text-center py-2 text-sm font-bold">
                                            ⭐ MOST POPULAR
                                        </div>
                                    )}

                                    <div className={`bg-gradient-to-r ${TIER_GRADIENTS[plan.tier]} p-6 text-white`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-4xl">{TIER_ICONS[plan.tier]}</span>
                                            <div>
                                                <h3 className="text-2xl font-bold">{plan.name}</h3>
                                                <p className="opacity-80">{plan.duration_value} {plan.duration_unit}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-gray-50 border-b">
                                        <div className="text-center">
                                            <div className="text-sm text-gray-500 mb-1">Starting from</div>
                                            <div className="flex items-center justify-center gap-1">
                                                <IndianRupee size={24} className="text-gray-700" />
                                                <span className="text-4xl font-bold text-gray-900">
                                                    {(() => {
                                                        const prices = [
                                                            plan.hatchback_price,
                                                            plan.sedan_price,
                                                            plan.suv_price
                                                        ].filter(price => price !== null);
                                                        return prices.length > 0 ? Math.min(...prices) : 0;
                                                    })()}
                                                </span>
                                            </div>
                                            {plan.gst_applicable && (
                                                <div className="text-sm text-gray-500">+ {plan.gst_rate}% GST</div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
                                            {plan.hatchback_price !== null && (
                                                <div className="bg-white rounded p-2">
                                                    <div className="text-xs text-gray-500">🚗 Hatchback</div>
                                                    <div className="font-bold">₹{plan.hatchback_price}</div>
                                                </div>
                                            )}
                                            {plan.sedan_price !== null && (
                                                <div className="bg-white rounded p-2">
                                                    <div className="text-xs text-gray-500">🚙 Sedan</div>
                                                    <div className="font-bold">₹{plan.sedan_price}</div>
                                                </div>
                                            )}
                                            {plan.suv_price !== null && (
                                                <div className="bg-white rounded p-2">
                                                    <div className="text-xs text-gray-500">🚐 SUV</div>
                                                    <div className="font-bold">₹{plan.suv_price}</div>
                                                </div>
                                            )}
                                            {plan.bike_price !== null && (
                                                <div className="bg-white rounded p-2">
                                                    <div className="text-xs text-gray-500">🏍️ Bike</div>
                                                    <div className="font-bold">₹{plan.bike_price}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-3">
                                        {plan.discount_percentage > 0 && (
                                            <div className="flex items-center gap-3">
                                                <Percent size={18} className="text-green-500" />
                                                <span>{plan.discount_percentage}% off on all services</span>
                                            </div>
                                        )}
                                        {plan.free_washes_count > 0 && (
                                            <div className="flex items-center gap-3">
                                                <Check size={18} className="text-green-500" />
                                                <span>{plan.free_washes_count} free car washes</span>
                                            </div>
                                        )}
                                        {plan.free_interior_cleaning_count > 0 && (
                                            <div className="flex items-center gap-3">
                                                <Check size={18} className="text-green-500" />
                                                <span>{plan.free_interior_cleaning_count} free interior cleanings</span>
                                            </div>
                                        )}
                                        {plan.coupons_per_month > 0 && (
                                            <div className="flex items-center gap-3">
                                                <Gift size={18} className="text-purple-500" />
                                                <span>{plan.coupons_per_month} discount coupons/month</span>
                                            </div>
                                        )}
                                        {plan.priority_booking && (
                                            <div className="flex items-center gap-3">
                                                <Zap size={18} className="text-yellow-500" />
                                                <span>Priority booking slots</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 pt-0">
                                        <Button
                                            onClick={() => openPurchaseModal(plan)}
                                            className="w-full flex items-center justify-center gap-2"
                                            disabled={myMembership?.plan_tier === plan.tier}
                                        >
                                            {myMembership?.plan_tier === plan.tier ? '✓ Current Plan' : 'Get Started'}
                                            <ChevronRight size={18} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


            {/* Purchase Modal */}
            <Modal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
                title="Complete Your Purchase"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowPurchaseModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handlePurchase} disabled={purchasing}>
                            {purchasing ? 'Processing...' : `Pay ₹${selectedPlan ? getPrice(selectedPlan).total.toFixed(2) : 0}`}
                        </Button>
                    </>
                }
            >
                {selectedPlan && (
                    <div className="space-y-6">
                        {/* Plan Summary */}
                        <div className={`bg-gradient-to-r ${TIER_GRADIENTS[selectedPlan.tier]} rounded-lg p-4 text-white`}>
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{TIER_ICONS[selectedPlan.tier]}</span>
                                <div>
                                    <h3 className="text-xl font-bold">{selectedPlan.name}</h3>
                                    <p className="opacity-80">{selectedPlan.duration_value} {selectedPlan.duration_unit}</p>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Vehicle
                            </label>
                            <select
                                value={selectedVehicle}
                                onChange={(e) => {
                                    setSelectedVehicle(e.target.value);
                                    // Automatically set vehicle type based on selected vehicle
                                    if (e.target.value) {
                                        const vehicleType = getVehicleTypeForVehicle(e.target.value);
                                        setVehicleType(vehicleType);
                                    }
                                }}
                                className="input w-full"
                                required
                            >
                                <option value="">Choose a vehicle...</option>
                                {vehicles.map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                        {vehicle.brand} {vehicle.model} - {vehicle.registration_number}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Vehicle Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Vehicle Type (for pricing)
                            </label>
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { value: 'hatchback', label: 'Hatchback', icon: '🚗' },
                                    { value: 'sedan', label: 'Sedan', icon: '🚙' },
                                    { value: 'suv', label: 'SUV', icon: '🚐' },
                                    { value: 'bike', label: 'Bike', icon: '🏍️' },
                                ].map((type) => {
                                    // Only show vehicle types that are relevant to the selected vehicle
                                    const vehicleTypeForSelected = selectedVehicle ? getVehicleTypeForVehicle(selectedVehicle) : 'sedan';
                                    const isRelevant = type.value === vehicleTypeForSelected;

                                    return (
                                        <label
                                            key={type.value}
                                            className={`flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${vehicleType === type.value
                                                ? 'border-primary bg-primary/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                                } ${!isRelevant ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="vehicleType"
                                                value={type.value}
                                                checked={vehicleType === type.value}
                                                onChange={(e) => {
                                                    // Only allow changing to relevant vehicle type
                                                    if (isRelevant || !selectedVehicle) {
                                                        setVehicleType(e.target.value);
                                                    }
                                                }}
                                                className="sr-only"
                                                disabled={!isRelevant && selectedVehicle}
                                            />
                                            <span className="text-2xl">{type.icon}</span>
                                            <span className="text-sm font-medium">{type.label}</span>
                                            {!isRelevant && selectedVehicle && (
                                                <span className="text-xs text-gray-500 mt-1">Not applicable</span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                            {selectedVehicle && (
                                <div className="mt-2 text-sm text-gray-600">
                                    Vehicle type automatically detected based on your vehicle selection.
                                </div>
                            )}
                        </div>
                        {/* Price Breakdown */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-3">Price Breakdown</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Membership Price</span>
                                    <span className="font-medium">₹{getPrice(selectedPlan).price.toFixed(2)}</span>
                                </div>
                                {selectedPlan.gst_applicable && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">GST ({selectedPlan.gst_rate}%)</span>
                                        <span className="font-medium">₹{getPrice(selectedPlan).gst.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-2 border-t font-bold text-lg">
                                    <span>Total</span>
                                    <span className="text-green-600">₹{getPrice(selectedPlan).total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Memberships;
