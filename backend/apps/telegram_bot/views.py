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
            settings = TelegramSettings.get_settings()
            
            if not settings.is_active or not settings.bot_token:
                return Response({"status": "ok"}, status=status.HTTP_200_OK)

            # Handle /start command
            if text.startswith('/start'):
                settings.notification_chat_id = str(chat_id)
                settings.save(update_fields=['notification_chat_id'])
                
                # Send a welcome message back to the chat
                telegram_api_url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
                payload = {
                    'chat_id': chat_id,
                    'text': "✅ ConstructPro: Successfully connected! You will now receive notifications here."
                }
                try:
                    requests.post(telegram_api_url, json=payload)
                except Exception as e:
                    print("Error sending welcome message:", e)

            # Handle incoming media (photos, videos, documents)
            elif any(k in message for k in ['photo', 'video', 'document']):
                if 'photo' in message:
                    file_id = message['photo'][-1]['file_id']
                    media_type = 'IMAGE'
                    ext = 'jpg'
                    emoji = '📸 Photo'
                elif 'video' in message:
                    file_id = message['video']['file_id']
                    media_type = 'VIDEO'
                    ext = 'mp4'
                    emoji = '🎥 Video'
                else:
                    file_id = message['document']['file_id']
                    media_type = 'DOCUMENT'
                    mime = message['document'].get('mime_type', '')
                    ext = message['document'].get('file_name', 'file').split('.')[-1]
                    emoji = '📄 Document'
                    if 'image' in mime: media_type = 'IMAGE'
                    if 'video' in mime: media_type = 'VIDEO'

                caption = message.get('caption', 'Uploaded via Telegram')
                
                try:
                    # 1. Get file path from Telegram API
                    get_file_url = f"https://api.telegram.org/bot{settings.bot_token}/getFile?file_id={file_id}"
                    file_res = requests.get(get_file_url).json()
                    
                    if file_res.get('ok'):
                        file_path = file_res['result']['file_path']
                        # 2. Download the actual file
                        download_url = f"https://api.telegram.org/file/bot{settings.bot_token}/{file_path}"
                        img_res = requests.get(download_url)
                        
                        if img_res.status_code == 200:
                            # 3. Save it to TaskMedia
                            from django.core.files.base import ContentFile
                            from apps.tasks.models import TaskMedia
                            import uuid
                            
                            from_user = message.get('from', {})
                            first_name = from_user.get('first_name', '')
                            last_name = from_user.get('last_name', '')
                            uploader_name = f"{first_name} {last_name}".strip() or "Telegram User"

                            media = TaskMedia.objects.create(
                                media_type=media_type,
                                description=caption,
                                telegram_uploader_name=uploader_name
                            )
                            filename = f"telegram_{uuid.uuid4().hex[:8]}.{ext}"
                            media.file.save(filename, ContentFile(img_res.content))
                            
                            # 4. Run AI Photo Analysis synchronously
                            from apps.photo_intel.services.analyzer import analyze_task_media
                            from apps.photo_intel.services.phase_mapper import resolve_task_phase_key
                            from apps.photo_intel.constants import PHASE_UNKNOWN, PHASE_LABEL

                            analysis = None
                            detected_phase_key = PHASE_UNKNOWN
                            detected_phase_label = ""
                            phase_confidence = 0.0
                            ai_tags = []

                            if media_type == 'IMAGE':
                                try:
                                    analysis = analyze_task_media(media)
                                    detected_phase_key = analysis.detected_phase_key or PHASE_UNKNOWN
                                    detected_phase_label = analysis.detected_phase_label or ""
                                    phase_confidence = analysis.phase_confidence or 0.0
                                    ai_tags = analysis.tags[:5] if analysis.tags else []
                                except Exception as ai_err:
                                    print(f"AI analysis failed (non-fatal): {ai_err}")

                            # 5. Fetch Active Tasks for assignment — AI-prioritized
                            from apps.tasks.models import Task
                            from django.core.cache import cache

                            active_tasks = list(Task.objects.filter(
                                status__in=['PENDING', 'IN_PROGRESS']
                            ).select_related('phase').order_by('-updated_at')[:15])

                            if active_tasks:
                                # Sort: tasks matching AI-detected phase come first
                                recommended = []
                                others = []
                                for t in active_tasks:
                                    task_phase_key = resolve_task_phase_key(t)
                                    if detected_phase_key != PHASE_UNKNOWN and task_phase_key == detected_phase_key:
                                        recommended.append(t)
                                    else:
                                        others.append(t)

                                # Ordered task list: recommended first, then others (max 10 total)
                                ordered_tasks = (recommended + others)[:10]

                                # Save ordered task IDs in cache for 15 minutes
                                cache_key = f"telegram_pending_photo_{chat_id}"
                                cache.set(cache_key, {
                                    'media_id': media.id,
                                    'task_ids': [t.id for t in ordered_tasks]
                                }, timeout=900)

                                # Build the AI analysis header
                                ai_header = ""
                                if detected_phase_key != PHASE_UNKNOWN and phase_confidence >= 0.3:
                                    confidence_pct = int(phase_confidence * 100)
                                    ai_header = (
                                        f"🤖 AI Detected: {detected_phase_label} ({confidence_pct}% confidence)\n"
                                    )
                                    if ai_tags:
                                        ai_header += f"🏷️ Tags: {', '.join(ai_tags)}\n"
                                    ai_header += "\n"

                                # Build task list sections
                                task_lines = []
                                num = 1
                                if recommended:
                                    task_lines.append("🌟 Recommended Tasks:")
                                    for t in recommended:
                                        task_lines.append(f"  {num}. ✅ {t.title}")
                                        num += 1
                                    if others[:10 - len(recommended)]:
                                        task_lines.append("\nOther Active Tasks:")
                                        for t in others[:10 - len(recommended)]:
                                            task_lines.append(f"  {num}. {t.title}")
                                            num += 1
                                else:
                                    task_lines.append("Active Tasks:")
                                    for t in ordered_tasks:
                                        task_lines.append(f"  {num}. {t.title}")
                                        num += 1

                                task_list_text = "\n".join(task_lines)

                                reply_text = (
                                    f"✅ {emoji} saved by {uploader_name}!\n\n"
                                    f"{ai_header}"
                                    f"Which task is this for?\n\n"
                                    f"{task_list_text}\n\n"
                                    f"Reply with the number (or 0 for General Upload)."
                                )
                            else:
                                reply_text = f"✅ {emoji} successfully saved to ConstructPro!\nID: {media.id}"

                            reply_url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
                            requests.post(reply_url, json={
                                'chat_id': chat_id,
                                'text': reply_text
                            })
                except Exception as e:
                    print(f"Error downloading/saving telegram media: {e}")
                    error_url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
                    requests.post(error_url, json={
                        'chat_id': chat_id,
                        'text': f"❌ Failed to save {emoji.lower()} to ConstructPro."
                    })
            
            # Handle text responses for pending photo assignments
            elif text:
                from django.core.cache import cache
                from apps.tasks.models import TaskMedia, Task
                
                cache_key = f"telegram_pending_photo_{chat_id}"
                pending_state = cache.get(cache_key)
                
                if pending_state:
                    text_stripped = text.strip()
                    if text_stripped.isdigit():
                        choice = int(text_stripped)
                        media_id = pending_state['media_id']
                        task_ids = pending_state['task_ids']
                        
                        if choice == 0:
                            # User wants it as general photo
                            cache.delete(cache_key)
                            reply_url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
                            requests.post(reply_url, json={
                                'chat_id': chat_id,
                                'text': "✅ Saved as General Upload."
                            })
                        elif 1 <= choice <= len(task_ids):
                            # User selected a valid task
                            selected_task_id = task_ids[choice - 1]
                            try:
                                media = TaskMedia.objects.get(id=media_id)
                                task = Task.objects.get(id=selected_task_id)
                                media.task = task
                                media.save(update_fields=['task'])
                                
                                cache.delete(cache_key)
                                reply_url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
                                requests.post(reply_url, json={
                                    'chat_id': chat_id,
                                    'text': f"✅ Successfully assigned to:\n👷‍♂️ {task.title}"
                                })
                            except Exception as e:
                                print("Error updating media task:", e)
                                reply_url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
                                requests.post(reply_url, json={
                                    'chat_id': chat_id,
                                    'text': "❌ Error assigning file to task."
                                })
                        else:
                            # Invalid number
                            reply_url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
                            requests.post(reply_url, json={
                                'chat_id': chat_id,
                                'text': f"❌ Invalid number. Please reply with a number between 0 and {len(task_ids)}."
                            })
                    else:
                        # They have a pending state but didn't send a number. Ignore or warn.
                        # For simplicity, we just ignore standard chatter.
                        pass

        return Response({"status": "ok"}, status=status.HTTP_200_OK)

