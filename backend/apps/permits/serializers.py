from rest_framework import serializers
from .models import PermitStep, LegalDocument
from apps.resources.serializers import DocumentSerializer

class PermitStepSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)
    
    class Meta:
        model = PermitStep
        fields = '__all__'

class LegalDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    
    class Meta:
        model = LegalDocument
        fields = '__all__'
