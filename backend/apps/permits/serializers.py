from rest_framework import serializers
from .models import PermitStep, LegalDocument

class PermitStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitStep
        fields = '__all__'

class LegalDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    
    class Meta:
        model = LegalDocument
        fields = '__all__'
