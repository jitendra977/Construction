from rest_framework import serializers
from ..models import WorkerDocument, WorkerContract

class WorkerDocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    verify_status_display = serializers.CharField(source='get_verify_status_display', read_only=True)
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = WorkerDocument
        fields = [
            'id', 'worker', 'doc_type', 'doc_type_display', 'doc_number',
            'file', 'issued_date', 'expiry_date', 'issuing_authority',
            'verify_status', 'verify_status_display', 'is_expired', 'notes'
        ]

class WorkerContractSerializer(serializers.ModelSerializer):
    contract_type_display = serializers.CharField(source='get_contract_type_display', read_only=True)
    wage_type_display = serializers.CharField(source='get_wage_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = WorkerContract
        fields = [
            'id', 'worker', 'contract_type', 'contract_type_display',
            'status', 'status_display', 'start_date', 'end_date',
            'wage_type', 'wage_type_display', 'wage_amount', 'currency',
            'overtime_rate', 'project', 'is_active', 'terms_notes'
        ]
