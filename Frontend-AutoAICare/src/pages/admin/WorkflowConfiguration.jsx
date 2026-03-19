import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    Camera,
    Check,
    ChevronDown,
    ChevronRight,
    Copy,
    Edit,
    FileText,
    GitBranch,
    Layers,
    Plus,
    Save,
    Settings,
    Trash2,
    Users,
    Workflow,
    X
} from 'lucide-react';
import { Card, Button, Badge, Alert } from '@/components/ui';
import api from '@/utils/api';
import WorkflowDiagram from '@/components/workflow/WorkflowDiagram';
import PermissionMatrix from '@/components/workflow/PermissionMatrix';
import TemplateWizard from '@/components/workflow/TemplateWizard';
import TransitionForm from '@/components/workflow/TransitionForm';
import PermissionForm from '@/components/workflow/PermissionForm';
import { useBranch } from '@/contexts/BranchContext';


const WorkflowConfiguration = () => {
    const { getCurrentBranchId, getCurrentBranchName } = useBranch();
    const location = useLocation();
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [danger, setDanger] = useState(null);
    const [warning, setWarning] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [editingTransition, setEditingTransition] = useState(null);
    const [editingPermission, setEditingPermission] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateTransitionModal, setShowCreateTransitionModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const [newTransition, setNewTransition] = useState({
        from_status: '',
        to_status: '',
        action_name: '',
        action_description: '',
        allowed_roles: [],
        requires_assignment: true,
        requires_notes: false,
        requires_photos: false,
        is_active: true
    });
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        description: '',
        branch: getCurrentBranchId() || null,
        service_category: '',
        is_default: false,
        skip_customer_approval: false,
        skip_floor_manager_final_qc: false,
        require_supervisor_review: true,
        auto_assign_applicators: false
    });

    const fetchTemplates = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (getCurrentBranchId()) params.branch = getCurrentBranchId();

            const response = await api.get('/workflow/templates/', { params });
            // Handle both paginated and array responses
            const data = response.data?.results || response.data || [];
            const templateList = Array.isArray(data) ? data : [];
            setTemplates(templateList);
            // reset selected template if current selection is not in the new list
            if (selectedTemplate && !templateList.find(t => t.id === selectedTemplate.id)) {
                setSelectedTemplate(null);
            }
        } catch (err) {
            setError('Failed to load workflow templates');
            console.error(err);
            setTemplates([]); // Ensure templates is always an array
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [getCurrentBranchId()]);

    // Auto-clear success, danger and error messages after 3 seconds
    useEffect(() => {
        if (success || danger || error) {
            const timer = setTimeout(() => {
                setSuccess(null);
                setDanger(null);
                setError(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [success, danger, error]);

    // Restore previously selected template from localStorage after templates are loaded
    // OR auto-select the first template if no saved selection exists
    useEffect(() => {
        if (templates.length > 0 && !selectedTemplate) {
            const savedTemplateId = localStorage.getItem('selectedWorkflowTemplateId');
            if (savedTemplateId) {
                // Restore saved template
                const savedTemplate = templates.find(t => t.id === parseInt(savedTemplateId));
                if (savedTemplate) {
                    fetchTemplateDetails(parseInt(savedTemplateId));
                } else {
                    // Saved template not found, select first template
                    fetchTemplateDetails(templates[0].id);
                }
            } else {
                // No saved template, auto-select the first template
                fetchTemplateDetails(templates[0].id);
            }
        }
    }, [templates]);

    // Handle navigation from WorkflowManagement with location state
    useEffect(() => {
        if (location.state?.templateId && templates.length > 0) {
            fetchTemplateDetails(location.state.templateId);

            // Set tab if specified
            if (location.state.tab) {
                setActiveTab(location.state.tab);
            }

            // Clear location state to prevent reloading on every render
            window.history.replaceState({}, document.title);
        }
    }, [location.state, templates]);


    const fetchTemplateDetails = async (templateId) => {
        try {
            const response = await api.get(`/workflow/templates/${templateId}/`);
            setSelectedTemplate(response.data);
            // Save selected template ID to localStorage for persistence
            localStorage.setItem('selectedWorkflowTemplateId', templateId.toString());
        } catch (err) {
            setError('Failed to load template details');
        }
    };

    const handleCreateTemplate = async () => {
        try {
            const data = {
                ...newTemplate,
                branch: newTemplate.branch || getCurrentBranchId() || null,
                initialize_defaults: true
            };
            const response = await api.post('/workflow/templates/', data);
            setTemplates([...templates, response.data]);
            setShowCreateModal(false);
            setNewTemplate({
                name: '',
                description: '',
                branch: getCurrentBranchId() || null,
                service_category: '',
                is_default: false,
                skip_customer_approval: false,
                skip_floor_manager_final_qc: false,
                require_supervisor_review: true,
                auto_assign_applicators: false
            });
            setSuccess('Template created successfully!');
            fetchTemplateDetails(response.data.id);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create template');
        }
    };

    const handleDuplicateTemplate = async (template) => {
        try {
            const response = await api.post(`/workflow/templates/${template.id}/duplicate/`, {
                name: `${template.name} (Copy)`
            });
            setTemplates([...templates, response.data.template]);
            setSuccess('Template duplicated successfully!');
        } catch (err) {
            setError('Failed to duplicate template');
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await api.delete(`/workflow/templates/${templateId}/`);
            setTemplates(templates.filter(t => t.id !== templateId));
            if (selectedTemplate?.id === templateId) {
                setSelectedTemplate(templates.length > 1 ? templates[0] : null);
            }
            setSuccess('Template deleted successfully!');
        } catch (err) {
            setError('Failed to delete template');
        }
    };

    const handleUpdateTemplate = async (updates) => {
        try {
            const response = await api.patch(
                `/workflow/templates/${selectedTemplate.id}/`,
                updates
            );
            setSelectedTemplate({ ...selectedTemplate, ...response.data });
            setTemplates(templates.map(t =>
                t.id === selectedTemplate.id ? { ...t, ...response.data } : t
            ));
            setSuccess('Template updated successfully!');
        } catch (err) {
            setError('Failed to update template');
        }
    };

    const handleUpdateTransition = async (transitionId, updates) => {
        try {
            await api.patch(`/workflow/transitions/${transitionId}/`, updates);
            fetchTemplateDetails(selectedTemplate.id);
            setEditingTransition(null);
            setSuccess('Transition updated successfully!');
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update transition';
            const details = err.response?.data?.details;

            if (details && details.length > 0) {
                setError(`${errorMsg}: ${details.join(', ')}`);
            } else {
                setError(errorMsg);
            }
        }
    };

    const handleCreateTransition = async () => {
        try {
            const response = await api.post(`/workflow/templates/${selectedTemplate.id}/transitions/`, {
                ...newTransition,
                template: selectedTemplate.id
            });

            // Show warnings if any
            if (response.data.warnings && response.data.warnings.length > 0) {
                setWarning(response.data.warnings.join(', '));
            }

            fetchTemplateDetails(selectedTemplate.id);
            setShowCreateTransitionModal(false);
            setNewTransition({
                from_status: '',
                to_status: '',
                action_name: '',
                action_description: '',
                allowed_roles: [],
                requires_assignment: true,
                requires_notes: false,
                requires_photos: false,
                is_active: true
            });
            setSuccess('Transition created successfully!');
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to create transition';
            const details = err.response?.data?.details;

            if (details && details.length > 0) {
                setError(`${errorMsg}: ${details.join(', ')}`);
            } else {
                setError(errorMsg);
            }
        }
    };

    const handleDeleteTransition = async (transitionId) => {
        if (!confirm('Are you sure you want to delete this transition? This action cannot be undone.')) return;

        try {
            await api.delete(`/workflow/transitions/${transitionId}/`);
            fetchTemplateDetails(selectedTemplate.id);
            setSuccess('Transition deleted successfully!');
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Failed to delete transition';
            const details = err.response?.data?.details;

            if (details && details.length > 0) {
                setError(`${errorMsg}: ${details.join(', ')}`);
            } else {
                setError(errorMsg);
            }
        }
    };

    const handleUpdatePermission = async (permissionId, updates) => {
        try {
            await api.patch(`/workflow/permissions/${permissionId}/`, updates);
            fetchTemplateDetails(selectedTemplate.id);
            setEditingPermission(null);
            setSuccess('Permission updated successfully!');
        } catch (err) {
            setError('Failed to update permission');
        }
    };

    const handleValidateWorkflow = async () => {
        try {
            const response = await api.post(`/workflow/templates/${selectedTemplate.id}/validate_workflow/`);
            setValidationResult(response.data);

            if (response.data.is_valid) {
                setSuccess('Workflow is valid!');
            } else {
                setWarning('Workflow has validation errors');
            }
        } catch (err) {
            setError('Failed to validate workflow');
        }
    };

    const handleResetToDefault = async () => {
        try {
            await api.post(`/workflow/templates/${selectedTemplate.id}/reset_to_default/`);
            fetchTemplateDetails(selectedTemplate.id);
            setShowResetConfirm(false);
            setSuccess('Template reset to default successfully!');
        } catch (err) {
            setError('Failed to reset template');
        }
    };

    const handleToggleTransition = async (transitionId, isActive) => {
        try {
            const response = await api.patch(`/workflow/transitions/${transitionId}/`, {
                is_active: isActive
            });

            // Show warnings if any
            if (response.data.warnings && response.data.warnings.length > 0) {
                setWarning(response.data.warnings.join(', '));
            }

            fetchTemplateDetails(selectedTemplate.id);
            setSuccess(`Transition ${isActive ? 'enabled' : 'disabled'} successfully!`);

            // Auto-validate after toggle
            await handleValidateWorkflow();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to toggle transition';
            const details = err.response?.data?.details;

            if (details && details.length > 0) {
                setError(`${errorMsg}: ${details.join(', ')}`);
            } else {
                setError(errorMsg);
            }
            // Revert the change
            fetchTemplateDetails(selectedTemplate.id);
        }
    };

    const handlePreviewWorkflow = () => {
        setShowPreviewModal(true);
    };


    const roleColors = {
        company_admin: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
        super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        branch_admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        floor_manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        supervisor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        applicator: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        customer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };

    const statusTypeColors = {
        initial: 'bg-slate-500',
        qc: 'bg-cyan-500',
        approval: 'bg-emerald-500',
        work: 'bg-blue-500',
        final_qc: 'bg-purple-500',
        customer: 'bg-pink-500',
        billing: 'bg-amber-500',
        delivery: 'bg-teal-500',
        terminal: 'bg-gray-500'
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-7 bg-gray-200 rounded w-60" />
                        <div className="h-4 bg-gray-200 rounded w-96" />
                    </div>
                    <div className="h-9 bg-gray-200 rounded-lg w-36" />
                </div>
                {/* 2-column panel */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Template sidebar */}
                    <div className="col-span-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="p-3 rounded-lg bg-gray-50 space-y-2">
                                    <div className="flex justify-between">
                                        <div className="h-3.5 bg-gray-200 rounded w-32" />
                                        <div className="h-4 bg-gray-200 rounded-full w-14" />
                                    </div>
                                    <div className="h-2.5 bg-gray-200 rounded w-20" />
                                    <div className="flex gap-3">
                                        <div className="h-2.5 bg-gray-200 rounded w-16" />
                                        <div className="h-2.5 bg-gray-200 rounded w-20" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Detail panel */}
                    <div className="col-span-8">
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {/* Panel header */}
                            <div className="p-4 border-b bg-gray-50 flex items-start justify-between">
                                <div className="space-y-2">
                                    <div className="h-5 bg-gray-200 rounded w-48" />
                                    <div className="h-3.5 bg-gray-200 rounded w-64" />
                                </div>
                                <div className="flex gap-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="h-8 w-8 bg-gray-200 rounded-lg" />
                                    ))}
                                </div>
                            </div>
                            {/* Tab bar */}
                            <div className="flex border-b px-4">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-3.5 bg-gray-200 rounded w-16 my-3 mr-6" />
                                ))}
                            </div>
                            {/* Content area */}
                            <div className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="h-10 bg-gray-100 rounded-lg" />
                                    ))}
                                </div>
                                <div className="h-4 bg-gray-200 rounded w-32 mt-2" />
                                <div className="flex flex-wrap gap-2">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="h-7 bg-gray-200 rounded-full w-24" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Workflow className="w-6 h-6 md:w-7 md:h-7 text-primary flex-shrink-0" />
                        Workflow Configuration
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Configure dynamic workflow templates for different service types and branches
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    <Plus className="w-4 h-4" />
                    New Template
                </Button>
            </div>

            {/* Alerts */}
            {error && (
                <Alert type="error" message={error} onClose={() => setError(null)} />
            )}
            {success && (
                <Alert type="success" message={success} onClose={() => setSuccess(null)} />
            )}
            {danger && (
                <Alert type="danger" title="Revoke" message={danger} onClose={() => setDanger(null)} />
            )}
            {warning && (
                <Alert type="warning" message={warning} onClose={() => setWarning(null)} />
            )}

            {/* Validation Result */}
            {validationResult && !validationResult.is_valid && (
                <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-start gap-3">
                        <X className="w-5 h-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                                Workflow Validation Errors
                            </h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-300">
                                {validationResult.errors.map((err, idx) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}

            {validationResult && validationResult.warnings && validationResult.warnings.length > 0 && (
                <Card className="p-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-yellow-900 dark:text-yellow-200">
                                    Workflow Warnings ({validationResult.warnings.length})
                                </h4>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setValidationResult(null)}
                                    className="text-yellow-700 hover:text-yellow-900"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Categorize warnings */}
                            {(() => {
                                const circularWarnings = validationResult.warnings.filter(w => w.includes('Short loop:'));
                                const unusedWarnings = validationResult.warnings.filter(w => w.includes('Unused statuses:'));
                                const roleWarnings = validationResult.warnings.filter(w => w.includes('Single role dependency:'));
                                const otherWarnings = validationResult.warnings.filter(w =>
                                    !w.includes('Short loop:') && !w.includes('Unused statuses:') && !w.includes('Single role dependency:')
                                );

                                return (
                                    <div className="space-y-3">
                                        {/* Circular Loop Warnings */}
                                        {circularWarnings.length > 0 && (
                                            <div>
                                                <div className="flex items-start gap-2 mb-2">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                                                            🔄 Circular Paths Detected
                                                        </p>
                                                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                                                            These loops are often <strong>intentional</strong> for QC/revision workflows.
                                                            Only fix if they're mistakes.
                                                        </p>
                                                    </div>
                                                </div>
                                                <ul className="space-y-1 ml-4">
                                                    {circularWarnings.map((warn, idx) => (
                                                        <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-300">
                                                            <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 py-0.5 rounded text-xs">
                                                                {warn.replace('Short loop: ', '')}
                                                            </code>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs text-yellow-800 dark:text-yellow-300">
                                                    <strong>💡 Tip:</strong> These are normal for workflows with quality control and revisions.
                                                    If intentional, you can safely ignore these warnings.
                                                </div>
                                            </div>
                                        )}


                                        {/* Unused Status Warnings */}
                                        {unusedWarnings.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                                                    📋 Unused Statuses
                                                </p>
                                                <ul className="space-y-1 ml-4">
                                                    {unusedWarnings.map((warn, idx) => (
                                                        <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-300">
                                                            {warn}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs text-yellow-800 dark:text-yellow-300">
                                                    <strong>💡 Tip:</strong> These statuses exist but have no active transitions.
                                                    You can keep them for future use or delete them to clean up.
                                                </div>
                                            </div>
                                        )}

                                        {/* Single Role Dependency Warnings */}
                                        {roleWarnings.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                                                    👤 Single Role Dependencies (Potential Bottlenecks)
                                                </p>
                                                <ul className="space-y-1 ml-4">
                                                    {roleWarnings.map((warn, idx) => (
                                                        <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-300">
                                                            {warn}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs text-yellow-800 dark:text-yellow-300">
                                                    <strong>⚠️ Warning:</strong> These statuses can only be progressed by a single role.
                                                    Consider adding more roles to prevent bottlenecks or ensure that role is always available.
                                                </div>
                                            </div>
                                        )}

                                        {/* Other Warnings */}
                                        {otherWarnings.length > 0 && (
                                            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
                                                {otherWarnings.map((warn, idx) => (
                                                    <li key={idx}>{warn}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Template List */}
                <div className="col-span-1 md:col-span-4 order-2 md:order-1">
                    <Card className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Layers className="w-5 h-5" />
                            Templates
                        </h3>
                        <div className="space-y-2">
                            {templates.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Workflow className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">No workflow templates found</p>
                                    <p className="text-xs mt-1">Create a new template to get started</p>
                                </div>
                            ) : (
                                templates.map((template) => (
                                    <div
                                        key={template.id}
                                        onClick={() => fetchTemplateDetails(template.id)}
                                        className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedTemplate?.id === template.id
                                            ? 'bg-primary/10 border border-primary'
                                            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-medium text-gray-900 dark:text-white">
                                                    {template.name}
                                                </h4>
                                                {template.branch_name && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        Branch: {template.branch_name}
                                                    </span>
                                                )}
                                                {template.service_category && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                                        Category: {template.service_category}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                {template.is_default && (
                                                    <Badge variant="success" size="sm">Default</Badge>
                                                )}
                                                {!template.is_active && (
                                                    <Badge variant="secondary" size="sm">Inactive</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                            <span>{template.status_count || 0} statuses</span>
                                            <span>{template.transition_count || 0} transitions</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                {/* Template Details */}
                <div className="col-span-1 md:col-span-8 order-1 md:order-2">
                    {selectedTemplate ? (
                        <Card className="p-0 overflow-hidden">
                            {/* Template Header */}
                            <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                    <div className="min-w-0">
                                        <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white truncate">
                                            {selectedTemplate.name}
                                        </h2>
                                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {selectedTemplate.description || 'No description'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:justify-start lg:justify-end">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleValidateWorkflow}
                                            title="Validate workflow integrity"
                                            className="h-8 text-xs md:text-sm px-2 md:px-3"
                                        >
                                            <Check className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                            Validate
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePreviewWorkflow}
                                            title="Preview workflow"
                                            className="h-8 text-xs md:text-sm px-2 md:px-3"
                                        >
                                            <Workflow className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                            Preview
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDuplicateTemplate(selectedTemplate)}
                                            title="Duplicate template"
                                            className="h-8 px-2 md:px-3"
                                        >
                                            <Copy className="w-3 h-3 md:w-4 md:h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowResetConfirm(true)}
                                            title="Reset to default"
                                            className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2 md:px-3"
                                        >
                                            <Settings className="w-3 h-3 md:w-4 md:h-4" />
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                                            title="Delete template"
                                            className="h-8 px-2 md:px-3"
                                        >
                                            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b overflow-x-auto">
                                {['overview', 'statuses', 'transitions', 'permissions', 'diagram', 'matrix'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-3 text-sm font-medium capitalize transition-colors whitespace-nowrap ${activeTab === tab
                                            ? 'text-primary border-b-2 border-primary'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {tab === 'matrix' ? 'Permission Matrix' : tab}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="p-4">
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        {/* Workflow Settings */}
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                <Settings className="w-5 h-5" />
                                                Workflow Settings
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                                {[
                                                    { key: 'skip_customer_approval', label: 'Skip Customer Approval' },
                                                    { key: 'skip_floor_manager_final_qc', label: 'Skip FM Final QC' },
                                                    { key: 'require_supervisor_review', label: 'Require Supervisor Review' },
                                                    { key: 'auto_assign_applicators', label: 'Auto-Assign Applicators' }
                                                ].map(({ key, label }) => (
                                                    <label
                                                        key={key}
                                                        className="flex items-center gap-3 p-2.5 md:p-3 rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTemplate[key]}
                                                            onChange={(e) => handleUpdateTemplate({ [key]: e.target.checked })}
                                                            className="w-4 h-4 flex-shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Workflow Visualization */}
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                <GitBranch className="w-5 h-5" />
                                                Workflow Flow
                                            </h3>
                                            <div className="flex flex-wrap gap-2 items-center py-2 overflow-x-auto no-scrollbar">
                                                {selectedTemplate.statuses?.sort((a, b) => a.order - b.order).map((status, idx) => (
                                                    <div key={status.id} className="flex items-center gap-2 flex-shrink-0">
                                                        <div
                                                            className={`px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-medium text-white max-w-[120px] truncate ${statusTypeColors[status.status_type] || 'bg-gray-500'
                                                                }`}
                                                            title={status.display_name}
                                                        >
                                                            {status.display_name}
                                                        </div>
                                                        {idx < (selectedTemplate.statuses?.length || 0) - 1 && (
                                                            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'statuses' && (
                                    <div className="space-y-3">
                                        {selectedTemplate.statuses?.sort((a, b) => a.order - b.order).map((status) => (
                                            <div
                                                key={status.id}
                                                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-3 h-3 rounded-full ${statusTypeColors[status.status_type]}`}
                                                    />
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {status.display_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            Code: {status.status_code} | Type: {status.status_type}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {status.is_terminal && (
                                                        <Badge variant="secondary" size="sm">Terminal</Badge>
                                                    )}
                                                    <span className="text-xs text-gray-500">Order: {status.order}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'transitions' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-end mb-3">
                                            <Button
                                                onClick={() => setShowCreateTransitionModal(true)}
                                                className="flex items-center gap-2"
                                                size="sm"
                                            >
                                                <Plus className="w-4 h-4" />
                                                New Transition
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {selectedTemplate.transitions?.map((transition) => (
                                                <div
                                                    key={transition.id}
                                                    className="p-3 md:p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
                                                >
                                                    <div className="flex items-center justify-between mb-2 md:mb-3">
                                                        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                                                            <div className="px-1.5 md:px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] md:text-xs font-semibold text-gray-600 dark:text-gray-400 truncate">
                                                                {transition.from_status}
                                                            </div>
                                                            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                            <div className="px-1.5 md:px-2 py-0.5 rounded bg-primary/10 text-[10px] md:text-xs font-semibold text-primary truncate">
                                                                {transition.to_status}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={transition.is_active}
                                                                    onChange={(e) => handleToggleTransition(transition.id, e.target.checked)}
                                                                    className="w-3.5 h-3.5 md:w-4 md:h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                />
                                                                <span className="text-[10px] md:text-xs text-gray-500 hidden sm:inline">
                                                                    {transition.is_active ? 'Enabled' : 'Disabled'}
                                                                </span>
                                                            </label>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setEditingTransition(transition)}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteTransition(transition.id)}
                                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-900 dark:text-white font-semibold mb-1.5 md:mb-2 truncate">
                                                        {transition.action_name}
                                                    </p>
                                                    {transition.action_description && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 md:mb-3 line-clamp-2 italic">
                                                            {transition.action_description}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap gap-1 mb-2 md:mb-3">
                                                        {transition.allowed_roles?.map((role) => (
                                                            <span
                                                                key={role}
                                                                className={`px-1.5 py-0.5 rounded text-[10px] md:text-xs font-medium ${roleColors[role]}`}
                                                            >
                                                                {role.replace('_', ' ')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {(transition.requires_notes || transition.requires_photos || transition.requires_assignment) && (
                                                        <div className="flex flex-wrap gap-1.5 md:gap-2 text-[10px] md:text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
                                                            {transition.requires_assignment && (
                                                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded border border-blue-100 dark:border-blue-800">
                                                                    <Users className="w-3 h-3" />
                                                                    Assigned
                                                                </span>
                                                            )}
                                                            {transition.requires_notes && (
                                                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded border border-amber-100 dark:border-amber-800">
                                                                    <FileText className="w-3 h-3" />
                                                                    Notes
                                                                </span>
                                                            )}
                                                            {transition.requires_photos && (
                                                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 rounded border border-cyan-100 dark:border-cyan-800">
                                                                    <Camera className="w-3 h-3" />
                                                                    Photos
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'permissions' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {selectedTemplate.role_permissions?.map((perm) => (
                                            <div
                                                key={perm.id}
                                                className="p-3 md:p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                                            >
                                                <div className="flex items-center justify-between mb-3 md:mb-4">
                                                    <span className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-sm font-semibold ${roleColors[perm.role]}`}>
                                                        {perm.role.replace('_', ' ')}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setEditingPermission(perm)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {Object.entries(perm.effective_permissions || {}).map(([key, value]) => (
                                                        <div
                                                            key={key}
                                                            className={`flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs min-w-0 ${value ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400'
                                                                }`}
                                                        >
                                                            {value ? (
                                                                <Check className="w-3 h-3 flex-shrink-0" />
                                                            ) : (
                                                                <X className="w-3 h-3 flex-shrink-0" />
                                                            )}
                                                            <span className="truncate">{key.replace(/^can_/, '').replace(/_/g, ' ')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'diagram' && (
                                    <div className="h-[600px] border rounded-xl overflow-hidden shadow-inner bg-gray-50/50">
                                        <WorkflowDiagram
                                            template={selectedTemplate}
                                            onStatusClick={(status) => {
                                                console.log('Status clicked:', status);
                                            }}
                                            onTransitionClick={(transition) => {
                                                setEditingTransition(transition);
                                            }}
                                        />
                                    </div>
                                )}

                                {activeTab === 'matrix' && (
                                    <div className="min-h-[500px]">
                                        <PermissionMatrix
                                            template={selectedTemplate}
                                            onPermissionChange={async (transitionId, updates, info) => {
                                                try {
                                                    const response = await api.patch(`/workflow/transitions/${transitionId}/`, updates);

                                                    fetchTemplateDetails(selectedTemplate.id);

                                                    if (info) {
                                                        const { roleName, action } = info;
                                                        if (action === 'granted') {
                                                            setSuccess(`${roleName.replace(/\s+/g, '').toLowerCase()} get permission successfully`);
                                                        } else {
                                                            setDanger(`${roleName.replace(/\s+/g, '').toLowerCase()} revoke permission successfully`);
                                                        }
                                                    } else {
                                                        setSuccess('Permissions updated successfully!');
                                                    }
                                                } catch (err) {
                                                    const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update permissions';
                                                    const details = err.response?.data?.details;

                                                    if (details && details.length > 0) {
                                                        setError(`${errorMsg}: ${details.join(', ')}`);
                                                    } else {
                                                        setError(errorMsg);
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </Card>
                    ) : (
                        <Card className="p-8 text-center">
                            <Workflow className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-500">No template selected</h3>
                            <p className="text-gray-400 mt-1">Select a template from the list or create a new one</p>
                        </Card>
                    )}
                </div>
            </div>

            {/* Create Template Modal */}
            {showCreateModal && (
                <TemplateWizard
                    onComplete={handleCreateTemplate}
                    onCancel={() => setShowCreateModal(false)}
                />
            )}

            {/* Edit Transition Modal */}
            {editingTransition && (
                <TransitionForm
                    mode="edit"
                    transition={editingTransition}
                    statuses={selectedTemplate?.statuses}
                    onSave={async (formData) => {
                        await handleUpdateTransition(editingTransition.id, formData);
                    }}
                    onCancel={() => setEditingTransition(null)}
                />
            )}

            {/* Create Transition Modal */}
            {showCreateTransitionModal && (
                <TransitionForm
                    mode="create"
                    statuses={selectedTemplate?.statuses}
                    onSave={async (formData) => {
                        try {
                            const response = await api.post(`/workflow/templates/${selectedTemplate.id}/transitions/`, {
                                ...formData,
                                template: selectedTemplate.id
                            });

                            if (response.data.warnings && response.data.warnings.length > 0) {
                                setWarning(response.data.warnings.join(', '));
                            }

                            fetchTemplateDetails(selectedTemplate.id);
                            setShowCreateTransitionModal(false);
                            setSuccess('Transition created successfully!');
                        } catch (err) {
                            setError(err.response?.data?.error || 'Failed to create transition');
                        }
                    }}
                    onCancel={() => setShowCreateTransitionModal(false)}
                />
            )}

            {/* Edit Permission Modal */}
            {editingPermission && (
                <PermissionForm
                    permission={editingPermission}
                    onSave={async (formData) => {
                        await handleUpdatePermission(editingPermission.id, formData);
                    }}
                    onCancel={() => setEditingPermission(null)}
                />
            )}

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-start gap-3 mb-4">
                            <AlertCircle className="w-6 h-6 text-orange-600 mt-0.5" />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Reset to Default?
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    This will remove all custom transitions and restore the default workflow configuration.
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleResetToDefault}
                            >
                                Reset to Default
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Workflow Preview Modal */}
            {showPreviewModal && selectedTemplate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Workflow Preview: {selectedTemplate.name}
                            </h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowPreviewModal(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {/* Workflow Flow Visualization */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Workflow Flow</h4>
                                <div className="space-y-2">
                                    {selectedTemplate.statuses?.sort((a, b) => a.order - b.order).map((status, idx) => {
                                        const outgoingTransitions = selectedTemplate.transitions?.filter(
                                            t => t.from_status === status.status_code && t.is_active
                                        ) || [];

                                        return (
                                            <div key={status.id} className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {status.display_name}
                                                    </div>
                                                    {status.description && (
                                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                            {status.description}
                                                        </div>
                                                    )}
                                                    {outgoingTransitions.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {outgoingTransitions.map((transition) => (
                                                                <div key={transition.id} className="flex items-center gap-2 text-xs">
                                                                    <ArrowRight className="w-3 h-3 text-primary" />
                                                                    <span className="text-gray-700 dark:text-gray-300">
                                                                        {transition.action_name}
                                                                    </span>
                                                                    <span className="text-gray-500">→</span>
                                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                                        {transition.to_status}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Statistics */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {selectedTemplate.statuses?.length || 0}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Statuses</div>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {selectedTemplate.transitions?.filter(t => t.is_active).length || 0}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Active Transitions</div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-600">
                                        {selectedTemplate.transitions?.filter(t => !t.is_active).length || 0}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Disabled Transitions</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <Button onClick={() => setShowPreviewModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkflowConfiguration;
