import React from 'react';
import {
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

const LeaveRequestsList = ({ requests, onUpdate }) => {
    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
            case 'rejected':
                return <XCircleIcon className="h-5 w-5 text-red-500" />;
            case 'cancelled':
                return <XCircleIcon className="h-5 w-5 text-slate-500" />;
            default:
                return <ClockIcon className="h-5 w-5 text-amber-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'cancelled':
                return 'bg-slate-100 text-slate-800 border-slate-200';
            default:
                return 'bg-amber-100 text-amber-800 border-amber-200';
        }
    };

    const handleCancel = async (requestId) => {
        if (!window.confirm('Are you sure you want to cancel this leave request?')) {
            return;
        }

        try {
            await api.post(`/accounting/leave-requests/${requestId}/cancel/`);
            if (onUpdate) onUpdate();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to cancel leave request');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (!requests || requests.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <CalendarIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No leave requests found</p>
                <p className="text-slate-400 text-sm mt-2">Your leave requests will appear here</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {requests.map((request) => (
                <div
                    key={request.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all duration-300"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                <CalendarIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900">
                                    {request.leave_type_name}
                                </h4>
                                <p className="text-sm text-slate-500">{request.leave_type_code}</p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="text-sm font-medium capitalize">
                                {request.status_display}
                            </span>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-xs text-slate-500 mb-1">From</p>
                            <p className="font-medium text-slate-900">{formatDate(request.start_date)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">To</p>
                            <p className="font-medium text-slate-900">{formatDate(request.end_date)}</p>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600">Duration</span>
                        <span className="text-lg font-bold text-blue-600">
                            {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
                        </span>
                    </div>

                    {/* Reason */}
                    <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-1">Reason</p>
                        <p className="text-sm text-slate-700 line-clamp-2">{request.reason}</p>
                    </div>

                    {/* Approval Info */}
                    {request.approved_by_name && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-700">
                                    {request.status === 'approved' ? 'Approved by' : 'Reviewed by'}
                                </span>
                                <span className="font-medium text-blue-900">{request.approved_by_name}</span>
                            </div>
                            {request.approval_date && (
                                <p className="text-xs text-blue-600 mt-1">
                                    on {formatDate(request.approval_date)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Rejection Reason */}
                    {request.status === 'rejected' && request.rejection_reason && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                            <p className="text-xs text-red-600 mb-1">Rejection Reason</p>
                            <p className="text-sm text-red-800">{request.rejection_reason}</p>
                        </div>
                    )}

                    {/* Actions */}
                    {request.status === 'pending' && (
                        <div className="flex gap-2 pt-3 border-t border-slate-200">
                            <button
                                onClick={() => handleCancel(request.id)}
                                className="flex-1 px-4 py-2 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                            >
                                Cancel Request
                            </button>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs text-slate-500">
                        <span>Applied on {formatDate(request.created_at)}</span>
                        {request.contact_during_leave && (
                            <span>Contact: {request.contact_during_leave}</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LeaveRequestsList;
