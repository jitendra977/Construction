import uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


def populate_qr_tokens(apps, schema_editor):
    """Assign a unique UUID to every existing AttendanceWorker row."""
    AttendanceWorker = apps.get_model('attendance', 'AttendanceWorker')
    for worker in AttendanceWorker.objects.all():
        worker.qr_token = uuid.uuid4()
        worker.save(update_fields=['qr_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0002_attendanceworker_project_member'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── Step 1: add qr_token as nullable (no UNIQUE yet) ─────────────────
        # SQLite cannot add a UNIQUE column with a callable default in a single
        # ALTER TABLE — it would copy all rows with the same UUID and then fail
        # the constraint. We add it nullable first, populate, then constrain.
        migrations.AddField(
            model_name='attendanceworker',
            name='qr_token',
            field=models.UUIDField(
                null=True,
                blank=True,
                editable=False,
                help_text='Unique token embedded in QR badge. Scan to mark check-in/out.',
            ),
        ),

        # ── Step 2: fill every existing row with a distinct UUID ──────────────
        migrations.RunPython(populate_qr_tokens, migrations.RunPython.noop),

        # ── Step 3: add the UNIQUE constraint + make non-nullable ─────────────
        migrations.AlterField(
            model_name='attendanceworker',
            name='qr_token',
            field=models.UUIDField(
                default=uuid.uuid4,
                unique=True,
                editable=False,
                help_text='Unique token embedded in QR badge. Scan to mark check-in/out.',
            ),
        ),

        # ── Step 4: create QRScanLog table ────────────────────────────────────
        migrations.CreateModel(
            name='QRScanLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scan_type', models.CharField(
                    choices=[('CHECK_IN', 'Check In'), ('CHECK_OUT', 'Check Out'), ('IGNORED', 'Ignored (already complete)')],
                    max_length=10,
                )),
                ('scanned_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('note', models.CharField(blank=True, max_length=200)),
                ('attendance', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='scan_logs',
                    to='attendance.dailyattendance',
                )),
                ('scanned_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='qr_scans_performed',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('worker', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='qr_scan_logs',
                    to='attendance.attendanceworker',
                )),
            ],
            options={'ordering': ['-scanned_at']},
        ),
    ]
