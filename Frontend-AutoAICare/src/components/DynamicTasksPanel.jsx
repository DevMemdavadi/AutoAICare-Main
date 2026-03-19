import React, { useState, useRef, useEffect } from 'react';
import {
    CheckSquare,
    Plus,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    User,
    MoreVertical,
    ChevronDown,
    ChevronUp,
    Loader2,
    Lock,
    Ban,
    FileText,
    CreditCard
} from 'lucide-react';

const PRESET_TASKS = [
    { title: 'Engine Bay Cleaning', price: 800, description: 'Complete degreasing and dressing of engine bay compartment.' },
    { title: 'Interior Plastic Polish', price: 600, description: 'Restoration and polishing of all interior dashboard and door plastic trims.' },
    { title: 'Headlight Restoration', price: 1200, description: 'Sanding and polishing of oxidized headlights for clarity.' }
];

const STATUS_CONFIG = {
    pending: { label: 'Pending Approval', color: 'bg-yellow-50 text-yellow-800 border-yellow-500', icon: AlertTriangle },
    approved: { label: 'Approved', color: 'bg-blue-50 text-blue-800 border-blue-500', icon: CheckCircle },
    in_progress: { label: 'In Progress', color: 'bg-indigo-50 text-indigo-800 border-indigo-500', icon: Clock },
    completed: { label: 'Completed', color: 'bg-green-50 text-green-800 border-green-500', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-gray-50 text-gray-700 border-gray-400', icon: Ban }
};

const DynamicTasksPanel = ({
    jobCardId,
    tasks,
    onAddTask,
    onUpdateTask,
    onApproveTask = () => { },
    currentUserRole,
    applicators = []
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        estimated_price: '',
        requires_approval: true
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedTasks, setExpandedTasks] = useState(new Set());
    const [statusMenuOpenId, setStatusMenuOpenId] = useState(null);
    const [errors, setErrors] = useState({});

    // Rejection Modal State
    const [rejectModal, setRejectModal] = useState({ isOpen: false, taskId: null, reason: '' });

    const menuRef = useRef(null);

    // Close status menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setStatusMenuOpenId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleExpand = (taskId) => {
        const newExpanded = new Set(expandedTasks);
        if (newExpanded.has(taskId)) {
            newExpanded.delete(taskId);
        } else {
            newExpanded.add(taskId);
        }
        setExpandedTasks(newExpanded);
    };

    const handleAddTask = async (e) => {
        if (e) e.preventDefault();

        // Reset errors
        setErrors({});

        // Validation Logic
        const newErrors = {};

        if (!newTask.title.trim()) {
            newErrors.title = "Title is required";
        } else if (newTask.title.length < 3) {
            newErrors.title = "Title must be at least 3 characters";
        }

        // Duplicate Check
        const isDuplicate = tasks.some(
            t => t.title.toLowerCase().trim() === newTask.title.toLowerCase().trim() && t.status !== 'cancelled'
        );

        if (isDuplicate) {
            newErrors.title = "This service is already added (check active tasks)";
        }

        if (newTask.requires_approval && (!newTask.estimated_price || parseFloat(newTask.estimated_price) <= 0)) {
            newErrors.price = "Price is required for customer approval";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            await onAddTask({
                ...newTask,
                estimated_price: parseFloat(newTask.estimated_price) || 0
            });

            setNewTask({
                title: '',
                description: '',
                estimated_price: '',
                requires_approval: true
            });
            setShowAddForm(false);
        } catch (error) {
            console.error("Error adding task:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickAdd = (preset) => {
        setNewTask({
            ...newTask,
            title: preset.title,
            estimated_price: preset.price,
            description: preset.description
        });
        // Clear specific field errors when using quick add
        setErrors(prev => ({ ...prev, title: null, price: null }));
    };

    const handleRejectSubmit = async () => {
        if (!rejectModal.reason.trim()) return;

        try {
            await onUpdateTask(rejectModal.taskId, {
                status: 'cancelled',
                rejection_reason: rejectModal.reason
            });
            setRejectModal({ isOpen: false, taskId: null, reason: '' });
        } catch (error) {
            console.error("Error rejecting task:", error);
        }
    };

    // Sub-components
    const StatusBadge = ({ status }) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        const Icon = config.icon;
        return (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border-l-4 ${config.color} shadow-sm transition-all`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{config.label}</span>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col font-sans">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                        <CheckSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight">Extra Services</h3>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Additional Tasks</p>
                    </div>
                </div>
                {['branch_admin', 'floor_manager', 'supervisor', 'applicator'].includes(currentUserRole) && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 shadow-sm ${showAddForm
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                            }`}
                    >
                        {showAddForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        <span className="hidden sm:inline">{showAddForm ? 'Cancel' : 'Add Task'}</span>
                    </button>
                )}
            </div>

            {/* Add Task Form with Presets */}
            {showAddForm && (
                <div className="p-4 border-b border-gray-100 bg-blue-50/30 animate-in slide-in-from-top-2 duration-200">
                    <div className="mb-4">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Quick Add Presets</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_TASKS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuickAdd(preset)}
                                    className="px-3 py-1.5 bg-white border border-blue-200 rounded-full text-xs font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm flex items-center gap-1.5"
                                >
                                    <Plus className="w-3 h-3" />
                                    {preset.title} <span className="text-blue-400">₹{preset.price}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-6">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Service Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                maxLength={50}
                                className={`w-full text-sm rounded-lg border ${errors.title
                                        ? 'border-red-400 focus:ring-red-500 bg-red-50'
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                    } py-2 shadow-sm`}
                                value={newTask.title}
                                onChange={(e) => {
                                    setNewTask({ ...newTask, title: e.target.value });
                                    if (errors.title) setErrors({ ...errors, title: null });
                                }}
                                placeholder="e.g. Engine Bay Cleaning"
                                required
                            />
                            <div className="flex justify-between mt-1">
                                <span className="text-[10px] text-gray-400">Short, clear service name</span>
                                <span className={`text-[10px] ${newTask.title.length >= 45 ? 'text-orange-500' : 'text-gray-400'}`}>
                                    {newTask.title.length}/50
                                </span>
                            </div>
                            {errors.title && <p className="text-[11px] text-red-600 mt-0.5 font-medium">{errors.title}</p>}
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Price (₹)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-400 text-xs">₹</span>
                                <input
                                    type="number"
                                    className={`w-full pl-6 text-sm rounded-lg border ${errors.price
                                            ? 'border-red-400 focus:ring-red-500 bg-red-50'
                                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                        } py-2 shadow-sm`}
                                    value={newTask.estimated_price}
                                    onChange={(e) => {
                                        setNewTask({ ...newTask, estimated_price: e.target.value });
                                        if (errors.price) setErrors({ ...errors, price: null });
                                    }}
                                    placeholder="0"
                                />
                            </div>
                            {errors.price && <p className="text-[11px] text-red-600 mt-1">{errors.price}</p>}
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Approval</label>
                            <div className="flex items-center h-[38px] px-3 border border-gray-200 rounded-lg bg-white">
                                <input
                                    type="checkbox"
                                    id="reqApp"
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={newTask.requires_approval}
                                    onChange={(e) => setNewTask({ ...newTask, requires_approval: e.target.checked })}
                                />
                                <label htmlFor="reqApp" className="text-xs text-gray-600 ml-2 cursor-pointer select-none font-medium">
                                    Required
                                </label>
                            </div>
                        </div>

                        <div className="md:col-span-12">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Description <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                                maxLength={200}
                                className="w-full text-xs rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 py-2 min-h-[60px] resize-none shadow-sm"
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                placeholder="Explain why this service is recommended (helps customer decision)"
                            />
                            <div className="flex justify-between mt-1">
                                <span className="text-[10px] text-gray-400">Visible to customer</span>
                                <span className="text-[10px] text-gray-400">{newTask.description.length}/200</span>
                            </div>
                        </div>

                        <div className="md:col-span-12 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-5 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto justify-center"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Add Task
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Rejection Modal */}
            {rejectModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <XCircle className="w-5 h-5 text-red-500" />
                                Reject Task
                            </h4>
                            <button onClick={() => setRejectModal({ isOpen: false, taskId: null, reason: '' })} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-600 mb-3">Please tell us why this optional service is not required:</p>
                            <textarea
                                className="w-full text-sm rounded-lg border-gray-300 focus:border-red-500 focus:ring-red-500 min-h-[80px]"
                                placeholder="e.g., Too expensive, not needed right now..."
                                value={rejectModal.reason}
                                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div className="p-3 bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => setRejectModal({ isOpen: false, taskId: null, reason: '' })}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectSubmit}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
                            >
                                Reject Service
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center bg-white rounded-xl border border-dashed border-gray-300 p-6">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                            <CheckSquare className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">No extra services yet</p>
                        <p className="text-xs text-gray-500 mt-1 mb-4 max-w-[200px]">Add additional valuable services like engine bay cleaning using the button above.</p>
                        {['branch_admin', 'floor_manager', 'supervisor'].includes(currentUserRole) && (
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Add First Task
                            </button>
                        )}
                    </div>
                ) : (
                    tasks.map((task) => {
                        const isExpanded = expandedTasks.has(task.id);
                        const isCustomer = currentUserRole === 'customer';
                        const showSupervisorActions = ['supervisor', 'floor_manager', 'branch_admin', 'applicator'].includes(currentUserRole);
                        const isPendingCustomer = task.requires_approval && !task.approved_by_customer && task.status !== 'cancelled';

                        return (
                            <div key={task.id} className={`bg-white border rounded-xl transition-all duration-200 ${isExpanded ? 'shadow-md ring-1 ring-blue-50 border-blue-100' : 'hover:shadow-sm border-gray-200'}`}>
                                {/* Card Header / Summary */}
                                <div
                                    className="p-3 cursor-pointer flex items-center justify-between"
                                    onClick={() => toggleExpand(task.id)}
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-gray-900 text-sm truncate">{task.title}</h4>
                                            {task.approved_by_customer && <Lock className="w-3 h-3 text-gray-400" title="Customer Approved" />}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {task.estimated_price > 0 && (
                                                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3 text-gray-500" />
                                                    {parseFloat(task.estimated_price).toFixed(0)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={task.status} />
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-1 duration-200">
                                        <div className="h-px bg-gray-100 my-2" />

                                        {task.description && (
                                            <div className="flex gap-2 mb-3">
                                                <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-xs text-gray-600 leading-relaxed">{task.description}</p>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-4 mb-3 text-xs text-gray-500">
                                            <div className="flex items-center gap-1.5" title="Assigned Applicator">
                                                <User className="w-3.5 h-3.5" />
                                                <span>{task.assigned_to_details?.name || 'Auto-Assigned (Supervisor)'}</span>
                                            </div>
                                            {task.requires_approval && (
                                                <div className={`flex items-center gap-1.5 ${task.approved_by_customer ? 'text-green-600' : 'text-orange-500'}`}>
                                                    {task.approved_by_customer ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                                    <span>{task.approved_by_customer ? 'Customer Approved' : 'Approval Required'}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Customer Action Area */}
                                        {isCustomer && isPendingCustomer && (
                                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                                                    <div className="flex-1">
                                                        <h5 className="text-sm font-semibold text-blue-900">Approval Required</h5>
                                                        <p className="text-xs text-blue-700 mt-1 mb-2">Technician recommends this additional service.</p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onApproveTask(task.id); }}
                                                                className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-blue-700"
                                                            >
                                                                Approve (₹{task.estimated_price})
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setRejectModal({ isOpen: true, taskId: task.id, reason: '' }); }}
                                                                className="px-3 py-1.5 bg-white text-red-600 border border-red-200 text-xs font-semibold rounded-lg hover:bg-red-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Supervisor Inline Actions */}
                                        {showSupervisorActions && (
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Update Status</span>
                                                <div className="relative" ref={menuRef}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setStatusMenuOpenId(statusMenuOpenId === task.id ? null : task.id);
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-md text-xs font-medium text-gray-700 border border-gray-200 transition-colors"
                                                    >
                                                        {STATUS_CONFIG[task.status]?.label || task.status}
                                                        <ChevronDown className="w-3 h-3 text-gray-400" />
                                                    </button>

                                                    {/* Status Dropdown/Sheet */}
                                                    {statusMenuOpenId === task.id && (
                                                        <div className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10 overflow-hidden md:w-56 animate-in fade-in zoom-in-95 duration-100 origin-bottom-right">
                                                            <div className="py-1">
                                                                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                                                                    const Icon = config.icon;
                                                                    return (
                                                                        <button
                                                                            key={key}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onUpdateTask(task.id, { status: key });
                                                                                setStatusMenuOpenId(null);
                                                                            }}
                                                                            className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2 hover:bg-gray-50 ${task.status === key ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                                                                        >
                                                                            <Icon className={`w-3.5 h-3.5 ${task.status === key ? 'text-blue-500' : 'text-gray-400'}`} />
                                                                            {config.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Summary Footer */}
            {tasks.length > 0 && (
                <div className="p-3 bg-gray-50/80 backdrop-blur border-t border-gray-200 rounded-b-xl flex justify-between items-center z-10">
                    <span className="text-xs font-medium text-gray-500">{tasks.length} Tasks</span>
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-gray-200 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Total</span>
                        <span className="text-sm font-bold text-gray-900">
                            ₹{tasks.reduce((sum, t) => sum + (parseFloat(t.estimated_price) || 0), 0).toFixed(0)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DynamicTasksPanel;
