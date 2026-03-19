from rest_framework import permissions


class IsBranchAdminOrSuperuser(permissions.BasePermission):
    """
    Permission to only allow branch admins to edit their branch data
    or superusers to edit any branch
    """
    
    def has_permission(self, request, view):
        # Allow read permissions for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Write permissions only for authenticated users
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Superusers can do anything
        if request.user.is_superuser:
            return True
        
        # Read permissions for authenticated users
        if request.method in permissions.SAFE_METHODS:
            # Users can only view data from their branch
            if hasattr(obj, 'branch'):
                return obj.branch == request.user.branch
            return True
        
        # Write permissions
        # Branch admins can edit their branch data
        if request.user.role == 'branch_admin':
            if hasattr(obj, 'branch'):
                return obj.branch == request.user.branch
            return False
        
        # Accountants can edit if assigned to the branch
        if request.user.role == 'accountant':
            if hasattr(obj, 'branch'):
                # Check if user has permission for this branch
                # This would require a ManyToMany relationship between User and Branch
                return obj.branch == request.user.branch
            return False
        
        return False


class CanViewBranchData(permissions.BasePermission):
    """
    Permission to view data from specific branches based on user role
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Superusers can view everything
        if request.user.is_superuser:
            return True
        
        # Users can only view their branch data
        if hasattr(obj, 'branch'):
            if request.user.branch:
                return obj.branch == request.user.branch
        
        # If no branch attribute, allow access
        return True


class CanEditBranchData(permissions.BasePermission):
    """
    Permission to edit data from specific branches based on user role
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Only certain roles can edit
        allowed_roles = ['branch_admin', 'accountant', 'manager']
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_superuser or request.user.role in allowed_roles)
        )
    
    def has_object_permission(self, request, view, obj):
        # Superusers can edit everything
        if request.user.is_superuser:
            return True
        
        # Read permissions
        if request.method in permissions.SAFE_METHODS:
            if hasattr(obj, 'branch'):
                return obj.branch == request.user.branch
            return True
        
        # Write permissions - must be from same branch
        if hasattr(obj, 'branch'):
            if obj.branch != request.user.branch:
                return False
        
        # Role-based permissions
        if request.user.role == 'branch_admin':
            return True
        elif request.user.role == 'accountant':
            # Accountants can edit financial data
            return True
        elif request.user.role == 'manager':
            # Managers can edit operational data
            return True
        
        return False


class CanApproveBranchTransactions(permissions.BasePermission):
    """
    Permission to approve transactions (expenses, transfers, etc.)
    """
    
    def has_permission(self, request, view):
        allowed_roles = ['branch_admin', 'accountant']
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_superuser or request.user.role in allowed_roles)
        )
    
    def has_object_permission(self, request, view, obj):
        # Superusers can approve anything
        if request.user.is_superuser:
            return True
        
        # Must be from same branch
        if hasattr(obj, 'branch'):
            if obj.branch != request.user.branch:
                return False
        
        # Branch admins can approve
        if request.user.role == 'branch_admin':
            return True
        
        # Accountants can approve
        if request.user.role == 'accountant':
            return True
        
        return False


class IsAccountantOrAbove(permissions.BasePermission):
    """
    Permission for accountants and above (branch_admin, superuser)
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        allowed_roles = ['accountant', 'branch_admin']
        return request.user.role in allowed_roles


class IsBranchAdmin(permissions.BasePermission):
    """
    Permission for branch admins only
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.is_superuser or request.user.role == 'branch_admin'


class CanViewFinancialReports(permissions.BasePermission):
    """
    Permission to view financial reports
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Roles that can view financial reports
        allowed_roles = ['branch_admin', 'accountant', 'manager']
        return request.user.role in allowed_roles


class CanManagePayroll(permissions.BasePermission):
    """
    Permission to manage payroll
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Company admins, branch admins, accountants, and super admins can manage payroll
        allowed_roles = ['super_admin', 'company_admin', 'branch_admin', 'accountant']
        return request.user.role in allowed_roles
    
    def has_object_permission(self, request, view, obj):
        # Superusers can manage all payroll
        if request.user.is_superuser:
            return True
        
        # Super admins and company admins can manage all payroll within their company
        if request.user.role in ['super_admin', 'company_admin']:
            if request.user.role == 'company_admin' and request.user.company:
                # Company admin can manage payroll for employees in their company
                if hasattr(obj, 'employee') and hasattr(obj.employee, 'company'):
                    return obj.employee.company == request.user.company
            return True
        
        # Branch admins and accountants must be from same branch
        if hasattr(obj, 'employee') and hasattr(obj.employee, 'branch'):
            return obj.employee.branch == request.user.branch
        
        return False


class CanManageAttendance(permissions.BasePermission):
    """
    Permission to manage attendance
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Managers and above can manage attendance
        allowed_roles = ['branch_admin', 'manager', 'accountant']
        return request.user.role in allowed_roles
    
    def has_object_permission(self, request, view, obj):
        # Superusers can manage all attendance
        if request.user.is_superuser:
            return True
        
        # Must be from same branch
        if hasattr(obj, 'branch'):
            return obj.branch == request.user.branch
        
        if hasattr(obj, 'employee') and hasattr(obj.employee, 'branch'):
            return obj.employee.branch == request.user.branch
        
        return False


# Utility function to filter queryset by branch
def filter_queryset_by_branch(queryset, user, branch_field='branch'):
    """
    Filter queryset based on user's branch permissions
    
    Args:
        queryset: Django queryset to filter
        user: User object
        branch_field: Name of the branch field (default: 'branch')
    
    Returns:
        Filtered queryset
    """
    if user.is_superuser:
        return queryset
    
    if hasattr(user, 'branch') and user.branch:
        filter_kwargs = {branch_field: user.branch}
        return queryset.filter(**filter_kwargs)
    
    # If user has no branch, return empty queryset
    return queryset.none()


# Utility function to check if user can access branch
def can_access_branch(user, branch):
    """
    Check if user can access data from a specific branch
    
    Args:
        user: User object
        branch: Branch object or branch_id
    
    Returns:
        Boolean
    """
    if user.is_superuser:
        return True
    
    if hasattr(user, 'branch') and user.branch:
        if hasattr(branch, 'id'):
            return user.branch.id == branch.id
        return user.branch.id == branch
    
    return False
