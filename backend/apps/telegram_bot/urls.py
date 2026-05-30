from django.urls import path
from .views import TelegramSettingsView, TelegramWebhookView

urlpatterns = [
    path('settings/', TelegramSettingsView.as_view(), name='telegram-settings'),
    path('webhook/', TelegramWebhookView.as_view(), name='telegram-webhook'),
]
