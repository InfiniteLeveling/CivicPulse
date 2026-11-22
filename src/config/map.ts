/**
 * CivicPulse Map & Viewport Query Configuration
 *
 * Defines authoritative bounding box limits, result limits, and geographic span rules.
 */

export const MAP_CONFIG = {
  DEFAULT_LIMIT: 200,
  MAX_LIMIT: 300,
  MIN_LIMIT: 1,

  /**
   * Maximum permitted geographic span (in degrees) to prevent global database scans.
   */
  MAX_LATITUDE_SPAN: 50.0,
  MAX_LONGITUDE_SPAN: 60.0,

  /**
   * Default statuses returned when no status filter is specified.
   * Focuses the map on active unresolved civic infrastructure problems.
   */
  DEFAULT_STATUSES: ["pending", "in_progress"] as const,

  /**
   * Supported map sort orders.
   */
  SORT_OPTIONS: ["newest", "priority_high"] as const,
} as const;

/**
 * Determines whether a longitude interval crosses the 180° meridian (International Date Line).
 * When west > east, the viewport crosses from positive longitudes (e.g. +170°)
 * to negative longitudes (e.g. -170°).
 */
export function crossesAntimeridian(west: number, east: number): boolean {
  return west > east;
}

/**
 * Calculates the latitude span in degrees.
 * Returns north - south.
 */
export function calculateLatitudeSpan(south: number, north: number): number {
  return north - south;
}

/**
 * Calculates the wrapped longitude span in degrees.
 * Handles both normal viewports (east - west) and antimeridian crossing (360 - west + east).
 */
export function calculateLongitudeSpan(west: number, east: number): number {
  if (west <= east) {
    return east - west;
  }
  return 360 - west + east;
}
