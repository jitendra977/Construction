from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_alter_userguide_options_userguide_order'),
        ('finance', '0001_initial'),
        ('resources', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email_type', models.CharField(choices=[('PAYMENT_RECEIPT', 'Payment Receipt'), ('PURCHASE_ORDER', 'Purchase Order'), ('CONTRACTOR_NOTIFICATION', 'Contractor Notification'), ('OTHER', 'Other')], max_length=30)),
                ('status', models.CharField(choices=[('SENT', 'Sent'), ('FAILED', 'Failed')], default='SENT', max_length=10)),
                ('recipient_name', models.CharField(max_length=200)),
                ('recipient_email', models.EmailField(max_length=254)),
                ('subject', models.CharField(max_length=500)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('payment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='email_logs', to='finance.payment')),
                ('expense', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='email_logs', to='finance.expense')),
                ('material', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='email_logs', to='resources.material')),
                ('sent_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_emails', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Email Log',
                'verbose_name_plural': 'Email Logs',
                'ordering': ['-created_at'],
            },
        ),
    ]
