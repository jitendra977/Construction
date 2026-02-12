class EstimatorService:
    # Constants
    BRICK_SIZE_MM = {'l': 230, 'b': 110, 'h': 55}  # Standard Nepali Brick
    MORTAR_THICKNESS_MM = 10
    
    CEMENT_BAG_VOL_M3 = 0.0347  # 50kg bag
    CEMENT_DENSITY_KG_M3 = 1440
    SAND_DENSITY_KG_M3 = 1600
    AGGREGATE_DENSITY_KG_M3 = 1450 # Approx for 20mm aggregate

    # Units Conversion
    M3_TO_CFT = 35.3147
    SQM_TO_SQFT = 10.7639

    @staticmethod
    def calculate_wall(length_ft, height_ft, thickness_type='9_INCH', ratio='1:6'):
        """
        Calculate bricks, sand, cement for a wall.
        thickness_type: '9_INCH' or '4_INCH' (Partition)
        ratio: Cement:Sand ratio (e.g., '1:6', '1:4')
        """
        length_m = float(length_ft) * 0.3048
        height_m = float(height_ft) * 0.3048
        
        wall_thickness_m = 0.230 if thickness_type == '9_INCH' else 0.110
        
        vol_wall_m3 = length_m * height_m * wall_thickness_m
        
        # Dimensions including mortar
        len_w_mortar = (EstimatorService.BRICK_SIZE_MM['l'] + EstimatorService.MORTAR_THICKNESS_MM) / 1000
        breadth_w_mortar = (EstimatorService.BRICK_SIZE_MM['b'] + EstimatorService.MORTAR_THICKNESS_MM) / 1000
        height_w_mortar = (EstimatorService.BRICK_SIZE_MM['h'] + EstimatorService.MORTAR_THICKNESS_MM) / 1000
        
        if thickness_type == '9_INCH':
            # For 9 inch wall, we consider volume
            vol_one_brick_w_mortar = len_w_mortar * breadth_w_mortar * height_w_mortar
            # Actually, standard calc often uses a simpler "bricks per m3" metric
            # Standard in Nepal: ~500 bricks per m3 with mortar
            # Let's use volume method
            num_bricks = vol_wall_m3 / vol_one_brick_w_mortar
        else:
            # For 4.5 inch wall (half brick), we use area
            area_wall_m2 = length_m * height_m
            area_one_brick_face = len_w_mortar * height_w_mortar
            num_bricks = area_wall_m2 / area_one_brick_face
            # Volume for mortar calc is still wall volume
            vol_wall_m3 = area_wall_m2 * wall_thickness_m

        # Mortar Calculation
        # Volume of Bricks only
        vol_one_brick_dry = (EstimatorService.BRICK_SIZE_MM['l'] * EstimatorService.BRICK_SIZE_MM['b'] * EstimatorService.BRICK_SIZE_MM['h']) / 1e9
        vol_all_bricks_dry = num_bricks * vol_one_brick_dry
        
        vol_wet_mortar = vol_wall_m3 - vol_all_bricks_dry
        vol_dry_mortar = vol_wet_mortar * 1.33  # Add 33% for dry volume
        
        # Ratio
        c_part, s_part = map(int, ratio.split(':'))
        total_parts = c_part + s_part
        
        cement_vol_m3 = (c_part / total_parts) * vol_dry_mortar
        sand_vol_m3 = (s_part / total_parts) * vol_dry_mortar
        
        return {
            'bricks': round(num_bricks),
            'cement_bags': round(cement_vol_m3 / EstimatorService.CEMENT_BAG_VOL_M3, 1),
            'sand_cft': round(sand_vol_m3 * EstimatorService.M3_TO_CFT, 1),
            'sand_m3': round(sand_vol_m3, 2),
            'wall_area_sqft': round(float(length_ft) * float(height_ft), 2)
        }

    @staticmethod
    def calculate_concrete(length_ft, width_ft, thickness_in, grade='M20', include_rebar=True, structure_type='SLAB'):
        """
        Calculate materials for Dhalan (Slab, Beam, Column).
        grade: M20 (1:1.5:3), M15 (1:2:4)
        structure_type: 'SLAB', 'BEAM', 'COLUMN', 'FOOTING'
        """
        length_m = float(length_ft) * 0.3048
        width_m = float(width_ft) * 0.3048
        thickness_m = float(thickness_in) * 0.0254
        
        wet_vol_m3 = length_m * width_m * thickness_m
        dry_vol_m3 = wet_vol_m3 * 1.54  # 54% increase for dry mix
        
        ratio_map = {
            'M20': (1, 1.5, 3),
            'M15': (1, 2, 4),
            'M10': (1, 3, 6)
        }
        
        c_part, s_part, a_part = ratio_map.get(grade, (1, 1.5, 3))
        total_parts = c_part + s_part + a_part
        
        cement_vol_m3 = (c_part / total_parts) * dry_vol_m3
        sand_vol_m3 = (s_part / total_parts) * dry_vol_m3
        agg_vol_m3 = (a_part / total_parts) * dry_vol_m3
        
        # Rebar Estimation (Nepali Standards)
        rebar_kg = 0
        if include_rebar:
            # Standard kg per m3
            rates = {
                'SLAB': 80,
                'BEAM': 130,
                'COLUMN': 170,
                'FOOTING': 60
            }
            rebar_kg = wet_vol_m3 * rates.get(structure_type, 80)

        return {
            'cement_bags': round(cement_vol_m3 / EstimatorService.CEMENT_BAG_VOL_M3, 1),
            'sand_cft': round(sand_vol_m3 * EstimatorService.M3_TO_CFT, 1),
            'sand_m3': round(sand_vol_m3, 2),
            'aggregate_cft': round(agg_vol_m3 * EstimatorService.M3_TO_CFT, 1),
            'aggregate_m3': round(agg_vol_m3, 2),
            'rebar_kg': round(rebar_kg, 1),
            'volume_m3': round(wet_vol_m3, 2),
            'area_sqft': round(float(length_ft) * float(width_ft), 2)
        }

    @staticmethod
    def calculate_plaster(area_sqft, thickness_mm=12, ratio='1:4'):
        """
        Calculate cement and sand for plastering.
        thickness_mm: 12 (Internal), 15/20 (External/Ceiling)
        """
        area_m2 = float(area_sqft) / EstimatorService.SQM_TO_SQFT
        thickness_m = float(thickness_mm) / 1000
        
        wet_vol_m3 = area_m2 * thickness_m
        # For plaster, wastage and joint filling is high
        dry_vol_m3 = wet_vol_m3 * 1.33 # 33% extra for dry volume
        
        c_part, s_part = map(int, ratio.split(':'))
        total_parts = c_part + s_part
        
        cement_vol_m3 = (c_part / total_parts) * dry_vol_m3
        sand_vol_m3 = (s_part / total_parts) * dry_vol_m3
        
        return {
            'cement_bags': round(cement_vol_m3 / EstimatorService.CEMENT_BAG_VOL_M3, 1),
            'sand_cft': round(sand_vol_m3 * EstimatorService.M3_TO_CFT, 1),
            'area_sqft': float(area_sqft)
        }

    @staticmethod
    def calculate_flooring(area_sqft, thickness_in=2, material_type='PCC'):
        """
        Calculate materials for flooring base (Chhipa/PCC).
        thickness_in: usually 2 or 3 inches
        """
        area_m2 = float(area_sqft) / EstimatorService.SQM_TO_SQFT
        thickness_m = float(thickness_in) * 0.0254
        
        wet_vol_m3 = area_m2 * thickness_m
        dry_vol_m3 = wet_vol_m3 * 1.54
        
        # Usually 1:3:6 for PCC flooring
        c_part, s_part, a_part = (1, 3, 6)
        total_parts = c_part + s_part + a_part
        
        cement_vol_m3 = (c_part / total_parts) * dry_vol_m3
        sand_vol_m3 = (s_part / total_parts) * dry_vol_m3
        agg_vol_m3 = (a_part / total_parts) * dry_vol_m3
        
        return {
            'cement_bags': round(cement_vol_m3 / EstimatorService.CEMENT_BAG_VOL_M3, 1),
            'sand_cft': round(sand_vol_m3 * EstimatorService.M3_TO_CFT, 1),
            'aggregate_cft': round(agg_vol_m3 * EstimatorService.M3_TO_CFT, 1),
            'area_sqft': float(area_sqft)
        }

    @staticmethod
    def calculate_full_structure(total_sqft, floors=1, finish_quality='STANDARD', include_mep=True, include_finishing=True, floor_details=None):
        """
        Comprehensive project-level budget estimation.
        """
        from .models import ConstructionRate
        
        if floor_details:
            total_area = sum(float(f.get('area', 0)) for f in floor_details)
            num_floors = len(floor_details)
            total_rooms = sum(int(f.get('rooms', 0)) for f in floor_details)
            total_baths = sum(int(f.get('bathrooms', 0)) for f in floor_details)
            total_toilets = sum(int(f.get('toilets', 0)) for f in floor_details)
            total_balconies = sum(int(f.get('balconies', 0)) for f in floor_details)
            total_doors = sum(int(f.get('doors', 0)) for f in floor_details)
            total_windows = sum(int(f.get('windows', 0)) for f in floor_details)
        else:
            total_area = float(total_sqft) * float(floors)
            num_floors = int(floors)
            total_rooms = 3 * num_floors # Default assumption
            total_baths = 1 * num_floors
            total_toilets = 0
            total_balconies = 1 * num_floors
            total_doors = 2 + (total_rooms * 1.2)
            total_windows = total_rooms * 1.5

        # Default Rates (Fallback)
        DEFAULT_RATES = {
            'CEMENT': 750,  
            'SAND': 90,     
            'AGGREGATE': 105, 
            'BRICK': 17.5,    
            'ROD': 102,       
            'LABOR_CIVIL': 480,
            'LABOR_MEP': 180,
            'LABOR_FINISH': 250,
            'PAINT_SQFT': 45,
            'TILE_SQFT': 180
        }

        # Fetch from DB
        db_rates = {rate.key: float(rate.value) for rate in ConstructionRate.objects.all()}
        RATES = {key: db_rates.get(key, val) for key, val in DEFAULT_RATES.items()}

        # Multipliers based on quality
        multipliers = {
            'ECONOMY': 0.85,
            'STANDARD': 1.0,
            'LUXURY': 1.45
        }
        mult = multipliers.get(finish_quality, 1.0)

        # 1. Structural Materials (Thumb Rules)
        # We increase brick count slightly based on rooms
        brick_multiplier = 22 + (max(0, total_rooms - (2 * num_floors)) * 0.5)
        
        metrics = {
            'cement_bags': 0.45 * total_area * (1.05 if total_baths > 0 else 1.0),
            'sand_cft': 0.85 * total_area,
            'agg_cft': 1.35 * total_area,
            'bricks': brick_multiplier * total_area,
            'rod_kg': 4.3 * total_area,
        }

        costs = {
            'structure': {
                'cement': metrics['cement_bags'] * RATES['CEMENT'],
                'sand': metrics['sand_cft'] * RATES['SAND'],
                'agg': metrics['agg_cft'] * RATES['AGGREGATE'],
                'bricks': metrics['bricks'] * RATES['BRICK'],
                'rod': metrics['rod_kg'] * RATES['ROD'],
                'labor': total_area * RATES['LABOR_CIVIL']
            }
        }

        # 2. MEP Costs (Electrical & Plumbing)
        mep_total = 0
        if include_mep:
            # Base MEP + Extra for each Bathroom/Toilet
            mep_material = (total_area * 220 * mult) + (total_baths * 45000) + (total_toilets * 25000)
            mep_labor = (total_area * RATES['LABOR_MEP']) + (total_baths * 12000) + (total_toilets * 6000)
            mep_total = mep_material + mep_labor
            costs['mep'] = {
                'material': mep_material,
                'labor': mep_labor
            }

        # 3. Finishing Costs (Painting, Tiling, Doors/Windows)
        finish_total = 0
        if include_finishing:
            # Extra tiling area for bathrooms and balconies
            tiling_area = (total_area * 0.8) + (total_baths * 150) + (total_balconies * 60)
            paint_area = total_area * 3.5 + (total_rooms * 200)
            
            paint_cost = paint_area * RATES['PAINT_SQFT'] * mult
            tile_cost = tiling_area * RATES['TILE_SQFT'] * mult
            
            # Balcony Railing Cost (Approx 15k per balcony)
            rail_cost = total_balconies * 18000 * mult
            
            # Doors & Windows (specific costs based on counts)
            doors_cost = total_doors * 18500 * mult
            windows_cost = total_windows * 13000 * mult
            doors_windows = doors_cost + windows_cost
            
            finish_labor = (total_area * RATES['LABOR_FINISH']) + (total_baths * 15000) + (total_balconies * 5000)
            
            finish_total = paint_cost + tile_cost + doors_windows + finish_labor + rail_cost
            costs['finishing'] = {
                'paint': paint_cost,
                'tiling': tile_cost,
                'doors_windows': doors_windows,
                'labor': finish_labor,
                'railings_etc': rail_cost
            }

        struct_total = sum(costs['structure'].values())
        total_budget = struct_total + mep_total + finish_total

        return {
            'quantities': {
                'cement_bags': round(metrics['cement_bags']),
                'sand_cft': round(metrics['sand_cft']),
                'agg_cft': round(metrics['agg_cft']),
                'bricks': round(metrics['bricks']),
                'rod_kg': round(metrics['rod_kg']),
            },
            'breakdown': {k: {sk: round(sv) for sk, sv in v.items()} for k, v in costs.items()},
            'totals': {
                'structure': round(struct_total),
                'mep': round(mep_total),
                'finishing': round(finish_total),
                'all': round(total_budget)
            },
            'summary': {
                'total_area_sqft': total_area,
                'cost_per_sqft': round(total_budget / total_area if total_area > 0 else 0),
                'quality': finish_quality,
                'duration_months': round(8 + (total_area / 500) * mult + (num_floors * 1.5)),
                'rooms': total_rooms,
                'baths': total_baths + total_toilets,
                'doors': total_doors,
                'windows': total_windows
            },
            'rates': RATES
        }
