import os
import sys
import django
from decimal import Decimal
import datetime

# Setup Django environment
sys.path.append('/Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounting.models.ledger import Account, AccountType, JournalEntry, EntryType
from apps.accounting.models.treasury import BankAccount, CapitalSource, CapitalSourceType
from apps.accounting.services.ledger import LedgerService

def seed_accounting_data():
    print("Seeding new accounting module with raw data...")

    # 1. Create Chart of Accounts
    accounts_data = [
        ("1001", "LaxmiSunrise Bank (Radhika KC Khadka)", AccountType.ASSET),
        ("1002", "LaxmiSunrise Bank (Jit Bahadur Khadka)", AccountType.ASSET),
        ("2000", "Accounts Payable", AccountType.LIABILITY),
        ("3000", "Owner Capital (Radhika)", AccountType.EQUITY),
        ("3001", "Owner Capital (Jit)", AccountType.EQUITY),
        ("5000", "Project Expenses", AccountType.EXPENSE),
    ]

    gl_accounts = {}
    for code, name, acc_type in accounts_data:
        acc, created = Account.objects.get_or_create(
            code=code,
            defaults={"name": name, "account_type": acc_type}
        )
        gl_accounts[code] = acc
        status = "Created" if created else "Exists"
        print(f"[{status}] GL Account: {code} - {name}")

    # 2. Create Treasury Bank Accounts
    bank1, created = BankAccount.objects.get_or_create(
        gl_account=gl_accounts["1001"],
        defaults={"name": "LaxmiSunrise Bank (Radhika KC Khadka)", "account_number": "1234567890"}
    )
    print(f"[{'Created' if created else 'Exists'}] Bank Account: {bank1.name}")

    bank2, created = BankAccount.objects.get_or_create(
        gl_account=gl_accounts["1002"],
        defaults={"name": "LaxmiSunrise Bank (Jit Bahadur Khadka)", "account_number": "0987654321"}
    )
    print(f"[{'Created' if created else 'Exists'}] Bank Account: {bank2.name}")

    # 3. Create Capital Sources
    cap1, created = CapitalSource.objects.get_or_create(
        name="Personal Savings (Radhika KC Khadka)",
        defaults={
            "source_type": CapitalSourceType.SAVINGS,
            "gl_account": gl_accounts["3000"],
            "budgeted_amount": Decimal("100000.00")  # 1 Lakh allocated
        }
    )
    print(f"[{'Created' if created else 'Exists'}] Capital Source: {cap1.name}")

    cap2, created = CapitalSource.objects.get_or_create(
        name="Personal Savings (Jit Bahadur Khadka)",
        defaults={
            "source_type": CapitalSourceType.SAVINGS,
            "gl_account": gl_accounts["3001"],
            "budgeted_amount": Decimal("1000000.00") # 10 Lakh allocated
        }
    )
    print(f"[{'Created' if created else 'Exists'}] Capital Source: {cap2.name}")

    # 4. Post Opening Balances
    # To avoid double-posting, we check if JEs already exist.
    if JournalEntry.objects.filter(source_document="OPENING-BAL").exists():
        print("Opening balances already posted. Skipping.")
    else:
        print("Posting Opening Balances...")
        # Radhika: 4 Lakh in Bank, sourced from Equity.
        lines_radhika = [
            {"account_id": gl_accounts["1001"].id, "entry_type": EntryType.DEBIT, "amount": Decimal("400000.00")},
            {"account_id": gl_accounts["3000"].id, "entry_type": EntryType.CREDIT, "amount": Decimal("400000.00")}
        ]
        je1 = LedgerService.post_entry(
            date=datetime.date.today(),
            description="Opening Balance for LaxmiSunrise (Radhika)",
            source_document="OPENING-BAL",
            lines=lines_radhika
        )

        # Jit: 20 Lakh in Bank, sourced from Equity.
        lines_jit = [
            {"account_id": gl_accounts["1002"].id, "entry_type": EntryType.DEBIT, "amount": Decimal("2000000.00")},
            {"account_id": gl_accounts["3001"].id, "entry_type": EntryType.CREDIT, "amount": Decimal("2000000.00")}
        ]
        je2 = LedgerService.post_entry(
            date=datetime.date.today(),
            description="Opening Balance for LaxmiSunrise (Jit)",
            source_document="OPENING-BAL",
            lines=lines_jit
        )
        print(f"Posted Opening Balance JE: {je1.id} (4 Lakh) and {je2.id} (20 Lakh)")

    print("\n✅ Seeding complete!")

if __name__ == "__main__":
    seed_accounting_data()
