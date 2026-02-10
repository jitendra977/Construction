import os
import django
import sys

# Setup Django environment
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import Floor
from apps.core.serializers import FloorSerializer

def test_serialization():
    floor = Floor.objects.first()
    if floor:
        serializer = FloorSerializer(floor)
        print("--- Floor Serialization ---")
        import json
        print(json.dumps(serializer.data, indent=2))
        print("--- Room IDs in Floor ---")
        print([r['id'] for r in serializer.data['rooms']])
    else:
        print("No floors found")

if __name__ == "__main__":
    test_serialization()
