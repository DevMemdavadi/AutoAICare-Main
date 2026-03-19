import React, { useState } from 'react';
import {
    CheckCircleIcon,
    XCircleIcon,
    UserIcon,
    CalendarIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

const LeaveApprovalPanel = ({ pendingRequests, onUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const filteredRequests = pendingRequests.filter(request =>
        request.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.leave_type_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleApprove = async () => {
        setLoading(true);
        try {
            await api.post(`/accounting/leave-requests/${selectedRequest.id}/approve/`, {
                approval_notes: approvalNotes
            });
            setShowApprovalModal(false);
            setApprovalNotes('');
            if (onUpdate) onUpdate();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to approve leave request');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        setLoading(true);
        try {
            await api.post(`/accounting/leave-requests/${selectedRequest.id}/reject/`, {
                reason: rejectionReason
            });
            setShowRejectionModal(false);
            setRejectionReason('');
            if (onUpdate) onUpdate();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to reject leave request');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Pending Approvals</h2>
                    <p className="text-slate-600 mt-1">
                        {filteredRequests.length} request(s) awaiting your approval
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-64">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by employee or leave type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <CheckCircleIcon className="h-16 w-16 text-green-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">No pending approvals</p>
                    <p className="text-slate-400 text-sm mt-2">All leave requests have been processed</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredRequests.map((request) => (
                        <div
                            key={request.id}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300"
                        >
                            {/* Employee Info */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full">
                                    <UserIcon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{request.employee_name}</h3>
                                    <p className="text-sm text-slate-500">{request.employee_email}</p>
                                </div>
                            </div>

                            {/* Leave Details */}
                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                    <span className="text-sm text-blue-700">Leave Type</span>
                                    <span className="font-semibold text-blue-900">
                                        {request.leave_type_name} ({request.leave_type_code})
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">From</p>
                                        <p className="font-medium text-slate-900">{formatDate(request.start_date)}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 mb-1">To</p>
                                        <p className="font-medium text-slate-900">{formatDate(request.end_date)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                                    <span className="text-sm text-amber-700">Duration</span>
                                    <span className="text-lg font-bold text-amber-900">
                                        {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
                                    </span>
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 mb-2">Reason</p>
                                <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded-lg">
                                    {request.reason}
                                </p>
                            </div>

                            {/* Contact */}
                            {request.contact_during_leave && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg">
                                    <p className="text-xs text-green-600 mb-1">Contact During Leave</p>
                                    <p className="text-sm font-medium text-green-900">{request.contact_during_leave}</p>
                                </div>
                            )}

                            {/* Applied Date */}
                            <div className="mb-4 text-xs text-slate-500">
                                Applied on {formatDate(request.created_at)}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => {
                                        setSelectedRequest(request);
                                        setShowApprovalModal(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg"
                                >
                                    <CheckCircleIcon className="h-5 w-5" />
                                    Approve
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedRequest(request);
                                        setShowRejectionModal(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
                                >
                                    <XCircleIcon className="h-5 w-5" />
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Approval Modal */}
            {showApprovalModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">
                            Approve Leave Request
                        </h3>
                        <p className="text-slate-600 mb-4">
                            Approve leave request for <strong>{selectedRequest.employee_name}</strong>?
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Approval Notes (Optional)
                            </label>
                            <textarea
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                placeholder="Add any notes for the employee..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleApprove}
                                disabled={loading}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50"
                            >
                                {loading ? 'Approving...' : 'Confirm Approval'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowApprovalModal(false);
                                    setApprovalNotes('');
                                }}
                                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {showRejectionModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">
                            Reject Leave Request
                        </h3>
                        <p className="text-slate-600 mb-4">
                            Reject leave request for <strong>{selectedRequest.employee_name}</strong>?
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Rejection Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                placeholder="Please provide a reason for rejection..."
                                required
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleReject}
                                disabled={loading || !rejectionReason.trim()}
                                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-lg font-medium hover:from-red-600 hover:to-red-700 disabled:opacity-50"
                            >
                                {loading ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectionModal(false);
                                    setRejectionReason('');
                                }}
                                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeaveApprovalPanel;
