"""
migrate_attendance_to_workforce.py
────────────────────────────────────
Reads every AttendanceWorker and creates a matching WorkforceMember,
then links them via the attendance_worker OneToOne field.

Rules
─────
• Idempotent: workers already linked (workforce_member exists) are skipped.
• Name splitting: "Ram Bahadur Mistri" → first="Ram Bahadur", last="Mistri"
  (splits on last space so hyphenated last names are preserved).
• worker_type mapping: AttendanceWorker.LABOUR → LABOUR, STAFF → STAFF.
• join_date: uses AttendanceWorker.joined_date if set, else today.
• created_by: set to the first superuser found; null if none.

Usage
─────
    # Dry-run (shows what would be created, touches nothing)
    python manage.py migrate_attendance_to_workforce --dry-run

    # Migrate all projects
    python manage.py migrate_attendance_to_workforce

    # Migrate a single project
    python manage.py migrate_attendance_to_workforce --project <id>

    # Force re-link even if already linked (re-creates member from scratch)
    python manage.py migrate_attendance_to_workforce --force
"""
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Migrate AttendanceWorker records → WorkforceMember, linking them bidirectionally.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--project', type=str, default=None,
            help='Only migrate workers belonging to this project ID.',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Preview what would be created without writing anything.',
        )
        parser.add_argument(
            '--force', action='store_true',
            help='Re-link workers even if they already have a workforce_member.',
        )

    def handle(self, *args, **options):
        from apps.attendance.models import AttendanceWorker
        from apps.workforce.models import WorkforceMember

        dry_run  = options['dry_run']
        force    = options['force']
        project  = options['project']

        # Find a superuser to set as created_by (best-effort)
        created_by = None
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            created_by = User.objects.filter(is_superuser=True).first()
        except Exception:
            pass

        qs = AttendanceWorker.objects.select_related('project', 'linked_user')
        if project:
            qs = qs.filter(project_id=project)

        if not force:
            # Skip workers that already have a linked workforce member
            already_linked = set(
                WorkforceMember.objects
                .filter(attendance_worker__isnull=False)
                .values_list('attendance_worker_id', flat=True)
            )
            qs = qs.exclude(id__in=already_linked)

        workers = list(qs)
        total   = len(workers)

        if total == 0:
            self.stdout.write(self.style.SUCCESS('Nothing to migrate — all workers already linked.'))
            return

        prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write(f'{prefix}Migrating {total} AttendanceWorker(s)…\n')

        created = skipped = errors = 0

        for aw in workers:
            try:
                # ── Split full name ───────────────────────────────────────────
                full_name = (aw.name or '').strip()
                if ' ' in full_name:
                    parts      = full_name.rsplit(' ', 1)
                    first_name = parts[0]
                    last_name  = parts[1]
                else:
                    first_name = full_name
                    last_name  = ''

                # ── Worker type mapping ───────────────────────────────────────
                wtype = 'LABOUR' if aw.worker_type == 'LABOUR' else 'STAFF'

                # ── Join date ─────────────────────────────────────────────────
                join_date = aw.joined_date or timezone.now().date()

                # ── Phone / email from linked user if available ───────────────
                phone = aw.phone or ''
                email = ''
                if aw.linked_user:
                    email = getattr(aw.linked_user, 'email', '') or ''

                row_info = (
                    f"  {'→' if not dry_run else '~'} "
                    f"'{full_name}' ({aw.get_trade_display()}) "
                    f"[project: {aw.project.name}]"
                )

                if dry_run:
                    self.stdout.write(row_info)
                    created += 1
                    continue

                # ── If force and member already exists, unlink it first ────────
                if force:
                    try:
                        existing = aw.workforce_member
                        if existing:
                            existing.attendance_worker = None
                            existing.save(update_fields=['attendance_worker', 'updated_at'])
                    except Exception:
                        pass

                # ── Create WorkforceMember ────────────────────────────────────
                member = WorkforceMember(
                    attendance_worker=aw,
                    account=aw.linked_user,
                    worker_type=wtype,
                    status='ACTIVE' if aw.is_active else 'INACTIVE',
                    join_date=join_date,
                    current_project=aw.project,
                    created_by=created_by,
                )
                # Use setters so _first_name / _last_name (db columns) are populated
                member.first_name = first_name
                member.last_name  = last_name
                member.phone      = phone
                member.email      = email
                member.save()

                self.stdout.write(self.style.SUCCESS(row_info))
                created += 1

            except Exception as exc:
                self.stdout.write(self.style.ERROR(
                    f'  ERROR for worker id={aw.id} name="{aw.name}": {exc}'
                ))
                errors += 1

        # ── Summary ───────────────────────────────────────────────────────────
        action = 'Would create' if dry_run else 'Created'
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}Done — {action}: {created} | Errors: {errors}'
        ))
        if dry_run:
            self.stdout.write('Run without --dry-run to apply changes.')
