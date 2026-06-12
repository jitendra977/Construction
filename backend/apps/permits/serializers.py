from rest_framework import serializers
from .models import PermitStep, PermitDocument
from utils.file_validation import PHASE_DOCUMENT_EXTENSIONS, validate_safe_upload


class PermitDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(
        source='get_document_type_display', read_only=True
    )

    def validate_file(self, value):
        return validate_safe_upload(
            value,
            allowed_extensions=PHASE_DOCUMENT_EXTENSIONS,
            label="permit document",
        )

    class Meta:
        model  = PermitDocument
        fields = [
            'id', 'title', 'file', 'document_type', 'document_type_display',
            'description', 'uploaded_at',
        ]
        read_only_fields = ['id', 'uploaded_at']


class PermitStepSerializer(serializers.ModelSerializer):
    documents = PermitDocumentSerializer(many=True, read_only=True)

    class Meta:
        model  = PermitStep
        fields = '__all__'
