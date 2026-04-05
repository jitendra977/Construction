from rest_framework import serializers
from .models import PermitStep
from apps.resources.serializers import DocumentSerializer

class PermitStepSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)
    
    class Meta:
        model = PermitStep
        fields = '__all__'

