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

    def validate(self, data):
        # Fallback to instance values for partial updates (PATCH)
        loan_account = data.get("loan_account") or getattr(self.instance, "loan_account", None)
        amount = data.get("amount")
        if amount is None:
            amount = getattr(self.instance, "amount", 0)

        if not loan_account:
            return data

        limit = loan_account.total_loan_limit
        if limit:
            from django.db.models import Sum
            disbursements_qs = loan_account.fin_disbursements.all()
            if self.instance:
                disbursements_qs = disbursements_qs.exclude(id=self.instance.id)
            total_other = disbursements_qs.aggregate(s=Sum("amount"))["s"] or 0
            if float(total_other) + float(amount) > float(limit):
                raise serializers.ValidationError(
                    f"Total disbursement ({float(total_other) + float(amount):,.2f}) exceeds the sanctioned loan limit ({float(limit):,.2f})."
                )
        return data


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
