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
