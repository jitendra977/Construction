from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import HouseProject, ConstructionPhase, Room, Floor, UserGuide, UserGuideStep, UserGuideFAQ, UserGuideProgress, EmailLog
from .serializers import HouseProjectSerializer, ConstructionPhaseSerializer, RoomSerializer, FloorSerializer, UserGuideSerializer, UserGuideStepSerializer, UserGuideFAQSerializer, UserGuideProgressSerializer, EmailLogSerializer
from apps.accounts.permissions import IsSystemAdmin, CanManagePhases

from apps.tasks.models import Task
from apps.tasks.serializers import TaskSerializer
from apps.finance.models import Expense, BudgetCategory, FundingSource, PhaseBudgetAllocation, Account, Bill, PurchaseOrder
from apps.finance.serializers import ExpenseSerializer, BudgetCategorySerializer, FundingSourceSerializer, PhaseBudgetAllocationSerializer, AccountSerializer, BillSerializer, PurchaseOrderSerializer
from apps.resources.models import Material, Contractor, MaterialTransaction, Document
from apps.accounting.models import Vendor
from apps.resources.serializers import MaterialSerializer, ContractorSerializer, SupplierSerializer, MaterialTransactionSerializer, DocumentSerializer
from apps.permits.models import PermitStep
from apps.permits.serializers import PermitStepSerializer

class HouseProjectViewSet(viewsets.ModelViewSet):
    serializer_class = HouseProjectSerializer

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_system_admin', False):
            return HouseProject.objects.all()
        
        if user.is_authenticated:
            return user.assigned_projects.all()
        return HouseProject.objects.none()

class ConstructionPhaseViewSet(viewsets.ModelViewSet):
    queryset = ConstructionPhase.objects.all()
    serializer_class = ConstructionPhaseSerializer
    permission_classes = [IsAuthenticated, CanManagePhases]

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
        """
        project_id = request.query_params.get('project_id')
        if project_id:
            project = HouseProject.objects.filter(pk=project_id).first()
        else:
            project = HouseProject.objects.first()

        # Filter all data by project if project is set
        if project:
            phases = ConstructionPhase.objects.filter(project=project)
            # 1. Core/Phases-linked
            tasks = Task.objects.filter(phase__project=project).prefetch_related('updates', 'media')
            rooms = Room.objects.filter(floor__project=project)
            floors = Floor.objects.filter(project=project).prefetch_related('rooms')
            
            # 2. Resources (Using direct project link I just added)
            materials = Material.objects.filter(project=project).select_related('budget_category', 'supplier')
            transactions = MaterialTransaction.objects.filter(material__project=project).select_related('material', 'supplier')
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
            materials = Material.objects.select_related('budget_category', 'supplier').all()
            budget_categories = BudgetCategory.objects.prefetch_related('expenses').all()
            transactions = MaterialTransaction.objects.select_related('material', 'supplier').all()
            funding = FundingSource.objects.prefetch_related('transactions').all()
            phase_allocations = PhaseBudgetAllocation.objects.select_related('category', 'phase').all()
            accounts = Account.objects.all()

        contractors = Contractor.objects.all() # Contractors might be global/shared
        suppliers = Vendor.objects.all()       # Suppliers might be global/shared
        permits = PermitStep.objects.prefetch_related('documents').all() # Permits likely global configuration or filtered later

        # Admins see all guides, regular users only active ones
        if getattr(request.user, 'is_system_admin', False):
            user_guides = UserGuide.objects.all().prefetch_related('steps', 'faqs')
        else:
            user_guides = UserGuide.objects.filter(is_active=True).prefetch_related('steps', 'faqs')
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

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated, CanManagePhases]

class FloorViewSet(viewsets.ModelViewSet):
    queryset = Floor.objects.all()
    serializer_class = FloorSerializer
    permission_classes = [IsAuthenticated, CanManagePhases]

class UserGuideViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows user guides to be managed.
    Admins can CRUD, while regular users can only read active ones.
    """
    queryset = UserGuide.objects.all().prefetch_related('steps', 'faqs')
    serializer_class = UserGuideSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsSystemAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = UserGuide.objects.all().prefetch_related('steps', 'faqs')
        
        # Non-admins only see active guides
        if not getattr(user, 'is_system_admin', False):
            queryset = queryset.filter(is_active=True)
            
        return queryset

    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """
        Mark a specific user guide as completed or update the last step seen.
        """
        guide = self.get_object()
        user = request.user
        
        if isinstance(request.data.get('is_completed'), str):
            is_completed = request.data.get('is_completed', 'false').lower() == 'true'
        else:
            is_completed = bool(request.data.get('is_completed', False))
            
        try:
            last_step_seen = int(request.data.get('last_step_seen', 0))
        except (ValueError, TypeError):
            last_step_seen = 0
        
        progress, created = UserGuideProgress.objects.get_or_create(
            user=user, 
            guide=guide,
            defaults={'is_completed': is_completed, 'last_step_seen': last_step_seen}
        )
        
        if not created:
            if 'is_completed' in request.data:
                progress.is_completed = is_completed
            if 'last_step_seen' in request.data:
                progress.last_step_seen = last_step_seen
            progress.save()
            
        serializer = UserGuideProgressSerializer(progress)
        return Response(serializer.data, status=status.HTTP_200_OK)

class UserGuideStepViewSet(viewsets.ModelViewSet):
    queryset = UserGuideStep.objects.all()
    serializer_class = UserGuideStepSerializer
    permission_classes = [IsAuthenticated, IsSystemAdmin]

class UserGuideFAQViewSet(viewsets.ModelViewSet):
    queryset = UserGuideFAQ.objects.all()
    serializer_class = UserGuideFAQSerializer
    permission_classes = [IsAuthenticated, IsSystemAdmin]

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
