import os
import django
import sys
from decimal import Decimal

# Setup Django environment
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.finance.models import BudgetCategory, FundingSource, Expense, Payment, FundingTransaction
from django.utils import timezone

def test_finance_system():
    print("--- Starting Finance System Test ---")
    
    # 1. Create a Budget Category
    category, _ = BudgetCategory.objects.get_or_create(
        name="Test Materials",
        defaults={"allocation": Decimal("100000.00")}
    )
    print(f"Category: {category}")

    # 2. Create a Funding Source
    fs, created = FundingSource.objects.get_or_create(
        name="Test Loan Account",
        defaults={
            "amount": Decimal("50000.00"),
            "received_date": timezone.now().date(),
            "default_payment_method": "BANK_TRANSFER"
        }
    )
    print(f"Funding Source: {fs.name}, Total: {fs.amount}, Balance: {fs.current_balance}")

    # 3. Create an Expense
    expense = Expense.objects.create(
        title="Test Cement Purchase",
        amount=Decimal("10000.00"),
        category=category,
        funding_source=fs,
        date=timezone.now().date(),
        paid_to="Alpha Suppliers",
        is_paid=False
    )
    print(f"Expense Created: {expense.title}, Amount: {expense.amount}, Status: {expense.status}")

    # 4. Record a Payment
    payment = Payment.objects.create(
        expense=expense,
        amount=Decimal("2000.00"),
        date=timezone.now().date(),
        method="BANK_TRANSFER",
        reference_id="TXN123"
    )
    
    fs.refresh_from_db()
    expense.refresh_from_db()
    print(f"Payment Recorded: {payment.amount}")
    print(f"New FS Balance: {fs.current_balance} (Expected: 48000.00)")
    print(f"Expense Status: {expense.status}, Total Paid: {expense.total_paid}")

    # 5. Update Payment
    payment.amount = Decimal("3000.00")
    payment.save()
    
    fs.refresh_from_db()
    print(f"Payment Updated to: {payment.amount}")
    print(f"New FS Balance: {fs.current_balance} (Expected: 47000.00)")

    # 6. Delete Payment
    payment_id = payment.id
    payment.delete()
    
    fs.refresh_from_db()
    print(f"Payment Deleted")
    print(f"New FS Balance: {fs.current_balance} (Expected: 50000.00)")

    # 7. Test Top-up (Manual Credit)
    FundingTransaction.objects.create(
        funding_source=fs,
        amount=Decimal("5000.00"),
        transaction_type='CREDIT',
        date=timezone.now().date(),
        description="Manual Top-up Test"
    )
    
    fs.refresh_from_db()
    print(f"Top-up Recorded: 5000.00")
    print(f"New FS Balance: {fs.current_balance} (Expected: 55000.00)")
    print(f"New FS Total Amount: {fs.amount} (Expected: 55000.00)")

    print("--- Test Completed ---")

if __name__ == "__main__":
    test_finance_system()
