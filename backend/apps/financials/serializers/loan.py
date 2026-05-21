from rest_framework import serializers
from ..models.loan import LoanDisbursement, LoanEMIPayment


class LoanDisbursementSerializer(serializers.ModelSerializer):
    loan_account_name = serializers.CharField(source="loan_account.name", read_only=True)
    bank_account_name = serializers.CharField(source="bank_account.name", read_only=True)

    class Meta:
        model  = LoanDisbursement
        fields = [
            "id", "loan_account", "loan_account_name",
            "bank_account", "bank_account_name",
            "date", "amount", "reference", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class LoanEMIPaymentSerializer(serializers.ModelSerializer):
    loan_account_name = serializers.CharField(source="loan_account.name", read_only=True)
    bank_account_name = serializers.CharField(source="bank_account.name", read_only=True)

    class Meta:
        model  = LoanEMIPayment
        fields = [
            "id", "loan_account", "loan_account_name",
            "bank_account", "bank_account_name",
            "date", "total_emi", "principal_amount", "interest_amount",
            "reference", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, data):
        total    = data.get("total_emi", 0)
        principal = data.get("principal_amount", 0)
        interest  = data.get("interest_amount", 0)
        if abs(float(total) - float(principal) - float(interest)) > 0.01:
            raise serializers.ValidationError(
                "total_emi must equal principal_amount + interest_amount."
            )
        return data
