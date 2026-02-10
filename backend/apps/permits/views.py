from rest_framework import viewsets
from .models import PermitStep, LegalDocument
from .serializers import PermitStepSerializer, LegalDocumentSerializer

class PermitStepViewSet(viewsets.ModelViewSet):
    queryset = PermitStep.objects.all()
    serializer_class = PermitStepSerializer

class LegalDocumentViewSet(viewsets.ModelViewSet):
    queryset = LegalDocument.objects.all()
    serializer_class = LegalDocumentSerializer
