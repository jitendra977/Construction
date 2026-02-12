from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .services import EstimatorService

class WallCalculatorView(APIView):
    # permission_classes = [permissions.AllowAny] # Allow public access if needed, else IsAuthenticated
    
    def post(self, request):
        try:
            data = request.data
            length = data.get('length')
            height = data.get('height')
            thickness = data.get('thickness', '9_INCH') # 9_INCH or 4_INCH
            ratio = data.get('ratio', '1:6')
            
            if not length or not height:
                return Response({"error": "Length and Height are required"}, status=status.HTTP_400_BAD_REQUEST)
                
            result = EstimatorService.calculate_wall(length, height, thickness, ratio)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ConcreteCalculatorView(APIView):
    # permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        try:
            data = request.data
            length = data.get('length')
            width = data.get('width')
            thickness = data.get('thickness')
            grade = data.get('grade', 'M20')
            structure_type = data.get('structure_type', 'SLAB')
            include_rebar = data.get('include_rebar', True)
            
            if not length or not width or not thickness:
                return Response({"error": "Length, Width and Thickness are required"}, status=status.HTTP_400_BAD_REQUEST)
                
            result = EstimatorService.calculate_concrete(length, width, thickness, grade, include_rebar, structure_type)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PlasterCalculatorView(APIView):
    def post(self, request):
        try:
            data = request.data
            area = data.get('area')
            thickness = data.get('thickness', 12)
            ratio = data.get('ratio', '1:4')
            
            if not area:
                return Response({"error": "Area is required"}, status=status.HTTP_400_BAD_REQUEST)
                
            result = EstimatorService.calculate_plaster(area, thickness, ratio)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class FlooringCalculatorView(APIView):
    def post(self, request):
        try:
            data = request.data
            area = data.get('area')
            thickness = data.get('thickness', 2)
            
            if not area:
                return Response({"error": "Area is required"}, status=status.HTTP_400_BAD_REQUEST)
                
            result = EstimatorService.calculate_flooring(area, thickness)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StructuralBudgetView(APIView):
    def post(self, request):
        try:
            data = request.data
            area = data.get('total_sqft')
            floors = data.get('floors', 1)
            quality = data.get('finish_quality', 'STANDARD')
            include_mep = data.get('include_mep', True)
            include_finishing = data.get('include_finishing', True)
            floor_details = data.get('floor_details')
            
            if not area and not floor_details:
                return Response({"error": "Total Area or Floor Details are required"}, status=status.HTTP_400_BAD_REQUEST)
                
            result = EstimatorService.calculate_full_structure(
                area, 
                floors, 
                quality, 
                include_mep, 
                include_finishing,
                floor_details=floor_details
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
from rest_framework import viewsets
from .models import ConstructionRate
from .serializers import ConstructionRateSerializer

class ConstructionRateViewSet(viewsets.ModelViewSet):
    queryset = ConstructionRate.objects.all()
    serializer_class = ConstructionRateSerializer
    # permission_classes = [permissions.IsAuthenticated]
