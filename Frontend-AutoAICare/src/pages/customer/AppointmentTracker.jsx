import { Alert, Badge, Button, Card } from '@/components/ui';
import api from '@/utils/api';
import {
    AlertCircle, Calendar, Car, CheckCircle, Clock,
    MapPin, Package, Phone, RefreshCw, XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/**
 * Customer Appointment Tracker
 * Shows all appointment requests with their status
 */
const AppointmentTracker = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [message, setMessage] = useState(location.state?.message || '');

    // Alert state
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const response = await api.get('/appointments/');
            setAppointments(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (appointmentId) => {
        if (!confirm('Are you sure you want to cancel this appointment?')) return;

        try {
            await api.post(`/appointments/${appointmentId}/cancel/`);
            setMessage('Appointment cancelled successfully');
            showAlert('success', 'Appointment cancelled successfully');
            fetchAppointments();
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            showAlert('error', error.response?.data?.error || 'Failed to cancel appointment');
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            pending: {
                variant: 'warning',
                icon: Clock,
                text: 'Pending Review',
                bgColor: 'bg-yellow-50',
                borderColor: 'border-l-yellow-400',
                iconColor: 'text-yellow-600'
            },
            approved: {
                variant: 'success',
                icon: CheckCircle,
                text: 'Approved',
                bgColor: 'bg-green-50',
                borderColor: 'border-l-green-500',
                iconColor: 'text-green-600'
            },
            rejected: {
                variant: 'error',
                icon: XCircle,
                text: 'Rejected',
                bgColor: 'bg-red-50',
                borderColor: 'border-l-red-500',
                iconColor: 'text-red-600'
            },
            converted: {
                variant: 'info',
                icon: CheckCircle,
                text: 'Booking Confirmed',
                bgColor: 'bg-blue-50',
                borderColor: 'border-l-blue-500',
                iconColor: 'text-blue-600'
            },
            cancelled: {
                variant: 'secondary',
                icon: XCircle,
                text: 'Cancelled',
                bgColor: 'bg-gray-50',
                borderColor: 'border-l-gray-400',
                iconColor: 'text-gray-500'
            },
            expired: {
                variant: 'secondary',
                icon: Clock,
                text: 'Expired',
                bgColor: 'bg-gray-50',
                borderColor: 'border-l-gray-400',
                iconColor: 'text-gray-500'
            }
        };
        return configs[status] || configs.pending;
    };

    const filteredAppointments = appointments.filter(apt => {
        if (filter === 'all') return true;
        if (filter === 'active') return ['pending', 'approved'].includes(apt.status);
        return apt.status === filter;
    });

    const stats = {
        pending: appointments.filter(a => a.status === 'pending').length,
        approved: appointments.filter(a => a.status === 'approved').length,
        converted: appointments.filter(a => a.status === 'converted').length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Alert Component */}
            {alert.show && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert({ show: false, type: '', message: '' })}
                />
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Appointments</h1>
                    <p className="text-sm md:text-gray-600 mt-1">Track your appointment requests</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button onClick={() => navigate('/customer/book')} className="flex-1 sm:flex-none">
                        <Calendar size={18} className="mr-2" />
                        New Appointment
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchAppointments}
                        disabled={loading}
                        className="rounded-lg shrink-0"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            {/* Success Message */}
            {message && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="text-green-600" size={20} />
                    <p className="text-green-800">{message}</p>
                    <button onClick={() => setMessage('')} className="ml-auto text-green-600 hover:text-green-800">
                        ✕
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
                <Card className="text-center p-2 md:p-4">
                    <div className="text-xl md:text-3xl font-bold text-yellow-600">{stats.pending}</div>
                    <div className="text-[10px] md:text-sm text-gray-600">Pending</div>
                </Card>
                <Card className="text-center p-2 md:p-4">
                    <div className="text-xl md:text-3xl font-bold text-green-600">{stats.approved}</div>
                    <div className="text-[10px] md:text-sm text-gray-600">Approved</div>
                </Card>
                <Card className="text-center p-2 md:p-4">
                    <div className="text-xl md:text-3xl font-bold text-blue-600">{stats.converted}</div>
                    <div className="text-[10px] md:text-sm text-gray-600">Completed</div>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'converted', label: 'Completed' },
                    { value: 'rejected', label: 'Rejected' },
                ].map(f => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
              ${filter === f.value
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Appointments List */}
            {filteredAppointments.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No Appointments Found
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {filter === 'all'
                                ? "You haven't made any appointment requests yet."
                                : `No ${filter} appointments found.`}
                        </p>
                        <Button onClick={() => navigate('/customer/book')}>
                            Request an Appointment
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredAppointments.map((appointment) => {
                        const statusConfig = getStatusConfig(appointment.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                            <Card
                                key={appointment.id}
                                className={`${statusConfig.bgColor} border-l-4 ${statusConfig.borderColor} overflow-hidden`}
                            >
                                <div className="p-4 md:p-6">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${statusConfig.bgColor}`}>
                                                <StatusIcon className={statusConfig.iconColor} size={20} md:size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={statusConfig.variant} className="text-[10px] md:text-xs">
                                                        {statusConfig.text}
                                                    </Badge>
                                                    <span className="text-[10px] text-gray-400 sm:hidden">
                                                        {new Date(appointment.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs md:text-sm text-gray-600 mt-1">
                                                    Appointment #{appointment.id}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="hidden sm:block text-xs text-gray-500">
                                            {new Date(appointment.created_at).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {/* Vehicle */}
                                        <div className="flex items-start gap-3">
                                            <Car className="text-gray-400 mt-0.5" size={18} />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Vehicle</p>
                                                <p className="font-semibold text-gray-900">
                                                    {appointment.vehicle_details?.registration_number || 'N/A'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {appointment.vehicle_details?.brand} {appointment.vehicle_details?.model}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Detailed Pricing breakdown for customer */}
                                        <div className="flex items-start gap-3">
                                            <Package className="text-gray-400 mt-0.5" size={18} />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-700">Pricing Details</p>
                                                <p className="font-semibold text-gray-900 mb-2">
                                                    {appointment.package_details?.name || 'N/A'}
                                                </p>

                                                <div className="space-y-1.5 mt-1 border-t border-gray-100 pt-3">
                                                    {(() => {
                                                        const addonsPrice = appointment.addon_details?.reduce((sum, a) => sum + parseFloat(a.price), 0) || 0;
                                                        const subtotal = parseFloat(appointment.estimated_price) || 0;
                                                        const servicePrice = subtotal - addonsPrice;
                                                        const gstAmount = subtotal * 0.18;
                                                        const totalPrice = subtotal + gstAmount;

                                                        return (
                                                            <>
                                                                <div className="flex justify-between text-xs md:text-sm text-gray-600">
                                                                    <span>Service Price</span>
                                                                    <span className="font-medium text-gray-900">₹{servicePrice.toFixed(2)}</span>
                                                                </div>
                                                                {addonsPrice > 0 && (
                                                                    <div className="flex justify-between text-xs md:text-sm text-indigo-600">
                                                                        <span>Add-ons ({appointment.addon_details.length})</span>
                                                                        <span className="font-medium">₹{addonsPrice.toFixed(2)}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between text-xs md:text-sm font-bold text-gray-800 border-t border-gray-100 pt-1.5 mt-1">
                                                                    <span>Subtotal</span>
                                                                    <span>₹{subtotal.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs md:text-sm text-gray-600">
                                                                    <span>GST (18%)</span>
                                                                    <span className="font-medium text-gray-900">₹{gstAmount.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center bg-green-50 px-3 py-2 rounded-lg border border-green-200 mt-3 shadow-sm">
                                                                    <span className="text-sm md:text-lg font-bold text-green-800">Total</span>
                                                                    <span className="text-lg md:text-2xl font-black text-green-700">₹{totalPrice.toFixed(0)}</span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Schedule */}
                                    <div className="bg-white/50 rounded-lg p-3 mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calendar className="text-gray-400" size={16} />
                                            <p className="text-sm font-medium text-gray-700">Schedule</p>
                                        </div>
                                        <div className="space-y-1 ml-6">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="info" size="sm">PREFERRED</Badge>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {new Date(appointment.preferred_datetime).toLocaleString()}
                                                </span>
                                            </div>
                                            {appointment.alternate_datetime && (
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" size="sm">ALTERNATE</Badge>
                                                    <span className="text-sm text-gray-700">
                                                        {new Date(appointment.alternate_datetime).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                            {appointment.confirmed_datetime && appointment.status === 'approved' && (
                                                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                                                    <Badge variant="success" size="sm">CONFIRMED</Badge>
                                                    <span className="text-sm font-bold text-green-700">
                                                        {new Date(appointment.confirmed_datetime).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pickup Info */}
                                    {appointment.pickup_required && (
                                        <div className="flex items-start gap-2 mb-4 p-3 bg-blue-100/50 rounded-lg">
                                            <MapPin className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                                            <div>
                                                <p className="text-sm font-medium text-blue-900">Pickup & Drop Requested</p>
                                                <p className="text-sm text-blue-700">{appointment.location}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Status Messages */}
                                    {appointment.status === 'pending' && (
                                        <div className="flex items-start gap-2 p-3 bg-yellow-100/50 rounded-lg mb-4">
                                            <Clock className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                                            <div>
                                                <p className="text-sm text-yellow-800">
                                                    Your request is being reviewed. You'll be notified once processed.
                                                </p>
                                                <p className="text-xs text-yellow-600 mt-1">
                                                    Expires: {new Date(appointment.expires_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {appointment.status === 'approved' && (
                                        <div className="flex items-start gap-2 p-3 bg-green-100/50 rounded-lg mb-4">
                                            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                                            <p className="text-sm text-green-800">
                                                Your appointment has been approved!
                                                {appointment.confirmed_datetime && (
                                                    <> See you on {new Date(appointment.confirmed_datetime).toLocaleDateString()}!</>
                                                )}
                                            </p>
                                        </div>
                                    )}

                                    {appointment.status === 'rejected' && appointment.admin_notes && (
                                        <div className="flex items-start gap-2 p-3 bg-red-100/50 rounded-lg mb-4">
                                            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                                            <div>
                                                <p className="text-sm font-medium text-red-800">Reason:</p>
                                                <p className="text-sm text-red-700">{appointment.admin_notes}</p>
                                            </div>
                                        </div>
                                    )}

                                    {appointment.status === 'converted' && appointment.booking && (
                                        <div className="flex items-start gap-2 p-3 bg-blue-100/50 rounded-lg mb-4">
                                            <CheckCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                                            <div>
                                                <p className="text-sm text-blue-800">
                                                    Converted to Booking #{appointment.booking}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200/50">
                                        {appointment.status === 'pending' && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => navigate(`/customer/book`, { state: { rescheduleId: appointment.id } })}
                                                    className="flex-1 md:flex-none"
                                                >
                                                    <RefreshCw size={14} className="mr-1" />
                                                    Reschedule
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 md:flex-none text-red-600 hover:bg-red-50"
                                                    onClick={() => handleCancel(appointment.id)}
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        )}

                                        {appointment.status === 'converted' && appointment.booking && (
                                            <Button
                                                size="sm"
                                                className="w-full md:w-auto"
                                                onClick={() => navigate(`/customer/track?bookingId=${appointment.booking}`)}
                                            >
                                                View Booking
                                            </Button>
                                        )}

                                        {appointment.status === 'rejected' && (
                                            <Button
                                                size="sm"
                                                className="w-full md:w-auto"
                                                onClick={() => navigate('/customer/book')}
                                            >
                                                Request Again
                                            </Button>
                                        )}

                                        {/* Contact Support */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full md:w-auto md:ml-auto"
                                        >
                                            <Phone size={14} className="mr-1" />
                                            Support
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AppointmentTracker;
