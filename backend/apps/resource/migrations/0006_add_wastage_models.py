from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('resource', '0005_stockmovement_delivered_by_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='WastageThreshold',
            fields=[
                ('id',              models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('warning_pct',     models.FloatField(default=8.0)),
                ('critical_pct',    models.FloatField(default=15.0)),
                ('notify_owner',    models.BooleanField(default=True)),
                ('notify_engineer', models.BooleanField(default=True)),
                ('material',        models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='thresholds',
                    to='resource.material',
                )),
            ],
            options={
                'verbose_name':        'Wastage Threshold',
                'verbose_name_plural': 'Wastage Thresholds',
            },
        ),
        migrations.CreateModel(
            name='WastageAlert',
            fields=[
                ('id',            models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('severity',      models.CharField(choices=[('WARNING', 'Warning'), ('CRITICAL', 'Critical')], max_length=10)),
                ('wastage_pct',   models.FloatField()),
                ('is_resolved',   models.BooleanField(default=False)),
                ('resolved_note', models.TextField(blank=True, null=True)),
                ('created_at',    models.DateTimeField(auto_now_add=True)),
                ('material',      models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='alerts',
                    to='resource.material',
                )),
                ('threshold',     models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='resource.wastagethreshold',
                )),
                ('transaction',   models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='resource.stockmovement',
                )),
            ],
            options={
                'verbose_name':        'Wastage Alert',
                'verbose_name_plural': 'Wastage Alerts',
                'ordering':            ['-created_at'],
            },
        ),
    ]
