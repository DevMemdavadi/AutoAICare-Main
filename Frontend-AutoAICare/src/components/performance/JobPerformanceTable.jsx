import React, { useState, useEffect } from 'react';
import {
    FileText,
    ChevronDown,
    ChevronUp,
    Clock,
    DollarSign,
    Users,
    Filter,
    RefreshCw,
    CheckCircle,
    XCircle,
    ChevronLeft,
    ChevronRight,
    BadgeCheck,
    Hourglass,
    IndianRupee,
} from 'lucide-react';
import api from '@/utils/api';

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value || 0);

const formatTime = (minutes) => {
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    const sign = minutes < 0 ? '-' : '+';
    return hours > 0 ? `${sign}${hours}h ${mins}m` : `${sign}${mins}m`;
};

const formatDate = (dateString, withTime = true) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
};

/* ─── Summary Strip ──────────────────────────────────────────────────── */
const SummaryStrip = ({ summary, loading }) => {
    if (loading || !summary) return null;

    const paidPct = summary.total_jobs > 0
        ? Math.round((summary.paid_jobs / summary.total_jobs) * 100)
        : 0;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-blue-100">
            {/* Total Revenue */}
            <div className="text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Revenue</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.total_revenue)}</p>
                <p className="text-xs text-gray-500">{summary.total_jobs} jobs</p>
            </div>

            {/* Paid Revenue */}
            <div className="text-center">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <BadgeCheck className="w-3 h-3" /> Paid Revenue
                </p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(summary.paid_revenue)}</p>
                <p className="text-xs text-emerald-600">{summary.paid_jobs} jobs · {paidPct}%</p>
            </div>

            {/* Unpaid / Pending */}
            <div className="text-center">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Hourglass className="w-3 h-3" /> Awaiting Payment
                </p>
                <p className="text-lg font-bold text-amber-700">{formatCurrency(summary.unpaid_revenue)}</p>
                <p className="text-xs text-amber-600">{summary.unpaid_jobs} jobs</p>
            </div>

            {/* Rewards */}
            <div className="text-center">
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Total Rewards</p>
                <p className="text-lg font-bold text-purple-700">{formatCurrency(summary.total_rewards)}</p>
                {/* Paid bar */}
                <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${paidPct}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

/* ─── Payment Badge ──────────────────────────────────────────────────── */
const PaymentBadge = ({ isPaid, paidAt }) => (
    isPaid ? (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <BadgeCheck className="w-3 h-3" />
            Paid
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Hourglass className="w-3 h-3" />
            Pending
        </span>
    )
);

