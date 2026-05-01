from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import HouseProject, ConstructionPhase, Room, Floor, UserGuide, UserGuideStep, UserGuideFAQ, UserGuideSection, UserGuideProgress, EmailLog, ProjectMember
from .serializers import HouseProjectSerializer, ConstructionPhaseSerializer, RoomSerializer, FloorSerializer, UserGuideSerializer, UserGuideStepSerializer, UserGuideFAQSerializer, UserGuideSectionSerializer, UserGuideProgressSerializer, EmailLogSerializer, ProjectMemberSerializer
from apps.accounts.permissions import IsSystemAdmin, CanManagePhases
from apps.core.mixins import ProjectScopedMixin

from apps.tasks.models import Task
from apps.tasks.serializers import TaskSerializer
from apps.resource.models import Material, Supplier, StockMovement as MaterialTransaction
from apps.resources.models import Document
from apps.workforce.models import WorkforceMember as Contractor
from apps.accounting.models.payables import Vendor
from apps.resource.serializers.material import MaterialSerializer
from apps.resource.serializers.supplier import SupplierSerializer
from apps.resource.serializers.purchase import StockMovementSerializer as MaterialTransactionSerializer
from apps.workforce.serializers.member_serializers import WorkforceMemberListSerializer as ContractorSerializer
from apps.resources.serializers import DocumentSerializer
from apps.permits.models import PermitStep
from apps.permits.serializers import PermitStepSerializer

