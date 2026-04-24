from rest_framework import serializers
from ..models.bill import Bill, BillItem, BillPayment


class BillItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BillItem
        fields = ["id", "description", "quantity", "unit_price", "amount"]


class BillSerializer(serializers.ModelSerializer):
    items            = BillItemSerializer(source="fin_items", many=True, read_only=True)
    paid_amount      = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    outstanding      = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    payment_status   = serializers.CharField(read_only=True)
    is_overdue       = serializers.BooleanField(read_only=True)
    expense_account_name = serializers.CharField(source="expense_account.name", read_only=True)

    class Meta:
        model  = Bill
        fields = [
            "id", "vendor_name", "invoice_number", "date", "due_date",
            "description", "total_amount",
            "expense_account", "expense_account_name",
            "payable_account",
            "project", "notes",
            "paid_amount", "outstanding", "payment_status", "is_overdue",
            "items", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "paid_amount", "outstanding",
                            "payment_status", "is_overdue", "items",
                            "created_at", "updated_at"]


class BillPaymentSerializer(serializers.ModelSerializer):
    bill_vendor      = serializers.CharField(source="bill.vendor_name",     read_only=True)
    bill_invoice     = serializers.CharField(source="bill.invoice_number",  read_only=True)
    bank_account_name = serializers.CharField(source="bank_account.name",   read_only=True)

    class Meta:
        model  = BillPayment
        fields = [
            "id", "bill", "bill_vendor", "bill_invoice",
            "bank_account", "bank_account_name",
            "date", "amount", "reference", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
