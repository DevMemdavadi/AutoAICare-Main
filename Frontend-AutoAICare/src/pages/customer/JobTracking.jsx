import ActivityTimeline from '@/components/ActivityTimeline';
import DynamicTasksPanel from '@/components/DynamicTasksPanel';
import JobTimer from '@/components/JobTimer';
import NotesPanel from '@/components/NotesPanel';
import { Alert, Button, Card, Modal, Select } from '@/components/ui';
import api from '@/utils/api';
import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Search,
  Star,
  Wrench,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const JobTracking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Approval modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [selectedJobForApproval, setSelectedJobForApproval] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchBookings();
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bookings/');
      const bookingsList = response.data.results || response.data || [];
      setBookings(bookingsList);
      console.log("bookingsList", bookingsList);
      // Check for bookingId in URL to auto-open
      const bookingId = searchParams.get('bookingId');
      if (bookingId) {
        const targetBooking = bookingsList.find(b => b.id.toString() === bookingId);
        if (targetBooking) {
          openDetailsModal(targetBooking);
        }
      }

      // Check for jobcardId in URL to auto-open (from notifications)
      const jobcardId = searchParams.get('jobcardId');
      if (jobcardId) {
        const targetBooking = bookingsList.find(b => b.jobcard?.id.toString() === jobcardId);
        if (targetBooking) {
          openDetailsModal(targetBooking);
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };



  const openDetailsModal = async (booking) => {
    // Show the modal with booking details regardless of jobcard status
    setSelectedBooking(booking);
    console.log("selectedBooking", selectedBooking);
    setActiveTab('details');
    setShowDetailsModal(true);
  };

  const handleAddNote = async (noteData) => {
    if (!selectedBooking?.jobcard?.id) return;
    try {
      const response = await api.post(`/jobcards/${selectedBooking.jobcard.id}/add_note/`, noteData);

      // Refresh local state
      const updatedNotes = [response.data, ...(selectedBooking.jobcard.notes || [])];
      setSelectedBooking(prev => ({
        ...prev,
        jobcard: {
          ...prev.jobcard,
          notes: updatedNotes
        }
      }));
      return response.data;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  const openApprovalModal = (booking) => {
    setSelectedJobForApproval(booking.jobcard);
    setApprovalNotes('');
    setShowApprovalModal(true);
  };

  const openRevisionModal = (booking) => {
    setSelectedJobForApproval(booking.jobcard);
    setRevisionNotes('');
    setShowRevisionModal(true);
  };

  const handleApproveWork = async () => {
    if (!selectedJobForApproval) return;

    setSubmittingApproval(true);
    try {
      await api.post(`/jobcards/${selectedJobForApproval.id}/customer_approval/`, {
        action: 'approve',
        approval_notes: approvalNotes,
        photos_viewed: true,
        tasks_reviewed: true,
        qc_report_viewed: true
      });

      setShowApprovalModal(false);
      setAlert({ show: true, type: 'success', message: 'Work approved successfully! Invoice will be generated.' });
      fetchBookings();
    } catch (error) {
      console.error('Error approving work:', error);
      setAlert({ show: true, type: 'error', message: error.response?.data?.error || 'Failed to approve work' });
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!selectedJobForApproval || !revisionNotes.trim()) {
      setAlert({ show: true, type: 'error', message: 'Please describe what needs to be fixed' });
      return;
    }

    setSubmittingApproval(true);
    try {
      await api.post(`/jobcards/${selectedJobForApproval.id}/customer_approval/`, {
        action: 'request_revision',
        revision_notes: revisionNotes
      });

      setShowRevisionModal(false);
      setAlert({ show: true, type: 'success', message: 'Revision request submitted. Our team will address your concerns.' });
      fetchBookings();
    } catch (error) {
      console.error('Error requesting revision:', error);
      setAlert({ show: true, type: 'error', message: error.response?.data?.error || 'Failed to request revision' });
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleApproveDynamicTask = async (taskId, jobCardId) => {
    try {
      await api.post(`/jobcards/${jobCardId}/approve_dynamic_task/${taskId}/`);
      fetchBookings(); // Refresh bookings to update UI
      // Also update selectedBooking specific jobcard if it's the one open
      if (selectedBooking && selectedBooking.jobcard?.id === jobCardId) {
        // We might need to fetch the specific jobcard again or just rely on fetchBookings if it updates everything
        // Since fetchBookings updates 'bookings' state, and 'selectedBooking' is separate state...
        // We should ideally update selectedBooking too.
        // A simple way is to re-find the booking from the new list, but fetchBookings is async and sets state.
        // Better to just fetch the specific job details or manually update local state for immediate feedback?
        // Let's rely on fetchBookings and a separate effect or just close/reopen?
        // Actually, let's just re-fetch the single job card if we can, or rely on refetching bookings
        // and updating selectedBooking from the new list.
        const response = await api.get('/bookings/');
        const newBookings = response.data.results || response.data || [];
        const updatedBooking = newBookings.find(b => b.id === selectedBooking.id);
        if (updatedBooking) setSelectedBooking(updatedBooking);
      }
      setAlert({ show: true, type: 'success', message: 'Task approved successfully' });
    } catch (error) {
      console.error("Error approving task:", error);
      setAlert({ show: true, type: 'error', message: error.response?.data?.error || 'Failed to approve task' });
    }
  };

  const downloadInvoice = async (invoiceId) => {
    try {
      const response = await api.get(`/billing/${invoiceId}/download/`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice_${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to download invoice' });
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filters.status && booking.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const packageNames = (booking.packages_details || (booking.package_details ? [booking.package_details] : []))
        .map(p => p.name?.toLowerCase()).join(' ');
      return (
        booking.id?.toString().includes(searchLower) ||
        packageNames.includes(searchLower) ||
        booking.vehicle_details?.registration_number?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    const variants = {
      // Booking statuses
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Confirmation' },
      confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },

      // Job card statuses
      created: { color: 'bg-gray-100 text-gray-800', label: 'Job Created' },
      qc_pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Initial QC Pending' },
      qc_completed: { color: 'bg-blue-100 text-blue-800', label: 'QC Completed' },
      qc_rejected: { color: 'bg-red-100 text-red-800', label: 'QC Rejected' },
      supervisor_approved: { color: 'bg-green-100 text-green-800', label: 'Approved by Supervisor' },
      assigned_to_applicator: { color: 'bg-blue-100 text-blue-800', label: 'Assigned to Team' },
      work_in_progress: { color: 'bg-purple-100 text-purple-800', label: 'Work In Progress' },
      work_completed: { color: 'bg-blue-100 text-blue-800', label: 'Work Completed' },
      final_qc_pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Final QC Pending' },
      final_qc_passed: { color: 'bg-green-100 text-green-800', label: 'Final QC Passed' },
      final_qc_failed: { color: 'bg-red-100 text-red-800', label: 'Final QC Failed' },
      customer_approval_pending: { color: 'bg-yellow-100 text-yellow-800', label: '⭐ Awaiting Your Approval' },
      customer_approved: { color: 'bg-green-100 text-green-800', label: '✅ You Approved' },
      customer_revision_requested: { color: 'bg-orange-100 text-orange-800', label: 'Revision Requested' },
      ready_for_billing: { color: 'bg-blue-100 text-blue-800', label: 'Ready for Payment' },
      billed: { color: 'bg-green-100 text-green-800', label: 'Invoice Generated' },
      ready_for_delivery: { color: 'bg-green-100 text-green-800', label: 'Ready For Delivery' },
      delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
      closed: { color: 'bg-gray-100 text-gray-800', label: 'Closed' },

      // Legacy
      vehicle_arrived: { color: 'bg-blue-100 text-blue-800', label: 'Vehicle Received' },
      in_progress: { color: 'bg-purple-100 text-purple-800', label: 'In Progress' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
    };
    return variants[status] || { color: 'bg-gray-100 text-gray-800', label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
  };

  const getJobStatus = (booking) => booking.jobcard ? booking.jobcard.status : booking.status;

  const getJobProgress = (status) => {
    const progressMap = {
      pending: 5, confirmed: 10, created: 15, qc_pending: 20, qc_completed: 25, qc_rejected: 20,
      supervisor_approved: 30, assigned_to_applicator: 35, work_in_progress: 50, work_completed: 65,
      final_qc_pending: 70, final_qc_passed: 75, final_qc_failed: 70, customer_approval_pending: 80,
      customer_approved: 85, customer_revision_requested: 70, ready_for_billing: 90, billed: 95,
      ready_for_delivery: 98, delivered: 100, closed: 100, vehicle_arrived: 15, in_progress: 50, completed: 100,
    };
    return progressMap[status] || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statsInProgress = bookings.filter(b => {
    if (b.jobcard) {
      return ['work_in_progress', 'assigned_to_applicator', 'qc_pending', 'qc_completed', 'supervisor_approved'].includes(b.jobcard.status);
    }
    return b.status === 'confirmed' || b.status === 'in_progress';
  }).length;

  const statsCompleted = bookings.filter(b => {
    if (b.jobcard) {
      return ['delivered', 'closed'].includes(b.jobcard.status);
    }
    return b.status === 'completed';
  }).length;

  const statsPending = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="space-y-6">
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Track Your Jobs</h1>
        <p className="text-gray-600 mt-1">Monitor the status of your service bookings</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-2">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{statsInProgress}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{statsCompleted}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{statsPending}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by ID, service, or vehicle..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input pl-10 w-full"
            />
          </div>
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
      </Card>

      {/* Bookings List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => {
            const currentStatus = getJobStatus(booking);
            const statusInfo = getStatusBadge(currentStatus);
            const jobCard = booking.jobcard;
            const progress = getJobProgress(currentStatus);

            return (
              <Card key={booking.id}>
                <div className="space-y-4 p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">
                          Booking #{booking.id}
                        </h3>
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(booking.booking_datetime).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => openDetailsModal(booking)}
                      variant="outline"
                      size="sm"
                    >
                      View Details
                    </Button>
                  </div>

                  {/* Service Info */}
                  <div className="space-y-4">
                    {/* Multiple Packages */}
                    {(() => {
                      const pkgs = booking.packages_details?.length > 0
                        ? booking.packages_details
                        : (booking.package_details ? [booking.package_details] : []);
                      return pkgs.length > 0 ? (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Services</p>
                          <div className="space-y-1.5">
                            {pkgs.map((pkg, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <Wrench size={14} className="text-primary flex-shrink-0" />
                                <span className="font-bold text-gray-900">{pkg.name}</span>
                                {pkg.category && (
                                  <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold capitalize">
                                    {pkg.category}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {booking.addon_details?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Add-ons</p>
                        <div className="space-y-1">
                          {booking.addon_details.map((addon, idx) => (
                            <div key={idx} className="flex items-center text-[11px] text-gray-800 font-bold">
                              {addon.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Car size={16} className="text-gray-400" />
                      <span className="text-gray-600 font-medium">
                        {booking.vehicle_details?.registration_number}
                      </span>
                    </div>

                    {/* Live Timer */}
                    {jobCard && ['started', 'in_progress', 'work_in_progress', 'assigned_to_applicator'].includes(jobCard.status) && jobCard.job_started_at && (
                      <div className="pt-2 border-t border-gray-200">
                        <JobTimer
                          jobStartedAt={jobCard.job_started_at}
                          allowedDurationMinutes={jobCard.allowed_duration_display || jobCard.allowed_duration_minutes}
                          status={jobCard.status}
                        />
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Customer Approval Section */}
                  {jobCard?.status === 'final_qc_passed' && (
                    <div className="border-t pt-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                        <h4 className="font-semibold text-yellow-900 flex items-center gap-2">
                          <AlertCircle size={20} />
                          Your Approval Required
                        </h4>
                        <p className="text-sm text-yellow-800 mt-1">
                          Your vehicle service is complete! Please review the work and approve.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openApprovalModal(booking)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle size={18} className="mr-2" />
                          Review & Approve
                        </Button>
                        <Button
                          onClick={() => openRevisionModal(booking)}
                          variant="outline"
                          className="flex-1 border-orange-600 text-orange-600 hover:bg-orange-50"
                        >
                          <XCircle size={18} className="mr-2" />
                          Request Changes
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Invoice Section */}
                  {jobCard?.status === 'billed' && jobCard?.invoice && (
                    <div className="border-t pt-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                              <FileText size={20} />
                              Invoice Ready
                            </h4>
                            <p className="text-sm text-blue-800 mt-1">
                              Invoice #{jobCard.invoice.invoice_number} - Total: ₹{jobCard.invoice.total_amount}
                            </p>
                          </div>
                          <Button
                            onClick={() => navigate(`/customer/pay-invoice/${jobCard.invoice.id}`)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CreditCard size={18} className="mr-2" />
                            Pay Now
                          </Button>
                        </div>
                      </div>
                      <Button
                        onClick={() => downloadInvoice(jobCard.invoice.id)}
                        variant="outline"
                        className="w-full"
                      >
                        <Download size={18} className="mr-2" />
                        Download Invoice
                      </Button>
                    </div>
                  )}

                  {/* Google Review Section */}
                  {(jobCard?.status === 'delivered' || jobCard?.status === 'closed') && jobCard?.branch_details?.google_review_url && (
                    <div className="border-t pt-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-900 flex items-center gap-2">
                          <Star size={20} />
                          Rate Us on Google
                        </h4>
                        <p className="text-sm text-yellow-800 mt-1">
                          We would love to hear your feedback! Please rate your experience on Google.
                        </p>
                        <Button
                          onClick={() => window.open(jobCard.branch_details.google_review_url, '_blank')}
                          className="w-full mt-3 bg-yellow-500 hover:bg-yellow-600 text-yellow-900"
                        >
                          <ExternalLink size={18} className="mr-2" />
                          Leave a Review
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {/* Cancel booking option removed as per requirements */}
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No bookings found</p>
          </div>
        )}
      </div>

      {/* Booking Details Modal (only for bookings without jobcards) */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Booking #${selectedBooking?.id} Details`}
        size="xl"
        hideScrollbar={true}
      >
        {selectedBooking && (
          <div className="space-y-4">
            {/* Header Status */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <LayoutDashboard size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Current Status</p>
                  <p className="text-sm font-bold text-blue-900 capitalize">
                    {getStatusBadge(getJobStatus(selectedBooking)).label}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600 uppercase tracking-wider font-semibold">Booking ID</p>
                <p className="text-sm font-bold text-blue-900">#{selectedBooking.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Core Info */}
              <div className="space-y-4">
                {/* Service Package */}
                <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <Wrench size={16} className="text-primary" />
                    Service Information
                  </h4>
                  <div className="space-y-4">
                    {/* Multiple packages support */}
                    {(() => {
                      const pkgs = selectedBooking.packages_details?.length > 0
                        ? selectedBooking.packages_details
                        : (selectedBooking.package_details ? [selectedBooking.package_details] : []);
                      return pkgs.length > 0 ? (
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Services Booked</p>
                          <div className="space-y-2">
                            {pkgs.map((pkg, idx) => (
                              <div key={idx} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex items-center gap-2">
                                  <Wrench size={14} className="text-primary flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-bold text-gray-900 text-sm">{pkg.name}</p>
                                    {pkg.duration && (
                                      <p className="text-xs text-gray-500">{pkg.duration} min</p>
                                    )}
                                  </div>
                                </div>
                                {pkg.category && (
                                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0">
                                    {pkg.category}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {selectedBooking.addon_details?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Add-ons</p>
                        <div className="space-y-2">
                          {selectedBooking.addon_details.map((addon, idx) => (
                            <div key={idx} className="flex items-center text-sm text-gray-900 font-bold">
                              {addon.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <Car size={16} className="text-primary" />
                    Vehicle Details
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                      <Car size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">
                        {selectedBooking.vehicle_details?.brand} {selectedBooking.vehicle_details?.model}
                      </p>
                      <p className="text-sm font-mono text-primary font-bold tracking-wider">
                        {selectedBooking.vehicle_details?.registration_number}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Schedule & Pricing */}
              <div className="space-y-4">
                {/* Branch & Schedule */}
                <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <Calendar size={16} className="text-primary" />
                    Schedule & Location
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase">Service Branch</p>
                      <p className="text-sm font-bold text-gray-800">{selectedBooking.branch_details?.name || 'Assigned Branch'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedBooking.branch_details?.address}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase">Preferred Time</p>
                      <p className="text-sm font-bold text-gray-800">
                        {new Date(selectedBooking.booking_datetime).toLocaleDateString(undefined, { dateStyle: 'long' })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedBooking.booking_datetime).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 overflow-hidden">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                    <CreditCard size={16} className="text-primary" />
                    Pricing Breakdown
                  </h4>

                  <div className="space-y-2">
                    {/* Per-package pricing rows */}
                    {selectedBooking.price_breakdown?.packages?.length > 0 ? (
                      selectedBooking.price_breakdown.packages.map((pkg, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-500 truncate max-w-[60%]">{pkg.name}</span>
                          <span className="font-semibold text-gray-900">₹{parseFloat(pkg.price || 0).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Service Price</span>
                        <span className="font-semibold text-gray-900">₹{parseFloat(selectedBooking.price_breakdown?.package?.price || 0).toFixed(2)}</span>
                      </div>
                    )}

                    {selectedBooking.price_breakdown?.addons?.map((addon, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-500 truncate max-w-[60%]">{addon.name || 'Add-on'}</span>
                        <span className="font-semibold text-gray-900">₹{parseFloat(addon.price || 0).toFixed(2)}</span>
                      </div>
                    ))}

                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 mt-2 border-t border-dashed">
                      <span>Subtotal</span>
                      <span>₹{parseFloat(selectedBooking.price_breakdown?.subtotal || selectedBooking.subtotal || 0).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">GST (18%)</span>
                      <span className="font-semibold text-gray-900">₹{parseFloat(selectedBooking.price_breakdown?.gst_amount || selectedBooking.gst_amount || 0).toFixed(2)}</span>
                    </div>

                    {parseFloat(selectedBooking.price_breakdown?.discount_amount || selectedBooking.discount_amount || 0) > 0 && (
                      <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span>Discount Applied</span>
                        <span>- ₹{parseFloat(selectedBooking.price_breakdown?.discount_amount || selectedBooking.discount_amount).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="bg-green-600 rounded-lg p-3 mt-4 shadow-md">
                      <div className="flex justify-between items-center text-white">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total Price</p>
                          <p className="text-xs opacity-90">Inclusive of all taxes</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black">₹{parseFloat(selectedBooking.price_breakdown?.total_price || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-3 bg-gray-50 rounded-lg flex gap-3 items-start">
                  <AlertCircle size={16} className="text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-gray-500 leading-normal">
                    This is an initial estimate based on your selections. Final billing may vary slightly depending on actual requirements discovered during service.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Customer Approval Modal - EXISTING LOGIC PRESERVED */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title="Review & Approve Work"
        size="large"
      >
        {selectedJobForApproval && (
          <div className="space-y-6">
            {/* Photos Section */}
            {selectedJobForApproval.photos && selectedJobForApproval.photos.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ImageIcon size={20} />
                  Before & After Photos
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedJobForApproval.photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={photo.image}
                        alt={photo.photo_type}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <span className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {photo.photo_type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* QC Report */}
            {selectedJobForApproval.qc_report && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <CheckCircle size={20} />
                  Quality Check Report
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Scratches:</span>
                    <span className="ml-2 text-gray-900">{selectedJobForApproval.qc_report.scratches_found || 'None found'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Dents:</span>
                    <span className="ml-2 text-gray-900">{selectedJobForApproval.qc_report.dents_found || 'None found'}</span>
                  </div>
                  {selectedJobForApproval.qc_report.notes && (
                    <div>
                      <span className="text-gray-600">Inspector Notes:</span>
                      <p className="text-gray-900 mt-1">{selectedJobForApproval.qc_report.notes}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Inspector:</span>
                    <span className="ml-2 text-gray-900">{selectedJobForApproval.floor_manager_details?.name || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Parts Used */}
            {selectedJobForApproval.parts_used && selectedJobForApproval.parts_used.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Parts Used</h4>
                <div className="space-y-2">
                  {selectedJobForApproval.parts_used.map((part) => (
                    <div key={part.id} className="flex justify-between text-sm border-b border-gray-200 pb-2">
                      <span>{part.part_name} (x{part.quantity})</span>
                      <span className="font-medium">₹{part.price * part.quantity}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-2">
                    <span>Total Parts Cost:</span>
                    <span>₹{selectedJobForApproval.parts_used.reduce((sum, p) => sum + (p.price * p.quantity), 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Approval Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Feedback (Optional)
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Share your thoughts about the service..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleApproveWork}
                disabled={submittingApproval}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {submittingApproval ? (
                  <>Processing...</>
                ) : (
                  <>
                    <CheckCircle size={18} className="mr-2" />
                    Approve Work
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowApprovalModal(false)}
                variant="outline"
                className="flex-1"
                disabled={submittingApproval}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Revision Request Modal - EXISTING LOGIC PRESERVED */}
      <Modal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        title="Request Changes"
        size="medium"
      >
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              Please describe what needs to be fixed or changed. Our team will review your request and make the necessary corrections.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What needs to be fixed? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Example: Please fix the edge near the door handle, there's a small bubble..."
              required
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleRequestRevision}
              disabled={submittingApproval || !revisionNotes.trim()}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {submittingApproval ? (
                <>Submitting...</>
              ) : (
                <>
                  <XCircle size={18} className="mr-2" />
                  Submit Request
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowRevisionModal(false)}
              variant="outline"
              className="flex-1"
              disabled={submittingApproval}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>


    </div >
  );
};

export default JobTracking;