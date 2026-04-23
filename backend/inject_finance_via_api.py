import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

def inject_data():
    User = get_user_model()
    # Or get the first existing user
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        user = User.objects.filter().first()
        if not user:
            print("No users found to authenticate the APIClient. Creating a dummy admin user.")
            user = User.objects.create_superuser('admin', 'admin@test.com', 'pass123')

    client = APIClient(SERVER_NAME='localhost')
    client.force_authenticate(user=user)

    print("Injecting Account via API...")
    res = client.post('/api/v1/finance/accounts/', {
        'name': 'Cash on Hand',
        'code': '1000',
        'account_type': 'ASSET'
    }, format='json')
    cash_acc_id = res.data['id'] if res.status_code == 201 else None
    
    res = client.post('/api/v1/finance/accounts/', {
        'name': 'Accounts Payable',
        'code': '2000',
        'account_type': 'LIABILITY'
    }, format='json')
    ap_acc_id = res.data['id'] if res.status_code == 201 else None

    print(f"Accounts Created. Cash: {cash_acc_id}, AP: {ap_acc_id}")

    # Create dummy supplier to link POs (using ORM since it's not a finance model we just created)
    from apps.resources.models import Supplier
    supplier, _ = Supplier.objects.get_or_create(name="Shree Ram Tradings", phone="9841000000", category="Civil Materials")

    print("Injecting Purchase Order via API...")
    res = client.post('/api/v1/finance/purchase-orders/', {
        'po_number': 'PO-2026-001',
        'date': '2026-04-15',
        'supplier': supplier.id,
        'total_amount': 50000,
        'status': 'DRAFT',
        'notes': 'Order for 50 bags of OPC Cement'
    }, format='json')
    po_id = res.data['id'] if res.status_code == 201 else None
    print(f"PO Created: {po_id}")

    print("Injecting Bill via API...")
    res = client.post('/api/v1/finance/bills/', {
        'bill_number': 'BILL-101',
        'purchase_order': po_id,
        'supplier': supplier.id,
        'date_issued': '2026-04-18',
        'due_date': '2026-04-25',
        'total_amount': 50000,
        'amount_paid': 0,
        'status': 'UNPAID',
        'notes': 'Delivery received'
    }, format='json')
    bill_id = res.data['id'] if res.status_code == 201 else None
    print(f"Bill Created: {bill_id}")

    # No dedicated BillItem API endpoint unless nested, but we registered BillItem differently? Wait, did we register BillItemViewSet? 
    # Let me check urls.py. No, we registered Bills, not BillItems separately. Wait, we didn't register BillItem in urls.py. We can just use ORM for that, or we expect it to be writable nested.
    
    # We did register BillPayment
    print("Injecting Bill Payment via API...")
    res = client.post('/api/v1/finance/bill-payments/', {
        'bill': bill_id,
        'account': cash_acc_id,
        'amount': 25000,
        'date': '2026-04-19',
        'method': 'CASH',
        'reference_id': 'TRX-9988'
    }, format='json')
    payment_id = res.data['id'] if res.status_code == 201 else None
    print(f"Bill Payment Created: {payment_id}")

    print("Injecting Journal Entry via API...")
    res = client.post('/api/v1/finance/journal-entries/', {
        'date': '2026-04-20',
        'description': 'Initial Capital Injection',
        'source': 'MANUAL'
    }, format='json')
    je_id = res.data['id'] if res.status_code == 201 else None
    print(f"Journal Entry Created: {je_id}")

    # JournalLines aren't registered independently.

    print("API Data injection Complete!")

if __name__ == "__main__":
    inject_data()
