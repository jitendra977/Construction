from rest_framework import serializers
from ..models.journal import JournalEntry, JournalLine


class JournalLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    account_code = serializers.CharField(source="account.code", read_only=True)

    class Meta:
        model  = JournalLine
        fields = ["id", "account", "account_name", "account_code", "entry_type", "amount", "note"]


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(source="fin_lines", many=True, read_only=True)

    class Meta:
        model  = JournalEntry
        fields = [
            "id", "date", "description", "source_type", "source_ref",
            "project", "created_by", "created_at", "lines",
        ]
        read_only_fields = ["id", "created_at", "lines"]
