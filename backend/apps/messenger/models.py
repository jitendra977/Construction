from django.conf import settings
from django.db import models
from django.utils import timezone

def chat_image_upload_path(instance, filename):
    return f"chat/{instance.conversation_id}/{filename}"


class ChatConversation(models.Model):
    CONVERSATION_DIRECT = "direct"
    CONVERSATION_GROUP = "group"
    TYPE_CHOICES = [
        (CONVERSATION_DIRECT, "Direct"),
        (CONVERSATION_GROUP, "Group"),
    ]

    conversation_type = models.CharField(max_length=16, choices=TYPE_CHOICES, default=CONVERSATION_DIRECT)
    title = models.CharField(max_length=120, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_conversations_created")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "chat_conversations"
        ordering = ["-updated_at"]


class ChatConversationMember(models.Model):
    ROLE_ADMIN = "admin"
    ROLE_MANAGER = "manager"
    ROLE_MEMBER = "member"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Admin"),
        (ROLE_MANAGER, "Manager"),
        (ROLE_MEMBER, "Member"),
    ]

    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_memberships")
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_conversation_members"
        unique_together = ("conversation", "user")


class ChatMessage(models.Model):
    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages_sent")
    text = models.TextField(blank=True, default="")
    image = models.ImageField(upload_to=chat_image_upload_path, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_messages"
        ordering = ["created_at"]


class CallSession(models.Model):
    STATUS_RINGING = "ringing"
    STATUS_ONGOING = "ongoing"
    STATUS_ENDED = "ended"
    STATUS_CHOICES = [
        (STATUS_RINGING, "Ringing"),
        (STATUS_ONGOING, "Ongoing"),
        (STATUS_ENDED, "Ended"),
    ]

    CALL_AUDIO = "audio"
    CALL_VIDEO = "video"
    CALL_CHOICES = [
        (CALL_AUDIO, "Audio"),
        (CALL_VIDEO, "Video"),
    ]

    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name="calls")
    initiated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="calls_initiated")
    call_type = models.CharField(max_length=16, choices=CALL_CHOICES, default=CALL_AUDIO)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_RINGING)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "chat_call_sessions"
        ordering = ["-started_at"]


class ChatPresence(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_presence")
    last_seen_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "chat_presence"
