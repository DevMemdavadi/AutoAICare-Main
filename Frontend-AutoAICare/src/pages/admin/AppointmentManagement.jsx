import { Alert, Badge, Button, Card, Input } from '@/components/ui';
import NotificationDetails from '@/components/NotificationDetails';
import { useNotifications } from '@/contexts/NotificationContext';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import {
    AlertCircle, Bell, Calendar, Car, Check, ChevronLeft, ChevronRight,
    Clock, Eye, Filter, MapPin, Package, Phone, PlusCircle, RefreshCw, Search, User, X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Admin Appointment Management Page
 * Features: List view, Calendar view, Approve/Reject actions
 */
const AppointmentManagement = () => {
    const navigate = useNavigate();
    const {
        isSuperAdmin,
        isCompanyAdmin,
        isBranchAdmin,
        getCurrentBranchId,
        selectedBranch,
        initialized
    } = useBranch();
    const [searchParams, setSearchParams] = useSearchParams();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({});
    const [view, setView] = useState('list'); // 'list' or 'calendar'
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [highlightedAppointmentId, setHighlightedAppointmentId] = useState(null);
    const appointmentRefs = useRef({});

    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarData, setCalendarData] = useState({});

    // Modal states
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [confirmedDateTime, setConfirmedDateTime] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Alert state
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

    // Handle URL parameters on mount
    useEffect(() => {
        const filterParam = searchParams.get('filter');
        const appointmentId = searchParams.get('appointmentId');

        if (filterParam) {
            setFilter(filterParam);
        }

        if (appointmentId) {
            setHighlightedAppointmentId(parseInt(appointmentId));
        }
    }, [searchParams]);

    // Scroll to highlighted appointment after appointments load
    useEffect(() => {
        if (highlightedAppointmentId && appointments.length > 0 && appointmentRefs.current[highlightedAppointmentId]) {
            setTimeout(() => {
                appointmentRefs.current[highlightedAppointmentId]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });

                // Clear highlight after 5 seconds
                setTimeout(() => {
                    setHighlightedAppointmentId(null);
                    // Clear URL params
                    setSearchParams({});
                }, 5000);
            }, 500);
        }
    }, [highlightedAppointmentId, appointments]);

    useEffect(() => {
        if (!initialized) return;
        fetchAppointments();
        fetchStats();
    }, [filter, selectedBranch, initialized]);

    useEffect(() => {
        if (view === 'calendar' && initialized) {
            fetchCalendarData();
        }
    }, [view, currentDate, selectedBranch, initialized]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const branchId = getCurrentBranchId();
            const params = {
                ordering: 'preferred_datetime',
                ...(branchId ? { branch: branchId } : {})
            };
            if (filter !== 'all') params.status = filter;
            if (search) params.search = search;

            const response = await api.get('/appointments/', { params });
            setAppointments(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const branchId = getCurrentBranchId();
            const params = branchId ? { branch: branchId } : {};
            const response = await api.get('/appointments/stats/', { params });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchCalendarData = async () => {
        try {
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            const branchId = getCurrentBranchId();

            const response = await api.get('/appointments/calendar/', {
                params: {
                    start_date: startOfMonth.toISOString().split('T')[0],
                    end_date: endOfMonth.toISOString().split('T')[0],
                    ...(branchId ? { branch: branchId } : {})
                }
            });
            setCalendarData(response.data.appointments || {});
        } catch (error) {
            console.error('Error fetching calendar data:', error);
        }
    };

    const handleApprove = async () => {
        if (!selectedAppointment) return;

        try {
            setActionLoading(true);
            await api.post(`/appointments/${selectedAppointment.id}/approve/`, {
                confirmed_datetime: confirmedDateTime || selectedAppointment.preferred_datetime
            });

            setShowApproveModal(false);
            setSelectedAppointment(null);
            setConfirmedDateTime('');
            fetchAppointments();
            fetchStats();
        } catch (error) {
            console.error('Error approving appointment:', error);
            showAlert('error', error.response?.data?.error || 'Failed to approve');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedAppointment || !rejectReason.trim()) {
            showAlert('warning', 'Please provide a reason for rejection');
            return;
        }

        try {
            setActionLoading(true);
            await api.post(`/appointments/${selectedAppointment.id}/reject/`, {
                reason: rejectReason
            });

            setShowRejectModal(false);
            setSelectedAppointment(null);
            setRejectReason('');
            fetchAppointments();
            fetchStats();
        } catch (error) {
            console.error('Error rejecting appointment:', error);
            showAlert('error', error.response?.data?.error || 'Failed to reject');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConvertToBooking = async () => {
        if (!selectedAppointment) return;

        try {
            setActionLoading(true);
            const response = await api.post(`/appointments/${selectedAppointment.id}/convert_to_booking/`);
            showAlert('success', `Booking #${response.data.booking.id} created successfully!`);
            setShowConvertModal(false);
            setSelectedAppointment(null);
            fetchAppointments();
            fetchStats();
        } catch (error) {
            console.error('Error converting to booking:', error);
            showAlert('error', error.response?.data?.error || 'Failed to convert');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDirectCreateBooking = async (appointment) => {
        const confirmMsg = appointment.status === 'pending'
            ? 'This will approve the appointment and create a booking. Continue?'
            : 'Create a booking from this appointment?';

        if (!confirm(confirmMsg)) return;

        try {
            setActionLoading(true);

            // If pending, approve first
            if (appointment.status === 'pending') {
                await api.post(`/appointments/${appointment.id}/approve/`, {
                    confirmed_datetime: appointment.preferred_datetime
                });
            }

            // Now convert to booking
            const response = await api.post(`/appointments/${appointment.id}/convert_to_booking/`);
            showAlert('success', `Booking #${response.data.booking.id} created successfully!`);

            // Navigate to the booking details
            navigate(`/admin/bookings/${response.data.booking.id}`);
        } catch (error) {
            console.error('Error creating booking:', error);
            showAlert('error', error.response?.data?.error || 'Failed to create booking');
            fetchAppointments();
            fetchStats();
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            pending: { variant: 'warning', text: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-100' },
            approved: { variant: 'success', text: 'Approved', color: 'text-green-600', bg: 'bg-green-100' },
            rejected: { variant: 'error', text: 'Rejected', color: 'text-red-600', bg: 'bg-red-100' },
            converted: { variant: 'info', text: 'Converted', color: 'text-blue-600', bg: 'bg-blue-100' },
            cancelled: { variant: 'secondary', text: 'Cancelled', color: 'text-gray-600', bg: 'bg-gray-100' },
            expired: { variant: 'secondary', text: 'Expired', color: 'text-gray-600', bg: 'bg-gray-100' },
        };
        return configs[status] || configs.pending;
    };

    // Calendar helpers
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { firstDay, daysInMonth };
    };

    const navigateMonth = (direction) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    };

    const renderCalendar = () => {
        const { firstDay, daysInMonth } = getDaysInMonth(currentDate);
        const days = [];
        const today = new Date().toISOString().split('T')[0];

        // Empty cells for days before the first day
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayAppointments = calendarData[dateStr] || [];
            const isToday = dateStr === today;

            days.push(
                <div
                    key={day}
                    className={`h-24 border border-gray-200 p-1 overflow-hidden ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
                >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                        {day}
                    </div>
                    <div className="space-y-0.5 overflow-y-auto max-h-16">
                        {dayAppointments.slice(0, 3).map((apt) => {
                            const statusConfig = getStatusConfig(apt.status);
                            return (
                                <div
                                    key={apt.id}
                                    onClick={() => setSelectedAppointment(apt)}
                                    className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${statusConfig.bg} ${statusConfig.color}`}
                                >
                                    {new Date(apt.preferred_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {apt.customer_name}
                                </div>
                            );
                        })}
                        {dayAppointments.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                                +{dayAppointments.length - 3} more
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return days;
    };

    return (
        <div className="space-y-6">
            {/* Alert Component */}
            {alert.show && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert({ show: false, type: '', message: '' })}
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Appointment Management</h1>
                    <p className="text-sm md:text-base text-gray-600 mt-1">Review and manage customer appointment requests</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={view === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setView('list')}
                        className="flex-1 md:flex-initial flex items-center justify-center gap-1 text-xs md:text-sm px-2 md:px-3"
                    >
                        <span>List View</span>
                    </Button>
                    <Button
                        variant={view === 'calendar' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setView('calendar')}
                        className="flex-1 md:flex-initial flex items-center justify-center gap-1 text-xs md:text-sm px-2 md:px-3"
                    >
                        <Calendar size={14} className="md:hidden" />
                        <Calendar size={16} className="hidden md:block" />
                        <span>Calendar</span>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {loading ? (
                    // Stat card skeletons
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-7 w-12 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <>
                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Clock className="text-yellow-600" size={24} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
                                    <div className="text-sm text-gray-600">Pending</div>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Check className="text-green-600" size={24} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-600">{stats.approved || 0}</div>
                                    <div className="text-sm text-gray-600">Approved</div>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <X className="text-red-600" size={24} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-red-600">{stats.rejected || 0}</div>
                                    <div className="text-sm text-gray-600">Rejected</div>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <AlertCircle className="text-blue-600" size={24} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">{stats.today_pending || 0}</div>
                                    <div className="text-sm text-gray-600">Today's Pending</div>
                                </div>
                            </div>
                        </Card>
                    </>
                )}
            </div>

            {/* Calendar View */}
            {view === 'calendar' && (
                <Card>
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                            <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <ChevronLeft size={20} />
                            </button>
                            <h3 className="text-lg font-semibold">
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h3>
                            <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-600 border-b">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="py-2">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {renderCalendar()}
                    </div>
                </Card>
            )}

            {/* List View */}
            {view === 'list' && (
                <>
                    {/* Filters & Search */}
                    <Card className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex items-center gap-0.5 overflow-x-auto scroll-smooth pb-2 pr-2">
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className="text-xs md:text-sm text-gray-600">Filter:</span>
                                </div>
                                {['all', 'pending', 'approved', 'rejected', 'converted'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                      ${filter === f
                                                ? 'bg-primary text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 w-full md:flex-1 md:ml-auto md:max-w-sm">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchAppointments()}
                                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                    />
                                </div>
                                <Button variant="outline" size="sm" onClick={fetchAppointments} className="px-2 md:px-3">
                                    <RefreshCw size={14} className="md:hidden" />
                                    <RefreshCw size={16} className="hidden md:block" />
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Appointments List */}
                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i} className="overflow-hidden border-l-[6px] border-gray-200">
                                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                        {/* Status column skeleton */}
                                        <div className="md:w-48 p-4 bg-gray-50/50 flex flex-col justify-between gap-4">
                                            <div className="space-y-2">
                                                <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
                                                <div className="h-7 w-10 bg-gray-200 rounded animate-pulse" />
                                                <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                                                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                                            </div>
                                        </div>
                                        {/* Main info skeleton */}
                                        <div className="flex-1 p-5">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                                {/* Customer */}
                                                <div className="space-y-2">
                                                    <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                                                    <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
                                                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                                                </div>
                                                {/* Vehicle */}
                                                <div className="space-y-2">
                                                    <div className="h-3 w-14 bg-gray-100 rounded animate-pulse" />
                                                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                                                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                                                </div>
                                                {/* Pricing */}
                                                <div className="space-y-2">
                                                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                                                    <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
                                                    <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                                                    <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                                                    <div className="h-8 w-full bg-gray-200 rounded-md animate-pulse mt-1" />
                                                </div>
                                                {/* Schedule */}
                                                <div className="space-y-2">
                                                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                                                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                                                    <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                                                </div>
                                            </div>
                                            {/* Action row skeleton */}
                                            <div className="mt-6 pt-4 border-t flex items-center gap-3">
                                                <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
                                                <div className="h-9 w-24 bg-gray-100 rounded-lg animate-pulse" />
                                                <div className="h-9 w-32 bg-gray-100 rounded-lg animate-pulse ml-auto" />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : appointments.length === 0 ? (
                        <Card className="p-12 text-center">
                            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointments Found</h3>
                            <p className="text-gray-600">No {filter !== 'all' ? filter : ''} appointments to display.</p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {appointments.map((appointment) => {
                                const statusConfig = getStatusConfig(appointment.status);
                                const isUrgent = appointment.status === 'pending' &&
                                    new Date(appointment.preferred_datetime) <= new Date(Date.now() + 24 * 60 * 60 * 1000);
                                const isHighlighted = highlightedAppointmentId === appointment.id;
                                return (
                                    <Card
                                        key={appointment.id}
                                        ref={(el) => appointmentRefs.current[appointment.id] = el}
                                        className={`group overflow-hidden transition-all duration-300 hover:shadow-xl border-l-[6px] ${isUrgent ? 'border-red-500 ring-1 ring-red-100' :
                                            appointment.status === 'pending' ? 'border-yellow-500' :
                                                appointment.status === 'approved' ? 'border-green-500' :
                                                    'border-blue-500'
                                            } ${isHighlighted ? 'ring-4 ring-blue-500 shadow-2xl scale-[1.01]' : ''}`}
                                    >
                                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                            {/* Status & ID Column */}
                                            <div className="md:w-48 p-4 bg-gray-50/50 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant={statusConfig.variant} className="font-black tracking-tight">
                                                            {statusConfig.text}
                                                        </Badge>
                                                        {(isSuperAdmin || isCompanyAdmin) && !selectedBranch && (
                                                            <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 font-bold">
                                                                {appointment.branch_name || "N/A"}
                                                            </Badge>
                                                        )}
                                                        {isUrgent && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>}
                                                    </div>
                                                    <p className="text-xl font-black text-gray-900">#{appointment.id}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Ref ID</p>
                                                </div>
                                                <div className="mt-4 md:mt-0">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Submitted</p>
                                                    <p className="text-xs font-bold text-gray-600">
                                                        {new Date(appointment.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {new Date(appointment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Main Info Area */}
                                            <div className="flex-1 p-5">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                                    {/* Customer */}
                                                    <div>
                                                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                                                            <User size={14} className="text-primary" />
                                                            <span className="text-[10px] font-bold uppercase tracking-tighter">Customer</span>
                                                        </div>
                                                        <p className="font-semibold text-gray-900 leading-tight mb-1">{appointment.customer_details?.user?.name || 'N/A'}</p>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-3">
                                                            {appointment.customer_details?.user?.phone || 'N/A'}
                                                        </div>

                                                        {appointment.notes && (
                                                            <div className="bg-yellow-50/50 p-2 rounded border border-yellow-100">
                                                                <div className="inline-flex items-center gap-1 text-yellow-600 text-[9px] font-bold uppercase mb-1">
                                                                    <AlertCircle size={10} /> Note
                                                                </div>
                                                                <p className="text-[11px] text-gray-700 italic leading-snug">"{appointment.notes}"</p>
                                                            </div>
                                                        )}
                                                        {appointment.location && (
                                                            <div className="bg-gray-50/80 p-2 rounded border border-gray-100">
                                                                <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mb-1">
                                                                    <MapPin size={10} /> Address
                                                                </div>
                                                                <p className="text-[11px] text-gray-600 font-medium leading-relaxed">{appointment.location}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Vehicle */}
                                                    <div>
                                                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                                                            <Car size={14} className="text-primary" />
                                                            <span className="text-[10px] font-bold uppercase tracking-tighter">Vehicle</span>
                                                        </div>
                                                        <p className="font-semibold text-gray-900 leading-tight mb-1">{appointment.vehicle_details?.registration_number || 'N/A'}</p>
                                                        <p className="text-xs text-gray-500 font-medium capitalize">
                                                            {appointment.vehicle_details?.brand} {appointment.vehicle_details?.model}
                                                        </p>
                                                    </div>

                                                    {/* Service & Pricing */}
                                                    <div className="lg:border-x lg:px-6 border-gray-100">
                                                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                                                            <Package size={14} className="text-primary" />
                                                            <span className="text-[10px] font-bold uppercase tracking-tighter">Pricing Breakdown</span>
                                                        </div>
                                                        <p className="font-semibold text-gray-900 leading-tight mb-2">{appointment.package_details?.name || 'N/A'}</p>

                                                        <div className="space-y-1 mb-3">
                                                            {(() => {
                                                                const addonsPrice = appointment.addon_details?.reduce((sum, a) => sum + parseFloat(a.price), 0) || 0;
                                                                const subtotal = parseFloat(appointment.estimated_price) || 0;
                                                                const servicePrice = subtotal - addonsPrice;
                                                                const gstAmount = subtotal * 0.18;
                                                                const totalPrice = subtotal + gstAmount;

                                                                return (
                                                                    <>
                                                                        <div className="flex justify-between items-center text-[11px] leading-tight">
                                                                            <span className="text-gray-500">Service Price</span>
                                                                            <span className="font-medium text-gray-800">₹{servicePrice.toFixed(2)}</span>
                                                                        </div>
                                                                        {addonsPrice > 0 && (
                                                                            <div className="flex justify-between items-center text-[11px] leading-tight">
                                                                                <span className="text-gray-500">Add-ons ({appointment.addon_details.length})</span>
                                                                                <span className="font-medium text-indigo-600">₹{addonsPrice.toFixed(2)}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex justify-between items-center text-[11px] leading-tight border-t border-gray-50 pt-1 mt-1">
                                                                            <span className="text-gray-600 font-medium">Subtotal</span>
                                                                            <span className="font-bold text-gray-900">₹{subtotal.toFixed(2)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center text-[11px] leading-tight">
                                                                            <span className="text-gray-500">GST (18%)</span>
                                                                            <span className="font-medium text-gray-800">₹{gstAmount.toFixed(2)}</span>
                                                                        </div>
                                                                        <div className="bg-green-600 rounded-md p-2 mt-2 shadow-sm">
                                                                            <div className="flex justify-between items-center text-white">
                                                                                <span className="text-[10px] font-bold uppercase tracking-wider">Total Price</span>
                                                                                <span className="text-sm font-black">₹{totalPrice.toFixed(2)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>

                                                    {/* Schedule & Logistics */}
                                                    <div>
                                                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                                                            <Calendar size={14} className="text-primary" />
                                                            <span className="text-[10px] font-bold uppercase tracking-tighter">Preferred Time</span>
                                                        </div>
                                                        <p className="font-semibold text-gray-900 leading-tight">{new Date(appointment.preferred_datetime).toLocaleDateString()}</p>
                                                        <p className="text-sm font-bold text-blue-600 mb-2">
                                                            {new Date(appointment.preferred_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>

                                                        <div className="space-y-2">
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Row - Moved to bottom of info area */}
                                                <div className="mt-6 pt-4 border-t flex flex-wrap items-center gap-3">
                                                    {appointment.status === 'pending' && (
                                                        <>
                                                            <Button
                                                                onClick={() => {
                                                                    setSelectedAppointment(appointment);
                                                                    setConfirmedDateTime(appointment.preferred_datetime);
                                                                    setShowApproveModal(true);
                                                                }}
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 font-bold px-6"
                                                            >
                                                                <Check size={16} className="mr-2" /> Approve
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600 border-red-200 hover:bg-red-50 font-bold px-6"
                                                                onClick={() => {
                                                                    setSelectedAppointment(appointment);
                                                                    setShowRejectModal(true);
                                                                }}
                                                            >
                                                                <X size={16} className="mr-2" /> Reject
                                                            </Button>
                                                        </>
                                                    )}

                                                    {appointment.status === 'approved' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-blue-600 hover:bg-blue-700 font-bold px-8 h-10"
                                                            onClick={() => {
                                                                setSelectedAppointment(appointment);
                                                                setShowConvertModal(true);
                                                            }}
                                                        >
                                                            <RefreshCw size={16} className="mr-2" /> Convert to Booking
                                                        </Button>
                                                    )}

                                                    {appointment.status !== 'converted' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-primary border-primary/20 hover:bg-primary/5 font-bold ml-auto"
                                                            onClick={() => navigate(`/admin/bookings/create-walk-in?appointmentId=${appointment.id}`)}
                                                        >
                                                            <PlusCircle size={16} className="mr-2" /> Create Booking
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Approve Modal */}
            {showApproveModal && selectedAppointment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Approve Appointment</h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Customer</p>
                                    <p className="font-semibold">{selectedAppointment.customer_details?.user?.name}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirm Date & Time
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        value={confirmedDateTime ? new Date(confirmedDateTime).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => setConfirmedDateTime(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Customer preferred: {new Date(selectedAppointment.preferred_datetime).toLocaleString()}
                                    </p>
                                    {selectedAppointment.alternate_datetime && (
                                        <p className="text-xs text-gray-500">
                                            Alternate: {new Date(selectedAppointment.alternate_datetime).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowApproveModal(false);
                                        setSelectedAppointment(null);
                                    }}
                                    disabled={actionLoading}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleApprove}
                                    disabled={actionLoading}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                    {actionLoading ? 'Approving...' : 'Approve'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedAppointment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Appointment</h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Customer</p>
                                    <p className="font-semibold">{selectedAppointment.customer_details?.user?.name}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reason for Rejection *
                                    </label>
                                    <textarea
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                        rows={3}
                                        placeholder="Please provide a reason..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                    />
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {[
                                            'Fully booked for this slot',
                                            'Service unavailable',
                                            'Vehicle type mismatch',
                                            'Pickup not available in area'
                                        ].map(reason => (
                                            <button
                                                key={reason}
                                                type="button"
                                                onClick={() => setRejectReason(reason)}
                                                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                                            >
                                                {reason}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setSelectedAppointment(null);
                                        setRejectReason('');
                                    }}
                                    disabled={actionLoading}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleReject}
                                    disabled={actionLoading || !rejectReason.trim()}
                                    className="flex-1 bg-red-600 hover:bg-red-700"
                                >
                                    {actionLoading ? 'Rejecting...' : 'Reject'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Convert to Booking Modal */}
            {showConvertModal && selectedAppointment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Convert to Booking</h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-800 mb-2">
                                        <strong>Confirmation Required</strong>
                                    </p>
                                    <p className="text-sm text-blue-700">
                                        Convert this appointment to a confirmed booking?
                                    </p>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Customer</p>
                                        <p className="font-semibold text-gray-900">
                                            {selectedAppointment.customer_details?.user?.name}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Service</p>
                                        <p className="font-semibold text-gray-900">
                                            {selectedAppointment.package_details?.name}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Scheduled Time</p>
                                        <p className="font-semibold text-gray-900">
                                            {new Date(selectedAppointment.confirmed_datetime || selectedAppointment.preferred_datetime).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowConvertModal(false);
                                        setSelectedAppointment(null);
                                    }}
                                    disabled={actionLoading}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConvertToBooking}
                                    disabled={actionLoading}
                                    className="flex-1 bg-primary hover:bg-primary/90"
                                >
                                    {actionLoading ? 'Converting...' : 'OK'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AppointmentManagement;