/* ─── Main Component ─────────────────────────────────────────────────── */
const JobPerformanceTable = ({ period, startDate, endDate, branchId, userRole }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState(null);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
    const [filters, setFilters] = useState({
        branch_id: '',
        supervisor_id: '',
        floor_manager_id: '',
        status: 'all',
        payment_status: 'all',
        start_date: startDate || '',
        end_date: endDate || '',
        ordering: '-job_completed_at',
    });

    // Update filters when props change
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            branch_id: branchId || prev.branch_id,
            start_date: startDate || prev.start_date,
            end_date: endDate || prev.end_date
        }));
    }, [startDate, endDate, period, branchId]);

    /* Load data */
    const loadData = async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, page_size: pagination.pageSize, ...filters };
            Object.keys(params).forEach(k => {
                if (params[k] === '' || params[k] === null) delete params[k];
            });

            console.log('📡 [JobPerformanceTable] GET /jobcards/performance/job-details-list/', params);
            const response = await api.get('/jobcards/performance/job-details-list/', { params });
            console.log('✅ [JobPerformanceTable] response summary:', response.data.summary, '| rows:', response.data.results?.length);

            setData(response.data.results || []);
            setSummary(response.data.summary || null);
            setPagination(prev => ({
                ...prev,
                total: response.data.count,
                totalPages: response.data.total_pages,
            }));
        } catch (error) {
            console.error('❌ [JobPerformanceTable] error:', error.response?.status, error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [pagination.page, pagination.pageSize, filters]);

    const toggleRow = (id) => {
        const next = new Set(expandedRows);
        next.has(id) ? next.delete(id) : next.add(id);
        setExpandedRows(next);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage) => setPagination(prev => ({ ...prev, page: newPage }));

    /* Skeleton */
    if (loading && data.length === 0) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-full mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── Filters ── */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* Start Date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={filters.start_date}
                            onChange={e => handleFilterChange('start_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={filters.end_date}
                            onChange={e => handleFilterChange('end_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Completion Status */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Completion</label>
                        <select
                            value={filters.status}
                            onChange={e => handleFilterChange('status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Jobs</option>
                            <option value="on_time">On Time</option>
                            <option value="delayed">Delayed</option>
                        </select>
                    </div>

                    {/* Payment Status */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Payment</label>
                        <select
                            value={filters.payment_status}
                            onChange={e => handleFilterChange('payment_status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Pending Payment</option>
                        </select>
                    </div>

                    {/* Sort By */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                        <select
                            value={filters.ordering}
                            onChange={e => handleFilterChange('ordering', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="-job_completed_at">Latest First</option>
                            <option value="job_completed_at">Oldest First</option>
                            <option value="-total_with_gst">Highest Amount</option>
                            <option value="total_with_gst">Lowest Amount</option>
                            <option value="-time_difference_minutes">Most Time Saved</option>
                            <option value="time_difference_minutes">Most Delayed</option>
                            <option value="-reward_amount">Highest Reward</option>
                            <option value="reward_amount">Lowest Reward</option>
                            <option value="-paid_at">Last Paid First</option>
                        </select>
                    </div>

                    {/* Refresh */}
                    <div className="flex items-end">
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Summary Strip ── */}
            <SummaryStrip summary={summary} loading={loading} />

            {/* ── Results count ── */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{data.length}</span> of{' '}
                    <span className="font-semibold">{pagination.total}</span> jobs
                </p>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisor</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.map(job => (
                                <React.Fragment key={job.id}>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        {/* Job ID */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium text-gray-900">#{job.jobcard_id || job.id}</span>
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-700">
                                            {formatDate(job.job_completed_at)}
                                        </td>

                                        {/* Branch */}
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-900">{job.branch_name}</td>

                                        {/* Supervisor */}
                                        <td className="px-4 py-4 whitespace-nowrap text-gray-900">
                                            {job.supervisor?.name || 'N/A'}
                                        </td>

                                        {/* Team size */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1 text-gray-700">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                {job.applicators?.length || 0}
                                            </div>
                                        </td>

                                        {/* Time */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`font-medium ${job.time_difference_minutes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatTime(job.time_difference_minutes)}
                                            </span>
                                            <div className="text-xs text-gray-400">
                                                {job.actual_duration_minutes}m / {job.scheduled_duration_minutes}m
                                            </div>
                                        </td>

                                        {/* Amount */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">
                                                {formatCurrency(job.total_with_gst || job.job_value)}
                                            </div>
                                            {job.gst_amount > 0 && (
                                                <div className="text-xs text-gray-400">
                                                    +GST {formatCurrency(job.gst_amount)}
                                                </div>
                                            )}
                                            {/* Provisional indicator */}
                                            {!job.is_paid && (
                                                <div className="text-xs text-amber-500 mt-0.5">estimated</div>
                                            )}
                                        </td>

                                        {/* Reward */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`font-medium ${job.reward_amount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                {formatCurrency(job.reward_amount)}
                                            </span>
                                            {job.reward_percentage && (
                                                <div className="text-xs text-gray-400">{job.reward_percentage}%</div>
                                            )}
                                        </td>

                                        {/* Completion Status */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {job.completed_on_time ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3" /> On Time
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <XCircle className="w-3 h-3" /> Delayed
                                                </span>
                                            )}
                                        </td>

                                        {/* Payment Status */}
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <PaymentBadge isPaid={job.is_paid} paidAt={job.paid_at} />
                                        </td>

                                        {/* Expand toggle */}
                                        <td className="px-4 py-4 whitespace-nowrap text-right">
                                            <button onClick={() => toggleRow(job.id)} className="text-gray-400 hover:text-gray-600">
                                                {expandedRows.has(job.id)
                                                    ? <ChevronUp className="w-5 h-5" />
                                                    : <ChevronDown className="w-5 h-5" />
                                                }
                                            </button>
                                        </td>
                                    </tr>

                                    {/* ── Expanded Row ── */}
                                    {expandedRows.has(job.id) && (
                                        <tr className="bg-slate-50">
                                            <td colSpan="11" className="px-6 py-5">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                                    {/* Team Members */}
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Team Members</h4>
                                                        <div className="space-y-2 text-sm">
                                                            {job.floor_manager && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-500 w-28">Floor Manager:</span>
                                                                    <span className="font-medium text-gray-900">{job.floor_manager.name}</span>
                                                                </div>
                                                            )}
                                                            {job.supervisor && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-500 w-28">Supervisor:</span>
                                                                    <span className="font-medium text-gray-900">{job.supervisor.name}</span>
                                                                </div>
                                                            )}
                                                            {job.applicators?.length > 0 && (
                                                                <div>
                                                                    <span className="text-gray-500">Applicators:</span>
                                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                                        {job.applicators.map(a => (
                                                                            <span key={a.id} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                                                                {a.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Pricing & Rewards */}
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Pricing &amp; Rewards</h4>
                                                        <div className="space-y-1.5 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Service Value:</span>
                                                                <span className="font-medium">{formatCurrency(job.job_value)}</span>
                                                            </div>
                                                            {job.gst_amount > 0 && (
                                                                <>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-500">GST:</span>
                                                                        <span className="font-medium text-gray-700">{formatCurrency(job.gst_amount)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between pt-1 border-t border-gray-200">
                                                                        <span className="font-semibold text-gray-800">Customer Paid:</span>
                                                                        <span className="font-semibold text-blue-700">{formatCurrency(job.total_with_gst)}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                                                <span className="text-gray-500">Total Reward:</span>
                                                                <span className="font-medium">{formatCurrency(job.reward_amount)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Supervisor (50%):</span>
                                                                <span className="font-medium text-green-700">{formatCurrency(job.supervisor_share)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Applicator Pool (50%):</span>
                                                                <span className="font-medium text-blue-700">{formatCurrency(job.applicator_pool)}</span>
                                                            </div>
                                                            {job.quality_score && (
                                                                <div className="flex justify-between pt-1 border-t border-gray-200">
                                                                    <span className="text-gray-500">Quality Score:</span>
                                                                    <span className="font-medium">{job.quality_score}/10</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Payment Info */}
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment Status</h4>
                                                        {job.is_paid ? (
                                                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                                                                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                                                                    <BadgeCheck className="w-5 h-5" />
                                                                    Invoice Fully Paid
                                                                </div>
                                                                <div className="text-xs text-emerald-600 space-y-1">
                                                                    <div>
                                                                        <span className="font-medium">Paid on:</span>{' '}
                                                                        {formatDate(job.paid_at, true)}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Confirmed amount:</span>{' '}
                                                                        {formatCurrency(job.total_with_gst)}
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs text-emerald-500 mt-1">
                                                                    Financial figures above reflect the final paid invoice amount.
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
                                                                <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                                                                    <Hourglass className="w-5 h-5" />
                                                                    Awaiting Payment
                                                                </div>
                                                                <p className="text-xs text-amber-600">
                                                                    The associated invoice has not been fully paid yet.
                                                                    The amount shown above is an <strong>estimate</strong> based on the current invoice total.
                                                                    Figures will be updated automatically once payment is confirmed.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {data.length === 0 && !loading && (
                    <div className="text-center py-16">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Found</h3>
                        <p className="text-gray-500">Try adjusting your filters or date range to see more results.</p>
                    </div>
                )}
            </div>

            {/* ── Pagination ── */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" /> Previous
                        </button>
                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobPerformanceTable;
