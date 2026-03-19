import React, { useState, useEffect } from 'react';
import {
    BanknotesIcon,
    CalculatorIcon,
    CheckCircleIcon,
    ClockIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

const LeaveEncashmentPanel = ({ leaveBalances, onSuccess }) => {
    const [selectedLeaveType, setSelectedLeaveType] = useState('');
    const [daysToEncash, setDaysToEncash] = useState('');
    const [calculatedAmount, setCalculatedAmount] = useState(null);
    const [encashmentHistory, setEncashmentHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchEncashmentHistory();
    }, []);

    const fetchEncashmentHistory = async () => {
        try {
            const response = await api.get('/accounting/leave-encashments/');
            // Handle both paginated and non-paginated responses
            const data = response.data.results || response.data;
            setEncashmentHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching encashment history:', error);
            setEncashmentHistory([]); // Set empty array on error
        }
    };

    const encashableBalances = leaveBalances.filter(b => b.is_encashable && b.available_balance > 0);

    const handleCalculate = async () => {
        if (!selectedLeaveType || !daysToEncash) {
            setError('Please select leave type and enter days to encash');
            return;
        }

        const balance = leaveBalances.find(b => b.id === parseInt(selectedLeaveType));
        if (parseFloat(daysToEncash) > balance.available_balance) {
            setError(`Cannot encash more than available balance (${balance.available_balance} days)`);
            return;
        }

        setCalculating(true);
        setError('');

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const response = await api.post('/accounting/leave-encashments/calculate_amount/', {
                employee_id: user.id,
                leave_type_id: balance.leave_type,
                days_to_encash: parseFloat(daysToEncash)
            });
            setCalculatedAmount(response.data);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to calculate encashment amount');
        } finally {
            setCalculating(false);
        }
    };

    const handleSubmit = async () => {
        if (!calculatedAmount) {
            setError('Please calculate the amount first');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const balance = leaveBalances.find(b => b.id === parseInt(selectedLeaveType));
            await api.post('/accounting/leave-encashments/', {
                leave_type: balance.leave_type,
                leave_balance: balance.id,
                days_to_encash: parseFloat(daysToEncash),
                total_amount: calculatedAmount.total_amount
            });

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setSelectedLeaveType('');
                setDaysToEncash('');
                setCalculatedAmount(null);
                fetchEncashmentHistory();
                if (onSuccess) onSuccess();
            }, 2000);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to submit encashment request');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'processed':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-amber-100 text-amber-800 border-amber-200';
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Encashment Request Form */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                        <BanknotesIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Leave Encashment</h2>
                        <p className="text-sm text-slate-600">Convert your unused leaves to cash</p>
                    </div>
                </div>

                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        <div>
                            <p className="text-green-800 font-medium">Encashment request submitted!</p>
                            <p className="text-green-600 text-sm">Pending approval from admin</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Leave Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Select Leave Type
                        </label>
                        <select
                            value={selectedLeaveType}
                            onChange={(e) => {
                                setSelectedLeaveType(e.target.value);
                                setCalculatedAmount(null);
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                            <option value="">Choose leave type...</option>
                            {encashableBalances.map(balance => (
                                <option key={balance.id} value={balance.id}>
                                    {balance.leave_type_name} - {balance.available_balance} days available
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Days to Encash */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Days to Encash
                        </label>
                        <input
                            type="number"
                            value={daysToEncash}
                            onChange={(e) => {
                                setDaysToEncash(e.target.value);
                                setCalculatedAmount(null);
                            }}
                            min="0.5"
                            step="0.5"
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Enter number of days"
                        />
                        {selectedLeaveType && (
                            <p className="mt-1 text-sm text-slate-500">
                                Max: {encashableBalances.find(b => b.id === parseInt(selectedLeaveType))?.available_balance} days
                            </p>
                        )}
                    </div>

                    {/* Calculate Button */}
                    <button
                        onClick={handleCalculate}
                        disabled={calculating || !selectedLeaveType || !daysToEncash}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all"
                    >
                        <CalculatorIcon className="h-5 w-5" />
                        {calculating ? 'Calculating...' : 'Calculate Amount'}
                    </button>

                    {/* Calculated Amount */}
                    {calculatedAmount && (
                        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                            <h3 className="text-sm font-medium text-green-800 mb-4">Encashment Calculation</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-700">Daily Rate:</span>
                                    <span className="font-semibold text-green-900">
                                        ₹{calculatedAmount.daily_rate.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-700">Encashment Rate:</span>
                                    <span className="font-semibold text-green-900">
                                        {calculatedAmount.encashment_rate_percent}%
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-700">Days:</span>
                                    <span className="font-semibold text-green-900">{daysToEncash}</span>
                                </div>
                                <div className="pt-3 border-t-2 border-green-300 flex justify-between">
                                    <span className="text-green-800 font-semibold">Total Amount:</span>
                                    <span className="text-2xl font-bold text-green-900">
                                        ₹{calculatedAmount.total_amount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                            >
                                {loading ? 'Submitting...' : 'Submit Encashment Request'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">📌 Important Notes</h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                        <li>• Only encashable leave types are shown</li>
                        <li>• Encashment is subject to admin approval</li>
                        <li>• Amount will be added to your next payroll</li>
                        <li>• Encashment rate may vary by leave type</li>
                    </ul>
                </div>
            </div>

            {/* Encashment History */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900">Encashment History</h2>

                {encashmentHistory.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <BanknotesIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No encashment requests yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {encashmentHistory.map((encashment) => (
                            <div
                                key={encashment.id}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">
                                            {encashment.leave_type_name}
                                        </h3>
                                        <p className="text-sm text-slate-500">{encashment.leave_type_code}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(encashment.status)}`}>
                                        {encashment.status_display}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-xs text-slate-500">Days Encashed</p>
                                        <p className="font-semibold text-slate-900">{encashment.days_to_encash}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Amount</p>
                                        <p className="font-semibold text-green-600">₹{encashment.total_amount}</p>
                                    </div>
                                </div>

                                {encashment.approved_by_name && (
                                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-3">
                                        <p className="text-xs text-blue-600">
                                            {encashment.status === 'approved' || encashment.status === 'processed' ? 'Approved' : 'Reviewed'} by {encashment.approved_by_name}
                                        </p>
                                        {encashment.approval_date && (
                                            <p className="text-xs text-blue-500 mt-1">
                                                on {formatDate(encashment.approval_date)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {encashment.status === 'processed' && encashment.payroll_month && (
                                    <div className="p-3 bg-green-50 border border-green-100 rounded-lg mb-3">
                                        <p className="text-xs text-green-700">
                                            ✓ Processed in {encashment.payroll_month}/{encashment.payroll_year} payroll
                                        </p>
                                    </div>
                                )}

                                <p className="text-xs text-slate-500">
                                    Requested on {formatDate(encashment.requested_date)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaveEncashmentPanel;
