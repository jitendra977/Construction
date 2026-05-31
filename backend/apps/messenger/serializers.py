from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ChatConversation, ChatConversationMember, ChatMessage, CallSession

User = get_user_model()


class ChatUserSerializer(serializers.ModelSerializer):
    is_online = serializers.SerializerMethodField()
    last_seen_at = serializers.SerializerMethodField()
    role_label = serializers.SerializerMethodField()
    is_system_admin = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "profile_image_url",
            "is_online",
            "last_seen_at",
            "role_label",
            "is_system_admin",
        ]

    def _presence(self, obj):
        return getattr(obj, "chat_presence", None)

    def get_last_seen_at(self, obj):
        presence = self._presence(obj)
        return presence.last_seen_at if presence else None

    def get_is_online(self, obj):
        presence = self._presence(obj)
        if not presence:
            return False
        # Keep a wider window to avoid false "offline" due to network jitter.
        return presence.last_seen_at >= timezone.now() - timedelta(seconds=120)

    def get_role_label(self, obj):
        if getattr(obj, "role", None):
            return obj.role.name or obj.role.code
        return ""

    def get_is_system_admin(self, obj):
        return bool(getattr(obj, "is_system_admin", False))

    def get_profile_image_url(self, obj):
        if not getattr(obj, "profile_image", None):
            return ""
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.profile_image.url)
        return obj.profile_image.url


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = ChatUserSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ["id", "conversation", "sender", "text", "image", "image_url", "created_at"]
        read_only_fields = ["id", "sender", "created_at"]
        extra_kwargs = {"text": {"required": False, "allow_blank": True}}

    def get_image_url(self, obj):
        if not obj.image:
            return ""
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def validate(self, attrs):
        text = (attrs.get("text") or "").strip()
        image = attrs.get("image")
        if not text and not image:
            raise serializers.ValidationError("Either text or image is required.")
        return attrs


class ChatConversationMemberSerializer(serializers.ModelSerializer):
    user = ChatUserSerializer(read_only=True)

    class Meta:
        model = ChatConversationMember
        fields = ["id", "conversation", "user", "role", "joined_at"]


class ChatConversationSerializer(serializers.ModelSerializer):
    members = ChatConversationMemberSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = [
            "id",
            "conversation_type",
            "title",
            "created_by",
            "created_at",
            "updated_at",
            "members",
            "last_message",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "members", "last_message"]

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return ChatMessageSerializer(msg).data


class StartDirectConversationSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()

    def validate_user_id(self, value):
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User not found")
        return value


class CallSessionSerializer(serializers.ModelSerializer):
    initiated_by = ChatUserSerializer(read_only=True)

    class Meta:
        model = CallSession
        fields = ["id", "conversation", "initiated_by", "call_type", "status", "started_at", "ended_at"]
        read_only_fields = ["id", "initiated_by", "started_at", "ended_at"]
