from rest_framework import serializers
from ..models.bill import Bill, BillItem, BillPayment


class BillItemSerializer(serializers.ModelSerializer):
    budget_category_name = serializers.CharField(source="budget_category.name", read_only=True)

    class Meta:
        model  = BillItem
        fields = ["id", "description", "quantity", "unit_price", "amount", "budget_category", "budget_category_name"]


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

    def create(self, validated_data):
        items_data = self.initial_data.get("items", [])
        bill = super().create(validated_data)
        for item_data in items_data:
            cat_id = item_data.get("budget_category")
            if str(cat_id) in ("", "null", "undefined"): cat_id = None
            BillItem.objects.create(
                bill=bill,
                description=item_data.get("description", ""),
                quantity=item_data.get("quantity", 1),
                unit_price=item_data.get("unit_price", 0),
                amount=item_data.get("amount", 0),
                budget_category_id=cat_id
            )
        return bill

    def update(self, instance, validated_data):
        items_data = self.initial_data.get("items")
        bill = super().update(instance, validated_data)
        if items_data is not None:
            bill.fin_items.all().delete()
            for item_data in items_data:
                cat_id = item_data.get("budget_category")
                if str(cat_id) in ("", "null", "undefined"): cat_id = None
                BillItem.objects.create(
                    bill=bill,
                    description=item_data.get("description", ""),
                    quantity=item_data.get("quantity", 1),
                    unit_price=item_data.get("unit_price", 0),
                    amount=item_data.get("amount", 0),
                    budget_category_id=cat_id
                )
        return bill


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
