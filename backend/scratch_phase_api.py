import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.core.serializers import ConstructionPhaseSerializer
from apps.core.models import ConstructionPhase

ph = ConstructionPhase.objects.get(pk=5)
data = ConstructionPhaseSerializer(ph).data
print("Phase 5 budget:", data.get('estimated_budget'))

ph3 = ConstructionPhase.objects.get(pk=3)
data3 = ConstructionPhaseSerializer(ph3).data
print("Phase 3 budget:", data3.get('estimated_budget'))

ph2 = ConstructionPhase.objects.get(pk=2)
data2 = ConstructionPhaseSerializer(ph2).data
print("Phase 2 budget:", data2.get('estimated_budget'))
