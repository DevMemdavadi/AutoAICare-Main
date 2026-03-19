import React, { useState, useEffect } from 'react';
import { Shield, Save, X, Check } from 'lucide-react';
import { Button, Card } from '@/components/ui';

const PermissionForm = ({ permission, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        ...permission
    });

    const permissionFields = [
        { key: 'can_view_all_jobs', label: 'View All Jobs', category: 'Visibility' },
        { key: 'can_view_branch_jobs', label: 'View Branch Jobs', category: 'Visibility' },
        { key: 'can_view_assigned_jobs', label: 'View Assigned Jobs', category: 'Visibility' },
        { key: 'can_create_jobcard', label: 'Create Job Cards', category: 'Creation' },
        { key: 'can_assign_staff', label: 'Assign Staff', category: 'Management' },
        { key: 'can_perform_qc', label: 'Perform QC', category: 'Quality' },
        { key: 'can_approve_qc', label: 'Approve QC', category: 'Quality' },
        { key: 'can_execute_work', label: 'Execute Work', category: 'Execution' },
        { key: 'can_perform_final_qc', label: 'Final QC', category: 'Quality' },
        { key: 'can_generate_invoice', label: 'Generate Invoice', category: 'Billing' },
        { key: 'can_deliver_vehicle', label: 'Deliver Vehicle', category: 'Delivery' },
        { key: 'can_close_job', label: 'Close Job', category: 'Completion' },
        { key: 'can_add_parts', label: 'Add Parts to Job', category: 'Inventory' },
        { key: 'can_manage_parts_inventory', label: 'Manage Parts Catalog', category: 'Inventory' },
    ];

    const roles = [
        { value: '', label: 'None' },
        { value: 'super_admin', label: 'Super Admin' },
        { value: 'company_admin', label: 'Company Admin' },
        { value: 'branch_admin', label: 'Branch Admin' },
        { value: 'floor_manager', label: 'Floor Manager' },
        { value: 'supervisor', label: 'Supervisor' },
        { value: 'applicator', label: 'Applicator' },
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const categories = [...new Set(permissionFields.map(f => f.category))];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 md:p-6 border-b flex items-center justify-between bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0">
                            <Shield className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                                Edit Role Permissions
                            </h3>
                            <p className="text-[10px] md:text-sm text-gray-500 truncate">
                                Configure capabilities for <span className="font-semibold text-primary">{formData.role?.replace('_', ' ')}</span>
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onCancel} className="flex-shrink-0">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Inherit Permissions From
                                <select
                                    value={formData.inherits_from || ''}
                                    onChange={(e) => setFormData({ ...formData, inherits_from: e.target.value })}
                                    className="mt-1 block w-full pl-3 pr-10 py-2.5 md:py-2 text-sm md:text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md outline-none transition-all"
                                >
                                    {roles.filter(r => r.value !== formData.role).map((role) => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <p className="text-[10px] md:text-xs text-gray-500">
                                This role will automatically have all permissions that the selected parent role has.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {categories.map(category => (
                            <div key={category} className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-b pb-2">
                                    {category}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {permissionFields.filter(f => f.category === category).map(field => (
                                        <label key={field.key} className="relative flex items-start cursor-pointer group">
                                            <div className="flex items-center h-5">
                                                <input
                                                    type="checkbox"
                                                    checked={formData[field.key] || false}
                                                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.checked })}
                                                    className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded transition"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary transition">
                                                    {field.label}
                                                </span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </form>

                <div className="p-4 md:p-6 border-t bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
                    <Button variant="outline" onClick={onCancel} className="text-sm">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} className="flex items-center gap-2 text-sm">
                        <Save className="w-4 h-4" />
                        Save Permissions
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default PermissionForm;
