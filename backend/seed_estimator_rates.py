import os
import django
import sys

# Add the project root to sys.path
sys.path.append('/Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.estimator.models import ConstructionRate

def seed_rates():
    rates = [
        {'key': 'CEMENT', 'label': 'Cement (OPC/PPC)', 'value': 750, 'unit': 'Bag', 'category': 'MATERIAL'},
        {'key': 'SAND', 'label': 'River Sand (Baluwa)', 'value': 90, 'unit': 'Cft', 'category': 'MATERIAL'},
        {'key': 'AGGREGATE', 'label': 'Aggregates (Gitti)', 'value': 105, 'unit': 'Cft', 'category': 'MATERIAL'},
        {'key': 'BRICK', 'label': 'Bricks (First Class)', 'value': 17.5, 'unit': 'Pcs', 'category': 'MATERIAL'},
        {'key': 'ROD', 'label': 'Steel Rod (TMT)', 'value': 102, 'unit': 'Kg', 'category': 'MATERIAL'},
        {'key': 'LABOR_CIVIL', 'label': 'Civil Work Labor', 'value': 480, 'unit': 'Sq.Ft', 'category': 'LABOR'},
        {'key': 'LABOR_MEP', 'label': 'MEP (Fitting) Labor', 'value': 180, 'unit': 'Sq.Ft', 'category': 'LABOR'},
        {'key': 'LABOR_FINISH', 'label': 'Finishing Labor', 'value': 250, 'unit': 'Sq.Ft', 'category': 'LABOR'},
        {'key': 'PAINT_SQFT', 'label': 'Painting Material', 'value': 45, 'unit': 'Sq.Ft', 'category': 'MATERIAL'},
        {'key': 'TILE_SQFT', 'label': 'Tiling Material', 'value': 180, 'unit': 'Sq.Ft', 'category': 'MATERIAL'},
    ]

    for rate_data in rates:
        rate, created = ConstructionRate.objects.get_or_create(
            key=rate_data['key'],
            defaults=rate_data
        )
        if not created:
            # Update values if they already exist
            for attr, value in rate_data.items():
                setattr(rate, attr, value)
            rate.save()
            print(f"Updated: {rate.label}")
        else:
            print(f"Created: {rate.label}")

if __name__ == '__main__':
    seed_rates()
