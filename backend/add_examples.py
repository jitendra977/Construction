import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from datetime import date
from django.db import transaction
from apps.core.models import HouseProject
from apps.financials.models.account import Account
from apps.financials.models.budget import BudgetCategory
from apps.financials.models.bill import Bill, BillItem
from apps.financials.services.bill import BillService

def run():
    project = HouseProject.objects.first()
    if not project:
        print("No project found.")
        return

    # Ensure accounts exist
    exp_account = Account.objects.filter(account_type="EXPENSE").first()
    if not exp_account:
        exp_account = Account.objects.create(name="General Expenses", account_type="EXPENSE", code="EXP-001")

    pay_account = Account.objects.filter(account_type="LIABILITY").first()
    if not pay_account:
        pay_account = Account.objects.create(name="Accounts Payable", account_type="LIABILITY", code="AP-001")

    cats = list(BudgetCategory.objects.all()[:5])
    if not cats:
        print("No budget categories found.")
        return

    examples = [
        {"vendor": "Shiva Hardware", "desc": "Cement & Rods", "amt": 50000},
        {"vendor": "Ram Construction", "desc": "Labour Payment (Partial)", "amt": 120000},
        {"vendor": "Kathmandu Municipality", "desc": "Permit Fees", "amt": 25000},
        {"vendor": "Sita Tiles & Marbles", "desc": "Floor Tiles advance", "amt": 45000},
        {"vendor": "Electricals Nepal", "desc": "Wiring and Pipes", "amt": 30000},
    ]

    with transaction.atomic():
        for i, ex in enumerate(examples):
            cat = cats[i % len(cats)]
            
            bill = Bill.objects.create(
                vendor_name=ex["vendor"],
                invoice_number=f"INV-10{i+1}",
                date=date.today(),
                due_date=date.today(),
                description=ex["desc"],
                total_amount=ex["amt"],
                expense_account=exp_account,
                payable_account=pay_account,
                project=project,
            )
            
            BillItem.objects.create(
                bill=bill,
                description=ex["desc"],
                quantity=1,
                unit_price=ex["amt"],
                amount=ex["amt"],
                budget_category=cat
            )
            
            BillService.post_bill(bill)
            print(f"Created bill for {ex['vendor']} linked to {cat.name}")

    print("Successfully added 5 example bills.")

run()
