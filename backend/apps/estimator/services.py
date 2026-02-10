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
    def calculate_concrete(length_ft, width_ft, thickness_in, grade='M20'):
        """
        Calculate materials for Dhalan (Slab).
        grade: M20 (1:1.5:3), M15 (1:2:4)
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
        
        return {
            'cement_bags': round(cement_vol_m3 / EstimatorService.CEMENT_BAG_VOL_M3, 1),
            'sand_cft': round(sand_vol_m3 * EstimatorService.M3_TO_CFT, 1),
            'sand_m3': round(sand_vol_m3, 2),
            'aggregate_cft': round(agg_vol_m3 * EstimatorService.M3_TO_CFT, 1),
            'aggregate_m3': round(agg_vol_m3, 2),
            'volume_m3': round(wet_vol_m3, 2),
            'slab_area_sqft': round(float(length_ft) * float(width_ft), 2)
        }
