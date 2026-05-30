from rest_framework import serializers
from .models import TelegramSettings

class TelegramSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelegramSettings
        fields = ['bot_token', 'is_active', 'webhook_url', 'updated_at']
        read_only_fields = ['updated_at', 'webhook_url']
