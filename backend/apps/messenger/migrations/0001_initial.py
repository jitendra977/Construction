from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatConversation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("conversation_type", models.CharField(choices=[("direct", "Direct"), ("group", "Group")], default="direct", max_length=16)),
                ("title", models.CharField(blank=True, max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_conversations_created", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "chat_conversations", "ordering": ["-updated_at"]},
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("text", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("conversation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="messenger.chatconversation")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_messages_sent", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "chat_messages", "ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="CallSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("call_type", models.CharField(choices=[("audio", "Audio"), ("video", "Video")], default="audio", max_length=16)),
                ("status", models.CharField(choices=[("ringing", "Ringing"), ("ongoing", "Ongoing"), ("ended", "Ended")], default="ringing", max_length=16)),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("ended_at", models.DateTimeField(blank=True, null=True)),
                ("conversation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="calls", to="messenger.chatconversation")),
                ("initiated_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="calls_initiated", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "chat_call_sessions", "ordering": ["-started_at"]},
        ),
        migrations.CreateModel(
            name="ChatConversationMember",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("admin", "Admin"), ("manager", "Manager"), ("member", "Member")], default="member", max_length=16)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("conversation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="members", to="messenger.chatconversation")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_memberships", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "chat_conversation_members", "unique_together": {("conversation", "user")}},
        ),
    ]
