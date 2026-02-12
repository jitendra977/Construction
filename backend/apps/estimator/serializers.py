from rest_framework import serializers, viewsets, permissions
from .models import ConstructionRate

class ConstructionRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConstructionRate
        fields = '__all__'

class ConstructionRateViewSet(viewsets.ModelViewSet):
    queryset = ConstructionRate.objects.all()
    serializer_class = ConstructionRateSerializer
    # permission_classes = [permissions.IsAuthenticated] # Adjust as needed
