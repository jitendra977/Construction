from rest_framework import permissions

# ── helpers ───────────────────────────────────────────────────────────────────
def _get_project_id(view, obj=None):
    """Extract project PK from view kwargs or object, whichever is available."""
    if obj is not None:
        if hasattr(obj, 'project_id'):
            return obj.project_id
        if hasattr(obj, 'project'):
            return obj.project_id if hasattr(obj, 'project_id') else obj.project.pk
    pid = view.kwargs.get('project_pk') or view.kwargs.get('pk')
    return pid

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


# ── Project-level permission classes ─────────────────────────────────────────
def _get_member(user, project_id):
    """Fetch the ProjectMember record for this user+project, or None."""
    if not project_id or not user or not user.is_authenticated:
        return None
    try:
        from apps.core.models import ProjectMember
        return ProjectMember.objects.get(project_id=project_id, user=user)
    except Exception:
        return None


class IsProjectMember(permissions.BasePermission):
    """
    Allow access only if the user is a member of the target project,
    OR is a system admin.  Pass `project_id` via the URL kwarg 'project_pk'
    or 'pk', or via the object's `.project_id` attribute.
    """
    message = 'You are not a member of this project.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_system_admin', False):
            return True
        # Try to get project_id from query params (list actions)
        project_id = (
            request.query_params.get('project') or
            view.kwargs.get('project_pk') or
            view.kwargs.get('pk')
        )
        if not project_id:
            return True   # let object-level check decide
        return _get_member(request.user, project_id) is not None

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'is_system_admin', False):
            return True
        project_id = getattr(obj, 'project_id', None) or getattr(getattr(obj, 'project', None), 'pk', None)
        return _get_member(request.user, project_id) is not None


class IsProjectManager(permissions.BasePermission):
    """
    Allow write access only to project members with `can_manage_members = True`
    (i.e. OWNER or MANAGER roles by default) or system admins.
    Safe methods (GET/HEAD/OPTIONS) are always allowed to authenticated users.
    """
    message = 'You must be a project owner or manager to perform this action.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if getattr(request.user, 'is_system_admin', False):
            return True
        project_id = (
            request.query_params.get('project') or
            request.data.get('project') or
            view.kwargs.get('project_pk') or
            view.kwargs.get('pk')
        )
        member = _get_member(request.user, project_id)
        return member is not None and member.can_manage_members

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if getattr(request.user, 'is_system_admin', False):
            return True
        project_id = getattr(obj, 'project_id', None) or getattr(getattr(obj, 'project', None), 'pk', None)
        member = _get_member(request.user, project_id)
        return member is not None and member.can_manage_members


def _project_id_from_request(request, view):
    """Extract project ID from query params, body, or URL kwargs."""
    return (
        request.query_params.get('project') or
        request.data.get('project') or
        view.kwargs.get('project_pk') or
        view.kwargs.get('pk')
    )


class CanManageWorkforce(permissions.BasePermission):
    """
    Allow write access to members with can_manage_workforce = True
    (OWNER, MANAGER, SUPERVISOR by default) or system admins.
    Read access allowed to all authenticated project members.
    """
    message = 'You do not have permission to manage workforce for this project.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_system_admin', False):
            return True
        if request.method in permissions.SAFE_METHODS:
            return True
        project_id = _project_id_from_request(request, view)
        member = _get_member(request.user, project_id)
        return member is not None and member.can_manage_workforce

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if getattr(request.user, 'is_system_admin', False):
            return True
        project_id = getattr(obj, 'project_id', None) or getattr(getattr(obj, 'project', None), 'pk', None)
        member = _get_member(request.user, project_id)
        return member is not None and member.can_manage_workforce


class CanApprovePurchases(permissions.BasePermission):
    """
    Allow approval actions only to members with can_approve_purchases = True
    (OWNER, MANAGER by default) or system admins.
    """
    message = 'You do not have permission to approve purchases for this project.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_system_admin', False):
            return True
        project_id = _project_id_from_request(request, view)
        member = _get_member(request.user, project_id)
        return member is not None and member.can_approve_purchases

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'is_system_admin', False):
            return True
        project_id = getattr(obj, 'project_id', None) or getattr(getattr(obj, 'project', None), 'pk', None)
        member = _get_member(request.user, project_id)
        return member is not None and member.can_approve_purchases


class IsWorkerPortalUser(permissions.BasePermission):
    """
    Allows access only to Users whose WorkforceMember account has
    worker_type STAFF, SUBCONTRACTOR, or FREELANCE — i.e. the simple
    mobile worker portal.  System admins always pass.
    """
    message = 'Worker portal access is restricted to registered workforce members.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_system_admin', False):
            return True
        return hasattr(request.user, 'workforce_profile')
