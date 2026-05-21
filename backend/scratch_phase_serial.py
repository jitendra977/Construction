import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.core.serializers import ConstructionPhaseSerializer
from apps.core.models import ConstructionPhase

ph = ConstructionPhase.objects.get(pk=12)
data = ConstructionPhaseSerializer(ph).data
print("Phase name:", data.get('name'))
print("Budget:", data.get('estimated_budget'))
print("Breakdown:", data.get('budget_breakdown'))
