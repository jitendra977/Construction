from django.contrib.auth import get_user_model
from django.db.models import Q
from django.db import OperationalError, IntegrityError
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ChatConversation, ChatConversationMember, ChatMessage, CallSession, ChatPresence
from .serializers import (
    CallSessionSerializer,
    ChatConversationSerializer,
    ChatMessageSerializer,
    ChatUserSerializer,
    StartDirectConversationSerializer,
)

User = get_user_model()


def touch_presence(user, force=False):
    """
    Best-effort presence update.
    SQLite can lock under concurrent writes; never let presence crash chat APIs.
    """
    now = timezone.now()
    try:
        presence = ChatPresence.objects.filter(user=user).only("id", "last_seen_at").first()
    except OperationalError:
        return

    if presence and not force:
        # Throttle writes to reduce DB lock contention.
        if (now - presence.last_seen_at).total_seconds() < 20:
            return

    try:
        if presence:
            ChatPresence.objects.filter(pk=presence.pk).update(last_seen_at=now)
        else:
            ChatPresence.objects.create(user=user, last_seen_at=now)
    except IntegrityError:
        # Row may be created concurrently in another request.
        try:
            ChatPresence.objects.filter(user=user).update(last_seen_at=now)
        except OperationalError:
            return
    except OperationalError:
        return


class TeamMemberViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatUserSerializer

    def get_queryset(self):
        q = (self.request.query_params.get("q") or "").strip()
        touch_presence(self.request.user)
        # Chat should be available to all users in the system, not role-limited.
        queryset = User.objects.exclude(id=self.request.user.id).select_related("chat_presence")
        if q:
            queryset = queryset.filter(
                Q(username__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(email__icontains=q)
            )
        return queryset.order_by("first_name", "username")

    @action(detail=False, methods=["post"], url_path="presence-heartbeat")
    def presence_heartbeat(self, request):
        touch_presence(request.user, force=True)
        return Response({"ok": True, "ts": timezone.now()})


class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatConversationSerializer

    def get_queryset(self):
        touch_presence(self.request.user)
        return ChatConversation.objects.filter(members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        touch_presence(self.request.user)
        conversation = serializer.save(created_by=self.request.user)
        ChatConversationMember.objects.get_or_create(
            conversation=conversation,
            user=self.request.user,
            defaults={"role": ChatConversationMember.ROLE_ADMIN},
        )

    @action(detail=False, methods=["post"], url_path="start-direct")
    def start_direct(self, request):
        touch_presence(request.user)
        payload = StartDirectConversationSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        target_id = payload.validated_data["user_id"]

        if target_id == request.user.id:
            return Response({"detail": "Cannot start chat with yourself"}, status=status.HTTP_400_BAD_REQUEST)

        existing = (
            ChatConversation.objects.filter(conversation_type=ChatConversation.CONVERSATION_DIRECT)
            .filter(members__user=request.user)
            .filter(members__user_id=target_id)
            .distinct()
            .first()
        )
        if existing:
            return Response(ChatConversationSerializer(existing).data)

        conversation = ChatConversation.objects.create(
            conversation_type=ChatConversation.CONVERSATION_DIRECT,
            created_by=request.user,
            title="",
        )
        ChatConversationMember.objects.create(conversation=conversation, user=request.user, role=ChatConversationMember.ROLE_ADMIN)
        ChatConversationMember.objects.create(conversation=conversation, user_id=target_id, role=ChatConversationMember.ROLE_MEMBER)
        return Response(ChatConversationSerializer(conversation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="messages")
    def messages(self, request, pk=None):
        touch_presence(request.user)
        conversation = self.get_object()

        if request.method == "GET":
            since = request.query_params.get("since")
            qs = conversation.messages.select_related("sender").all()
            if since:
                qs = qs.filter(created_at__gt=since)
            return Response(ChatMessageSerializer(qs, many=True, context={"request": request}).data)

        serializer = ChatMessageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        message = ChatMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            text=serializer.validated_data.get("text", ""),
            image=serializer.validated_data.get("image"),
        )
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=["updated_at"])
        return Response(ChatMessageSerializer(message, context={"request": request}).data, status=status.HTTP_201_CREATED)


class CallSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CallSessionSerializer

    def get_queryset(self):
        touch_presence(self.request.user)
        return CallSession.objects.filter(conversation__members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        touch_presence(self.request.user)
        serializer.save(initiated_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        touch_presence(request.user)
        call = self.get_object()
        call.status = CallSession.STATUS_ONGOING
        call.save(update_fields=["status"])
        return Response(CallSessionSerializer(call).data)

    @action(detail=True, methods=["post"], url_path="end")
    def end(self, request, pk=None):
        touch_presence(request.user)
        call = self.get_object()
        call.status = CallSession.STATUS_ENDED
        call.ended_at = timezone.now()
        call.save(update_fields=["status", "ended_at"])
        return Response(CallSessionSerializer(call).data)
