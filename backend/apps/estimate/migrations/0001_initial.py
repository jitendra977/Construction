import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("core", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── MaterialRate ──────────────────────────────────────────────────────
        migrations.CreateModel(
            name="MaterialRate",
            fields=[
                ("id",        models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("key",       models.CharField(max_length=50, unique=True)),
                ("name",      models.CharField(max_length=150)),
                ("category",  models.CharField(max_length=15, choices=[
                    ("CEMENT","Cement"),("SAND","Sand"),("AGGREGATE","Aggregate / Gitti"),
                    ("BRICK","Brick / Itta"),("STEEL","Steel / Rod"),("PAINT","Paint"),
                    ("TILE","Tile / Flooring"),("PLUMBING","Plumbing Material"),
                    ("ELECTRICAL","Electrical Material"),("TIMBER","Timber / Wood"),
                    ("GLASS","Glass"),("WATERPROOF","Waterproofing"),("OTHER","Other"),
                ])),
                ("unit",      models.CharField(max_length=10, choices=[
                    ("BAG","Bag (50 kg)"),("CFT","Cubic Feet"),("M3","Cubic Metre"),
                    ("KG","Kilogram"),("TON","Metric Ton"),("PCS","Pieces"),
                    ("SQFT","Square Feet"),("SQM","Square Metre"),("LFT","Linear Feet"),
                    ("LM","Linear Metre"),("LITR","Litre"),("SET","Set"),
                ])),
                ("rate",      models.DecimalField(max_digits=12, decimal_places=2)),
                ("min_rate",  models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)),
                ("max_rate",  models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)),
                ("region",    models.CharField(max_length=60, default="Kathmandu")),
                ("is_active", models.BooleanField(default=True)),
                ("updated_at",models.DateTimeField(auto_now=True)),
                ("updated_by",models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="material_rate_updates", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["category", "name"]},
        ),
        # ── RateRevision ──────────────────────────────────────────────────────
        migrations.CreateModel(
            name="RateRevision",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("old_rate",   models.DecimalField(max_digits=12, decimal_places=2)),
                ("new_rate",   models.DecimalField(max_digits=12, decimal_places=2)),
                ("change_pct", models.DecimalField(max_digits=7, decimal_places=2)),
                ("reason",     models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("material",   models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                    related_name="revisions", to="estimate.materialrate")),
                ("noted_by",   models.ForeignKey(null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        # ── LaborRate ─────────────────────────────────────────────────────────
        migrations.CreateModel(
            name="LaborRate",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("trade",      models.CharField(max_length=20, unique=True, choices=[
                    ("MASON","Mason (Dakarmi)"),("HELPER","Helper (Jugi)"),
                    ("CARPENTER","Carpenter (Mistri)"),("ELECTRICIAN","Electrician"),
                    ("PLUMBER","Plumber"),("PAINTER","Painter"),
                    ("STEEL_FIXER","Steel Fixer (Lohari)"),("SUPERVISOR","Site Supervisor"),
                    ("TILE_SETTER","Tile Setter"),("EXCAVATOR","Excavator Operator"),
                    ("WATERPROOF","Waterproofing Applicator"),
                ])),
                ("daily_rate", models.DecimalField(max_digits=10, decimal_places=2)),
                ("region",     models.CharField(max_length=60, default="Kathmandu")),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["trade"]},
        ),
        # ── Estimate ─────────────────────────────────────────────────────────
        migrations.CreateModel(
            name="Estimate",
            fields=[
                ("id",               models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name",             models.CharField(max_length=200)),
                ("description",      models.TextField(blank=True)),
                ("status",           models.CharField(max_length=10, default="DRAFT", choices=[
                    ("DRAFT","Draft"),("FINAL","Finalized"),("APPROVED","Approved"),("ARCHIVED","Archived"),
                ])),
                ("quality_tier",     models.CharField(max_length=10, default="STANDARD", choices=[
                    ("ECONOMY","Economy"),("STANDARD","Standard"),("PREMIUM","Premium"),("LUXURY","Luxury"),
                ])),
                ("total_area_sqft",  models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ("floors",           models.PositiveSmallIntegerField(default=1)),
                ("bedrooms",         models.PositiveSmallIntegerField(default=2)),
                ("bathrooms",        models.PositiveSmallIntegerField(default=1)),
                ("include_mep",      models.BooleanField(default=True)),
                ("include_finishing",models.BooleanField(default=True)),
                ("contingency_pct",  models.DecimalField(max_digits=5, decimal_places=2, default=10)),
                ("material_total",   models.DecimalField(max_digits=14, decimal_places=2, default=0)),
                ("labor_total",      models.DecimalField(max_digits=14, decimal_places=2, default=0)),
                ("contingency_amount",models.DecimalField(max_digits=14, decimal_places=2, default=0)),
                ("grand_total",      models.DecimalField(max_digits=14, decimal_places=2, default=0)),
                ("notes",            models.TextField(blank=True)),
                ("created_at",       models.DateTimeField(auto_now_add=True)),
                ("updated_at",       models.DateTimeField(auto_now=True)),
                ("project",          models.ForeignKey(null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="estimates", to="core.houseproject")),
                ("created_by",       models.ForeignKey(null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="estimates", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        # ── EstimateSection ───────────────────────────────────────────────────
        migrations.CreateModel(
            name="EstimateSection",
            fields=[
                ("id",               models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name",             models.CharField(max_length=120)),
                ("phase_key",        models.CharField(max_length=30, blank=True, choices=[
                    ("site_prep","Site Preparation & Excavation"),
                    ("foundation","Foundation"),
                    ("superstructure","Superstructure (Slab / Beam / Column)"),
                    ("brickwork","Brickwork & Masonry"),
                    ("roofing","Roofing"),("plaster","Plastering"),
                    ("flooring","Flooring"),("painting","Painting & Finishing"),
                    ("doors_windows","Doors & Windows"),
                    ("mep","MEP (Electrical & Plumbing)"),("other","Miscellaneous"),
                ])),
                ("order",             models.PositiveSmallIntegerField(default=0)),
                ("material_subtotal", models.DecimalField(max_digits=14, decimal_places=2, default=0)),
                ("labor_subtotal",    models.DecimalField(max_digits=14, decimal_places=2, default=0)),
                ("subtotal",          models.DecimalField(max_digits=14, decimal_places=2, default=0)),
                ("estimate",          models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                    related_name="sections", to="estimate.estimate")),
            ],
            options={"ordering": ["order"]},
        ),
        # ── EstimateItem ──────────────────────────────────────────────────────
        migrations.CreateModel(
            name="EstimateItem",
            fields=[
                ("id",          models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("label",       models.CharField(max_length=200)),
                ("category",    models.CharField(max_length=15, choices=[
                    ("MATERIAL","Material"),("LABOR","Labor"),("EQUIPMENT","Equipment"),("OTHER","Other"),
                ])),
                ("rate_key",    models.CharField(max_length=50, blank=True)),
                ("quantity",    models.DecimalField(max_digits=12, decimal_places=3, default=0)),
                ("unit",        models.CharField(max_length=20)),
                ("unit_rate",   models.DecimalField(max_digits=12, decimal_places=2, default=0)),
                ("wastage_pct", models.DecimalField(max_digits=5, decimal_places=2, default=0)),
                ("total",       models.DecimalField(max_digits=14, decimal_places=2, default=0)),
                ("notes",       models.TextField(blank=True)),
                ("section",     models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                    related_name="items", to="estimate.estimatesection")),
            ],
            options={"ordering": ["id"]},
        ),
    ]
