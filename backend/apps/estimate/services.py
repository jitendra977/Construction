"""
Estimator Services
──────────────────
CalculatorService   — stateless calculation helpers (wall, concrete, plaster …)
EstimateBuilder     — builds a full Estimate with sections + line items from params
RateLoader          — loads material/labor rates from DB with safe fallbacks
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

# ─────────────────────────────────────────────────────────────────────────────
#  Default rates (used when DB has no entry)
# ─────────────────────────────────────────────────────────────────────────────
DEFAULT_MATERIAL_RATES: dict[str, float] = {
    "CEMENT":       830,    # NPR / bag
    "SAND":         95,     # NPR / CFT
    "AGGREGATE":    110,    # NPR / CFT
    "BRICK":        18,     # NPR / piece
    "ROD":          110,    # NPR / kg
    "PAINT_INT":    55,     # NPR / sqft (emulsion)
    "PAINT_EXT":    70,     # NPR / sqft (weather-shield)
    "TILE_BASIC":   120,    # NPR / sqft (basic vitrified)
    "TILE_PREMIUM": 300,    # NPR / sqft (premium)
    "TILE_ADHESIVE":35,     # NPR / sqft
    "TILE_GROUT":   15,     # NPR / sqft
    "WATERPROOF":   180,    # NPR / sqft (chemical compound)
    "FORMWORK":     60,     # NPR / sqft (shuttering)
    "DOOR_BASIC":   22000,  # NPR / door
    "DOOR_PREMIUM": 38000,  # NPR / door
    "WINDOW_BASIC": 16000,  # NPR / window
    "WINDOW_PREMIUM":28000, # NPR / window
    "PLUMBING_BATH":55000,  # NPR / bathroom (fixtures + pipes)
    "ELECTRICAL":   220,    # NPR / sqft (wiring + fittings)
}

DEFAULT_LABOR_RATES: dict[str, float] = {
    "MASON":       900,
    "HELPER":      600,
    "CARPENTER":   1000,
    "ELECTRICIAN": 1200,
    "PLUMBER":     1100,
    "PAINTER":     850,
    "STEEL_FIXER": 950,
    "SUPERVISOR":  1500,
    "TILE_SETTER": 950,
    "EXCAVATOR":   700,
    "WATERPROOF":  800,
}

# Unit conversion
M3_TO_CFT    = 35.3147
SQM_TO_SQFT  = 10.7639
FT_TO_M      = 0.3048
IN_TO_M      = 0.0254
CEMENT_BAG   = 0.0347   # m³ per 50 kg bag


class RateLoader:
    """Loads rates from DB with safe fallbacks to defaults."""

    _mat: dict[str, float] | None = None
    _lab: dict[str, float] | None = None

    @classmethod
    def materials(cls) -> dict[str, float]:
        from .models import MaterialRate
        db = {r.key: float(r.rate) for r in MaterialRate.objects.filter(is_active=True)}
        return {**DEFAULT_MATERIAL_RATES, **db}

    @classmethod
    def labor(cls) -> dict[str, float]:
        from .models import LaborRate
        db = {r.trade: float(r.daily_rate) for r in LaborRate.objects.all()}
        return {**DEFAULT_LABOR_RATES, **db}


# ─────────────────────────────────────────────────────────────────────────────
#  Calculator Service
# ─────────────────────────────────────────────────────────────────────────────
class CalculatorService:
    """
    All methods are class methods.
    Each returns a dict with:
      - inputs   → echoed back
      - materials → {key: {qty, unit, rate, total}}
      - labor     → {key: {qty, unit, rate, total}}
      - summary   → {material_total, labor_total, grand_total, …}
    """

    # ── Wall ─────────────────────────────────────────────────────────────────
    @classmethod
    def wall(
        cls,
        length_ft: float,
        height_ft: float,
        thickness: str = "9_INCH",
        ratio: str = "1:6",
        openings_sqft: float = 0,
        include_labor: bool = True,
    ) -> dict:
        mat  = RateLoader.materials()
        lab  = RateLoader.labor()

        length_m  = float(length_ft) * FT_TO_M
        height_m  = float(height_ft) * FT_TO_M

        net_area_sqft = max(0, float(length_ft) * float(height_ft) - float(openings_sqft))
        net_area_m2   = net_area_sqft / SQM_TO_SQFT

        thickness_m   = 0.230 if thickness == "9_INCH" else (0.110 if thickness == "4_INCH" else 0.075)
        vol_wall_m3   = net_area_m2 * thickness_m

        # Brick count (with mortar)
        BRICK_L, BRICK_B, BRICK_H = 0.230, 0.110, 0.055
        MORTAR = 0.010
        vol_brick_w_mortar = (BRICK_L + MORTAR) * (BRICK_B + MORTAR) * (BRICK_H + MORTAR)

        if thickness == "9_INCH":
            bricks = vol_wall_m3 / vol_brick_w_mortar
        else:
            area_one_face = (BRICK_L + MORTAR) * (BRICK_H + MORTAR)
            bricks        = net_area_m2 / area_one_face

        # Mortar volume
        vol_dry_brick = BRICK_L * BRICK_B * BRICK_H * bricks
        vol_wet_mortar = vol_wall_m3 - vol_dry_brick
        vol_dry_mortar = vol_wet_mortar * 1.33

        c_part, s_part = map(int, ratio.split(":"))
        total_parts    = c_part + s_part

        cement_m3  = (c_part / total_parts) * vol_dry_mortar
        sand_m3    = (s_part / total_parts) * vol_dry_mortar
        cement_bags = cement_m3 / CEMENT_BAG
        sand_cft    = sand_m3 * M3_TO_CFT

        materials = {
            "BRICK":   {"qty": round(bricks),       "unit": "PCS", "rate": mat["BRICK"],  "total": round(bricks * mat["BRICK"])},
            "CEMENT":  {"qty": round(cement_bags,1), "unit": "BAG", "rate": mat["CEMENT"],"total": round(cement_bags * mat["CEMENT"])},
            "SAND":    {"qty": round(sand_cft,1),    "unit": "CFT", "rate": mat["SAND"],  "total": round(sand_cft * mat["SAND"])},
        }

        labor_cost = {}
        if include_labor:
            # ~1.5 mason-days + 1.5 helper-days per 100 bricks
            mason_days  = round(bricks / 100 * 1.5, 1)
            helper_days = round(bricks / 100 * 1.5, 1)
            labor_cost = {
                "MASON":  {"qty": mason_days,  "unit": "day", "rate": lab["MASON"],  "total": round(mason_days  * lab["MASON"])},
                "HELPER": {"qty": helper_days, "unit": "day", "rate": lab["HELPER"], "total": round(helper_days * lab["HELPER"])},
            }

        mat_total = sum(v["total"] for v in materials.values())
        lab_total = sum(v["total"] for v in labor_cost.values())

        return {
            "inputs": {
                "length_ft": length_ft, "height_ft": height_ft,
                "thickness": thickness, "ratio": ratio,
                "openings_sqft": openings_sqft,
            },
            "materials": materials,
            "labor":     labor_cost,
            "summary": {
                "net_area_sqft":   round(net_area_sqft, 2),
                "wall_volume_m3":  round(vol_wall_m3,   3),
                "material_total":  mat_total,
                "labor_total":     lab_total,
                "grand_total":     mat_total + lab_total,
            },
        }

    # ── Concrete (Dhalan) ────────────────────────────────────────────────────
    @classmethod
    def concrete(
        cls,
        length_ft: float,
        width_ft: float,
        depth_in: float,
        grade: str = "M20",
        structure: str = "SLAB",
        include_rebar: bool = True,
        include_formwork: bool = True,
        include_labor: bool = True,
    ) -> dict:
        mat = RateLoader.materials()
        lab = RateLoader.labor()

        length_m = float(length_ft) * FT_TO_M
        width_m  = float(width_ft)  * FT_TO_M
        depth_m  = float(depth_in)  * IN_TO_M

        wet_vol_m3 = length_m * width_m * depth_m
        dry_vol_m3 = wet_vol_m3 * 1.54

        GRADE_RATIOS = {
            "M10": (1, 3, 6), "M15": (1, 2, 4),
            "M20": (1, 1.5, 3), "M25": (1, 1, 2),
        }
        c, s, a    = GRADE_RATIOS.get(grade, (1, 1.5, 3))
        total_p    = c + s + a

        cement_m3  = (c / total_p) * dry_vol_m3
        sand_m3    = (s / total_p) * dry_vol_m3
        agg_m3     = (a / total_p) * dry_vol_m3
        cement_bags = cement_m3 / CEMENT_BAG
        sand_cft    = sand_m3 * M3_TO_CFT
        agg_cft     = agg_m3  * M3_TO_CFT

        REBAR_KG_M3 = {"SLAB": 80, "BEAM": 130, "COLUMN": 170, "FOOTING": 60, "RAFT": 90}
        rebar_kg    = wet_vol_m3 * REBAR_KG_M3.get(structure, 80) if include_rebar else 0

        formwork_sqft = (
            float(length_ft) * float(width_ft)
            + 2 * (float(length_ft) + float(width_ft)) * float(depth_in) / 12
        ) if include_formwork else 0

        materials = {
            "CEMENT":    {"qty": round(cement_bags, 1), "unit": "BAG", "rate": mat["CEMENT"],   "total": round(cement_bags * mat["CEMENT"])},
            "SAND":      {"qty": round(sand_cft, 1),    "unit": "CFT", "rate": mat["SAND"],     "total": round(sand_cft * mat["SAND"])},
            "AGGREGATE": {"qty": round(agg_cft, 1),     "unit": "CFT", "rate": mat["AGGREGATE"],"total": round(agg_cft * mat["AGGREGATE"])},
        }
        if include_rebar:
            materials["ROD"] = {"qty": round(rebar_kg, 1), "unit": "KG", "rate": mat["ROD"], "total": round(rebar_kg * mat["ROD"])}
        if include_formwork:
            materials["FORMWORK"] = {"qty": round(formwork_sqft, 1), "unit": "SQFT", "rate": mat["FORMWORK"], "total": round(formwork_sqft * mat["FORMWORK"])}

        labor_cost = {}
        if include_labor:
            # Thumb rule: 4 mason-days + 4 helper-days + 2 steel-fixer-days per m3
            mason_days      = round(wet_vol_m3 * 4, 1)
            helper_days     = round(wet_vol_m3 * 4, 1)
            steel_fix_days  = round(wet_vol_m3 * 2, 1) if include_rebar else 0
            labor_cost = {
                "MASON":      {"qty": mason_days,     "unit": "day", "rate": lab["MASON"],      "total": round(mason_days * lab["MASON"])},
                "HELPER":     {"qty": helper_days,    "unit": "day", "rate": lab["HELPER"],     "total": round(helper_days * lab["HELPER"])},
            }
            if steel_fix_days:
                labor_cost["STEEL_FIXER"] = {"qty": steel_fix_days, "unit": "day", "rate": lab["STEEL_FIXER"], "total": round(steel_fix_days * lab["STEEL_FIXER"])}

        mat_total = sum(v["total"] for v in materials.values())
        lab_total = sum(v["total"] for v in labor_cost.values())

        return {
            "inputs": {
                "length_ft": length_ft, "width_ft": width_ft, "depth_in": depth_in,
                "grade": grade, "structure": structure,
                "include_rebar": include_rebar, "include_formwork": include_formwork,
            },
            "materials": materials,
            "labor":     labor_cost,
            "summary": {
                "volume_m3":      round(wet_vol_m3, 3),
                "area_sqft":      round(float(length_ft) * float(width_ft), 2),
                "material_total": mat_total,
                "labor_total":    lab_total,
                "grand_total":    mat_total + lab_total,
            },
        }

    # ── Plaster ──────────────────────────────────────────────────────────────
    @classmethod
    def plaster(
        cls,
        area_sqft: float,
        thickness_mm: float = 12,
        ratio: str = "1:4",
        coats: int = 1,
        include_labor: bool = True,
    ) -> dict:
        mat = RateLoader.materials()
        lab = RateLoader.labor()

        area_m2    = float(area_sqft) / SQM_TO_SQFT
        thickness_m = float(thickness_mm) / 1000

        # Each coat
        wet_vol   = area_m2 * thickness_m * coats
        dry_vol   = wet_vol * 1.33

        c_part, s_part = map(int, ratio.split(":"))
        total_p        = c_part + s_part

        cement_m3   = (c_part / total_p) * dry_vol
        sand_m3     = (s_part / total_p) * dry_vol
        cement_bags = cement_m3 / CEMENT_BAG
        sand_cft    = sand_m3 * M3_TO_CFT

        materials = {
            "CEMENT": {"qty": round(cement_bags, 1), "unit": "BAG", "rate": mat["CEMENT"], "total": round(cement_bags * mat["CEMENT"])},
            "SAND":   {"qty": round(sand_cft, 1),    "unit": "CFT", "rate": mat["SAND"],   "total": round(sand_cft * mat["SAND"])},
        }

        labor_cost = {}
        if include_labor:
            # 1 mason + 1 helper per 100 sqft per day
            days = float(area_sqft) / 100
            labor_cost = {
                "MASON":  {"qty": round(days, 1), "unit": "day", "rate": lab["MASON"],  "total": round(days * lab["MASON"])},
                "HELPER": {"qty": round(days, 1), "unit": "day", "rate": lab["HELPER"], "total": round(days * lab["HELPER"])},
            }

        mat_total = sum(v["total"] for v in materials.values())
        lab_total = sum(v["total"] for v in labor_cost.values())

        return {
            "inputs": {"area_sqft": area_sqft, "thickness_mm": thickness_mm, "ratio": ratio, "coats": coats},
            "materials": materials,
            "labor":     labor_cost,
            "summary": {
                "area_sqft":      float(area_sqft),
                "material_total": mat_total,
                "labor_total":    lab_total,
                "grand_total":    mat_total + lab_total,
            },
        }

    # ── PCC Flooring ─────────────────────────────────────────────────────────
    @classmethod
    def pcc_flooring(
        cls,
        area_sqft: float,
        thickness_in: float = 2,
        include_labor: bool = True,
    ) -> dict:
        mat = RateLoader.materials()
        lab = RateLoader.labor()

        area_m2     = float(area_sqft) / SQM_TO_SQFT
        thickness_m = float(thickness_in) * IN_TO_M
        wet_vol     = area_m2 * thickness_m
        dry_vol     = wet_vol * 1.54

        # PCC is always 1:3:6
        c, s, a   = 1, 3, 6
        total_p   = c + s + a

        cement_m3   = (c / total_p) * dry_vol
        sand_m3     = (s / total_p) * dry_vol
        agg_m3      = (a / total_p) * dry_vol
        cement_bags = cement_m3 / CEMENT_BAG
        sand_cft    = sand_m3  * M3_TO_CFT
        agg_cft     = agg_m3   * M3_TO_CFT

        materials = {
            "CEMENT":    {"qty": round(cement_bags, 1), "unit": "BAG", "rate": mat["CEMENT"],    "total": round(cement_bags * mat["CEMENT"])},
            "SAND":      {"qty": round(sand_cft, 1),    "unit": "CFT", "rate": mat["SAND"],      "total": round(sand_cft * mat["SAND"])},
            "AGGREGATE": {"qty": round(agg_cft, 1),     "unit": "CFT", "rate": mat["AGGREGATE"], "total": round(agg_cft * mat["AGGREGATE"])},
        }

        labor_cost = {}
        if include_labor:
            days = float(area_sqft) / 120
            labor_cost = {
                "MASON":  {"qty": round(days, 1), "unit": "day", "rate": lab["MASON"],  "total": round(days * lab["MASON"])},
                "HELPER": {"qty": round(days, 1), "unit": "day", "rate": lab["HELPER"], "total": round(days * lab["HELPER"])},
            }

        mat_total = sum(v["total"] for v in materials.values())
        lab_total = sum(v["total"] for v in labor_cost.values())

        return {
            "inputs": {"area_sqft": area_sqft, "thickness_in": thickness_in},
            "materials": materials,
            "labor":     labor_cost,
            "summary": {"area_sqft": float(area_sqft), "volume_m3": round(wet_vol, 3), "material_total": mat_total, "labor_total": lab_total, "grand_total": mat_total + lab_total},
        }

    # ── Tile Flooring ────────────────────────────────────────────────────────
    @classmethod
    def tile_flooring(
        cls,
        area_sqft: float,
        tile_type: str = "BASIC",
        wastage_pct: float = 10,
        include_labor: bool = True,
    ) -> dict:
        mat = RateLoader.materials()
        lab = RateLoader.labor()

        area_with_waste = float(area_sqft) * (1 + wastage_pct / 100)
        tile_rate_key   = "TILE_PREMIUM" if tile_type == "PREMIUM" else "TILE_BASIC"

        materials = {
            "TILE":          {"qty": round(area_with_waste, 1),     "unit": "SQFT", "rate": mat[tile_rate_key],   "total": round(area_with_waste * mat[tile_rate_key])},
            "TILE_ADHESIVE": {"qty": round(float(area_sqft), 1),    "unit": "SQFT", "rate": mat["TILE_ADHESIVE"], "total": round(float(area_sqft) * mat["TILE_ADHESIVE"])},
            "TILE_GROUT":    {"qty": round(float(area_sqft), 1),    "unit": "SQFT", "rate": mat["TILE_GROUT"],    "total": round(float(area_sqft) * mat["TILE_GROUT"])},
        }

        labor_cost = {}
        if include_labor:
            days = float(area_sqft) / 80
            labor_cost = {
                "TILE_SETTER": {"qty": round(days, 1), "unit": "day", "rate": lab["TILE_SETTER"], "total": round(days * lab["TILE_SETTER"])},
                "HELPER":      {"qty": round(days, 1), "unit": "day", "rate": lab["HELPER"],      "total": round(days * lab["HELPER"])},
            }

        mat_total = sum(v["total"] for v in materials.values())
        lab_total = sum(v["total"] for v in labor_cost.values())

        return {
            "inputs": {"area_sqft": area_sqft, "tile_type": tile_type, "wastage_pct": wastage_pct},
            "materials": materials,
            "labor":     labor_cost,
            "summary": {"area_sqft": float(area_sqft), "material_total": mat_total, "labor_total": lab_total, "grand_total": mat_total + lab_total},
        }

    # ── Paint ────────────────────────────────────────────────────────────────
    @classmethod
    def paint(
        cls,
        area_sqft: float,
        paint_type: str = "INTERNAL",
        coats: int = 2,
        include_labor: bool = True,
    ) -> dict:
        mat = RateLoader.materials()
        lab = RateLoader.labor()

        rate_key = "PAINT_INT" if paint_type == "INTERNAL" else "PAINT_EXT"
        # Each coat covers area; 2 coats = 2× area equivalent
        total_area = float(area_sqft) * coats

        materials = {
            "PAINT":  {"qty": round(total_area, 1), "unit": "SQFT", "rate": mat[rate_key], "total": round(total_area * mat[rate_key])},
        }

        labor_cost = {}
        if include_labor:
            days = float(area_sqft) / 200
            labor_cost = {
                "PAINTER": {"qty": round(days, 1), "unit": "day", "rate": lab["PAINTER"], "total": round(days * lab["PAINTER"])},
                "HELPER":  {"qty": round(days * 0.5, 1), "unit": "day", "rate": lab["HELPER"], "total": round(days * 0.5 * lab["HELPER"])},
            }

        mat_total = sum(v["total"] for v in materials.values())
        lab_total = sum(v["total"] for v in labor_cost.values())

        return {
            "inputs": {"area_sqft": area_sqft, "paint_type": paint_type, "coats": coats},
            "materials": materials,
            "labor":     labor_cost,
            "summary": {"area_sqft": float(area_sqft), "material_total": mat_total, "labor_total": lab_total, "grand_total": mat_total + lab_total},
        }

    # ── Roofing ──────────────────────────────────────────────────────────────
    @classmethod
    def roofing(
        cls,
        area_sqft: float,
        slab_depth_in: float = 5,
        include_waterproofing: bool = True,
        include_labor: bool = True,
    ) -> dict:
        """RCC flat roof slab with optional waterproofing."""
        mat = RateLoader.materials()
        lab = RateLoader.labor()

        # Roof slab = M20 concrete
        concrete = cls.concrete(
            length_ft=float(area_sqft) ** 0.5,
            width_ft=float(area_sqft) ** 0.5,
            depth_in=slab_depth_in,
            grade="M20",
            structure="SLAB",
            include_rebar=True,
            include_formwork=True,
            include_labor=include_labor,
        )
        # Adjust back for exact area
        area_m2 = float(area_sqft) / SQM_TO_SQFT
        depth_m = float(slab_depth_in) * IN_TO_M
        scale   = (area_m2 * depth_m) / concrete["summary"]["volume_m3"]

        materials = {k: {**v, "qty": round(v["qty"] * scale, 1), "total": round(v["total"] * scale)} for k, v in concrete["materials"].items()}
        labor_cost = {k: {**v, "qty": round(v["qty"] * scale, 1), "total": round(v["total"] * scale)} for k, v in concrete["labor"].items()}

        if include_waterproofing:
            wp_area = float(area_sqft) * 1.1  # 10% extra for upturns
            materials["WATERPROOF"] = {"qty": round(wp_area, 1), "unit": "SQFT", "rate": mat["WATERPROOF"], "total": round(wp_area * mat["WATERPROOF"])}
            if include_labor:
                wp_days = wp_area / 200
                labor_cost["WATERPROOF"] = {"qty": round(wp_days, 1), "unit": "day", "rate": lab["WATERPROOF"], "total": round(wp_days * lab["WATERPROOF"])}

        mat_total = sum(v["total"] for v in materials.values())
        lab_total = sum(v["total"] for v in labor_cost.values())

        return {
            "inputs": {"area_sqft": area_sqft, "slab_depth_in": slab_depth_in, "include_waterproofing": include_waterproofing},
            "materials": materials,
            "labor":     labor_cost,
            "summary": {"area_sqft": float(area_sqft), "material_total": mat_total, "labor_total": lab_total, "grand_total": mat_total + lab_total},
        }

    # ── Excavation ───────────────────────────────────────────────────────────
    @classmethod
    def excavation(
        cls,
        length_ft: float,
        width_ft: float,
        depth_ft: float,
        soil_type: str = "NORMAL",
    ) -> dict:
        lab = RateLoader.labor()

        volume_cft = float(length_ft) * float(width_ft) * float(depth_ft)
        volume_m3  = volume_cft / M3_TO_CFT

        # Labor rate multiplier by soil type
        soil_mult = {"SOFT": 0.8, "NORMAL": 1.0, "HARD": 1.4, "ROCK": 2.2}
        base_rate_per_m3 = lab["EXCAVATOR"] / 8   # hourly approx
        days = volume_m3 / 30 * soil_mult.get(soil_type, 1.0)  # 30 m3/day standard

        labor_cost = {
            "EXCAVATOR": {"qty": round(days, 1), "unit": "day", "rate": lab["EXCAVATOR"], "total": round(days * lab["EXCAVATOR"])},
            "HELPER":    {"qty": round(days * 2, 1), "unit": "day", "rate": lab["HELPER"], "total": round(days * 2 * lab["HELPER"])},
        }

        lab_total = sum(v["total"] for v in labor_cost.values())
        return {
            "inputs": {"length_ft": length_ft, "width_ft": width_ft, "depth_ft": depth_ft, "soil_type": soil_type},
            "materials": {},
            "labor":     labor_cost,
            "summary": {"volume_cft": round(volume_cft, 1), "volume_m3": round(volume_m3, 2), "material_total": 0, "labor_total": lab_total, "grand_total": lab_total},
        }

    # ── Staircase ────────────────────────────────────────────────────────────
    @classmethod
    def staircase(
        cls,
        flights: int = 1,
        steps_per_flight: int = 14,
        width_ft: float = 4,
        include_tiles: bool = True,
        include_labor: bool = True,
    ) -> dict:
        mat = RateLoader.materials()
        lab = RateLoader.labor()

        # Each step: 0.25m tread × 0.175m riser × width
        width_m    = float(width_ft) * FT_TO_M
        steps      = int(flights) * int(steps_per_flight)
        step_vol_m3 = 0.5 * 0.25 * 0.175 * width_m   # triangular prism
        total_vol  = step_vol_m3 * steps * 1.3         # + 30% for waist slab

        dry_vol = total_vol * 1.54
        c, s, a = 1, 1.5, 3
        tp = c + s + a

        cement_bags = (c / tp) * dry_vol / CEMENT_BAG
        sand_cft    = (s / tp) * dry_vol * M3_TO_CFT
        agg_cft     = (a / tp) * dry_vol * M3_TO_CFT
        rebar_kg    = total_vol * 100  # stairs are rebar-intensive

        materials = {
            "CEMENT":    {"qty": round(cement_bags, 1), "unit": "BAG", "rate": mat["CEMENT"],    "total": round(cement_bags * mat["CEMENT"])},
            "SAND":      {"qty": round(sand_cft, 1),    "unit": "CFT", "rate": mat["SAND"],      "total": round(sand_cft * mat["SAND"])},
            "AGGREGATE": {"qty": round(agg_cft, 1),     "unit": "CFT", "rate": mat["AGGREGATE"], "total": round(agg_cft * mat["AGGREGATE"])},
            "ROD":       {"qty": round(rebar_kg, 1),    "unit": "KG",  "rate": mat["ROD"],       "total": round(rebar_kg * mat["ROD"])},
        }

        if include_tiles:
            tile_area = steps * 0.25 * float(width_ft)  # tread area sqft
            materials["TILE_BASIC"]    = {"qty": round(tile_area, 1), "unit": "SQFT", "rate": mat["TILE_BASIC"],    "total": round(tile_area * mat["TILE_BASIC"])}
            materials["TILE_ADHESIVE"] = {"qty": round(tile_area, 1), "unit": "SQFT", "rate": mat["TILE_ADHESIVE"], "total": round(tile_area * mat["TILE_ADHESIVE"])}

        labor_cost = {}
        if include_labor:
            mason_days = steps * 0.3
            labor_cost = {
                "MASON":      {"qty": round(mason_days, 1),       "unit": "day", "rate": lab["MASON"],      "total": round(mason_days * lab["MASON"])},
                "STEEL_FIXER":{"qty": round(mason_days * 0.5, 1), "unit": "day", "rate": lab["STEEL_FIXER"],"total": round(mason_days * 0.5 * lab["STEEL_FIXER"])},
                "HELPER":     {"qty": round(mason_days, 1),       "unit": "day", "rate": lab["HELPER"],     "total": round(mason_days * lab["HELPER"])},
            }

        mat_total = sum(v["total"] for v in materials.values())
        lab_total = sum(v["total"] for v in labor_cost.values())

        return {
            "inputs": {"flights": flights, "steps_per_flight": steps_per_flight, "width_ft": width_ft, "include_tiles": include_tiles},
            "materials": materials,
            "labor":     labor_cost,
            "summary": {"total_steps": steps, "concrete_m3": round(total_vol, 2), "material_total": mat_total, "labor_total": lab_total, "grand_total": mat_total + lab_total},
        }


# ─────────────────────────────────────────────────────────────────────────────
#  Estimate Builder
# ─────────────────────────────────────────────────────────────────────────────
class EstimateBuilder:
    """
    Builds a fully populated Estimate (with EstimateSection + EstimateItem rows)
    from the scalar parameters stored on the Estimate model.
    Existing sections/items are deleted and regenerated.
    """

    SECTION_ORDER = [
        ("site_prep",      "Site Preparation & Excavation"),
        ("foundation",     "Foundation"),
        ("superstructure", "Superstructure (Slab / Beam / Column)"),
        ("brickwork",      "Brickwork & Masonry"),
        ("roofing",        "Roofing"),
        ("plaster",        "Plastering"),
        ("flooring",       "Flooring"),
        ("painting",       "Painting & Finishing"),
        ("doors_windows",  "Doors & Windows"),
        ("mep",            "MEP (Electrical & Plumbing)"),
        ("other",          "Miscellaneous & Contingency"),
    ]

    @classmethod
    def build(cls, estimate) -> None:
        """Regenerate all sections/items for `estimate`. Saves in-place."""
        from .models import EstimateSection, EstimateItem

        estimate.sections.all().delete()   # wipe old data

        area  = float(estimate.total_area_sqft)
        floors = int(estimate.floors)
        beds  = int(estimate.bedrooms)
        baths = int(estimate.bathrooms)
        mult  = {"ECONOMY": 0.82, "STANDARD": 1.0, "PREMIUM": 1.3, "LUXURY": 1.65}.get(estimate.quality_tier, 1.0)
        mat   = RateLoader.materials()
        lab   = RateLoader.labor()

        def make_section(phase_key, name, order):
            return EstimateSection.objects.create(
                estimate=estimate, phase_key=phase_key, name=name, order=order
            )

        def add_item(section, label, category, qty, unit, rate, wastage=0, rate_key=""):
            EstimateItem.objects.create(
                section=section, label=label, category=category,
                rate_key=rate_key, quantity=qty, unit=unit,
                unit_rate=rate, wastage_pct=wastage,
            )

        order = 0

        # ── 1. Site Prep & Excavation ───────────────────────────────────────
        sec = make_section("site_prep", "Site Preparation & Excavation", order := order + 1)
        exc_vol_m3 = area / SQM_TO_SQFT * 1.5   # ~1.5 m deep for foundation
        exc_days   = exc_vol_m3 / 30
        add_item(sec, "Excavation — Operator",  "LABOR",    round(exc_days, 1), "day",  lab["EXCAVATOR"],  rate_key="EXCAVATOR")
        add_item(sec, "Excavation — Helper",    "LABOR",    round(exc_days * 2, 1), "day", lab["HELPER"], rate_key="HELPER")
        add_item(sec, "Site clearing & leveling", "LABOR",  round(area / 500, 1), "day", lab["HELPER"] * 3, rate_key="HELPER")

        # ── 2. Foundation ───────────────────────────────────────────────────
        sec = make_section("foundation", "Foundation", order := order + 1)
        # PCC bed: area × 0.1 m thick
        pcc_vol   = area / SQM_TO_SQFT * 0.1
        pcc_dry   = pcc_vol * 1.54
        pcc_cement = pcc_dry / 10 / CEMENT_BAG   # 1:3:6
        pcc_sand  = pcc_dry * 3/10 * M3_TO_CFT
        pcc_agg   = pcc_dry * 6/10 * M3_TO_CFT
        add_item(sec, "PCC Bed — Cement",    "MATERIAL", round(pcc_cement,1), "BAG",  mat["CEMENT"],    5, "CEMENT")
        add_item(sec, "PCC Bed — Sand",      "MATERIAL", round(pcc_sand,1),   "CFT",  mat["SAND"],      5, "SAND")
        add_item(sec, "PCC Bed — Aggregate", "MATERIAL", round(pcc_agg,1),    "CFT",  mat["AGGREGATE"], 5, "AGGREGATE")
        # Foundation concrete (M20): area × 0.45 m
        fc_vol = area / SQM_TO_SQFT * 0.45
        fc_dry = fc_vol * 1.54
        c, s, a = 1, 1.5, 3; tp = c + s + a
        add_item(sec, "Foundation Concrete — Cement",    "MATERIAL", round(fc_dry*c/tp/CEMENT_BAG,1), "BAG", mat["CEMENT"],    5, "CEMENT")
        add_item(sec, "Foundation Concrete — Sand",      "MATERIAL", round(fc_dry*s/tp*M3_TO_CFT,1),  "CFT", mat["SAND"],      5, "SAND")
        add_item(sec, "Foundation Concrete — Aggregate", "MATERIAL", round(fc_dry*a/tp*M3_TO_CFT,1),  "CFT", mat["AGGREGATE"], 5, "AGGREGATE")
        add_item(sec, "Foundation Rebar",                "MATERIAL", round(fc_vol*60,1),               "KG",  mat["ROD"],       3, "ROD")
        fd = round(fc_vol * 5, 1)
        add_item(sec, "Foundation Labor — Mason",  "LABOR", fd,          "day", lab["MASON"],      rate_key="MASON")
        add_item(sec, "Foundation Labor — Helper", "LABOR", round(fd*1.5,1), "day", lab["HELPER"], rate_key="HELPER")

        # ── 3. Superstructure ───────────────────────────────────────────────
        sec = make_section("superstructure", "Superstructure (Slab / Beam / Column)", order := order + 1)
        # Slab: total_area × floors × 5" thick
        slab_vol = area / SQM_TO_SQFT * floors * (5 * IN_TO_M)
        sd = slab_vol * 1.54
        add_item(sec, "RCC Slab — Cement",    "MATERIAL", round(sd*c/tp/CEMENT_BAG,1), "BAG",  mat["CEMENT"] * mult,    5, "CEMENT")
        add_item(sec, "RCC Slab — Sand",      "MATERIAL", round(sd*s/tp*M3_TO_CFT,1),  "CFT",  mat["SAND"] * mult,      5, "SAND")
        add_item(sec, "RCC Slab — Aggregate", "MATERIAL", round(sd*a/tp*M3_TO_CFT,1),  "CFT",  mat["AGGREGATE"] * mult, 5, "AGGREGATE")
        add_item(sec, "RCC Slab — Rebar",     "MATERIAL", round(slab_vol*80,1),         "KG",   mat["ROD"] * mult,       3, "ROD")
        add_item(sec, "Formwork (Shuttering)", "MATERIAL", round(area * floors,1),      "SQFT", mat["FORMWORK"],         0, "FORMWORK")
        sd_l = round(slab_vol * 4, 1)
        add_item(sec, "Slab Labor — Mason",       "LABOR", sd_l,             "day", lab["MASON"],      rate_key="MASON")
        add_item(sec, "Slab Labor — Steel Fixer", "LABOR", round(sd_l*0.5,1),"day", lab["STEEL_FIXER"],rate_key="STEEL_FIXER")
        add_item(sec, "Slab Labor — Helper",      "LABOR", round(sd_l*1.5,1),"day", lab["HELPER"],     rate_key="HELPER")

        # Columns & Beams: ~20% extra concrete/rebar over slab
        cb_vol = slab_vol * 0.20
        cbd = cb_vol * 1.54
        add_item(sec, "Columns & Beams — Cement",    "MATERIAL", round(cbd*c/tp/CEMENT_BAG,1),"BAG", mat["CEMENT"]*mult,    5, "CEMENT")
        add_item(sec, "Columns & Beams — Sand",      "MATERIAL", round(cbd*s/tp*M3_TO_CFT,1), "CFT", mat["SAND"]*mult,      5, "SAND")
        add_item(sec, "Columns & Beams — Aggregate", "MATERIAL", round(cbd*a/tp*M3_TO_CFT,1), "CFT", mat["AGGREGATE"]*mult, 5, "AGGREGATE")
        add_item(sec, "Columns & Beams — Rebar",     "MATERIAL", round(cb_vol*150,1),          "KG",  mat["ROD"]*mult,       3, "ROD")

        # ── 4. Brickwork ────────────────────────────────────────────────────
        sec = make_section("brickwork", "Brickwork & Masonry", order := order + 1)
        wall_area = area * floors * 2.2 / SQM_TO_SQFT  # m²
        wall_vol  = wall_area * 0.23
        bricks    = wall_vol / ((0.240) * (0.120) * (0.065))
        wm_dry    = (wall_vol - bricks * 0.230 * 0.110 * 0.055) * 1.33
        wc_part, ws_part = 1, 6; wtp = wc_part + ws_part
        add_item(sec, "Brickwork — Bricks",  "MATERIAL", round(bricks),                           "PCS", mat["BRICK"]*mult,   5, "BRICK")
        add_item(sec, "Brickwork — Cement",  "MATERIAL", round(wm_dry*wc_part/wtp/CEMENT_BAG,1), "BAG", mat["CEMENT"]*mult,  5, "CEMENT")
        add_item(sec, "Brickwork — Sand",    "MATERIAL", round(wm_dry*ws_part/wtp*M3_TO_CFT,1),  "CFT", mat["SAND"]*mult,    5, "SAND")
        bw_d = round(bricks/100*1.5, 1)
        add_item(sec, "Brickwork — Mason",  "LABOR", bw_d,          "day", lab["MASON"],  rate_key="MASON")
        add_item(sec, "Brickwork — Helper", "LABOR", round(bw_d,1), "day", lab["HELPER"], rate_key="HELPER")

        # ── 5. Roofing ──────────────────────────────────────────────────────
        sec = make_section("roofing", "Roofing", order := order + 1)
        roof_vol = area / SQM_TO_SQFT * (5 * IN_TO_M)
        rd = roof_vol * 1.54
        add_item(sec, "Roof Slab — Cement",    "MATERIAL", round(rd*c/tp/CEMENT_BAG,1), "BAG", mat["CEMENT"]*mult,    5, "CEMENT")
        add_item(sec, "Roof Slab — Sand",      "MATERIAL", round(rd*s/tp*M3_TO_CFT,1),  "CFT", mat["SAND"]*mult,      5, "SAND")
        add_item(sec, "Roof Slab — Aggregate", "MATERIAL", round(rd*a/tp*M3_TO_CFT,1),  "CFT", mat["AGGREGATE"]*mult, 5, "AGGREGATE")
        add_item(sec, "Roof Slab — Rebar",     "MATERIAL", round(roof_vol*80,1),         "KG",  mat["ROD"]*mult,       3, "ROD")
        wp_area = area * 1.1
        add_item(sec, "Waterproofing",         "MATERIAL", round(wp_area,1), "SQFT", mat["WATERPROOF"]*mult, 5, "WATERPROOF")
        rl = round(roof_vol*4, 1)
        add_item(sec, "Roofing Labor — Mason",  "LABOR", rl,             "day", lab["MASON"],      rate_key="MASON")
        add_item(sec, "Roofing Labor — Helper", "LABOR", round(rl*1.5,1),"day", lab["HELPER"],     rate_key="HELPER")
        add_item(sec, "Waterproof Applicator",  "LABOR", round(wp_area/200,1),"day", lab["WATERPROOF"], rate_key="WATERPROOF")

        # ── 6. Plastering ───────────────────────────────────────────────────
        sec = make_section("plaster", "Plastering", order := order + 1)
        plaster_area = area * floors * 3.5 * mult  # walls+ceiling
        pa_m2 = plaster_area / SQM_TO_SQFT
        pw_vol = pa_m2 * 0.012 * 1.33
        pc_part, ps_part = 1, 4; ptp = pc_part + ps_part
        add_item(sec, "Plaster — Cement", "MATERIAL", round(pw_vol*pc_part/ptp/CEMENT_BAG,1), "BAG", mat["CEMENT"]*mult, 5, "CEMENT")
        add_item(sec, "Plaster — Sand",   "MATERIAL", round(pw_vol*ps_part/ptp*M3_TO_CFT,1),  "CFT", mat["SAND"]*mult,   5, "SAND")
        pl_d = round(plaster_area/100, 1)
        add_item(sec, "Plaster — Mason",  "LABOR", pl_d, "day", lab["MASON"],  rate_key="MASON")
        add_item(sec, "Plaster — Helper", "LABOR", pl_d, "day", lab["HELPER"], rate_key="HELPER")

        # ── 7. Flooring ──────────────────────────────────────────────────────
        sec = make_section("flooring", "Flooring", order := order + 1)
        tile_key = "TILE_PREMIUM" if estimate.quality_tier in ("PREMIUM", "LUXURY") else "TILE_BASIC"
        fl_area  = area * floors * 1.05  # 5% waste
        add_item(sec, "Floor Tiles",     "MATERIAL", round(fl_area,1),          "SQFT", mat[tile_key]*mult,       5, tile_key)
        add_item(sec, "Tile Adhesive",   "MATERIAL", round(area*floors,1),      "SQFT", mat["TILE_ADHESIVE"],     0, "TILE_ADHESIVE")
        add_item(sec, "Tile Grout",      "MATERIAL", round(area*floors,1),      "SQFT", mat["TILE_GROUT"],        0, "TILE_GROUT")
        fl_d = round(area*floors/80, 1)
        add_item(sec, "Flooring — Tile Setter", "LABOR", fl_d,         "day", lab["TILE_SETTER"], rate_key="TILE_SETTER")
        add_item(sec, "Flooring — Helper",      "LABOR", round(fl_d,1),"day", lab["HELPER"],      rate_key="HELPER")

        # ── 8. Painting ──────────────────────────────────────────────────────
        sec = make_section("painting", "Painting & Finishing", order := order + 1)
        paint_area = area * floors * 3.5 * mult
        add_item(sec, "Interior Paint (2 coats)", "MATERIAL", round(paint_area*2,1), "SQFT", mat["PAINT_INT"]*mult, 0, "PAINT_INT")
        if estimate.quality_tier in ("PREMIUM", "LUXURY"):
            add_item(sec, "Exterior Weather-Shield", "MATERIAL", round(area*floors*0.6*2,1), "SQFT", mat["PAINT_EXT"]*mult, 0, "PAINT_EXT")
        pa_d = round(paint_area/200, 1)
        add_item(sec, "Painting — Painter", "LABOR", pa_d,          "day", lab["PAINTER"], rate_key="PAINTER")
        add_item(sec, "Painting — Helper",  "LABOR", round(pa_d*.5,1),"day", lab["HELPER"],  rate_key="HELPER")

        # ── 9. Doors & Windows ────────────────────────────────────────────────
        if estimate.include_finishing:
            sec = make_section("doors_windows", "Doors & Windows", order := order + 1)
            total_doors   = beds + floors + 2
            total_windows = beds * 2 + baths
            door_rate     = mat["DOOR_PREMIUM"] if estimate.quality_tier in ("PREMIUM", "LUXURY") else mat["DOOR_BASIC"]
            win_rate      = mat["WINDOW_PREMIUM"] if estimate.quality_tier in ("PREMIUM", "LUXURY") else mat["WINDOW_BASIC"]
            add_item(sec, "Doors",   "MATERIAL", total_doors,   "PCS", door_rate, 0, "DOOR_BASIC")
            add_item(sec, "Windows", "MATERIAL", total_windows, "PCS", win_rate,  0, "WINDOW_BASIC")
            inst_days = round((total_doors + total_windows) * 0.5, 1)
            add_item(sec, "Carpenter — Installation", "LABOR", inst_days, "day", lab["CARPENTER"], rate_key="CARPENTER")
            add_item(sec, "Helper — Installation",    "LABOR", inst_days, "day", lab["HELPER"],    rate_key="HELPER")

        # ── 10. MEP ────────────────────────────────────────────────────────────
        if estimate.include_mep:
            sec = make_section("mep", "MEP (Electrical & Plumbing)", order := order + 1)
            add_item(sec, "Electrical Wiring & Fittings", "MATERIAL", round(area*floors,1), "SQFT", mat["ELECTRICAL"]*mult, 5, "ELECTRICAL")
            add_item(sec, "Plumbing — per Bathroom",      "MATERIAL", baths,                "SET",  mat["PLUMBING_BATH"]*mult, 0, "PLUMBING_BATH")
            elec_d = round(area*floors/150, 1)
            add_item(sec, "Electrician", "LABOR", elec_d,         "day", lab["ELECTRICIAN"], rate_key="ELECTRICIAN")
            add_item(sec, "Plumber",     "LABOR", round(baths*3,1),"day", lab["PLUMBER"],    rate_key="PLUMBER")
            add_item(sec, "Helper — MEP","LABOR", round(elec_d+baths*2,1),"day", lab["HELPER"], rate_key="HELPER")

        # ── Recalculate all sections and estimate totals ───────────────────
        for sec_obj in estimate.sections.all():
            sec_obj.recalculate()

        estimate.recalculate_totals()
