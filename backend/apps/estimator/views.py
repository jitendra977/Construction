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
            
            if not length or not width or not thickness:
                return Response({"error": "Length, Width and Thickness are required"}, status=status.HTTP_400_BAD_REQUEST)
                
            result = EstimatorService.calculate_concrete(length, width, thickness, grade)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
