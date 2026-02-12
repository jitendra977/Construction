from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PermitStep, LegalDocument
from .serializers import PermitStepSerializer, LegalDocumentSerializer
from apps.resources.models import Document

class PermitStepViewSet(viewsets.ModelViewSet):
    queryset = PermitStep.objects.all()
    serializer_class = PermitStepSerializer
    
    @action(detail=True, methods=['post'])
    def attach_document(self, request, pk=None):
        """Attach a document to this permit step"""
        step = self.get_object()
        document_id = request.data.get('document_id')
        
        try:
            document = Document.objects.get(id=document_id)
            step.documents.add(document)
            return Response({'status': 'document attached'}, status=status.HTTP_200_OK)
        except Document.DoesNotExist:
            return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def detach_document(self, request, pk=None):
        """Detach a document from this permit step"""
        step = self.get_object()
        document_id = request.data.get('document_id')
        
        try:
            document = Document.objects.get(id=document_id)
            step.documents.remove(document)
            return Response({'status': 'document detached'}, status=status.HTTP_200_OK)
        except Document.DoesNotExist:
            return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

class LegalDocumentViewSet(viewsets.ModelViewSet):
    queryset = LegalDocument.objects.all()
    serializer_class = LegalDocumentSerializer
