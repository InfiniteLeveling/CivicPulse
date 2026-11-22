/**
 * CivicPulse Geospatial Utilities – Haversine Distance & Bounding Box Calculations
 *
 * Implements mathematically verified spherical distance calculation using the
 * Haversine formula with a documented mean Earth radius of 6,371,000 meters.
 *
 * Features:
 * - Numerical stability clamping to prevent floating-point NaN on antipodal points.
 * - Symmetry guarantee: Distance(A, B) == Distance(B, A).
 * - Antimeridian wraparound normalization for International Date Line crossings (+180 / -180).
 * - Safe pole and equator handling avoiding division-by-zero on converging meridians.
 * - Bounding box prefilter calculation with conservative safety margin.
 */

export const EARTH_RADIUS_METERS = 6_371_000;
export const DUPLICATE_RADIUS_METERS = 100;

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  crossesAntimeridian: boolean;
}

/**
 * Converts degrees to radians.
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Normalizes an angle difference to [-180, +180] degrees to properly handle
 * the International Date Line / Antimeridian wraparound.
 */
export function normalizeLongitudeDifference(lonDiffDegrees: number): number {
  return ((lonDiffDegrees % 360 + 540) % 360) - 180;
}

/**
 * Calculates the great-circle distance between two geographic points in meters
 * using the Haversine formula.
 *
 * Formula:
 *   a = sin²(Δlat / 2) + cos(lat1) * cos(lat2) * sin²(Δlon / 2)
 *   c = 2 * atan2(√a, √(1 − a))
 *   d = R * c
 *
 * @param lat1 Latitude of point 1 in degrees [-90, +90]
 * @param lon1 Longitude of point 1 in degrees [-180, +180]
 * @param lat2 Latitude of point 2 in degrees [-90, +90]
 * @param lon2 Longitude of point 2 in degrees [-180, +180]
 * @param earthRadiusMeters Mean Earth radius (defaults to 6,371,000 meters)
 * @returns Non-negative finite distance in meters
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  earthRadiusMeters: number = EARTH_RADIUS_METERS
): number {
  // 1. Identical coordinates check
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  // 2. Validate finite inputs
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    throw new TypeError("haversineDistanceMeters: Coordinates must be finite numbers");
  }

  // 3. Angular differences in radians
  const dLatRad = toRadians(lat2 - lat1);
  const dLonDeg = normalizeLongitudeDifference(lon2 - lon1);
  const dLonRad = toRadians(dLonDeg);

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  // 4. Haversine term calculation
  const sinHalfLat = Math.sin(dLatRad / 2);
  const sinHalfLon = Math.sin(dLonRad / 2);

  const a =
    sinHalfLat * sinHalfLat +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinHalfLon * sinHalfLon;

  // 5. Numerical stability clamping to [0, 1] to prevent NaN near antipodes
  const clampedA = Math.min(1, Math.max(0, a));

  // 6. Central angle and surface distance
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  const distance = earthRadiusMeters * c;

  // Guarantee non-negative finite return value
  return Math.max(0, distance);
}

/**
 * Calculates a bounding box surrounding a coordinate for database query prefiltering.
 * Includes a 5% safety margin to ensure no candidate within radiusMeters is excluded.
 *
 * @param latitude Center latitude [-90, +90]
 * @param longitude Center longitude [-180, +180]
 * @param radiusMeters Search radius in meters (defaults to 100)
 * @param safetyFactor Safety multiplier for prefilter (defaults to 1.05 = 5% margin)
 */
export function getBoundingBox(
  latitude: number,
  longitude: number,
  radiusMeters: number = DUPLICATE_RADIUS_METERS,
  safetyFactor: number = 1.05
): BoundingBox {
  const effectiveRadius = radiusMeters * safetyFactor;
  const deltaLatDeg = (effectiveRadius / EARTH_RADIUS_METERS) * (180 / Math.PI);

  const minLat = Math.max(-90, latitude - deltaLatDeg);
  const maxLat = Math.min(90, latitude + deltaLatDeg);

  // Polar safety guard: Near the poles (lat > 89.9° or < -89.9°), meridians converge.
  // We span the full longitude circle [-180, +180] to avoid division-by-zero or missing points.
  if (Math.abs(latitude) >= 89.9) {
    return {
      minLat,
      maxLat,
      minLon: -180,
      maxLon: 180,
      crossesAntimeridian: false,
    };
  }

  const latRad = toRadians(latitude);
  const cosLat = Math.cos(latRad);
  const deltaLonDeg = (effectiveRadius / (EARTH_RADIUS_METERS * cosLat)) * (180 / Math.PI);

  if (deltaLonDeg >= 180) {
    return {
      minLat,
      maxLat,
      minLon: -180,
      maxLon: 180,
      crossesAntimeridian: false,
    };
  }

  const rawMinLon = longitude - deltaLonDeg;
  const rawMaxLon = longitude + deltaLonDeg;

  if (rawMinLon < -180) {
    return {
      minLat,
      maxLat,
      minLon: rawMinLon + 360,
      maxLon: rawMaxLon,
      crossesAntimeridian: true,
    };
  }

  if (rawMaxLon > 180) {
    return {
      minLat,
      maxLat,
      minLon: rawMinLon,
      maxLon: rawMaxLon - 360,
      crossesAntimeridian: true,
    };
  }

  return {
    minLat,
    maxLat,
    minLon: rawMinLon,
    maxLon: rawMaxLon,
    crossesAntimeridian: false,
  };
}

/**
 * Checks whether two points are strictly within the specified radius threshold.
 * Evaluates the unrounded distance against the threshold.
 */
export function isWithinRadius(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusMeters: number = DUPLICATE_RADIUS_METERS
): boolean {
  const distance = haversineDistanceMeters(lat1, lon1, lat2, lon2);
  return distance <= radiusMeters;
}
