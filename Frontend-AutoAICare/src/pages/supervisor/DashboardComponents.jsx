import React from 'react';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    FileText,
    Users,
    XCircle,
    ChevronRight,
    AlertTriangle,
    Car,
    Briefcase,
    Calendar
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';

// --- KPI Card ---
export const KPICard = ({ title, count, status, onClick }) => {
    // Modern status styles with subtle backgrounds and specific icons
    const config = {
        pending: {
            border: 'border-l-orange-500',
            bg: 'hover:bg-orange-50',
            text: 'text-orange-600',
            icon: Clock,
            iconBg: 'bg-orange-100'
        },
        failed: {
            border: 'border-l-red-500',
            bg: 'hover:bg-red-50',
            text: 'text-red-600',
            icon: XCircle,
            iconBg: 'bg-red-100'
        },
        progress: {
            border: 'border-l-blue-500',
            bg: 'hover:bg-blue-50',
            text: 'text-blue-600',
            icon: Users,
            iconBg: 'bg-blue-100'
        },
        ready: {
            border: 'border-l-green-500',
            bg: 'hover:bg-green-50',
            text: 'text-green-600',
            icon: CheckCircle,
            iconBg: 'bg-green-100'
        },
        recent: {
            border: 'border-l-purple-500',
            bg: 'hover:bg-purple-50',
            text: 'text-purple-600',
            icon: Calendar,
            iconBg: 'bg-purple-100'
        },
        default: {
            border: 'border-l-indigo-500',
            bg: 'hover:bg-gray-50',
            text: 'text-indigo-600',
            icon: FileText,
            iconBg: 'bg-indigo-100'
        }
    };

    const style = config[status] || config.default;
    const Icon = style.icon;

    return (
        <div
            className={`
                relative bg-white rounded-xl shadow-sm border border-gray-100 p-5 
                cursor-pointer transition-all duration-200 
                hover:shadow-md hover:-translate-y-1 ${style.bg}
                flex flex-col justify-between h-[120px]
            `}
            onClick={onClick}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{count}</h3>
                </div>
                <div className={`p-2 rounded-full ${style.iconBg} ${style.text}`}>
                    <Icon size={18} />
                </div>
            </div>

            <div className={`flex items-center text-xs font-semibold ${style.text} mt-2 opacity-0 hover:opacity-100 md:opacity-100 transition-opacity`}>
                Review Now <ChevronRight size={14} className="ml-0.5" />
            </div>
        </div>
    );
};

