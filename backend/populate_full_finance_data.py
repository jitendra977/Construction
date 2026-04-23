import os
import django
from datetime import date, timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.finance.models import Account, JournalEntry, JournalLine, PurchaseOrder, Bill, BillItem, BillPayment
from apps.resources.models import Supplier
from apps.finance.models import BudgetCategory

def populate():
    print("Clearing old finance data for a fresh start...")
    # Be careful not to delete ALL accounts if there are system accounts, but for local dev this is fine.
    # We will just delete the ones we are about to create to avoid duplicates or let them append.
    # Let's just create or get.

    print("Populating Full Finance Data...")

    # --- 1. ACCOUNTS (Chart of Accounts) ---
    accounts_data = [
        # ASSETS
        ("Cash in Hand - Site", "1001", "ASSET"),
        ("Nabil Bank Checking Account", "1010", "ASSET"),
        ("Global IME Savings", "1011", "ASSET"),
        # LIABILITIES
        ("Accounts Payable - Suppliers", "2000", "LIABILITY"),
        ("Subcontractor Payables", "2010", "LIABILITY"),
        ("Bank Loan - Nabil", "2500", "LIABILITY"),
        # EQUITY
        ("Owner's Equity Injection", "3000", "EQUITY"),
        ("Retained Earnings", "3100", "EQUITY"),
        # REVENUES
        ("Funding from Grants", "4000", "REVENUE"),
        # EXPENSES
        ("Material Expenses - Civil", "5010", "EXPENSE"),
        ("Material Expenses - Electrical", "5020", "EXPENSE"),
        ("Material Expenses - Plumbing", "5030", "EXPENSE"),
        ("Labor Expenses - Daily Wage", "5100", "EXPENSE"),
        ("Contractor Expenses", "5200", "EXPENSE"),
        ("Permits & Legal Fees", "5300", "EXPENSE"),
    ]
    
    acc_map = {}
    for name, code, acc_type in accounts_data:
        acc_map[code], _ = Account.objects.get_or_create(code=code, defaults={'name': name, 'account_type': acc_type})

    # --- 2. BUDGET CATEGORIES ---
    cat_civil, _ = BudgetCategory.objects.get_or_create(name="Civil Works", defaults={'allocation': 5000000})
    cat_elec, _ = BudgetCategory.objects.get_or_create(name="Electrical Works", defaults={'allocation': 1000000})

    # --- 3. SUPPLIERS ---
    sup1, _ = Supplier.objects.get_or_create(name="Panchakanya Steels", category="Civil Materials")
    sup2, _ = Supplier.objects.get_or_create(name="Shree Ram Cements", category="Civil Materials")
    sup3, _ = Supplier.objects.get_or_create(name="Current Electricals", category="Electrical")

    # --- 4. PURCHASE ORDERS ---
    po1 = PurchaseOrder.objects.create(
        po_number="PO-2026-010", supplier=sup1, date=date.today() - timedelta(days=20),
        total_amount=1200000, status='APPROVED', notes="TMT Steel Bars 16mm & 12mm"
    )
    po2 = PurchaseOrder.objects.create(
        po_number="PO-2026-011", supplier=sup2, date=date.today() - timedelta(days=15),
        total_amount=450000, status='RECEIVED', notes="OPC Cement 500 bags"
    )
    po3 = PurchaseOrder.objects.create(
        po_number="PO-2026-012", supplier=sup3, date=date.today() - timedelta(days=2),
        total_amount=85000, status='DRAFT', notes="Wires and Switches"
    )

    # --- 5. BILLS & BILL ITEMS ---
    b1 = Bill.objects.create(
        bill_number="BILL-ST-991", purchase_order=po1, supplier=sup1, date_issued=date.today() - timedelta(days=18),
        due_date=date.today() - timedelta(days=5), total_amount=1200000, amount_paid=1200000, status='PAID', notes="Steel delivery phase 1"
    )
    BillItem.objects.create(bill=b1, category=cat_civil, description="Panchakanya 16mm TMT", quantity=10000, unit_price=120, amount=1200000)

    b2 = Bill.objects.create(
        bill_number="BILL-CM-102", purchase_order=po2, supplier=sup2, date_issued=date.today() - timedelta(days=14),
        due_date=date.today() + timedelta(days=16), total_amount=450000, amount_paid=200000, status='PARTIAL', notes="Cement delivery"
    )
    BillItem.objects.create(bill=b2, category=cat_civil, description="OPC Cement", quantity=500, unit_price=900, amount=450000)

    b3 = Bill.objects.create(
        bill_number="BILL-EL-005", purchase_order=po3, supplier=sup3, date_issued=date.today() - timedelta(days=1),
        due_date=date.today() + timedelta(days=30), total_amount=85000, amount_paid=0, status='UNPAID', notes="Electrical supplies"
    )
    BillItem.objects.create(bill=b3, category=cat_elec, description="Switches & Wire boxes", quantity=1, unit_price=85000, amount=85000)


    # --- 6. BILL PAYMENTS ---
    # Payment for B1 (Fully Paid)
    p1 = BillPayment.objects.create(
        bill=b1, account=acc_map["1010"], amount=1200000, date=b1.date_issued + timedelta(days=2), method='BANK_TRANSFER', reference_id="NABIL-TRX-101"
    )
    # Payment for B2 (Partial)
    p2 = BillPayment.objects.create(
        bill=b2, account=acc_map["1011"], amount=200000, date=b2.date_issued + timedelta(days=5), method='CHEQUE', reference_id="CHQ-990001"
    )


    # --- 7. JOURNAL ENTRIES ---
    # Manual Entry 1: Capital Injection
    je1 = JournalEntry.objects.create(date=date.today() - timedelta(days=30), description="Initial Owner Capital Injection", source="MANUAL", reference_id="JE-001")
    JournalLine.objects.create(journal_entry=je1, account=acc_map["1010"], amount=5000000, entry_type='DEBIT')
    JournalLine.objects.create(journal_entry=je1, account=acc_map["3000"], amount=5000000, entry_type='CREDIT')

    # Manual Entry 2: Bank Loan Disbursement
    je2 = JournalEntry.objects.create(date=date.today() - timedelta(days=25), description="Nabil Bank Construct Loan", source="MANUAL", reference_id="JE-002")
    JournalLine.objects.create(journal_entry=je2, account=acc_map["1010"], amount=10000000, entry_type='DEBIT')
    JournalLine.objects.create(journal_entry=je2, account=acc_map["2500"], amount=10000000, entry_type='CREDIT')

    # Bill Recognition (b1) - Debit Expenses, Credit A/P
    je3 = JournalEntry.objects.create(date=b1.date_issued, description=f"Bill Recognition {b1.bill_number}", source="BILL", reference_id=b1.bill_number)
    JournalLine.objects.create(journal_entry=je3, account=acc_map["5010"], amount=1200000, entry_type='DEBIT')
    JournalLine.objects.create(journal_entry=je3, account=acc_map["2000"], amount=1200000, entry_type='CREDIT')

    # Bill Payment Recognition (p1) - Debit A/P, Credit Cash/Bank
    je4 = JournalEntry.objects.create(date=p1.date, description=f"Payment for {b1.bill_number}", source="PAYMENT", reference_id=p1.reference_id)
    JournalLine.objects.create(journal_entry=je4, account=acc_map["2000"], amount=1200000, entry_type='DEBIT')
    JournalLine.objects.create(journal_entry=je4, account=acc_map["1010"], amount=1200000, entry_type='CREDIT')


    print("✅ Successfully injected Full Financial Models Data!")

if __name__ == "__main__":
    populate()
