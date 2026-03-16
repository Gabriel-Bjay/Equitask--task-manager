from rest_framework import permissions

class IsManagerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow managers to edit tasks.
    """
    
    def has_permission(self, request, view):
        # Read permissions for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Write permissions only for managers
        return request.user and request.user.is_authenticated and request.user.is_manager


class IsTaskOwnerOrManager(permissions.BasePermission):
    """
    Custom permission to allow task owner or manager to edit.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions for owner or manager
        return obj.created_by == request.user or request.user.is_manager