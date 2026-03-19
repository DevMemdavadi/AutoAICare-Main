import React, { useState, useEffect } from 'react';
import {
    User, Phone, Mail, MapPin, Calendar, Car, CreditCard,
    TrendingUp, Award, Clock, FileText, Tag, Target, Activity,
    DollarSign, Package, Star, MessageSquare, Bell, Edit, Plus,
    ArrowLeft, History, Zap, Gift, Copy
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/utils/api';

const Customer360View = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState(null);
    const [activities, setActivities] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [referralData, setReferralData] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (id) {
            fetchCustomerData();
        }
    }, [id]);


    const fetchCustomerData = async () => {
        setLoading(true);
        try {
            // Fetch customer (User) details first
            const userRes = await api.get(`/auth/users/${id}/`);
            const userData = userRes.data;

            // Try to fetch extended customer profile (contains reward points, membership, etc.)
            let mergedData = { ...userData };
            try {
                const profileRes = await api.get(`/customers/admin/customer-profile/${id}/`);
                // Merge profile data (reward_points, membership_type, lifecycle, etc.)
                mergedData = { ...userData, ...profileRes.data };
            } catch (error) {
                console.log('Customer profile not found (might be a staff member):', error.message);
            }

            setCustomer(mergedData);

            // Fetch bookings and vehicles in parallel
            const [bookingsRes, vehiclesRes] = await Promise.all([
                api.get(`/bookings/`, {
                    params: { search: userData.phone }
                }),
                api.get(`/customers/admin/vehicles/by-user/`, {
                    params: { user: id }
                })
            ]);

            const fetchedBookings = bookingsRes.data.results || bookingsRes.data || [];
            const fetchedVehicles = vehiclesRes.data.results || vehiclesRes.data || [];

            setBookings(fetchedBookings);
            setVehicles(fetchedVehicles);

            // Generate activities from bookings
            const bookingActivities = fetchedBookings.slice(0, 10).map(booking => ({
                id: `booking-${booking.id}`,
                type: 'booking',
                title: `Booking #${booking.id} ${booking.status_display || booking.status}`,
                description: booking.package_name || booking.service_name || 'Service',
                timestamp: booking.booking_datetime || booking.created_at || booking.booking_date,
                icon: 'calendar',
                color: booking.status === 'completed' ? 'green' :
                    booking.status === 'in_progress' ? 'blue' : 'gray'
            }));

            setActivities(bookingActivities);

            // Fetch referral data
            try {
                const referralCodeRes = await api.get('/customers/referral-codes/', {
                    params: { user_id: id }
                });
                const referralStatsRes = await api.get('/customers/referrals/', {
                    params: { referrer_user_id: id }
                });

                setReferralData({
                    code: referralCodeRes.data.results?.[0] || null,
                    referrals: referralStatsRes.data.results || []
                });
            } catch (error) {
                console.log('No referral data found for customer:', error.message);
                setReferralData({ code: null, referrals: [] });
            }
        } catch (error) {
            console.error('Error fetching customer data:', error);
            setCustomer(null); // Set to null to show "Customer not found" message
        } finally {
            setLoading(false);
        }
    };

    const getLifecycleColor = (stage) => {
        const colors = {
            lead: 'bg-blue-100 text-blue-800',
            prospect: 'bg-purple-100 text-purple-800',
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-yellow-100 text-yellow-800',
            churned: 'bg-red-100 text-red-800',
            vip: 'bg-orange-100 text-orange-800'
        };
        return colors[stage] || 'bg-gray-100 text-gray-800';
    };

    const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
            <p className="text-lg md:text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs md:text-sm text-gray-600">{label}</p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
    );

    const ActivityTimeline = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
            <div className="space-y-3">
                {activities.length > 0 ? (
                    activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                            <div className="flex-shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.color === 'green' ? 'bg-green-100' :
                                    activity.color === 'blue' ? 'bg-blue-100' :
                                        'bg-gray-100'
                                    }`}>
                                    <Calendar className={`w-4 h-4 ${activity.color === 'green' ? 'text-green-600' :
                                        activity.color === 'blue' ? 'text-blue-600' :
                                            'text-gray-600'
                                        }`} />
                                </div>
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-1">
                                    <p className="font-medium text-gray-900">{activity.title}</p>
                                    <span className="text-[10px] md:text-xs text-gray-500 whitespace-nowrap">
                                        {activity.timestamp
                                            ? new Date(activity.timestamp).toLocaleDateString()
                                            : 'N/A'
                                        }
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">{activity.description}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-8">No activities yet</p>
                )}
            </div>
        </div>
    );

    const BookingHistory = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking History</h3>
            <div className="space-y-3">
                {bookings.length > 0 ? (
                    bookings.map((booking) => (
                        <div key={booking.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-2">
                                <div>
                                    <p className="font-medium text-gray-900">Booking #{booking.id}</p>
                                    <p className="text-sm text-gray-600">
                                        {booking.package_name || booking.service_name || 'Service'}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-medium whitespace-nowrap ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    booking.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                        booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                            booking.status === 'ready_for_delivery' ? 'bg-purple-100 text-purple-800' :
                                                'bg-gray-100 text-gray-800'
                                    }`}>
                                    {booking.status_display || booking.status?.replace(/_/g, ' ').toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {booking.booking_datetime
                                        ? new Date(booking.booking_datetime).toLocaleDateString()
                                        : booking.booking_date
                                            ? new Date(booking.booking_date).toLocaleDateString()
                                            : 'N/A'
                                    }
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* <DollarSign className="w-4 h-4" /> */}
                                    ₹{booking.total_price || booking.total_amount || 0}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-8">No bookings yet</p>
                )}
            </div>
        </div>
    );

    const VehicleList = () => (
        <div className="space-y-4">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Vehicles</h3>
            </div>
            <div className={`grid ${activeTab === 'overview' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
                {vehicles.length > 0 ? (
                    vehicles.map((vehicle) => (
                        <div key={vehicle.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 group">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Car className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{vehicle.registration_number}</p>
                                    <p className="text-sm text-gray-600">
                                        {vehicle.brand} {vehicle.model}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {vehicle.vehicle_type_display} • {vehicle.color}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="col-span-2 text-center text-gray-500 py-8">No vehicles registered</p>
                )}
            </div>
        </div>
    );

    const ReferralInfo = () => {
        const handleCopyCode = () => {
            if (referralData?.code?.code) {
                navigator.clipboard.writeText(referralData.code.code);
                alert('Referral code copied to clipboard!');
            }
        };

        return (
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                    <Gift className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Referral Info</h3>
                </div>

                {referralData?.code ? (
                    <div className="space-y-4">
                        {/* Referral Code */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-2">Referral Code</p>
                            <div className="flex items-center justify-between">
                                <p className="text-2xl font-bold text-green-600">{referralData.code.code}</p>
                                <button
                                    onClick={handleCopyCode}
                                    className="p-2 hover:bg-green-100 rounded transition-colors"
                                    title="Copy code"
                                >
                                    <Copy className="w-4 h-4 text-green-600" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Used {referralData.code.times_used} times
                            </p>
                        </div>

                        {/* Referral Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-xs text-gray-600">Total Referrals</p>
                                <p className="text-xl font-bold text-blue-600">
                                    {referralData.referrals.length}
                                </p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3">
                                <p className="text-xs text-gray-600">Rewarded</p>
                                <p className="text-xl font-bold text-purple-600">
                                    {referralData.referrals.filter(r => r.status === 'rewarded').length}
                                </p>
                            </div>
                        </div>

                        {/* Recent Referrals */}
                        {referralData.referrals.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Recent Referrals</p>
                                <div className="space-y-2">
                                    {referralData.referrals.slice(0, 3).map((referral) => (
                                        <div key={referral.id} className="bg-gray-50 rounded p-2 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-900">{referral.referee_name}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${referral.status === 'rewarded' ? 'bg-green-100 text-green-800' :
                                                    referral.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {referral.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <Gift className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No referral code yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Code will be generated after first job completion
                        </p>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <p className="text-gray-600">Customer not found</p>
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Back to Customers
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/admin/users')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Customers
                </button>

                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                        <div className="flex flex-col md:flex-row items-start gap-4">
                            <div className="w-16 h-16 bg-blue-600 rounded-full flex-shrink-0 flex items-center justify-center text-white text-2xl font-bold">
                                {customer.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0 w-full">
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{customer.name}</h1>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <Phone className="w-4 h-4" />
                                        {customer.phone}
                                    </div>
                                    {customer.email && (
                                        <div className="flex items-center gap-1">
                                            <Mail className="w-4 h-4" />
                                            {customer.email}
                                        </div>
                                    )}
                                    {customer.address && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {customer.address}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    {customer.lifecycle && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLifecycleColor(customer.lifecycle.current_stage)}`}>
                                            {customer.lifecycle.current_stage_display || customer.lifecycle.current_stage}
                                        </span>
                                    )}
                                    {customer.segments && customer.segments.map((segment, index) => (
                                        <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                            {segment.segment_type_display}
                                        </span>
                                    ))}
                                    {customer.membership_type && (
                                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium flex items-center gap-1">
                                            <Award className="w-3 h-3" />
                                            {customer.membership_type}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            <Edit className="w-4 h-4" />
                            Edit Profile
                        </button> */}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
                <StatCard
                    icon={Package}
                    label="Total Bookings"
                    value={bookings.length}
                    color="bg-blue-500"
                />
                <StatCard
                    icon={DollarSign}
                    label="Lifetime Value"
                    value={`₹${bookings.reduce((sum, b) => sum + (b.final_amount || b.total_amount || 0), 0).toLocaleString()}`}
                    color="bg-green-500"
                />
                <StatCard
                    icon={Star}
                    label="Reward Points"
                    value={customer.reward_points || customer.points || 0}
                    color="bg-yellow-500"
                />
                <StatCard
                    icon={Car}
                    label="Vehicles"
                    value={vehicles.length}
                    color="bg-purple-500"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Customer Score"
                    value={customer.lifecycle?.customer_score || customer.customer_score || Math.min(100, bookings.length * 10)}
                    color="bg-orange-500"
                />
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200 overflow-x-auto">
                    <nav className="-mb-px flex space-x-4 md:space-x-8 min-w-max">
                        {['overview', 'activity', 'bookings', 'vehicles'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {activeTab === 'overview' && (
                    <>
                        <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">
                            <ActivityTimeline />
                            <BookingHistory />
                        </div>
                        <div className="order-1 lg:order-2 space-y-6">
                            <VehicleList />

                            {/* Referral Info */}
                            <ReferralInfo />

                            {/* Notes */}
                            {customer.recent_notes && customer.recent_notes.length > 0 && (
                                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notes</h3>
                                    <div className="space-y-3">
                                        {customer.recent_notes.map((note, index) => (
                                            <div key={index} className="bg-gray-50 rounded-lg p-3">
                                                <div className="flex items-start justify-between mb-1">
                                                    <span className="text-xs font-medium text-gray-700">{note.category_display}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(note.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">{note.note}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'activity' && (
                    <div className="col-span-1 lg:col-span-3">
                        <ActivityTimeline />
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="col-span-1 lg:col-span-3">
                        <BookingHistory />
                    </div>
                )}

                {activeTab === 'vehicles' && (
                    <div className="col-span-1 lg:col-span-3">
                        <VehicleList />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Customer360View;
