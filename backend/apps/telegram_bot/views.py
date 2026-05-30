import requests
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import TelegramSettings
from .serializers import TelegramSettingsSerializer

class TelegramSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = TelegramSettingsSerializer
    permission_classes = [permissions.IsAdminUser] # Only admins can configure telegram bot

    def get_object(self):
        return TelegramSettings.get_settings()

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # When token is provided and it is set to active, try to register the webhook
        if instance.is_active and instance.bot_token:
            # Reconstruct the webhook URL based on the current request
            request = self.request
            domain = request.get_host()
            scheme = request.scheme # 'http' or 'https'
            
            # Note: Telegram requires HTTPS for webhooks. In local dev, this might fail unless using ngrok.
            webhook_url = f"{scheme}://{domain}/api/v1/telegram-bot/webhook/"
            instance.webhook_url = webhook_url
            instance.save(update_fields=['webhook_url'])
            
            # Call Telegram API to set the webhook
            telegram_api_url = f"https://api.telegram.org/bot{instance.bot_token}/setWebhook"
            try:
                response = requests.post(telegram_api_url, data={'url': webhook_url})
                if not response.json().get('ok'):
                    # Could not set webhook, maybe invalid token or not HTTPS
                    print("Error setting webhook:", response.json())
            except Exception as e:
                print("Exception setting webhook:", str(e))
                
        elif not instance.is_active and instance.bot_token:
            # Delete webhook
            telegram_api_url = f"https://api.telegram.org/bot{instance.bot_token}/deleteWebhook"
            try:
                requests.post(telegram_api_url)
                instance.webhook_url = ''
                instance.save(update_fields=['webhook_url'])
            except:
                pass


from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

class TelegramWebhookView(APIView):
    permission_classes = [AllowAny] # Telegram API needs to POST here without auth

    def post(self, request, *args, **kwargs):
        data = request.data
        
        # Check if it's a message
        if 'message' in data:
            message = data['message']
            chat_id = message.get('chat', {}).get('id')
            text = message.get('text', '')
            
            # Handle /start command
            if text.startswith('/start'):
                settings = TelegramSettings.get_settings()
                if settings.is_active:
                    settings.notification_chat_id = str(chat_id)
                    settings.save(update_fields=['notification_chat_id'])
                    
                    # Send a welcome message back to the chat
                    if settings.bot_token:
                        telegram_api_url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
                        payload = {
                            'chat_id': chat_id,
                            'text': "✅ ConstructPro: Successfully connected! You will now receive notifications here."
                        }
                        try:
                            requests.post(telegram_api_url, json=payload)
                        except Exception as e:
                            print("Error sending welcome message:", e)
        
        return Response({"status": "ok"}, status=status.HTTP_200_OK)

