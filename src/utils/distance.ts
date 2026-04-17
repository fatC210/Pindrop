/**
 * Distance calculation and throttling utilities for the Map Interaction Module
 * Handles Haversine distance calculation and zoom level clamping
 */

import type { Coordinates } from './coordinates';

/**
 * Earth's radius in kilometers
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Approximate kilometers per degree of latitude/longitude
 * Used for quick distance approximation
 */
const KM_PER_DEGREE = 111;

/**
 * Converts degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two coordinate pairs using the Haversine formula
 * Requirements: 4.5, 12.3
 * 
 * The Haversine formula determines the great-circle distance between two points on a sphere
 * given their longitudes and latitudes. This is useful for calculating distances on Earth.
 * 
 * Returns distance in degrees (approximate) for consistency with throttling logic.
 * To convert to kilometers, multiply by ~111 km/degree.
 * 
 * @param coord1 - First coordinate pair [lat, lng]
 * @param coord2 - Second coordinate pair [lat, lng]
 * @returns Distance in degrees (approximate)
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const [lat1, lng1] = coord1;
  const [lat2, lng2] = coord2;

  // Convert to radians
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance in kilometers
  const distanceKm = EARTH_RADIUS_KM * c;

  // Convert to degrees (approximate)
  return distanceKm / KM_PER_DEGREE;
}

/**
 * Checks if two coordinates are within a specified distance threshold
 * @param coord1 - First coordinate pair
 * @param coord2 - Second coordinate pair
 * @param thresholdDegrees - Distance threshold in degrees
 * @returns true if coordinates are within threshold, false otherwise
 */
export function isWithinDistance(
  coord1: Coordinates,
  coord2: Coordinates,
  thresholdDegrees: number
): boolean {
  const distance = calculateDistance(coord1, coord2);
  return distance < thresholdDegrees;
}

/**
 * Clamps a zoom level to the valid range [2, 18]
 * Requirements: 6.5, 6.6
 * 
 * This function is idempotent: clamping twice produces the same result
 * 
 * @param zoom - Zoom level to clamp
 * @returns Clamped zoom level in range [2, 18]
 */
export function clampZoom(zoom: number): number {
  return Math.max(2, Math.min(18, zoom));
}

/**
 * Calculates the preview volume as 30% of the configured ambient volume
 * Requirements: 4.3
 * 
 * @param ambientVolume - Configured ambient layer volume (0-1)
 * @returns Preview volume (0-1)
 */
export function calculatePreviewVolume(ambientVolume: number): number {
  // Clamp ambient volume to valid range
  const clampedVolume = Math.max(0, Math.min(1, ambientVolume));
  return clampedVolume * 0.3;
}
