
import os
import django
import sys

# Add the project root to sys.path
sys.path.append('/Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings_local')
django.setup()

from apps.resource.models.purchase import PurchaseOrder
from apps.core.pdf_utils import generate_full_purchase_order_pdf

def test_signed_po():
    # Find PO with signature
    order = PurchaseOrder.objects.exclude(signature_data="").exclude(signature_data__isnull=True).first()
    if not order:
        print("No signed purchase orders found.")
        # Try any PO and print its sig_data
        order = PurchaseOrder.objects.first()
        if not order: return
        print(f"Checking first PO instead: ID={order.id}, SigLen={len(order.signature_data) if order.signature_data else 0}")
        if not order.signature_data: return
        
    print(f"Testing Signed PO: ID={order.id}, Number={order.order_number}")
    print(f"Signature length: {len(order.signature_data)}")
    print(f"Signature snippet: {order.signature_data[:100]}...")
    
    try:
        pdf = generate_full_purchase_order_pdf(order)
        with open("test_po_signed.pdf", "wb") as f:
            f.write(pdf)
        print("✅ PDF generated successfully: test_po_signed.pdf")
    except Exception as e:
        print(f"❌ FAILED to generate PDF: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_signed_po()
