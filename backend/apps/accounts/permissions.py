from rest_framework import permissions

class IsSystemAdmin(permissions.BasePermission):
    """
    Custom permission to only allow system admins to manage objects.
    Assumes the model or user has the `is_system_admin` property setup correctly.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # SAFE_METHODS are typically GET, HEAD, OPTIONS
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Only system admins have full write access
        return request.user.is_system_admin

    def has_object_permission(self, request, view, obj):
        # We can also restrict object-level operations
        if request.method in permissions.SAFE_METHODS:
            return True
            
        return request.user.is_system_admin

def check_role_permission(user, permission_field):
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_system_admin', False):
        return True
    if not user.role:
        return False
    if getattr(user.role, 'can_manage_all_systems', False):
        return True
    return getattr(user.role, permission_field, False)

class CanManageFinances(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return check_role_permission(request.user, 'can_view_finances') or check_role_permission(request.user, 'can_manage_finances')
        return check_role_permission(request.user, 'can_manage_finances')

class CanViewFinances(permissions.BasePermission):
    def has_permission(self, request, view):
        return check_role_permission(request.user, 'can_view_finances') or check_role_permission(request.user, 'can_manage_finances')

class CanManagePhases(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return check_role_permission(request.user, 'can_view_phases') or check_role_permission(request.user, 'can_manage_phases')
        return check_role_permission(request.user, 'can_manage_phases')

class CanViewPhases(permissions.BasePermission):
    def has_permission(self, request, view):
        return check_role_permission(request.user, 'can_view_phases') or check_role_permission(request.user, 'can_manage_phases')
