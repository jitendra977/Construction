import random
from datetime import timedelta, date
from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.core.models import HouseProject
from apps.resource.models import Material, Supplier, StockMovement
from apps.finance.models import BudgetCategory, Expense
from apps.financials.models.vendor import Vendor
from apps.analytics.models import BudgetForecast, BudgetAlert, SupplierRateTrend
from apps.analytics.services import refresh_all_forecasts, compute_rate_trends, rebuild_alerts

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        project = HouseProject.objects.first()
        if not project:
            print("No project found!")
            return
            
        print("Creating mock Suppliers and Materials...")
        sup1, _ = Supplier.objects.get_or_create(project=project, name="Apex Cement Ltd.", defaults={'phone': '9800000001'})
        sup2, _ = Supplier.objects.get_or_create(project=project, name="National Steel", defaults={'phone': '9800000002'})
        
        mat1, _ = Material.objects.get_or_create(
            project=project, name="OPC Cement 43 Grade", 
            defaults={"unit": "bag", "unit_price": 850, "category": "CEMENT", "is_active": True}
        )
        mat2, _ = Material.objects.get_or_create(
            project=project, name="TMT Steel 16mm", 
            defaults={"unit": "kg", "unit_price": 125, "category": "STEEL", "is_active": True}
        )

        # Rate Trends Data - 90 days history
        print("Creating historical stock movements for trends...")
        today = date.today()
        for d in range(90, 0, -5):
            txn_date = today - timedelta(days=d)
            
            # Cement price going UP
            price1 = 800 + (90 - d) * 1.5 + random.randint(-10, 10)
            sm1 = StockMovement.objects.create(
                project=project, material=mat1, supplier=sup1,
                movement_type="IN", quantity=100, unit_price=price1, reference=f"INV-C-{d}"
            )
            sm1.created_at = txn_date
            sm1.save(update_fields=['created_at'])
            
            # Steel price going DOWN
            price2 = 140 - (90 - d) * 0.3 + random.randint(-2, 2)
            sm2 = StockMovement.objects.create(
                project=project, material=mat2, supplier=sup2,
                movement_type="IN", quantity=500, unit_price=price2, reference=f"INV-S-{d}"
            )
            sm2.created_at = txn_date
            sm2.save(update_fields=['created_at'])

        # Budget Forecasts - Ensure Expenses exist so burn rate is > 0
        print("Creating historical expenses for budget forecasts...")
        cat1, _ = BudgetCategory.objects.get_or_create(project=project, name="Foundation Materials", defaults={'allocation': 500000})
        cat2, _ = BudgetCategory.objects.get_or_create(project=project, name="Labor Cost", defaults={'allocation': 800000})
        
        for d in range(60, 0, -2):
            txn_date = today - timedelta(days=d)
            # High burn rate
            Expense.objects.create(project=project, category=cat1, title=f"Purchase {d}", amount=12000, date=txn_date)
            # Normal burn rate
            Expense.objects.create(project=project, category=cat2, title=f"Wages {d}", amount=5000, date=txn_date)
            
        # Compute Analytics
        print("Running Analytics Engine...")
        refresh_all_forecasts()
        compute_rate_trends()
        rebuild_alerts()

        print("Done! Check the Analytics Dashboard now.")
