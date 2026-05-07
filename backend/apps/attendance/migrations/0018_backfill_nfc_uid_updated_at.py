"""
Backfill nfc_uid_updated_at for workers who already have an NFC UID but whose
timestamp is NULL (because the field didn't exist when the UID was assigned).

We set it to 2000-01-01 — a deliberately old date so that any subsequent
"Push All" or "Push Worker" call (which stamps last_push_at = now()) will
satisfy  last_push_at > nfc_uid_updated_at  and correctly flip the badge to
"✅ On Device" without the user having to change anything.
"""
from django.db import migrations
from django.utils.timezone import make_aware
from datetime import datetime


EPOCH = make_aware(datetime(2000, 1, 1))


def backfill_nfc_uid_updated_at(apps, schema_editor):
    AttendanceWorker = apps.get_model("attendance", "AttendanceWorker")
    updated = AttendanceWorker.objects.filter(
        nfc_uid__isnull=False,
        nfc_uid_updated_at__isnull=True,
    ).exclude(nfc_uid="").update(nfc_uid_updated_at=EPOCH)
    print(f"  → backfilled nfc_uid_updated_at for {updated} worker(s)")


def reverse_backfill(apps, schema_editor):
    # Only undo records we set to EPOCH — don't touch any that were legitimately set later
    AttendanceWorker = apps.get_model("attendance", "AttendanceWorker")
    AttendanceWorker.objects.filter(nfc_uid_updated_at=EPOCH).update(nfc_uid_updated_at=None)


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0017_alter_attendanceworker_nfc_uid_updated_at_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_nfc_uid_updated_at, reverse_code=reverse_backfill),
    ]
