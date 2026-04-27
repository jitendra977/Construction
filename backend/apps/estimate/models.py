"""
Advanced Estimator Models
─────────────────────────
MaterialRate    — live market rates per material key
RateRevision    — full audit history of every rate change
LaborRate       — daily rates per trade (mason, helper, carpenter …)
Estimate        — a saved project-level cost estimate
EstimateSection — named section within an estimate (foundation, MEP …)
EstimateItem    — individual line-item (material or labor) within a section
"""
from __future__ import annotations

from django.conf import settings
from django.db import models


# ─────────────────────────────────────────────────────────────────────────────
#  Material Rates
# ─────────────────────────────────────────────────────────────────────────────

class MaterialRate(models.Model):
    CATEGORY_CHOICES = [
        ("CEMENT",      "Cement"),
        ("SAND",        "Sand"),
        ("AGGREGATE",   "Aggregate / Gitti"),
        ("BRICK",       "Brick / Itta"),
        ("STEEL",       "Steel / Rod"),
        ("PAINT",       "Paint"),
        ("TILE",        "Tile / Flooring"),
        ("PLUMBING",    "Plumbing Material"),
        ("ELECTRICAL",  "Electrical Material"),
        ("TIMBER",      "Timber / Wood"),
        ("GLASS",       "Glass"),
        ("WATERPROOF",  "Waterproofing"),
        ("OTHER",       "Other"),
    ]
    UNIT_CHOICES = [
        ("BAG",  "Bag (50 kg)"),
        ("CFT",  "Cubic Feet"),
        ("M3",   "Cubic Metre"),
        ("KG",   "Kilogram"),
        ("TON",  "Metric Ton"),
        ("PCS",  "Pieces"),
        ("SQFT", "Square Feet"),
        ("SQM",  "Square Metre"),
        ("LFT",  "Linear Feet"),
        ("LM",   "Linear Metre"),
        ("LITR", "Litre"),
        ("SET",  "Set"),
    ]

    key          = models.CharField(max_length=50, unique=True,
                       help_text="Canonical key used in formulas e.g. CEMENT, ROD")
    name         = models.CharField(max_length=150)
    category     = models.CharField(max_length=15, choices=CATEGORY_CHOICES)
    unit         = models.CharField(max_length=10, choices=UNIT_CHOICES)
    rate         = models.DecimalField(max_digits=12, decimal_places=2,
                       help_text="Current market price in NPR")
    min_rate     = models.DecimalField(max_digits=12, decimal_places=2,
                       null=True, blank=True, help_text="Market low")
    max_rate     = models.DecimalField(max_digits=12, decimal_places=2,
                       null=True, blank=True, help_text="Market high")
    region       = models.CharField(max_length=60, default="Kathmandu")
    is_active    = models.BooleanField(default=True)
    updated_at   = models.DateTimeField(auto_now=True)
    updated_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="material_rate_updates",
    )

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.name} — NPR {self.rate}/{self.unit}"


class RateRevision(models.Model):
    """Audit log — created automatically when a MaterialRate.rate changes."""
    material    = models.ForeignKey(MaterialRate, on_delete=models.CASCADE,
                      related_name="revisions")
    old_rate    = models.DecimalField(max_digits=12, decimal_places=2)
    new_rate    = models.DecimalField(max_digits=12, decimal_places=2)
    change_pct  = models.DecimalField(max_digits=7, decimal_places=2)
    noted_by    = models.ForeignKey(settings.AUTH_USER_MODEL,
                      null=True, blank=True, on_delete=models.SET_NULL)
    reason      = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.material.name}: {self.old_rate} → {self.new_rate}"


# ─────────────────────────────────────────────────────────────────────────────
#  Labor Rates
# ─────────────────────────────────────────────────────────────────────────────

class LaborRate(models.Model):
    TRADE_CHOICES = [
        ("MASON",       "Mason (Dakarmi)"),
        ("HELPER",      "Helper (Jugi)"),
        ("CARPENTER",   "Carpenter (Mistri)"),
        ("ELECTRICIAN", "Electrician"),
        ("PLUMBER",     "Plumber"),
        ("PAINTER",     "Painter"),
        ("STEEL_FIXER", "Steel Fixer (Lohari)"),
        ("SUPERVISOR",  "Site Supervisor"),
        ("TILE_SETTER", "Tile Setter"),
        ("EXCAVATOR",   "Excavator Operator"),
        ("WATERPROOF",  "Waterproofing Applicator"),
    ]

    trade       = models.CharField(max_length=20, choices=TRADE_CHOICES, unique=True)
    daily_rate  = models.DecimalField(max_digits=10, decimal_places=2,
                      help_text="Rate per day in NPR")
    region      = models.CharField(max_length=60, default="Kathmandu")
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["trade"]

    def __str__(self):
        return f"{self.get_trade_display()} — NPR {self.daily_rate}/day"


