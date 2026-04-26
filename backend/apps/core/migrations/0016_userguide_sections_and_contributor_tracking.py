# Generated manually — adds UserGuideSection model and added_by / created_at
# contributor-tracking fields to UserGuideStep and UserGuideFAQ.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0015_remove_projectmember_unique_project_user_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── UserGuideStep — add contributor tracking ──────────────────────────
        migrations.AddField(
            model_name='userguidestep',
            name='added_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='guide_steps_added',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='userguidestep',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AlterField(
            model_name='userguidestep',
            name='text_ne',
            field=models.TextField(blank=True),
        ),
        migrations.AlterModelOptions(
            name='userguidestep',
            options={'ordering': ['order', 'created_at']},
        ),

        # ── UserGuideFAQ — add contributor tracking ───────────────────────────
        migrations.AddField(
            model_name='userguidefaq',
            name='added_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='guide_faqs_added',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='userguidefaq',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AlterField(
            model_name='userguidefaq',
            name='question_ne',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='userguidefaq',
            name='answer_ne',
            field=models.TextField(blank=True),
        ),
        migrations.AlterModelOptions(
            name='userguidefaq',
            options={'ordering': ['order', 'created_at']},
        ),

        # ── UserGuideSection — new model ──────────────────────────────────────
        migrations.CreateModel(
            name='UserGuideSection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('section_type', models.CharField(
                    choices=[
                        ('tip',     '💡 Tip'),
                        ('warning', '⚠️ Warning'),
                        ('note',    '📝 Note'),
                        ('trick',   '🎯 Pro Trick'),
                        ('custom',  '📌 Custom'),
                    ],
                    default='note', max_length=20,
                )),
                ('title_en',   models.CharField(max_length=200)),
                ('title_ne',   models.CharField(blank=True, max_length=200)),
                ('content_en', models.TextField()),
                ('content_ne', models.TextField(blank=True)),
                ('order',      models.PositiveIntegerField(default=0)),
                ('is_approved', models.BooleanField(default=True)),
                ('created_at',  models.DateTimeField(auto_now_add=True)),
                ('updated_at',  models.DateTimeField(auto_now=True)),
                ('guide', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sections',
                    to='core.userguide',
                )),
                ('added_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='guide_sections_added',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Guide Section',
                'verbose_name_plural': 'Guide Sections',
                'ordering': ['order', 'created_at'],
            },
        ),
    ]
