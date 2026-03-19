import React from 'react';
import {
    CalendarIcon,
    CheckCircleIcon,
    BanknotesIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';

const LeaveBalanceCard = ({ balance }) => {
    const {
        leave_type_name,
        leave_type_code,
        opening_balance,
        credited,
        used,
        encashed,
        lapsed,
        available_balance,
        total_balance,
        is_encashable
    } = balance;

    const usagePercentage = (used / total_balance) * 100;
    const availablePercentage = (available_balance / total_balance) * 100;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                        <CalendarIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                            {leave_type_name}
                        </h3>
                        <p className="text-sm text-slate-500">{leave_type_code}</p>
                    </div>
                </div>
                {is_encashable && (
                    <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                        <BanknotesIcon className="h-4 w-4" />
                        <span>Encashable</span>
                    </div>
                )}
            </div>

            {/* Main Balance Display */}
            <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {available_balance}
                    </span>
                    <span className="text-lg text-slate-500">
                        / {total_balance} days
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${availablePercentage}%` }}
                    />
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${usagePercentage}%` }}
                    />
                </div>

                <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>Available: {availablePercentage.toFixed(0)}%</span>
                    <span>Used: {usagePercentage.toFixed(0)}%</span>
                </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Opening Balance</span>
                        <span className="text-sm font-semibold text-slate-900">
                            {opening_balance}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            Credited
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                            +{credited}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                            <XCircleIcon className="h-4 w-4 text-red-500" />
                            Used
                        </span>
                        <span className="text-sm font-semibold text-red-600">
                            -{used}
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                            <BanknotesIcon className="h-4 w-4 text-amber-500" />
                            Encashed
                        </span>
                        <span className="text-sm font-semibold text-amber-600">
                            -{encashed}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Lapsed</span>
                        <span className="text-sm font-semibold text-slate-500">
                            -{lapsed}
                        </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-sm font-semibold text-slate-700">Available</span>
                        <span className="text-lg font-bold text-blue-600">
                            {available_balance}
                        </span>
                    </div>
                </div>
            </div>

            {/* Warning if low balance */}
            {available_balance < 2 && available_balance > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                        ⚠️ Low balance! Only {available_balance} day(s) remaining.
                    </p>
                </div>
            )}

            {available_balance === 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                        ❌ No leaves available in this category.
                    </p>
                </div>
            )}
        </div>
    );
};

export default LeaveBalanceCard;
