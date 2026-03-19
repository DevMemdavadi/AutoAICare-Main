from rest_framework import permissions


class IsPurchaseManager(permissions.BasePermission):
    """
    Permission for purchase managers and above.
    Allows: super_admin, company_admin, purchase_manager
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in ['super_admin', 'company_admin', 'purchase_manager']


class CanApprovePurchase(permissions.BasePermission):
    """
    Permission for users who can approve purchases.
    Allows: super_admin, company_admin
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in ['super_admin', 'company_admin']


class CanManageSuppliers(permissions.BasePermission):
    """
    Permission for users who can manage suppliers.
    Allows: super_admin, company_admin, purchase_manager
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Read-only for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write access for managers and above
        return request.user.role in ['super_admin', 'company_admin', 'purchase_manager']


class CanRecordPayment(permissions.BasePermission):
    """
    Permission for users who can record payments.
    Allows: super_admin, company_admin, purchase_manager, accountant
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in ['super_admin', 'company_admin', 'purchase_manager', 'accountant']


class IsCompanyOwner(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to access it.
    Assumes the model instance has a `company` attribute.
    """
    
    def has_object_permission(self, request, view, obj):
        # Super admin can access everything
        if request.user.role == 'super_admin':
            return True
        
        # Check if object belongs to user's company
        if hasattr(obj, 'company'):
            return obj.company == request.user.company
        
        # If purchase-related, check through purchase
        if hasattr(obj, 'purchase'):
            return obj.purchase.company == request.user.company
        
        return False
