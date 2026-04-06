from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import HouseProject, ConstructionPhase, Room, Floor, UserGuide, UserGuideStep, UserGuideFAQ, UserGuideProgress, EmailLog
from .serializers import HouseProjectSerializer, ConstructionPhaseSerializer, RoomSerializer, FloorSerializer, UserGuideSerializer, UserGuideStepSerializer, UserGuideFAQSerializer, UserGuideProgressSerializer, EmailLogSerializer
from apps.accounts.permissions import IsSystemAdmin

from apps.tasks.models import Task
from apps.tasks.serializers import TaskSerializer
from apps.finance.models import Expense, BudgetCategory, FundingSource, PhaseBudgetAllocation
from apps.finance.serializers import ExpenseSerializer, BudgetCategorySerializer, FundingSourceSerializer, PhaseBudgetAllocationSerializer
from apps.resources.models import Material, Contractor, Supplier, MaterialTransaction, Document
from apps.resources.serializers import MaterialSerializer, ContractorSerializer, SupplierSerializer, MaterialTransactionSerializer, DocumentSerializer
from apps.permits.models import PermitStep
from apps.permits.serializers import PermitStepSerializer

class HouseProjectViewSet(viewsets.ModelViewSet):
    queryset = HouseProject.objects.all()
    serializer_class = HouseProjectSerializer

class ConstructionPhaseViewSet(viewsets.ModelViewSet):
    queryset = ConstructionPhase.objects.all()
    serializer_class = ConstructionPhaseSerializer

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
        Optimized with select_related and prefetch_related where possible.
        """
        project = HouseProject.objects.first()
        phases = ConstructionPhase.objects.all()
        rooms = Room.objects.all()
        tasks = Task.objects.prefetch_related('updates', 'media').all()
        expenses = Expense.objects.select_related('category', 'phase', 'supplier', 'contractor', 'funding_source').prefetch_related('payments').all()
        floors = Floor.objects.prefetch_related('rooms').all()
        materials = Material.objects.select_related('budget_category', 'supplier').all()
        contractors = Contractor.objects.all()
        budget_categories = BudgetCategory.objects.prefetch_related('expenses').all()
        suppliers = Supplier.objects.all()
        transactions = MaterialTransaction.objects.select_related('material', 'supplier').all()
        permits = PermitStep.objects.prefetch_related('documents').all()
        funding = FundingSource.objects.prefetch_related('transactions').all()
        phase_allocations = PhaseBudgetAllocation.objects.select_related('category', 'phase').all()
        # Admins see all guides, regular users only active ones
        if getattr(request.user, 'is_system_admin', False):
            user_guides = UserGuide.objects.all().prefetch_related('steps', 'faqs')
        else:
            user_guides = UserGuide.objects.filter(is_active=True).prefetch_related('steps', 'faqs')
        user_guide_progress = UserGuideProgress.objects.filter(user=request.user)

        return Response({
            'project': HouseProjectSerializer(project).data if project else None,
            'phases': ConstructionPhaseSerializer(phases, many=True).data,
            'rooms': RoomSerializer(rooms, many=True).data,
            'tasks': TaskSerializer(tasks, many=True).data,
            'expenses': ExpenseSerializer(expenses, many=True).data,
            'floors': FloorSerializer(floors, many=True).data,
            'materials': MaterialSerializer(materials, many=True).data,
            'contractors': ContractorSerializer(contractors, many=True).data,
            'budgetCategories': BudgetCategorySerializer(budget_categories, many=True).data,
            'suppliers': SupplierSerializer(suppliers, many=True).data,
            'transactions': MaterialTransactionSerializer(transactions, many=True).data,
            'permits': PermitStepSerializer(permits, many=True).data,
            'funding': FundingSourceSerializer(funding, many=True).data,
            'phaseBudgetAllocations': PhaseBudgetAllocationSerializer(phase_allocations, many=True).data,
            'userGuides': UserGuideSerializer(user_guides, many=True).data,
            'userGuideProgress': UserGuideProgressSerializer(user_guide_progress, many=True).data,
        })

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

class FloorViewSet(viewsets.ModelViewSet):
    queryset = Floor.objects.all()
    serializer_class = FloorSerializer

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