// --- Status Badge ---
export const StatusBadge = ({ status }) => {
    const styles = {
        // Pending / Initial
        created: 'bg-gray-100 text-gray-700 ring-1 ring-gray-600/20',
        pending: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20',
        qc_pending: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',

        // Success / Progress
        supervisor_approved: 'bg-blue-50 text-blue-700 ring-1 ring-blue-700/10',
        floor_manager_confirmed: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-700/10',
        assigned_to_applicator: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-700/10',
        work_in_progress: 'bg-blue-100 text-blue-800 ring-1 ring-blue-600/20',
        work_completed: 'bg-green-50 text-green-700 ring-1 ring-green-600/20',
        final_qc_passed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        ready_for_billing: 'bg-green-100 text-green-800 ring-1 ring-green-600/20',

        // Failure / Issues
        qc_rejected: 'bg-red-50 text-red-700 ring-1 ring-red-600/10',
        final_qc_failed: 'bg-red-100 text-red-800 ring-1 ring-red-600/20',
    };

    const getStyle = (s) => {
        if (!s) return styles.created;
        // Direct match
        if (styles[s]) return styles[s];
        // Fallbacks
        if (s.includes('fail') || s.includes('reject')) return styles.qc_rejected;
        if (s.includes('progress')) return styles.work_in_progress;
        if (s.includes('completed') || s.includes('passed')) return styles.work_completed;
        return styles.pending;
    };

    const label = status ? status.replace(/_/g, ' ') : 'Unknown';

    return (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${getStyle(status)}`}>
            {label}
        </span>
    );
};

// --- JobCard (Repeatable Component) ---
export const JobCard = ({ job, onViewDetails, onAssign, onReview, isReassign }) => {
    const { id, status, created_at, booking_details } = job;
    const vehicle_details = booking_details?.vehicle_details;
    const service_package = booking_details?.package_details;

    // Calculate real waiting time based on last update
    const calculateTimeSince = (dateString) => {
        if (!dateString) return 'Just now';

        const updated = new Date(dateString);
        const now = new Date();
        const diffInMs = now - updated;
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInMinutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffInHours > 24) {
            const days = Math.floor(diffInHours / 24);
            return `${days}d ${diffInHours % 24}h waiting`;
        }

        if (diffInHours > 0) {
            return `${diffInHours}h ${diffInMinutes}m waiting`;
        }

        return `${diffInMinutes}m waiting`;
    };

    const waitingTime = calculateTimeSince(job.updated_at || job.created_at);

    return (
        <div className={`
            group bg-white rounded-xl border border-gray-200 p-5 shadow-sm 
            hover:shadow-md hover:border-blue-300 transition-all duration-200
            ${isReassign ? 'border-l-4 border-l-red-500' : ''}
        `}>
            {/* Context Header */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm">
                        #{id}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${isReassign ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                        <Clock size={10} /> {waitingTime}
                    </span>
                </div>
                <StatusBadge status={status} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Car size={18} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Vehicle</p>
                        <p className="text-sm font-bold text-gray-900">
                            {vehicle_details?.registration_number}
                        </p>
                        <p className="text-sm text-gray-600">
                            {vehicle_details?.model || 'Unknown Model'}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                        <Briefcase size={18} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase">Service</p>
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1" title={service_package?.name}>
                            {service_package?.name || 'Standard Service'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-3 opacity-90 group-hover:opacity-100 transition-opacity">
                {/* Secondary Action */}
                {!onReview && !onAssign && (
                    <Button variant="ghost" size="sm" onClick={() => onViewDetails(job)} className="text-gray-500 hover:text-blue-600">
                        View Details
                    </Button>
                )}

                {/* Primary Actions */}
                {onViewDetails && (onReview || onAssign) && (
                    <Button variant="ghost" size="sm" onClick={() => onViewDetails(job)} className="text-gray-500">
                        Details
                    </Button>
                )}

                {onReview && (
                    <Button size="sm" onClick={() => onReview(job)} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:shadow-md">
                        Start QC Review
                    </Button>
                )}

                {onAssign && (
                    <Button
                        size="sm"
                        variant={isReassign ? "destructive" : "default"}
                        className={!isReassign ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50" : "shadow-sm"}
                        onClick={() => onAssign(job)}
                    >
                        {isReassign ? (
                            <span className="flex items-center gap-1"><AlertTriangle size={14} /> Reassign & Fix</span>
                        ) : (
                            <span className="flex items-center gap-1"><Users size={14} /> Assign Team</span>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
};

// --- Alert Item ---
export const AlertItem = ({ type, message, time, onClick }) => {
    const config = {
        overdue: { icon: Clock, color: 'text-red-500', bg: 'bg-red-50' },
        failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        unavailable: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' }
    };

    const style = config[type] || { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-50' };
    const Icon = style.icon;

    return (
        <div
            className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group"
            onClick={onClick}
        >
            <div className={`p-2 rounded-full flex-shrink-0 ${style.bg} ${style.color}`}>
                <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{message}</p>
                {time && <p className="text-xs text-gray-500">{time}</p>}
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
        </div>
    );
};

// --- Empty State ---
export const EmptyState = ({ title = "All caught up!", message = "No jobs currently require supervisor action." }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <div className="bg-green-100 p-4 rounded-full mb-4">
            <CheckCircle size={32} className="text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-gray-500 mt-1 max-w-sm">{message}</p>
    </div>
);

// --- WIP Table Row ---
export const WIPRow = ({ job, onAction }) => {
    // Handle applicator team details from serializer
    const applicatorDisplay = (job.applicator_team_details?.length > 0
        ? job.applicator_team_details
            .map(a => a.name || a.username || '')
            .filter(name => name.trim() !== '')
            .join(', ')
        : 'Unassigned');

    // Format ETA or Remaining Time
    const formatTimeInfo = () => {
        if (job.remaining_minutes !== undefined && job.remaining_minutes !== null) {
            const mins = job.remaining_minutes;
            if (mins < 0) return <span className="text-red-600 font-bold">{Math.abs(mins)}m overdue</span>;
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return <span className="text-blue-600 font-medium">{h > 0 ? `${h}h ${m}m` : `${m}m`} left</span>;
        }

        if (job.estimated_delivery_time) {
            const date = new Date(job.estimated_delivery_time);
            return <span className="text-gray-900 font-medium">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
        }

        return <span className="text-gray-400">--</span>;
    };

    return (
        <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/80 transition-colors">
            <td className="py-4 px-4">
                <span className="font-mono text-xs font-semibold bg-gray-100 px-2 py-1 rounded text-gray-700">
                    #{job.id}
                </span>
            </td>
            <td className="py-4 px-4 text-sm font-medium text-gray-900">
                {job.booking_details?.vehicle_details?.model || 'Unknown'}
                <div className="text-xs text-gray-500 font-normal uppercase">{job.booking_details?.vehicle_details?.registration_number}</div>
            </td>
            <td className="py-4 px-4 text-sm text-gray-600 truncate max-w-[150px]" title={applicatorDisplay}>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                        {applicatorDisplay.charAt(0).toUpperCase()}
                    </div>
                    <span>{applicatorDisplay}</span>
                </div>
            </td>
            <td className="py-4 px-4">
                <StatusBadge status={job.status} />
            </td>
            <td className="py-4 px-4 text-sm text-gray-500 flex items-center gap-1">
                {formatTimeInfo()}
            </td>
            <td className="py-4 px-4 text-right">
                <Button variant="ghost" size="sm" onClick={() => onAction('view')} className="text-blue-600 hover:bg-blue-50">
                    View
                </Button>
            </td>
        </tr>
    );
};
