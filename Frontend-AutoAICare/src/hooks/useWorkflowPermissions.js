import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to fetch and manage workflow-based permissions for the current user
 * Permissions are configurable per role in the workflow configuration
 */
export const useWorkflowPermissions = () => {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchPermissions();
    }, [user?.id]);

    const fetchPermissions = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            // Fetch user's effective permissions from workflow configuration
            const response = await api.get('/workflow/templates/user_permissions/');
            setPermissions(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching workflow permissions:', err);

            // Fallback to safe defaults based on role
            const roleDefaults = {
                super_admin: {
                    can_view_all_jobs: true,
                    can_view_branch_jobs: true,
                    can_view_assigned_jobs: true,
                    can_create_jobcard: true,
                    can_assign_staff: true,
                    can_perform_qc: true,
                    can_approve_qc: true,
                    can_execute_work: true,
                    can_perform_final_qc: true,
                    can_generate_invoice: true,
                    can_deliver_vehicle: true,
                    can_close_job: true,
                    can_add_parts: true,
                    can_manage_parts_inventory: true,
                },
                branch_admin: {
                    can_view_all_jobs: false,
                    can_view_branch_jobs: true,
                    can_view_assigned_jobs: true,
                    can_create_jobcard: true,
                    can_assign_staff: true,
                    can_perform_qc: false,
                    can_approve_qc: false,
                    can_execute_work: false,
                    can_perform_final_qc: false,
                    can_generate_invoice: true,
                    can_deliver_vehicle: true,
                    can_close_job: true,
                    can_add_parts: true,
                    can_manage_parts_inventory: true,
                },
                floor_manager: {
                    can_view_all_jobs: false,
                    can_view_branch_jobs: true,
                    can_view_assigned_jobs: true,
                    can_create_jobcard: false,
                    can_assign_staff: false,
                    can_perform_qc: true,
                    can_approve_qc: true,
                    can_execute_work: false,
                    can_perform_final_qc: false,
                    can_generate_invoice: true,
                    can_deliver_vehicle: true,
                    can_close_job: false,
                    can_add_parts: true, // Default: floor managers CAN add parts to jobs
                    can_manage_parts_inventory: false, // Default: floor managers CANNOT manage catalog
                },
                supervisor: {
                    can_view_all_jobs: false,
                    can_view_branch_jobs: true,
                    can_view_assigned_jobs: true,
                    can_create_jobcard: false,
                    can_assign_staff: true,
                    can_perform_qc: false,
                    can_approve_qc: true,
                    can_execute_work: true,
                    can_perform_final_qc: true,
                    can_generate_invoice: false,
                    can_deliver_vehicle: false,
                    can_close_job: false,
                    can_add_parts: true,
                    can_manage_parts_inventory: false,
                },
                applicator: {
                    can_view_all_jobs: false,
                    can_view_branch_jobs: false,
                    can_view_assigned_jobs: true,
                    can_create_jobcard: false,
                    can_assign_staff: false,
                    can_perform_qc: false,
                    can_approve_qc: false,
                    can_execute_work: true,
                    can_perform_final_qc: false,
                    can_generate_invoice: false,
                    can_deliver_vehicle: false,
                    can_close_job: false,
                    can_add_parts: true,
                    can_manage_parts_inventory: false,
                },
                customer: {
                    can_view_all_jobs: false,
                    can_view_branch_jobs: false,
                    can_view_assigned_jobs: true,
                    can_create_jobcard: false,
                    can_assign_staff: false,
                    can_perform_qc: false,
                    can_approve_qc: false,
                    can_execute_work: false,
                    can_perform_final_qc: false,
                    can_generate_invoice: false,
                    can_deliver_vehicle: false,
                    can_close_job: false,
                    can_add_parts: false,
                    can_manage_parts_inventory: false,
                },
            };

            setPermissions(roleDefaults[user.role] || roleDefaults.customer);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Check if user has a specific permission
     * @param {string} permission - Permission name (e.g., 'can_add_parts')
     * @returns {boolean}
     */
    const hasPermission = (permission) => {
        if (!permissions) return false;
        return permissions[permission] === true;
    };

    return {
        permissions,
        loading,
        error,
        hasPermission,
        refetch: fetchPermissions,
    };
};

export default useWorkflowPermissions;
