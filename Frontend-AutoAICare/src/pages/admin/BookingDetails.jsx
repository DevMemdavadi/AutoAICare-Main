import { Badge, Button, Card, Table } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import {
  ArrowLeft, Calendar, Car, CreditCard, Mail, Phone, User,
  MessageSquare, CheckCircle, AlertCircle, FileText, FileCheck,
  Crown, Star, Wrench, Users, Tag, Receipt, Clock, MapPin,
  Bike, ChevronRight, Pencil,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EditBookingModal from './components/booking/EditBookingModal';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtT = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_BADGE = {
  pending: 'default', confirmed: 'info', vehicle_arrived: 'info',
  assigned_to_fm: 'warning', in_progress: 'warning', completed: 'success', cancelled: 'destructive',
  qc_pending: 'warning', qc_completed: 'warning', qc_rejected: 'destructive',
  supervisor_approved: 'info', supervisor_rejected: 'destructive',
  floor_manager_confirmed: 'warning', assigned_to_applicator: 'info',
  work_in_progress: 'warning', work_completed: 'info',
  final_qc_pending: 'warning', final_qc_passed: 'success', final_qc_failed: 'destructive',
  floor_manager_final_qc_confirmed: 'warning', customer_approval_pending: 'warning',
  customer_approved: 'success', customer_revision_requested: 'warning',
  ready_for_billing: 'info', billed: 'success', ready_for_delivery: 'info',
  delivered: 'success', closed: 'default',
};

const fmtStatus = (s) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Booking timeline steps in order
const TIMELINE_STEPS = [
  { key: 'created', label: 'Booking Created', icon: Calendar },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'vehicle_arrived', label: 'Vehicle Arrived', icon: Car },
  { key: 'assigned_to_fm', label: 'Assigned to FM', icon: User },
  { key: 'work_in_progress', label: 'Work in Progress', icon: Wrench },
  { key: 'qc_pending', label: 'QC Check', icon: FileCheck },
  { key: 'supervisor_approved', label: 'Supervisor Approved', icon: Star },
  { key: 'billed', label: 'Billed', icon: Receipt },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

// Status ordering for timeline highlighting
const STATUS_ORDER = [
  'pending', 'confirmed', 'vehicle_arrived', 'assigned_to_fm',
  'work_in_progress', 'qc_pending', 'qc_completed', 'supervisor_approved',
  'billed', 'ready_for_delivery', 'delivered', 'closed',
];

/* ─── sub-components ───────────────────────────────────────────────────────── */

function InfoRow({ label, value, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value || '—'}</span>
    </div>
  );
}

