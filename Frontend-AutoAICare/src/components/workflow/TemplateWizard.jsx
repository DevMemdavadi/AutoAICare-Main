import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Workflow, Settings, Eye } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

const TemplateWizard = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        branch: null,
        service_category: '',
        is_default: false,
        skip_customer_approval: false,
        skip_floor_manager_final_qc: false,
        require_supervisor_review: true,
        auto_assign_applicators: false,
    });
    const [errors, setErrors] = useState({});

    const totalSteps = 3;

    // Validate current step
    const validateStep = (currentStep) => {
        const newErrors = {};

        if (currentStep === 1) {
            if (!formData.name.trim()) {
                newErrors.name = 'Template name is required';
            }
            if (formData.name.length > 100) {
                newErrors.name = 'Template name must be less than 100 characters';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        setStep(step - 1);
        setErrors({});
    };

    const handleComplete = () => {
        if (validateStep(step)) {
            onComplete?.({
                ...formData,
                initialize_defaults: true, // Auto-initialize with default statuses
            });
        }
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

    // Step 1: Basic Information
    const renderStep1 = () => (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-3 mb-5 md:mb-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Workflow className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-gray-900">Basic Information</h3>
                        <p className="text-xs md:text-sm text-gray-500">Give your template a name and description</p>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="e.g., Standard Car Detailing Workflow"
                    className={`w-full px-4 py-3 rounded-lg border ${errors.name ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-2 focus:ring-primary focus:border-transparent`}
                />
                {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Describe when and how this workflow should be used..."
                    rows={3}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                    Help your team understand when to use this template
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Category
                </label>
                <select
                    value={formData.service_category}
                    onChange={(e) => updateFormData('service_category', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                    <option value="">All Services (Default)</option>
                    <option value="basic_wash">Basic Wash</option>
                    <option value="detailing">Detailing</option>
                    <option value="coating">Coating</option>
                    <option value="paint_protection">Paint Protection</option>
                    <option value="interior">Interior Cleaning</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                    Leave empty to use for all service types
                </p>
            </div>

            <div className="flex items-start gap-3 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => updateFormData('is_default', e.target.checked)}
                    className="mt-1 w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                />
                <label htmlFor="is_default" className="flex-1 cursor-pointer">
                    <div className="font-medium text-xs md:text-sm text-gray-900">Set as Default Template</div>
                    <div className="text-[10px] md:text-xs text-gray-600 mt-0.5">Use for all new job cards by default</div>
                </label>
            </div>
        </div>
    );

    // Step 2: Workflow Settings
    const renderStep2 = () => (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-3 mb-5 md:mb-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Settings className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-gray-900">Workflow Settings</h3>
                        <p className="text-xs md:text-sm text-gray-500">Configure how this workflow behaves</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {[
                    {
                        key: 'require_supervisor_review',
                        title: 'Supervisor Review',
                        description: 'Force jobs through supervisor review',
                        recommended: true,
                    },
                    {
                        key: 'skip_customer_approval',
                        title: 'Skip Customer Approval',
                        description: 'Skip the customer approval step',
                        recommended: false,
                    },
                    {
                        key: 'skip_floor_manager_final_qc',
                        title: 'Skip FM Final QC',
                        description: 'Skip the final quality check by FM',
                        recommended: false,
                    },
                    {
                        key: 'auto_assign_applicators',
                        title: 'Auto-Assign',
                        description: 'Assign available staff automatically',
                        recommended: false,
                    },
                ].map(({ key, title, description, recommended }) => (
                    <div
                        key={key}
                        className={`flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-lg border-2 ${formData[key]
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 bg-white'
                            }`}
                    >
                        <input
                            type="checkbox"
                            id={key}
                            checked={formData[key]}
                            onChange={(e) => updateFormData(key, e.target.checked)}
                            className="mt-1 w-4 h-4 md:w-5 md:h-5 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                        />
                        <label htmlFor={key} className="flex-1 cursor-pointer min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                                <div className="font-medium text-xs md:text-sm text-gray-900">{title}</div>
                                {recommended && (
                                    <Badge variant="success" size="sm" className="text-[10px] py-0 h-4">Recommended</Badge>
                                )}
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-600 mt-0.5 line-clamp-1">{description}</div>
                        </label>
                    </div>
                ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                    <strong>⚠️ Note:</strong> These settings affect the default workflow steps.
                    You can always customize individual transitions later.
                </p>
            </div>
        </div>
    );

    // Step 3: Review & Create
    const renderStep3 = () => (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-3 mb-5 md:mb-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Eye className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-gray-900">Review & Create</h3>
                        <p className="text-xs md:text-sm text-gray-500">Review before creating template</p>
                    </div>
                </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-4 md:p-6 space-y-5 md:space-y-6">
                <div>
                    <h4 className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 md:mb-3">
                        Basic Information
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium text-gray-900 max-w-[150px] md:max-w-none truncate">{formData.name || '(Not set)'}</span>
                        </div>
                        <div className="flex justify-between text-xs md:text-sm">
                            <span className="text-gray-600">Category:</span>
                            <span className="font-medium text-gray-900">
                                {formData.service_category || 'All Services'}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs md:text-sm">
                            <span className="text-gray-600">Default:</span>
                            <span>
                                {formData.is_default ? (
                                    <Badge variant="success" size="sm" className="text-[10px]">Yes</Badge>
                                ) : (
                                    <Badge variant="secondary" size="sm" className="text-[10px]">No</Badge>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-5 md:pt-6">
                    <h4 className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 md:mb-3">
                        Workflow Settings
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                        {[
                            { key: 'require_supervisor_review', label: 'Supervisor Review' },
                            { key: 'skip_customer_approval', label: 'Skip Customer Approval' },
                            { key: 'skip_floor_manager_final_qc', label: 'Skip FM Final QC' },
                            { key: 'auto_assign_applicators', label: 'Auto-Assign staff' },
                        ].map(({ key, label }) => (
                            <div
                                key={key}
                                className={`px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg ${formData[key]
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-500'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    {formData[key] ? (
                                        <Check className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                                    ) : (
                                        <div className="w-3.5 h-3.5 md:w-4 md:h-4"></div>
                                    )}
                                    <span className="text-[10px] md:text-xs font-medium truncate">{label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                    <strong>✓ Ready to create!</strong> The template will be initialized with default workflow statuses and transitions.
                    You can customize them after creation.
                </p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-5 md:px-8 py-4 md:py-6 border-b border-gray-200">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Create Template</h2>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">
                        Step {step} of {totalSteps}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-4 flex gap-2">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`h-2 flex-1 rounded-full transition-all ${s <= step ? 'bg-primary' : 'bg-gray-200'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 md:px-8 py-4 md:py-6">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>

                {/* Footer */}
                <div className="px-5 md:px-8 py-4 md:py-6 border-t border-gray-200 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="text-xs md:text-sm"
                    >
                        Cancel
                    </Button>

                    <div className="flex items-center gap-2 md:gap-3">
                        {step > 1 && (
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm h-9 md:h-10"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </Button>
                        )}

                        {step < totalSteps ? (
                            <Button
                                onClick={handleNext}
                                className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm h-9 md:h-10"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleComplete}
                                className="flex items-center gap-1.5 md:gap-2 bg-green-600 hover:bg-green-700 text-xs md:text-sm h-9 md:h-10"
                            >
                                <Check className="w-4 h-4" />
                                Create
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TemplateWizard;
