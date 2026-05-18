from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PermitStep, PermitDocument
from .serializers import PermitStepSerializer, PermitDocumentSerializer
from apps.core.mixins import ProjectScopedMixin


class PermitDocumentViewSet(viewsets.ModelViewSet):
    """CRUD for permit documents (upload, list, delete)."""
    permission_classes = [IsAuthenticated]
    queryset         = PermitDocument.objects.all().order_by('-uploaded_at')
    serializer_class = PermitDocumentSerializer


class PermitStepViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset         = PermitStep.objects.all()
    serializer_class = PermitStepSerializer
    project_field    = 'project'

    @action(detail=True, methods=['post'])
    def attach_document(self, request, pk=None):
        """Attach a PermitDocument to this permit step."""
        step        = self.get_object()
        document_id = request.data.get('document_id')

        try:
            document = PermitDocument.objects.get(id=document_id)
            step.documents.add(document)
            return Response({'status': 'document attached'}, status=status.HTTP_200_OK)
        except PermitDocument.DoesNotExist:
            return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def detach_document(self, request, pk=None):
        """Detach a PermitDocument from this permit step."""
        step        = self.get_object()
        document_id = request.data.get('document_id')

        try:
            document = PermitDocument.objects.get(id=document_id)
            step.documents.remove(document)
            return Response({'status': 'document detached'}, status=status.HTTP_200_OK)
        except PermitDocument.DoesNotExist:
            return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
