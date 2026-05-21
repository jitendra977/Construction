# Vendor, PhaseBudgetLine, BudgetRevision adopted from the accounting app.
# DB tables already exist in PostgreSQL, but may not exist in SQLite or a fresh test DB.
# This migration dynamically checks and creates them if needed.

from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
from django.db import connection
import django.db.models.deletion
import uuid

# Check if tables already exist in the database
try:
    with connection.cursor() as cursor:
        _tables = connection.introspection.table_names(cursor)
except Exception:
    _tables = []

_has_vendor = 'accounting_vendor' in _tables

_db_ops = []
if not _has_vendor:
    _db_ops = [
        migrations.CreateModel(
            name='Vendor',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('phone', models.CharField(blank=True, max_length=50, null=True)),
                ('address', models.CharField(blank=True, max_length=500, null=True)),
                ('pan_number', models.CharField(blank=True, help_text='PAN/VAT registration number', max_length=20, null=True)),
                ('category', models.CharField(blank=True, help_text='e.g. Civil Contractor, Electrical, Material Supplier, Labor', max_length=50, null=True)),
                ('contact_person', models.CharField(blank=True, max_length=100, null=True)),
                ('email', models.EmailField(blank=True, max_length=254, null=True)),
                ('photo', models.ImageField(blank=True, null=True, upload_to='vendors/')),
                ('bank_name', models.CharField(blank=True, max_length=100, null=True)),
                ('account_number', models.CharField(blank=True, max_length=50, null=True)),
                ('branch', models.CharField(blank=True, max_length=100, null=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Vendor',
                'verbose_name_plural': 'Vendors',
                'db_table': 'accounting_vendor',
            },
        ),
        migrations.CreateModel(
            name='PhaseBudgetLine',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('budgeted_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=15)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('phase', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fin_budgets', to='core.constructionphase')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fin_budgets', to='core.houseproject')),
            ],
            options={
                'db_table': 'accounting_phasebudgetline',
                'ordering': ['phase__order'],
                'unique_together': {('project', 'phase')},
            },
        ),
        migrations.CreateModel(
            name='BudgetRevision',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('previous_amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('new_amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('reason', models.CharField(max_length=500)),
                ('budget_line', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='revisions', to='financials.phasebudgetline')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'accounting_budgetrevision',
            },
        ),
    ]


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_emaillog_material_switch_to_resource'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('financials', '0005_contractorcontract_document'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='Vendor',
                    fields=[
                        ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                        ('name', models.CharField(max_length=255)),
                        ('phone', models.CharField(blank=True, max_length=50, null=True)),
                        ('address', models.CharField(blank=True, max_length=500, null=True)),
                        ('pan_number', models.CharField(blank=True, help_text='PAN/VAT registration number', max_length=20, null=True)),
                        ('category', models.CharField(blank=True, help_text='e.g. Civil Contractor, Electrical, Material Supplier, Labor', max_length=50, null=True)),
                        ('contact_person', models.CharField(blank=True, max_length=100, null=True)),
                        ('email', models.EmailField(blank=True, max_length=254, null=True)),
                        ('photo', models.ImageField(blank=True, null=True, upload_to='vendors/')),
                        ('bank_name', models.CharField(blank=True, max_length=100, null=True)),
                        ('account_number', models.CharField(blank=True, max_length=50, null=True)),
                        ('branch', models.CharField(blank=True, max_length=100, null=True)),
                        ('is_active', models.BooleanField(default=True)),
                    ],
                    options={
                        'verbose_name': 'Vendor',
                        'verbose_name_plural': 'Vendors',
                        'db_table': 'accounting_vendor',
                    },
                ),
                migrations.CreateModel(
                    name='PhaseBudgetLine',
                    fields=[
                        ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                        ('budgeted_amount', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=15)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('phase', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fin_budgets', to='core.constructionphase')),
                        ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fin_budgets', to='core.houseproject')),
                    ],
                    options={
                        'db_table': 'accounting_phasebudgetline',
                        'ordering': ['phase__order'],
                        'unique_together': {('project', 'phase')},
                    },
                ),
                migrations.CreateModel(
                    name='BudgetRevision',
                    fields=[
                        ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                        ('date', models.DateTimeField(auto_now_add=True)),
                        ('previous_amount', models.DecimalField(decimal_places=2, max_digits=15)),
                        ('new_amount', models.DecimalField(decimal_places=2, max_digits=15)),
                        ('reason', models.CharField(max_length=500)),
                        ('budget_line', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='revisions', to='financials.phasebudgetline')),
                        ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'db_table': 'accounting_budgetrevision',
                    },
                ),
            ],
            database_operations=_db_ops,
        ),
    ]
