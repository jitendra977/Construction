from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AttendanceWorker',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('trade', models.CharField(choices=[('MASON', 'Mason (Dakarmi)'), ('HELPER', 'Helper (Jugi)'), ('CARPENTER', 'Carpenter (Mistri)'), ('ELECTRICIAN', 'Electrician'), ('PLUMBER', 'Plumber'), ('PAINTER', 'Painter'), ('STEEL_FIXER', 'Steel Fixer (Lohari)'), ('SUPERVISOR', 'Site Supervisor'), ('TILE_SETTER', 'Tile Setter'), ('EXCAVATOR', 'Excavator Operator'), ('WATERPROOF', 'Waterproofing Applicator'), ('DRIVER', 'Driver'), ('SECURITY', 'Security Guard'), ('ENGINEER', 'Engineer'), ('ACCOUNTANT', 'Accountant'), ('MANAGER', 'Project Manager'), ('OTHER', 'Other')], default='OTHER', max_length=20)),
                ('worker_type', models.CharField(choices=[('LABOUR', 'Daily Labour'), ('STAFF', 'Salaried Staff')], default='LABOUR', max_length=10)),
                ('daily_rate', models.DecimalField(decimal_places=2, default=0, help_text='Daily wage rate in NPR', max_digits=10)),
                ('overtime_rate_per_hour', models.DecimalField(decimal_places=2, default=0, help_text='Overtime rate per hour in NPR (0 = auto 1.5x daily/8h)', max_digits=10)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('address', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('joined_date', models.DateField(blank=True, null=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attendance_workers', to='core.houseproject')),
                ('linked_user', models.ForeignKey(blank=True, help_text='Link to system user account (for staff)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='attendance_worker_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['name'],
                'unique_together': {('project', 'name')},
            },
        ),
        migrations.CreateModel(
            name='DailyAttendance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('status', models.CharField(choices=[('PRESENT', 'Present'), ('ABSENT', 'Absent'), ('HALF_DAY', 'Half Day'), ('LEAVE', 'Leave'), ('HOLIDAY', 'Holiday')], default='PRESENT', max_length=10)),
                ('check_in', models.TimeField(blank=True, null=True)),
                ('check_out', models.TimeField(blank=True, null=True)),
                ('overtime_hours', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('daily_rate_snapshot', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('overtime_rate_snapshot', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('worker', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attendance_records', to='attendance.attendanceworker')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='daily_attendances', to='core.houseproject')),
                ('recorded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='attendance_records_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-date', 'worker__name'],
                'unique_together': {('worker', 'date')},
            },
        ),
    ]
