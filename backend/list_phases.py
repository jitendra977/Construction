import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.core.models import ConstructionPhase
print([(p.id, p.name) for p in ConstructionPhase.objects.all()])
