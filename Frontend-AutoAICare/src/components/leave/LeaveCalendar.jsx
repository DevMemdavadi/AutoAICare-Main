import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const LeaveCalendar = ({ leaveRequests = [] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Ensure leaveRequests is always an array
    const validLeaveRequests = Array.isArray(leaveRequests) ? leaveRequests : [];

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

    const previousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const getLeaveForDate = (day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return validLeaveRequests.filter(leave => {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            const current = new Date(dateStr);
            return current >= start && current <= end && leave.status === 'approved';
        });
    };

    const getLeaveColor = (leaveType) => {
        const colors = {
            'CL': 'bg-blue-500',
            'SL': 'bg-red-500',
            'EL': 'bg-green-500',
            'PL': 'bg-purple-500',
            'ML': 'bg-pink-500',
            'default': 'bg-slate-500'
        };
        return colors[leaveType] || colors.default;
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const leavesOnDay = getLeaveForDate(day);
        const isToday = new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

        days.push(
            <div
                key={day}
                className={`h-24 border border-slate-200 p-2 hover:bg-slate-50 transition-colors ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                    }`}
            >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                    {day}
                </div>
                <div className="space-y-1">
                    {leavesOnDay.slice(0, 2).map((leave, idx) => (
                        <div
                            key={idx}
                            className={`text-xs px-2 py-1 rounded text-white truncate ${getLeaveColor(leave.leave_type_code)}`}
                            title={`${leave.employee_name} - ${leave.leave_type_name}`}
                        >
                            {leave.employee_name}
                        </div>
                    ))}
                    {leavesOnDay.length > 2 && (
                        <div className="text-xs text-slate-500 px-2">
                            +{leavesOnDay.length - 2} more
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Get unique leave types for legend
    const leaveTypes = [...new Set(validLeaveRequests.map(l => l.leave_type_code))];

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                    {monthNames[month]} {year}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={previousMonth}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronLeftIcon className="h-5 w-5 text-slate-600" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                        Today
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronRightIcon className="h-5 w-5 text-slate-600" />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                {leaveTypes.map(type => (
                    <div key={type} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${getLeaveColor(type)}`} />
                        <span className="text-sm text-slate-700">{type}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0 border border-slate-200 rounded-lg overflow-hidden">
                {/* Day Headers */}
                {dayNames.map(day => (
                    <div
                        key={day}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-3 font-semibold text-sm"
                    >
                        {day}
                    </div>
                ))}
                {/* Days */}
                {days}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Monthly Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-blue-600">Total Leaves</p>
                        <p className="text-2xl font-bold text-blue-900">
                            {validLeaveRequests.filter(l => {
                                const start = new Date(l.start_date);
                                const end = new Date(l.end_date);
                                return (start.getMonth() === month || end.getMonth() === month) &&
                                    start.getFullYear() === year &&
                                    l.status === 'approved';
                            }).length}
                        </p>
                    </div>
                    <div>
                        <p className="text-blue-600">Pending</p>
                        <p className="text-2xl font-bold text-amber-600">
                            {validLeaveRequests.filter(l => l.status === 'pending').length}
                        </p>
                    </div>
                    <div>
                        <p className="text-blue-600">This Month</p>
                        <p className="text-2xl font-bold text-green-600">
                            {validLeaveRequests.filter(l => {
                                const start = new Date(l.start_date);
                                return start.getMonth() === month &&
                                    start.getFullYear() === year &&
                                    l.status === 'approved';
                            }).reduce((sum, l) => sum + l.total_days, 0)} days
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaveCalendar;
