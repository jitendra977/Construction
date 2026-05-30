from django.db import models
from django.core.exceptions import ValidationError

class TelegramSettings(models.Model):
    """
    Singleton model to store Telegram Bot configuration from the Frontend Admin.
    """
    bot_token = models.CharField(max_length=255, blank=True, null=True, help_text="The API Token from @BotFather")
    is_active = models.BooleanField(default=False, help_text="Whether the bot integration is active")
    webhook_url = models.URLField(max_length=500, blank=True, null=True, help_text="The URL registered with Telegram for webhooks")
    notification_chat_id = models.CharField(max_length=50, blank=True, null=True, help_text="The Telegram Chat ID to send notifications to")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Telegram Settings"
        verbose_name_plural = "Telegram Settings"

    def save(self, *args, **kwargs):
        if not self.pk and TelegramSettings.objects.exists():
            raise ValidationError('There can only be one TelegramSettings instance.')
        return super(TelegramSettings, self).save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Telegram Integration Settings"
