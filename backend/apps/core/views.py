from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import HouseProject, ConstructionPhase, Room, Floor
from .serializers import HouseProjectSerializer, ConstructionPhaseSerializer, RoomSerializer, FloorSerializer

from apps.tasks.models import Task
from apps.tasks.serializers import TaskSerializer
from apps.finance.models import Expense, BudgetCategory, FundingSource
from apps.finance.serializers import ExpenseSerializer, BudgetCategorySerializer, FundingSourceSerializer
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
        })

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

class FloorViewSet(viewsets.ModelViewSet):
    queryset = Floor.objects.all()
    serializer_class = FloorSerializer
