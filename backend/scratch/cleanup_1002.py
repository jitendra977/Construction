import os
import django
import sys
from decimal import Decimal

# Setup Django
sys.path.append('/Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.finance.models import Account, FundingSource, JournalEntry, FundingTransaction, JournalLine
from apps.finance.services import FinanceService, FundingService

def final_fix():
    print("Applying final fix for Account 1002...")

    acc = Account.objects.get(code="1002")
    fs = FundingSource.objects.get(associated_account=acc)

    # 1. Clear all ledger entries for this account
    je_ids = JournalLine.objects.filter(account=acc).values_list('journal_entry_id', flat=True)
    FundingTransaction.objects.filter(journal_entry_id__in=je_ids).update(journal_entry=None)
    JournalEntry.objects.filter(id__in=je_ids).delete()

    # 2. Set Funding Source Allocation to 5 Lakh (Initial part)
    # This will trigger the signal to set Initial Funding Allocation to 5 Lakh
    fs.amount = Decimal("500000.00")
    fs.save()

    # 3. Ensure the manual "Deposit" is also 5 Lakh
    tx2 = FundingTransaction.objects.get(funding_source=fs, description="Deposit")
    tx2.amount = Decimal("500000.00")
    tx2.save()

    # 4. Re-post both to GL
    # (signals might have already posted them on save, but let's be explicit)
    for tx in FundingTransaction.objects.filter(funding_source=fs):
        if not tx.journal_entry:
            FundingService.update_gl_post(tx)
    
    print("Synced 5 Lakh Initial + 5 Lakh Deposit.")

    # 5. Fix Opening Balance to reach 20 Lakh
    # Current is 10 Lakh (from funding)
    current = acc.balance
    target = Decimal("2000000.00")
    needed = target - current
    
    if needed != 0:
        # We need to be careful not to trigger recursive balance updates if there are signals
        # but FinanceService.post_opening_balance is safe.
        FinanceService.post_opening_balance(acc, needed)
        print(f"Posted Opening Balance: {needed:,.2f}")

    # 6. Recalculate
    FundingService.recalculate(fs)
    
    print("\nFinal State:")
    print(f"Account 1002 (Jit): {acc.balance:,.2f} (Target 2.0M)")
    print(f"Funding Balance: {fs.current_balance:,.2f} (Target 1.0M)")
    print(f"Funding Allocation Field: {fs.amount:,.2f}")

if __name__ == "__main__":
    final_fix()
