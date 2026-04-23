import os
import django
import sys
from decimal import Decimal

# Setup Django
sys.path.append('/Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.finance.models import Account, FundingSource, JournalEntry
from apps.finance.services import FinanceService, FundingService, LedgerService

def fix_data():
    print("Correcting balances...")

    # 1. Target Data
    targets = [
        {
            "code": "1001",
            "name": "LaxmiSunrise Bank (Radhika KC Khadka)",
            "fs_name": "LaxmiSunrise Bank (Jit Bahadur Khadka)",
            "total_bal": Decimal("400000.00"),
            "fs_alloc": Decimal("100000.00")
        },
        {
            "code": "1002",
            "name": "LaxmiSunrise Bank (Jit Bahadur Khadka)",
            "fs_name": "LaxmiSunrise Bank (Radhika KC Khadka)",
            "total_bal": Decimal("2000000.00"),
            "fs_alloc": Decimal("500000.00")
        }
    ]

    for t in targets:
        acc, _ = Account.objects.update_or_create(
            code=t["code"],
            defaults={"name": t["name"], "account_type": "ASSET"}
        )
        
        # Delete existing "Initial Balance" JEs to start fresh
        JournalEntry.objects.filter(description="Initial Balance", lines__account=acc).delete()
        
        # Sync the Funding Source first
        fs, _ = FundingSource.objects.update_or_create(
            name=t["fs_name"],
            defaults={
                "amount": t["fs_alloc"],
                "associated_account": acc,
                "source_type": "SAVINGS",
                "received_date": "2026-04-01"
            }
        )
        FundingService.sync_initial_transaction(fs)
        FundingService.recalculate(fs)
        
        # Now check current balance (which should just be the FS allocation if we cleared others)
        # Note: We might have other JEs (e.g. expenses). We only want to adjust the "Capital" part.
        # But for this "Real Injection", we assume we want the FINAL balance to match target.
        
        current = acc.balance
        needed_opening = t["total_bal"] - current
        
        if needed_opening != 0:
            FinanceService.post_opening_balance(acc, needed_opening)
            print(f"Posted {needed_opening:,.2f} adjustment to {acc.name}")

    print("\nFinal Check:")
    for t in targets:
        acc = Account.objects.get(code=t["code"])
        fs = FundingSource.objects.get(name=t["fs_name"])
        print(f"Account {t['code']}: Rs. {acc.balance:,.2f} (Target: {t['total_bal']:,.2f})")
        print(f"  Allocated: Rs. {fs.amount:,.2f}")

if __name__ == "__main__":
    fix_data()
