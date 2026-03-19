import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Cell
} from 'recharts';
import { Card } from '@/components/ui';
import { Clock, TrendingUp, Calendar, Users } from 'lucide-react';

// Peak Hours Chart Component using Recharts
export const PeakHoursChart = ({ peakHours }) => {
    if (!peakHours || peakHours.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Clock size={48} className="opacity-20 mb-2" />
                <p>No peak hours data available</p>
            </div>
        );
    }

    const maxCount = Math.max(...peakHours.map(h => h.count));
    const peakHourData = peakHours.reduce((max, h) => h.count > max.count ? h : max, peakHours[0]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 text-white p-2 rounded shadow-lg border border-gray-700 text-xs">
                    <p className="font-bold mb-1">{label}:00</p>
                    <p>{payload[0].value} <span className="text-gray-400">bookings</span></p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-4">
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHours}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                            dataKey="hour"
                            tickFormatter={(value) => `${value}:00`}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#6B7280' }}
                        />
                        <YAxis
                            hide
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                        <Bar
                            dataKey="count"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        >
                            {peakHours.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.hour === peakHourData.hour && entry.count > 0 ? '#4F46E5' : '#818CF8'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs md:text-sm text-gray-600 bg-indigo-50 py-2 px-3 rounded-lg text-center">
                <Clock size={16} className="text-indigo-600 flex-shrink-0" />
                <span>Busiest: <span className="font-bold text-indigo-700">{peakHourData.hour}:00</span> (<span className="font-bold text-indigo-700">{peakHourData.count} bookings</span>)</span>
            </div>
        </div>
    );
};

// Booking Trends Chart Component using Recharts
export const BookingTrendsChart = ({ bookingTrends }) => {
    if (!bookingTrends || bookingTrends.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <TrendingUp size={48} className="opacity-20 mb-2" />
                <p>No booking trends data available</p>
            </div>
        );
    }

    const totalBookings = bookingTrends.reduce((sum, t) => sum + t.count, 0);
    const avgDaily = Math.round(totalBookings / bookingTrends.length);
    const peakDay = bookingTrends.reduce((max, t) => t.count > max.count ? t : max, bookingTrends[0]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (active && payload && payload.length) ? (
                <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-100 text-xs">
                    <p className="text-gray-500 font-medium mb-1">{label}</p>
                    <p className="text-blue-600 font-bold text-base">{payload[0].value} <span className="text-[10px] text-gray-400 uppercase">Bookings</span></p>
                </div>
            ) : null;
        }
        return null;
    };

    return (
        <div className="p-4">
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={bookingTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="100%">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                            minTickGap={30}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorCount)"
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#2563EB' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
                <div className="bg-blue-50/50 p-2 md:p-3 rounded-xl border border-blue-100 text-center">
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Total</p>
                    <p className="text-lg md:text-xl font-black text-blue-900">{totalBookings}</p>
                </div>
                <div className="bg-emerald-50/50 p-2 md:p-3 rounded-xl border border-emerald-100 text-center">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Avg/Day</p>
                    <p className="text-lg md:text-xl font-black text-emerald-900">{avgDaily}</p>
                </div>
                <div className="bg-amber-50/50 p-2 md:p-3 rounded-xl border border-amber-100 text-center col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1">Peak Day</p>
                    <p className="text-lg md:text-xl font-black text-amber-900 truncate px-1">{peakDay?.count || 0}</p>
                </div>
            </div>
        </div>
    );
};

// Branch Performance Table Component
export const BranchPerformanceTable = ({ branchPerformance, isSuperAdmin }) => {
    if (!isSuperAdmin || !branchPerformance || branchPerformance.length === 0) {
        return null;
    }

    return (
        <Card title="Branch Performance Comparison" className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Branch</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Bookings</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Progress</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Revenue</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Avg Rating</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {branchPerformance.map((branch) => (
                            <tr key={branch.branch_id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                            {branch.branch_name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{branch.branch_name}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">{branch.branch_code}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-gray-900">{branch.total_bookings}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">{branch.completed_bookings} completed</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[100px]">
                                            <div
                                                className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                                                style={{ width: `${branch.completion_rate}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-gray-700">{branch.completion_rate}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-emerald-600">₹{branch.revenue.toLocaleString()}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded w-fit">
                                        <span className="text-xs font-bold text-amber-700">{branch.avg_rating.toFixed(1)}</span>
                                        <span className="text-amber-500 text-xs">★</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};
