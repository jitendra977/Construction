"""
VendorViewSet — CRUD for vendors/suppliers.

Endpoints
─────────
GET/POST        /financials/vendors/
GET/PATCH/DEL   /financials/vendors/{id}/
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from ..models.vendor import Vendor
from ..serializers.vendor import VendorSerializer


class VendorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = VendorSerializer
    queryset           = Vendor.objects.filter(is_active=True).order_by("name")
