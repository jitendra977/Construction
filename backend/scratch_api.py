import os
import django
from rest_framework.test import APIRequestFactory

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.financials.views.budget import BudgetCategoryViewSet

factory = APIRequestFactory()
request = factory.get('/api/v1/fin/budget-categories/?project=1')
view = BudgetCategoryViewSet.as_view({'get': 'list'})

response = view(request)
if isinstance(response.data, dict) and 'results' in response.data:
    data = response.data['results']
else:
    data = response.data

for item in data:
    if item['name'].startswith('Levelling'):
        print(item['name'])
        print(item['phase_allocations'])