from apps.finance.models import Expense, BudgetCategory, FundingSource, PhaseBudgetAllocation, Account
from apps.finance.serializers import ExpenseSerializer, BudgetCategorySerializer, FundingSourceSerializer, PhaseBudgetAllocationSerializer, AccountSerializer
class HouseProjectViewSet(viewsets.ModelViewSet):
    serializer_class = HouseProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Access control:
          • System admins → all projects.
          • Everyone else → only projects where they are a ProjectMember.
        Attempting to access a project you're not a member of returns 404
        (the object is simply not in the queryset), which avoids leaking
        whether a project exists at all.
        """
        user = self.request.user
        if not user.is_authenticated:
            return HouseProject.objects.none()

        qs = HouseProject.objects.prefetch_related('members', 'phases', 'floors')

        if getattr(user, 'is_system_admin', False):
            return qs.all()

        # Regular users: only their assigned projects (via ProjectMember)
        return qs.filter(members__user=user).distinct()

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        """
        Aggregated stats for a single project across all modules:
        Structure, Finance, Resources, Phases.
        """
        from django.db.models import Sum, Count, Q
        project = self.get_object()

        # ── Structure ──────────────────────────────────────────────────────
        floors      = project.floors.prefetch_related('rooms').all()
        all_rooms   = Room.objects.filter(floor__project=project)
        room_total  = all_rooms.count()
        room_done   = all_rooms.filter(status='COMPLETED').count()
        room_pct    = round(room_done / room_total * 100, 1) if room_total else 0

        # ── Phases ────────────────────────────────────────────────────────
        phases          = project.phases.all()
        phase_total     = phases.count()
        phase_done      = phases.filter(status='COMPLETED').count()
        phase_progress  = phases.filter(status='IN_PROGRESS').count()
        phase_pct       = round(phase_done / phase_total * 100, 1) if phase_total else 0

        # ── Finance ───────────────────────────────────────────────────────
        total_spent = 0
        try:
            from apps.finance.models import Expense
            total_spent = float(
                Expense.objects.filter(project=project).aggregate(total=Sum('amount'))['total'] or 0
            )
        except Exception:
            pass

        total_budget = float(project.total_budget or 0)
        budget_used_pct = round(total_spent / total_budget * 100, 1) if total_budget else 0
        budget_remaining = total_budget - total_spent

        # ── Resources ─────────────────────────────────────────────────────
        material_count    = 0
        contractor_count  = 0
        try:
            from apps.resources.models import Material, Contractor
            material_count   = Material.objects.filter(project=project).count()
            contractor_count = Contractor.objects.filter(project=project).count()
        except Exception:
            pass

        # ── Team ──────────────────────────────────────────────────────────
        member_count = project.members.count()

        return Response({
            'structure': {
                'floors':       floors.count(),
                'rooms':        room_total,
                'rooms_done':   room_done,
                'room_pct':     room_pct,
            },
            'phases': {
                'total':        phase_total,
                'completed':    phase_done,
                'in_progress':  phase_progress,
                'pct':          phase_pct,
            },
            'finance': {
                'budget':           total_budget,
                'spent':            total_spent,
                'remaining':        budget_remaining,
                'used_pct':         budget_used_pct,
            },
            'resources': {
                'materials':    material_count,
                'contractors':  contractor_count,
            },
            'team': {
                'members':      member_count,
            },
        })


class ProjectMemberViewSet(viewsets.ModelViewSet):
    """
    CRUD for project team members + granular permission management.

    Permission rules
    ────────────────
    • GET (list / retrieve)  — any authenticated user
    • POST / PATCH / DELETE  — SUPER_ADMIN  OR  project member with
                               can_manage_members = True
    • my-role                — returns the current user's membership record
    • apply-role-defaults    — reset a member's permissions to their role defaults
    """
    serializer_class   = ProjectMemberSerializer
    permission_classes = [IsAuthenticated]

    # ── helpers ──────────────────────────────────────────────────────────────
    def _can_manage(self, project_id):
        """True if the current user may add / edit / remove members."""
        user = self.request.user
        if getattr(user, 'is_system_admin', False):
            return True
        try:
            m = ProjectMember.objects.get(project_id=project_id, user=user)
            return m.can_manage_members
        except ProjectMember.DoesNotExist:
            return False

    def _deny(self, msg='You do not have permission to manage members for this project.'):
        from rest_framework.response import Response
        return Response({'detail': msg}, status=status.HTTP_403_FORBIDDEN)

    # ── queryset ─────────────────────────────────────────────────────────────
    def get_queryset(self):
        qs = ProjectMember.objects.select_related('user', 'project').all()
        pid = self.request.query_params.get('project')
        if pid:
            qs = qs.filter(project_id=pid)
        return qs

    # ── write operations ─────────────────────────────────────────────────────
    def create(self, request, *args, **kwargs):
        project_id = request.data.get('project')
        if not self._can_manage(project_id):
            return self._deny()
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        member = serializer.save()
        # Seed permissions from role defaults
        member.apply_role_defaults()
        member.save(update_fields=member.permission_fields)
        # Keep User.assigned_projects M2M in sync
        member.user.assigned_projects.add(member.project)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._can_manage(instance.project_id):
            return self._deny()
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Users may always remove themselves; otherwise need manage_members
        if instance.user != request.user and not self._can_manage(instance.project_id):
            return self._deny()
        return super().destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        user    = instance.user
        project = instance.project
        instance.delete()
        if not ProjectMember.objects.filter(user=user, project=project).exists():
            user.assigned_projects.remove(project)

    # ── extra actions ─────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='my-role')
    def my_role(self, request):
        """
        GET /api/v1/project-members/my-role/?project=<id>
        Returns the current user's ProjectMember record for that project.
        System admins get a synthetic full-access response.
        """
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'detail': 'project query param required.'}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(request.user, 'is_system_admin', False):
            return Response({
                'id': None, 'role': 'SUPER_ADMIN', 'role_display': 'Super Admin',
                'can_manage_members': True, 'can_manage_finances': True,
                'can_view_finances': True, 'can_manage_phases': True,
                'can_manage_structure': True, 'can_manage_resources': True,
                'can_upload_media': True,
            })

        try:
            m = ProjectMember.objects.select_related('user').get(
                project_id=project_id, user=request.user)
            return Response(ProjectMemberSerializer(m, context={'request': request}).data)
        except ProjectMember.DoesNotExist:
            return Response({'detail': 'Not a member of this project.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='apply-role-defaults')
    def apply_role_defaults(self, request, pk=None):
        """
        POST /api/v1/project-members/<id>/apply-role-defaults/
        Reset all permission flags to the defaults for this member's role.
        Requires can_manage_members on the project.
        """
        instance = self.get_object()
        if not self._can_manage(instance.project_id):
            return self._deny()
        instance.apply_role_defaults()
        instance.save(update_fields=instance.permission_fields)
        return Response(ProjectMemberSerializer(instance, context={'request': request}).data)

class ConstructionPhaseViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    queryset = ConstructionPhase.objects.all()
    serializer_class = ConstructionPhaseSerializer
    permission_classes = [IsAuthenticated, CanManagePhases]
    project_field = 'project'

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        order_list = request.data.get('order', [])
        if not order_list:
            return Response({'error': 'No order list provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            for item in order_list:
                phase_id = item.get('id')
                new_order = item.get('order')
                ConstructionPhase.objects.filter(id=phase_id).update(order=new_order)
            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class DashboardDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Unified endpoint to fetch all dashboard data in a single request.
        Accepts optional ?project_id=<id> to load a specific project.
        Non-admins are restricted to their assigned projects only.
        """
        user = request.user
        is_admin = getattr(user, 'is_system_admin', False)

        # Build the base project queryset scoped to this user
        if is_admin:
            accessible_projects = HouseProject.objects.all()
        else:
            accessible_projects = HouseProject.objects.filter(members__user=user).distinct()

        project_id = request.query_params.get('project_id')
        if project_id:
            project = accessible_projects.filter(pk=project_id).first()
        else:
            project = accessible_projects.first()

        # Filter all data by project if project is set
        if project:
            phases = ConstructionPhase.objects.filter(project=project)
            # 1. Core/Phases-linked
            tasks = Task.objects.filter(phase__project=project).prefetch_related('updates', 'media')
            rooms = Room.objects.filter(floor__project=project)
            floors = Floor.objects.filter(project=project).prefetch_related('rooms')
            
            # 2. Resources (Using direct project link I just added)
            materials = Material.objects.filter(project=project)
            transactions = MaterialTransaction.objects.filter(project=project).select_related('material')
            permits = PermitStep.objects.filter(project=project).prefetch_related('documents')
            
            # 3. Finance (Using direct project link I just added)
            expenses = Expense.objects.filter(project=project).select_related('category', 'phase', 'supplier', 'contractor', 'funding_source').prefetch_related('payments')
            budget_categories = BudgetCategory.objects.filter(project=project).prefetch_related('expenses')
            funding = FundingSource.objects.filter(project=project).prefetch_related('transactions')
            phase_allocations = PhaseBudgetAllocation.objects.filter(category__project=project).select_related('category', 'phase')
            accounts = Account.objects.filter(project=project)
        else:
            phases = ConstructionPhase.objects.all()
            rooms = Room.objects.all()
            tasks = Task.objects.prefetch_related('updates', 'media').all()
            expenses = Expense.objects.select_related('category', 'phase', 'supplier', 'contractor', 'funding_source').prefetch_related('payments').all()
            floors = Floor.objects.prefetch_related('rooms').all()
            materials = Material.objects.all()
            budget_categories = BudgetCategory.objects.prefetch_related('expenses').all()
            transactions = MaterialTransaction.objects.select_related('material').all()
            funding = FundingSource.objects.prefetch_related('transactions').all()
            phase_allocations = PhaseBudgetAllocation.objects.select_related('category', 'phase').all()
            accounts = Account.objects.all()

        contractors = Contractor.objects.filter(current_project=project) if project else Contractor.objects.all()
        suppliers = Supplier.objects.filter(project=project) if project else Supplier.objects.all()
        permits = PermitStep.objects.prefetch_related('documents').all()

        # Admins see all guides, regular users only active ones
        if getattr(request.user, 'is_system_admin', False):
            user_guides = UserGuide.objects.all().prefetch_related('steps', 'faqs', 'sections')
        else:
            user_guides = UserGuide.objects.filter(is_active=True).prefetch_related('steps', 'faqs', 'sections')
        user_guide_progress = UserGuideProgress.objects.filter(user=request.user)

        # -----------------------------------------------------
        # Finance Summary (Double-Entry Aggregation)
        # -----------------------------------------------------
        # Evaluate balances in memory to avoid N+1 queries if we already fetched them, or just use properties
        # For efficiency, computing in Python since Account count is very low.
        total_assets = sum(acc.balance for acc in accounts if acc.account_type == 'ASSET')
        total_liabilities = sum(acc.balance for acc in accounts if acc.account_type == 'LIABILITY')
        total_equity = sum(acc.balance for acc in accounts if acc.account_type == 'EQUITY')
        total_expenses = sum(acc.balance for acc in accounts if acc.account_type == 'EXPENSE')
        total_revenue = sum(acc.balance for acc in accounts if acc.account_type == 'REVENUE')


        finance_summary = {
            'total_assets': total_assets,
            'total_liabilities': total_liabilities,
            'total_equity': total_equity,
            'total_expenses': total_expenses,
            'total_revenue': total_revenue,
        }

        # We also pass all accounts back to easily map for forms on the dashboard if needed
        # Or bills/purchases to keep the main view fully loaded (if performance is okay, we keep it simple for now).
        # To avoid explosive payload size, we don't send *all* bills and Journal entries through DashboardDataView,
        # but we send Accounts so the UI has them cached.
        
        ctx = {'request': request, 'project': project}

        return Response({
            'project': HouseProjectSerializer(project).data if project else None,
            'phases': ConstructionPhaseSerializer(phases, many=True, context=ctx).data,
            'rooms': RoomSerializer(rooms, many=True, context=ctx).data,
            'tasks': TaskSerializer(tasks, many=True, context=ctx).data,
            'expenses': ExpenseSerializer(expenses, many=True, context=ctx).data,
            'floors': FloorSerializer(floors, many=True, context=ctx).data,
            'materials': MaterialSerializer(materials, many=True, context=ctx).data,
            'contractors': ContractorSerializer(contractors, many=True, context=ctx).data,
            'budgetCategories': BudgetCategorySerializer(budget_categories, many=True, context=ctx).data,
            'suppliers': SupplierSerializer(suppliers, many=True, context=ctx).data,
            'transactions': MaterialTransactionSerializer(transactions, many=True, context=ctx).data,
            'permits': PermitStepSerializer(permits, many=True, context=ctx).data,
            'funding': FundingSourceSerializer(funding, many=True, context=ctx).data,
            'phaseBudgetAllocations': PhaseBudgetAllocationSerializer(phase_allocations, many=True, context=ctx).data,
            'userGuides': UserGuideSerializer(user_guides, many=True, context=ctx).data,
            'userGuideProgress': UserGuideProgressSerializer(user_guide_progress, many=True, context=ctx).data,
            'accounts': AccountSerializer(accounts, many=True, context=ctx).data,
            'finance_summary': finance_summary,
        })

class RoomViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    queryset = Room.objects.select_related('floor').order_by('floor__level', 'name')
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated, CanManagePhases]
    project_field = 'floor__project'

    def get_queryset(self):
        qs = super().get_queryset()
        floor_id = self.request.query_params.get('floor')
        pid = self.request.query_params.get('project')
        if floor_id:
            qs = qs.filter(floor_id=floor_id)
        if pid:
            qs = qs.filter(floor__project_id=pid)
        return qs

class FloorViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    queryset = Floor.objects.prefetch_related('rooms').order_by('level')
    serializer_class = FloorSerializer
    permission_classes = [IsAuthenticated, CanManagePhases]
    project_field = 'project'

    def get_queryset(self):
        qs = super().get_queryset()
        pid = self.request.query_params.get('project')
        if pid:
            qs = qs.filter(project_id=pid)
        return qs

class UserGuideViewSet(viewsets.ModelViewSet):
    """
    Guide metadata CRUD.
    - GET  (list/retrieve): any authenticated user
    - POST/PUT/PATCH/DELETE: admins only
    """
    queryset         = UserGuide.objects.all().prefetch_related('steps', 'faqs', 'sections')
    serializer_class = UserGuideSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsSystemAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user    = self.request.user
        queryset = UserGuide.objects.all().prefetch_related('steps', 'faqs', 'sections')
        if not getattr(user, 'is_system_admin', False):
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Mark a guide as completed or update last step seen."""
        guide = self.get_object()
        user  = request.user

        if isinstance(request.data.get('is_completed'), str):
            is_completed = request.data.get('is_completed', 'false').lower() == 'true'
        else:
            is_completed = bool(request.data.get('is_completed', False))

        try:
            last_step_seen = int(request.data.get('last_step_seen', 0))
        except (ValueError, TypeError):
            last_step_seen = 0

        progress, created = UserGuideProgress.objects.get_or_create(
            user=user, guide=guide,
            defaults={'is_completed': is_completed, 'last_step_seen': last_step_seen}
        )
        if not created:
            if 'is_completed'   in request.data: progress.is_completed   = is_completed
            if 'last_step_seen' in request.data: progress.last_step_seen = last_step_seen
            progress.save()

        serializer = UserGuideProgressSerializer(progress)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserGuideStepViewSet(viewsets.ModelViewSet):
    """
    Steps — any authenticated user can add; only admin or original author can edit/delete.
    """
    queryset         = UserGuideStep.objects.select_related('added_by')
    serializer_class = UserGuideStepSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = UserGuideStep.objects.select_related('added_by')
        guide_id = self.request.query_params.get('guide')
        if guide_id:
            qs = qs.filter(guide_id=guide_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method not in ('GET', 'HEAD', 'OPTIONS', 'POST'):
            is_admin  = getattr(request.user, 'is_system_admin', False)
            is_author = obj.added_by == request.user
            if not (is_admin or is_author):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only admins or the original contributor can modify this.")


class UserGuideFAQViewSet(viewsets.ModelViewSet):
    """
    FAQs — any authenticated user can add; only admin or original author can edit/delete.
    """
    queryset         = UserGuideFAQ.objects.select_related('added_by')
    serializer_class = UserGuideFAQSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = UserGuideFAQ.objects.select_related('added_by')
        guide_id = self.request.query_params.get('guide')
        if guide_id:
            qs = qs.filter(guide_id=guide_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method not in ('GET', 'HEAD', 'OPTIONS', 'POST'):
            is_admin  = getattr(request.user, 'is_system_admin', False)
            is_author = obj.added_by == request.user
            if not (is_admin or is_author):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only admins or the original contributor can modify this.")


class UserGuideSectionViewSet(viewsets.ModelViewSet):
    """
    Custom sections (Tips, Warnings, Notes, etc.) — any user can contribute.
    Admins can approve/hide; only admin or author can edit/delete.
    """
    queryset         = UserGuideSection.objects.select_related('added_by')
    serializer_class = UserGuideSectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = UserGuideSection.objects.select_related('added_by')
        guide_id = self.request.query_params.get('guide')
        if guide_id:
            qs = qs.filter(guide_id=guide_id)
        # Non-admins only see approved sections
        if not getattr(self.request.user, 'is_system_admin', False):
            qs = qs.filter(is_approved=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method not in ('GET', 'HEAD', 'OPTIONS', 'POST'):
            is_admin  = getattr(request.user, 'is_system_admin', False)
            is_author = obj.added_by == request.user
            if not (is_admin or is_author):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only admins or the original contributor can modify this.")

class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing email logs. Read-only for auditing purposes.
    """
    queryset = EmailLog.objects.all()
    serializer_class = EmailLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Users can only see logs for emails they sent or are related to their project.
        """
        user = self.request.user
        queryset = EmailLog.objects.select_related('sent_by', 'payment', 'expense', 'material')
        
        # Admin sees all, regular users see only their own
        if not getattr(user, 'is_system_admin', False):
            queryset = queryset.filter(sent_by=user)
        return queryset
