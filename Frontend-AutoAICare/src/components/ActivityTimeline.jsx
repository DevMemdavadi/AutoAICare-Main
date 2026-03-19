import React from 'react';
import {
    Circle,
    CheckCircle,
    MessageSquare,
    PlusCircle,
    Edit,
    Image as ImageIcon,
    UserPlus,
    FileCheck,
    Play,
    Flag,
    Clock,
    AlertCircle,
    Calendar,
    Wrench
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const ActivityTimeline = ({ activities }) => {
    const getActivityIcon = (type) => {
        switch (type) {
            case 'status_change': return <Flag className="w-4 h-4 text-purple-500" />;
            case 'note_added': return <MessageSquare className="w-4 h-4 text-blue-500" />;
            case 'task_added': return <PlusCircle className="w-4 h-4 text-green-500" />;
            case 'task_updated': return <Edit className="w-4 h-4 text-orange-500" />;
            case 'photo_uploaded': return <ImageIcon className="w-4 h-4 text-indigo-500" />;
            case 'assignment': return <UserPlus className="w-4 h-4 text-cyan-500" />;
            case 'approval': return <FileCheck className="w-4 h-4 text-emerald-500" />;
            case 'qc_completed': return <CheckCircle className="w-4 h-4 text-teal-500" />;
            case 'work_started': return <Play className="w-4 h-4 text-blue-600" />;
            case 'work_completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'date_update': return <Calendar className="w-4 h-4 text-rose-500" />;
            case 'service_update': return <Wrench className="w-4 h-4 text-violet-500" />;
            default: return <Circle className="w-4 h-4 text-gray-400" />;
        }
    };

    const getActivityColor = (type) => {
        switch (type) {
            case 'status_change': return 'bg-purple-100 border-purple-200';
            case 'note_added': return 'bg-blue-100 border-blue-200';
            case 'task_added': return 'bg-green-100 border-green-200';
            case 'task_updated': return 'bg-orange-100 border-orange-200';
            case 'photo_uploaded': return 'bg-indigo-100 border-indigo-200';
            case 'assignment': return 'bg-cyan-100 border-cyan-200';
            case 'approval': return 'bg-emerald-100 border-emerald-200';
            case 'qc_completed': return 'bg-teal-100 border-teal-200';
            case 'work_started': return 'bg-blue-100 border-blue-200';
            case 'work_completed': return 'bg-green-100 border-green-200';
            case 'date_update': return 'bg-rose-100 border-rose-200';
            case 'service_update': return 'bg-violet-100 border-violet-200';
            default: return 'bg-gray-100 border-gray-200';
        }
    };

    if (!activities || activities.length === 0) {
        return (
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-gray-900 font-medium">No Activity Yet</h3>
                <p className="text-gray-500 text-sm mt-1">Activities will appear here as work progresses.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Activity History
            </h3>

            <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
                {activities.map((activity) => (
                    <div key={activity.id} className="relative">
                        {/* Timeline Dot */}

                        {/* Content */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 group">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={` -left-[25px] mt-1 w-8 h-8 rounded-full flex items-center justify-center bg-white border-2 border-white shadow-sm ring-1 ring-gray-100`}>
                                        {getActivityIcon(activity.activity_type)}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 inline-flex items-center">
                                        {activity.performed_by_details?.name || 'System'}
                                        {activity.performed_by_details?.role_display && (
                                            <span className="ml-2 text-[10px] text-blue-600 font-bold px-1.5 py-0.5 bg-blue-50 rounded border border-blue-100 uppercase tracking-tight">
                                                {activity.performed_by_details.role_display}
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700">{activity.description}</p>


                                {/* Metadata Details (Expandable in future) */}
                                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                    <div className="mt-2 text-xs bg-gray-50 p-2 rounded border border-gray-100 text-gray-600 hidden group-hover:block transition-all">
                                        {Object.entries(activity.metadata).map(([key, value]) => (
                                            <div key={key} className="flex gap-2">
                                                <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                                                <span>
                                                    {typeof value === 'boolean'
                                                        ? (value ? 'Yes' : 'No')
                                                        : (typeof value === 'object' && value !== null)
                                                            ? (Array.isArray(value) ? value.join(', ') : '[Details]')
                                                            : String(value)
                                                    }
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="text-xs text-gray-400 whitespace-nowrap mt-1 sm:mt-0">
                                {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityTimeline;
