import { useState, useMemo } from 'react';
import { Check, X, Filter, Users, GitBranch, Grid3x3 } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

const PermissionMatrix = ({ template, onPermissionChange, readonly = false }) => {
    const [filterRole, setFilterRole] = useState('all');
    const [filterTransition, setFilterTransition] = useState('');
    const [bulkEditMode, setBulkEditMode] = useState(false);
    const [selectedCells, setSelectedCells] = useState(new Set());

    // Role definitions with colors
    const roles = [
        { id: 'super_admin', name: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
        { id: 'company_admin', name: 'Company Admin', color: 'bg-indigo-100 text-indigo-800' },
        { id: 'branch_admin', name: 'Branch Admin', color: 'bg-blue-100 text-blue-800' },
        { id: 'floor_manager', name: 'Floor Manager', color: 'bg-green-100 text-green-800' },
        { id: 'supervisor', name: 'Supervisor', color: 'bg-yellow-100 text-yellow-800' },
        { id: 'applicator', name: 'Applicator', color: 'bg-orange-100 text-orange-800' },
        { id: 'customer', name: 'Customer', color: 'bg-gray-100 text-gray-800' },
    ];

    // Filter transitions
    const filteredTransitions = useMemo(() => {
        if (!template?.transitions) return [];

        return template.transitions
            .filter(t => t.is_active)
            .filter(t => {
                if (!filterTransition) return true;
                return t.action_name.toLowerCase().includes(filterTransition.toLowerCase()) ||
                    t.from_status.toLowerCase().includes(filterTransition.toLowerCase()) ||
                    t.to_status.toLowerCase().includes(filterTransition.toLowerCase());
            });
    }, [template?.transitions, filterTransition]);

    // Filter roles
    const filteredRoles = useMemo(() => {
        if (filterRole === 'all') return roles;
        return roles.filter(r => r.id === filterRole);
    }, [filterRole]);

    // Check if a role has permission for a transition
    const hasPermission = (transitionId, roleId) => {
        const transition = template?.transitions?.find(t => t.id === transitionId);
        return transition?.allowed_roles?.includes(roleId) || false;
    };

    // Toggle permission
    const togglePermission = async (transitionId, roleId) => {
        if (readonly) return;

        const transition = template?.transitions?.find(t => t.id === transitionId);
        if (!transition) return;

        const currentRoles = transition.allowed_roles || [];
        const hasRole = currentRoles.includes(roleId);

        const updatedRoles = hasRole
            ? currentRoles.filter(r => r !== roleId)
            : [...currentRoles, roleId];

        const roleName = roles.find(r => r.id === roleId)?.name || roleId;
        const action = hasRole ? 'revoked' : 'granted';

        await onPermissionChange?.(transitionId, { allowed_roles: updatedRoles }, { roleName, action, transitionName: transition.action_name });
    };

    // Bulk edit handlers
    const toggleCellSelection = (transitionId, roleId) => {
        if (!bulkEditMode) return;

        const cellKey = `${transitionId}-${roleId}`;
        const newSelection = new Set(selectedCells);

        if (newSelection.has(cellKey)) {
            newSelection.delete(cellKey);
        } else {
            newSelection.add(cellKey);
        }

        setSelectedCells(newSelection);
    };

    const applyBulkChange = async (enable) => {
        if (!bulkEditMode || selectedCells.size === 0) return;

        for (const cellKey of selectedCells) {
            const [transitionId, roleId] = cellKey.split('-');
            const transition = template?.transitions?.find(t => t.id === parseInt(transitionId));
            if (!transition) continue;

            const currentRoles = transition.allowed_roles || [];
            const hasRole = currentRoles.includes(roleId);

            if (enable && !hasRole) {
                await onPermissionChange?.(parseInt(transitionId), {
                    allowed_roles: [...currentRoles, roleId]
                }, { roleName: roles.find(r => r.id === roleId)?.name || roleId, action: 'granted', transitionName: transition.action_name });
            } else if (!enable && hasRole) {
                await onPermissionChange?.(parseInt(transitionId), {
                    allowed_roles: currentRoles.filter(r => r !== roleId)
                }, { roleName: roles.find(r => r.id === roleId)?.name || roleId, action: 'revoked', transitionName: transition.action_name });
            }
        }

        setSelectedCells(new Set());
        setBulkEditMode(false);
    };

    // Calculate statistics
    const stats = useMemo(() => {
        if (!template?.transitions) return { total: 0, configured: 0, empty: 0 };

        const total = template.transitions.filter(t => t.is_active).length;
        const configured = template.transitions.filter(t =>
            t.is_active && t.allowed_roles && t.allowed_roles.length > 0
        ).length;
        const empty = total - configured;

        return { total, configured, empty };
    }, [template?.transitions]);

    if (!template) {
        return (
            <div className="flex items-center justify-center h-96 text-gray-400">
                <div className="text-center">
                    <Grid3x3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a workflow template to view permissions</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with Stats and Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="min-w-0">
                        <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2 truncate">
                            <Grid3x3 className="w-5 h-5 text-primary flex-shrink-0" />
                            Permission Matrix
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500 mt-0.5 truncate">
                            {stats.total} transitions • {stats.configured} configured • {stats.empty} empty
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {bulkEditMode && (
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <Badge variant="secondary" className="mr-auto sm:mr-2">
                                {selectedCells.size} selected
                            </Badge>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyBulkChange(true)}
                                    disabled={selectedCells.size === 0}
                                    className="h-8 text-xs"
                                >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    Grant
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyBulkChange(false)}
                                    disabled={selectedCells.size === 0}
                                    className="h-8 text-xs"
                                >
                                    <X className="w-3.5 h-3.5 mr-1" />
                                    Revoke
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setBulkEditMode(false);
                                        setSelectedCells(new Set());
                                    }}
                                    className="h-8 text-xs"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                    {!bulkEditMode && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBulkEditMode(true)}
                            disabled={readonly}
                            className="h-8 text-xs"
                        >
                            Bulk Edit
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        <Users className="w-3.5 h-3.5 inline mr-1" />
                        Filter by Role
                    </label>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="w-full px-3 py-1.5 md:py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    >
                        <option value="all">All Roles</option>
                        {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        <GitBranch className="w-3.5 h-3.5 inline mr-1" />
                        Filter by Transition
                    </label>
                    <input
                        type="text"
                        value={filterTransition}
                        onChange={(e) => setFilterTransition(e.target.value)}
                        placeholder="Search transitions..."
                        className="w-full px-3 py-1.5 md:py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

            {/* Permission Matrix Table */}
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r-2 border-gray-200">
                                    Transition
                                </th>
                                {filteredRoles.map(role => (
                                    <th
                                        key={role.id}
                                        className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider"
                                    >
                                        <div className={`inline-block px-2 py-1 rounded ${role.color}`}>
                                            {role.name}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTransitions.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={filteredRoles.length + 1}
                                        className="px-4 py-8 text-center text-gray-500"
                                    >
                                        No transitions found
                                    </td>
                                </tr>
                            ) : (
                                filteredTransitions.map((transition) => (
                                    <tr key={transition.id} className="hover:bg-gray-50">
                                        <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r-2 border-gray-200">
                                            <div className="text-sm font-medium text-gray-900">
                                                {transition.action_name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {transition.from_status} → {transition.to_status}
                                            </div>
                                        </td>
                                        {filteredRoles.map(role => {
                                            const hasAccess = hasPermission(transition.id, role.id);
                                            const cellKey = `${transition.id}-${role.id}`;
                                            const isSelected = selectedCells.has(cellKey);

                                            return (
                                                <td
                                                    key={role.id}
                                                    className="px-4 py-3 text-center"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            if (bulkEditMode) {
                                                                toggleCellSelection(transition.id, role.id);
                                                            } else {
                                                                togglePermission(transition.id, role.id);
                                                            }
                                                        }}
                                                        disabled={readonly}
                                                        className={`w-10 h-10 rounded-lg transition-all duration-200 ${isSelected
                                                            ? 'ring-2 ring-primary ring-offset-2'
                                                            : ''
                                                            } ${hasAccess
                                                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                                                : 'bg-gray-200 hover:bg-gray-300 text-gray-400'
                                                            } ${readonly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                                            }`}
                                                    >
                                                        {hasAccess ? (
                                                            <Check className="w-5 h-5 mx-auto" />
                                                        ) : (
                                                            <X className="w-5 h-5 mx-auto" />
                                                        )}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PermissionMatrix;
