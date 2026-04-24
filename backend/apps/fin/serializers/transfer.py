from rest_framework import serializers
from ..models.transfer import CashTransfer


class CashTransferSerializer(serializers.ModelSerializer):
    from_account_name = serializers.CharField(source="from_account.name", read_only=True)
    to_account_name   = serializers.CharField(source="to_account.name",   read_only=True)

    class Meta:
        model  = CashTransfer
        fields = [
            "id", "date",
            "from_account", "from_account_name",
            "to_account",   "to_account_name",
            "amount", "reference", "notes",
            "project", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, data):
        if data.get("from_account") == data.get("to_account"):
            raise serializers.ValidationError("Source and destination accounts must be different.")
        return data
