# Safe no-op version for fresh PostgreSQL deployment
# Original migration linked contractors to users — not needed on a clean database
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('resources', '0004_contractor_user'),
        ('accounts', '0002_activitylog_role_alter_user_options_user_address_and_more'),
    ]

    operations = [
        migrations.RunPython(migrations.RunPython.noop, migrations.RunPython.noop),
    ]
