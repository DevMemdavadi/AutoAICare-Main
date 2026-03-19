from rest_framework import permissions


class IsBranchUser(permissions.BasePermission):
    """
    Permission to check if user belongs to the same branch as the object.
    Super admins can access all branches.
    """
    
    def has_permission(self, request, view):
        """Allow authenticated users."""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Check if user belongs to same branch or is super admin."""
        # Super admin can access everything
        if request.user.role == 'super_admin':
            return True

        # Company admin can access objects belonging to their company
        if request.user.role == 'company_admin' and request.user.company:
            if hasattr(obj, 'branch') and obj.branch:
                return obj.branch.company_id == request.user.company.id
            if hasattr(obj, 'company'):
                return obj.company_id == request.user.company.id

        # Check if object has branch attribute
        if hasattr(obj, 'branch'):
            return obj.branch == request.user.branch

        return False


class IsBranchStaff(permissions.BasePermission):
    """
    Permission for staff users (admin/staff) with branch checking.
    """
    
    def has_permission(self, request, view):
        """Check if user is staff and authenticated."""
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['super_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator']
        )
    
    def has_object_permission(self, request, view, obj):
        """Check if staff belongs to same branch."""
        if request.user.role == 'super_admin':
            return True

        # Company admin can access objects belonging to their company
        if request.user.role == 'company_admin' and request.user.company:
            if hasattr(obj, 'branch') and obj.branch:
                return obj.branch.company_id == request.user.company.id
            if hasattr(obj, 'company'):
                return obj.company_id == request.user.company.id

        if hasattr(obj, 'branch'):
            return obj.branch == request.user.branch

        return False


class IsBranchAdmin(permissions.BasePermission):
    """
    Permission for admin users with branch checking.
    """
    
    def has_permission(self, request, view):
        """Check if user is admin."""
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['super_admin', 'branch_admin']
        )
    
    def has_object_permission(self, request, view, obj):
        """Check if admin belongs to same branch."""
        if request.user.role == 'super_admin':
            return True

        # Company admin can access objects belonging to their company
        if request.user.role == 'company_admin' and request.user.company:
            if hasattr(obj, 'branch') and obj.branch:
                return obj.branch.company_id == request.user.company.id
            if hasattr(obj, 'company'):
                return obj.company_id == request.user.company.id

        if hasattr(obj, 'branch'):
            return obj.branch == request.user.branch

        return False