function PersonCard({ title, person, accentColor = 'blue', icon: Icon = User }) {
  if (!person) return null;
  const bg = { blue: 'bg-blue-100', yellow: 'bg-yellow-100', green: 'bg-green-100', purple: 'bg-purple-100' };
  const txt = { blue: 'text-blue-600', yellow: 'text-yellow-600', green: 'text-green-600', purple: 'text-purple-600' };
  return (
    <Card className="lg:col-span-1" title={title}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 ${bg[accentColor]} rounded-full flex items-center justify-center flex-shrink-0`}>
            <Icon className={txt[accentColor]} size={18} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{person.name || '—'}</p>
            {person.role && <p className="text-xs text-gray-500 capitalize">{person.role}</p>}
          </div>
        </div>
        {person.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Phone size={13} className="text-gray-400" />
            {person.phone}
          </div>
        )}
        {person.email && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Mail size={13} className="text-gray-400" />
            {person.email}
          </div>
        )}
      </div>
    </Card>
  );
}

function BookingTimeline({ booking }) {
  const currentStatus = booking?.jobcard?.status || booking?.status || 'pending';
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <Card title="Booking Timeline">
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {TIMELINE_STEPS.map((step, idx) => {
          const stepIndex = STATUS_ORDER.indexOf(step.key);
          const done = stepIndex !== -1 && currentIndex >= stepIndex;
          const active = step.key === currentStatus ||
            (step.key === 'created' && currentIndex === 0);
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                <div className={`
                  h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all
                  ${active ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200'
                    : done ? 'bg-green-500 border-green-500'
                      : 'bg-white border-gray-200'}
                `}>
                  <Icon size={16} className={active || done ? 'text-white' : 'text-gray-300'} />
                </div>
                <span className={`text-[10px] text-center leading-tight font-medium
                  ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div className={`h-0.5 w-8 mb-5 flex-shrink-0 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function FinancialSummary({ booking }) {
  const pb = booking.price_breakdown || {};
  const coupon = booking.coupon_details;
  const payment = booking.payment_details;
  const isPaid = payment?.status === 'completed';

  return (
    <Card title="Financial Summary">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">₹{parseFloat(booking.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">GST</span>
            <span className="font-medium">₹{parseFloat(booking.gst_amount || 0).toFixed(2)}</span>
          </div>
          {parseFloat(booking.discount_amount || 0) > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span className="flex items-center gap-1">
                <Tag size={12} />
                {coupon ? `Coupon (${coupon.code})` : 'Discount'}
              </span>
              <span className="font-medium">-₹{parseFloat(booking.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="pt-2 border-t flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-lg text-gray-900">₹{parseFloat(booking.total_price || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Right: payment pill + coupon */}
        <div className="flex flex-col gap-3">
          <div className={`rounded-xl p-4 flex items-center gap-3 ${isPaid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
            <CreditCard size={20} className={isPaid ? 'text-green-600' : 'text-red-500'} />
            <div>
              <p className={`font-semibold text-sm ${isPaid ? 'text-green-800' : 'text-red-700'}`}>
                {isPaid ? 'Payment Received' : 'Payment Pending'}
              </p>
              {payment && (
                <p className="text-xs text-gray-500 mt-0.5">
                  ₹{payment.amount} via {payment.payment_method} · {fmtT(payment.created_at)}
                </p>
              )}
              {!payment && (
                <p className="text-xs text-gray-500 mt-0.5">No payment recorded</p>
              )}
            </div>
          </div>

          {coupon && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Tag size={14} className="text-amber-600" />
              <div className="text-sm">
                <span className="font-semibold text-amber-800">{coupon.code}</span>
                <span className="text-amber-600 ml-2 text-xs">
                  {coupon.discount_type === 'percentage'
                    ? `${coupon.discount_value}% off`
                    : `₹${coupon.discount_value} off`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ─── main component ───────────────────────────────────────────────────────── */
const BookingDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { isSuperAdmin, getCurrentBranchId } = useBranch();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editTab, setEditTab] = useState(null); // null = closed, 'customer'|'vehicle'|'bookingInfo' = open


  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/bookings/${id}/`);
        setBooking(response.data);
      } catch (err) {
        console.error('Error fetching booking details:', err);
        if (err.response?.status === 401) setError('Authentication failed. Please log in again.');
        else if (err.response?.status === 403) setError('You do not have permission to view this booking.');
        else if (err.response?.status === 404) setError('Booking not found.');
        else setError('Failed to load booking details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchBookingDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
          <div>
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-24 mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
              <div className="h-6 bg-gray-200 rounded w-32 mt-2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Booking</h2>
          <p className="text-gray-600 mb-6">{error || "The booking you're looking for doesn't exist."}</p>
          <div className="flex gap-3 justify-center">
            <Link to="/admin/bookings">
              <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings</Button>
            </Link>
            <Button variant="primary" onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        </div>
      </div>
    );
  }

  const displayStatus = booking?.jobcard?.status || booking?.status;
  const vehicle = booking.vehicle_details || {};
  const customer = booking.customer_details || {};
  const customerUser = customer.user || {};
  const stats = booking.customer_stats || {};
  const membership = stats.membership;
  const canEdit = booking.status !== 'cancelled';

  const hasFloorManager = !!booking?.jobcard?.floor_manager_details;
  const hasSupervisor = !!booking?.jobcard?.supervisor_details;
  const hasApplicatorTeam = !!booking?.jobcard?.applicator_team_details?.length;

  return (
    <>
      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link to="/admin/bookings">
              <Button variant="outline" size="icon"><ArrowLeft size={18} /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Booking #{booking.id}</h1>
              <p className="text-sm text-gray-500">Created {fmtT(booking.created_at)}</p>
            </div>
          </div>
          <Badge variant={STATUS_BADGE[displayStatus] || 'default'} className="text-sm py-1.5 px-4">
            {fmtStatus(displayStatus)}
          </Badge>
        </div>

        {/* ── Timeline ──────────────────────────────────────────────────── */}
        {/* Hide for now because of status value */}
        {/* <BookingTimeline booking={booking} /> */}

        {/* ── Top cards row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Customer */}
          <Card
            title="Customer"
            actions={canEdit && (
              <button
                onClick={() => setEditTab('customer')}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{customerUser.name || '—'}</p>
                  <p className="text-xs text-gray-500">
                    {stats.total_visits
                      ? `${stats.total_visits} visit${stats.total_visits > 1 ? 's' : ''} total`
                      : 'First visit'}
                    {stats.last_visit && ` · Last: ${fmt(stats.last_visit)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Phone size={14} className="text-gray-400" />
                {customerUser.phone || '—'}
              </div>

              {customerUser.email && !customerUser.email.endsWith('@walkin.local') && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail size={14} className="text-gray-400" />
                  {customerUser.email}
                </div>
              )}

              {/* Membership badge */}
              {membership ? (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <Crown size={14} className="text-amber-500" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-800">{membership.plan_name}</p>
                    {membership.end_date && (
                      <p className="text-[10px] text-amber-600">Expires {fmt(membership.end_date)}</p>
                    )}
                    {membership.washes_remaining != null && (
                      <p className="text-[10px] text-amber-600">{membership.washes_remaining} washes left</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <Star size={14} className="text-gray-400" />
                  <p className="text-xs text-gray-500">No active membership</p>
                </div>
              )}
            </div>
          </Card>

          {/* Vehicle */}
          <Card
            title="Vehicle"
            actions={canEdit && (
              <button
                onClick={() => setEditTab('vehicle')}
                className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {vehicle.vehicle_type === 'bike'
                    ? <Bike className="text-purple-600" size={20} />
                    : <Car className="text-purple-600" size={20} />}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{vehicle.brand} {vehicle.model}</p>
                  <p className="text-xs text-gray-500 capitalize">{vehicle.vehicle_type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <InfoRow label="Reg. Number" value={vehicle.registration_number} />
                <InfoRow label="Year" value={vehicle.year} />
                {/* <InfoRow label="Color" value={vehicle.color || '—'} />
              <InfoRow label="Odometer" value={vehicle.odometer_reading ? `${vehicle.odometer_reading} km` : '—'} /> */}
              </div>

              {(vehicle.last_service_date || vehicle.next_service_due) && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                  <InfoRow label="Last Service" value={fmt(vehicle.last_service_date)} />
                  <InfoRow label="Next Due" value={fmt(vehicle.next_service_due)} />
                </div>
              )}
            </div>
          </Card>

          {/* Booking Info */}
          <Card
            title="Booking Info"
            actions={canEdit && (
              <button
                onClick={() => setEditTab('bookingInfo')}
                className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-800 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="text-orange-600" size={18} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{fmtT(booking.booking_datetime)}</p>
                  <p className="text-xs text-gray-500">Scheduled date & time</p>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">Services</p>
                {(booking.packages_details || []).map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm text-gray-800">
                    <ChevronRight size={12} className="text-gray-400" />
                    {p.name}
                    {p.duration && <span className="text-xs text-gray-400 ml-1">{p.duration}min</span>}
                  </div>
                ))}
                {(!booking.packages_details || booking.packages_details.length === 0) && (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>

              {/* Add-ons */}
              {booking.addon_details && booking.addon_details.length > 0 && (
                <div className="space-y-1 pt-1 border-t">
                  <p className="text-xs font-medium text-gray-500">Add-ons</p>
                  {booking.addon_details.map(a => (
                    <div key={a.id} className="flex justify-between text-sm text-gray-700">
                      <span className="flex items-center gap-1"><ChevronRight size={11} className="text-gray-400" />{a.name}</span>
                      <span className="text-gray-500">+₹{a.price}</span>
                    </div>
                  ))}
                </div>
              )}

              {booking.branch_details && !['branch_admin'].includes(user?.role) && (
                <div className="pt-1 border-t">
                  <InfoRow label="Branch" value={booking.branch_details.name} />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Financial Summary ──────────────────────────────────────────── */}
        <FinancialSummary booking={booking} />

        {/* ── Staff cards ────────────────────────────────────────────────── */}
        {(hasFloorManager || hasSupervisor || hasApplicatorTeam) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hasFloorManager && (
              <PersonCard
                title="Floor Manager"
                person={booking.jobcard.floor_manager_details}
                accentColor="yellow"
              />
            )}
            {hasSupervisor && (
              <PersonCard
                title="Supervisor"
                person={booking.jobcard.supervisor_details}
                accentColor="purple"
                icon={Star}
              />
            )}
            {hasApplicatorTeam && booking.jobcard.applicator_team_details.map((member, i) => (
              <PersonCard
                key={i}
                title={`Applicator ${booking.jobcard.applicator_team_details.length > 1 ? i + 1 : ''}`}
                person={member}
                accentColor="green"
                icon={Wrench}
              />
            ))}
          </div>
        )}

        {/* ── Pickup & Drop ──────────────────────────────────────────────── */}
        {(booking.pickup_required || booking.pickup_request_details) && (
          <Card title="Pickup & Drop Details">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoRow label="Pickup Required" value={booking.pickup_required ? 'Yes' : 'No'} />
              {booking.location && (
                <div className="flex flex-col gap-0.5 col-span-2">
                  <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <MapPin size={11} />Pickup Address
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{booking.location}</span>
                </div>
              )}
              {booking.pickup_request_details?.pickup_time && (
                <InfoRow label="Pickup Time" value={fmtT(booking.pickup_request_details.pickup_time)} />
              )}
              {booking.pickup_request_details?.status && (
                <InfoRow label="Status" value={fmtStatus(booking.pickup_request_details.status)} />
              )}
              {booking.pickup_request_details?.driver && (
                <div className="md:col-span-2">
                  <InfoRow label="Driver" value={`${booking.pickup_request_details.driver.name} · ${booking.pickup_request_details.driver.phone}`} />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── Notes & QC Trail ───────────────────────────────────────────── */}
        {(booking.notes || booking.initial_damages || booking.check_in_notes ||
          booking.jobcard?.notes?.length > 0 || booking.jobcard?.qc_report ||
          booking.jobcard?.supervisor_review || booking.jobcard?.final_qc_report) && (
            <Card title="Notes & QC Trail">
              <div className="space-y-4">
                {booking.notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <MessageSquare size={14} /> Booking Notes
                    </h4>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{booking.notes}</p>
                  </div>
                )}
                {booking.check_in_notes && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                      <CheckCircle size={14} /> Check-In Notes
                    </h4>
                    <p className="text-sm text-green-800 whitespace-pre-wrap">{booking.check_in_notes}</p>
                    {booking.checked_in_by_details && (
                      <p className="text-xs text-green-600 mt-2">
                        By {booking.checked_in_by_details.name} on {fmtT(booking.vehicle_arrived_at)}
                      </p>
                    )}
                  </div>
                )}
                {booking.initial_damages && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                      <AlertCircle size={14} /> Initial Damages
                    </h4>
                    <p className="text-sm text-yellow-800 whitespace-pre-wrap">{booking.initial_damages}</p>
                  </div>
                )}
                {booking.jobcard?.qc_report && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                      <FileCheck size={14} /> QC Report
                    </h4>
                    <div className="space-y-2">
                      {booking.jobcard.qc_report.scratches && <div><span className="text-xs font-medium text-indigo-700">Scratches:</span><p className="text-sm text-indigo-800 whitespace-pre-wrap">{booking.jobcard.qc_report.scratches}</p></div>}
                      {booking.jobcard.qc_report.dents && <div><span className="text-xs font-medium text-indigo-700">Dents:</span><p className="text-sm text-indigo-800 whitespace-pre-wrap">{booking.jobcard.qc_report.dents}</p></div>}
                      {booking.jobcard.qc_report.additional_tasks && <div><span className="text-xs font-medium text-indigo-700">Additional Tasks:</span><p className="text-sm text-indigo-800">{booking.jobcard.qc_report.additional_tasks}</p></div>}
                      {booking.jobcard.qc_report.notes && <div><span className="text-xs font-medium text-indigo-700">Notes:</span><p className="text-sm text-indigo-800">{booking.jobcard.qc_report.notes}</p></div>}
                      {booking.jobcard.qc_report.floor_manager_details && (
                        <p className="text-xs text-indigo-600 mt-1">By {booking.jobcard.qc_report.floor_manager_details.name} · {fmtT(booking.jobcard.qc_report.created_at)}</p>
                      )}
                    </div>
                  </div>
                )}
                {booking.jobcard?.supervisor_review && (
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-cyan-900 mb-3 flex items-center gap-2">
                      <Star size={14} /> Supervisor Review
                    </h4>
                    <div className="space-y-2">
                      {booking.jobcard.supervisor_review.review_notes && <div><span className="text-xs font-medium text-cyan-700">Review:</span><p className="text-sm text-cyan-800">{booking.jobcard.supervisor_review.review_notes}</p></div>}
                      {booking.jobcard.supervisor_review.rejection_reason && <div><span className="text-xs font-medium text-red-700">Rejection Reason:</span><p className="text-sm text-red-800">{booking.jobcard.supervisor_review.rejection_reason}</p></div>}
                      {booking.jobcard.supervisor_review.supervisor_details && (
                        <p className="text-xs text-cyan-600 mt-1">By {booking.jobcard.supervisor_review.supervisor_details.name} · {fmtT(booking.jobcard.supervisor_review.created_at)}</p>
                      )}
                    </div>
                  </div>
                )}
                {booking.jobcard?.final_qc_report && (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-teal-900 mb-3 flex items-center gap-2">
                      <CheckCircle size={14} /> Final QC Report
                    </h4>
                    <div className="space-y-2">
                      {booking.jobcard.final_qc_report.quality_notes && <div><span className="text-xs font-medium text-teal-700">Quality Notes:</span><p className="text-sm text-teal-800">{booking.jobcard.final_qc_report.quality_notes}</p></div>}
                      {booking.jobcard.final_qc_report.issues_found && <div><span className="text-xs font-medium text-orange-700">Issues:</span><p className="text-sm text-orange-800">{booking.jobcard.final_qc_report.issues_found}</p></div>}
                      {booking.jobcard.final_qc_report.failure_reason && <div><span className="text-xs font-medium text-red-700">Failure Reason:</span><p className="text-sm text-red-800">{booking.jobcard.final_qc_report.failure_reason}</p></div>}
                      {booking.jobcard.final_qc_report.supervisor_details && (
                        <p className="text-xs text-teal-600 mt-1">By {booking.jobcard.final_qc_report.supervisor_details.name} · {fmtT(booking.jobcard.final_qc_report.created_at)}</p>
                      )}
                    </div>
                  </div>
                )}
                {booking.jobcard?.notes?.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                      <FileText size={14} /> Job Card Notes ({booking.jobcard.notes.length})
                    </h4>
                    <div className="space-y-3">
                      {booking.jobcard.notes.map((note, i) => (
                        <div key={note.id || i} className="bg-white rounded p-3 border border-purple-100">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-gray-900">{note.created_by_details?.name || 'Staff'}</span>
                            <span className="text-xs text-gray-400">{fmtT(note.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                          {note.note_type && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">{note.note_type}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

        {/* ── Service Items table ─────────────────────────────────────────── */}
        {booking.items && booking.items.length > 0 && (
          <Card title="Service Items">
            <Table
              headers={['Service', 'Quantity', 'Unit Price', 'Total']}
              data={booking.items}
              renderRow={(item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.service_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">₹{item.unit_price}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{item.total_price}</td>
                </tr>
              )}
            />
          </Card>
        )}

      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      {editTab && (
        <EditBookingModal
          booking={booking}
          branchId={booking.branch_details?.id}
          defaultTab={editTab}
          hideTabs={true}
          onClose={() => setEditTab(null)}
          onSaved={(updated) => {
            setBooking(prev => ({ ...prev, ...updated }));
            setEditTab(null);
          }}
        />
      )}
    </>
  );
};

export default BookingDetails;
