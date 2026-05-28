import random
from datetime import timedelta, date
from django.core.management.base import BaseCommand
from apps.core.models import HouseProject
from apps.resource.models import Material, Supplier, StockMovement
from apps.finance.models import BudgetCategory, Expense
from apps.financials.models.vendor import Vendor

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        project = HouseProject.objects.first()
        if not project:
            return
            
        # Create a material and supplier if needed
        mat, _ = Material.objects.get_or_create(project=project, name="Cement OPC", defaults={"unit": "bag"})
        sup, _ = Supplier.objects.get_or_create(project=project, name="ABC Suppliers")
        
        # Create some IN movements
        today = date.today()
        for i in range(10):
            days_ago = (10 - i) * 5
            movement_date = today - timedelta(days=days_ago)
            price = 800 + random.randint(-50, 150)
            
            StockMovement.objects.create(
                project=project,
                material=mat,
                supplier=sup,
                movement_type="IN",
                quantity=100,
                unit_price=price,
                reference_no=f"INV-{i}"
            )
            # update created_at date
            move = StockMovement.objects.last()
            move.created_at = movement_date
            move.save()

        print("Created sample rate trends data.")