# ─────────────────────────────────────────────────────────────────────────────
#  Saved Estimates
# ─────────────────────────────────────────────────────────────────────────────

class Estimate(models.Model):
    STATUS_CHOICES = [
        ("DRAFT",    "Draft"),
        ("FINAL",    "Finalized"),
        ("APPROVED", "Approved"),
        ("ARCHIVED", "Archived"),
    ]
    QUALITY_CHOICES = [
        ("ECONOMY",  "Economy"),
        ("STANDARD", "Standard"),
        ("PREMIUM",  "Premium"),
        ("LUXURY",   "Luxury"),
    ]

    # Linkage
    project     = models.ForeignKey(
        "core.HouseProject", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="estimates",
    )
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default="DRAFT")
    quality_tier = models.CharField(max_length=10, choices=QUALITY_CHOICES, default="STANDARD")

    # Project parameters (snapshot used when generating)
    total_area_sqft = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    floors          = models.PositiveSmallIntegerField(default=1)
    bedrooms        = models.PositiveSmallIntegerField(default=2)
    bathrooms       = models.PositiveSmallIntegerField(default=1)
    include_mep     = models.BooleanField(default=True)
    include_finishing = models.BooleanField(default=True)
    contingency_pct = models.DecimalField(max_digits=5, decimal_places=2, default=10)

    # Cached totals (recalculated on save)
    material_total      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    labor_total         = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    contingency_amount  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    grand_total         = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="estimates",
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    notes       = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — NPR {self.grand_total:,.0f}"

    def recalculate_totals(self):
        """Aggregate section subtotals and apply contingency."""
        mat  = sum(s.material_subtotal for s in self.sections.all())
        lab  = sum(s.labor_subtotal    for s in self.sections.all())
        base = mat + lab
        cont = base * (self.contingency_pct / 100)
        self.material_total     = mat
        self.labor_total        = lab
        self.contingency_amount = cont
        self.grand_total        = base + cont
        self.save(update_fields=[
            "material_total", "labor_total",
            "contingency_amount", "grand_total",
        ])


class EstimateSection(models.Model):
    PHASE_CHOICES = [
        ("site_prep",       "Site Preparation & Excavation"),
        ("foundation",      "Foundation"),
        ("superstructure",  "Superstructure (Slab / Beam / Column)"),
        ("brickwork",       "Brickwork & Masonry"),
        ("roofing",         "Roofing"),
        ("plaster",         "Plastering"),
        ("flooring",        "Flooring"),
        ("painting",        "Painting & Finishing"),
        ("doors_windows",   "Doors & Windows"),
        ("mep",             "MEP (Electrical & Plumbing)"),
        ("other",           "Miscellaneous"),
    ]

    estimate          = models.ForeignKey(Estimate, on_delete=models.CASCADE,
                            related_name="sections")
    name              = models.CharField(max_length=120)
    phase_key         = models.CharField(max_length=30, choices=PHASE_CHOICES,
                            blank=True)
    order             = models.PositiveSmallIntegerField(default=0)
    material_subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    labor_subtotal    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    subtotal          = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.estimate.name} › {self.name}"

    def recalculate(self):
        mat = sum(
            i.total for i in self.items.filter(category="MATERIAL")
        )
        lab = sum(
            i.total for i in self.items.filter(category="LABOR")
        )
        self.material_subtotal = mat
        self.labor_subtotal    = lab
        self.subtotal          = mat + lab + sum(
            i.total for i in self.items.exclude(category__in=["MATERIAL", "LABOR"])
        )
        self.save(update_fields=["material_subtotal", "labor_subtotal", "subtotal"])


class EstimateItem(models.Model):
    CATEGORY_CHOICES = [
        ("MATERIAL",  "Material"),
        ("LABOR",     "Labor"),
        ("EQUIPMENT", "Equipment"),
        ("OTHER",     "Other"),
    ]

    section     = models.ForeignKey(EstimateSection, on_delete=models.CASCADE,
                      related_name="items")
    label       = models.CharField(max_length=200)
    category    = models.CharField(max_length=15, choices=CATEGORY_CHOICES)
    rate_key    = models.CharField(max_length=50, blank=True,
                      help_text="Reference to MaterialRate.key or LaborRate.trade")
    quantity    = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    unit        = models.CharField(max_length=20)
    unit_rate   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    wastage_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total       = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes       = models.TextField(blank=True)

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        qty   = float(self.quantity)
        rate  = float(self.unit_rate)
        waste = float(self.wastage_pct) / 100
        self.total = round(qty * rate * (1 + waste), 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.label}: {self.quantity} {self.unit} × {self.unit_rate} = {self.total}"
