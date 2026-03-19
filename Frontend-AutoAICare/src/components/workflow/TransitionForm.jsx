import { useState, useEffect } from 'react';
import { GitBranch, Users, FileText, Camera, ClipboardCheck, AlertCircle, X } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

const TransitionForm = ({ transition, statuses, onSave, onCancel, mode = 'create' }) => {
    const [formData, setFormData] = useState({
        from_status: '',
        to_status: '',
        action_name: '',
        action_description: '',
        allowed_roles: [],
        requires_assignment: true,
        requires_notes: false,
        requires_photos: false,
        is_active: true,
    });
    const [errors, setErrors] = useState({});
    const [preview, setPreview] = useState(false);

    // Load existing transition data in edit mode
    useEffect(() => {
        if (mode === 'edit' && transition) {
            setFormData({
                from_status: transition.from_status || '',
                to_status: transition.to_status || '',
                action_name: transition.action_name || '',
                action_description: transition.action_description || '',
                allowed_roles: transition.allowed_roles || [],
                requires_assignment: transition.requires_assignment ?? true,
                requires_notes: transition.requires_notes ?? false,
                requires_photos: transition.requires_photos ?? false,
                is_active: transition.is_active ?? true,
            });
        }
    }, [transition, mode]);

    // Role definitions with colors
    const roles = [
        { id: 'super_admin', name: 'Super Admin', color: 'bg-purple-100 text-purple-800 border-purple-300' },
        { id: 'company_admin', name: 'Company Admin', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
        { id: 'branch_admin', name: 'Branch Admin', color: 'bg-blue-100 text-blue-800 border-blue-300' },
        { id: 'floor_manager', name: 'Floor Manager', color: 'bg-green-100 text-green-800 border-green-300' },
        { id: 'supervisor', name: 'Supervisor', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
        { id: 'applicator', name: 'Applicator', color: 'bg-orange-100 text-orange-800 border-orange-300' },
        { id: 'customer', name: 'Customer', color: 'bg-gray-100 text-gray-800 border-gray-300' },
    ];

    // Status type colors
    const statusTypeColors = {
        initial: 'bg-slate-500 text-white',
        qc: 'bg-cyan-500 text-white',
        approval: 'bg-emerald-500 text-white',
        work: 'bg-blue-500 text-white',
        final_qc: 'bg-purple-500 text-white',
        customer: 'bg-pink-500 text-white',
        billing: 'bg-amber-500 text-white',
        delivery: 'bg-teal-500 text-white',
        terminal: 'bg-gray-500 text-white',
    };

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const toggleRole = (roleId) => {
        const currentRoles = formData.allowed_roles;
        if (currentRoles.includes(roleId)) {
            updateFormData('allowed_roles', currentRoles.filter(r => r !== roleId));
        } else {
            updateFormData('allowed_roles', [...currentRoles, roleId]);
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.from_status) {
            newErrors.from_status = 'From status is required';
        }
        if (!formData.to_status) {
            newErrors.to_status = 'To status is required';
        }
        if (formData.from_status === formData.to_status) {
            newErrors.to_status = 'From and To status must be different';
        }
        if (!formData.action_name.trim()) {
            newErrors.action_name = 'Action name is required';
        }
        if (formData.allowed_roles.length === 0) {
            newErrors.allowed_roles = 'At least one role must be selected';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onSave?.(formData);
        }
    };

    const getStatusDisplay = (statusName) => {
        const status = statuses?.find(s => s.display_name === statusName);
        return status || { display_name: statusName, status_type: 'work' };
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-5 md:px-8 py-4 md:py-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <GitBranch className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                {mode === 'create' ? 'Create Transition' : 'Edit Transition'}
                            </h2>
                            <p className="text-xs md:text-sm text-gray-500 mt-1">
                                Define a transition between workflow statuses
                            </p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 md:px-8 py-4 md:py-6 space-y-5 md:space-y-6">
                    {/* Status Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                From Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.from_status}
                                onChange={(e) => updateFormData('from_status', e.target.value)}
                                className={`w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border ${errors.from_status ? 'border-red-500' : 'border-gray-300'
                                    } focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all`}
                            >
                                <option value="">Select status...</option>
                                {statuses?.map(status => {
                                    const colorClass = statusTypeColors[status.status_type] || statusTypeColors.work;
                                    return (
                                        <option key={status.id} value={status.display_name}>
                                            {status.display_name} ({status.status_code})
                                        </option>
                                    );
                                })}
                            </select>
                            {errors.from_status && (
                                <p className="mt-1 text-sm text-red-600">{errors.from_status}</p>
                            )}
                            {formData.from_status && (
                                <div className="mt-2">
                                    <Badge className={statusTypeColors[getStatusDisplay(formData.from_status).status_type]}>
                                        {formData.from_status}
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                To Status <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.to_status}
                                onChange={(e) => updateFormData('to_status', e.target.value)}
                                className={`w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border ${errors.to_status ? 'border-red-500' : 'border-gray-300'
                                    } focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all`}
                            >
                                <option value="">Select status...</option>
                                {statuses?.map(status => (
                                    <option key={status.id} value={status.display_name}>
                                        {status.display_name} ({status.status_code})
                                    </option>
                                ))}
                            </select>
                            {errors.to_status && (
                                <p className="mt-1 text-sm text-red-600">{errors.to_status}</p>
                            )}
                            {formData.to_status && (
                                <div className="mt-2">
                                    <Badge className={statusTypeColors[getStatusDisplay(formData.to_status).status_type]}>
                                        {formData.to_status}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Details */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Action Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.action_name}
                            onChange={(e) => updateFormData('action_name', e.target.value)}
                            placeholder="e.g., 'Start Work', 'Submit for QC', 'Approve'"
                            className={`w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border ${errors.action_name ? 'border-red-500' : 'border-gray-300'
                                } focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all`}
                        />
                        {errors.action_name && (
                            <p className="mt-1 text-sm text-red-600">{errors.action_name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Action Description
                        </label>
                        <textarea
                            value={formData.action_description}
                            onChange={(e) => updateFormData('action_description', e.target.value)}
                            placeholder="Describe what happens when this action is performed..."
                            rows={3}
                            className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            <Users className="w-4 h-4 inline mr-1" />
                            Allowed Roles <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                            {roles.map(role => (
                                <button
                                    key={role.id}
                                    type="button"
                                    onClick={() => toggleRole(role.id)}
                                    className={`px-3 md:px-4 py-2 md:py-3 rounded-lg border-2 transition-all ${formData.allowed_roles.includes(role.id)
                                        ? `${role.color} border-current`
                                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-xs md:text-sm">{role.name}</span>
                                        {formData.allowed_roles.includes(role.id) && (
                                            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-current flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white"></div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                        {errors.allowed_roles && (
                            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.allowed_roles}
                            </p>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                            Selected {formData.allowed_roles.length} role{formData.allowed_roles.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Requirements */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Requirements
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                            {[
                                {
                                    key: 'requires_assignment',
                                    icon: ClipboardCheck,
                                    title: 'Requires Assignment',
                                    description: 'User must be assigned to perform this action',
                                },
                                {
                                    key: 'requires_notes',
                                    icon: FileText,
                                    title: 'Requires Notes',
                                    description: 'User must provide notes for this action',
                                },
                                {
                                    key: 'requires_photos',
                                    icon: Camera,
                                    title: 'Requires Photos',
                                    description: 'User must upload photos for this action',
                                },
                            ].map(({ key, icon: Icon, title, description }) => (
                                <label
                                    key={key}
                                    className={`flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-lg border-2 cursor-pointer transition-all ${formData[key]
                                        ? 'border-primary bg-primary/5'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData[key]}
                                        onChange={(e) => updateFormData(key, e.target.checked)}
                                        className="mt-1 w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-4 h-4 md:w-5 md:h-5 text-gray-500 flex-shrink-0" />
                                            <span className="font-medium text-gray-900 text-xs md:text-sm truncate">{title}</span>
                                        </div>
                                        <p className="text-[10px] md:text-xs text-gray-600 mt-0.5 line-clamp-2">{description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => updateFormData('is_active', e.target.checked)}
                            className="w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                        />
                        <label htmlFor="is_active" className="flex-1 cursor-pointer min-w-0">
                            <div className="font-medium text-gray-900 text-xs md:text-sm">Active Transition</div>
                            <div className="text-[10px] md:text-xs text-gray-600 line-clamp-2">
                                {formData.is_active
                                    ? 'Available in job cards'
                                    : 'Disabled and hidden'}
                            </div>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 md:px-8 py-4 md:py-6 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                    <Button variant="ghost" onClick={onCancel} className="text-sm">
                        Cancel
                    </Button>

                    <Button
                        onClick={handleSubmit}
                        className="flex items-center gap-2 text-sm"
                    >
                        <GitBranch className="w-4 h-4" />
                        {mode === 'create' ? 'Create Transition' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TransitionForm;
