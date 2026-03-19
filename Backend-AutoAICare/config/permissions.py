from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """Permission check for super admin only."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'super_admin'


class IsAdmin(permissions.BasePermission):
    """Permission check for branch admin and super admin."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['super_admin', 'company_admin', 'branch_admin']


class IsStaff(permissions.BasePermission):
    """Permission check for supervisor, floor manager, branch admin, and super admin."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator']


class IsCustomer(permissions.BasePermission):
    """Permission check for customers only."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'customer'


class IsFloorManager(permissions.BasePermission):
    """Permission check for floor manager, branch admin, and super admin."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager']


class IsSupervisor(permissions.BasePermission):
    """Permission check for supervisor, floor manager, branch admin, and super admin."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['super_admin', 'company_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator']


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permission check for owner of object or admin."""
    
    def has_object_permission(self, request, view, obj):
        # Allow branch admin and super admin
        if request.user.role in ['super_admin', 'company_admin', 'branch_admin']:
            return True
        
        # Check if user is the owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'customer'):
            return obj.customer.user == request.user
        
        return False


class ReadOnlyOrAdmin(permissions.BasePermission):
    """Read-only for anyone, write for admin."""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.role in ['super_admin', 'company_admin', 'branch_admin']
