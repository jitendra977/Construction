export const CM2_PER_SQFT = 929.0304;
export const SQFT_TO_M2 = 0.09290304;

export const cm2ToSqft = (cm2) => +((+cm2 || 0) / CM2_PER_SQFT).toFixed(2);

export const floorBuildAreaSqft = (floor) => {
    const width = +floor?.plan_width_cm || 0;
    const depth = +floor?.plan_depth_cm || 0;
    return width && depth ? cm2ToSqft(width * depth) : 0;
};

export const roomAreaSqft = (room) => {
    if (+room?.area_sqft > 0) return +room.area_sqft;
    const width = +room?.width_cm || 0;
    const depth = +room?.depth_cm || 0;
    return width && depth ? cm2ToSqft(width * depth) : 0;
};

export const totalBuildAreaSqft = (floors = []) =>
    floors.reduce((sum, floor) => sum + floorBuildAreaSqft(floor), 0);
