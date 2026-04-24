from rest_framework import serializers
from ..models.account import Account


class AccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model  = Account
        fields = [
            "id", "code", "name", "account_type", "description",
            "project",
            "is_bank", "bank_name", "account_number", "account_holder_name",
            "is_loan", "total_loan_limit", "interest_rate",
            "loan_tenure_months", "emi_amount",
            "is_active", "balance",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "balance", "created_at", "updated_at"]
