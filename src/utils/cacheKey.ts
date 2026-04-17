// Cache key generation utilities
import { roundCoordinates } from './coordinates';
import { getTimeSlot } from './timeSlot';

/**
 * Generate cache key for soundscape with format: "{lat},{lng}-{timeSlot}"
 * Uses 0.01° precision for coordinates
 */
export function generateCacheKey(
  lat: number,
  lng: number,
  hour: number
): string {
  const [roundedLat, roundedLng] = roundCoordinates(lat, lng);
  const timeSlot = getTimeSlot(hour);
  
  return `${roundedLat.toFixed(2)},${roundedLng.toFixed(2)}-${timeSlot}`;
}

/**
 * Generate cache key using current time
 */
export function generateCacheKeyNow(lat: number, lng: number): string {
  const now = new Date();
  const hour = now.getHours();
  return generateCacheKey(lat, lng, hour);
}
