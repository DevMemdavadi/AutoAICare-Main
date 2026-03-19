import React, { useState, useEffect } from 'react';
import {
    CalendarIcon,
    DocumentTextIcon,
    PaperClipIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

const LeaveRequestForm = ({ leaveBalances, onSuccess }) => {
    const [formData, setFormData] = useState({
        leave_type: '',
        start_date: '',
        end_date: '',
        total_days: 0,
        reason: '',
        contact_during_leave: '',
        supporting_document: null
    });
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [selectedLeaveType, setSelectedLeaveType] = useState(null);
    const [calculatedDays, setCalculatedDays] = useState(0);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchLeaveTypes();
    }, []);

    useEffect(() => {
        if (formData.start_date && formData.end_date) {
            calculateDays();
        }
    }, [formData.start_date, formData.end_date]);

    const fetchLeaveTypes = async () => {
        try {
            const response = await api.get('/accounting/leave-types/', {
                params: { is_active: true }
            });
            // Handle both paginated and non-paginated responses
            const data = response.data.results || response.data;
            setLeaveTypes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching leave types:', error);
            setLeaveTypes([]); // Set empty array on error
        }
    };

    const calculateDays = () => {
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setCalculatedDays(diffDays);
        setFormData(prev => ({ ...prev, total_days: diffDays }));
    };

    const handleLeaveTypeChange = (e) => {
        const typeId = e.target.value;
        setFormData(prev => ({ ...prev, leave_type: typeId }));

        const type = leaveTypes.find(t => t.id === parseInt(typeId));
        setSelectedLeaveType(type);
    };

    const handleFileChange = (e) => {
        setFormData(prev => ({ ...prev, supporting_document: e.target.files[0] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
        if (!formData.leave_type || !formData.start_date || !formData.end_date || !formData.reason) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        // Check if sufficient balance
        const balance = leaveBalances.find(b => b.leave_type === parseInt(formData.leave_type));
        if (balance && balance.available_balance < formData.total_days) {
            setError(`Insufficient leave balance. Available: ${balance.available_balance} days, Requested: ${formData.total_days} days`);
            setLoading(false);
            return;
        }

        try {
            const submitData = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== '') {
                    submitData.append(key, formData[key]);
                }
            });

            await api.post('/accounting/leave-requests/', submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                // Reset form
                setFormData({
                    leave_type: '',
                    start_date: '',
                    end_date: '',
                    total_days: 0,
                    reason: '',
                    contact_during_leave: '',
                    supporting_document: null
                });
                setSelectedLeaveType(null);
                if (onSuccess) onSuccess();
            }, 2000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to submit leave request');
        } finally {
            setLoading(false);
        }
    };

    const getAvailableBalance = () => {
        if (!formData.leave_type) return null;
        const balance = leaveBalances.find(b => b.leave_type === parseInt(formData.leave_type));
        return balance?.available_balance || 0;
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Apply for Leave
                </h2>
                <p className="text-slate-600">
                    Submit your leave request for approval
                </p>
            </div>

            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    <div>
                        <p className="text-green-800 font-medium">Leave request submitted successfully!</p>
                        <p className="text-green-600 text-sm">Your request is pending approval.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Leave Type */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Leave Type <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.leave_type}
                        onChange={handleLeaveTypeChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        required
                    >
                        <option value="">Select leave type</option>
                        {leaveTypes.map(type => (
                            <option key={type.id} value={type.id}>
                                {type.name} ({type.code})
                            </option>
                        ))}
                    </select>
                    {formData.leave_type && (
                        <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-slate-600">Available Balance:</span>
                            <span className="font-semibold text-blue-600">
                                {getAvailableBalance()} days
                            </span>
                        </div>
                    )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Start Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            End Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                min={formData.start_date || new Date().toISOString().split('T')[0]}
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Calculated Days */}
                {calculatedDays > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-blue-800 font-medium">Total Leave Days:</span>
                            <span className="text-2xl font-bold text-blue-600">{calculatedDays} days</span>
                        </div>
                    </div>
                )}

                {/* Reason */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Reason <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <DocumentTextIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                            rows={4}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                            placeholder="Please provide a reason for your leave request..."
                            required
                        />
                    </div>
                </div>

                {/* Contact During Leave */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Contact Number During Leave
                    </label>
                    <input
                        type="tel"
                        value={formData.contact_during_leave}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_during_leave: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="+91 98765 43210"
                    />
                </div>

                {/* Supporting Document */}
                {selectedLeaveType?.requires_document && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Supporting Document {selectedLeaveType?.requires_document && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                            <PaperClipIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                accept=".pdf,.jpg,.jpeg,.png"
                                required={selectedLeaveType?.requires_document}
                            />
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            Upload medical certificate or supporting document (PDF, JPG, PNG)
                        </p>
                    </div>
                )}

                {/* Leave Type Info */}
                {selectedLeaveType && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <h4 className="font-medium text-slate-900">Leave Policy</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-slate-600">Annual Quota:</span>
                                <span className="ml-2 font-medium">{selectedLeaveType.annual_quota} days</span>
                            </div>
                            {selectedLeaveType.max_consecutive_days > 0 && (
                                <div>
                                    <span className="text-slate-600">Max Consecutive:</span>
                                    <span className="ml-2 font-medium">{selectedLeaveType.max_consecutive_days} days</span>
                                </div>
                            )}
                            {selectedLeaveType.min_notice_days > 0 && (
                                <div>
                                    <span className="text-slate-600">Min Notice:</span>
                                    <span className="ml-2 font-medium">{selectedLeaveType.min_notice_days} days</span>
                                </div>
                            )}
                            <div>
                                <span className="text-slate-600">Type:</span>
                                <span className="ml-2 font-medium">
                                    {selectedLeaveType.is_paid ? 'Paid' : 'Unpaid'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Submitting...
                            </span>
                        ) : (
                            'Submit Leave Request'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setFormData({
                                leave_type: '',
                                start_date: '',
                                end_date: '',
                                total_days: 0,
                                reason: '',
                                contact_during_leave: '',
                                supporting_document: null
                            });
                            setSelectedLeaveType(null);
                            setError('');
                        }}
                        className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all"
                    >
                        Reset
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LeaveRequestForm;
