import os
import django
from django.core.files.uploadedfile import SimpleUploadedFile

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.tasks.models import Task, TaskMedia
from apps.core.models import ConstructionPhase
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()

print("Creating dummy TaskMedia objects...")

# 1. Create a dummy image file
dummy_img_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff\x3f\x00\x05\xfe\x02\xfe\xa7\x35\x81\x84\x00\x00\x00\x00IEND\xaeB`\x82'

# 2. Get some tasks
tasks = Task.objects.all()[:3]

# Create media attached to tasks
for task in tasks:
    img = SimpleUploadedFile("dummy.png", dummy_img_content, content_type="image/png")
    tm = TaskMedia.objects.create(
        task=task,
        media_type='IMAGE',
        file=img,
        description=f"Test image for {task.title}"
    )
    print(f"Created TaskMedia for Task: {task.title} (ID: {tm.id})")

# 3. Create a Telegram dummy upload (no task)
img2 = SimpleUploadedFile("telegram_dummy.png", dummy_img_content, content_type="image/png")
tm_bot = TaskMedia.objects.create(
    task=None,
    media_type='IMAGE',
    file=img2,
    description="Uploaded via Telegram Bot"
)
print(f"Created orphaned TaskMedia (Telegram Bot) (ID: {tm_bot.id})")

print("Done!")
